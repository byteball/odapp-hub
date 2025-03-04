const { readDataFeedValueByParams } = require('ocore/data_feeds');
const { isDbClosed } = require('../../services/kv.js');

function readDataFeed(params) {
	return new Promise(resolve => {
		checkIsDbOpen(() => {
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

function checkIsDbOpen(cb) {
	if (!isDbClosed()) {
		cb();
	} else {
		console.log('db is closed, waiting 100 ms');
		
		setTimeout(() => {
			checkIsDbOpen(cb);
		}, 100);
	}
}

module.exports = {
	readDataFeed,
};
