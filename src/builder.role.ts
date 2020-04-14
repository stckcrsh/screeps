const noop = () => {};

const SPAWNING = 'spawning';
const FIND_SOURCE = 'finding source';
const FIND_BUILD_TARGET = 'find build target';
const MOVE_TO_SOURCE = 'moving to source';
const MOVE_TO_BUILD = 'moving to build';
const HARVESTING = 'harvesting';
const BUILDING = 'building';
const IDLE = 'idle';

type STATES =
	| typeof SPAWNING
	| typeof FIND_SOURCE
	| typeof FIND_BUILD_TARGET
	| typeof MOVE_TO_SOURCE
	| typeof MOVE_TO_BUILD
	| typeof BUILDING
	| typeof HARVESTING
	| typeof IDLE;

const SPAWNED = 'spawned';
const ARRIVED = 'arrived';
const TARGET_FOUND = 'target found';
const NO_TARGETS_FOUND = 'no targets found';
const ENERGY_FULL = 'energy full';
const ENERGY_EMPTY = 'energy empty';
const BUILD_COMPLETE = 'build complete';
const NOT_IN_RANGE = 'not in range';

type EVENTS =
	| typeof SPAWNED
	| typeof ARRIVED
	| typeof TARGET_FOUND
	| typeof NO_TARGETS_FOUND
	| typeof ENERGY_FULL
	| typeof ENERGY_EMPTY
	| typeof NOT_IN_RANGE
	| typeof BUILD_COMPLETE;

interface BuilderMemory extends CreepMemory {
	state: STATES;
	event: EVENTS;
	source: string;
	constructionSite: string;
	_move: any;
	init: boolean;
}

export interface Builder extends Creep {
	memory: BuilderMemory;
}

export interface Machine<
	States extends string,
	Events extends string,
	C extends Creep
> {
	initialState: States;
	states: Record<States, StateNode<States, Events, C>>;
}

export interface StateNode<
	States extends string,
	Events extends string,
	C extends Creep
> {
	run: (creep: C) => void;
	events: Partial<Record<Events, States>>;
}

function dispatch(creep: Builder, event: EVENTS) {
	creep.memory.event = event;
}

const builderMachine: Machine<STATES, EVENTS, Builder> = {
	initialState: SPAWNING,
	states: {
		[SPAWNING]: {
			events: {
				[SPAWNED]: FIND_SOURCE
			},
			run: runSpawn
		},
		[FIND_SOURCE]: {
			events: {
				[TARGET_FOUND]: MOVE_TO_SOURCE,
				[NO_TARGETS_FOUND]: IDLE
			},
			run: runFindSource
		},
		[FIND_BUILD_TARGET]: {
			events: {
				[TARGET_FOUND]: MOVE_TO_BUILD,
				[NO_TARGETS_FOUND]: IDLE
			},
			run: runFindBuild
		},
		[MOVE_TO_SOURCE]: {
			events: {
				[ARRIVED]: HARVESTING
			},
			run: runMoveToSource
		},
		[MOVE_TO_BUILD]: {
			events: {
				[ARRIVED]: BUILDING
			},
			run: runMoveToBuild
		},
		[HARVESTING]: {
			events: {
				[ENERGY_FULL]: FIND_BUILD_TARGET,
				[NOT_IN_RANGE]: MOVE_TO_SOURCE
			},
			run: runHarvesting
		},
		[BUILDING]: {
			events: {
				[ENERGY_EMPTY]: FIND_SOURCE,
				[BUILD_COMPLETE]: FIND_BUILD_TARGET,
				[NOT_IN_RANGE]: MOVE_TO_BUILD
			},
			run: runBuilding
		},
		[IDLE]: {
			events: {
				[ENERGY_FULL]: FIND_BUILD_TARGET
			},
			run: runIdle
		}
	}
};

function transition<
	State extends string,
	Event extends string,
	C extends Creep
>(machine: Machine<State, Event, C>, state: State, event: Event): State {
	return _.get<Machine<any, any, any>, State>(
		machine,
		['states', state, 'events', event],
		state
	);
}

