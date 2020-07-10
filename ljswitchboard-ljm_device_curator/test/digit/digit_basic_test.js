
/**
 * This test was designed to test the digit LJM functionality and how the
 * various calibrations get applied by the device curator.
 **/
var q = require('q');
var device_curator = require('../../lib/device_curator');
var utils = require('../utils/utils');
var qExec = utils.qExec;
var async = require('async');
var modbus_map = require('@labjack/ljswitchboard-modbus_map').getConstants();

// Digit format functions
var digit_format_functions = require('../../lib/digit_format_functions');

var device;

var criticalError = false;
var stopTest = function(test, err) {
	test.ok(false, err);
	criticalError = true;
	test.done();
};

var deviceFound = false;
var performTests = true;

var DEBUG_TEST = false;

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
		test.done();
	},
	'openDigit': function(test) {
		var td = {
			'dt': 'LJM_dtDIGIT',
			'ct': 'LJM_ctUSB',
			'id': 'LJM_idANY'
		};

		device.open(td.dt, td.ct, td.id)
		.then(function(res) {
			if(DEBUG_TEST) {
				console.log(
					"  - Opened Digit:",
					res.productType,
					res.connectionTypeName,
					res.serialNumber
				);
			}
			deviceFound = true;
			test.done();
		}, function(err) {
			performTests = false;
			test.done();
		});
	},
	'checkDigitDeviceInfo': function(test) {
		device.getDeviceAttributes()
		.then(function(res) {
			test.strictEqual(res.deviceType, 200);
			test.strictEqual(res.deviceTypeString, 'LJM_dtDIGIT');
			test.strictEqual(res.connectionType, 1);
			test.strictEqual(res.connectionTypeString, 'LJM_ctUSB');
			test.done();
		});
	},
	'check constants': function(test) {
		// console.log(device.savedAttributes);
		test.done();
	},
	'readTemp': function(test) {
		var results = [];

		// Setup and call functions
		qExec(device, 'read', 'DGT_TEMPERATURE_LATEST_RAW')(results)
		.then(qExec(device, 'read', 'DGT_LIGHT_RAW'))
		.then(function(res) {
			// console.log('Results', res);
			var expectedResult = [
				{'functionCall': 'read', 'type': 'range', 'min': 0, 'max': 99999},
				{'functionCall': 'read', 'type': 'range', 'min': 0, 'max': 99999}
			];
			utils.testResults(test, expectedResult, res);
			test.done();
		});
	},
	'verify temperature format function': function(test) {
		var testPoints = [
			// Test negative values
			{ 'rawTemperature': 63016, 'temperature': -9.875 },
			{ 'rawTemperature': 60016, 'temperature': -21.5625 },
			{ 'rawTemperature': 50016, 'temperature': -60.625 },
			{ 'rawTemperature': 40016, 'temperature': -99.6875 },

			// Test positive values
			{ 'rawTemperature': 14016, 'temperature': 54.75 },
			{ 'rawTemperature': 10016, 'temperature': 39.125 },
			{ 'rawTemperature': 6016, 'temperature': 23.5 },
			{ 'rawTemperature': 4016, 'temperature': 15.6875 },
			{ 'rawTemperature': 2000, 'temperature': 7.8125 },
			{ 'rawTemperature': 1000, 'temperature': 3.875 },
			{ 'rawTemperature': 16, 'temperature': 0.0625 },
		];

		var reqResults = [];
		var results = [];

		testPoints.forEach(function(testPoint) {
			var temperature = digit_format_functions.convertRawTemperatureC(
				testPoint.rawTemperature
			);
			results.push(temperature);
			reqResults.push(testPoint.temperature);
		});

		results.forEach(function(result, i) {
			// console.log('Result:', result, 'ReqResult', reqResults[i]);
		});
		test.deepEqual(results, reqResults, 'There are some wrong temperature-conversions');
		test.done();
	},
	'verify humidity format function': function(test) {
		var testPoints = [
			{ 'rawCapacitance': 3292, 'calOffsetH': 3138, 'hSlope': 0.128989, 'tSlope': 1.7, 'temperature': 27.75, 'relativeHumidity': 34.282 },
			{ 'rawCapacitance': 3292, 'calOffsetH': 3138, 'hSlope': 0.128989, 'tSlope': 1.7, 'temperature': 30.75, 'relativeHumidity': 34.9398 },
			{ 'rawCapacitance': 3292, 'calOffsetH': 3138, 'hSlope': 0.128989, 'tSlope': 1.7, 'temperature': 10, 'relativeHumidity': 30.3897 },

			{ 'rawCapacitance': 3800, 'calOffsetH': 3138, 'hSlope': 0.128989, 'tSlope': 1.7, 'temperature': 26, 'relativeHumidity': 99.4245 },
			{ 'rawCapacitance': 3500, 'calOffsetH': 3138, 'hSlope': 0.128989, 'tSlope': 1.7, 'temperature': 26, 'relativeHumidity': 60.72795 },
			{ 'rawCapacitance': 3100, 'calOffsetH': 3138, 'hSlope': 0.128989, 'tSlope': 1.7, 'temperature': 26, 'relativeHumidity': 9.1324 },
			{ 'rawCapacitance': 3000, 'calOffsetH': 3138, 'hSlope': 0.128989, 'tSlope': 1.7, 'temperature': 26, 'relativeHumidity': -3.76647 },
		];

		var reqResults = [];
		var results = [];

		testPoints.forEach(function(testPoint) {
			var relativeHumidity = digit_format_functions.convertRawHumidity(
				testPoint.rawCapacitance,
				testPoint.temperature,
				{
					'CalOffsetH': testPoint.calOffsetH,
					'Hslope': testPoint.hSlope,
					'TslopeH': testPoint.tSlope,
				}
			);
			results.push(Number(relativeHumidity.toFixed(2)));
			reqResults.push(Number(testPoint.relativeHumidity.toFixed(2)));
		});

		results.forEach(function(result, i) {
			if(result != reqResults[i]) {
				console.log('!!!', 'Result:', result, 'ReqResult', reqResults[i]);	
			}
			

		});
		test.deepEqual(results, reqResults, 'There are some wrong humidity-conversions');
		test.done();
	},
	'verify light format function': function(test) {
		var testPoints = [
			{ 'rawLight': 200, 'temperature': 10, 'onUSBPower': true, 'lux': 935.723 },
			{ 'rawLight': 500, 'temperature': 26, 'onUSBPower': true, 'lux': 393.304 },
			{ 'rawLight': 800, 'temperature': 26, 'onUSBPower': true, 'lux': 256.632 },
			{ 'rawLight': 800, 'temperature': 0.7, 'onUSBPower': true, 'lux': 236.897 },
			{ 'rawLight': 1500, 'temperature': 30, 'onUSBPower': true, 'lux': 125.774 },
			{ 'rawLight': 1500, 'temperature': 50, 'onUSBPower': true, 'lux': 43.928 },
			{ 'rawLight': 1500, 'temperature': 60, 'onUSBPower': true, 'lux': 1 },
		];

		var reqResults = [];
		var results = [];

		testPoints.forEach(function(testPoint) {
			var lux = digit_format_functions.convertRawLight(
				testPoint.rawLight,
				testPoint.temperature,
				testPoint.onUSBPower
			);
			results.push(Number(lux.toFixed(3)));
			reqResults.push(testPoint.lux);
		});

		results.forEach(function(result, i) {
			// console.log('Result:', result, 'ReqResult', reqResults[i]);
		});
		test.deepEqual(results, reqResults, 'There are some wrong light-conversions');
		test.done();
	},
	'read log parameters': function(test) {
		device.getLogParams()
		.then(function(logParams) {
			// console.log('Ret Data', Object.keys(logParams), logParams);
			var requiredKeys = [
				'itemsLogged',
				'storedBytes',
				'installedOptions',
				'logInterval',
				'startTime',
			];
			var acquiredKeys = Object.keys(logParams);
			test.deepEqual(acquiredKeys, requiredKeys, 'getLogParams data is invalid');
			test.ok(true);
			test.done();
		}, function(err) {
			console.log('Error!!', err);
			test.ok(false);
			test.done();
		});
	},
	'read log data': function(test) {
		var options = {
			'temperatureUnits': 'f',
			'updateFunc': function(percent) {
				if(percent % 10 === 0) {
					console.log(' - Percent Complete', percent);
				}
			}
		};
		function printLogResult(results, index) {
			var result = JSON.parse(JSON.stringify(results[index]));
			result.time = new Date(result.time);
			return result;
		}
		var startTime = new Date();
		device.readDigitLoggedData(options)
		.then(function(loggedData) {
			var stopTime = new Date();
			var duration = stopTime - startTime;
			

			var requiredKeys = [
				'logParams',
				'data',
				'temperatureUnits',
				'isError',
				'error',
			];
			var acquiredKeys = Object.keys(loggedData);
			test.deepEqual(acquiredKeys, requiredKeys, 'readDigitLoggedData data is invalid');
			
			if(false) {
				console.log(
					'Logged Data',
					loggedData.data.length,
					parseFloat((duration/1000).toFixed(3))
				);
				console.log('Logged Params', {
					'temperature': loggedData.logParams.itemsLogged.temperature,
					'humidity': loggedData.logParams.itemsLogged.humidity,
					'light': loggedData.logParams.itemsLogged.light
				});
				console.log('First Result', printLogResult(loggedData.data, 0));
				console.log('Last Result', printLogResult(loggedData.data, loggedData.data.length - 1));
				loggedData.data.forEach(function(dataPoint) {
					// console.log('Data', dataPoint);
				});
			} else {
				console.log(
					' - Logged Data',
					loggedData.data.length,
					'time to download',
					parseFloat((duration/1000).toFixed(3))
				);
				console.log(' - Logged Params', {
					'temperature': loggedData.logParams.itemsLogged.temperature,
					'humidity': loggedData.logParams.itemsLogged.humidity,
					'light': loggedData.logParams.itemsLogged.light
				});
			}
			test.ok(true);
			test.done();
		}, function(err) {
			console.log('Error test!!', Object.keys(err));
			test.ok(false);
			test.done();
		});
	},
	'readTempLightHumidity': function(test) {
		var results = [];

		qExec(device, 'readTempLightHumidity')(results)
		.then(function(readResults) {
			console.log(JSON.stringify(results, null, 2));
			test.done();
		});
	},
	'averageTLH Readings': function(test) {
		var numReads = 10;
		var operation = 'readTempLightHumidity';

		executeMany(operation, numReads)
		.then(function(averagedData) {
			console.log('Averaged Data', averagedData);
			test.done();
		});
	},
	'averageTHL Readings': function(test) {
		var numReads = 10;
		var operation = 'readTempHumidityLight';

		executeMany(operation, numReads)
		.then(function(averagedData) {
			console.log('SN:', device.savedAttributes.serialNumber);
			console.log('Averaged Data', averagedData);
			test.done();
		});
	},
	'closeDigit': function(test) {
		device.close()
		.then(function() {
			test.done();
		});
	},
};

var executeMany = function(operation, numIterations) {
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