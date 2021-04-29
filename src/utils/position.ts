export const RoomPosition2Position = (pos: RoomPosition) => ({
	x: pos.x,
	y: pos.y,
	roomName: pos.roomName,
});

export const PositionToRoomPosition = (pos: {
	x: number;
	y: number;
	roomName: string;
}) => new RoomPosition(pos.x, pos.y, pos.roomName);

export const XYtoDirections = {
	'-1': {
		'-1': TOP_LEFT,
		'0': LEFT,
		'1': BOTTOM_LEFT,
	},
	'0': {
		'-1': TOP,
		'1': BOTTOM,
	},
	'1': {
		'-1': TOP_RIGHT,
		'0': RIGHT,
		'1': BOTTOM_RIGHT,
	},
};

export const DirectionToXY = {
	[TOP]: { x: 0, y: -1 },
	[TOP_RIGHT]: { x: 1, y: -1 },
	[RIGHT]: { x: 1, y: 0 },
	[BOTTOM_RIGHT]: { x: 1, y: 1 },
	[BOTTOM]: { x: 0, y: 1 },
	[BOTTOM_LEFT]: { x: -1, y: 1 },
	[LEFT]: { x: -1, y: 0 },
	[TOP_LEFT]: { x: -1, y: -1 },
};

export const NEIGHBORS = [
	[0, -1],
	[+1, -1],
	[+1, 0],
	[+1, +1],
	[0, +1],
	[-1, +1],
	[-1, 0],
	[-1, -1],
];

export const isPosEqual = (a: RoomPosition, b: RoomPosition): boolean => {
	return a.x === b.x && a.y === b.y && a.roomName === b.roomName;
};

export const initPos = (pos: RoomPosition) =>
	new RoomPosition(pos.x, pos.y, pos.roomName);
