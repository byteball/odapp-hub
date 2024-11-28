const conf = require('ocore/conf');
const db = require('ocore/db');
const constants = require('ocore/constants.js');
const { isStringOfLength } = require('ocore/validation_utils');
const assetMetadataCache = require('../../cacheClasses/assetMetadata');
const { getAssetMetadataFromMemory } = require('../../services/assetMetadata');

async function getAssetMetadata(asset) {
	if (!asset) {
		return {
			error: 'arg asset not found'
		};
	}
	
	if (['base', 'gbyte', 'bytes'].includes(asset.toLowerCase())) {
		return {
			asset:	'base',
			decimals:9,
			name: 'GBYTE'
		};
	}
	
	if (!isStringOfLength(asset, constants.HASH_LENGTH)) {
		return {
			error: 'bad asset: '+asset
		};
	}
	
	if (!conf.useSQLiteForAssetMetadata) {
		const result = getAssetMetadataFromMemory(asset);
		if (result) {
			return result;
		}
		
		return { error: 'no metadata' };
	}
	
	const inCache = assetMetadataCache.getValue(asset);
	if (inCache) {
		return inCache;
	}
	
	const  rows = await db.query('SELECT metadata_unit, registry_address, suffix, asset, name, decimals FROM asset_metadata WHERE asset=?', [asset]);
	
	if (rows.length === 0)
		return { error: 'no metadata' };
	
	const result = rows[0];
	
	assetMetadataCache.setValue(asset, result);
	
	return result;
}

module.exports = {
	getAssetMetadata,
};
