
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
		console.log('**** t7_upgrade_recovery_image ****');
		console.log('**** Please connect 1x T7 via USB ****');
		try {
			device = new device_curator.device();
		} catch(err) {
			stopTest(test, err);
		}
		done();
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
			done();
		}, function(err) {
			console.log("  - Failed to open device", ljm.errToStrSync(err));
			performTests = false;
			done();
		});
	},
	'checkDeviceInfo': function(test) {
		device.getDeviceAttributes()
		.then(function(res) {
			var keys = Object.keys(res);
			assert.strictEqual(res.deviceType, 7);
			assert.strictEqual(res.deviceTypeString, 'LJM_dtT7');
			done();
		});
	},
	'get wifi version': function(test) {
		device.iRead('WIFI_VERSION')
		.then(function(version) {
			console.log('  - WiFi FW Version:', version.val);
			done();
		}, function(err) {
			done();
		});
	},
	'upgradeFirmware': function(test) {
		var fwVersionNum = 0.6606;
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
						console.log('  - Currently Loaded Recovery FW', res);
						assert.strictEqual(
							parseFloat(res).toFixed(4),
							parseFloat(fwVersionNum).toFixed(4),
							'Firmware Not Upgraded');
						done();
					} catch(err) {
						console.log('Error', err);
						done();
					}
				}, function(err) {
					console.log('Error', err);
					done();
				});
			}, function(err) {
				console.log("Failed to upgrade (upgrade test)", err);
				console.log('');
				console.log('');
				assert.isOk(true, 'Failed to upgrade device: ' + JSON.stringify(err));
				device.read('FIRMWARE_VERSION')
				.then(function(res) {
					console.log('Device is still responding to messages', res);
					assert.isOk(false, 'Failed to Upgrade Device');
					done();
				}, function(err) {
					console.log('Device is not responding anymore', err);
					assert.isOk(false, 'Failed to Upgrade Device');
					done();
				});
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
					done();
				}, function(err) {
					console.log('Error', err);
					done();
				});
			}, function(err) {
				console.log('Error', err);
				done();
			});

		}, function(err) {
			done();
		});
	},
	'closeDevice': function(test) {
		// setTimeout(function() {
			device.close()
			.then(function() {
				done();
			}, function(err) {
				console.log("Failure");
				assert.isOk(false);
				done();
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
