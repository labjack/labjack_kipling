
var q = require('q');
var device_curator = require('../../lib/device_curator');
var utils = require('../utils/utils');
var qExec = utils.qExec;


var device;

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
		console.log('**** t4_check_calibration_test ****');
		console.log('**** Please connect 1x T4 via USB ****');
		try {
			device = new device_curator.device();
		} catch(err) {
			stopTest(test, err);
		}
		done();
	},
	'openDevice': function(test) {
		var td = {
			'dt': 'LJM_dtT4',
			'ct': 'LJM_ctUSB',
			'id': 'LJM_idANY'
		};

		device.open(td.dt, td.ct, td.id)
		.then(function(res) {
			if(DEBUG_TEST) {
				console.log(
					"  - Opened T4:",
					res.productType,
					res.connectionTypeName,
					res.serialNumber
				);
			}
			deviceFound = true;
			done();
		}, function(err) {
			console.log('Failed to open device', err);
			performTests = false;
			done();
		});
	},
	'checkDeviceInfo': function(test) {
		device.getDeviceAttributes()
		.then(function(res) {
			var keys = Object.keys(res);

			assert.strictEqual(res.deviceType, 4);
			assert.strictEqual(res.deviceTypeString, 'LJM_dtT4');
			// assert.isOk(res.calibrationStatus.overall, 'Device Not Calibrated');
			// assert.strictEqual(res.calibrationStatus.message, 'Device Calibration is Good');
			// assert.strictEqual(res.calibrationStatus.shortMessage, 'Good');
			done();
		});
	},
	'check t4 calibration': function(test) {
		device.getCalibrationStatus()
		.then(function(calStatus) {
			console.log('  - Cal Status:'.green, calStatus);
			var keys = Object.keys(calStatus);
			keys.forEach(function(key) {
				assert.isOk(calStatus[key], 'T4 Cal Check Failed: ' + key.toString());
			});
			done();
		}, function(err) {
			console.log('Error', err);
			assert.isOk(false, 'Failed to get the devices calibration status: ' + err.toString());
			done();
		});
	},
	'run HW tests': function(test) {
		device.checkForHardwareIssues()
		.then(function(result) {
			if(!result.overallResult) {
				console.log('  - HW Issues Results'.red, result);
			}
			assert.isOk(result.overallResult, 'Device should pass');

			done();
		}, function(err) {
			console.log('Error', err);
			assert.isOk(false, 'Failed to get the devices calibration status: ' + err.toString());
			done();
		});
	},
	'closeDevice': function(test) {
		device.close()
		.then(function() {
			done();
		});
	},
};

var tests = {};
var functionKeys = Object.keys(device_tests);
var getTest = function(testFunc, key) {
	var execTest = function(test) {
		// console.log("  > t4_basic_test - " + key);
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
