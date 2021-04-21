import { UpgraderMachine, States, Events } from './upgrader.machine';
import { cartMachine, States as CartStates, Events as CartEvents } from './cart.machine';
import { Overlord } from 'overlord';
import { getFreeSpaces } from 'utils/free-spaces';
import { getRandomName } from 'utils/names';

import { Agent } from '../../agent';
import { Strategy } from '../../strategy';
import { XYtoDirections } from '../../utils/position';
import { Actions } from '../../action-decorator';
import { findMissing } from '../../utils/index';

const UPGRADER = 'upgrader';
const CART = 'cart';

export class UpgraderStrategy extends Strategy {
	// @ts-ignore
	memory: {
		containerPos?: { x: number; y: number };
		containerId?: Id<StructureContainer>;
		storageId?: Id<StructureStorage>;
		spaces: Array<{ x: number; y: number; }>
	};

	upgraders: Agent[] = [];
	carts: Agent[] = [];
	container?: StructureContainer;

	get controller() {
		return this.overlord.room.controller!;
	}

	get storage() {
		return this.memory.storageId && Game.getObjectById(this.memory.storageId);
	}

	constructor(overlord: Overlord, name: string) {
		super(overlord, name);
	}

	initStrategy(): void {

		if (!this.memory.containerPos) {
			// first figure out a good place to place a container
			const bestSpace = this.findBestContainerPos();
			this.memory.containerPos = { x: bestSpace.x, y: bestSpace.y };
			this.controller.room.createConstructionSite(
				bestSpace.x,
				bestSpace.y,
				STRUCTURE_CONTAINER
			);

			// store all the free spaces surrounding the container
			const bestSpacePos = new RoomPosition(
				bestSpace.x,
				bestSpace.y,
				this.overlord.room.name
			);

			const allSurroundingSpaces = getFreeSpaces(bestSpacePos)
				.map(space => ({ x: space.x, y: space.y }))
				// remove the center
				.filter(space => !(space.x === bestSpacePos.x && space.y === bestSpacePos.y))

			// remove the space that is closest to spawn
			const firstPathSegment = _.head(bestSpacePos.findPathTo(this.overlord.mainSpawn.pos));
			this.memory.spaces = allSurroundingSpaces.filter(space => !(space.x === firstPathSegment.x && space.y === firstPathSegment.y))
		}


		if (!this.container) {
			const structures = this.overlord.room.lookForAt(
				LOOK_STRUCTURES,
				this.memory.containerPos.x,
				this.memory.containerPos.y
			)
			if (structures.length > 0) {
				this.container = _.head(structures) as StructureContainer
			} else {
				if (
					this.overlord.room.lookForAt(
						LOOK_CONSTRUCTION_SITES,
						this.memory.containerPos.x,
						this.memory.containerPos.y
					).length === 0
				) {
					this.overlord.room.createConstructionSite(
						this.memory.containerPos.x,
						this.memory.containerPos.y,
						STRUCTURE_CONTAINER
					);
				}
			}
		}
	}

	rollCall(): void {
		this.upgraders = Object.values(Game.creeps)
			.filter(
				(creep) =>
					creep.memory.overlord === this.overlord.name &&
					creep.memory.strategy === this.name &&
					creep.memory.role === UPGRADER
			)
			.map((creep) => new Agent(creep));

		this.carts = Object.values(Game.creeps)
			.filter(
				(creep) =>
					creep.memory.overlord === this.overlord.name &&
					creep.memory.strategy === this.name &&
					creep.memory.role === CART
			)
			.map((creep) => new Agent(creep));

		// console.log(`Container: ${this.container?.id}`)
		// console.log(`Upgraders: ${this.upgraders.length}`)
		// console.log(`Carts: ${this.carts.length}`)
		if (this.container && this.carts.length < this.maxCarts()) {
			this.spawnCart();
		}

		if (this.container &&
			(this.upgraders.length === 0 ||
				(this.carts.length > 0 && this.upgraders.length < this.memory.spaces.length))
		) {
			this.spawnUpgrader();
		}
	}

	maxCarts() {
		return Math.floor(this.memory.spaces.length / 3)
	}

