import { Actions } from 'action-decorator';
import { Overlord } from 'overlord';
import { Strategy } from 'strategy';

import { Agent } from '../../agent';
import { transition } from '../../machine';
import { getFreeSpaces } from '../../utils/free-spaces';
import { getRandomName } from '../../utils/names';
import { getContainer } from '../../utils/source-utils';
import { Events, minerMachine, States } from './miner.machine';
import {
	cartMachine,
	States as CartStates,
	Events as CartEvents,
} from './cart.machine';

const MINER = 'miner';
const CART = 'cart';

export class MiningStrategy extends Strategy {
	// @ts-ignore
	memory: {
		storageId?: Id<StructureStorage>;
		creeps: {
			[creepName: string]: { x: number; y: number };
		};
	};

	miners: Agent[] = [];
	carts: Agent[] = [];
	container?: StructureContainer | null = null;
	storage?: StructureStorage | null = null;

	constructor(overlord: Overlord, name: string, private source: Source) {
		super(overlord, name);
	}

	initStrategy(): void {
		this.container = getContainer(this.source);
		if (!this.memory.creeps) {
			this.memory.creeps = {};
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
		console.log(`${this.name} Miners: ${this.miners}`);
		this.carts = Object.values(Game.creeps)
			.filter(
				(creep) =>
					creep.memory.overlord === this.overlord.name &&
					creep.memory.strategy === this.name &&
					creep.memory.role === CART
			)
			.map((creep) => new Agent(creep));

		if (this.miners.length < 2) {
			this.spawnMinerCreep();
		}

		if (this.carts.length < 1) {
			this.spawnCartCreep();
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
			const parts = [CARRY, CARRY, CARRY, CARRY, MOVE, MOVE];

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

	findMinerLocation(): RoomPosition[] {
		// miner needs to be touching the source and the container
		// so we need to place the miners in a location that touches both
		let availableSpaces: Array<LookForAtAreaResultWithPos<
			Terrain,
			'terrain'
		>> = [];
		if (this.container) {
			const sourceArea = getFreeSpaces(this.source.pos);
			const containerArea = getFreeSpaces(this.container.pos);

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

	minerActions(miner: Agent): void {
		if (!miner.getState()) {
			miner.setState(minerMachine.initialState);
		}

		// if there is a new event transition accordingly
		if (miner.getEvent()) {
			miner.setState(
				transition(minerMachine, miner.getState()!, miner.getEvent())
			);
			miner.removeEvent();
		}

		const dispatch = (event: Events) => {
			miner.say(event);
			miner.setState(transition(minerMachine, miner.getState()!, event));
		};

		switch (miner.getState()) {
			case States.spawning: {
				if (!miner.creep.spawning) {
					return dispatch(Events.spawned);
				}
			}
			case States.movingToSource: {
				let target;
				if (this.memory.creeps[miner.name]) {
					target = new RoomPosition(
						this.memory.creeps[miner.name].x,
						this.memory.creeps[miner.name].y,
						this.source.pos.roomName
					);
				} else {
					target = _.head(this.findMinerLocation());

					if (!target) {
						return dispatch(Events.noSpaces);
					}

					this.memory.creeps[miner.name] = { x: target.x, y: target.y };
				}
				if (miner.creep.pos.getRangeTo(target) <= 0) {
					return dispatch(Events.arrived);
				}

				miner.runMove(target, 0);
				return;
			}
			case States.harvesting: {
				if (miner.creep.store.getFreeCapacity(RESOURCE_ENERGY) === 0) {
					return dispatch(Events.full);
				}

				const err = miner.harvest(this.source);

				if (err === ERR_NOT_IN_RANGE) {
					return dispatch(Events.notInRange);
				}

				return;
			}
			case States.transferring: {
				if (this.container) {
					const err = miner.transfer(this.container);

					if (err === ERR_NOT_IN_RANGE) {
						return dispatch(Events.notInRange);
					}
					return dispatch(Events.finished);
				}

				return dispatch(Events.finished);
			}
			case States.idle: {
				if (Game.time % 20 === 1) {
					return dispatch(Events.timer);
				}
				return;
			}
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
				if (this.container) {
					cart.runMove(this.container.pos, 1);
					cart.creep.withdraw(this.container, RESOURCE_ENERGY);
				}

				if (cart.creep.store.getFreeCapacity(RESOURCE_ENERGY) === 0) {
					return dispatch(CartEvents.full);
				}
			},
			[CartStates.transferring]: (dispatch) => {
				if (this.storage) {
					cart.runMove(this.storage.pos, 1);
					cart.creep.transfer(this.storage, RESOURCE_ENERGY);
				}

				if (cart.creep.store[RESOURCE_ENERGY] === 0) {
					return dispatch(CartEvents.empty);
				}
			},
			[CartStates.idle]: (dispatch) => {},
		};
	}
}
