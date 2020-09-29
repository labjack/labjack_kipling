
var q = require('q');
var async = require('async');
var labjack_nodejs = require('labjack-nodejs');
var ljm = new labjack_nodejs.driver();
var device_curator = require('../lib/device_curator');
var utils = require('./utils/utils');
var qExec = utils.qExec;
var ljm_modbus_map = require('ljswitchboard-modbus_map');
var modbus_map = ljm_modbus_map.getConstants();

var device;

var criticalError = false;
var stopTest = function(test, err) {
	assert.isOk(false, err);
	criticalError = true;
	done();
};

var deviceFound = false;
var performTests = true;
var settings;

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
		console.log('**** t7_basic_stream_test ****');
		try {
			device = new device_curator.device();
		} catch(err) {
			stopTest(test, err);
		}
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
			deviceFound = true;
			done();
		}, function(err) {
			performTests = false;
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
	'startBasicStream': function(test) {
		settings = {
			'scansPerRead': 10,
			'scanList': ['AIN0', 'AIN1', 'FIO_STATE'],
			'scanRate': 100
		};

		device.streamStart(
			settings.scansPerRead,
			settings.scanList,
			settings.scanRate
			)
		.then(function(res) {
				done();
			}, function(err) {
				// End the test & report that an error has occured.
				console.log('Stream not started', err, modbus_map.getErrorInfo(err));

				performTests = false;
				assert.isOk(false, 'Stream failed to start');
				done();
			});
	},
	'basicStreamRead': function(test) {
		device.streamRead()
		.then(function(res) {
			var msg = 'bad stream read results';
			assert.strictEqual(res.numAddresses, settings.scanList.length, msg);
			assert.deepEqual(res.scanList, settings.scanList, msg);
			assert.strictEqual(res.scansPerRead, settings.scansPerRead, msg);
			assert.strictEqual(res.data.length, settings.scansPerRead, msg);

			if(DEBUG_TEST) {
				console.log('Stream Data:', res);
			}
			res.data.forEach(function(dataPoint, i) {
				assert.strictEqual(dataPoint.length, settings.scanList.length + 1, msg);
				if(DEBUG_TEST) {
					console.log('  ' + i.toString() + ': ' + JSON.stringify(dataPoint));
				}
			});
			done();
		}, function(err) {
			console.log('Stream Read failed', err, modbus_map.getErrorInfo(err));
			assert.isOk(false, 'Stream Read failed');
			done();
		});
	},
	'stopBasicStream': function(test) {
		device.streamStop()
		.then(function(res) {
			done();
		}, function(err) {
			// Report that the stream failed to stop
			console.log('Stream failed to stop', err);
			assert.isOk(false, 'Stream failed to stop');
			done();
		});
	},
	'closeDevice': function(test) {
		device.close()
		.then(function() {
			done();
		}, function(err) {
			console.log('Failure');
			assert.isOk(false);
			done();
		});
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
			if((key === 'closeDevice') && (deviceFound)) {
				testFunc(test);
			} else {
				console.log("  * Not Executing!!", key);
				try {
					done();
				} catch(err) {
					console.log("HERE", err);
				}
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
