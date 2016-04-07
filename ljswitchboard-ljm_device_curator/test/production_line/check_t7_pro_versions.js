
var q = require('q');
var device_curator = require('../../lib/device_curator');
var utils = require('../utils/utils');
var qExec = utils.qExec;
var labjack_nodejs = require('labjack-nodejs');
var ljDevice = labjack_nodejs.getDeviceRef();
var ljm = labjack_nodejs.driver();
var modbus_map = require('ljswitchboard-modbus_map').getConstants();


var device;

var criticalError = false;
var stopTest = function(test, err) {
	test.ok(false, err);
	criticalError = true;
	test.done();
};

var deviceFound = false;
var performTests = true;

var firmware_links = require('../firmware_links');
var fws = firmware_links.firmwareLinks.T7;
var driver_const = require('ljswitchboard-ljm_driver_constants');
var device_events = driver_const.device_curator_constants;
var DEVICE_DISCONNECTED = device_events.DEVICE_DISCONNECTED;
var DEVICE_RECONNECTED = device_events.DEVICE_RECONNECTED;

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
		console.log('**** check_t7_pro_versions ****');
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
			'ct': 'LJM_ctUSB',
			'id': 'LJM_idANY'
		};
		// td.ct = 'LJM_ctWIFI';
		// td.id = 470010548;

		device.open(td.dt, td.ct, td.id)
		.then(function(res) {
			console.log(
				"  - Opened T7:",
				res.productType,
				res.connectionTypeName,
				res.serialNumber,
				parseFloat(res.FIRMWARE_VERSION.toFixed(4))
			);
			deviceFound = true;
			test.done();
		}, function(err) {
			console.log("  - Failed to open device", ljm.errToStrSync(err));
			performTests = false;
			test.ok(false, 'Failed to open device');
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
	'check wifi version': function(test) {
		device.iRead('WIFI_VERSION')
		.then(function(version) {
			console.log('  - WiFi FW Version:'.green, version.val);
			if(version.val == 3.12) {
				test.ok(true);
			} else {
				test.ok(false, 'WiFi version should be 3.12, it is: ' + version.toString());
			}
			test.done();
		}, function(err) {
			test.done();
		});
	},
	'check firmware version': function(test) {
		var fwVersionNum = 1.0188;
		device.iRead('FIRMWARE_VERSION')
		.then(function(fwVersion) {
			console.log('  - Recovery FW:'.green, fwVersion.val);
			if(fwVersion.val == fwVersionNum) {
				test.ok(true);
			} else {
				test.ok(false, 'T7 Firmware version should be 1.0188, it is: ' + fwVersion.str);
			}
			test.done();
		}, function(err) {
			test.ok(false, 'Failed to read FW version: ' + err.toString());
			test.done();
		});
	},
	'check recovery firmware version': function(test) {
		device.getRecoveryFirmwareVersion()
		.then(function(res) {
			console.log('  - Recovery FW:'.green, res);
			if(res == 0.6604) {
				test.ok(true);
			} else {
				test.ok(false, 'T7 Recovery FW should be 0.6604, it is: ' + res.toString());
			}
			test.done();
		}, function(err) {
			console.log('Error', err);
			test.ok(false, 'Failed to read the recovery FW version: ' + err.toString());
			test.done();
		});
	},
	'check t7 calibration': function(test) {
		device.getCalibrationStatus()
		.then(function(calStatus) {
			console.log('  - Cal Status:'.green, calStatus);
			var keys = Object.keys(calStatus);
			keys.forEach(function(key) {
				test.ok(calStatus[key], 'T7 Cal Check Failed: ' + key.toString());
			});
			test.done();
		}, function(err) {
			console.log('Error', err);
			test.ok(false, 'Failed to get the devices calibration status: ' + err.toString());
			test.done();
		});
	},
	'check for installed uSD card': function(test) {
		// console.log('HERE!!', device.savedAttributes);
		var uSDCardInstalled = device.savedAttributes.HARDWARE_INSTALLED.sdCard;
		console.log('  - HW Installed:'.green, {
			'sd': device.savedAttributes.HARDWARE_INSTALLED.sdCard,
			'rtc': device.savedAttributes.HARDWARE_INSTALLED.rtc,
			'wifi': device.savedAttributes.HARDWARE_INSTALLED.wifi,
			'hrADC': device.savedAttributes.HARDWARE_INSTALLED.highResADC,
		});
		if(device.savedAttributes.productType === 'T7-Pro') {
			if(uSDCardInstalled) {
				test.ok(true);
			} else {
				test.ok(false, 'There should be a uSD card installed in a T7-Pro');
				console.log('HW Installed'.red, device.savedAttributes.HARDWARE_INSTALLED);
			}
		}
		test.done();
	},
	'closeDevice': function(test) {
		// setTimeout(function() {
			device.close()
			.then(function() {
				test.done();
			}, function(err) {
				console.log("Failure");
				test.ok(false);
				test.done();
			});
		// }, 5000);
		
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