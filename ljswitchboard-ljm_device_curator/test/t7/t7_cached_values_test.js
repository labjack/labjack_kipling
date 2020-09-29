
var q = require('q');
var device_curator = require('../../lib/device_curator');
var utils = require('../utils/utils');
var qExec = utils.qExec;
var ljm_ffi = require('ljm-ffi');
var ljm = ljm_ffi.load();
var ljmb = require('ljswitchboard-modbus_map');
var modbus_map = ljmb.getConstants();


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
		console.log('**** t7_cached_values_test ****');
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
	'checkDeviceInfo': function(test) {
		device.getDeviceAttributes()
		.then(function(res) {
			var keys = Object.keys(res);

			assert.strictEqual(res.deviceType, 7);
			assert.strictEqual(res.deviceTypeString, 'LJM_dtT7');
			done();
		});
	},
	'performTest cache miss': function(test) {
		var results = [];
		// Setup and call functions
		device.getCachedValue('AIN0')
		.then(function(res) {
			assert.deepEqual(res, {}, 'returned data should be empty');
			done();
		});
	},
	'performTest cRead': function(test) {
		var results = [];
		// Setup and call functions
		qExec(device, 'cRead', 'AIN0')(results)
		.then(function(res) {
			var expectedResult = [
				{'functionCall': 'cRead', 'type': 'range', 'min': -11, 'max': 11}
			];
			utils.testResults(test, expectedResult, res);
			done();
		});
	},
	'performTest cache hit': function(test) {
		var results = [];
		// Setup and call functions
		device.getCachedValue('AIN0')
		.then(function(res) {
			var reqKeys = ['res','val','str']; // check for basic list of keys indicating correct value.
			var keys = Object.keys(res);
			var hasAllKeys = true;
			var missingKeys = [];
			reqKeys.forEach(function(reqKey) {
				if(keys.indexOf(reqKey) < 0) {
					hasAllKeys = false;
					missingKeys.push(reqKey);
				}
			});
			assert.isOk(hasAllKeys, 'Missing Keys: '+JSON.stringify(missingKeys));
			done();
		});
	},
	'performTest cReadMany': function(test) {
		var results = [];
		var addresses = ['AIN0','AIN1'];
		qExec(device, 'cReadMany', addresses)(results)
		.then(function(res) {
			var expectedResults = [
				{
					'functionCall': 'cReadMany',
					'retData': [
						{'address': 'AIN0', 'isErr': false, 'type': 'range', 'min': -11, 'max': 11},
						{'address': 'AIN1', 'isErr': false, 'type': 'range', 'min': -11, 'max': 11}
					]
				}
			];
			var receivedResults = [];
			var i;
			for(i = 0; i < res.length; i++) {
				receivedResults.push({
					'retData': [{
						'address': addresses[i],
						'isErr': false,
						'data': res[i]
					}]
				});
			}
			utils.testResultsArray(test, expectedResults, res, 'res');
			done();
		});
	},

	'closeDevice': function(test) {
		device.close()
		.then(function() {
			done();
		});
	},
	'close all devices': function(test) {
		ljm.LJM_CloseAll();
		done();
	},
	'close all devices': function(test) {
		ljm.LJM_CloseAll();
		setTimeout(function() {
			done();
		}, 100);
	}
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
