
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
}
