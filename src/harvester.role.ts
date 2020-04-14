const noop = () => {};

const enum STATE {
	harvesting = 'harvesting',
	movingToSource = 'movingToSource',
	movingToController = 'movingToController',
	upgrading = 'upgrading'
}

const enum ACTIONS {
	arrivedAtSource = 'arrivedAtSource',
	arrivedAtController = 'arrivedAtController',
	full = 'full',
	finished = 'empty'
}

const clearMemory = (creep: Harvester) => {
	delete creep.memory._move;
	delete creep.memory.target;
};

const actions: Record<
	STATE,
	Partial<Record<ACTIONS, (creep: Harvester) => void>>
> = {
	[STATE.harvesting]: {
		[ACTIONS.full]: creep => {
			creep.say('full');
			clearMemory(creep);
			creep.memory.state = STATE.movingToController;
		}
	},
	[STATE.upgrading]: {
		[ACTIONS.finished]: creep => {
			creep.say('empty');
			clearMemory(creep);
			creep.memory.state = STATE.movingToSource;
		}
	},
	[STATE.movingToController]: {
		[ACTIONS.arrivedAtController]: creep => {
			creep.say('arrived');
			clearMemory(creep);
			creep.memory.state = STATE.upgrading;
		}
	},
	[STATE.movingToSource]: {
		[ACTIONS.arrivedAtSource]: creep => {
			creep.say('arrived');
			clearMemory(creep);
			creep.memory.state = STATE.harvesting;
		}
	}
};

interface HarvesterMemory extends CreepMemory {
	state: STATE;
	target: RoomPosition;
	_move: any;
	source: string;
	action: ACTIONS;
}

export interface Harvester extends Creep {
	memory: HarvesterMemory;
}

export const run = (creep: Harvester) => {
	if (creep.memory.debug) {
		creep.say(creep.memory.state);
	}

	if (creep.memory.action) {
		executeAction(creep);
	}

	switch (creep.memory.state) {
		case STATE.harvesting: {
			if (!creep.memory.source) {
				const _source = creep.pos.findClosestByPath(FIND_SOURCES);
				if (!_source) {
					console.error(`cant find valid source for '${creep.name}'`);
					return;
				}
				creep.memory.source = _source.id;
			}
			const source = Game.getObjectById<Source>(creep.memory.source)!;
			const err = creep.harvest(source);
			if (err === ERR_NOT_IN_RANGE) {
				const controller = creep.room.controller;
				creep.memory.target = controller!.pos;
				creep.memory.state = STATE.movingToSource;
			}
			if (creep.store.getFreeCapacity(RESOURCE_ENERGY) === 0) {
				creep.memory.action = ACTIONS.full;
			}
			break;
		}
		case STATE.movingToSource: {
			let source = Game.getObjectById<Source>(creep.memory.source);
			if (!source) {
				source = creep.pos.findClosestByPath(FIND_SOURCES);
			}
			const path = creep.memory._move || creep.pos.findPathTo(source!.pos);
			const moveErr = creep.moveByPath(path);
			const err = creep.harvest(source!);
			if (err === OK) {
				creep.memory.action = ACTIONS.arrivedAtSource
			}
			break;
		}

		case STATE.movingToController: {
			const target = creep.room.controller!;
			const path = creep.memory._move || creep.pos.findPathTo(target);
			const moveErr = creep.moveByPath(path);

			const err = creep.upgradeController(creep.room.controller!);
			if (err === OK) {
				creep.memory.action = ACTIONS.arrivedAtController
			}
			break;
		}
		case STATE.upgrading: {
			const err = creep.upgradeController(creep.room.controller!);
			if (err === ERR_NOT_IN_RANGE) {
				creep.memory.state = STATE.movingToController;
			}
			if (err === ERR_NOT_ENOUGH_RESOURCES) {
				creep.memory.action = ACTIONS.finished;
			}
			break;
		}
		default: {
			// when not in a state we need to figure out what to do
			if (creep.store.getFreeCapacity(RESOURCE_ENERGY) > 0) {
				creep.memory.state = STATE.harvesting;
			}
		}
	}
};

const executeAction = (creep: Harvester) => {
	const action = actions[creep.memory.state][creep.memory.action] || noop;
	action(creep);
	delete creep.memory.action;
};
