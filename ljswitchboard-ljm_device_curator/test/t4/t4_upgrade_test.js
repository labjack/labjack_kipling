
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
var fws = firmware_links.firmwareLinks.T4;
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
		console.log('**** t4_upgrade_test ****');
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
			console.log(
				"  - Opened T4:",
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
			test.done();
		});
	},
	'checkDeviceInfo': function(test) {
		device.getDeviceAttributes()
		.then(function(res) {
			var keys = Object.keys(res);
			test.strictEqual(res.deviceType, 4);
			test.strictEqual(res.deviceTypeString, 'LJM_dtT4');
			test.done();
		});
	},
	'upgradeFirmware': function(test) {
		var fwVersionNum = 1.0023;
		var fwURL = fws[fwVersionNum.toFixed(4)];
		console.log('  - fwURL:', fwURL);
		var lastPercent = 0;
		var percentListener = function(value) {
			var defered = q.defer();
			// console.log("  - ", value.toString() + '%');
			lastPercent = value;
			defered.resolve();
			return defered.promise;
		};
		var stepListener = function(value) {
			var defered = q.defer();
			console.log("  - " + value.toString());
			defered.resolve();
			return defered.promise;
		};
		var deviceDisconnectEventReceived = false;
		var deviceReconnectEventReceived = false;
		device.on(DEVICE_DISCONNECTED, function(data) {
			console.log('  - Device disconnected');
			deviceDisconnectEventReceived = true;
		});
		device.on(DEVICE_RECONNECTED, function(data) {
			console.log('  - Device reconnected');
			deviceReconnectEventReceived = true;
		});

		device.updateFirmware(fwURL, percentListener, stepListener)
		.then(
			function(res) {
				// The result is a new device object
				// console.log('Upgrade Success', res);
				// console.log('Number of created devices', ljDevice.getNumCreatedDevices());
				test.strictEqual(lastPercent, 100, 'Highest Percentage isnt 100%');
				var ljmDevice = device.getDevice();
				// console.log(
				// 	'Reading device FW version',
				// 	ljmDevice.handle,
				// 	ljmDevice.deviceType,
				// 	ljmDevice.isHandleValid
				// );

				// Make sure that the device disconnect & reconnect events get
				// fired.
				test.ok(deviceDisconnectEventReceived, 'Disconnect event should have been detected');
				test.ok(deviceReconnectEventReceived, 'Reconnect event should have been detected');
				device.read('FIRMWARE_VERSION')
				.then(function(res) {
					test.strictEqual(res.toFixed(4), fwVersionNum.toFixed(4), 'Firmware Not Upgraded');
					test.done();
				});
			}, function(err) {
				console.log("Failed to upgrade (upgrade test)", err);
				console.log('');
				console.log('');
				test.ok(true, 'Failed to upgrade device: ' + JSON.stringify(err));
				device.read('FIRMWARE_VERSION')
				.then(function(res) {
					console.log('Device is still responding to messages', res);
					test.ok(false, 'Failed to Upgrade Device');
					test.done();
				}, function(err) {
					console.log('Device is not responding anymore', err);
					test.ok(false, 'Failed to Upgrade Device');
					test.done();
				});
			}
		);
	},
	'Get FW Related Info': function(test) {
		var deviceInfo = {};
		device.iRead('FIRMWARE_VERSION').then(function(res) {
			deviceInfo['Firmware Version'] = res.val;
			device.getRecoveryFirmwareVersion()
			.then(function(res) {
				deviceInfo['Recovery Version'] = res;
				console.log('  - FW Version Info:',deviceInfo);
				test.done();
			}, function(err) {
				console.log('Error', err);
				test.done();
			});
		}, function(err) {
			test.done();
		});
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