	run(): void {

		this.upgraders.forEach(creep => {
			try {
				this.upgraderActions(creep);
			} catch (err) {
				console.log(`Error running actions for creep ${creep.name}`)
				console.log(err)
			}
		})
		this.carts.forEach(creep => {
			try {
				this.cartActions(creep);
			} catch (err) {
				console.log(`Error running actions for creep ${creep.name}`)
				console.log(err)
			}
		})
	}
	cleanUp(): void {
		throw new Error('Method not implemented.');
	}

	spawnCart() {
		const parts = [CARRY, CARRY, CARRY, MOVE, MOVE, MOVE];
		const name = `${this.overlord.name}_${this.name}_${getRandomName()}`;
		this.overlord.mainSpawn.spawnCreep(parts, name, {
			memory: {
				overlord: this.overlord.name,
				strategy: this.name,
				role: CART,
			}
		})
	}

	spawnUpgrader() {

		const parts = [WORK, CARRY, MOVE, WORK];
		const name = `${this.overlord.name}_${this.name}_${getRandomName()}`;
		this.overlord.mainSpawn.spawnCreep(parts, name, {
			memory: {
				overlord: this.overlord.name,
				strategy: this.name,
				role: UPGRADER,
			}
		})
	}

	findMissingSpaces() {
		const idxArr = this.upgraders.map(agent => agent.creep.memory.targetSpace);

		return findMissing(this.memory.spaces, idxArr);
	}

	findBestContainerPos() {
		// first get all spaces 2 away from the controller
		// then sort then by most available neighboring spaces
		const freeSpaces = this.overlord.room
			.lookForAtArea(
				LOOK_TERRAIN,
				this.controller.pos.y - 2,
				this.controller.pos.x - 2,
				this.controller.pos.y + 2,
				this.controller.pos.x + 2,
				true
			)
			.filter(
				(space) => space.terrain === 'plain' || space.terrain === 'swamp'
			);

		// filter all the spaces based on amount of free neighbors they have
		const bestSpaces = freeSpaces.reduce(
			(
				acc: {
					neighbors: number;
					spaces: Array<LookForAtAreaResultWithPos<Terrain, 'terrain'>>;
				},
				space
			) => {
				const neighbors = getFreeSpaces(
					new RoomPosition(space.x, space.y, this.controller.room.name)
				).length;

				if (neighbors === acc.neighbors) {
					return {
						...acc,
						spaces: [...acc.spaces, space],
					};
				} else if (neighbors > acc.neighbors) {
					return {
						neighbors,
						spaces: [space],
					};
				} else {
					return acc;
				}
			},
			{ neighbors: 0, spaces: [] }
		);

		// finally sort them by distance to main Spawns
		const bestPaths = bestSpaces.spaces.reduce(
			(
				acc: {
					distance: number;
					spaces: Array<LookForAtAreaResultWithPos<Terrain, 'terrain'>>;
				},
				space
			) => {
				const distance = this.overlord.mainSpawn.pos.findPathTo(
					space.x,
					space.y
				).length;

				if (distance === acc.distance) {
					return {
						...acc,
						spaces: [...acc.spaces, space],
					};
				} else if (distance < acc.distance) {
					return {
						distance,
						spaces: [space],
					};
				} else {
					return acc;
				}
			},
			{ distance: 99, spaces: [] }
		);

		return _.head(bestPaths.spaces);
	}

