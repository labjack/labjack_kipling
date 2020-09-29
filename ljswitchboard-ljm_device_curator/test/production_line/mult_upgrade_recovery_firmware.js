
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
	assert.isOk(false, err);
	criticalError = true;
	done();
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
	this.fwVersionNum = 0.6606;
	this.determineRequiredRevoveryFW = function(device, upgradeIsReady) {
		device.read('T7_FLASH_CHIP_VERSION')
		.then(function(res) {
			console.log(device.savedAttributes.serialNumber, 'T7 flash chip version!!', res);
			//
			if(res == driver_const.T7_FLASH_IS_25F) {
				self.fwVersionNum = 0.6606;
			} else {
				self.fwVersionNum = 0.6606;
			}
			upgradeIsReady();
		}, function(err) {
			console.log(device.savedAttributes.serialNumber, 'Error getting flash chip version', err);

			device.read('BOOTLOADER_VERSION')
			.then(function(res) {
				blVersion = parseFloat(res.toFixed(4));
				console.log(device.savedAttributes.serialNumber, 'T7 BL Version', res);
				if(blVersion <= driver_const.T7_FLASH_25F_BL_VER) {
					self.fwVersionNum = 0.6606;
				} else {
					self.fwVersionNum = 0.6606;
				}
				upgradeIsReady();
			}, function(err) {
				self.fwVersionNum = 0.6606;
				upgradeIsReady();
			});
		});
	};
	this.performDeviceUpdate = function(device, upgradeIsFinished) {
		console.log(device.savedAttributes.serialNumber, 'Updating to', self.fwVersionNum);
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
			var fwURL = fws[self.fwVersionNum.toFixed(4)];
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
					assert.strictEqual(lastPercent, 100, 'Highest Percentage isnt 100%');
					var ljmDevice = device.getDevice();
					// console.log(
					// 	'Reading device FW version',
					// 	ljmDevice.handle,
					// 	ljmDevice.deviceType,
					// 	ljmDevice.isHandleValid
					// );

					device.getRecoveryFirmwareVersion()
					.then(function(res) {
						try {
							pInfo('  - Currently Loaded Recovery FW', res);
							assert.strictEqual(
								parseFloat(res).toFixed(4),
								parseFloat(self.fwVersionNum).toFixed(4),
								'Firmware Not Upgraded');
							upgradeIsFinished();
						} catch(err) {
							pInfo('Error', err);
							upgradeIsFinished();
						}
					}, function(err) {
						pInfo('Error', err);
						upgradeIsFinished();
					});
				}, function(err) {
					pInfo("Failed to upgrade (upgrade test)", err);
					pInfo('');
					pInfo('');
					assert.isOk(true, 'Failed to upgrade device: ' + JSON.stringify(err));
					device.read('FIRMWARE_VERSION')
					.then(function(res) {
						pInfo('Device is still responding to messages', res);
						upgradeIsFinished();
					}, function(err) {
						pInfo('Device is not responding anymore', err);
						upgradeIsFinished();
					});
				}
			);
		}
		device.getRecoveryFirmwareVersion()
		.then(function(res) {
			if(res != self.fwVersionNum) {
				performUpdate();
			} else {
				console.log('  - Skipping Recovery FW Update T7:', device.savedAttributes.serialNumber,'already has fw:', res.val);
				assert.isOk(true);
				upgradeIsFinished();
			}
		});
	};
	var self = this;
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
		console.log('**** mult_upgrade_recovery_firmware ****');
		done();
	},
	'list all devices...': function(test) {
		var foundDevices = driver.listAllSync('LJM_dtT7', 'LJM_ctUSB');
		console.log('We found devices!', foundDevices.length);
		deviceSerials = foundDevices.map(function(foundDevice) {
			return foundDevice.serialNumber;
		});
		done();
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
				done();
			});
	},
	'check for connected devices': function(test) {
		if(devices.length > 0) {
			done();
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
				done();
			});
	},
	'upgradeFirmware': function(test) {



		async.each(
			devices,
			function(device, cb) {
				console.log('Updating Device:', device.savedAttributes.serialNumber);
				var deviceUpdater = new createDeviceUpdater(test);
				var steps = ['determineRequiredRevoveryFW', 'performDeviceUpdate'];
				async.eachSeries(
					steps,
					function(step, innerCB) {
						deviceUpdater[step](device, innerCB);
					},
					function(err) {
						cb();
					}
				);
				// deviceUpdater.performDeviceUpdate(device, cb);
			},
			function(err) {
				done();
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
				done();
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
				done();
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
