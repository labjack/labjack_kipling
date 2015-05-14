
var q = require('q');
var device_curator = require('../lib/device_curator');
var utils = require('./utils/utils');
var qExec = utils.qExec;


var deviceA;
var deviceB;

var criticalError = false;
var stopTest = function(test, err) {
	test.ok(false, err);
	criticalError = true;
	test.done();
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

function createDeviceUpgrader(device, firmwareInfo) {
	this.sn = device.savedAttributes.serialNumber;
	this.device = device;
	this.firmwareInfo = firmwareInfo;

	this.percentListener = function(percent) {
		var defered = q.defer();
		// console.log('Percent Listener', self.sn, percent);
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
		).then(function() {
			console.log('  - Upgrade finished', self.sn);
			defered.resolve();
		}, function() {
			console.log('  ! Upgrade failed', self.sn);
			defered.resolve();
		});
		return defered.promise;
	};
	this.startUpgrade = function() {
		return self.upgradeDevice();
	};
	var self = this;
}
var upgradeDevices = function(devices, firmwareInfo) {
	var defered = q.defer();
	var promises = [];
	devices.forEach(function(device) {
		var deviceUpgrader = new createDeviceUpgrader(device, firmwareInfo);
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
		console.log('**** mock_device_test ****');
		try {
			deviceA = new device_curator.device(true);
			deviceB = new device_curator.device(true);
		} catch(err) {
			stopTest(test, err);
		}
		test.done();
	},
	'configure mock device': function(test) {
		deviceA.configureMockDevice(deviceAInfo)
		.then(function(res) {
			deviceB.configureMockDevice(deviceBInfo)
			.then(function(res) {
				test.done();
			});
		});
	},
	'openDevice - ctANY device': function(test) {
		var td = {
			'dt': 'LJM_dtT7',
			'ct': 'LJM_ctANY',
			'id': 'LJM_idANY'
		};

		deviceA.open(td.dt, td.ct, td.id)
		.then(function(res) {
			deviceB.open(td.dt, td.ct, td.id)
			.then(function(res) {
				test.done();
			}, function(err) {
				test.done();
			});
		}, function(err) {
			test.done();
		});
	},
	'checkDeviceInfo (assigned serial number)': function(test) {
		deviceA.getDeviceAttributes()
		.then(function(res) {
			var keys = Object.keys(res);
			test.strictEqual(res.deviceType, 7);
			test.strictEqual(res.deviceTypeName, 'T7');
			test.strictEqual(res.deviceTypeString, 'LJM_dtT7');
			test.strictEqual(res.connectionType, 1);
			test.strictEqual(res.connectionTypeString, 'LJM_ctUSB');
			test.strictEqual(res.serialNumber, deviceAInfo.serialNumber);
			test.strictEqual(res.ip, '0.0.0.0');
			test.strictEqual(res.ipAddress, '0.0.0.0');
			deviceB.getDeviceAttributes()
			.then(function(res) {
				var keys = Object.keys(res);
				test.strictEqual(res.deviceType, 7);
				test.strictEqual(res.deviceTypeName, 'T7');
				test.strictEqual(res.deviceTypeString, 'LJM_dtT7');
				test.strictEqual(res.connectionType, 1);
				test.strictEqual(res.connectionTypeString, 'LJM_ctUSB');
				test.strictEqual(res.serialNumber, deviceBInfo.serialNumber);
				test.strictEqual(res.ip, '0.0.0.0');
				test.strictEqual(res.ipAddress, '0.0.0.0');
				test.done();
			});
		});
	},
	'upgrade devices': function(test) {
		var fwVersionNum = 1.0070;
		var fwURL = fws[fwVersionNum.toFixed(4)];
		var firmwareInfo = {
			'path': fwURL,
			'version': fwVersionNum,
		};
		var devices = [deviceA, deviceB];
		upgradeDevices(devices, firmwareInfo)
		.then(function() {
			console.log('  - Devices Upgraded');
			test.done();
		}, function() {
			console.log('  ! Devices failed to upgrade');
			test.ok(false);
			test.done();
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
	// 			test.strictEqual(lastPercent, 100, 'Highest Percentage isnt 100%');
	// 			var ljmDevice = device.getDevice();
	// 			// console.log(
	// 			// 	'Reading device FW version',
	// 			// 	ljmDevice.handle,
	// 			// 	ljmDevice.deviceType,
	// 			// 	ljmDevice.isHandleValid
	// 			// );
	// 			device.read('FIRMWARE_VERSION')
	// 			.then(function(res) {
	// 				test.strictEqual(res.toFixed(4), fwVersionNum.toFixed(4), 'Firmware Not Upgraded');
	// 				test.done();
	// 			});
	// 		}, function(err) {
	// 			console.log("Failed to upgrade (upgrade test)", err);
	// 			test.ok(false, 'Failed to upgrade device: ' + JSON.stringify(err));
	// 			device.read('DEVICE_NAME_DEFAULT')
	// 			.then(function(res) {
	// 				console.log('Device is still responding to messages', res);
	// 				test.done();
	// 			}, function(err) {
	// 				console.log('Device is not responding anymore', err);
	// 				test.done();
	// 			});
	// 		}
	// 	);
	// },
	'perform upgrade': function(test) {
		test.done();
	},
	'closeDevice (assigned serial number)': function(test) {
		deviceA.close()
		.then(function() {
			deviceB.close()
			.then(function() {
				test.done();
			});
		});
	},
};