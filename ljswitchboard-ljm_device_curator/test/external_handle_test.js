
var q = require('q');
var device_curator = require('../lib/device_curator');
var utils = require('./utils/utils');
var qExec = utils.qExec;
var ljm_ffi = require('ljm-ffi');
var ljm = ljm_ffi.load();
var mb = require('ljswitchboard-modbus_map');
var modbus_map = mb.getConstants();


var device;
var capturedEvents = [];

var criticalError = false;
var stopTest = function(test, err) {
	assert.isOk(false, err);
	criticalError = true;
	done();
};

var deviceFound = false;
var performTests = true;

var DEBUG_TEST = true;
var deviceHandle = undefined;


var dataToKeep = {
	'AIN0': 'val',
	'FIRMWARE_VERSION': 'val',
	'WIFI_IP': 'str',
	'ETHERNET_IP': 'str',
	'WIFI_RSSI': 'str',
	'WIFI_VERSION': 'val',
	'SERIAL_NUMBER': 'val',
};
var dataToRead = [
	'AIN0',
	'FIRMWARE_VERSION',
	'WIFI_IP',
	'ETHERNET_IP',
	'WIFI_RSSI',
	'WIFI_VERSION',
	'SERIAL_NUMBER',
];

var networkIdToTest = '';

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
	'initial test': function(test) {
		console.log('');
		console.log('**** Starting external_handle_test ****');
		console.log('Please connect 1x T7 via Ethernet and 1x T7 via USB');
		done();
	},
	'openDevice (UDP)': function(test) {
		if (process.env.SKIP_HARDWARE_TEST) {
			done();
			return;
		}

		var td = {
			'dt': 'LJM_dtT7',
			'ct': 'LJM_ctTCP',
			'id': 'LJM_idANY'
		};
		var openData = ljm.LJM_OpenS.async(td.dt, td.ct, td.id, 0, function(data) {
			if(data.ljmError !== 0) {
				// The device was not opened properly.
				console.log('Failed to open T7 device via UDP.  Please connect a T7 via Ethernet or WiFi');
				performTests = false;
				done();
			} else {
				// The device was opened properly.
				deviceFound = true;
				deviceHandle = data.handle;
				done();
			}
		});
	},
	'create curated device (UDP)': function(test) {
		if (process.env.SKIP_HARDWARE_TEST) {
			done();
			return;
		}

		try {
			var td = {
				'dt': 'LJM_dtT7',
				'ct': 'LJM_ctTCP',
				'id': 'LJM_idANY'
			};
			device = new device_curator.device();
			device.linkToHandle(deviceHandle, td.dt, td.ct, td.id)
			.then(function(res) {
				if(DEBUG_TEST) {
					console.log(
						"  - Opened T7:",
						res.productType,
						res.connectionTypeName,
						res.serialNumber
					);
				}
				// console.log('in t7_basic_test.js, openDevice', res);
				deviceFound = true;
				done();
			}, function(err) {
				console.log('Failed to link to open device', err);
				var mbInfo = modbus_map.getErrorInfo(err);
				console.log('MB Info', mbInfo);
				performTests = false;
				done();
			})
		} catch(err) {
			console.log('Encountered an error....', err);
			stopTest(test, err);
		}
	},
	'checkDeviceInfo (UDP)': function(test) {
		if (process.env.SKIP_HARDWARE_TEST) {
			done();
			return;
		}

		device.getDeviceAttributes()
		.then(function(res) {
			var keys = Object.keys(res);

			assert.strictEqual(res.deviceType, 7);
			assert.strictEqual(res.deviceTypeString, 'LJM_dtT7');
			done();
		});
	},
	'perform test reads (UDP)': function(test) {
		if (process.env.SKIP_HARDWARE_TEST) {
			done();
			return;
		}

		device.iReadMultiple(dataToRead)
		.then(function(results) {
			device.iRead('DEVICE_NAME_DEFAULT')
			.then(function(deviceName) {
				var vals = [];
				results.forEach(function(result) {
					result = result.data;
					var data = {};
					var keyToKeep = dataToKeep[result.name];
					data[result.name] = result.res;
					if(result[keyToKeep]) {
						data[result.name] = result[keyToKeep];
					}
					vals.push(data)
				});
				var nameData = {};
				nameData[deviceName.name] = deviceName.val;
				vals.push(nameData);
				console.log('Test Results', vals);
				done();
			}, function(err) {
				console.log('Failed to read name', err);
				done();
			});
		}, function(err) {
			console.log('Failed to collect data');
			done();
		});
	},
	'closeDevice (UDP)': function(test) {
		if (process.env.SKIP_HARDWARE_TEST) {
			done();
			return;
		}

		device.close()
		.then(function() {
			done();
		});
	},

	'openDevice (USB)': function(test) {
		if (process.env.SKIP_HARDWARE_TEST) {
			done();
			return;
		}

		var td = {
			'dt': 'LJM_dtT7',
			'ct': 'LJM_ctUSB',
			'id': 'LJM_idANY'
		};
		var openData = ljm.LJM_OpenS.async(td.dt, td.ct, td.id, 0, function(data) {
			if(data.ljmError !== 0) {
				// The device was not opened properly.
				console.log('Failed to open device.  Please connect a T7 via USB');
				performTests = false;
				done();
			} else {
				// The device was opened properly.
				deviceFound = true;
				deviceHandle = data.handle;
				done();
			}
		});
	},
	'create curated device (USB)': function(test) {
		if (process.env.SKIP_HARDWARE_TEST) {
			done();
			return;
		}

		try {
			var td = {
				'dt': 'LJM_dtT7',
				'ct': 'LJM_ctUSB',
				'id': 'LJM_idANY'
			};
			device = new device_curator.device();
			device.linkToHandle(deviceHandle, td.dt, td.ct, td.id)
			.then(function(res) {
				if(DEBUG_TEST) {
					console.log(
						"  - Opened T7:",
						res.productType,
						res.connectionTypeName,
						res.serialNumber
					);
				}
				// console.log('in t7_basic_test.js, openDevice', res);
				deviceFound = true;
				done();
			}, function(err) {
				console.log('Failed to link to open device', err);
				var mbInfo = modbus_map.getErrorInfo(err);
				console.log('MB Info', mbInfo);
				performTests = false;
				done();
			})
		} catch(err) {
			console.log('Encountered an error....', err);
			stopTest(test, err);
		}
	},
	'checkDeviceInfo (USB)': function(test) {
		if (process.env.SKIP_HARDWARE_TEST) {
			done();
			return;
		}

		device.getDeviceAttributes()
		.then(function(res) {
			var keys = Object.keys(res);

			assert.strictEqual(res.deviceType, 7);
			assert.strictEqual(res.deviceTypeString, 'LJM_dtT7');
			done();
		});
	},
	'perform test reads (USB)': function(test) {
		if (process.env.SKIP_HARDWARE_TEST) {
			done();
			return;
		}

		device.iReadMultiple(dataToRead)
		.then(function(results) {
			device.iRead('DEVICE_NAME_DEFAULT')
			.then(function(deviceName) {
				var vals = [];
				results.forEach(function(result) {
					result = result.data;
					var data = {};
					var keyToKeep = dataToKeep[result.name];
					data[result.name] = result.res;
					if(result[keyToKeep]) {
						data[result.name] = result[keyToKeep];
					}
					vals.push(data)
				});
				var nameData = {};
				nameData[deviceName.name] = deviceName.val;
				vals.push(nameData);
				console.log('Test Results', vals);
				done();
			}, function(err) {
				console.log('Failed to read name', err);
				done();
			});
		}, function(err) {
			console.log('Failed to collect data');
			done();
		});
	},
	'closeDevice (USB)': function(test) {
		if (process.env.SKIP_HARDWARE_TEST) {
			done();
			return;
		}

		device.close()
		.then(function() {
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
