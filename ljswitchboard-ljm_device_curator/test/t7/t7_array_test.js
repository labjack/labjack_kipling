
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
		console.log('**** t7_array_test ****');
		console.log('**** Please connect 1x T7 via USB ****');
		try {
			device = new device_curator.device();
		} catch(err) {
			stopTest(test, err);
		}
		setTimeout(function() {
			done();
		}, 1000);
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
			console.log('Failed to open device:');
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
	'enable lua-debugging': function(test) {
		device.write('LUA_DEBUG_ENABLE', 1)
		.then(function(res) {
			assert.isOk(true);
			done();
		}, function(err) {
			assert.isOk(false);
			done();
		});
	},
	'performTest readArray': function(test) {
		device.readArray('LUA_DEBUG_DATA', 100)
		.then(function(res) {
			// console.log('readArray res', res);
			assert.equal(res.length, 100, 'Length is not valid');
			assert.isOk(true);
			done();
		},function(err) {
			// console.log('readArray error', err);
			assert.isOk(false);
			done();
		});
	},
	'closeDevice': function(test) {
		device.close()
		.then(function() {
			done();
		});
	},
	'openDevice Ethernet': function(test) {
		var td = {
			'dt': 'LJM_dtT7',
			'ct': 'LJM_ctEthernet',
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
			performTests = false;
			done();
		});
	},
	'enable lua-debugging Ethernet': function(test) {
		device.write('LUA_DEBUG_ENABLE', 1)
		.then(function(res) {
			assert.isOk(true);
			done();
		}, function(err) {
			assert.isOk(false);
			done();
		});
	},
	'performTest readArray Ethernet': function(test) {
		device.readArray('LUA_DEBUG_DATA', 1000)
		.then(function(res) {
			// console.log('readArray res', res);
			assert.equal(res.length, 1000, 'Length is not valid');
			assert.isOk(true);
			done();
		},function(err) {
			// console.log('readArray error', err);
			assert.isOk(false);
			done();
		});
	},
	'closeDevice Ethernet': function(test) {
		device.close()
		.then(function() {
			done();
		});
	},
	'close all devices': function(test) {
		ljm.LJM_CloseAll();
		done();
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
