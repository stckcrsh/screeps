import { Machine } from './../../machine';
export const enum Events {
	spawned = 'spawned',
	foundBattery = 'Found Battery',
	full = 'full',
	arrived = 'arrived',
	empty = 'empty',
	notInRange = 'notInRange',
	invalidTarget = 'invalidTarget',
	timer = 'timer',
	noTargets = 'no targets',
}

export const enum States {
	spawning = 'spawning',
	findingBattery = 'find battery',
	collecting = 'collecting',
	movingToTargetSpace = 'moving to target',
	upgrading = 'upgrading',
	idle = 'idle',
}

export const UpgraderMachine: Machine<States, Events> = {
	initialState: States.spawning,
	states: {
		[States.spawning]: {
			events: {
				[Events.spawned]: States.findingBattery
			}
		},
		[States.findingBattery]: {
			events: {
				[Events.foundBattery]: States.movingToTargetSpace,
				[Events.noTargets]: States.idle
			}
		},
		[States.movingToTargetSpace]: {
			events: {
				[Events.arrived]: States.upgrading
			}
		},
		[States.collecting]: {
			events: {
				[Events.full]: States.upgrading,
				[Events.invalidTarget]: States.findingBattery,
			}
		},
		[States.upgrading]: {
			events: {
				[Events.empty]: States.collecting,
				[Events.notInRange]: States.movingToTargetSpace
			}
		},
		[States.idle]: {
			events: {
				[Events.timer]: States.findingBattery
			}
		}
	}
}