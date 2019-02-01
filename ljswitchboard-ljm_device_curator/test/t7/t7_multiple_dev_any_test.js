
var q = require('q');
var device_curator = require('../../lib/device_curator');
var utils = require('../utils/utils');
var qExec = utils.qExec;
var ljm_ffi = require('ljm-ffi');
var ljm = ljm_ffi.load();
var ljmb = require('ljswitchboard-modbus_map');
var modbus_map = ljmb.getConstants();
var driver_const = require('ljswitchboard-ljm_driver_constants');

var deviceA;
var deviceB;
var devices;

var capturedEvents = [];

var criticalError = false;

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
		console.log('**** t7_multiple_dev_any_test ****');
		console.log('**** Please connect 2x T7 via USB ****');
		try {
			deviceA = new device_curator.device();
			deviceB = new device_curator.device();
			devices = {
				'0': deviceA,
				'1': deviceB
			}
		} catch(err) {
			test.ok(false, err);
			criticalError = true;
			test.done();
			return;
		}
		test.done();
	},
	'close all open devices': function(test) {
		ljm.LJM_CloseAll();
		test.done();
	},
	'openDevice': function(test) {
		var td = {
			'dt': 'LJM_dtANY',
			'ct': 'LJM_ctANY',
			'id': 'LJM_idANY'
		};

		deviceA.open(td.dt, td.ct, td.id, devices)
		.then(function(res) {
			console.log(
				"  - Opened T7:",
				res.productType,
				res.connectionTypeName,
				res.serialNumber
			);
			// console.log('in t7_basic_test.js, openDevice', res);
			test.done();
		}, function(err) {
			console.log('Failed to open device', err);
			var info = modbus_map.getErrorInfo(err);
			console.log('Error Code', err);
			console.log('Error Name', info.string);
			console.log('Error Description', info.description);
			criticalError = true;
			deviceA.destroy();
			test.done();
		});
	},
	'checkDeviceInfo': function(test) {
		deviceA.getDeviceAttributes()
		.then(function(res) {
			var keys = Object.keys(res);

			test.strictEqual(res.deviceType, 7);
			test.strictEqual(res.deviceTypeString, 'LJM_dtT7');
			test.done();
		});
	},

	'openDeviceB': function(test) {
		var td = {
			'dt': 'LJM_dtANY',
			'ct': 'LJM_ctANY',
			'id': 'LJM_idANY'
		};

		deviceB.open(td.dt, td.ct, td.id, devices)
		.then(function(res) {
			// console.log(
			// 	"  - Opened T7:",
			// 	res.productType,
			// 	res.connectionTypeName,
			// 	res.serialNumber
			// );
			// console.log('in t7_basic_test.js, openDevice', res);
			test.ok(false, 'Should have received an error opening 2nd "ANY","A","A" device');
			test.done();
		}, function(err) {
			var keys = Object.keys(err);
			if(keys.length > 0) {
				test.ok(true);
				var dt = err.deviceInfo.deviceTypeName;
				var ct = err.deviceInfo.connectionTypeName;
				var sn = err.deviceInfo.serialNumber;
				var str = '  - Prevented open of: ';
				str += dt + '[??] '
				str += ct + ' ' + sn.toString();
				console.log(str)
			} else {
				test.ok(false, 'Error should contain several keys...');
				console.log('Failed to open device', err);
				var info = modbus_map.getErrorInfo(err);
				console.log('Error Code', err);
				console.log('Error Name', info.string);
				console.log('Error Description', info.description);
				criticalError = true;
				deviceB.destroy();
			}
			test.done();
		});
	},
	'closeDevice': function(test) {
		deviceA.close()
		.then(function() {
			test.done();
		});
	},

	'closeDeviceB': function(test) {
		deviceB.close()
		.then(function() {
			test.ok(false, 'Device should never have been opened.');
			test.done();
		}, function(err) {
			// This close command should fail b/c the device was never opened.
			test.equal(err, 'Device Never Opened', 'Wrong error message');
			test.ok(true);
			test.done();
		});
	},
	'parallelOpen2x': function(test) {
		var td = {
			'dt': 'LJM_dtANY',
			'ct': 'LJM_ctANY',
			'id': 'LJM_idANY'
		};

		var openSuccesses = [];
		var openErrors = [];
		function finalizeTest() {
			if(openSuccesses.length + openErrors.length == 2) {
				// console.log('Finished opening...', openSuccesses, openErrors);
				test.equal(openSuccesses.length, 1, 'We received the wrong number of successful opens');
				test.equal(openErrors.length, 1, 'We received the wrong number of error-ful opens');
				test.done();
			}
		}
		function onSuccess(res) {
			openSuccesses.push(res);
			finalizeTest();
		}
		function onError(err) {
			openErrors.push(err);
			finalizeTest();
		}
		deviceA.open(td.dt, td.ct, td.id, devices)
		.then(onSuccess, onError);
		
		deviceB.open(td.dt, td.ct, td.id, devices)
		.then(onSuccess, onError);
	},

	'close all devicesA': function(test) {
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

exports.tests = device_tests;
