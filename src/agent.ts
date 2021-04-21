import { isPosEqual } from './utils/position';
export class Agent {
	memory: {
		event?: string;
		state?: string;
		[idx: string]: any;
	};

	constructor(public creep: Creep) {
		this.memory = this.creep.memory;
	}

	log(msg: string) {
		if (this.creep.memory.debug) {
			console.log(`${this.name}: ${msg}`)
		}
	}

	getState() {
		return this.memory.state;
	}

	setState(_state: string) {
		this.memory.state = _state;
	}

	get name() {
		return this.creep.name;
	}

	hashRoomPosition(pos: RoomPosition) {
		return `${pos.x}${pos.y}${pos.roomName}`;
	}

	runMove(
		target: RoomPosition,
		range: number = 1
	): CreepMoveReturnCode | -5 | -10 {
		if (!this.memory.__travel) {
			this.memory.__travel = { stuck: 0, path: null, target }
		}

		const travel = this.memory.__travel;
		this.log(`Travel: ${JSON.stringify(travel)}`)

		// wipe out the path if the target changed
		if (!isPosEqual(travel.target, target)) {

			this.log('target has changed')
			delete travel.path;
			delete travel.prev;
			travel.stuck = 0;
			travel.target = target;
		}

		// this unit is stuck repath
		if (travel.stuck >= 3) {
			this.log('is stuck repathing')
			delete travel.path;
		}

		if (this.creep.pos.getRangeTo(target) <= range) {
			this.log('within range of target')
			delete travel.path;
			return OK;
		}

		if (!travel?.path) {
			travel.path = this.creep.pos.findPathTo(target);
			this.log(`created new path ${JSON.stringify(travel.path)}`)

			let lastPosition = this.creep.pos;
			for (const position of travel.path) {
				const pos = new RoomPosition(
					position.x,
					position.y,
					this.creep.pos.roomName
				);
				new RoomVisual(this.creep.pos.roomName).line(
					lastPosition.x,
					lastPosition.y,
					pos.x,
					pos.y,
					{
						color: '#f58634',
						lineStyle: 'dotted',
					}
				);
				lastPosition = pos;
			}
		}

		// check if we are stuck
		if (travel.prev) {
			travel.prev = new RoomPosition(travel.prev.x, travel.prev.y, travel.prev.roomName);

			this.log(`checking if stuck`)
			if (this.creep.pos.inRangeTo(travel.prev, 0)) {
				travel.stuck++;
			} else {
				travel.stuck = 0;
			}
		}

		const err = this.creep.moveByPath(travel.path!);
		this.log(`has moved`);
		travel.prev = this.creep.pos;

		return err;
	}

	harvest(source: Source | Mineral) {
		return this.creep.harvest(source);
	}

	build(site: ConstructionSite) {
		return this.creep.build(site);
	}
	upgrade(site: StructureController) {
		return this.creep.upgradeController(site);
	}
	repair(target: Structure<StructureConstant>) {
		return this.creep.repair(target);
	}
	hasLoad(): boolean {
		if (this.creep.store.getCapacity(RESOURCE_ENERGY) === 0) {
			return false;
		}

		if (this.memory.hasLoad && this.creep.store[RESOURCE_ENERGY] === 0) {
			this.memory.hasLoad = false;
		} else if (
			!this.memory.hasLoad &&
			this.creep.store[RESOURCE_ENERGY] ===
			this.creep.store.getCapacity(RESOURCE_ENERGY)
		) {
			this.memory.hasLoad = true;
		}
		return this.memory.hasLoad;
	}

	dispatch(event: string) {
		this.creep.memory.event = event;
	}

	getEvent() {
		return this.creep.memory.event;
	}
	removeEvent() {
		delete this.creep.memory.event;
	}
	say(msg: string) {
		this.creep.say(msg);
	}

	transfer(target: AnyCreep | Structure<StructureConstant>, resourceType: ResourceConstant = RESOURCE_ENERGY, amount?: number) {
		return this.creep.transfer(target, resourceType, amount);
	}
}
