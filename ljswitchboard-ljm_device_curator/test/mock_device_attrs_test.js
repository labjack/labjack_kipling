
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
			test.strictEqual(res.deviceTypeString, 'LJM_dtT7');
			test.strictEqual(res.connectionType, 1);
			test.strictEqual(res.connectionTypeString, 'LJM_ctUSB');
			test.strictEqual(res.serialNumber, deviceInfo.serialNumber);
			test.strictEqual(res.ip, '0.0.0.0');
			test.done();
		});
	},
	'closeDevice (assigned serial number)': function(test) {
		device.close()
		.then(function() {
			test.done();
		});
	},
	'configure mock device - USB': function(test) {
		device.configureMockDevice(deviceInfo)
		.then(function(res) {
			test.done();
		});
	},
	'openDevice - USB': function(test) {
		var td = {
			'dt': 'LJM_dtT7',
			'ct': 'LJM_ctUSB',
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
	'checkDeviceInfo - USB': function(test) {
		device.getDeviceAttributes()
		.then(function(res) {
			var keys = Object.keys(res);
			test.strictEqual(res.deviceType, 7);
			test.strictEqual(res.deviceTypeString, 'LJM_dtT7');
			test.strictEqual(res.connectionType, 1);
			test.strictEqual(res.connectionTypeString, 'LJM_ctUSB');
			test.strictEqual(res.serialNumber, deviceInfo.serialNumber);
			test.strictEqual(res.ip, '0.0.0.0');
			test.done();
		});
	},
	'closeDevice - USB': function(test) {
		device.close()
		.then(function() {
			test.done();
		});
	},
	'configure mock device - Ethernet': function(test) {
		device.configureMockDevice(deviceInfo)
		.then(function(res) {
			test.done();
		});
	},
	'openDevice - Ethernet': function(test) {
		var td = {
			'dt': 'LJM_dtT7',
			'ct': 'LJM_ctEthernet',
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
	'checkDeviceInfo - Ethernet': function(test) {
		device.getDeviceAttributes()
		.then(function(res) {
			var keys = Object.keys(res);
			test.strictEqual(res.deviceType, 7);
			test.strictEqual(res.deviceTypeString, 'LJM_dtT7');
			test.strictEqual(res.connectionType, 3);
			test.strictEqual(res.connectionTypeString, 'LJM_ctETHERNET');
			test.strictEqual(res.serialNumber, deviceInfo.serialNumber);
			test.strictEqual(res.ip, deviceInfo.ipAddress);
			test.done();
		});
	},
	'closeDevice - Ethernet': function(test) {
		device.close()
		.then(function() {
			test.done();
		});
	},
	'configure mock device - WiFi': function(test) {
		device.configureMockDevice(deviceInfo)
		.then(function(res) {
			test.done();
		});
	},
	'openDevice - WiFi': function(test) {
		var td = {
			'dt': 'LJM_dtT7',
			'ct': 'LJM_ctWiFi',
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
	'checkDeviceInfo - WiFi': function(test) {
		device.getDeviceAttributes()
		.then(function(res) {
			var keys = Object.keys(res);
			test.strictEqual(res.deviceType, 7);
			test.strictEqual(res.deviceTypeString, 'LJM_dtT7');
			test.strictEqual(res.connectionType, 4);
			test.strictEqual(res.connectionTypeString, 'LJM_ctWIFI');
			test.strictEqual(res.serialNumber, deviceInfo.serialNumber);
			test.strictEqual(res.ip, deviceInfo.ipAddress);
			// console.log('device attributes', res);
			test.done();
		});
	},
	'Read Device Attributes': function(test) {
		var results = [];
		// Setup and call functions
		qExec(device, 'iRead', 'ETHERNET_IP')(results)
		.then(qExec(device, 'iRead', 'WIFI_IP'))
		.then(qExec(device, 'iRead', 'SERIAL_NUMBER'))
		.then(qExec(device, 'iRead', 'HARDWARE_INSTALLED'))
		.then(function(res) {
			// console.log('Res', res);
			res.forEach(function(readRes) {
				var readData = readRes.retData;
				var name = readData.name;
				var resData;
				if(appropriateResultMap[name]) {
					resData = readData[appropriateResultMap[name]];
				} else {
					resData = readData.val;
				}

				if(deviceInfo[name]) {
					test.strictEqual(resData, deviceInfo[name]);
				} else if(infoMapping[name]) {
					test.strictEqual(resData, deviceInfo[infoMapping[name]]);
				}
				// console.log(name, resData);
			});
			test.done();
		});
	},
	'closeDevice - WiFi': function(test) {
		device.close()
		.then(function() {
			test.done();
		});
	},
};