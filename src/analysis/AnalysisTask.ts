export interface Job {
	id: string;
	type: string;
	data: any;
}

export abstract class AnalysisTask<T extends Job> {
	constructor(public name: string) {}

	abstract start(job: T): T;
	abstract run(job: T): { complete: boolean; job: T };
}
