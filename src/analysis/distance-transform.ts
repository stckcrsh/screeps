import { AnalysisTask, Job } from './AnalysisTask';

const isNil = (value: any) => value === undefined || value === null;

const TASKS_PER_TICK = 20;

const NEIGHBORS = [
	[0, -1],
	[+1, -1],
	[+1, 0],
	[+1, +1],
	[0, +1],
	[-1, +1],
	[-1, 0],
	[-1, -1],
];

interface Task {
	x: number;
	y: number;
	value: number;
}

interface DTJob extends Job {
	roomName: string;
	data: Array<Array<number>>;
	taskQueue: Task[];
}

export class DistanceTransform extends AnalysisTask<DTJob> {
	constructor(name: string) {
		super(name);
	}

	run(job: DTJob) {
		let iterations = 0;
		let currentJob = job;

		while (iterations < TASKS_PER_TICK && !_.isEmpty(job.taskQueue)) {
			const task = job.taskQueue.shift();

			const [msg, newTasks] = this.runTask(task, job);

			job.taskQueue = job.taskQueue.concat(newTasks);
			currentJob = msg;
			iterations = iterations + 1;
		}

		if (_.isEmpty(job.taskQueue)) {
			return {
				job: currentJob,
				complete: true,
			};
		}
		return {
			job: currentJob,
			complete: false,
		};
	}

	start(job: DTJob): DTJob {
		// starting a job means creating a queue of all walls.
		const room: Room = Game.rooms[job.roomName];

		const queue = room
			.lookForAtArea(LOOK_TERRAIN, 0, 0, 49, 49, true)
			.filter((space) => space.terrain === 'wall')
			.map(({ x, y }) => ({ x, y, value: 0 }));

		return {
			...job,
			taskQueue: queue,
		};
	}

	runTask(task: Task, job: DTJob): [DTJob, Task[]] {
		const terrain = Game.map.getRoomTerrain(job.roomName);

		const space = new RoomPosition(task.x, task.y, job.roomName);

		if (!job.data[space.x]) {
			job.data[space.x] = [];
		}
		const currentVal = job.data?.[space.x]?.[space.y] || 99;

		if (task.value >= currentVal) {
			return [job, []];
		}

		job.data[space.x][space.y] = task.value;
		const increasedVal = task.value + 1;

		const newTasks = [];

		NEIGHBORS.forEach(([dX, dY]) => {
			const x = space.x + dX;
			const y = space.y + dY;

			if (x >= 0 && x <= 49 && y >= 0 && y <= 49) {
				if (
					terrain.get(x, y) !== TERRAIN_MASK_WALL &&
					(isNil(job.data?.[x]?.[y]) || job.data?.[x]?.[y] >= task.value)
				) {
					newTasks.push({
						x,
						y,
						value: increasedVal,
					});
				}
			}
		});

		return [job, newTasks];
	}

	static visualize(job: DTJob) {
		const visual = new RoomVisual(job.roomName);
		for (const _x in job.data) {
			const x = Number(_x);
			for (const _y in job.data[x]) {
				const y = Number(_y);
				const val = Math.ceil(job.data[x][y]);
				if (val !== 0) {
					visual.circle(x, y, {
						stroke: 'red',
						radius: 0.07 * val,
						fill: 'red',
						opacity: 0.4,
					});
				}
			}
		}
	}
}
