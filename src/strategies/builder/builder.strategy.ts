import * as BuilderRole from 'builder.role';
import { Strategy } from 'strategy';
import { getRandomName } from 'utils/names';

import { Actions } from '../../action-decorator';
import { Agent } from '../../agent';
import { transition } from '../../machine';
import { Overlord } from '../../overlord';
import {
	builderMachine,
	EVENTS as BuilderEvents,
	STATES as BuilderStates,
} from './builder.machine';
import {
	cartMachine,
	Events as CartEvents,
	States as CartStates,
} from './cart.machine';

const BUILDER = 'builder';
const CART = 'cart';

/**
 * Builders spawn with a cart (carts deliver energy to the builder)
 *
 *
 * @export
 * @class BuilderStrategy
 * @extends {Strategy}
 */
export class BuilderStrategy extends Strategy {
	// sites: ConstructionSite[];
	// room: Room;

	// @ts-ignore
	memory: {
		target?: Id<ConstructionSite | Structure>;
		storageId?: Id<StructureStorage>;
	};

	builders: Agent[] = [];
	carts: Agent[] = [];

	// ========================================================================
	//     Getters and Setters for memory
	// ========================================================================

	get spawn(): StructureSpawn {
		return this.overlord.mainSpawn;
	}

	get target() {
		return this.memory.target && Game.getObjectById(this.memory.target);
	}

	constructor(overlord: Overlord, name: string) {
		super(overlord, name);
	}

	initStrategy(): void {
		/** */
	}

