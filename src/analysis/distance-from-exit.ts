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

interface DFEJob extends Job {
	roomName: string;
	data: Array<Array<number>>;
	taskQueue: Task[];
}

export class DistanceFromExit extends AnalysisTask<DFEJob> {
	constructor(name: string) {
		super(name);
	}

	/**
	 * kicks off the job adding in the first queued tasks
	 * This specific impl looks at each wall and adds in all the edge spaces
	 *
	 * @param {DFEJob} job
	 * @returns
	 * @memberof DistanceFromExit
	 */
	start(job: DFEJob) {
		const newJob = { ...job };

		// starting a job means creating a queue of all walls.
		const room: Room = Game.rooms[job.roomName];

		// look at the 4 walls and add any non wall spaces
		let queue: Task[] = [];

		// top row
		queue = queue.concat(
			room
				.lookForAtArea(LOOK_TERRAIN, 0, 0, 49, 0, true)
				.filter((space) => space.terrain !== 'wall')
				.map(({ x, y }) => ({ x, y, value: 10 }))
		);

		// bottom row
		queue = queue.concat(
			room
				.lookForAtArea(LOOK_TERRAIN, 0, 49, 49, 49, true)
				.filter((space) => space.terrain !== 'wall')
				.map(({ x, y }) => ({ x, y, value: 10 }))
		);

		// left column drop of top and bottom space cause its already covered
		queue = queue.concat(
			room
				.lookForAtArea(LOOK_TERRAIN, 0, 1, 0, 48, true)
				.filter((space) => space.terrain !== 'wall')
				.map(({ x, y }) => ({ x, y, value: 10 }))
		);

		// rigfht column drop of top and bottom space cause its already covered
		queue = queue.concat(
			room
				.lookForAtArea(LOOK_TERRAIN, 49, 1, 49, 48, true)
				.filter((space) => space.terrain !== 'wall')
				.map(({ x, y }) => ({ x, y, value: 10 }))
		);

		return {
			...job,
			data: [],
			taskQueue: queue,
		};
	}

	/**
	 * runs iterations for the job
	 *
	 * @param {DFEJob} job
	 * @returns
	 * @memberof DistanceFromExit
	 */
	run(job: DFEJob) {
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

	runTask(task: Task, job: DFEJob): [DFEJob, Task[]] {
		const terrain = Game.map.getRoomTerrain(job.roomName);

		const space = new RoomPosition(task.x, task.y, job.roomName);

		if (!job.data[space.x]) {
			job.data[space.x] = [];
		}
		const currentVal = job.data?.[space.x]?.[space.y] || 0;

		if (task.value <= currentVal) {
			return [job, []];
		}

		job.data[space.x][space.y] = task.value;
		const reducedVal = task.value - 1;

		const newTasks = [];

		NEIGHBORS.forEach(([dX, dY]) => {
			const x = space.x + dX;
			const y = space.y + dY;

			if (x >= 0 && x <= 49 && y >= 0 && y <= 49) {
				if (
					terrain.get(x, y) !== TERRAIN_MASK_WALL &&
					(isNil(job.data?.[x]?.[y]) || job.data?.[x]?.[y] < task.value)
				) {
					newTasks.push({
						x,
						y,
						value: reducedVal,
					});
				}
			}
		});

		return [job, newTasks];
	}

	static visualize(job: DFEJob) {
		const visual = new RoomVisual(job.roomName);
		for (const _x in job.data) {
			const x = Number(_x);
			for (const _y in job.data[x]) {
				const y = Number(_y);
				const val = Math.ceil(job.data[x][y]);
				if (val) {
					visual.rect(x - 0.5, y - 0.5, 1, 1, {
						stroke: 'black',
						fill: 'black',
						opacity: val / 10,
					});
				}
			}
		}
	}
}
