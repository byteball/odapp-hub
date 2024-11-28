const db = require('ocore/db');
const { isValidAddress } = require('ocore/validation_utils');
const { executeGetter: execGetter } = require('ocore/formula/evaluation.js');

async function executeGetter(address, getter, args) {
	if (!address || !isValidAddress(address)) {
		return {
			error: 'arg address not found or not valid'
		};
	}
	
	if (!getter || typeof getter !== 'string') {
		return {
			error: 'arg getter not found or not a string'
		};
	}
	
	if (args) {
		if (!Array.isArray(args))
			return { error: 'args must be array' };
		while (args.length && args[args.length - 1] === null)
			args.length--;
		if (args.some(a => a === null))
			return { error: 'args cannot include null' };
	}
	
	if (!args) args = [];
	
	try {
		return await execGetter(db, address, getter, args);
	} catch (e) {
		return {
			error: e
		};
	}
}

module.exports = {
	executeGetter,
};
