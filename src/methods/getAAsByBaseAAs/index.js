const db = require('ocore/db');
const { isValidAddress } = require('ocore/validation_utils');
const { In, flat } = require('../../utils/dbUtils');

async function getAAsByBaseAAs(baseAAs) {
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
	
	return rows.map(row => {
		return {
			address: row.address,
			definition: JSON.parse(row.definition),
			unit: row.unit,
			creation_date: row.creation_date
		};
	});
}

module.exports = {
	getAAsByBaseAAs,
};
