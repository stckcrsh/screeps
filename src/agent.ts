export class Agent {
	memory: {
		path?: PathStep[];
		event?: string;
		state?: string;
		[idx: string]: any;
	};

	constructor(public creep: Creep) {
		this.memory = this.creep.memory;
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
		const targetHash = this.hashRoomPosition(target);

		if (targetHash !== this.creep.memory.targetHash) {
			console.log(`hash dont match for ${this.name}`);
			this.creep.memory.targetHash = targetHash;
			delete this.creep.memory.path;
		}

		if (this.creep.pos.getRangeTo(target) <= range) {
			console.log(`withing range for ${this.name}`);
			delete this.creep.memory.path;
			return OK;
		}

		if (!this.creep.memory.path) {
			const path = this.creep.pos.findPathTo(target);
			this.creep.memory.path = path;

			let lastPosition = this.creep.pos;
			for (const position of path) {
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

		const err = this.creep.moveByPath(this.creep.memory.path!);

		if (err !== OK) {
			delete this.creep.memory.path;
		}

		return err;
	}

	harvest(source: Source | Mineral) {
		return this.creep.harvest(source);
	}

	build(site: ConstructionSite) {
		return this.creep.build(site);
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

	transfer(target: AnyCreep | Structure<StructureConstant>, amount?: number) {
		return this.creep.transfer(target, RESOURCE_ENERGY, amount);
	}
}
