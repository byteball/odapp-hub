const { readDataFeedValueByParams } = require('ocore/data_feeds');
const { waitIfClosed } = require('../../services/kv.js');

function readDataFeed(params) {
	return new Promise(resolve => {
		waitIfClosed(() => {
			readDataFeedValueByParams(params, 1e15, 'all_unstable', function (err, value) {
				if (err) {
					return resolve({
						error: err
					});
				}

				return resolve(value);
			});
		});
	});
}

module.exports = {
	readDataFeed,
};
