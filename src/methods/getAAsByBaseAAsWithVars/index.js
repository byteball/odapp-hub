const db = require('ocore/db');
const { getAAStateVars } = require('../getAaStateVars');
const { isValidAddress } = require('ocore/validation_utils');
const { In, flat } = require('../../utils/dbUtils');

async function getStateVarsWithAA(aa) {
	return {
		aa,
		stateVars: await getAAStateVars(aa)
	};
}

async function getAAsByBaseAAsWithVars(baseAAs) {
	if (!baseAAs || !Array.isArray(baseAAs)) {
		return {
			error: 'arg base_aas not found or not an array'
		};
	}

	baseAAs = baseAAs.filter(aa => aa !== '');

	for (let i = 0; i < baseAAs.length; i++) {
		if (!isValidAddress(baseAAs[i])) {
			return {
				error: 'arg base_aas[' + i + '] "' + baseAAs[i] + '" not a valid address'
			};
		}
	}
	
	if (baseAAs.length === 0) {
		return {};
	}

	baseAAs = [...new Set(baseAAs)];
	
	const rows = await db.query(`SELECT address, definition, unit, creation_date FROM aa_addresses WHERE base_aa IN(${In(baseAAs)})`, flat([baseAAs]));
	const addresses = rows.map(row => row.address);
	const stateVarsResult = await Promise.all(addresses.map(address => getStateVarsWithAA(address)));
	const stateVarsByAA = {};
	
	for (const result of stateVarsResult) {
		stateVarsByAA[result.aa] = result.stateVars;
	}
	
	
	return rows.map(row => {
		return {
			address: row.address,
			definition: JSON.parse(row.definition),
			unit: row.unit,
			creation_date: row.creation_date,
			stateVars: stateVarsByAA[row.address],
		};
	});
}

module.exports = {
	getAAsByBaseAAsWithVars,
};
