import { Machine } from '../../machine';

export const enum States {
	IDLE = 'idle',
	SPAWNING = 'spawning',
	PROCURING_ENERGY = 'procuring',
	MOVING_TO_ENERGY = 'moving to energy',
	MOVING_TO_BUILDER = 'moving to builder',
	COLLECTING_ENERGY = 'collecting',
	TRANSFERING = 'transferring',
}

export const enum Events {
	BATTERY_FOUND = 'battery found',
	BATTERY_EMPTY = 'battery empty',
	NO_TARGETS = 'no targets found',
	NO_SOURCES_FOUND = 'no sources found',
	NOT_IN_RANGE = 'not in range',
	ENERGY_FULL = 'full',
	ENERGY_EMPTY = 'empty',
	SPAWNED = 'spawned',
	ARRIVED = 'arrived',
	TRANSFER_COMPLETE = 'transfer complete',
	TIMER = 'timer',
}

export const cartMachine: Machine<States, Events> = {
	initialState: States.SPAWNING,
	states: {
		[States.SPAWNING]: {
			events: {
				[Events.SPAWNED]: States.PROCURING_ENERGY,
			},
		},
		[States.PROCURING_ENERGY]: {
			events: {
				[Events.BATTERY_FOUND]: States.MOVING_TO_ENERGY,
				[Events.NO_SOURCES_FOUND]: States.IDLE,
			},
		},
		[States.MOVING_TO_ENERGY]: {
			events: {
				[Events.ARRIVED]: States.COLLECTING_ENERGY,
			},
		},
		[States.TRANSFERING]: {
			events: {
				[Events.ENERGY_EMPTY]: States.PROCURING_ENERGY,
				[Events.NOT_IN_RANGE]: States.MOVING_TO_BUILDER,
				[Events.NO_TARGETS]: States.MOVING_TO_BUILDER,
			},
		},
		[States.COLLECTING_ENERGY]: {
			events: {
				[Events.ENERGY_FULL]: States.MOVING_TO_BUILDER,
				[Events.BATTERY_EMPTY]: States.PROCURING_ENERGY,
				[Events.NOT_IN_RANGE]: States.MOVING_TO_ENERGY,
			},
		},
		[States.MOVING_TO_BUILDER]: {
			events: {
				[Events.ARRIVED]: States.TRANSFERING,
			},
		},
		[States.IDLE]: {
			events: {
				[Events.TIMER]: States.PROCURING_ENERGY,
			},
		},
	},
};
