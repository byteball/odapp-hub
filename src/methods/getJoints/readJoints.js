const db = require('ocore/db');
const kv = require('../../services/kv.js');
const { In, flat } = require('../../utils/dbUtils');
const jointsCache = require('../../cacheClasses/jointsCache');

const versionWithoutTimestamp = process.env.testnet ? '1.0t' : '1.0';

async function readJoints(units) {
	const unitsInCache = [];
	units = units.filter(unit => {
		const inCache = jointsCache.getValue(unit);
		if (inCache) {
			unitsInCache.push(inCache);
			return false;
		}

		return true;
	});

	if (units.length === 0)
		return unitsInCache;
	
	const keys = units.map(unit => `j\n${unit}`);
	const jointsFromKv = await kv.getMany(keys);
	const objJoints = jointsFromKv.map((v, i) => {
		if (!v) {
			return { error: { joint_not_found: units[i] } };
		}
		return JSON.parse(v);
	});
	
	const rows = await db.query('SELECT unit, main_chain_index, ' + db.getUnixTimestamp('creation_date') + ` AS timestamp FROM units WHERE unit IN (${In(units)})`, flat([units]));
	const objRows = {};
	rows.forEach(row => {
		objRows[row.unit] = {
			timestamp: row.timestamp,
			main_chain_index: row.main_chain_index,
		};
	});
	
	objJoints.forEach(objJoint => {
		if (objJoint.error) return;
		
		const row = objRows[objJoint.unit.unit];
		if (objJoint.unit.version === versionWithoutTimestamp)
			objJoint.unit.timestamp = parseInt(row.timestamp);
		objJoint.unit.main_chain_index = row.main_chain_index;
		
		jointsCache.setValue(objJoint.unit.unit, objJoint);
	});
	
	return [ ...objJoints, ...unitsInCache ];
}

module.exports = {
	readJoints,
};
