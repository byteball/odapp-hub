const { waitForRefresh } = require('../../services/kv.js');
const { readDataFeedValueByParams } = require('ocore/data_feeds');

async function readDataFeed(params) {
	await waitForRefresh();
	return new Promise(resolve => {
		readDataFeedValueByParams(params, 1e15, 'all_unstable', function (err, value) {
			if (err) {
				return resolve({ error: err });
			}
			return resolve(value);
		});
	});
}

module.exports = {
	readDataFeed,
};
