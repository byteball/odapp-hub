const db = require('ocore/db');

async function template(addresses) {
	if (!addresses || !Array.isArray(addresses)) {
		return {
			error: 'arg addresses not found or not an array'
		};
	}
	
	if (addresses.length === 0) {
		return {};
	}
	
	return {};
}

module.exports = {
	template,
};
