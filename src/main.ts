import { ErrorMapper } from 'utils/ErrorMapper';

import { OnboardingOverlord } from './onboarding.overlord';
import { Overlord } from './overlord';

const OVERLORDS: Record<
	string,
	new (flag: Flag, name: string, type: string) => Overlord
> = {
	onboarding: OnboardingOverlord,
};

// check constants and set defaults
export const setup = () => {
	console.log('setup');

	// const overlord = newMiningOverlord(Game.rooms.W8N3);
	// overlord.save();

	console.log('setup complete');
};

setup();

// When compiling TS to JS and bundling with rollup, the line numbers and file names in error messages change
// This utility uses source maps to get the line numbers and file names of the original, TS source code
export const loop = ErrorMapper.wrapLoop(() => {
	for (const flagName in Game.flags) {
		const splitFlagName = flagName.split('_');

		if (splitFlagName.length < 2) {
			continue;
		}
		const [overlordType, name] = splitFlagName;

		const className = OVERLORDS[overlordType];
		const overlord = new className(Game.flags[flagName], name, overlordType);
		overlord.init();

		overlord.run();
	}

	// // Run through the overlords
	// Object.entries(Memory.overlords).forEach(([name, memory]) => {
	// 	const overlord = new OnboardingOverlord(memory);

	// 	overlord.run();
	// });

	// Automatically delete memory of missing creeps
	for (const name in Memory.creeps) {
		if (!(name in Game.creeps)) {
			delete Memory.creeps[name];
		}
	}
});
