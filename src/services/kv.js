const conf = require('ocore/conf.js');
const { createRequire } = require('node:module');
const { join } = require('node:path');
const { getAppDataDir } = require('ocore/desktop_app.js');
const requireOcore = createRequire(require.resolve('ocore/kvstore.js'));
const { RocksDatabase } = requireOcore('@harperfast/rocksdb-js');
const dataDir = getAppDataDir();

if (!conf.useExternalFullNode) {
	delete process.env.KVSTORE_SECONDARY_PATH;
} else if (!process.env.KVSTORE_SECONDARY_PATH) {
	process.env.KVSTORE_SECONDARY_PATH = join(dataDir, 'odapp-hub-rocksdb-secondary');
}

const kvstore = require('ocore/kvstore.js');
const rocksPath = process.platform === 'win32' ? 'rocksdb' : join(dataDir, 'rocksdb');
const db = RocksDatabase.open(rocksPath, {
	keyEncoding: 'binary',
	encoding: 'binary',
	secondaryPath: process.env.KVSTORE_SECONDARY_PATH,
});
const readKey = kvstore.get;
let secondaryRefresh;

function refreshSecondary() {
	if (!secondaryRefresh) {
		secondaryRefresh = db.catchUpWithPrimary().catch(err => {
			console.error('Failed to refresh RocksDB secondary:', err);
		}).finally(() => {
			secondaryRefresh = undefined;
		});
	}
	return secondaryRefresh;
}

if (kvstore.isSecondary) {
	kvstore.get = (key, cb) => {
		if (secondaryRefresh) {
			secondaryRefresh.then(() => readKey(key, cb));
			return;
		}
		readKey(key, value => {
			if (value !== undefined)
				return cb(value);
			refreshSecondary().then(() => readKey(key, cb));
		});
	};
	setInterval(refreshSecondary, 60_000).unref();
}

async function getMany(keys) {
	const pendingRefresh = secondaryRefresh;
	if (pendingRefresh)
		await pendingRefresh;
	let values = await db.getManyBinary(keys);
	if (kvstore.isSecondary && !pendingRefresh && values.includes(undefined)) {
		await refreshSecondary();
		values = await db.getManyBinary(keys);
	}
	return values.map(value => value?.toString('utf8'));
}

module.exports = {
	get: kvstore.get,
	getMany,
	createReadStream: kvstore.createReadStream,
	waitForRefresh: () => secondaryRefresh,
};
