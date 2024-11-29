const db = require('ocore/db');
const { readJoint } = require('ocore/storage');

const jointsCache = require('../../cacheClasses/jointsCache');

async function getJoint(unit) {
	if (!unit) {
		return {
			error: 'unit not found'
		};
	}
	
	return new Promise(resolve => {
		const inCache = jointsCache.getValue(unit);
		if (inCache) {
			return resolve(inCache);
		}
		
		readJoint(db, unit, {
			ifFound: (objJoint) => {
				jointsCache.setValue(unit, objJoint);
				return resolve(objJoint);
			},
			ifNotFound: () => {
				return resolve({ error: { joint_not_found: unit } });
			}
		});
	});
}

module.exports = {
	getJoint,
};
