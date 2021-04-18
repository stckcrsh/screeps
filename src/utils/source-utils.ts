const memoryRetrieval = (source: Source) => [
	'rooms',
	source.pos.roomName,
	source.id,
];

const getMemory = (source: Source): any => {
	const retrieval = memoryRetrieval(source);
	const memory = _.get(Memory, retrieval);

	if (!memory) {
		_.set(Memory, retrieval, {});
		return {};
	}

	return memory;
};

const setMemory = (source: Source, memory: any) => {
	const retrieval = memoryRetrieval(source);
	_.set(Memory, retrieval, memory);
};

const setContainer = (source: Source, container: StructureContainer) => {
	const memory = getMemory(source);

	setMemory(source, {
		...memory,
		containerId: container.id,
	});
};

const findContainer = (source: Source): StructureContainer | null => {
	const containers = source.pos.findInRange(
		source.room.find<StructureContainer>(FIND_STRUCTURES, {
			filter: (i) => i.structureType === STRUCTURE_CONTAINER,
		}),
		2
	);

	if (containers.length > 0) {
		return _.first(containers);
	}

	return null;
};

export const getContainer = (source: Source): StructureContainer | null => {
	const containerId = getMemory(source)?.containerId;
	const container = Game.getObjectById<StructureContainer>(containerId);

	if (!containerId || !container) {
		const foundContainer = findContainer(source);

		if (foundContainer) {
			setContainer(source, foundContainer);
			return foundContainer;
		}
		return null;
	}

	return container;
};
