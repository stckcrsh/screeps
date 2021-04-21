import { Machine } from '../../machine';
const noop = () => {};

export const enum States {
	spawning = 'spawning',
	harvesting = 'harvesting',
	building = 'building',
	withdrawing = 'withdrawing',
	findingBattery = 'finding battery',
	movingToSource = 'movingToSource',
	movingToBattery = 'movingToBattery',
	movingToController = 'movingToController',
	movingToConstruction = 'movingToConstruction',
	findingTarget = 'findingTarget',
	upgrading = 'upgrading',
}

export const enum Events {
	spawned = 'spawned',
	arrived = 'arrived',
	full = 'full',
	finished = 'empty',
	foundBattery = 'found battery',
	foundSource = 'found Source',
	foundConstruction = 'found construction',
	foundController = 'found controller',
	buildComplete = 'build complete',
	noTarget = 'no target',
	notInRange = 'not in range',
}

export const allAroundMachine: Machine<States, Events> = {
	initialState: States.spawning,
	states: {
		[States.spawning]: {
			events: {
				[Events.spawned]: States.findingBattery,
			},
		},
		[States.movingToController]: {
			events: {
				[Events.arrived]: States.upgrading,
			},
		},
		[States.movingToBattery]: {
			events: {
				[Events.arrived]: States.withdrawing,
			},
		},
		[States.movingToSource]: {
			events: {
				[Events.arrived]: States.harvesting,
			},
		},
		[States.movingToConstruction]: {
			events: {
				[Events.arrived]: States.building,
				[Events.noTarget]: States.findingTarget,
			},
		},
		[States.withdrawing]: {
			events: {
				[Events.full]: States.findingTarget,
				[Events.notInRange]: States.movingToBattery,
			},
		},
		[States.building]: {
			events: {
				[Events.finished]: States.findingBattery,
				[Events.buildComplete]: States.findingTarget,
				[Events.noTarget]: States.findingTarget,
				[Events.notInRange]: States.movingToConstruction,
			},
		},
		[States.upgrading]: {
			events: {
				[Events.finished]: States.findingBattery,
				[Events.notInRange]: States.movingToController,
			},
		},
		[States.harvesting]: {
			events: {
				[Events.full]: States.findingTarget,
				[Events.notInRange]: States.movingToSource,
			},
		},
		[States.findingTarget]: {
			events: {
				[Events.foundConstruction]: States.movingToConstruction,
				[Events.foundController]: States.movingToController,
			},
		},
		[States.findingBattery]: {
			events: {
				[Events.foundBattery]: States.movingToBattery,
				[Events.foundSource]: States.movingToSource,
			},
		},
	},
};
