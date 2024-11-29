/*jslint node: true */
'use strict';
const conf = require('ocore/conf.js');
const storage = require('ocore/storage.js');
const db = require('ocore/db');
const validationUtils = require('ocore/validation_utils.js');

const arrRegistryAddresses = Object.keys(conf.trustedRegistries);
const assetsWithMetadata = new Map();
const assocNameToRegistryAddress = new Map();
const assocNameWithRegistryAddressToAsset = {};

function handlePotentialAssetMetadataUnit(unit, cb) {
	if (!cb)
		return new Promise(resolve => handlePotentialAssetMetadataUnit(unit, resolve));
	storage.readJoint(db, unit, {
		ifNotFound: function(){
			throw Error('unit '+unit+' not found');
		},
		ifFound: function(objJoint){
			const log = msg => {
				console.log(msg);
				cb();
			};
			let objUnit = objJoint.unit;
			let arrAuthorAddresses = objUnit.authors.map(author => author.address);
			if (arrAuthorAddresses.length !== 1)
				return log('ignoring multi-authored unit '+unit);
			let registry_address = arrAuthorAddresses[0];
			let registry = conf.trustedRegistries[registry_address];
			if (!registry)
				return log('not authored by registry: '+unit);
			let arrAssetMetadataPayloads = [];
			objUnit.messages.forEach(message => {
				if (message.app !== 'data')
					return;
				let payload = message.payload;
				if (!payload.asset || !payload.name)
					return console.log('found data payload that is not asset metadata');
				arrAssetMetadataPayloads.push(payload);
			});
			if (arrAssetMetadataPayloads.length === 0)
				return cb();
			if (arrAssetMetadataPayloads.length > 1)
				return log('multiple asset metadata payloads not supported, found '+arrAssetMetadataPayloads.length);
			let payload = arrAssetMetadataPayloads[0];
			if ('decimals' in payload && !validationUtils.isNonnegativeInteger(payload.decimals))
				return log('invalid decimals in asset metadata of unit '+unit);
			let suffix = null;
			db.query('SELECT 1 FROM assets WHERE unit=?', [payload.asset], rows => {
				if (rows.length === 0)
					return log('asset '+payload.asset+' not found');
				
				const metaByName = assocNameToRegistryAddress.get(payload.name) || [];
				if (metaByName.length && metaByName.find(m => m.registry_address !== registry_address)) {
					suffix = registry.name;
				}
				
				const metaByCurrentRegistry = metaByName.find(m => m.registry_address === registry_address) || [];
				if (metaByCurrentRegistry.length > 0 && !registry.allow_updates) {
					let bSame = (metaByCurrentRegistry[0].asset === payload.asset);
					if (bSame)
						return log('asset '+payload.asset+' already registered by the same registry '+registry_address+' by the same name '+payload.name);
					else
						return log('registry '+registry_address+' attempted to register the same name '+payload.name+' under another asset '+payload.asset+' while the name is already assigned to '+metaByCurrentRegistry[0].asset);
				}
				
				if (assetsWithMetadata.has(payload.asset) && !registry.allow_updates)
					return log('registry '+registry_address+' attempted to register asset '+payload.asset+' again, old name '+rows[0].name+' by '+rows[0].registry_address+', new name '+payload.name);
				
				if (assocNameWithRegistryAddressToAsset[`${payload.name}_${registry_address}`]) {
					if (!registry.allow_updates)
						return log('name with registry '+registry_address+' already registered by another asset '+assocNameWithRegistryAddressToAsset[`${payload.name}_${registry_address}`]);
					
					const asset = assocNameWithRegistryAddressToAsset[`${payload.name}_${registry_address}`];
					const savedAsset = assetsWithMetadata.get(asset);
					
					if (savedAsset.name === payload.name) {
						assetsWithMetadata.delete(asset);
						delete assocNameWithRegistryAddressToAsset[`${payload.name}_${registry_address}`];
					}
				}
				
				
				assetsWithMetadata.set(payload.asset, {
					metadata_unit: unit,
					registry_address,
					suffix,
					asset: payload.asset,
					name: payload.name,
					decimals: payload.decimals,
				});
				
				assocNameWithRegistryAddressToAsset[`${payload.name}_${registry_address}`] = payload.asset;
				
				const index = metaByName.findIndex(v => v.registry_address === registry_address);
				if (index === -1) {
					assocNameToRegistryAddress.set(payload.name, [...metaByName, {
						asset: payload.asset, 
						registry_address, 
					}]);
				} else {
					const v = assocNameToRegistryAddress.get(payload.name);
					v[index] = {
						asset: payload.asset,
						registry_address,
					};
				}
				
				cb();
			});
		}
	});
}


async function scanLastMetadataUnits(rowid){
	const rows = await db.query('SELECT rowid, unit FROM unit_authors WHERE rowid > ? AND address IN(?) ORDER BY rowid', 
		[rowid, arrRegistryAddresses]);
	
	let arrUnits = rows.map(row => row.unit);

	for (let unit of arrUnits)
		await handlePotentialAssetMetadataUnit(unit);
	
	return rows.length === 0 ? rowid : rows[rows.length-1].rowid;
}

async function initializeMetadataAndSetUpdateInterval() {
	let rowid = await scanLastMetadataUnits(0);
	console.log('-- assets in memory:', assetsWithMetadata.size);
	
	setInterval(async () => {
		rowid = await scanLastMetadataUnits(rowid);
	}, 1000 * 60);
}

function getAssetMetadataFromMemory(asset) {
	return assetsWithMetadata.get(asset);
}

function getAssetsMetadataFromMemory(assets) {
	const fromMemory = assets.map(asset => {
		return {
			asset,
			meta: assetsWithMetadata.get(asset),
		};
	});
	const result = {};
	fromMemory.forEach(v => {
		if(!v.meta) {
			result[v.asset] = { error: 'no metadata' };
			return;
		} 
		result[v.asset] = v.meta;
	});
	
	return result;
}

module.exports = {
	getAssetMetadataFromMemory,
	getAssetsMetadataFromMemory,
	initializeMetadataAndSetUpdateInterval,
};
