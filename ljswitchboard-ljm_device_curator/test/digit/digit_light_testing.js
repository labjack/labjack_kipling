
/**
 * This test is designed to quickly verify digits readings to make sure they
 * aren't obviously broken.  It doesn't verify their readings, users need
 * to visually inspect the test's output to check the results.
 **/
var q = require('q');
var device_curator = require('../../lib/device_curator');
var utils = require('../utils/utils');
var ljm_ffi = require('ljm-ffi');
var ljm = ljm_ffi.load();
var ljn = require('labjack-nodejs');
var driver = ljn.driver();

var qExec = utils.qExec;
var async = require('async');
var modbus_map = require('ljswitchboard-modbus_map').getConstants();

// Digit format functions
var digit_format_functions = require('../../lib/digit_format_functions');

var devices = [];
var deviceSerials = [];

var criticalError = false;
var stopTest = function(test, err) {
	assert.isOk(false, err);
	criticalError = true;
	done();
};

var deviceFound = false;
var performTests = true;

var DEBUG_TEST = false;


var deviceDataBySN = {};

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
	'createDigitDevice': function(test) {
		console.log('');
		console.log('**** digit_basic_test ****');
		try {
			device = new device_curator.device();
		} catch(err) {
			stopTest(test, err);
		}
		done();
	},
	'list all digits...': function(test) {
		var foundDevices = driver.listAllSync('LJM_dtDIGIT', 'LJM_ctUSB');
		console.log('We found digits!', foundDevices.length);
		deviceSerials = foundDevices.map(function(foundDevice) {
			return foundDevice.serialNumber;
		});
		done();
	},
	'open all digits': function(test) {
		console.log('Opening Devices', deviceSerials);
		async.eachSeries(
			deviceSerials,
			function(deviceSerial, cb) {
				var newDevice = new device_curator.device();
				var td = {
					'dt': 'LJM_dtDigit',
					'ct': 'LJM_ctUSB',
					'id': deviceSerial.toString(),
				};

				console.log('Opening Device', deviceSerial.toString());
				newDevice.open(td.dt, td.ct, td.id)
				.then(function(res) {
					console.log('Opened Device', newDevice.savedAttributes.serialNumber);
					deviceDataBySN[newDevice.savedAttributes.serialNumber] = {'lux': 0};
					devices.push(newDevice);
					cb();
				}, function(err) {
					console.log('Failed to open device', err);
					cb();
				});
			}, function(err) {
				done();
			});
	},
	'print out device serial numbers': function(test) {
		async.eachSeries(
			devices,
			function(device, cb) {
				console.log('Opened...', device.savedAttributes.serialNumber);
				cb();
			}, function(err) {
				done();
			});
	},
};

function collectDigitData(test) {
	var collectedData = [];

	async.each(
		devices,
		function(device, iterationCB) {
			var numReads = 10;
			var operation = 'readTempHumidityLight';

			executeMany(device, operation, numReads)
			.then(function(averagedData) {
				// console.log('SN:', device.savedAttributes.serialNumber);
				// console.log('Averaged Data', averagedData);

				collectedData.push({
					'SN': device.savedAttributes.serialNumber,
					// 'temp': parseFloat(averagedData.temperature.toFixed(2)),
					'lux': parseFloat(averagedData.light.toFixed(2)),
					// 'hum': parseFloat(averagedData.humidity.toFixed(2)),
				});
				deviceDataBySN[device.savedAttributes.serialNumber].lux = parseFloat(averagedData.light.toFixed(2));

				iterationCB();
			});
		}, function(err) {
			console.log('Finished Collecting Data:');
			console.log(deviceDataBySN);
			setTimeout(function() {
				done();
			}, 500);
		});
}
var testNameBase = 'averageTLH Readings';
for(var i = 0; i < 1000; i++) {
	device_tests[testNameBase + '_' + i.toString()] = collectDigitData;
}

device_tests['closeDigit'] = function(test) {
	async.eachSeries(
		devices,
		function(device, cb) {
			device.close()
			.then(function(res) {
				console.log('Closed...', device.savedAttributes.serialNumber);
				cb();
			}, function(err) {
				cb();
			});
		}, function(err) {
			done();
		});
};

var executeMany = function(device, operation, numIterations) {
	var defered = q.defer();
	var executions = [];

	var collectedData = [];
	var summedData = {
		'temperature': 0,
		'humidity': 0,
		'light': 0,
	};
	var averagedData = {
		'temperature': 0,
		'humidity': 0,
		'light': 0,
	};

	for(var i = 0; i < numIterations; i++) {
		executions.push(device[operation]);
	}

	async.eachSeries(
		executions,
		function(execution, callback) {
			execution()
			.then(function(data) {
				collectedData.push(data);
				callback();
			}, function(err) {
				console.error('Error collecting data from digit', err);
				callback();
			});
		}, function(err) {
			collectedData.forEach(function(data) {
				summedData.temperature += data.temperature;
				summedData.humidity += data.relativeHumidity;
				summedData.light += data.lux;
			});

			averagedData.temperature = summedData.temperature/collectedData.length;
			averagedData.humidity = summedData.humidity/collectedData.length;
			averagedData.light = summedData.light/collectedData.length;

			defered.resolve(averagedData);
		});

	return defered.promise;
};
var tests = {};
var functionKeys = Object.keys(device_tests);
var getTest = function(testFunc, key) {
	var execTest = function(test) {
		// console.log("  > digit_basic_test - " + key);
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