	rollCall() {
		this.builders = Object.values(Game.creeps)
			.filter(
				(creep) =>
					creep.memory.overlord === this.overlord.name &&
					creep.memory.strategy === this.name &&
					creep.memory.role === BUILDER
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

		// check if any builders need to be spawned
		if (this.builders.length < 1) {
			this.spawnBuilder();
		}

		if (this.carts.length < 1) {
			this.spawnCart();
		}
	}

	spawnCart() {
		const parts = [CARRY, CARRY, MOVE, CARRY, MOVE, CARRY];
		const name = `${this.overlord.name}_${this.name}_${getRandomName()}`;

		this.spawn.spawnCreep(parts, name, {
			memory: {
				role: CART,
				strategy: this.name,
				overlord: this.overlord.name,
			},
		});
	}

	spawnBuilder() {
		const parts = [WORK, CARRY, CARRY, MOVE, CARRY];
		const name = `${this.overlord.name}_${this.name}_${getRandomName()}`;

		this.spawn.spawnCreep(parts, name, {
			memory: {
				role: BUILDER,
				strategy: this.name,
				overlord: this.overlord.name,
			},
		});
	}

	run() {
		this.builders.forEach((builder) => {
			this.builderActions(builder);
		});
		this.carts.forEach((cart) => {
			this.cartActions(cart);
		});
	}
	cleanUp() {}

	@Actions(builderMachine)
	builderActions(
		builder: Agent
	): Record<BuilderStates, (dispatch: (event: BuilderEvents) => void) => void> {
		const moveToTarget = (dispatch: (event: BuilderEvents) => void) => {
			if (this.target) {
				if (builder.creep.pos.getRangeTo(this.target.pos) <= 3) {
					dispatch(BuilderEvents.ARRIVED);
					return this.builderActions(builder);
				}
				builder.runMove(this.target.pos, 3);
				return;
			} else {
				return dispatch(BuilderEvents.NO_TARGETS_FOUND);
			}
		};

		return {
			[BuilderStates.SPAWNING]: (dispatch) => {
				if (!builder.creep.spawning) {
					return dispatch(BuilderEvents.SPAWNED);
				}
			},
			[BuilderStates.FIND_TARGET]: (dispatch) => {
				if (this.memory.target) {
					const constructionSite = Game.getObjectById(this.memory.target);
					if (constructionSite) {
						dispatch(BuilderEvents.TARGET_FOUND);
						return this.builderActions(builder);
					}
				}

				const site = builder.creep.pos.findClosestByPath(
					FIND_CONSTRUCTION_SITES
				);
				if (site) {
					this.memory.target = site.id;
					dispatch(BuilderEvents.TARGET_FOUND);
				} else {
					return dispatch(BuilderEvents.NO_TARGETS_FOUND);
				}
			},
			[BuilderStates.MOVE_TO_BUILD]: moveToTarget,
			[BuilderStates.BUILDING]: (dispatch) => {
				if (this.target) {
					const err = builder.build(this.target as ConstructionSite);

					if (err === ERR_NOT_ENOUGH_RESOURCES) {
						return dispatch(BuilderEvents.ENERGY_EMPTY);
					} else if (err === ERR_INVALID_TARGET) {
						return dispatch(BuilderEvents.COMPLETE);
					} else if (err === ERR_NOT_IN_RANGE) {
						return dispatch(BuilderEvents.NOT_IN_RANGE);
					}
				} else {
					return dispatch(BuilderEvents.NO_TARGETS_FOUND);
				}
			},
			[BuilderStates.MOVE_TO_REPAIR]: moveToTarget,
			[BuilderStates.REPAIRING]: (dispatch) => {
				if (this.target) {
					const err = builder.repair(this.target as Structure);

					if (err === ERR_NOT_ENOUGH_RESOURCES) {
						return dispatch(BuilderEvents.ENERGY_EMPTY);
					} else if (err === ERR_INVALID_TARGET) {
						return dispatch(BuilderEvents.COMPLETE);
					} else if (err === ERR_NOT_IN_RANGE) {
						return dispatch(BuilderEvents.NOT_IN_RANGE);
					}
				} else {
					return dispatch(BuilderEvents.NO_TARGETS_FOUND);
				}
			},

			[BuilderStates.IDLE]: (dispatch) => {
				if (Game.time % 20 === 18) {
					return dispatch(BuilderEvents.TIMER);
				}
			},
		};
	}

	@Actions(cartMachine)
	cartActions(
		cart: Agent
	): Record<CartStates, (dispatch: (event: CartEvents) => void) => void> {
		const moveToTarget = (dispatch: (event: CartEvents) => void) => {
			const target = Game.getObjectById<StructureStorage | StructureContainer>(
				cart.creep.memory.target
			)!;

			if (cart.creep.pos.getRangeTo(target.pos) <= 1) {
				return dispatch(CartEvents.ARRIVED);
			}
			cart.runMove(target.pos, 1);
		};

		return {
			[CartStates.SPAWNING]: (dispatch) => {
				if (!cart.creep.spawning) {
					return dispatch(CartEvents.SPAWNED);
				}
			},

			[CartStates.PROCURING_ENERGY]: (dispatch) => {
				const target = this.findEnergy(cart);
				console.log(`Target: ${target?.id}`);
				if (target) {
					cart.creep.memory.target = target.id;
					return dispatch(CartEvents.BATTERY_FOUND);
				}
			},
			[CartStates.MOVING_TO_ENERGY]: moveToTarget,
			[CartStates.MOVING_TO_BUILDER]: (dispatch) => {
				const targets = _.sortBy(
					this.builders,
					(builder) => builder.creep.store[RESOURCE_ENERGY]
				);
				const target = _.head(targets);
				cart.creep.memory.target = target.creep.id;

				if (cart.creep.pos.getRangeTo(target.creep.pos) <= 1) {
					return dispatch(CartEvents.ARRIVED);
				}

				cart.runMove(target.creep.pos, 1);
			},
			[CartStates.COLLECTING_ENERGY]: (dispatch) => {
				const target = Game.getObjectById<
					StructureStorage | StructureContainer
				>(cart.creep.memory.target)!;

				const err = cart.creep.withdraw(target, RESOURCE_ENERGY);
				console.log(`Collecting: ${err}`);
				if (err === ERR_FULL) {
					dispatch(CartEvents.ENERGY_FULL);
				}

				if (err === OK) {
					dispatch(CartEvents.BATTERY_EMPTY);
				}

				if (err === ERR_NOT_IN_RANGE) {
					return dispatch(CartEvents.NOT_IN_RANGE);
				}
			},
			[CartStates.TRANSFERING]: (dispatch) => {
				const target = Game.getObjectById<StructureExtension>(
					cart.creep.memory.target
				)!;
				if (!target) {
					return dispatch(CartEvents.NO_TARGETS);
				}
				console.log(`Targetting: ${target}`);
				const err = cart.transfer(target);

				if (err === ERR_NOT_ENOUGH_RESOURCES) {
					dispatch(CartEvents.ENERGY_EMPTY);
				}
				if (err === ERR_NOT_IN_RANGE) {
					return dispatch(CartEvents.NOT_IN_RANGE);
				}
			},
			[CartStates.IDLE]: (dispatch) => {
				if (Game.time % 20 === 19) {
					return dispatch(CartEvents.TIMER);
				}
			},
		};
	}

	findEnergy(agent: Agent): StructureStorage | StructureContainer | Resource {
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

		return _.last(
			_.sortBy(containers, (container) => container.store[RESOURCE_ENERGY])
		);
	}
}
