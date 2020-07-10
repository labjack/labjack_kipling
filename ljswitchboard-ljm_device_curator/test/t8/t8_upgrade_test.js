
var q = require('q');
var device_curator = require('../../lib/device_curator');
var utils = require('../utils/utils');
var qExec = utils.qExec;
var ljm_ffi = require('@labjack/ljm-ffi');
var async = require('async');
var ljm = ljm_ffi.load();
var ljmb = require('@labjack/ljswitchboard-modbus_map');
var modbus_map = ljmb.getConstants();
var path = require('path');
var fs = require('fs');


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

var fwBasePath;
var fwFiles;
var fwFileA;
var fwFileB;
try {
	fwBasePath = path.join(process.cwd(), '..','..','k3-private-files','Firmware','T8');
	fwFiles = fs.readdirSync(fwBasePath);
	fwFileA = path.join(fwBasePath, fwFiles[0]);
	fwFileB = path.join(fwBasePath, fwFiles[1]);
} catch(err) {
	console.log('clone k3-private-files repo to same level as the pm repo.');
	criticalError = true;
}

var driver_const = require('@labjack/ljswitchboard-ljm_driver_constants');
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
		console.log('**** t8_upgrade_test ****');
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
			test.strictEqual(res.deviceType, 8);
			test.strictEqual(res.deviceTypeString, 'LJM_dtT8');
			test.done();
		}, function(err) {
			test.ok(false, 'Error calling getDeviceAttributes', err);
			test.done();
		});
	},
	'upgradeFirmware': function(test) {
		

		console.log('  - FW path:', fwFileA);

		var lastPercent = 0;
		var percentListener = function(value) {
			var defered = q.defer();
			console.log("  - ", value.toString() + '%');
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

		device.updateFirmware(fwFileA, percentListener, stepListener)
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
					test.strictEqual(res.toFixed(4), (0.9008).toFixed(4), 'Firmware Not Upgraded');
					test.done();
				}, function(err) {
					test.ok(false);
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
	'upgradeFirmware2': function(test) {
		

		console.log('  - FW path:', fwFileB);

		var lastPercent = 0;
		var percentListener = function(value) {
			var defered = q.defer();
			console.log("  - ", value.toString() + '%');
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

		device.updateFirmware(fwFileB, percentListener, stepListener)
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
					test.strictEqual(res.toFixed(4), (0.9009).toFixed(4), 'Firmware Not Upgraded');
					test.done();
				}, function(err) {
					test.ok(false);
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
	'upgradeFirmware3': function(test) {
		

		console.log('  - FW path:', fwFileA);

		var lastPercent = 0;
		var percentListener = function(value) {
			var defered = q.defer();
			console.log("  - ", value.toString() + '%');
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

		device.updateFirmware(fwFileA, percentListener, stepListener)
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
					test.strictEqual(res.toFixed(4), (0.9008).toFixed(4), 'Firmware Not Upgraded');
					test.done();
				}, function(err) {
					test.ok(false);
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