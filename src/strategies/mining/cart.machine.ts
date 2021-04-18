import { Machine } from '../../machine';

export const enum States {
	spawning = 'spawning',
	idle = 'idle',
	collecting = 'collecting',
	transferring = 'transferring',
}

export const enum Events {
	spawned = 'spawned',
	full = 'full',
	empty = 'empty',
	timer = 'timer',
}

export const cartMachine: Machine<States, Events> = {
	initialState: States.spawning,
	states: {
		[States.spawning]: {
			events: {
				[Events.spawned]: States.collecting,
			},
		},
		[States.collecting]: {
			events: {
				[Events.full]: States.transferring,
			},
		},
		[States.transferring]: {
			events: {
				[Events.empty]: States.collecting,
			},
		},
		[States.idle]: {
			events: {
				[Events.timer]: States.collecting,
			},
		},
	},
};
