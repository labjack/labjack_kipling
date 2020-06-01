
var q = require('q');
var device_curator = require('../../lib/device_curator');
var utils = require('../utils/utils');
var qExec = utils.qExec;
var ljm = require('labjack-nodejs').driver();


var device;

var criticalError = false;
var stopTest = function(test, err) {
	test.ok(false, err);
	criticalError = true;
	test.done();
};

var deviceFound = false;
var performTests = true;

var fws = {
	'1.0135': 'https://labjack.com/sites/default/files/2014/12/T7firmware_010135_2014-11-24.bin',
	'1.0144': 'https://labjack.com/sites/default/files/2015/01/T7firmware_010144_2015-01-08.bin',
	'1.0146': 'https://labjack.com/sites/default/files/2015/01/T7firmware_010146_2015-01-19.bin'
};

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
		console.log('**** t4_read_recovery_fw_version ****');
		console.log('**** Please connect 1x T4 via USB ****');
		try {
			device = new device_curator.device();
		} catch(err) {
			stopTest(test, err);
		}
		test.done();
	},
	'openDevice': function(test) {
		var td = {
			'dt': 'LJM_dtT4',
			'ct': 'LJM_ctUSB',
			'id': 'LJM_idANY'
		};
		// td.ct = 'LJM_ctWIFI';
		// td.id = 470010548;

		device.open(td.dt, td.ct, td.id)
		.then(function(res) {
			console.log(
				"  - Opened T4:",
				res.productType,
				res.connectionTypeName,
				res.serialNumber
			);
			console.log('  - Current Fw Version:', res.FIRMWARE_VERSION);
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
			test.strictEqual(res.deviceType, 4);
			test.strictEqual(res.deviceTypeString, 'LJM_dtT4');
			test.done();
		});
	},
	'get recovery fw version': function(test) {
		device.getRecoveryFirmwareVersion()
		.then(function(res) {
			console.log('  - Recovery FW Version:', res);
			test.done();
		}, function(err) {
			console.log('Error', err);
			test.done();
		});
	},
	'closeDevice': function(test) {
		device.close()
		.then(function() {
			test.done();
		}, function(err) {
			console.log("Failure");
			test.ok(false);
			test.done();
		});
	},
};

var tests = {};
var functionKeys = Object.keys(device_tests);
var getTest = function(testFunc, key) {
	var execTest = function(test) {
		// console.log("  > t4_basic_test - " + key);
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