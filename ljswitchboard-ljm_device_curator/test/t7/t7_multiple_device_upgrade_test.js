
var q = require('q');
var device_curator = require('../lib/device_curator');
var utils = require('./utils/utils');
var qExec = utils.qExec;


var deviceA;
var device_A_Attributes;
var deviceB;
var device_B_Attributes;

var criticalError = false;
var stopTest = function(test, err) {
	assert.isOk(false, err);
	criticalError = true;
	done();
};

var deviceAInfo = {
	'serialNumber': 47001000,
	'DEVICE_NAME_DEFAULT': 'My Test DeviceA',
	'HARDWARE_INSTALLED': 15,
	'ipAddress': '192.168.1.101',
	'ETHERNET_IP': '192.168.1.101',
};
var deviceBInfo = {
	'serialNumber': 47001001,
	'DEVICE_NAME_DEFAULT': 'My Test DeviceB',
	'HARDWARE_INSTALLED': 15,
	'ipAddress': '192.168.1.101',
	'ETHERNET_IP': '192.168.1.101',
};
var infoMapping = {
	'SERIAL_NUMBER': 'serialNumber',
};
var appropriateResultMap = {
	// 'ETHERNET_IP': 'str',
	// 'WIFI_IP': 'str',
	// 'SERIAL_NUMBER': 'res',
};
deviceFound = false;

var firmware_links = require('./firmware_links');
var fws = firmware_links.firmwareLinks.T7;

var driver_const = require('ljswitchboard-ljm_driver_constants');
var device_events = driver_const.device_curator_constants;
var DEVICE_DISCONNECTED = device_events.DEVICE_DISCONNECTED;
var DEVICE_RECONNECTED = device_events.DEVICE_RECONNECTED;

