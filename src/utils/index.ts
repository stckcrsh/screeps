export const findMissing = (initialArr: Array<any>, indexArr: number[]) => {
	// Create sparse array with a 1 at each index equal to a value in the input.
	var sparse = indexArr.reduce(
		// @ts-ignore
		(sparse, i) => (sparse[i] = 1, sparse),
		[]
	);
	// Create array 0..highest number, and retain only those values for which
	// the sparse array has nothing at that index (and eliminate the 0 value).
	return [...initialArr.map((i, idx) => idx)].filter(i => (i === 0 || i) && !sparse[i]);
}