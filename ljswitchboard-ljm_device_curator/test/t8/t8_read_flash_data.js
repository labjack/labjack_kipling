
var q = require('q');
var device_curator = require('../../lib/device_curator');
var utils = require('../utils/utils');
var qExec = utils.qExec;
var ljm_ffi = require('ljm-ffi');
var async = require('async');
var ljm = ljm_ffi.load();
var ljmb = require('ljswitchboard-modbus_map');
var modbus_map = ljmb.getConstants();


var device;
var capturedEvents = [];

var criticalError = false;
var stopTest = function(test, err) {
	test.ok(false, err);
	criticalError = true;
	test.done();
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
		console.log('**** t8_basic_test ****');
		console.log('**** Please connect 1x T8 via USB ****');
		try {
			device = new device_curator.device();
		} catch(err) {
			stopTest(test, err);
		}
		test.done();
	},
	'close all open devices': function(test) {
		ljm.LJM_CloseAll();
		test.done();
	},
	'openDevice': function(test) {
		var td = {
			'dt': 'LJM_dtT8',
			'ct': 'LJM_ctUSB',
			'id': 'LJM_idANY'
		};

		device.open(td.dt, td.ct, td.id)
		.then(function(res) {
			if(DEBUG_TEST) {
				console.log(
					"  - Opened T8:",
					res.productType,
					res.connectionTypeName,
					res.serialNumber
				);
			}
			// console.log('in t7_basic_test.js, openDevice', res);
			deviceFound = true;
			test.done();
		}, function(err) {
			console.log('Failed to open device', err);
			var info = modbus_map.getErrorInfo(err);
			console.log('Error Code', err);
			console.log('Error Name', info.string);
			console.log('Error Description', info.description);
			performTests = false;
			device.destroy();
			test.done();
		});
	},
	'read FW': function(test) {
		device.iRead('FIRMWARE_VERSION')
		.then(function(res) {
			test.ok(true);
			test.done();
		}, function(err) {
			test.ok(false);
			test.done();
		})
	},
	'checkDeviceInfo': function(test) {
		device.getDeviceAttributes()
		.then(function(res) {

			test.strictEqual(res.deviceType, 8);
			test.strictEqual(res.deviceTypeString, 'LJM_dtT8');
			test.done();
		}, function(err) {
			test.ok(false, 'Error calling getDeviceAttributes', err);
			test.done();
		});
	},
	'test getRecoveryFirmwareVersion': function(test) {
		device.getRecoveryFirmwareVersion()
		.then(function(res) {
			console.log('getRecoveryFirmwareVersion res:', res);
			test.ok(true);
			test.done();
		}, function(err) {
			test.ok(false, 'error received: ' + err.toString());
			test.done();
		})
	},
	// 'test getPrimaryFirmwareVersion': function(test) {
	// 	device.getPrimaryFirmwareVersion()
	// 	.then(function(res) {
	// 		console.log('getPrimaryFirmwareVersion res:', res);
	// 		test.ok(true);
	// 		test.done();
	// 	}, function(err) {
	// 		test.ok(false, 'error received: ' + err.toString());
	// 		test.done();
	// 	})
	// },
	// 'test getInternalFWVersion': function(test) {
	// 	device.getInternalFWVersion()
	// 	.then(function(res) {
	// 		console.log('getInternalFWVersion res:', res);
	// 		test.ok(true);
	// 		test.done();
	// 	}, function(err) {
	// 		test.ok(false, 'error received: ' + err.toString());
	// 		test.done();
	// 	})
	// },
	// 'test getRecoveryFirmwareVersion2': function(test) {
	// 	device.getRecoveryFirmwareVersion()
	// 	.then(function(res) {
	// 		console.log('getRecoveryFirmwareVersion res:', res);
	// 		test.ok(true);
	// 		test.done();
	// 	}, function(err) {
	// 		test.ok(false, 'error received: ' + err.toString());
	// 		test.done();
	// 	})
	// },
	// 'test getPrimaryFirmwareVersion2': function(test) {
	// 	device.getPrimaryFirmwareVersion()
	// 	.then(function(res) {
	// 		console.log('getPrimaryFirmwareVersion res:', res);
	// 		test.ok(true);
	// 		test.done();
	// 	}, function(err) {
	// 		test.ok(false, 'error received: ' + err.toString());
	// 		test.done();
	// 	})
	// },
	// 'test getInternalFWVersion2': function(test) {
	// 	device.getInternalFWVersion()
	// 	.then(function(res) {
	// 		console.log('getInternalFWVersion res:', res);
	// 		test.ok(true);
	// 		test.done();
	// 	}, function(err) {
	// 		test.ok(false, 'error received: ' + err.toString());
	// 		test.done();
	// 	})
	// },

	'closeDevice': function(test) {
		device.close()
		.then(function() {
			test.done();
		});
	},
	'close all devices': function(test) {
		ljm.LJM_CloseAll();
		test.done();
	},
	'close all devices': function(test) {
		ljm.LJM_CloseAll();
		setTimeout(function() {
			test.done();
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
				test.done();
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