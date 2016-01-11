var async = require('async');

var ljm_ffi = require('../lib/ljm-ffi');
var ljm = ljm_ffi.load();

var utils = require('./utils/utils');
var parseIPAddress = utils.parseIPAddress;
var getHandleInfo = utils.getHandleInfo;
var debug = utils.debug;
var log = utils.log;

// Define a variable that will store the device's handle.
var handle;

var operationsToExecute = [
	'open',
	'readAIN0',
	'close',
];

var operations = {
	'open': function(cb) {
		function openFinished(data) {
			if(data.ljmError === 0) {
				handle = data.handle;
				getHandleInfo(handle, function(data) {
					log('Opened Device:', data);
					cb();
				});
			} else {
				log('Failed to open a device, please connect a T7 to your computer.');
				cb();
			}
		}

		var dt = 'LJM_dtT7';
		var ct = 'LJM_ctUSB';
		var id = 'LJM_idANY';
		ljm.LJM_OpenS.async(dt, ct, id, 0, openFinished);
	},
	'readAIN0': function(cb) {
		function readFinished(data) {
			log('AIN0', data.Value);
			cb();
		}

		ljm.LJM_eReadName.async(handle, 'AIN0', 0, readFinished);
	},
	'close': function(cb) {
		function closeFinished(data) {
			cb();
		}
		ljm.LJM_Close.async(handle, closeFinished);
	},
};

try {
	async.eachSeries(operationsToExecute,
		function(operationName, cb) {
			debug('Executing:', operationName);
			operations[operationName](cb);
		}, function(err) {
			debug('Finished');
		});
} catch(err) {
	console.error('ERROR', err, err.stack);
}