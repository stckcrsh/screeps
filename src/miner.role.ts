const noop = () => {};

const enum STATE {
	mining = 'mining',
	movingToSource = 'movingToSource',
}

const enum ACTIONS {
	arrivedAtSource = 'arrivedAtSource',
}

const clearMemory = (creep: Miner) => {
	delete creep.memory._move;
	// @ts-ignore
	delete creep.memory.target;
};

const actions: Record<
	STATE,
	Partial<Record<ACTIONS, (creep: Miner) => void>>
> = {
	[STATE.movingToSource]: {
		[ACTIONS.arrivedAtSource]: (creep) => {
			creep.say('arrived');
			clearMemory(creep);
			creep.memory.state = STATE.mining;
		},
	},
	[STATE.mining]: {},
};

interface MinerMemory extends CreepMemory {
	state: STATE;
	target: RoomPosition;
	_move: any;
	source: string;
	action: ACTIONS;
}

export interface Miner extends Creep {
	memory: MinerMemory;
}

export const run = (creep: Miner) => {
	if (creep.memory.debug) {
		creep.say(creep.memory.state);
	}

	if (creep.memory.action) {
		executeAction(creep);
	}

	switch (creep.memory.state) {
		case STATE.mining: {
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
				creep.memory.action = ACTIONS.arrivedAtSource;
			}
			break;
		}

		default: {
			// when not in a state we need to figure out what to do
			if (creep.store.getFreeCapacity(RESOURCE_ENERGY) > 0) {
				creep.memory.state = STATE.mining;
			}
		}
	}
};

const executeAction = (creep: Miner) => {
	const action = actions[creep.memory.state][creep.memory.action] || noop;
	action(creep);
	// @ts-ignore
	delete creep.memory.action;
};
