interface Task {
	y: number;
}

interface Rect {
	x: number;
	y: number;
	width: number;
	height: number;
}

const isNotWall = (space: LookAtResultWithPos<LOOK_TERRAIN>) =>
	space.terrain !== 'wall';

const COLORS = [
	'#91665b',
	'#0fb252',
	'#87beb5',
	'#6b0a60',
	'#778028',
	'#6a8cb7',
	'#f2375f',
	'#ccd4b1',
	'#5116cd',
	'#f700b2',
	'#112787'
];

export class LargestRectangle {
	memory: {
		queue: Task[];
		active: Rect[];
		rectangles: Rect[];
	};

	get activeRects() {
		return this.memory.active;
	}

	set activeRects(arr: Rect[]) {
		this.memory.active = arr;
	}

	get rectangles() {
		return this.memory.rectangles;
	}

	set rectangles(arr: Rect[]) {
		this.memory.rectangles = arr;
	}

	get queue() {
		return this.memory.queue;
	}

	set queue(arr: Task[]) {
		this.memory.queue = arr;
	}

	constructor(private room: Room) {
		if (!this.room.memory.rectangles) {
			this.room.memory.rectangles = {
				queue: [],
				active: [],
				rectangles: []
			};
		}
		this.memory = this.room.memory.rectangles;
	}

