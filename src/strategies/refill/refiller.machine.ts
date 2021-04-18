import { Machine } from '../../machine';

export const enum States {
	spawning = 'spawning',
	findingBattery = 'finding battery',
	findingRefill = 'finding refill',
	collecting = 'collecting',
	refilling = 'refilling',
	idle = 'idle',
}

export const enum Events {
	spawned = 'spawned',
	found = 'found',
	batteryEmpty = 'battery empty',
	full = 'full',
	timer = 'timer',
	empty = 'empty',
	noTarget = 'no target found',
}

export const refillerMachine: Machine<States, Events> = {
	initialState: States.spawning,
	states: {
		[States.spawning]: {
			events: {
				[Events.spawned]: States.findingBattery,
			},
		},
		[States.findingBattery]: {
			events: {
				[Events.found]: States.collecting,
			},
		},
		[States.collecting]: {
			events: {
				[Events.batteryEmpty]: States.findingBattery,
				[Events.full]: States.findingRefill,
			},
		},
		[States.findingRefill]: {
			events: {
				[Events.found]: States.refilling,
				[Events.noTarget]: States.idle,
			},
		},
		[States.refilling]: {
			events: {
				[Events.empty]: States.findingBattery,
				[Events.full]: States.findingRefill,
			},
		},
		[States.idle]: {
			events: {
				[Events.timer]: States.findingRefill,
			},
		},
	},
};
