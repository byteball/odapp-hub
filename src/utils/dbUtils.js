function In(arr) {
	return `${arr.map(() => '?').join(',')}`;
}
 
function flat(arr) {
	return arr.flat();
}

module.exports = {
	In,
	flat
};
