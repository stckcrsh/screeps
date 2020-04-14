import { ErrorMapper } from 'utils/ErrorMapper';
import { createCreep } from './utils/create-creep';

import * as BuilderRole from './builder.role';
import * as HarvesterRole from './harvester.role';

// check constants and set defaults
export const setup = () => {
	console.log('setup')
	Memory._constants = {
		minBuilders: 1,
		minHarvesters: 4
	};
};

setup();

// When compiling TS to JS and bundling with rollup, the line numbers and file names in error messages change
// This utility uses source maps to get the line numbers and file names of the original, TS source code
export const loop = ErrorMapper.wrapLoop(() => {
	// console.log(`Current game tick is ${Game.time}`);

	const groupedCreeps = _.groupBy(Game.creeps, creep => creep.memory.role);

	if (
		!groupedCreeps['builder'] ||
		groupedCreeps['builder'].length < Memory._constants.minBuilders
	) {
		const spawn = Game.getObjectById<StructureSpawn>(Memory.mainSpawn);
		if (!_.isNull(spawn)) {
			createCreep(spawn!, ['work', 'move', 'carry', 'move', 'carry'], {
				role: 'builder',
				room: spawn!.room.name
			});
		}
	}
	if (
		!groupedCreeps['harvester'] ||
		groupedCreeps['harvester'].length < Memory._constants.minHarvesters
	) {
		const spawn = Game.getObjectById<StructureSpawn>(Memory.mainSpawn);
		if (!_.isNull(spawn)) {
			createCreep(spawn!, ['work', 'move', 'carry', 'move', 'carry'], {
				role: 'harvester',
				room: spawn!.room.name,
				state: 'harvesting',
				working: true
			});
		}
	}

	(groupedCreeps['harvester'] || []).forEach(creep =>
		HarvesterRole.run(creep as HarvesterRole.Harvester)
	);
	(groupedCreeps['builder'] || []).forEach(creep =>
		BuilderRole.run(creep as BuilderRole.Builder)
	);

	// Automatically delete memory of missing creeps
	for (const name in Memory.creeps) {
		if (!(name in Game.creeps)) {
			delete Memory.creeps[name];
		}
	}
});
