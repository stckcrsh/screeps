import { Strategy } from './strategy';
export abstract class Overlord {
	strategies: Strategy[] = [];
	mainSpawn!: StructureSpawn;
	room: Room;
	memory: {
		strategies: Record<string, any>;
		[idx: string]: any;
	};

	constructor(protected flag: Flag, public name: string, public type: string) {
		this.room = flag.room!;
		this.memory = flag.memory as any;

		if (!this.memory.strategies) {
			this.memory.strategies = {};
		}
	}

	abstract runOverlord(): void;

	run() {
		this.runOverlord();

		this.runStrategies();
	}

	abstract initOverlord(): void;

	init() {
		const spawns = this.room.find(FIND_MY_SPAWNS).map((spawn) => spawn.id);

		this.mainSpawn = Game.getObjectById(spawns[0])!;

		this.initOverlord();
	}

	addStrategy(strategy: Strategy) {
		this.strategies.push(strategy);
	}

	runStrategies() {
		this.strategies.forEach((strategy) => {
			try {
				strategy.init();
			} catch (err) {
				console.log(`Problem running init for ${strategy.name}`);
				console.log(err)
			}
		});
		this.strategies.forEach((strategy) => {
			try {
				strategy.rollCall();
			} catch (err) {
				console.log(`Problem running rollCall for ${strategy.name}`);
				console.log(err)
			}
		});
		this.strategies.forEach((strategy) => {
			try {
				strategy.run();
			} catch (err) {
				console.log(`Problem running run for ${strategy.name}`);
			}
		});
	}
}
