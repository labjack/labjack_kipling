var async = require('async');
var ref;
try {
    ref = require('ref');       //Load variable type module
} catch(err) {
    ref = require('ref-napi');       //Load variable type module
}

var ENABLE_DEBUG = false;
function debug() {
	if(ENABLE_DEBUG) {
		console.log.apply(console, arguments);
	}
}
var ENABLE_LOG = true;
function log() {
	if(ENABLE_LOG) {
		console.log.apply(console, arguments);
	}
}

var scanIntArray = [];
for(var i = 0; i < 128; i++) {
	scanIntArray.push(0);
}
var aBytesArray = [];
for(var i = 0; i < (128 * 2 * 1); i++) {
	aBytesArray.push(0);
}

var ljm_ffi = require('../../lib/ljm-ffi');
var ljm = ljm_ffi.load();


var test_utils = require('../test_utils/test_utils');
var parseIPAddress = test_utils.parseIPAddress;
var getHandleInfos = test_utils.getHandleInfos;




module.exports.Internal_LJM_OpenAll = {
	'min_ljm_version': 1.1200,
	'test_args': [
		{'DeviceType': 				0},
		{'ConnectionType': 			0},
		{'NumOpened': 				0},
		{'aHandles': 				scanIntArray},
		{'NumErrors': 				0},
		{'InfoHandle':  			0},
		{'Info': 					''},
	],
	'throws_err': false,
	'custom_verify': function(test, results, cb) {
		debug('ljmError', results.ljmError);
		debug('ConnectionType', results.ConnectionType);
		debug('NumOpened', results.NumOpened);
		// debug('aHandles', results.aHandles);
		debug('NumErrors', results.NumErrors);
		var handles = [];
		for(var i = 0; i < results.NumOpened; i++) {
			handles.push(results.aHandles[i]);
		}
		
		debug('Num Handles', handles.length, handles);
		getHandleInfos(handles, function(infos) {
			log(' - Found Devices (', infos.length, '):');
			infos.forEach(function(info) {
				log('  -', info);
			});
			cb();
		});
	},
};

module.exports.LJM_CloseAll = {
	'min_ljm_version': 1.09,
	'test_args': [],
	'throws_err': false,
	'custom_verify': function(test, results, cb) {
		// console.log('Finished closing all...', results);
		cb();
	}
};
