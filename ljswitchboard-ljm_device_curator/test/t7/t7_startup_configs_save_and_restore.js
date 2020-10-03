
var q = require('q');
var device_curator = require('../../lib/device_curator');
var utils = require('../utils/utils');
var qExec = utils.qExec;
var ljm = require('labjack-nodejs').driver();
var ljmModbusMap = require('ljswitchboard-modbus_map');
var modbus_map = ljmModbusMap.getConstants();

var device;
var deviceB;

var criticalError = false;
var stopTest = function(test, err) {
	assert.isOk(false, err);
	criticalError = true;
	done();
};

var deviceFound = false;
var performTests = true;

var fws = {
	'1.0135': 'https://labjack.com/sites/default/files/2014/12/T7firmware_010135_2014-11-24.bin',
	'1.0144': 'https://labjack.com/sites/default/files/2015/01/T7firmware_010144_2015-01-08.bin',
	'1.0146': 'https://labjack.com/sites/default/files/2015/01/T7firmware_010146_2015-01-19.bin'
};

var deviceConfigs = undefined;

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
		console.log('**** t7_startup_configs_read_and_copy ****');
		console.log('**** Please connect 2x T7 via USB ****');
		try {
			device = new device_curator.device();
			deviceB = new device_curator.device();
		} catch(err) {
			stopTest(test, err);
		}
		done();
	},
	'openDevice': function(test) {
		var td = {
			'dt': 'LJM_dtT7',
			'ct': 'LJM_ctUSB',
			'id': '470010104'
		};
		// td.ct = 'LJM_ctWIFI';
		// td.id = 470010548;

		device.open(td.dt, td.ct, td.id)
		.then(function(res) {
			console.log(
				"  - Opened T7:",
				res.productType,
				res.connectionTypeName,
				res.serialNumber
			);
			console.log('  - Current Fw Version:', res.FIRMWARE_VERSION);
			deviceFound = true;
			done();
		}, function(err) {
			console.log("  - Failed to open device", ljm.errToStrSync(err));
			performTests = false;
			done();
		});
	},
	'openDeviceB': function(test) {
		var td = {
			'dt': 'LJM_dtT7',
			'ct': 'LJM_ctUSB',
			'id': '470010533'
		};
		// td.ct = 'LJM_ctWIFI';
		// td.id = 470010548;

		deviceB.open(td.dt, td.ct, td.id)
		.then(function(res) {
			console.log(
				"  - Opened T7:",
				res.productType,
				res.connectionTypeName,
				res.serialNumber
			);
			console.log('  - Current Fw Version:', res.FIRMWARE_VERSION);
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
	'read device configs': function(test) {
		device.readConfigs([
			'StartupPowerSettings',
			'StartupSettings',
			'CommSettings',
			// 'SWDTSettings',
			'AIN_EF_Settings'
		])
		.then(function(results) {
			// Save read device configs.
			deviceConfigs = results;
			// console.log('  - Read Configs Results:');
			// results.forEach(function(result) {
			// 	if(result.type === 'registers') {
			// 		console.log('    - Registers Data', result.group, result.type, result.data);
			// 	} else if(result.type === 'flash') {
			// 		console.log('    - Flash Data', result.group, result.type, result.data.length);
			// 	}
			// });
			assert.isOk(true);
			done();
		}, function(err) {
			console.log('Error', err);
			assert.isOk(false, 'Failed to read device configs');
			done();
		});
	},
	'write device configs': function(test) {
		deviceB.writeConfigs(deviceConfigs)
		.then(function(result) {
			console.log('  - Finished writing device configs');
			done();
		}, function(err) {
			console.log('  - Finished writing device config.  It FAILED!!!', err);
			var code = err.error;
			var errorInfo = modbus_map.getErrorInfo(code);
			console.log('Error Code Info', code, errorInfo);
			assert.isOk(false, 'Failed to write device configs');
			done();
		});
	},
	'closeDevice': function(test) {
		device.close()
		.then(function() {
			done();
		}, function(err) {
			console.log("Failure");
			assert.isOk(false);
			done();
		});
	},
	'closeDeviceB': function(test) {
		deviceB.close()
		.then(function() {
			done();
		}, function(err) {
			console.log("Failure");
			assert.isOk(false);
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
