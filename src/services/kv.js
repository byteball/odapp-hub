/*jslint node: true */
var fs = require('fs');
var rocksdb = require('level-rocksdb');
var app_data_dir = require('ocore/desktop_app.js').getAppDataDir();
var path = app_data_dir + '/rocksdb';

try{
	fs.statSync(app_data_dir);
}
catch(e){
	var mode = parseInt('700', 8);
	var parent_dir = require('path').dirname(app_data_dir);
	try { fs.mkdirSync(parent_dir, mode); } catch(e){}
	try { fs.mkdirSync(app_data_dir, mode); } catch(e){}
}

if (process.platform === 'win32') {
	process.chdir(app_data_dir); // workaround non-latin characters in path
	path = 'rocksdb';
}
var db = rocksdb(path, { readOnly: true }, function (err) {
	if (err)
		throw Error('rocksdb open failed (is the app already running?): ' + err);
	// if (process.platform === 'win32') // restore current working directory on windows
	// 	process.chdir(cwd);
});
if (!db)
	throw Error('no rocksdb instance');


function reOpenDB(cb) {
	db.close(() => {
		db.open(() => {
			if(cb) cb();
		});
	});
}

function waitIfClosed(cb, attempts = 0) {
	if (db.isClosed()) {
		setTimeout(() => {
			if (attempts >= 200) { // ~1 second
				throw new Error('kv didn\'t open');
			}
			waitIfClosed(cb, ++attempts);
		}, 5);
		return;
	}
	
	return cb();
}


setInterval(() => {
	reOpenDB();
}, 1000 * 60);


function get(key, cb, retry){
	waitIfClosed(() => {
		db.get(key, function(err, val){
			if (err){
				if (err.notFound){
					if (!retry) {
						reOpenDB(() => {
							get(key, cb, true);	
						});
						return;
					}
					return cb();
				}
				
				throw Error('get '+key+' failed: '+err);
			}
			cb(val);
		});
	});
}


function getMany(keys, cb, retry){
	waitIfClosed(() => {
		db.getMany(keys, (err, val) => {
			const i = val.findIndex(v => v === undefined);
			if (i !== -1 && !retry) {
				reOpenDB(() => {
					getMany(keys, cb, true);
				});
				return;
			}
			cb(false, val);
		});
	});
}

module.exports = {
	get,
	getMany(keys) {
		return new Promise(resolve => {
			getMany(keys, (err, val) => {
				resolve(val);
			});
		});
	},
	
	put: function(key, val, cb){
		db.put(key, val, function(err){
			if (err)
				throw Error('put '+key+' = '+val+' failed: '+err);
			cb();
		});
	},
	
	del: function(key, cb){
		db.del(key, function(err){
			if (err)
				throw Error('del ' + key + ' failed: ' + err);
			if (cb)
				cb();
		});
	},
	
	batch: function(){
		return db.batch();
	},
	
	createReadStream: function(options){
		return db.createReadStream(options);
	},
	
	createKeyStream: function(options){
		return db.createKeyStream(options);
	},
	
	open: function(cb){
		if (db.isOpen()) return cb('already open');
		db.open(cb);
	},
	
	close: function(cb){
		if (db.isClosed()) return cb('already closed');
		db.close(cb);
	},
	
	waitIfClosed,
};
