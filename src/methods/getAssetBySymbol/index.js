const { getAAStateVar } = require('../getAaStateVar'); 
const { registry_address } = require('ocore/conf');
const assetBySymbolCache = require('../../cacheClasses/assetBySymbolCache');

async function getAssetBySymbol(symbol, registryAddress) {
	if (!symbol) {
		return {
			error: 'arg symbol not found'
		};
	}
	
	if (['GBYTE', 'BYTES', 'BASE'].includes(symbol.toUpperCase())) {
		return 'base';
	}
	
	const inCache = assetBySymbolCache.getValue(symbol);
	if (inCache) {
		return inCache;
	}
	
	if (!registryAddress) {
		registryAddress = registry_address;
	}
	
	const _var = await getAAStateVar(registryAddress, `s2a_${symbol}`);
	if (_var && !_var.error) {
		assetBySymbolCache.setValue(symbol, _var);
		return _var;
	}
	
	return {
		error: 'symbol not found'
	};
}


module.exports = {
	getAssetBySymbol,
};
