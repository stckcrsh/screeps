import { Machine } from '../../machine';

export const enum States {
	spawning = 'spawning',
	harvesting = 'harvesting',
	movingToSource = 'movingToSource',
	idle = 'idle'
}

export const enum Events {
	spawned = 'spawned',
	arrived = 'arrived',
	full = 'full',
	finished = 'empty',
	notInRange ='not in range',
	timer ='timer',
	noSpaces ='not spaces'
}

export const minerMachine: Machine<States, Events> = {
	initialState: States.spawning,
	states: {
		[States.spawning]: {
			events: {
				[Events.spawned]: States.movingToSource,
			},
		},
		[States.movingToSource]: {
			events: {
				[Events.arrived]: States.harvesting,
				[Events.noSpaces]: States.idle,
			},
		},
		[States.harvesting]: {
			events: {
				[Events.notInRange]: States.movingToSource
			},
		},
		[States.idle]:{
			events:{
				[Events.timer]: States.movingToSource
			}
		}
	},
};
