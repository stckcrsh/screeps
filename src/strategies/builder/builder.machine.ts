import { Machine } from '../../machine';

export enum STATES {
	SPAWNING = 'spawning',
	FIND_TARGET = 'find target',
	MOVE_TO_BUILD = 'moving to build',
	BUILDING = 'building',
	REPAIRING = 'repairing',
	MOVE_TO_REPAIR = 'move to repair',
	IDLE = 'idle',
}

export enum EVENTS {
	SPAWNED = 'spawned',
	ARRIVED = 'arrived',
	TARGET_FOUND = 'target found',
	NO_TARGETS_FOUND = 'no targets found',
	ENERGY_FULL = 'energy full',
	ENERGY_EMPTY = 'energy empty',
	COMPLETE = 'complete',
	TIMER = 'timer',
	NOT_IN_RANGE = 'not in range',
	REPAIR_TARGET_FOUND = 'repair target found',
}

export const builderMachine: Machine<STATES, EVENTS> = {
	initialState: STATES.SPAWNING,
	states: {
		[STATES.SPAWNING]: {
			events: {
				[EVENTS.SPAWNED]: STATES.FIND_TARGET,
			},
		},
		[STATES.FIND_TARGET]: {
			events: {
				[EVENTS.REPAIR_TARGET_FOUND]: STATES.MOVE_TO_REPAIR,
				[EVENTS.TARGET_FOUND]: STATES.MOVE_TO_BUILD,
				[EVENTS.NO_TARGETS_FOUND]: STATES.IDLE,
			},
		},
		[STATES.MOVE_TO_BUILD]: {
			events: {
				[EVENTS.ARRIVED]: STATES.BUILDING,
				[EVENTS.NO_TARGETS_FOUND]: STATES.FIND_TARGET,
			},
		},
		[STATES.MOVE_TO_REPAIR]: {
			events: {
				[EVENTS.ARRIVED]: STATES.REPAIRING,
				[EVENTS.NO_TARGETS_FOUND]: STATES.FIND_TARGET,
			},
		},
		[STATES.BUILDING]: {
			events: {
				[EVENTS.ENERGY_EMPTY]: STATES.IDLE,
				[EVENTS.COMPLETE]: STATES.FIND_TARGET,
				[EVENTS.NOT_IN_RANGE]: STATES.MOVE_TO_BUILD,
				[EVENTS.NO_TARGETS_FOUND]: STATES.FIND_TARGET,
			},
		},
		[STATES.REPAIRING]: {
			events: {
				[EVENTS.ENERGY_EMPTY]: STATES.IDLE,
				[EVENTS.COMPLETE]: STATES.FIND_TARGET,
				[EVENTS.NOT_IN_RANGE]: STATES.MOVE_TO_REPAIR,
				[EVENTS.NO_TARGETS_FOUND]: STATES.FIND_TARGET,
			},
		},
		[STATES.IDLE]: {
			events: {
				[EVENTS.TIMER]: STATES.BUILDING,
			},
		},
	},
};
