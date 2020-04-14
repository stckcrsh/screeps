export const createCreep = <T extends CreepMemory>(
	spawn: StructureSpawn,
	parts: BodyPartConstant[],
	memory: T,
	name?: string
) => {
	return spawn.createCreep(parts, name, memory);
};
