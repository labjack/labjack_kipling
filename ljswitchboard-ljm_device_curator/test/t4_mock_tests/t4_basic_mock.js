
var q = require('q');
var device_curator = require('../../lib/device_curator');
var utils = require('../utils/utils');
var qExec = utils.qExec;


var device;

var criticalError = false;
var stopTest = function(test, err) {
	assert.isOk(false, err);
	criticalError = true;
	done();
};

var deviceInfo = {
	'serialNumber': 44001000,
	'DEVICE_NAME_DEFAULT': 'My Test Device',
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
		console.log('**** T4 - mock_device_test ****');
		try {
			device = new device_curator.device(true);
		} catch(err) {
			stopTest(test, err);
		}
		done();
	},
	'configure mock device': function(test) {
		device.configureMockDevice(deviceInfo)
		.then(function(res) {
			done();
		});
	},
	'openDevice - ctANY device': function(test) {
		var td = {
			'dt': 'LJM_dtT4',
			'ct': 'LJM_ctANY',
			'id': 'LJM_idANY'
		};

		device.open(td.dt, td.ct, td.id)
		.then(function(res) {
			deviceFound = true;
			done();
		}, function(err) {
			done();
		});
	},
	'checkDeviceInfo': function(test) {
		device.getDeviceAttributes()
		.then(function(res) {
			var keys = Object.keys(res);
			assert.strictEqual(res.deviceType, 4);
			assert.strictEqual(res.deviceTypeName, 'T4');
			assert.strictEqual(res.deviceTypeString, 'LJM_dtT4');
			assert.strictEqual(res.connectionType, 1);
			assert.strictEqual(res.connectionTypeString, 'LJM_ctUSB');
			assert.strictEqual(res.serialNumber, deviceInfo.serialNumber);
			assert.strictEqual(res.ip, '0.0.0.0');
			assert.strictEqual(res.ipAddress, '0.0.0.0');
			done();
		});
	},
	'Read Device Attributes': function(test) {
		var results = [];
		// Setup and call functions
		qExec(device, 'iRead', 'ETHERNET_IP')(results)
		.then(qExec(device, 'iRead', 'SERIAL_NUMBER'))
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
					assert.strictEqual(resData, deviceInfo[name]);
				} else if(infoMapping[name]) {
					assert.strictEqual(resData, deviceInfo[infoMapping[name]]);
				}
				// console.log(name, resData);
			});
			done();
		});
	},
	'closeDevice': function(test) {
		device.close()
		.then(function() {
			done();
		});
	},
};