function createDeviceUpgrader(device, firmwareInfo, test) {
	this.sn = device.savedAttributes.serialNumber;
	this.device = device;
	this.firmwareInfo = firmwareInfo;

	this.deviceDisconnectEventReceived = false;
	this.deviceReconnectEventReceived = false;
	device.on(DEVICE_DISCONNECTED, function(data) {
		console.log('  - Device disconnected', self.sn);
		self.deviceDisconnectEventReceived = true;
	});
	device.on(DEVICE_RECONNECTED, function(data) {
		console.log('  - Device reconnected', self.sn);
		self.deviceReconnectEventReceived = true;
	});
	this.percentListener = function(percent) {
		var defered = q.defer();
		// console.log('  - Percent Listener', self.sn, percent);
		defered.resolve();
		return defered.promise;
	};
	this.stepListener = function(step) {
		var defered = q.defer();
		console.log('  - Current Step:', self.sn, step);
		defered.resolve();
		return defered.promise;
	};
	this.upgradeDevice = function() {
		var defered = q.defer();
		self.device.updateFirmware(
			self.firmwareInfo.path,
			self.percentListener,
			self.stepListener
		).then(function(res) {
			console.log('  - Upgrade finished', self.sn);
			// console.log('  - Upgrade result', res);
			// Make sure that the device disconnect & reconnect events get
			// fired.
			assert.isOk(
				self.deviceDisconnectEventReceived,
				'Disconnect event should have been detected'
			);
			assert.isOk(
				self.deviceReconnectEventReceived,
				'Reconnect event should have been detected'
			);
			defered.resolve();
		}, function(err) {
			console.log('  ! Upgrade failed', self.sn, err);
			defered.resolve();
		});
		return defered.promise;
	};
	this.startUpgrade = function() {
		return self.upgradeDevice();
	};
	var self = this;
}
var upgradeDevices = function(devices, firmwareInfo, test) {
	var defered = q.defer();
	var promises = [];
	devices.forEach(function(device) {
		var deviceUpgrader = new createDeviceUpgrader(device, firmwareInfo, test);
		promises.push(deviceUpgrader.startUpgrade());
	});
	q.allSettled(promises)
	.then(function() {
		defered.resolve();
	});
	return defered.promise;
};
exports.tests = {
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
		console.log('**** multiple_mock_device_upgrade_test ****');
		try {
			deviceA = new device_curator.device();
			deviceB = new device_curator.device();
		} catch(err) {
			stopTest(test, err);
		}
		done();
	},
	'openDevice - ctUSB deviceA': function(test) {
		var td = {
			'dt': 'LJM_dtT7',
			'ct': 'LJM_ctUSB',
			// 'id': 'LJM_idANY'
			'id': 470010533,
		};

		deviceA.open(td.dt, td.ct, td.id)
		.then(function(resA) {
			console.log('Opened DeviceA', resA.serialNumber);
			device_A_Attributes = resA;
			done();
		}, function(err) {
			done();
		});
	},
	'delay opening of second device': function(test) {
		setTimeout(function() {
			done();
		}, 2000);
	},
	'openDevice - ctUSB deviceB': function(test) {
		var td = {
			'dt': 'LJM_dtT7',
			'ct': 'LJM_ctUSB',
			// 'id': 'LJM_idANY'
			'id': 470010108,
		};

		deviceB.open(td.dt, td.ct, td.id)
		.then(function(resB) {
			console.log('Opened DeviceB', resB.serialNumber);
			device_B_Attributes = resB;
			if(device_A_Attributes.serialNumber === device_B_Attributes.serialNumber) {
				console.log('Opened the same device...');
				stopTest(test, 'Failed to open two devices');
			} else {
				done();
			}
		}, function(err) {
			done();
		});
	},
	// 'delay upgrade': function(test) {
	// 	setTimeout(function() {
	// 		done();
	// 	}, 5000);
	// },
	'upgrade devices': function(test) {
		var fwVersionNum = 1.0146;
		var fwURL = fws[fwVersionNum.toFixed(4)];
		var firmwareInfo = {
			'path': fwURL,
			'version': fwVersionNum,
		};
		var devices = [deviceA, deviceB];
		upgradeDevices(devices, firmwareInfo, test)
		.then(function() {
			console.log('  - Devices Upgraded');
			done();
		}, function() {
			console.log('  ! Devices failed to upgrade');
			assert.isOk(false);
			done();
		});
	},
	// 'upgradeFirmware': function(test) {
	// 	var fwVersionNum = 1.0070;
	// 	var fwURL = fws[fwVersionNum.toFixed(4)];
	// 	var lastPercent = 0;
	// 	var percentListener = function(value) {
	// 		var defered = q.defer();
	// 		// console.log("  - ", value.toString() + '%');
	// 		lastPercent = value;
	// 		defered.resolve();
	// 		return defered.promise;
	// 	};
	// 	var stepListener = function(value) {
	// 		var defered = q.defer();
	// 		console.log("  - " + value.toString());
	// 		defered.resolve();
	// 		return defered.promise;
	// 	};
	// 	device.updateFirmware(fwURL, percentListener, stepListener)
	// 	.then(
	// 		function(res) {
	// 			// The result is a new device object
	// 			// console.log('Upgrade Success', res);
	// 			// console.log('Number of created devices', ljDevice.getNumCreatedDevices());
	// 			assert.strictEqual(lastPercent, 100, 'Highest Percentage isnt 100%');
	// 			var ljmDevice = device.getDevice();
	// 			// console.log(
	// 			// 	'Reading device FW version',
	// 			// 	ljmDevice.handle,
	// 			// 	ljmDevice.deviceType,
	// 			// 	ljmDevice.isHandleValid
	// 			// );
	// 			device.read('FIRMWARE_VERSION')
	// 			.then(function(res) {
	// 				assert.strictEqual(res.toFixed(4), fwVersionNum.toFixed(4), 'Firmware Not Upgraded');
	// 				done();
	// 			});
	// 		}, function(err) {
	// 			console.log("Failed to upgrade (upgrade test)", err);
	// 			assert.isOk(false, 'Failed to upgrade device: ' + JSON.stringify(err));
	// 			device.read('DEVICE_NAME_DEFAULT')
	// 			.then(function(res) {
	// 				console.log('Device is still responding to messages', res);
	// 				done();
	// 			}, function(err) {
	// 				console.log('Device is not responding anymore', err);
	// 				done();
	// 			});
	// 		}
	// 	);
	// },

	'closeDevice (assigned serial number)': function(test) {
		deviceA.close()
		.then(function() {
			deviceB.close()
			.then(function() {
				done();
			});
		});
	},
};
