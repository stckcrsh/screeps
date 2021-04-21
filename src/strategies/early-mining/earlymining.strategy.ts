import { Actions } from 'action-decorator';

import { Agent } from '../../agent';
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
				console.log(err)
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
			[States.withdrawing]: (dispatch) => {
				if (allArounder.creep.memory.target) {
					const target = Game.getObjectById<
						Resource | StructureContainer | StructureStorage
					>(allArounder.creep.memory.target)!;

					// @ts-ignore
					if (target?.amount) {
						// this is a resource
						const err = allArounder.creep.pickup(target as Resource);
						if (err === ERR_NOT_IN_RANGE) {
							return dispatch(Events.notInRange);
						}
						return dispatch(Events.full);
					}

					const err = allArounder.creep.withdraw(
						target as StructureContainer,
						RESOURCE_ENERGY
					);

					if (err === ERR_NOT_IN_RANGE) {
						return dispatch(Events.notInRange);
					}
					return dispatch(Events.full);
				}
			},
			[States.movingToBattery]: (dispatch) => {
				if (allArounder.creep.memory.target) {
					const target = Game.getObjectById<
						Resource | StructureContainer | StructureStorage
					>(allArounder.creep.memory.target)!;

					if (allArounder.creep.pos.getRangeTo(target.pos) <= 1) {
						return dispatch(Events.arrived);
					}
					allArounder.runMove(target.pos, 1);
					return;
				}
			},
			[States.findingBattery]: (dispatch) => {
				const battery = this.findBattery(allArounder);

				if (battery) {
					allArounder.creep.memory.target = battery.id;
					return dispatch(Events.foundBattery);
				}

				return dispatch(Events.foundSource);
			},
		};
	}

	findBattery(agent: Agent) {
		// look for containers
		const containers = agent.creep.room.find<StructureContainer>(
			FIND_STRUCTURES,
			{
				filter: (i) => i.structureType === STRUCTURE_CONTAINER,
			}
		);

		if (containers.length > 0) {
			_.last(
				_.sortBy(containers, (container) => container.store[RESOURCE_ENERGY])
			);
		}

		// search for resources on the ground to gather
		const resources = agent.creep.room.find(FIND_DROPPED_RESOURCES, {
			filter: (i) => i.resourceType === RESOURCE_ENERGY,
		});

		if (resources.length > 0) {
			// go to largest pile
			return _.last(_.sortBy(resources, (resource) => resource.amount));
		}

		return null;
	}
}
