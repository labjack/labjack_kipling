
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
		console.log('**** t7_basic_test ****');
		try {
			device = new device_curator.device();
		} catch(err) {
			stopTest(test, err);
		}
		test.done();
	},
	'openDevice': function(test) {
		var td = {
			'dt': 'LJM_dtT7',
			'ct': 'LJM_ctANY',
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
			test.done();
		}, function(err) {
			performTests = false;
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
	// 'upgradeFirmware': function(test) {
	// 	var fwURL = 'http://labjack.com/sites/default/files/2014/12/T7firmware_010135_2014-11-24.bin';
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