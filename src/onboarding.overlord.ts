import { BuilderStrategy } from 'strategies/builder/builder.strategy';
import { EarlyMiningStrategy } from 'strategies/early-mining/earlymining.strategy';
import { NEIGHBORS } from 'utils/position';

import { RoomAnalysis } from './analysis/analyze-room';
import { DistanceTransform } from './analysis/distance-transform';
import { Overlord } from './overlord';
import { MiningStrategy } from './strategies/mining/mining.strategy';
import { RefillStrategy } from './strategies/refill/refill.strategy';
import { UpgraderStrategy } from './strategies/upgrader/upgrader.strategy';
import { DistanceFromExit } from './analysis/distance-from-exit';
import { Empire } from './empire';

/**
 * setup strategies for the phases
 * Early strategy/ just spawned
 *
 * Rush to RCL 2 with All around creeps
 * Build extensions
 *
 * start drop mining phase by building 5 work 1 move creeps.
 */

export class OnboardingOverlord extends Overlord {
	sources: Source[] = [];

	memory: {
		strategies: Record<string, any>;
		milestones: any;
		prevLvl: number;
		baseCenter: RoomPosition;
		analyticsIds: string[];
	};

	constructor(empire: Empire, flag: Flag, name: string, type: string) {
		super(empire, flag, name, type);

		if (!this.memory.analyticsIds) {
			this.memory.analyticsIds = [];
		}
	}

	initOverlord(): void {
		if (!this.memory.milestones) {
			this.memory.milestones = [];
			this.memory.prevLvl = 0;
		}

		const lvlChanged =
			(this.flag.room?.controller?.level || 0) > this.memory.prevLvl;

		if (lvlChanged) {
			this.memory.milestones.push({
				label: `lvl${this.flag.room?.controller?.level}`,
				tick: Game.time,
			});
		}

		if (this.flag.room) {
			this.sources = _.sortBy(
				this.room.find(FIND_SOURCES),
				(s: Source) => s.id
			);
		}

		/** */
		this.addStrategy(new EarlyMiningStrategy(this, 'early-miner'));

		if ((this.flag.room?.controller?.level || 0) >= 2) {
			this.addStrategy(new UpgraderStrategy(this, 'upgrader'));

			this.addStrategy(new BuilderStrategy(this, 'build'));

			this.addStrategy(new RefillStrategy(this, 'refill'));

			this.sources.forEach((source, idx) => {
				this.addStrategy(new MiningStrategy(this, `miner-${idx}`, source));
			});
		}

		this.memory.prevLvl = this.flag.room?.controller?.level;
	}

	public runOverlord() {
		const roomAnalysis = this.room.memory.analysis || {};

		if (!_.isEmpty(this.memory.analyticsIds)) {
			// poll for completion of analysis
			let stillWaiting = [];
			this.memory.analyticsIds.forEach((id) => {
				const job = this.empire.pullJobById(id);

				if (job) {
					this.room.memory.analysis[job.type] = job.data;
				} else {
					stillWaiting.push(id);
				}
			});
			this.memory.analyticsIds = stillWaiting;
		}

		if (
			!roomAnalysis['distExit'] &&
			this.memory.analyticsIds.indexOf('distExit-123') === -1
		) {
			const id = 'distExit-123';
			this.empire.addAnalyticsJob({
				type: 'distExit',
				id,
				data: [],
				roomName: this.room.name,
			});
			this.memory.analyticsIds.push(id);
		}

		if (
			!roomAnalysis['distTrans'] &&
			this.memory.analyticsIds.indexOf('distTrans-123') === -1
		) {
			const id = 'distTrans-123';
			this.empire.addAnalyticsJob({
				type: 'distTrans',
				id,
				data: [],
				roomName: this.room.name,
			});
			this.memory.analyticsIds.push(id);
		}
		/** */
		if (!this.memory.baseCenter) {
			// check if an exit distance has been run for this room

			const analyze = new RoomAnalysis(this.room);
			const analysis = Memory.rooms.W8N3.analysis;
			const heatMap = analysis.map;

			if (heatMap && roomAnalysis['distTrans']) {
				this.getBestBaseLocation(roomAnalysis['distTrans'], heatMap);
			}
		}
		if (this.memory.baseCenter) {
			this.buildBase();
		}
	}

