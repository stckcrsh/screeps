import { Memory } from '../test/unit/mock';
import * as HarvesterRole from './harvester.role';
import { createCreep } from './utils/create-creep';
const START = 'start';

type PHASES = typeof START;

interface MiningOverlordMemory {
	creeps: [];
	phase: PHASES;
	spawns: [];
	room: string;
	queue: [];
}

/**
 * setup strategies for the phases
 * Early strategy/ just spawned
 *
 * Rush to RCL 2 with All around creeps
 * Build extensions
 *
 * start drop mining phase by building 5 work 1 move creeps.
 */

interface CreepSpawn {}
const ALL_AROUND_CREEP = () => {};

const spawnCreep = (spawn: StructureSpawn) => {
	spawn.createCreep([], undefined, {
		role: 'allaround',
		room: spawn.room.name
	});
};

const runStart = (memory: MiningOverlordMemory) => {
	// no minimum all arounders
	if (energy >= 300) {
		if (spawnCreep(allAroundCreep) === OK) {
			
		}
	}

	for (const name in memory.creeps) {
		HarvesterRole.run(Game.creeps[name] as HarvesterRole.Harvester);
	}
};

export const run = (memory: MiningOverlordMemory) => {
	// first track your creeps and or spawn them

	// check what phase we are in and decide what needs to be spawned
	switch (memory.phase) {
		case START: {
			runStart(memory);
		}
	}
};
