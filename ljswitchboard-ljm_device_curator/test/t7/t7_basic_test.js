
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
		console.log('**** t7_basic_test ****');
		console.log('**** Please connect 1x T7 via USB ****');
		try {
			device = new device_curator.device();
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
			'dt': 'LJM_dtT7',
			'ct': 'LJM_ctUSB',
			'id': 'LJM_idANY'
		};

		device.open(td.dt, td.ct, td.id)
		.then(function(res) {
			// console.log(
			// 	"  - Opened T7:",
			// 	res.productType,
			// 	res.connectionTypeName,
			// 	res.serialNumber
			// );
			// console.log('in t7_basic_test.js, openDevice', res);
			test.done();
		}, function(err) {
			console.log('Failed to open device', err);
			var info = modbus_map.getErrorInfo(err);
			console.log('Error Code', err);
			console.log('Error Name', info.string);
			console.log('Error Description', info.description);
			criticalError = true;
			device.destroy();
			test.done();
		});
	},
	'checkDeviceInfo': function(test) {
		device.getDeviceAttributes()
		.then(function(res) {
			var keys = Object.keys(res);

			test.strictEqual(res.deviceType, 7);
			test.strictEqual(res.deviceTypeString, 'LJM_dtT7');
			test.done();
		});
	},
	'performTestRead': function(test) {
		var results = [];
		// Setup and call functions
		qExec(device, 'read', 'AIN0')(results)
		.then(qExec(device, 'read', 'AIN0'))
		.then(function(res) {
			var expectedResult = [
				{'functionCall': 'read', 'type': 'range', 'min': -11, 'max': 11},
				{'functionCall': 'read', 'type': 'range', 'min': -11, 'max': 11}
			];
			utils.testResults(test, expectedResult, res);
			test.done();
		});
	},
	'performTestqRead': function(test) {
		var results = [];
		if(device.isMockDevice) {
			var dev = device.getDevice();
			dev.clearCalledFunctions();

			// Add expected results (force two 2358 failures)
			var i = 0;
			for(i = 0; i < 1; i ++) {
				dev.pushResult('read', true, 2358);
			}

			// Setup and call functions
			qExec(device, 'qRead', 'AIN0')(results)
			.then(qExec(device, 'read', 'AIN0'))
			.then(function(res) {
				var expectedResult = [
					{'functionCall': 'qRead', 'retData': 0},
					{'functionCall': 'read', 'retData': 0}
				];
				var msg = 'mock device not working (read)';
				test.deepEqual(res, expectedResult, msg);

				msg = 'message re-try scheme failed';
				var functionList = dev.getCalledFunctions();
				test.strictEqual(functionList.length, 3, msg);
				test.done();
			});
		} else {
			test.done();
		}
	},
	'performTestReadMultiple': function(test) {
		var results = [];
		qExec(device, 'readMultiple', ['AIN0','AIN0'])(results)
		.then(function(res) {
			var expectedResults = [
				{
					'functionCall': 'readMultiple',
					'retData': [
						{'address': 'AIN0', 'isErr': false, 'type': 'range', 'min': -11, 'max': 11},
						{'address': 'AIN0', 'isErr': false, 'type': 'range', 'min': -11, 'max': 11}
					]
				}
			];
			utils.testResultsArray(test, expectedResults, res);
			test.done();
		});
	},
	'performTest iRead': function(test) {
		var results = [];
		qExec(device, 'iRead', 'AIN0')(results)
		.then(function(res) {
			var expectedResults = [
				{
					'functionCall': 'iRead',
					'type': 'range',
					'min': -11,
					'max': 11
				}
			];
			utils.testResults(test, expectedResults, res, 'res');
			test.done();
		});
	},
	'performTest iReadMany': function(test) {
		var results = [];
		var addresses = ['AIN0','AIN0'];
		qExec(device, 'iReadMany', addresses)(results)
		.then(function(res) {
			var expectedResults = [
				{
					'functionCall': 'iReadMany',
					'retData': [
						{'address': 'AIN0', 'isErr': false, 'type': 'range', 'min': -11, 'max': 11},
						{'address': 'AIN0', 'isErr': false, 'type': 'range', 'min': -11, 'max': 11}
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
			test.done();
		});
	},
	'performTest iReadMultiple': function(test) {
		var results = [];
		qExec(device, 'iReadMultiple', ['AIN0','AIN0'])(results)
		.then(function(res) {
			var expectedResults = [
				{
					'functionCall': 'iReadMultiple',
					'retData': [
						{'address': 'AIN0', 'isErr': false, 'type': 'range', 'min': -11, 'max': 11},
						{'address': 'AIN0', 'isErr': false, 'type': 'range', 'min': -11, 'max': 11}
					]
				}
			];
			utils.testResultsArray(test, expectedResults, res, 'res');
			test.done();
		});
	},
	'call iReadMultiple': function(test) {
		device.iReadMultiple(['AIN0', 'ETHERNET_IP'])
		.then(function(res) {
			// console.log('iReadMultiple res', res);
			test.done();
		});
	},
	'call iWrite': function(test) {
		device.iWrite('DAC0', 1.0)
		.then(function(res) {
			// console.log('iWrite res', res);
			test.done();
		});
	},
	'call iWriteMultiple': function(test) {
		device.iWriteMultiple(['DAC0', 'DAC1'], [1.0, 1.0])
		.then(function(res) {
			// console.log('iWriteMultiple res', res);
			test.done();
		});
	},
	'call iWriteMany': function(test) {
		device.iWriteMany(['DAC0', 'DAC1'], [1.0, 1.0])
		.then(function(res) {
			// console.log('iWriteMany res', res);
			test.done();
		});
	},
	// 'upgradeFirmware': function(test) {
	// 	var fwURL = 'https://labjack.com/sites/default/files/2014/12/T7firmware_010135_2014-11-24.bin';
	// 	device.updateFirmware(fwURL)
	// 	.then(
	// 		function(res) {
	// 			// The result is a new device object
	// 			console.log("Finished Upgrading!");
	// 			test.done();
	// 		}, function(err) {
	// 			console.log("Failed to upgrade", err);
	// 			test.done();
	// 		}
	// 	);
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

exports.tests = device_tests;
