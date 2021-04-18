import { Actions } from 'action-decorator';
import { Agent } from '../../agent';
import { transition } from '../../machine';
import { Overlord } from '../../overlord';
import { Strategy } from '../../strategy';
import { getRandomName } from '../../utils/names';
import { allAroundMachine, Events, States } from './all-around.machine';

const ALL_AROUND = 'all-around';

/**
 * The Early mining stategy is used to spawn all arounder creeps that can harvest updgrade and build
 *
 */
export class EarlyMiningStrategy extends Strategy {
	// @ts-ignore
	memory: {
		constructionTarget?: Id<ConstructionSite>;
	};

	allArounders: Agent[] = [];

	get spawn(): StructureSpawn {
		return this.overlord.mainSpawn;
	}

	get constructionTarget() {
		if (this.memory?.constructionTarget) {
			return Game.getObjectById(this.memory.constructionTarget);
		}

		return null;
	}

	constructor(overlord: Overlord, name: string) {
		super(overlord, name);
	}

	initStrategy(): void {
		/** */
	}
	rollCall(): void {
		this.allArounders = Object.values(Game.creeps)
			.filter(
				(creep) =>
					creep.memory.overlord === this.overlord.name &&
					creep.memory.role === ALL_AROUND
			)
			.map((creep) => new Agent(creep));

		// check if any all arounders need to be spawned
		if (this.allArounders.length < 4) {
			this.spawnAllAroundCreep();
		}
	}
	run(): void {
		this.allArounders.forEach((allArounder) => {
			try {
				this.allArounderActions(allArounder);
			} catch (err) {
				console.log(`Error running actions for ${allArounder.name}`);
			}
		});
	}
	cleanUp() {
		/** */
	}

	private spawnAllAroundCreep() {
		const energyAvailable = this.spawn.room.energyAvailable;

		if (energyAvailable >= 300) {
			const parts = [
				WORK,
				// take leftover energy and split it between MOVE and CARRY parts
				...Array(Math.floor((energyAvailable - 100) / 50))
					.fill(0)
					.map((i, idx) => (idx % 2 === 0 ? MOVE : CARRY)),
			];

			const name = `${this.name}_${getRandomName()}`;

			const status = this.spawn.spawnCreep(parts, name, {
				memory: {
					role: ALL_AROUND,
					overlord: this.overlord.name,
				},
			});
		}
	}
	@Actions(allAroundMachine)
	allArounderActions(
		allArounder: Agent
	): Record<States, (dispatch: (event: Events) => void) => void> {
		return {
			[States.spawning]: (dispatch) => {
				if (!allArounder.creep.spawning) {
					return dispatch(Events.spawned);
				}
			},
			[States.upgrading]: (dispatch) => {
				const err = allArounder.creep.upgradeController(
					allArounder.creep.room.controller!
				);

				if (err === ERR_NOT_ENOUGH_RESOURCES) {
					return dispatch(Events.finished);
				}
				if (err === ERR_NOT_IN_RANGE) {
					return dispatch(Events.notInRange);
				}
				return;
			},
			[States.building]: (dispatch) => {
				if (this.constructionTarget) {
					const err = allArounder.build(this.constructionTarget);
					console.log(err);
					if (err === ERR_NOT_ENOUGH_RESOURCES) {
						return dispatch(Events.finished);
					} else if (err === ERR_INVALID_TARGET) {
						delete this.memory.constructionTarget;
						return dispatch(Events.buildComplete);
					} else if (err === ERR_NOT_IN_RANGE) {
						return dispatch(Events.notInRange);
					}
				} else {
					return dispatch(Events.noTarget);
				}
			},
			[States.harvesting]: (dispatch) => {
				if (allArounder.creep.store.getFreeCapacity(RESOURCE_ENERGY) === 0) {
					return dispatch(Events.full);
				}
				if (!allArounder.creep.memory.source) {
					const _source = allArounder.creep.pos.findClosestByPath(FIND_SOURCES);
					if (!_source) {
						console.error(
							`cant find valid source for '${allArounder.creep.name}'`
						);
						return;
					}
					allArounder.creep.memory.source = _source.id;
				}
				const source = Game.getObjectById<Source>(
					allArounder.creep.memory.source
				)!;
				const err = allArounder.creep.harvest(source);
			},
			[States.movingToSource]: (dispatch) => {
				if (!allArounder.creep.memory?.source) {
					allArounder.creep.memory.source = allArounder.creep.pos.findClosestByPath(
						FIND_SOURCES
					)!.id;
				}
				const source = Game.getObjectById<Source>(
					allArounder.creep.memory.source
				);

				if (allArounder.creep.pos.getRangeTo(source!.pos) <= 1) {
					return dispatch(Events.arrived);
				}

				allArounder.runMove(source!.pos, 1);
			},

			[States.movingToController]: (dispatch) => {
				const target = allArounder.creep.room.controller!;

				if (allArounder.creep.pos.getRangeTo(target.pos) <= 3) {
					return dispatch(Events.arrived);
				}

				allArounder.runMove(target.pos, 3);
			},
			[States.movingToConstruction]: (dispatch) => {
				if (this.constructionTarget) {
					if (
						allArounder.creep.pos.getRangeTo(this.constructionTarget.pos) <= 3
					) {
						return dispatch(Events.arrived);
					}
					allArounder.runMove(this.constructionTarget.pos, 3);
					return;
				} else {
					return dispatch(Events.noTarget);
				}
			},
			[States.findingTarget]: (dispatch) => {
				console.log('finding target');
				// check if there are any build targets
				if (this.constructionTarget) {
					console.log('finding construction from memory');
					return dispatch(Events.foundConstruction);
				}

				const target = allArounder.creep.pos.findClosestByPath(
					FIND_CONSTRUCTION_SITES
				);

				if (target) {
					this.memory.constructionTarget = target.id;

					console.log('found new construction');
					return dispatch(Events.foundConstruction);
				}

				console.log('found controller');
				return dispatch(Events.foundController);
			},
		};
	}
}
