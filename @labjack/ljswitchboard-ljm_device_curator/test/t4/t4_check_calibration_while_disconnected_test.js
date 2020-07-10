
var q = require('q');
var device_curator = require('../../lib/device_curator');
var utils = require('../utils/utils');
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
		console.log('**** t4_check_calibration_test ****');
		console.log('**** Please connect 1x T4 via USB ****');
		try {
			device = new device_curator.device();
		} catch(err) {
			stopTest(test, err);
		}
		test.done();
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
			test.done();
		}, function(err) {
			console.log('Failed to open device', err);
			performTests = false;
			test.done();
		});
	},
	'checkDeviceInfo': function(test) {
		device.getDeviceAttributes()
		.then(function(res) {
			var keys = Object.keys(res);

			test.strictEqual(res.deviceType, 4);
			test.strictEqual(res.deviceTypeString, 'LJM_dtT4');
			// test.ok(res.calibrationStatus.overall, 'Device Not Calibrated');
			// test.strictEqual(res.calibrationStatus.message, 'Device Calibration is Good');
			// test.strictEqual(res.calibrationStatus.shortMessage, 'Good');
			test.done();
		});
	},
	'check t4 calibration': function(test) {
		device.getCalibrationStatus()
		.then(function(calStatus) {
			console.log('  - Cal Status:'.green, calStatus);
			var keys = Object.keys(calStatus);
			keys.forEach(function(key) {
				test.ok(calStatus[key], 'T4 Cal Check Failed: ' + key.toString());
			});
			test.done();
		}, function(err) {
			console.log('Error', err);
			test.ok(false, 'Failed to get the devices calibration status: ' + err.toString());
			test.done();
		});
	},
	'open device in ljlogm': function(test) {
		var finishedCheckForHWIssues = false;
		var ljlogmFinished = false;
		function finishTest() {
			if(finishedCheckForHWIssues && ljlogmFinished) {
				console.log('  - Scan & LJLogM Finished'.green);
				test.done();
			} else {
				console.log(
					'  - Trying to finish step...'.yellow,
					'finishedCheckForHWIssues:',finishedCheckForHWIssues,
					'ljlogmFinished:',ljlogmFinished
				);
			}
		}
		setTimeout(function() {
            var startTime = new Date();
            console.log('  - Performing checkForHardwareIssues'.green, startTime);
            console.log('  - Exit LJLogM to continue test'.yellow);
			device.checkForHardwareIssues()
			.then(function(result) {
				test.ok(!result.overallResult, 'Disconnected & un-cached test should fail');
				finishedCheckForHWIssues = true;
				finishTest();
			}, function(err) {
				console.log('Scanning Error', err);
				test.ok(false, 'Reported a scan error');
				finishedCheckForHWIssues = true;
				finishTest();
			});
        },
        3000);
		device.openDeviceInLJLogM()
		.then(function() {
			test.ok(true, 'LJLogM Finished');
			ljlogmFinished = true;
			finishTest();
		}, function(err) {
			test.ok(false, 'Should not fail to open in LJLogM');
			console.log('ERROR', err);
			ljlogmFinished = true;
			finishTest();
		});
	},
	// 'run HW tests': function(test) {
	// 	device.checkForHardwareIssues()
	// 	.then(function(result) {
	// 		if(!result.overallResult) {
	// 			console.log('  - HW Issues Results'.red, result);
	// 		}
	// 		test.ok(result.overallResult, 'Device should pass');
			
	// 		test.done();
	// 	}, function(err) {
	// 		console.log('Error', err);
	// 		test.ok(false, 'Failed to get the devices calibration status: ' + err.toString());
	// 		test.done();
	// 	});
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
		// console.log("  > t4_basic_test - " + key);
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