	runTask(task: Task): Task {
		const y = task.y;

		console.log(`Task Start Y: ${y}`);

		const scanLine = this.getLine(y);

		let currentRect: Rect | null = null;
		const lineRects: Rect[] = [];

		scanLine.forEach((space, x) => {
			if (isNotWall(space)) {
				if (currentRect) {
					currentRect.width++;
				} else {
					currentRect = {
						x: x,
						y,
						width: 1,
						height: 1
					};
				}
			} else {
				if (currentRect) {
					lineRects.push(currentRect);
					currentRect = null;
				}
			}
		});

		// if we end the row with currently active rectangle
		if (currentRect) {
			lineRects.push(currentRect);
		}

		console.log(`row scanned: ${JSON.stringify(lineRects)}`);

		const newActiveRects: Rect[] = [];

		let activeRect: Rect | null = this.activeRects.shift();
		let rect: Rect | null = lineRects.shift();

		while (activeRect || rect) {
			console.log(
				`Iteration ${JSON.stringify(activeRect)} ${JSON.stringify(rect)}`
			);

			if (activeRect && rect) {
				const minX = Math.max(activeRect.x, rect.x);
				const maxX = Math.min(
					activeRect.x + activeRect.width - 1,
					rect.x + rect.width - 1
				);

				if (maxX < minX) {
					if (maxX === activeRect.x + activeRect.width - 1) {
						/**
						 *
						 *  maxX minX
						 *    !   !
						 * |_|_|_|X|X|X|_| 	put old active into rectangles
						 * |X|X|_|_|_|_|_|
						 *
						 */
						this.rectangles.push(activeRect);
						console.log(
							`maxX-minX remove active: ${JSON.stringify(activeRect)}`
						);
						activeRect = null;
					} else {
						/**
						 *  maxX minX
						 *    !   !
						 * |X|X|_|_|_|_|_| 	put rect into new actives
						 * |_|_|_|X|X|X|_|
						 */
						newActiveRects.push(rect);

						console.log(`maxX-minX remove rect: ${JSON.stringify(rect)}`);
						rect = null;
					}
				} else {
					if (activeRect.x === rect.x && activeRect.width === rect.width) {
						// this is a special case where when they line up its not cut and dry remove both cause there might still be things to check
						newActiveRects.push({
							...rect,
							height: activeRect.height + 1
						});

						console.log(
							`found equal: new active: ${JSON.stringify({
								...rect,
								height: activeRect.height + 1
							})}`
						);

						activeRect = null;
					} else if (minX === activeRect.x) {
						if (
							maxX === activeRect.x + activeRect.width - 1 &&
							maxX === rect.x + rect.width - 1
						) {
							/**
							 *    minX   maxX
							 *      !     !
							 * |_|X|X|X|X|X|_|	extend old active with new height
							 * |_|_|X|X|X|X|_|	put rect into actives
							 *
							 */
							newActiveRects.push({
								...activeRect,
								y,
								height: activeRect.height + 1
							});
							newActiveRects.push(rect);
							console.log(
								`found smaller active same end: ${JSON.stringify({
									...activeRect,
									y,
									height: activeRect.height + 1
								})}`
							);
							activeRect = null;
						} else if (maxX === activeRect.x + activeRect.width - 1) {
							/**
							 *    minX   maxX
							 *      !     !
							 * |_|X|X|X|X|X|X|	extend old active with new height
							 * |_|_|X|X|X|X|_|
							 */
							newActiveRects.push({
								...activeRect,
								y,
								height: activeRect.height + 1
							});
							console.log(
								`found smaller active: ${JSON.stringify({
									...activeRect,
									y,
									height: activeRect.height + 1
								})}`
							);
							activeRect = null;
						} else {
							/**
							 *    minX   maxX
							 *      !     !
							 * |_|X|X|X|X|X|_|	create new active with new x, height and width
							 * |_|_|X|X|X|X|X|	add new rect to new actives
							 *
							 */
							newActiveRects.push({
								...activeRect,
								y,
								height: activeRect.height + 1,
								width: maxX - minX + 1
							});
							newActiveRects.push(rect);
							console.log(
								`found active after: ${JSON.stringify({
									...activeRect,
									y,
									height: activeRect.height + 1,
									width: maxX - minX + 1
								})}`
							);
							rect = null;
						}
					} else {
						if (
							maxX === activeRect.x + activeRect.width - 1 &&
							maxX === rect.x + rect.width - 1
						) {
							/**
							 *    minX   maxX
							 *      !     !
							 * |_|_|X|X|X|X|_|	new active with rect dimensions
							 * |_|X|X|X|X|X|_|	put active into rectangles
							 */
							newActiveRects.push({
								...rect,
								y,
								height: activeRect.height + 1
							});
							this.rectangles.push(activeRect);
							console.log(
								`found smaller rect same end: ${JSON.stringify({
									...rect,
									y,
									height: activeRect.height + 1
								})}`
							);
							activeRect = null;
						} else if (maxX === activeRect.x + activeRect.width - 1) {
							/**
							 *    minX maxX
							 *      !   !
							 * |_|_|X|X|X|X|_|	create new active with new height and width
							 * |_|X|X|X|X|_|_|	put old active into rectangles
							 */
							newActiveRects.push({
								x: minX,
								y,
								height: activeRect.height + 1,
								width: maxX - minX + 1
							});
							this.rectangles.push(activeRect);
							console.log(
								`found active before: ${JSON.stringify({
									x: minX,
									y,
									height: activeRect.height + 1,
									width: maxX - minX + 1
								})}`
							);
							activeRect = null;
						} else {
							/**
							 *    minX   maxX
							 *      !     !
							 * |_|_|X|X|X|X|_|  extend current rect with new height to newActive
							 * |_|X|X|X|X|X|X|
							 */

							newActiveRects.push({
								...rect,
								height: activeRect.height + 1
							});
							console.log(
								`found active larger: ${JSON.stringify({
									...rect,
									height: activeRect.height + 1
								})}`
							);
							rect = null;
						}
					}
				}
			} else {
				if (!rect && activeRect) {
					this.rectangles.push(activeRect);
					console.log(`no rect to compare`);

					activeRect = null;
				}
				if (!activeRect && rect) {
					newActiveRects.push(rect);
					console.log(`no active to compare: ${JSON.stringify(rect)}`);
					rect = null;
				}
			}

			if (!activeRect) {
				activeRect = this.activeRects.shift();
			}
			if (!rect) {
				rect = lineRects.shift();
			}
		}

		// we need to sort all the actives by x before we move to next task
		this.activeRects = _.sortBy(newActiveRects, rect => rect.x)

		console.log(
			JSON.stringify({
				active: this.activeRects,
				rectangles: this.rectangles
			})
		);
		if (task.y > 0) {
			return {
				y: task.y - 1
			};
			// return null;
		} else {
			// last row add all actives to rectangles
			this.rectangles = this.rectangles.concat(this.activeRects);
		}
	}

	run() {
		if (!_.isEmpty(this.queue)) {
			const task = this.queue.shift();
			const newTask = this.runTask(task);

			if (newTask) {
				this.queue.push(newTask);
			}
		}

		this.visualizeRects();
	}

	setup() {
		this.queue = [{ y: 49 }];
		this.rectangles = [];
		this.activeRects = [];
	}

	visualizeRects() {
		this.rectangles
			// .filter(rect => rect.width >= 7 && rect.height >= 7)
			.forEach((rect, idx) => {
				const color = COLORS[idx % COLORS.length];
				this.room.visual.rect(
					rect.x - 0.5,
					rect.y - 0.5,
					rect.width,
					rect.height,
					{
						stroke: color,
						strokeWidth: 0.35,
						fill: color,
						opacity: 0.15
					}
				);
			});
	}

	getLine(y: number) {
		return this.room.lookForAtArea(LOOK_TERRAIN, y, 0, y, 49, true);
	}
}
