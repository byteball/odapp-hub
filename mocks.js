const { dirname } = require('path');
const kvPath = require.resolve('ocore/kvstore.js');
require.cache[kvPath] = {
	id: kvPath,
	path: dirname(kvPath),
	exports: require('./src/services/kv.js'),
	filename: kvPath,
	loaded: true,
};
