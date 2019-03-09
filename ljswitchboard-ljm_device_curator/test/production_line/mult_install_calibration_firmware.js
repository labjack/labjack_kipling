
var q = require('q');
var async = require('async');
var device_curator = require('../../lib/device_curator');
var utils = require('../utils/utils');
var qExec = utils.qExec;
var ljn = require('labjack-nodejs');
var ljDevice = ljn.getDeviceRef();
var driver = ljn.driver();
var modbus_map = require('ljswitchboard-modbus_map').getConstants();

var ljm_ffi = require('ljm-ffi');
var ljm = ljm_ffi.load();


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

var devices = [];
var deviceSerials = [];

function createDeviceUpdater(test) {
	var fwVersionNum = 1.0255;
	this.performDeviceUpdate = function(device, upgradeIsFinished) {
		function pInfo() {
			var dataToPrint = [
				'  - ',
				device.savedAttributes.serialNumber,
			];
			for(var i = 0; i < arguments.length; i++) {
				dataToPrint.push(arguments[i]);
			}
			console.log.apply(console, dataToPrint);
		}
		function performUpdate() {
			var fwURL = fws[fwVersionNum.toFixed(4)];
			pInfo('  - fwURL:', fwURL);
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
				pInfo("  - " + value.toString());
				defered.resolve();
				return defered.promise;
			};
			var deviceDisconnectEventReceived = false;
			var deviceReconnectEventReceived = false;
			device.on(DEVICE_DISCONNECTED, function(data) {
				pInfo('  - Device disconnected');
				deviceDisconnectEventReceived = true;
			});
			device.on(DEVICE_RECONNECTED, function(data) {
				pInfo('  - Device reconnected');
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
						upgradeIsFinished();
					});
				}, function(err) {
					pInfo("Failed to upgrade (upgrade test)", err);
					pInfo('');
					pInfo('');
					test.ok(true, 'Failed to upgrade device: ' + JSON.stringify(err));
					device.read('FIRMWARE_VERSION')
					.then(function(res) {
						pInfo('Device is still responding to messages', device.savedAttributes.serialNumber, res);
						upgradeIsFinished();
					}, function(err) {
						pInfo('Device is not responding anymore', device.savedAttributes.serialNumber, err);
						upgradeIsFinished();
					});
				}
			);
		}
		device.iRead('FIRMWARE_VERSION')
		.then(function(res) {
			if(res.val != fwVersionNum) {
				try {
					performUpdate();
				} catch(err) {
					console.log('Error...', err);
				}
			} else {
				console.log('  - Skipping Primary FW Update T7:', device.savedAttributes.serialNumber,'already has fw:', res.val);
				test.ok(true);
				upgradeIsFinished();
			}
		});
	};
}

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
	'initialization': function(test) {
		console.log('');
		console.log('**** mult_upgrade_primary_firmware ****');
		test.done();
	},
	'list all devices...': function(test) {
		var foundDevices = driver.listAllSync('LJM_dtT7', 'LJM_ctUSB');
		console.log('We found devices!', foundDevices.length);
		deviceSerials = foundDevices.map(function(foundDevice) {
			return foundDevice.serialNumber;
		});
		test.done();
	},
	'open all T7s': function(test) {
		console.log('Opening Devices', deviceSerials);
		async.eachSeries(
			deviceSerials,
			function(deviceSerial, cb) {
				var newDevice = new device_curator.device();
				var td = {
					'dt': 'LJM_dtT7',
					'ct': 'LJM_ctUSB',
					'id': deviceSerial.toString(),
				};

				console.log('Opening Device', deviceSerial.toString());
				newDevice.open(td.dt, td.ct, td.id)
				.then(function(res) {
					console.log('Opened Device', newDevice.savedAttributes.serialNumber);
					devices.push(newDevice);
					cb();
				}, function(err) {
					console.log('Failed to open device', err);
					cb();
				});
			}, function(err) {
				test.done();
			});
	},
	'check for connected devices': function(test) {
		if(devices.length > 0) {
			test.done();
		} else {
			stopTest(test, new Error('Connect T7s via USB'));
		}
	},
	'print out device serial numbers': function(test) {
		async.eachSeries(
			devices,
			function(device, cb) {
				console.log('Opened...',
					device.savedAttributes.serialNumber,
					device.savedAttributes.FIRMWARE_VERSION,
					device.savedAttributes.WIFI_VERSION
				);
				cb();
			}, function(err) {
				test.done();
			});
	},
	'upgradeFirmware': function(test) {
		


		async.each(
			devices,
			function(device, cb) {
				console.log('Updating Device:', device.savedAttributes.serialNumber);
				var deviceUpdater = new createDeviceUpdater(test);
				deviceUpdater.performDeviceUpdate(device, cb);
			},
			function(err) {
				test.done();
			});
	},
	'Get FW Related Info': function(test) {
		function getDeviceInformation(device, cb) {
			var deviceInfo = {};
			device.iRead('FIRMWARE_VERSION').then(function(res) {
				deviceInfo['Firmware Version'] = res.val;
				device.getRecoveryFirmwareVersion()
				.then(function(res) {
					deviceInfo['Recovery Version'] = res;
					console.log('  - FW Version Info:',deviceInfo);
					cb();
				}, function(err) {
					console.log('Error', err);
					cb();
				});
			}, function(err) {
				cb();
			});
		}
		async.eachSeries(
			devices,
			getDeviceInformation,
			function(err) {
				test.done();
			});
	},
	'close T7s': function(test) {
		async.eachSeries(
			devices,
			function(device, cb) {
				device.close()
				.then(function(res) {
					console.log('Closed...', device.savedAttributes.serialNumber);
					cb();
				}, function(err) {
					cb();
				});
			}, function(err) {
				test.done();
			});
	},
	// 'closeDevice': function(test) {
	// 	// setTimeout(function() {
	// 		device.close()
	// 		.then(function() {
	// 			test.done();
	// 		}, function(err) {
	// 			console.log("Failure");
	// 			test.ok(false);
	// 			test.done();
	// 		});
	// 	// }, 5000);
		
	// },
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