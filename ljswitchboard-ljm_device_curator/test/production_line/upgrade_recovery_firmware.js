
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

function createDeviceUpdater(test) {
	this.fwVersionNum = 0.6606;
	this.determineRequiredRevoveryFW = function(device, upgradeIsReady) {
		device.read('T7_FLASH_CHIP_VERSION')
		.then(function(res) {
			console.log('T7 flash chip version!!', res);
			//
			if(res == driver_const.T7_FLASH_IS_25F) {
				self.fwVersionNum = 0.6604;
			} else {
				self.fwVersionNum = 0.6606;
			}
			upgradeIsReady();
		}, function(err) {
			console.log('Error getting flash chip version', err);
			
			device.read('BOOTLOADER_VERSION')
			.then(function(res) {
				blVersion = parseFloat(res.toFixed(4));
				console.log('T7 BL Version', res);
				if(blVersion == driver_const.T7_FLASH_25F_BL_VER) {
					self.fwVersionNum = 0.6604;
				} else {
					self.fwVersionNum = 0.6606;
				}
				upgradeIsReady();
			}, function(err) {
				self.fwVersionNum = 0.6604;
				upgradeIsReady();
			});
		});
	};
	this.performDeviceUpdate = function(device, upgradeIsFinished) {
		console.log('Updating to', self.fwVersionNum);
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
					test.strictEqual(lastPercent, 100, 'Highest Percentage isnt 100%');
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
							test.strictEqual(
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
					test.ok(true, 'Failed to upgrade device: ' + JSON.stringify(err));
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
				test.ok(true);
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
	'createDevice': function(test) {
		console.log('');
		console.log('**** upgrade_recovery_firmware ****');
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
	'get wifi version': function(test) {
		device.iRead('WIFI_VERSION')
		.then(function(version) {
			console.log('  - WiFi FW Version:', version.val);
			test.done();
		}, function(err) {
			test.done();
		});
	},
	'upgradeFirmware': function(test) {
		console.log('Updating Device:', device.savedAttributes.serialNumber);
		var deviceUpdater = new createDeviceUpdater(test);
		var steps = ['determineRequiredRevoveryFW', 'performDeviceUpdate'];
		async.eachSeries(
			steps,
			function(step, innerCB) {
				deviceUpdater[step](device, innerCB);
			},
			function(err) {
				test.done();
			}
		);
	},
	'Get FW Related Info': function(test) {
		var deviceInfo = {};
		device.iRead('FIRMWARE_VERSION').then(function(res) {
			deviceInfo['Firmware Version'] = res.val;
			device.getPrimaryFirmwareVersion()
			.then(function(res) {
				deviceInfo['Primary Version'] = res;
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