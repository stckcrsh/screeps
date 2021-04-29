import { AnalysisTask, Job } from 'analysis/AnalysisTask';
import { DistanceFromExit } from 'analysis/distance-from-exit';
import { OnboardingOverlord } from './onboarding.overlord';
import { Overlord } from './overlord';
import { DistanceTransform } from './analysis/distance-transform';

const OVERLORDS: Record<
	string,
	new (empire: Empire, flag: Flag, name: string, type: string) => Overlord
> = {
	onboarding: OnboardingOverlord,
};

/**
 * The empire is the wrapper around everything we do and facilitates overlords and analytics requests
 *
 * @export
 * @class Empire
 */
export class Empire {
	memory: {
		analytics: {
			inbox: Array<Job>;
			currentJob?: {
				id: string;
				type: string;
				[idx: string]: any;
			};
			outbox: Job[];
		};
	};

	analyticJobs: Record<string, AnalysisTask<any>> = {};

	get analytics() {
		return this.memory.analytics;
	}

	constructor() {
		this.setupMemory();

		this.addAnalytics(new DistanceFromExit('distExit'));
		this.addAnalytics(new DistanceTransform('distTrans'));
	}
	setupMemory() {
		if (!Memory.empire) {
			Memory.empire = {};
		}
		this.memory = Memory.empire as any;
		this.setupAnalyticsMemory();
	}

	setupAnalyticsMemory() {
		if (!this.memory.analytics) {
			this.memory.analytics = {
				inbox: [],
				currentJob: null,
				outbox: [],
			};
		}
	}

	runOverlords() {
		for (const flagName in Game.flags) {
			const splitFlagName = flagName.split('_');

			if (splitFlagName.length < 2) {
				continue;
			}
			const [overlordType, name] = splitFlagName;

			const className = OVERLORDS[overlordType];
			const overlord = new className(
				this,
				Game.flags[flagName],
				name,
				overlordType
			);
			overlord.init();

			overlord.run();
		}
	}

	addAnalyticsJob<T extends Job>(job: T) {
		this.analytics.inbox.push(job);
	}

	pullJobById(id: string) {
		const idx = _.findIndex(this.analytics.outbox, (job) => job.id === id);

		if (idx > -1) {
			const job = this.analytics.outbox[idx];
			this.analytics.outbox.splice(idx, 1);

			return job;
		} else {
			return null;
		}
	}

	addAnalytics(anal: AnalysisTask<any>) {
		this.analyticJobs[anal.name] = anal;
	}

	runAnalytics() {
		// first check if something is running
		if (this.analytics.currentJob) {
			const currentJob = this.analytics.currentJob;
			const result = this.analyticJobs[currentJob.type].run(currentJob);

			if (result.complete) {
				this.analytics.outbox.push(result.job);
				this.analytics.currentJob = null;
			} else {
				this.analytics.currentJob = result.job;
			}
		} else if (!_.isEmpty(this.analytics.inbox)) {
			const currentJob = this.analytics.inbox[0];

			this.analytics.currentJob = this.analyticJobs[currentJob.type].start(
				currentJob
			);
			this.analytics.inbox.shift();
			this.runAnalytics();
		}
	}
}
