// import { MiningOverlordMemory } from './mining.overlord';
// example declaration file - remove these and add your own custom typings

// memory extension samples
interface CreepMemory {
	role: string;
	overlord?: string;
	debug?: boolean;
	[index: string]: any;
}

interface Memory {
	uuid: number;
	log: any;
	mainSpawn: string;
	minHarvesters: number;
	_constants: Constants;
	overlords: Record<string, any>;
}

interface RoomMemory {
	[idx: string]: any;
}

interface Constants {
	minHarvesters: number;
	minBuilders: number;
}

// `global` extension samples
declare namespace NodeJS {
	interface Global {
		log: any;
	}
}
