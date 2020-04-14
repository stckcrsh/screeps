// example declaration file - remove these and add your own custom typings

// memory extension samples
interface CreepMemory {
	role: string;
	room: string;
	debug?: boolean;
}

interface Memory {
	uuid: number;
	log: any;
	mainSpawn: string;
	minHarvesters: number;
	_constants: Constants;
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
