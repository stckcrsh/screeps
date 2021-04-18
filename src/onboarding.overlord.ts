import { BuilderStrategy } from 'strategies/builder/builder.strategy';
import { EarlyMiningStrategy } from 'strategies/early-mining/earlymining.strategy';

import { Overlord } from './overlord';
import { MiningStrategy } from './strategies/mining/mining.strategy';
import { RefillStrategy } from './strategies/refill/refill.strategy';

/**
 * setup strategies for the phases
 * Early strategy/ just spawned
 *
 * Rush to RCL 2 with All around creeps
 * Build extensions
 *
 * start drop mining phase by building 5 work 1 move creeps.
 */

export class OnboardingOverlord extends Overlord {
	// private get sources() {
	// 	if (!this.memory.sources) {
	// 		const sources = this.room.find(FIND_SOURCES);
	// 		this.memory.sources = sources.reduce((sourceMap, source) => {
	// 			const directions = getFreeSpaces(source.pos);
	// 			return {
	// 				...sourceMap,
	// 				[source.id]: directions.reduce(
	// 					(directionMap, direction) => ({
	// 						...directionMap,
	// 						[direction]: null,
	// 					}),
	// 					{}
	// 				),
	// 			};
	// 		}, {});
	// 	}

	// 	return this.memory.sources;
	// }

	sources: Source[] = [];

	constructor(flag: Flag, name: string, type: string) {
		super(flag, name, type);
	}

	initOverlord(): void {
		this.sources = _.sortBy(this.room.find(FIND_SOURCES), (s: Source) => s.id);

		/** */
		// this.addStrategy(new EarlyMiningStrategy(this, 'early-miner'));

		/**
		 * continue this till we hit level 2 then set construction sites
		 * 		- mining containers - one per source
		 *  	- all ten extensions
		 */

		this.addStrategy(new RefillStrategy(this, 'refill'));
		this.addStrategy(new BuilderStrategy(this, 'build'));
		this.sources.forEach((source, idx) => {
			this.addStrategy(new MiningStrategy(this, `miner-${idx}`, source));
		});
		/**
		 * Once all the containers are built then we can start a real mining strategy
		 *
		 */
	}

	public runOverlord() {
		/** */
	}
}