	@Actions(UpgraderMachine)
	upgraderActions(upgrader: Agent): Record<States, (dispatch: (event: Events) => void) => void> {
		return {
			[States.spawning]: (dispatch) => {
				if (!upgrader.creep.spawning) {
					if (upgrader.creep.memory.targetSpace) {
						delete upgrader.creep.memory.targetSpace
					}

					const missingSpaces = this.findMissingSpaces();
					console.log(`Missing Spaces ${JSON.stringify(missingSpaces)}`)
					upgrader.creep.memory.targetSpace = _.head(missingSpaces)
					return dispatch(Events.spawned)
				}
			},
			[States.findingBattery]: dispatch => {
				if (this.container) {
					upgrader.creep.memory.target = this.container.id
					dispatch(Events.foundBattery);
					return this.upgraderActions(upgrader);
				}

				const battery = this.findBattery(upgrader);
				if (battery) {
					upgrader.creep.memory.target = battery.id;
					dispatch(Events.foundBattery);
					return this.upgraderActions(upgrader);
				}

				return dispatch(Events.noTargets);
			},
			[States.collecting]: dispatch => {

				if (this.container) {
					upgrader.runMove(this.container.pos, 1);
					upgrader.creep.withdraw(this.container, RESOURCE_ENERGY);
				} else {
					const target = Game.getObjectById<StructureContainer | Resource<ResourceConstant>>(upgrader.creep.memory.target);

					if (target) {
						// @ts-ignore
						if (target?.amount) {
							// this is a dropped resource
							upgrader.runMove(target.pos, 1);
							upgrader.creep.pickup(target as Resource);

						} else {
							// this is a container
							upgrader.runMove(target.pos, 1);
							upgrader.creep.withdraw(target as StructureContainer, RESOURCE_ALLOY);
						}
					}
				}

				if (upgrader.creep.store.getFreeCapacity(RESOURCE_ENERGY) === 0) {
					return dispatch(Events.full);
				}
			},
			[States.movingToTargetSpace]: dispatch => {

				if (!_.isUndefined(upgrader.creep.memory.targetSpace)) {
					const space = this.memory.spaces[upgrader.creep.memory.targetSpace];
					const targetPos = new RoomPosition(space.x, space.y, this.overlord.room.name)

					upgrader.log(`Moving to space ${JSON.stringify(space)}`)
					if (upgrader.creep.pos.getRangeTo(targetPos) <= 0) {
						return dispatch(Events.arrived);
					}

					upgrader.runMove(targetPos, 0)
				}

			},
			[States.upgrading]: dispatch => {
				const err = upgrader.upgrade(this.controller)
				if (err === ERR_NOT_IN_RANGE) {
					dispatch(Events.notInRange);
				}

				if (upgrader.creep.store[RESOURCE_ENERGY] === 0) {
					dispatch(Events.empty)
				}
			},
			[States.idle]: dispatch => {
				if (Game.time % 20 === 1) {
					dispatch(Events.timer)
				}
			},
		}
	}

	@Actions(cartMachine)
	cartActions(
		cart: Agent
	): Record<CartStates, (dispatch: (event: CartEvents) => void) => void> {
		return {
			[CartStates.spawning]: (dispatch) => {
				if (!cart.creep.spawning) {
					return dispatch(CartEvents.spawned);
				}
			},
			[CartStates.collecting]: (dispatch) => {
				if (this.storage) {
					cart.runMove(this.storage.pos, 1);
					cart.creep.withdraw(this.storage, RESOURCE_ENERGY);
				} else {
					let battery: StructureContainer | Resource<ResourceConstant> | StructureStorage | null = null;
					// if there is no storage then get from available batteries
					if (!cart.creep.memory.battery) {
						battery = this.findBattery(cart);
						if (battery) {
							cart.creep.memory.battery = battery.id;
						} else {
							return dispatch(CartEvents.noBattery)
						}
					} else {
						battery = Game.getObjectById(cart.creep.memory.battery)
						delete cart.creep.memory.battery;
					}

					if (!battery) {
						return dispatch(CartEvents.noBattery)
					}

					cart.runMove(battery.pos, 1);
					// @ts-ignore
					if (battery?.amount) {
						// this is a dropped resource
						cart.creep.pickup(battery as Resource);
					} else {
						cart.creep.withdraw(battery as StructureContainer, RESOURCE_ENERGY);
					}

				}
				if (cart.creep.store.getFreeCapacity(RESOURCE_ENERGY) === 0) {
					delete cart.creep.memory.battery;
					return dispatch(CartEvents.full);
				}

			},
			[CartStates.transferring]: (dispatch) => {
				if (this.container) {
					cart.runMove(this.container.pos, 1);
					cart.transfer(this.container);
				}

				if (cart.creep.store[RESOURCE_ENERGY] === 0) {
					return dispatch(CartEvents.empty);
				}
			},
			[CartStates.idle]: (dispatch) => {
				if (Game.time % 20 === 3) {
					return dispatch(CartEvents.timer)
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
}
