
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
	'checkDeviceInfo': function(test) {
		device.getDeviceAttributes()
		.then(function(res) {
			var keys = Object.keys(res);
			var requiredAttributes = [
				'deviceType',
				'connectionType',
				'serialNumber',
				'ipAddress',
				'port',
				'maxBytesPerMB',
				'deviceTypeString',
				'deviceClass',
				'openParameters',
				'subclass',
				'isPro',
				'productType'
			];
			var givenAttributes = Object.keys(res);
			requiredAttributes.forEach(function(requiredAttribute) {
				var msg = 'Required key does not exist: ' + requiredAttribute;
				test.ok((givenAttributes.indexOf(requiredAttribute) >= 0), msg);
			});

			test.strictEqual(res.deviceType, 8);
			test.strictEqual(res.deviceTypeString, 'LJM_dtT8');
			test.done();
		}, function(err) {
			test.ok(false, 'Error calling getDeviceAttributes', err);
			test.done();
		});
	},
	// 'performTestRead': function(test) {
	// 	var results = [];
	// 	// Setup and call functions
	// 	qExec(device, 'read', 'AIN0')(results)
	// 	.then(qExec(device, 'read', 'AIN0'))
	// 	.then(function(res) {
	// 		var expectedResult = [
	// 			{'functionCall': 'read', 'type': 'range', 'min': -11, 'max': 11},
	// 			{'functionCall': 'read', 'type': 'range', 'min': -11, 'max': 11}
	// 		];
	// 		utils.testResults(test, expectedResult, res);
	// 		test.done();
	// 	});
	// },
	'readFirmwareVersion': function(test) {
		var regs = [
			'FIRMWARE_VERSION',
			'BOOTLOADER_VERSION',
			'DEVICE_NAME_DEFAULT',
			'WIFI_VERSION'
		];
		var passes = true;
		var errorMessage = '';
		async.eachSeries(regs, function(reg, cb) {
			device.iRead(reg).then(
			function(res) {
				cb();
			}, function(err) {
				passes = false;
				errorMessage += 'Error reading: ' + reg + '\n';
				cb();
			});
		}, function(err) {
			test.ok(passes, errorMessage);
			test.done();
		});
	},
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