const db = require('ocore/db');
const storage = require('ocore/storage');
const definitionsCache = require('../../cacheClasses/definitionsCache');

async function getDefinitions(addresses) {
	if (!addresses || !Array.isArray(addresses)) {
		return {
			error: 'arg addresses not found or not an array'
		};
	}

	addresses = addresses.filter(address => address !== '');

	if (addresses.length === 0) {
		return {};
	}

	addresses = [...new Set(addresses)];
	
	const addressesInCache = {};
	addresses = addresses.filter(address => {
		const inCache = definitionsCache.getValue(address);
		if (inCache) {
			addressesInCache[address] = inCache;
			return false;
		}
		
		return true;
	});
	
	if (addresses.length === 0)
		return addressesInCache;
	
	const result = {};
	
	const rows = await db.query(`
		SELECT definition, definition_chash AS address FROM definitions WHERE definition_chash IN(?)
		UNION
		SELECT definition, address FROM aa_addresses WHERE address IN (?)
	`, [addresses, addresses]);

	rows.forEach(row => {
		result[row.address] = JSON.parse(row.definition);
	});
	
	addresses.forEach(address => {
		if (!result[address]) {
			const tmpResult = storage.getUnconfirmedAADefinition(address);
			if (tmpResult)
				definitionsCache.setValue(address, tmpResult);
			
			result[address] = tmpResult || { error: 'definition not found' };
		}
	});
	
	return { ...addressesInCache, ...result };
}

module.exports = {
	getDefinitions,
};
