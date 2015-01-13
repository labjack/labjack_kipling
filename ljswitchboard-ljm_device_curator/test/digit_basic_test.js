
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
	'createDigitDevice': function(test) {
		console.log('');
		console.log('**** digit_basic_test ****');
		try {
			device = new device_curator.device();
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
			console.log(
				"  - Opened Digit:",
				res.productType,
				res.connectionTypeName,
				res.serialNumber
			);
			deviceFound = true;
			test.done();
		}, function(err) {
			performTests = false;
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
		var results = [];

		// Setup and call functions
		qExec(device, 'read', 'DGT_TEMPERATURE_LATEST_RAW')(results)
		.then(qExec(device, 'read', 'DGT_LIGHT_RAW'))
		.then(function(res) {
			// console.log('Results', res);
			var expectedResult = [
				{'functionCall': 'read', 'type': 'range', 'min': 0, 'max': 99999},
				{'functionCall': 'read', 'type': 'range', 'min': 0, 'max': 99999}
			];
			utils.testResults(test, expectedResult, res);
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

var tests = {};
var functionKeys = Object.keys(device_tests);
var getTest = function(testFunc, key) {
	var execTest = function(test) {
		// console.log("  > digit_basic_test - " + key);
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