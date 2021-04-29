import { initPos } from './../utils/position';
import { NEIGHBORS } from '../utils/position';

const COLOR = [
	'#FFBA08',
	'#FAA307',
	'#F48C06',
	'#E85D04',
	'#DC2F02',
	'#D00000',
	'#9D0208',
];

export interface Analysis {
	nodeMap: Record<string, Record<string, PathStep[]>>;
	nodes: Record<string, { strutureType: string; pos: RoomPosition }>;
}

export class RoomAnalysis {
	controller?: StructureController;
	sources: Source[] = [];
	minerals: Mineral[] = [];

	analysis: Analysis;

	visual: RoomVisual;

	constructor(private room: Room) {
		this.visual = new RoomVisual(this.room.name);

		this.controller = this.room.controller;
		this.sources = this.room.find(FIND_SOURCES);
		this.minerals = this.room.find(FIND_MINERALS);

		// if (!this.room.memory?.analysis) {
		const startingAnalysis = { nodeMap: {}, nodes: {} };

		if (!_.isEmpty(this.sources)) {
			this.sources.forEach((source) => {
				// @ts-ignore
				startingAnalysis.nodes[source.id] = {
					structureType: 'source',
					pos: source.pos,
				};
			});
		}

		if (this.controller) {
			// @ts-ignore
			startingAnalysis.nodes[this.controller.id] = {
				structureType: STRUCTURE_CONTROLLER,
				pos: this.controller.pos,
			};
		}

		this.room.memory.analysis = {
			...(this.room.memory.analysis || {}),
			...startingAnalysis,
		};
		this.analysis = this.room.memory.analysis;
		this.findBasePaths();

		this.floodFill();

		this.showAnalysis();
	}

	findBasePaths() {
		const source = this.controller.id;
		for (const destination of this.sources) {
			const sourcePos = initPos(this.analysis.nodes[source].pos);
			const destPos = initPos(destination.pos);

			// @ts-ignore
			const path = sourcePos.findPathTo(destPos, {
				ignoreCreeps: true,
				ignoreDestructableStructures: true,
				range: 1,
				ignoreRoads: true,
				swampCost: 1,
				plainCost: 1,
			});

			if (!this.analysis.nodeMap[source]) {
				this.analysis.nodeMap[source] = {};
			}

			this.analysis.nodeMap[source][destination.id] = path;
		}
	}

	showAnalysis() {
		const roomName = this.room.name;
		const nodeMap = this.analysis.nodeMap;
		const nodes = this.analysis.nodes;

		const visual = new RoomVisual(roomName);

		const points = [];

		for (const source in nodes) {
			for (const destination in nodes) {
				if (
					nodeMap?.[source]?.[destination] &&
					!_.isEmpty(nodeMap[source][destination])
				) {
					let lastPosition = new RoomPosition(
						nodeMap[source][destination][0].x,
						nodeMap[source][destination][0].y,
						this.room.name
					);
					let lastDirection = 0;
					const path = nodeMap[source][destination];
					for (const position of path) {
						const pos = new RoomPosition(position.x, position.y, roomName);

						visual.line(lastPosition.x, lastPosition.y, pos.x, pos.y, {
							color: '#f58634',
						});
						lastPosition = pos;
						lastDirection = position.direction;
					}
				}
			}
		}

		const hashLocation = (local: any) => `${local[0]},${local[1]}`;
		Object.entries(
			points.reduce((acc, curr) => {
				const hash = hashLocation(curr as any);
				// @ts-ignore
				const count = acc[hash] || 0;

				return {
					...acc,
					[hash]: count + 1,
				};
			}, {})
		)
			// .filter(([key, value]: any) => value > 1)
			.forEach(([key, value]: any) => {
				const split = key.split(',');
				visual.circle(Number(split[0]), Number(split[1]), {
					stroke: '#fb3640',
					radius: 0.3 * value,
					opacity: 1,
					fill: '#fb3640',
				});
			});
	}

	floodFill() {
		const STARTING_VALUE = 4;
		const REDUCTION_AMOUNT = 1;
		const terrain = new Room.Terrain(this.room.name);

		if (
			!this.room.memory.analysis.queue &&
			_.isEmpty(this.room.memory.analysis.queue)
		) {
			// using flood fill create a heatmap of the room
			let queue: Array<{ pos: RoomPosition; val: number }> = [];
			const map: Array<Array<number>> = [];
			// add starting positions
			// for (const node in this.analysis.nodes) {
			// 	const pos = this.analysis.nodes[node].pos;

			// 	// extend queue
			// 	NEIGHBORS.forEach(([dx, dy]) => {
			// 		const x = pos.x + dx;
			// 		const y = pos.y + dy;

			// 		if (x >= 0 && x <= 49 && y >= 0 && y <= 49) {
			// 			if (terrain.get(x, y) !== TERRAIN_MASK_WALL) {
			// 				queue.push({
			// 					pos: new RoomPosition(x, y, pos.roomName),
			// 					val: STARTING_VALUE,
			// 				});
			// 			}
			// 		}
			// 	});
			// }
			for (const destination in this.analysis.nodeMap[this.controller.id]) {
				const path = this.analysis.nodeMap[this.controller.id][destination];

				queue = queue.concat(
					path.map((val) => ({
						pos: new RoomPosition(val.x, val.y, this.room.name),
						val: STARTING_VALUE,
					}))
				);
			}

			this.room.memory.analysis.queue = queue;
			this.room.memory.analysis.map = map;
		}

		const queue = this.room.memory.analysis.queue;
		const map = this.room.memory.analysis.map;

		let count = 0;

		while (!_.isEmpty(queue) && count < 10) {
			const { pos, val } = queue.shift()!;
			if (!map[pos.x]) {
				map[pos.x] = [];
			}

			const tile = terrain.get(pos.x, pos.y);

			if (tile === TERRAIN_MASK_WALL) {
				continue;
			}

			/** run fill */
			const currentVal = map[pos.x][pos.y];

			if (val <= currentVal) {
				continue;
			}

			const newVal = val;

			map[pos.x][pos.y] = newVal || 0;
			const reducedVal = newVal - REDUCTION_AMOUNT;

			if (reducedVal <= 0) {
				continue;
			}

			// extend queue
			NEIGHBORS.forEach(([dx, dy]) => {
				const x = pos.x + dx;
				const y = pos.y + dy;

				if (x >= 0 && x <= 49 && y >= 0 && y <= 49) {
					if (terrain.get(x, y) !== TERRAIN_MASK_WALL) {
						queue.push({
							pos: new RoomPosition(x, y, pos.roomName),
							val: reducedVal,
						});
					}
				}
			});

			count++;
		}

		if (_.isEmpty(queue)) {
			for (const _x in map) {
				const x = Number(_x);
				for (const _y in map[x]) {
					const y = Number(_y);
					const val = Math.ceil(map[x][y] / 2);
					if (val) {
						this.visual.rect(x - 0.5, y - 0.5, 1, 1, {
							stroke: COLOR[val],
							fill: COLOR[val],
							opacity: 0.4,
						});
					}
				}
			}
		}

		this.room.memory.analysis.queue = queue;
		this.room.memory.analysis.map = map;
	}
}
