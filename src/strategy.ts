import { Overlord } from './overlord';
export abstract class Strategy {
	memory: any;
	constructor(protected overlord: Overlord, public name: string) {
		const stratMemory = overlord?.memory?.strategies[name];
		if (!stratMemory) {
			overlord.memory.strategies[name] = {};
		}
		this.memory = overlord.memory.strategies[name];
	}

	abstract initStrategy(): void;

	init() {
		this.initStrategy();
	}

	abstract run(): void;
	abstract rollCall(): void;
	abstract cleanUp(): void;
}
