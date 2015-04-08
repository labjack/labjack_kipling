
var q = require('q');
var device_curator = require('../lib/device_curator');
var utils = require('./utils/utils');
var qExec = utils.qExec;


var device;

var criticalError = false;
var stopTest = function(test, err) {
	test.ok(false, err);
	criticalError = true;
	test.done();
};

deviceFound = false;

exports.tests = {
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
		console.log('**** mock_device_test ****');
		try {
			device = new device_curator.device(true);
		} catch(err) {
			stopTest(test, err);
		}
		test.done();
	},
	'openDevice': function(test) {
		var td = {
			'dt': 'LJM_dtANY',
			'ct': 'LJM_ctANY',
			'id': 'LJM_idANY'
		};

		device.open(td.dt, td.ct, td.id)
		.then(function(res) {
			deviceFound = true;
			test.done();
		}, function(err) {
			test.done();
		});
	},
	'checkDeviceInfo': function(test) {
		device.getDeviceAttributes()
		.then(function(res) {
			var keys = Object.keys(res);

			test.strictEqual(res.deviceType, 7);
			test.strictEqual(res.deviceTypeString, 'LJM_dtT7');
			test.strictEqual(res.connectionType, 1);
			test.strictEqual(res.connectionTypeString, 'LJM_ctUSB');
			test.done();
		});
	},
	'perform test write': function(test) {
		var testVal = 1;
		device.read('DAC0')
		.then(function(initialRes) {
			test.strictEqual(initialRes, 0);
			device.write('DAC0', testVal)
			.then(function(res) {
				device.read('DAC0')
				.then(function(res) {
					test.strictEqual(res, testVal);
					test.done();
				});
			});
		});
	},
	'performTest Read': function(test) {
		if(device.isMockDevice) {
			var dev = device.getDevice();
			dev.clearCalledFunctions();

			// Add expected results
			dev.pushResult('read', false, 'testData');
			dev.pushResult('read', false, 0);

			// Setup and call functions
			var results = [];
			qExec(device, 'read', 'AIN0')(results)
			.then(qExec(device, 'read', 'AIN0'))
			.then(function(res) {
				var expectedResult = [
					{'functionCall': 'read', 'retData': 'testData'},
					{'functionCall': 'read', 'retData': 0}
				];
				var msg = 'mock device not working (read)';
				test.deepEqual(expectedResult, res, msg);
				test.done();
			});
		} else {
			test.done();
		}
	},
	'performTest AnalogRead': function(test) {
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
	'performTest qRead': function(test) {
		if(device.isMockDevice) {
			var dev = device.getDevice();
			dev.clearCalledFunctions();

			// Add expected results (force two 2358 failures)
			var i = 0;
			for(i = 0; i < 1; i ++) {
				dev.pushResult('read', true, 2358);
			}
			dev.pushResult('read', false, 0);
			dev.pushResult('read', false, 0);

			// Setup and call functions
			var results = [];
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
			console.log("* Skipping Test");
			test.done();
		}
	},
	'performTest ReadMultiple': function(test) {
		if(device.isMockDevice) {
			var dev = device.getDevice();
			dev.clearCalledFunctions();

			// Add expected results (force one 2358 failures)
			var i = 0;
			for(i = 0; i < 1; i ++) {
				dev.pushResult('read', true, 2358);
			}
			dev.pushResult('read', false, 0);
			dev.pushResult('read', false, 0);

			var results = [];
			qExec(device, 'readMultiple', ['AIN0','AIN0'])(results)
			.then(function(res) {
				var expectedRes = [
					{
						'functionCall': 'readMultiple',
						'retData': [
							{'address': 'AIN0', 'isErr': false, 'data': 0},
							{'address': 'AIN0', 'isErr': false, 'data': 0}
						]
					}
				];
				var msg = 'mock readMultiple failed';
				test.deepEqual(res, expectedRes, msg);
				// console.log("readMultiple res", res[0].retData);
				// console.log("readMultiple funcs", dev.getCalledFunctions());
				
				var functionList = dev.getCalledFunctions();
				msg = 'did not call proper functions';
				test.strictEqual(functionList.length, 3, msg);
				test.done();
			});
		} else {
			console.log("* Skipping Test");
			test.done();
		}
	},
	'closeDevice': function(test) {
		device.close()
		.then(function() {
			test.done();
		});
	},
	'openDevice (assigned serial number)': function(test) {
		var td = {
			'dt': 'LJM_dtT7',
			'ct': 'LJM_ctANY',
			'id': 470010548
		};

		device.open(td.dt, td.ct, td.id)
		.then(function(res) {
			deviceFound = true;
			test.done();
		}, function(err) {
			test.done();
		});
	},
	'checkDeviceInfo (assigned serial number)': function(test) {
		device.getDeviceAttributes()
		.then(function(res) {
			var keys = Object.keys(res);
			test.strictEqual(res.deviceType, 7);
			test.strictEqual(res.deviceTypeString, 'LJM_dtT7');
			test.strictEqual(res.connectionType, 1);
			test.strictEqual(res.connectionTypeString, 'LJM_ctUSB');
			test.strictEqual(res.serialNumber, 470010548);
			test.done();
		});
	},
	'closeDevice (assigned serial number)': function(test) {
		device.close()
		.then(function() {
			test.done();
		});
	},
	'createDigitDevice': function(test) {
		try {
			device = new device_curator.device(true);
		} catch(err) {
			stopTest(test, err);
		}
		test.done();
	},
	'openDigit': function(test) {
		var td = {
			'dt': 'LJM_dtDIGIT',
			'ct': 'LJM_ctUSB',
			'id': 'LJM_idANY'
		};

		device.open(td.dt, td.ct, td.id)
		.then(function(res) {
			deviceFound = true;
			test.done();
		}, function(err) {
			test.done();
		});
	},
	'checkDigitDeviceInfo': function(test) {
		device.getDeviceAttributes()
		.then(function(res) {
			test.strictEqual(res.deviceType, 200);
			test.strictEqual(res.deviceTypeString, 'LJM_dtDIGIT');
			test.strictEqual(res.connectionType, 1);
			test.strictEqual(res.connectionTypeString, 'LJM_ctUSB');
			test.done();
		});
	},
	'readTemp': function(test) {
		var dev = device.getDevice();
		dev.clearCalledFunctions();

		var results = [];
		qExec(device, 'digitRead', 'DGT_HUMIDITY_RAW')(results)
		.then(qExec(device, 'digitRead', 'DGT_HUMIDITY_RAW'))
		.then(qExec(device, 'updateFirmware', 'testURL'))
		.then(function(res) {
			var expectedResult = [
				{'functionCall': 'digitRead', 'retData': 0},
				{'functionCall': 'digitRead', 'retData': 0},
				{
					'functionCall': 'updateFirmware', 
					'errData': 'Function not supported for deviceType: 200'
				},
			];
			var msg = 'mock device not working (digitRead)';
			test.deepEqual(res, expectedResult, msg);
			test.done();
		});
	},
	'closeDigit': function(test) {
		device.close()
		.then(function() {
			test.done();
		});
	},
};