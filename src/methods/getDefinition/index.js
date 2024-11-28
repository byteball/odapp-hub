const db = require('ocore/db');
const storage = require('ocore/storage');
const definitionsCache = require('../../cacheClasses/definitionsCache');

async function getDefinition(address) {
	if (!address) {
		return {
			error: 'address not found'
		};
	}
	
	const inCache = definitionsCache.getValue(address);
	if (inCache) {
		return inCache;
	}
	
	const rows = await db.query('SELECT definition FROM definitions WHERE definition_chash=? UNION SELECT definition FROM aa_addresses WHERE address=? LIMIT 1', [address, address]);
	const arrDefinition = rows[0]
		? JSON.parse(rows[0].definition)
		: storage.getUnconfirmedAADefinition(address);
	
	if (arrDefinition)
		definitionsCache.setValue(address, arrDefinition);
	
	return arrDefinition ||
	{ error: 'definition not found' };
}

module.exports = {
	getDefinition,
};
