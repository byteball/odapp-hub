const db = require('ocore/db');
const { isValidAddress } = require('ocore/validation_utils');
const { In, flat } = require('../../utils/dbUtils');

async function getBalances(addresses) {
	if (!addresses || !Array.isArray(addresses)) {
		return {
			error: 'arg addresses not found or not an array'
		};
	}
	
	if (addresses.length === 0) {
		return {};
	}
	
	if (!addresses.every(isValidAddress))
		return { error: 'some addresses are not valid' };
	
	const rows = await db.query(
		`SELECT address, asset, is_stable, SUM(amount) AS balance, COUNT(*) AS outputs_count
		FROM outputs JOIN units USING(unit)
		WHERE is_spent=0 AND address IN(${In(addresses)}) AND sequence='good'
		GROUP BY address, asset, is_stable`, flat([addresses]));
	
	const balances = {};
	rows.forEach((row) => {
		if (!balances[row.address])
			balances[row.address] = { base: { stable: 0, pending: 0, stable_outputs_count: 0, pending_outputs_count: 0 } };
		if (row.asset && !balances[row.address][row.asset])
			balances[row.address][row.asset] = { stable: 0, pending: 0, stable_outputs_count: 0, pending_outputs_count: 0 };
		balances[row.address][row.asset || 'base'][row.is_stable ? 'stable' : 'pending'] = row.balance;
		balances[row.address][row.asset || 'base'][row.is_stable ? 'stable_outputs_count' : 'pending_outputs_count'] = row.outputs_count;
	});
	
	for (const address in balances)
		for (const asset in balances[address])
			balances[address][asset].total = (balances[address][asset].stable || 0) + (balances[address][asset].pending || 0);
	
	return balances;
}

module.exports = {
	getBalances,
};
