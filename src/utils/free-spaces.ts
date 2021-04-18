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
export function getFreeSpaces(
	pos: RoomPosition
): Array<LookForAtAreaResultWithPos<Terrain, 'terrain'>> {
	const area = Game.rooms[pos.roomName].lookForAtArea(
		LOOK_TERRAIN,
		pos.y - 1,
		pos.x - 1,
		pos.y + 1,
		pos.x + 1,
		true
	);
	return area.filter(
		(result) => result.terrain === 'plain' || result.terrain === 'swamp'
	);
	// // map to direction Constants
	// .map((space) => {
	// 	const deltaX = space.x - pos.x;
	// 	const deltaY = space.y - pos.y;
	// 	// @ts-ignore
	// 	return XYtoDirections[deltaX][deltaY];
	// })
}
