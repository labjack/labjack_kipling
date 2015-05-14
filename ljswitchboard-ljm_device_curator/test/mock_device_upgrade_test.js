
var q = require('q');
var device_curator = require('../lib/device_curator');
var utils = require('./utils/utils');
var qExec = utils.qExec;


var device;

var criticalError = false;
var stopTest = function(test, err) {
	test.ok(false, err);
	criticalError = true;
	test.done();
};

var deviceInfo = {
	'serialNumber': 47001000,
	'DEVICE_NAME_DEFAULT': 'My Test Device',
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
		console.log('**** mock_device_upgrade_test ****');
		try {
			device = new device_curator.device(true);
		} catch(err) {
			stopTest(test, err);
		}
		test.done();
	},
	'configure mock device': function(test) {
		device.configureMockDevice(deviceInfo)
		.then(function(res) {
			test.done();
		});
	},
	'openDevice - ctANY device': function(test) {
		var td = {
			'dt': 'LJM_dtT7',
			'ct': 'LJM_ctANY',
			'id': 'LJM_idANY'
		};

		device.open(td.dt, td.ct, td.id)
		.then(function(res) {
			deviceFound = true;
			test.done();
		}, function(err) {
			test.done();
		});
	},
	'checkDeviceInfo (assigned serial number)': function(test) {
		device.getDeviceAttributes()
		.then(function(res) {
			var keys = Object.keys(res);
			test.strictEqual(res.deviceType, 7);
			test.strictEqual(res.deviceTypeName, 'T7');
			test.strictEqual(res.deviceTypeString, 'LJM_dtT7');
			test.strictEqual(res.connectionType, 1);
			test.strictEqual(res.connectionTypeString, 'LJM_ctUSB');
			test.strictEqual(res.serialNumber, deviceInfo.serialNumber);
			test.strictEqual(res.ip, '0.0.0.0');
			test.strictEqual(res.ipAddress, '0.0.0.0');
			test.done();
		});
	},
	'upgradeFirmware': function(test) {
		var fwVersionNum = 1.0070;
		var fwURL = fws[fwVersionNum.toFixed(4)];
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
				device.read('FIRMWARE_VERSION')
				.then(function(res) {
					test.strictEqual(res.toFixed(4), fwVersionNum.toFixed(4), 'Firmware Not Upgraded');
					test.done();
				});
			}, function(err) {
				console.log("Failed to upgrade (upgrade test)", err);
				test.ok(false, 'Failed to upgrade device: ' + JSON.stringify(err));
				device.read('DEVICE_NAME_DEFAULT')
				.then(function(res) {
					console.log('Device is still responding to messages', res);
					test.done();
				}, function(err) {
					console.log('Device is not responding anymore', err);
					test.done();
				});
			}
		);
	},
	'perform upgrade': function(test) {
		test.done();
	},
	'closeDevice (assigned serial number)': function(test) {
		device.close()
		.then(function() {
			test.done();
		});
	},
};