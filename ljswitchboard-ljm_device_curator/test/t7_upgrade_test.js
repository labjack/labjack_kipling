
var q = require('q');
var device_curator = require('../lib/device_curator');
var utils = require('./utils/utils');
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
	'1.0135': 'http://labjack.com/sites/default/files/2014/12/T7firmware_010135_2014-11-24.bin',
	'1.0144': 'http://labjack.com/sites/default/files/2015/01/T7firmware_010144_2015-01-08.bin',
	'1.0146': 'http://labjack.com/sites/default/files/2015/01/T7firmware_010146_2015-01-19.bin'
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
		console.log('**** t7_upgrade_test ****');
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
			'ct': 'LJM_ctANY',
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
				res.serialNumber
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
	'upgradeFirmware': function(test) {
		var fwVersionNum = 1.0146;
		var fwURL = fws[fwVersionNum.toString()];
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
				test.strictEqual(lastPercent, 100, 'Highest Percentage isnt 100%');
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