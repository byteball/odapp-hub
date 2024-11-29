const conf = require('ocore/conf');
const { isStringOfLength } = require('ocore/validation_utils');
const constants = require('ocore/constants');
const db = require('ocore/db');
const assetMetadataCache = require('../../cacheClasses/assetMetadata');
const { getAssetsMetadataFromMemory } = require('../../services/assetMetadata');

async function getAssetsMetadata(assets) {
	if (!assets || !Array.isArray(assets)) {
		return {
			error: 'arg assets not found or not an array'
		};
	}

	assets = assets.filter(asset => asset !== '');
	
	if (assets.length === 0) {
		return [];
	}

	assets = [...new Set(assets)];
	
	const assetsInCache = {};
	assets = assets.filter(asset => {
		if (['base', 'gbyte', 'bytes'].includes(asset.toLowerCase())) {
			assetsInCache['base'] = {
				asset:	'base',
				decimals:9,
				name: 'GBYTE'
			};
			return false;
		}
		
		if (!isStringOfLength(asset, constants.HASH_LENGTH)) {
			return false;
		}
		
		if (!conf.useSQLiteForAssetMetadata) return true; // cache is not used in this case
		
		const inCache = assetMetadataCache.getValue(asset);
		if (inCache) {
			assetsInCache[asset] = inCache;
			return false;
		}
		
		return true;
	});
	
	if (assets.length === 0)
		return assetsInCache;
	
	
	if (!conf.useSQLiteForAssetMetadata) {
		const result = getAssetsMetadataFromMemory(assets);
		return result ? { ...assetsInCache, ...result } : assetsInCache;
	}
	
	const rows = await db.query('SELECT metadata_unit, registry_address, suffix, asset, name, decimals FROM asset_metadata WHERE asset IN (?)', [assets]);
	
	
	if (rows.length === 0)
		return assetsInCache;
	
	const result = {};
	
	for (const row of rows) {
		result[row.asset] = row;
		assetMetadataCache.setValue(row.asset, row);
	}
	
	return { ...assetsInCache, ...result };
}

module.exports = {
	getAssetsMetadata,
};
