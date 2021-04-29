import { Actions } from 'action-decorator';
import { Overlord } from 'overlord';
import { Strategy } from 'strategy';

import { Agent } from '../../agent';
import { getFreeSpaces } from '../../utils/free-spaces';
import { findMissing } from '../../utils/index';
import { getRandomName } from '../../utils/names';
import { getContainer } from '../../utils/source-utils';
import { cartMachine, Events as CartEvents, States as CartStates } from './cart.machine';
import { Events, minerMachine, States } from './miner.machine';

const MINER = 'miner';
const CART = 'cart';

export class MiningStrategy extends Strategy {
	// @ts-ignore
	memory: {
		storageId?: Id<StructureStorage>;
		containerPos?: { x: number; y: number };
		sourceSpaces: Array<{ x: number; y: number; }>
	};

	miners: Agent[] = [];
	carts: Agent[] = [];
	container?: StructureContainer | null = null;
	storage?: StructureStorage | null = null;

	constructor(overlord: Overlord, name: string, private source: Source) {
		super(overlord, name);
	}

	initStrategy(): void {
		if (!this.memory.containerPos) {
			this.memory.containerPos = this.getBestContainerSpace();
			this.memory.sourceSpaces = this.findMinerLocation().map(({ x, y }) => ({ x, y }))
		}

		this.container = getContainer(this.source);

		if (!this.container) {
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

		// first look for storage
		if (this.memory?.storageId) {
			this.storage = Game.getObjectById(this.memory.storageId);
		} else {
			// check if there is a storage
			const storages = this.overlord.room.find<StructureStorage>(
				FIND_MY_STRUCTURES,
				{
					filter: { structureType: STRUCTURE_STORAGE },
				}
			);

			if (storages.length > 0) {
				const storage = _.head(storages);
				this.memory.storageId = storage.id;
				this.storage = storage;
			}
		}
	}

	rollCall(): void {
		this.miners = Object.values(Game.creeps)
			.filter(
				(creep) =>
					creep.memory.overlord === this.overlord.name &&
					creep.memory.strategy === this.name &&
					creep.memory.role === MINER
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

		if (this.carts.length < 1) {
			this.spawnCartCreep();
		}

		if (
			this.miners.length === 0 ||
			(this.miners.length < 2 && this.carts.length >= 1)
		) {
			this.spawnMinerCreep();
		}
	}

	run(): void {
		this.miners.forEach((miner) => {
			try {
				this.minerActions(miner);
			} catch (err) {
				console.log(`Error running actions for ${miner.name}`);
			}
		});
		this.carts.forEach((miner) => {
			try {
				this.cartActions(miner);
			} catch (err) {
				console.log(`Error running actions for ${miner.name}`);
			}
		});
	}
	cleanUp(): void {
		throw new Error('Method not implemented.');
	}

	spawnMinerCreep() {
		const energyAvailable = this.overlord.mainSpawn.room.energyAvailable;

		if (energyAvailable >= 300) {
			const parts = [WORK, WORK, MOVE, CARRY];

			const name = `${this.name}_${getRandomName()}`;

			const status = this.overlord.mainSpawn.spawnCreep(parts, name, {
				memory: {
					role: MINER,
					strategy: this.name,
					overlord: this.overlord.name,
				},
			});
		}
	}
	spawnCartCreep() {
		const energyAvailable = this.overlord.mainSpawn.room.energyAvailable;

		if (energyAvailable >= 300) {
			const parts = [CARRY, CARRY, CARRY, MOVE, MOVE, MOVE];

			const name = `${this.name}_${getRandomName()}`;

			const status = this.overlord.mainSpawn.spawnCreep(parts, name, {
				memory: {
					role: CART,
					strategy: this.name,
					overlord: this.overlord.name,
				},
			});
		}
	}

	getBestContainerSpace() {
		const sourcePos = this.source.pos;

		// first get a list of all container space
		const area = this.source.room.lookForAtArea(
			LOOK_TERRAIN,
			sourcePos.y - 2,
			sourcePos.x - 2,
			sourcePos.y + 2,
			sourcePos.x + 2,
			true
		);

		// filter out anything thats not exactly 2 spaces away
		const filteredSpaces = area
			.filter(
				(space) =>
					Math.abs(space.x - sourcePos.x) === 2 ||
					Math.abs(space.y - sourcePos.y) === 2
			)

			// filter out anything thats not a plain or swamp
			.filter(
				(space) => space.terrain === 'plain' || space.terrain === 'swamp'
			)
			// filter out any spaces that are close to multiple sources
			.filter(
				(space) => new RoomPosition(space.x, space.y, this.overlord.room.name).findInRange(FIND_SOURCES, 2).length === 1
			);

		// sort by the the amount of free spaces that it shares with the source
		const sourceArea = getFreeSpaces(sourcePos);

		return _.last(
			_.sortBy(filteredSpaces, (space) => {
				const containerArea = getFreeSpaces(
					new RoomPosition(space.x, space.y, this.source.pos.roomName)
				);
				let count = 0;
				for (const sourceSpace of sourceArea) {
					for (const containerSpace of containerArea) {
						if (
							sourceSpace.x === containerSpace.x &&
							sourceSpace.y === containerSpace.y
						) {
							count++;
						}
					}
				}

				return count;
			})
		);
	}

	findMinerLocation(): RoomPosition[] {
		// miner needs to be touching the source and the container
		// so we need to place the miners in a location that touches both
		let availableSpaces: Array<LookForAtAreaResultWithPos<
			Terrain,
			'terrain'
		>> = [];
		if (this.memory.containerPos) {
			const sourceArea = getFreeSpaces(this.source.pos);
			const containerArea = getFreeSpaces(
				new RoomPosition(
					this.memory.containerPos?.x,
					this.memory.containerPos?.y,
					this.overlord.room.name
				)
			);

			// find matching slots between the two
			for (const sourceSpace of sourceArea) {
				for (const containerSpace of containerArea) {
					if (
						sourceSpace.x === containerSpace.x &&
						sourceSpace.y === containerSpace.y
					) {
						availableSpaces.push(sourceSpace);
					}
				}
			}
		} else {
			availableSpaces = [...getFreeSpaces(this.source.pos)];
		}

		// filter out spaces with creeps
		return availableSpaces
			.filter(
				(space) =>
					this.source.room.lookForAt(LOOK_CREEPS, space.x, space.y).length === 0
			)
			.map(
				(space) => new RoomPosition(space.x, space.y, this.source.pos.roomName)
			);
	}

	getFreeMinerSpaces() {
		const idxArr = this.miners.map(agent => agent.creep.memory.targetSpace);
		return findMissing(this.memory.sourceSpaces, idxArr);
	}

	@Actions(minerMachine)
	minerActions(
		miner: Agent
	): Record<States, (dispatch: (event: Events) => void) => void> {
		return {
			[States.spawning]: (dispatch) => {
				if (!miner.creep.spawning) {
					if (!_.isUndefined(miner.creep.memory.targetSpace)) {
						delete miner.creep.memory.targetSpace
					}

					miner.creep.memory.targetSpace = _.head(this.getFreeMinerSpaces());
					return dispatch(Events.spawned);
				}
			},
			[States.movingToSource]: (dispatch) => {
				const target = this.memory.sourceSpaces[miner.creep.memory.targetSpace];
				const targetPos = new RoomPosition(target.x, target.y, this.overlord.room.name);

				if (miner.creep.pos.getRangeTo(targetPos) <= 0) {
					return dispatch(Events.arrived);
				}

				miner.runMove(targetPos, 0);
				return;
			},
			[States.harvesting]: (dispatch) => {
				const err = miner.harvest(this.source);
				if (err === ERR_NOT_IN_RANGE) {
					return dispatch(Events.notInRange);
				}

				if (this.container) {
					miner.transfer(this.container);
				}
				return;
			},
			[States.idle]: (dispatch) => {
				if (Game.time % 20 === 1) {
					return dispatch(Events.timer);
				}
				return;
			},
		};
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
				if (this.container) {
					cart.runMove(this.container.pos, 1);
					cart.creep.withdraw(this.container, RESOURCE_ENERGY);
				} else {
					// if no container get the dropped resources at the miner positions
					if (!cart.creep.memory.target) {
						const resources = this.miners.map((miner) =>
							_.head(this.overlord.room.lookForAt(LOOK_ENERGY, miner.creep.pos))
						);
						if (resources.length > 0) {
							cart.creep.memory.target = _.head(resources).id;
						}
					}
					const resource = Game.getObjectById<Resource<ResourceConstant>>(
						cart.creep.memory.target
					);

					if (resource) {
						cart.runMove(resource.pos, 1);
						cart.creep.pickup(resource);
					}
				}

				if (cart.creep.store.getFreeCapacity(RESOURCE_ENERGY) === 0) {
					return dispatch(CartEvents.full);
				}
			},
			[CartStates.transferring]: (dispatch) => {
				if (this.storage) {
					cart.runMove(this.storage.pos, 1);
					cart.creep.transfer(this.storage, RESOURCE_ENERGY);
				} else {
					// if there is no storage deliver the resources to spawn
					cart.runMove(this.overlord.mainSpawn.pos, 1);
					const err = cart.creep.transfer(this.overlord.mainSpawn, RESOURCE_ENERGY);

				}

				if (cart.creep.store[RESOURCE_ENERGY] === 0) {
					return dispatch(CartEvents.empty);
				}
			},
			[CartStates.idle]: (dispatch) => { },
		};
	}
}
