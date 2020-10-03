
var q = require('q');
var device_curator = require('../../lib/device_curator');
var utils = require('../utils/utils');
var qExec = utils.qExec;
var ljm_ffi = require('ljm-ffi');
var ljm = ljm_ffi.load();
var ljmb = require('ljswitchboard-modbus_map');
var modbus_map = ljmb.getConstants();

var path = require('path');
var fs = require('fs');

var device;
var capturedEvents = [];

var criticalError = false;
var stopTest = function(test, err) {
	assert.isOk(false, err);
	criticalError = true;
	done();
};

var deviceFound = false;
var performTests = true;

var DEBUG_TEST = false;
var DEBUG_FILE_SYSTEM_OPERATIONS = false;
var DEBUG_FILE_SYSTEM_GET_CWD = false;
var DEBUG_FILE_SYSTEM_GET_LS = false;
var DEBUG_FILE_SYSTEM_GET_CD = false;
var DEBUG_FILE_SYSTEM_GET_DISK_INFO = false;
var DEBUG_FILE_SYSTEM_READ_FILE = true;
var DEBUG_FILE_SYSTEM_DELETE_FILE = true;
var ENABLE_ERROR_OUTPUT = true;
var ENABLE_TEST_OUTPUT = true;

function getLogger(bool) {
	return function logger() {
		if(bool) {
			console.log.apply(console, arguments);
		}
	};
}

var debugFSOps = getLogger(DEBUG_FILE_SYSTEM_OPERATIONS);
var debugCWD = getLogger(DEBUG_FILE_SYSTEM_GET_CWD);
var debugLS = getLogger(DEBUG_FILE_SYSTEM_GET_LS);
var debugCD = getLogger(DEBUG_FILE_SYSTEM_GET_CD);
var debugDiskInfo = getLogger(DEBUG_FILE_SYSTEM_GET_DISK_INFO);
var debugRF = getLogger(DEBUG_FILE_SYSTEM_READ_FILE);
var debugDF = getLogger(DEBUG_FILE_SYSTEM_DELETE_FILE);
var errorLog = getLogger(ENABLE_ERROR_OUTPUT);
var testLog = getLogger(ENABLE_TEST_OUTPUT);

var device_tests = {
	'setUp': function(callback) {
		if(criticalError) {
			process.exit(1);
		} else {
			callback();
		}
	},
	'tearDown': function(callback) {
		callback();
	},
	'createDevice': function(test) {
		console.log('');
		console.log('**** t7_manufacturing_info_test ****');
		console.log('**** Please connect 1x T7 via USB ****');
		try {
			device = new device_curator.device();
		} catch(err) {
			stopTest(test, err);
		}
		done();
	},
	'close all open devices': function(test) {
		ljm.LJM_CloseAll();
		done();
	},
	'openDevice': function(test) {
		var td = {
			'dt': 'LJM_dtT7',
			'ct': 'LJM_ctUSB',
			'id': 'LJM_idANY'
		};

		device.open(td.dt, td.ct, td.id)
		.then(function(res) {
			if(DEBUG_TEST) {
				console.log(
					"  - Opened T7:",
					res.productType,
					res.connectionTypeName,
					res.serialNumber
				);
			}
			// console.log('in t7_basic_test.js, openDevice', res);
			deviceFound = true;
			done();
		}, function(err) {
			console.log('Failed to open device', err);
			var info = modbus_map.getErrorInfo(err);
			console.log('Error Code', err);
			console.log('Error Name', info.string);
			console.log('Error Description', info.description);
			performTests = false;
			device.destroy();
			done();
		});
	},
	'get manufacturing info': function(test) {
		var requiredResKeys = [
			'data', 'str'
		];
		var requiredDataKeys = [
			'timeOfTest',
			'ljmVersion',
			'ljtestVersion',
			'jigType',
			'jigCode',
			'fwVersion',
			'bsVersion',
		];
		device.readManufacturingInfo()
		.then(function(res) {
			console.log('Manufacturing Info:'.green, res.data);
			var keys = Object.keys(res);
			assert.strictEqual(requiredResKeys.length, keys.length, 'num keys should be equal');
			keys.forEach(function(key) {
				assert.isOk(requiredResKeys.indexOf(key) >= 0, 'Key was not found: ' + key);
			});

			var dataKeys = Object.keys(res.data);
			assert.strictEqual(requiredDataKeys.length, dataKeys.length, 'num keys should be equal');
			dataKeys.forEach(function(dataKey) {
				assert.isOk(requiredDataKeys.indexOf(dataKey) >= 0, 'Key was not found: ' + dataKey);
			});
			// assert.strictEqual(res.deviceType, 7);
			// assert.strictEqual(res.deviceTypeString, 'LJM_dtT7');
			done();
		}, function(err) {
			assert.isOk(false, 'should not have gotten an error reading manufacturing info');
			done();
		});
	},
	'checkDeviceInfo': function(test) {
		device.getDeviceAttributes()
		.then(function(res) {
			var keys = Object.keys(res);

			assert.strictEqual(res.deviceType, 7);
			assert.strictEqual(res.deviceTypeString, 'LJM_dtT7');
			done();
		});
	},

	'closeDevice': function(test) {
		// console.log('Closing...');
		device.close()
		.then(function() {
			done();
		});
	},
	'close all devices': function(test) {
		ljm.LJM_CloseAll();
		done();
	},
};

var tests = {};
var functionKeys = Object.keys(device_tests);
var getTest = function(testFunc, key) {
	var execTest = function(test) {
		// console.log("  > t7_basic_test - " + key);
		if(performTests) {
			testFunc(test);
		} else {
			console.log("  * Not Executing!!");
			try {
				done();
			} catch(err) {
				console.log("HERE", err);
			}
		}
	};
	return execTest;
};
functionKeys.forEach(function(functionKey) {
	if ((functionKey !== 'setUp') && (functionKey !== 'tearDown')) {
		tests[functionKey] = getTest(device_tests[functionKey], functionKey);
	} else {
		tests[functionKey] = device_tests[functionKey];
	}
});
exports.tests = tests;