	getBestBaseLocation(distTransform, heatMap) {
		const newMap = [];

		let bestSpaces = { best: 0, spaces: [] };

		for (let i = 0; i <= 49; i++) {
			newMap[i] = [];
			for (let j = 0; j <= 49; j++) {
				const heat = heatMap?.[i]?.[j];

				// filter out any heat that is too close to node or null
				if (heat && heat <= 9) {
					const val = heat * distTransform[i][j];
					if (val > bestSpaces.best) {
						bestSpaces = {
							best: val,
							spaces: [new RoomPosition(i, j, this.room.name)],
						};
					} else if (val === bestSpaces.best) {
						bestSpaces = {
							...bestSpaces,
							spaces: [
								...bestSpaces.spaces,
								new RoomPosition(i, j, this.room.name),
							],
						};
					}
				}
			}
		}

		this.memory.baseCenter = bestSpaces.spaces[0];
	}

	buildBase() {
		const bestSpace = this.memory.baseCenter;

		const buildingPlans = this.baseBuilder(bestSpace);

		// find builings for the current rcl
		const plans = _.filter(
			buildingPlans,
			(plans) => plans.rcl <= this.room.controller.level
		);
		plans.forEach((plan) => {
			for (const buildingType in plan.buildings) {
				plan.buildings[buildingType].pos.forEach((pos) =>
					this.room.createConstructionSite(pos.x, pos.y, buildingType)
				);
			}
		});

		// const analysis = Memory.rooms.W8N3.analysis;

		// const goals = [];
		// const source = this.room.controller.id;
		// for (const destination in analysis.nodes) {
		// 	if (!_.isEmpty(analysis.nodeMap[source][destination])) {
		// 		analysis.nodeMap[source][destination].forEach((space) => {
		// 			goals.push({
		// 				pos: new RoomPosition(space.x, space.y, this.room.name),
		// 				range: 3,
		// 			});
		// 		});
		// 	}
		// }

		// const obj = PathFinder.search(bestSpace, goals, {
		// 	flee: true,
		// 	plainCost: 1,
		// 	swampCost: 1,
		// });
		// // console.log(JSON.stringify(obj))
		// let lastPosition = bestSpace;
		// for (const position of obj.path) {
		// 	const pos = new RoomPosition(position.x, position.y, this.room.name);

		// 	this.room.visual.line(lastPosition.x, lastPosition.y, pos.x, pos.y, {
		// 		color: 'yellow',
		// 		width: 0.3,
		// 	});
		// 	lastPosition = pos;
		// }
		// const terrain = Game.map.getRoomTerrain(this.room.name);

		// NEIGHBORS.forEach(([dx,dy])=>{
		// 	const x = dx +
		// 	if(terrain.get())
		// })

		// build roards around storage
	}

	baseBuilder(storagePos: RoomPosition) {
		const x = storagePos.x;
		const y = storagePos.y;
		return [
			{
				rcl: 1,
				buildings: {
					road: {
						pos: [
							{ x: x - 1, y: y - 1 },
							{ x, y: y - 1 },
							{ x: x + 1, y: y - 1 },
							{ x: x - 1, y },
							{ x: x + 1, y },
							{ x: x - 1, y: y + 1 },
							{ x, y: y + 1 },
							{ x: x + 1, y: y + 1 },
						],
					},
				},
			},
			{
				rcl: 2,
				buildings: {},
			},
			{
				rcl: 3,
				buildings: {
					tower: {
						pos: [{ x: x - 2, y: y - 1 }],
					},
					road: {
						pos: [
							{ x: x - 1, y: y - 1 },
							{ x, y: y - 1 },
							{ x: x + 1, y: y - 1 },
							{ x: x - 1, y },
							{ x: x + 1, y },
							{ x: x - 1, y: y + 1 },
							{ x, y: y + 1 },
							{ x: x + 1, y: y + 1 },
						],
					},
				},
			},
			{
				rcl: 4,
				buildings: {
					storage: { pos: [{ x, y }] },
				},
			},
			{
				rcl: 5,
				buildings: {
					tower: {
						pos: [{ x: x + 2, y: y - 1 }],
					},
				},
			},
			{
				rcl: 6,
				buildings: {},
			},
			{
				rcl: 7,
				buildings: {
					tower: {
						pos: [{ x: x - 2, y }],
					},
				},
			},
			{
				rcl: 8,
				buildings: {
					tower: {
						pos: [
							{ x: x - 2, y: y - 1 },
							{ x: x + 2, y: y - 1 },
							{ x: x - 2, y },
							{ x: x + 2, y },
							{ x: x - 2, y: y + 1 },
							{ x: x + 2, y: y + 1 },
						],
					},
				},
			},
		];
	}
}
