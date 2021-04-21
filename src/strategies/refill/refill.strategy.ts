import { Overlord } from 'overlord';
import { Strategy } from 'strategy';

import { Actions } from '../../action-decorator';
import { Agent } from '../../agent';
import { getRandomName } from '../../utils/names';
import { Events, refillerMachine, States } from './refiller.machine';

const REFILLER = 'refiller';

export class RefillStrategy extends Strategy {
	// @ts-ignore
	memory: {
		storageId?: Id<StructureStorage>;
	};

	refillers: Agent[] = [];

	constructor(overlord: Overlord, name: string) {
		super(overlord, name);
	}

	initStrategy(): void {}

	rollCall(): void {
		this.refillers = Object.values(Game.creeps)
			.filter(
				(creep) =>
					creep.memory.overlord === this.overlord.name &&
					creep.memory.strategy === this.name &&
					creep.memory.role === REFILLER
			)
			.map((creep) => new Agent(creep));

		// check if any all arounders need to be spawned
		if (this.refillers.length < 1) {
			this.spawnRefillerCreep();
		}
	}
	run(): void {
		this.refillers.forEach((refiller) => {
			try {
				this.refillerActions(refiller);
			} catch (err) {
				console.log(`Error running actions for ${refiller.name}`);
				console.log(err);
			}
		});
	}
	cleanUp(): void {
		throw new Error('Method not implemented.');
	}

	spawnRefillerCreep() {
		const energyAvailable = this.overlord.mainSpawn.room.energyAvailable;

		if (energyAvailable >= 300) {
			const parts = [CARRY, CARRY, CARRY, MOVE, MOVE, MOVE];

			const name = `${this.name}_${getRandomName()}`;

			const status = this.overlord.mainSpawn.spawnCreep(parts, name, {
				memory: {
					role: REFILLER,
					strategy: this.name,
					overlord: this.overlord.name,
				},
			});
		}
	}

	@Actions(refillerMachine)
	refillerActions(
		refiller: Agent
	): Record<States, (dispatch: (event: Events) => void) => void> {
		return {
			[States.spawning]: (dispatch) => {
				console.log(refiller);
				if (!refiller.creep.spawning) {
					dispatch(Events.spawned);
				}
			},
			[States.findingBattery]: (dispatch) => {
				const target = this.findBattery(refiller);
				console.log(`Target: ${target?.id}`);
				if (target) {
					refiller.creep.memory.target = target.id;
					return dispatch(Events.found);
				}
			},
			[States.collecting]: (dispatch) => {
				const target = Game.getObjectById<
					StructureStorage | StructureContainer | Resource<ResourceConstant>
				>(refiller.creep.memory.target)!;
				refiller.runMove(target.pos, 1);

				// @ts-ignore
				if (target?.amount) {
					// this is a dropped resource
					const err = refiller.creep.pickup(
						target as Resource<ResourceConstant>
					);

					if (err === ERR_FULL) {
						dispatch(Events.full);
					}

					if (err === OK) {
						dispatch(Events.batteryEmpty);
					}
				}
				const err = refiller.creep.withdraw(
					target as StructureContainer,
					RESOURCE_ENERGY
				);

				if (err === ERR_FULL) {
					dispatch(Events.full);
				}

				if (err === OK) {
					dispatch(Events.batteryEmpty);
				}
				/** */
			},
			[States.findingRefill]: (dispatch) => {
				const target = this.findRefillTarget(refiller);

				if (target) {
					refiller.creep.memory.target = target.id;
					return dispatch(Events.found);
				}

				return dispatch(Events.noTarget);
			},
			[States.refilling]: (dispatch) => {
				const target = Game.getObjectById<StructureExtension>(
					refiller.creep.memory.target
				)!;
				refiller.runMove(target.pos, 1);
				const err = refiller.transfer(target);
				if (err === ERR_FULL || err === OK) {
					dispatch(Events.full);
				}
				if (err === ERR_NOT_ENOUGH_RESOURCES) {
					dispatch(Events.empty);
				}

				/** */
			},
			[States.idle]: (dispatch) => {
				/** */
				if (Game.time % 20 === 1) {
					return dispatch(Events.timer);
				}
			},
		};
	}

	findBattery(agent: Agent) {
		// first look for storage
		if (this.memory?.storageId) {
			return Game.getObjectById(this.memory.storageId)!;
		}

		// check if there is a storage
		const storages = agent.creep.room.find<StructureStorage>(
			FIND_MY_STRUCTURES,
			{
				filter: { structureType: STRUCTURE_STORAGE },
			}
		);

		if (storages.length > 0) {
			const storage = _.head(storages);
			this.memory.storageId = storage.id;
			return storage;
		}

		// look for containers
		const containers = agent.creep.room.find<StructureContainer>(
			FIND_STRUCTURES,
			{
				filter: (i) => i.structureType === STRUCTURE_CONTAINER,
			}
		);

		if (containers.length > 0) {
			return _.last(
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
	findRefillTarget(agent: Agent) {
		// look for extensions
		const extension = agent.creep.pos.findClosestByRange<StructureExtension>(
			FIND_MY_STRUCTURES,
			{
				filter: (i) =>
					i.structureType === STRUCTURE_EXTENSION &&
					i.store[RESOURCE_ENERGY] === 0,
			}
		);

		if (!extension) {
			return this.overlord.mainSpawn;
		}

		return extension;
	}
}