export function run(creep: Builder) {
	// "needs to be initialized" -> we initialize the creep if that hasn't been done yet.
	if (!creep.memory.init) {
		// We might need to evaluate something, register the creep with some other code we have, do some work based on the memory that the creep was spawned with...
		// Set up the creep's memory... Ideally you want to cache as much info as possible so that the work is only done in 1 tick of the creep's life, not all 1500 of them plus spawning time!
		// For this example, we probably want to figure out which source the creep should harvest and store that in memory (the objectId, or it's position, or maybe both, or maybe not at all... it depends on your code!).
		creep.memory.init = true; // so that we know in the following ticks that it's already been initialized...
		creep.memory.state = builderMachine.initialState;
	}

	let nextState = _.get<StateNode<STATES, EVENTS, Builder>>(builderMachine, [
		'states',
		creep.memory.state
	]);

	if (creep.memory.event) {
		const stateStr = _.get<STATES>(builderMachine, [
			'states',
			creep.memory.state,
			'events',
			creep.memory.event
		]);

		nextState = _.get<StateNode<STATES, EVENTS, Builder>>(builderMachine, [
			'states',
			stateStr
		]);

		delete creep.memory.event;
		creep.memory.state = stateStr;
	}
	nextState.run(creep);
}

function runSpawn(creep: Builder) {
	creep.say('spawning');
	if (!creep.spawning) {
		creep.memory.event = SPAWNED; // Set the creeps new state
		run(creep); // Call the main run function so that the next state function runs straight away
		return; // We put return here because once we transition to a different state, we don't want any of the following code in this function to run...
	}
}

function runFindSource(creep: Builder) {
	creep.say('🔎: Source');
	const source = creep.pos.findClosestByPath(FIND_SOURCES);

	if (!source) {
		return dispatch(creep, NO_TARGETS_FOUND);
	}

	creep.memory.source = source.id;

	 dispatch(creep, TARGET_FOUND);
	return run(creep); // Call the main run function so that the next state function runs straight away
}

function runFindBuild(creep: Builder) {
	creep.say('🔎: Build');
	let target = Game.getObjectById<ConstructionSite>(
		creep.memory.constructionSite
	);

	if (!target) {
		target = creep.pos.findClosestByPath(FIND_CONSTRUCTION_SITES);
	}

	if (!target) {
		return dispatch(creep, NO_TARGETS_FOUND);
	}
	creep.memory.constructionSite = target!.id;

	return dispatch(creep, TARGET_FOUND);
}
function runMoveToSource(creep: Builder) {
	creep.say('🏃‍♂️: Source');
	const target = creep.memory.source;
	const source = Game.getObjectById<Source>(creep.memory.source)!;

	return runMove(creep, source.pos);
}
function runMoveToBuild(creep: Builder) {
	creep.say('🏃‍♂️: Build');
	const target = creep.memory.constructionSite;
	const source = Game.getObjectById<ConstructionSite>(
		creep.memory.constructionSite
	)!;

	return runMove(creep, source.pos, 3);
}
function runMove(creep: Builder, target: RoomPosition, range: number = 1) {
	if (creep.pos.getRangeTo(target) <= range) {
		return dispatch(creep, ARRIVED);
	}

	const path = creep.memory._move || creep.pos.findPathTo(target);
	const moveErr = creep.moveByPath(path);
}
function runHarvesting(creep: Builder) {
	creep.say('🚧: Harvest');
	const source = Game.getObjectById<Source>(creep.memory.source)!;

	const err = creep.harvest(source);
	if (err === ERR_NOT_IN_RANGE) {
		return dispatch(creep, NOT_IN_RANGE);
	}
	if (creep.store.getFreeCapacity(RESOURCE_ENERGY) === 0) {
		return dispatch(creep, ENERGY_FULL);
	}
}
function runBuilding(creep: Builder) {
	creep.say('🚧: Build');
	const constructionSite = Game.getObjectById<ConstructionSite>(
		creep.memory.constructionSite
	)!;

	const err = creep.build(constructionSite);
	if (err === ERR_NOT_IN_RANGE) {
		return dispatch(creep, NOT_IN_RANGE);
	}
	if (err === ERR_NOT_ENOUGH_RESOURCES) {
		return dispatch(creep, ENERGY_EMPTY);
	}
	if (err === ERR_INVALID_TARGET) {
		return dispatch(creep, BUILD_COMPLETE);
	}
}

// stuck in idle
function runIdle(creep: Builder) {}
