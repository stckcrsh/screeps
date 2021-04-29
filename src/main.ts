import { Empire } from 'empire';
import { ErrorMapper } from 'utils/ErrorMapper';

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
	const empire = new Empire();

	empire.runOverlords();

	empire.runAnalytics();

	// Automatically delete memory of missing creeps
	for (const name in Memory.creeps) {
		if (!(name in Game.creeps)) {
			delete Memory.creeps[name];
		}
	}
});
