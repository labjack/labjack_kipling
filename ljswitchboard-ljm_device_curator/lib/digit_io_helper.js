
var q = require('q');
var async = require('async');
var digit_format_functions = require('./digit_format_functions');
var getSystemFlagBits = digit_format_functions.getSystemFlagBits;
var convertRawTemperatureC = digit_format_functions.convertRawTemperatureC;
var convertRawHumidity = digit_format_functions.convertRawHumidity;
var convertRawLight = digit_format_functions.convertRawLight;

var NUM_LOG_TIME_REGISTERS = 7;

var saveKeys = {
	'DGT_LOG_ITEMS_DATASET': 'itemsLogged',
	'DGT_STORED_BYTES': 'storedBytes',
	'DGT_INSTALLED_OPTIONS': 'installedOptions',
	'DGT_LOG_INTERVAL_INDEX_DATASET': 'logInterval',
};
function getBasicLogParams(device, logParams) {
	var defered = q.defer();
	
	// Perform device IO.
	device.iReadMany([
		'DGT_LOG_ITEMS_DATASET',
		'DGT_STORED_BYTES',
		'DGT_INSTALLED_OPTIONS',
		'DGT_LOG_INTERVAL_INDEX_DATASET',
	]).then(
		function interpretBasicLogParams(deviceData) {
			// console.log('Collected basic info', deviceData);
			deviceData.forEach(function(result) {
				var key = saveKeys[result.name];
				logParams[key] = result;
			});
			defered.resolve(logParams);
		}, defered.reject
	);
	return defered.promise;
}


function getLogStartTime(device, logParams) {
	var defered = q.defer();

	// Perform device IO.
	device.qReadArray('DGT_LOG_START_TIME', NUM_LOG_TIME_REGISTERS)
	.then(
		function interpretLogStartTime(deviceData) {
			// console.log('Collected log start time', deviceData);
			var year = deviceData[0] + 2000;
			var month = deviceData[1];
			var day = deviceData[2];
			var hours = deviceData[4];
			var minutes = deviceData[5];
			var seconds = deviceData[6];
			var date = new Date(year, month, day, hours, minutes, seconds, 0);
			// console.log('Time Started', date);
			logParams.startTime = date;
			defered.resolve(logParams);
		}, defered.reject
	);
	return defered.promise;
}


function getLogParams(device) {
	var defered = q.defer();
	// Initialize the variable being built.
	var logParams = {};

	var promises = [];
	promises.push(getBasicLogParams(device, logParams));
	promises.push(getLogStartTime(device, logParams));

	q.allSettled(promises)
	.then(function interpretResults(results) {
		defered.resolve(logParams);
	}).catch(function handleError(err) {
		console.log('Error collecting log params', err);
		defered.reject(logParams);
	});
	return defered.promise;
}


function initializeDigitFlashForRead(device) {
	var defered = q.defer();

	device.write('DGT_pFLASH_READ', 0)
	.then(function(res) {
		defered.resolve();
	}, function(err) {
		defered.reject(err);
	});
	return defered.promise;
}
function readDigitFlash(device, numBytes, options) {
	return device.qReadArray('DGT_FLASH_READ', numBytes, options);
}
function readDigitSavedReadings(bundle) {
	var device = bundle.device;
	var numReadings = bundle.logParams.storedBytes.numBytes;
	// var defered = q.defer();
	return readDigitFlash(device, numReadings, {'update': bundle.updateFunc});
	// defered.resolve();
	// return defered.promise;
}

function getLogParamsForFlashRead(bundle) {
	console.log('in getLogParamsForFlashRead');
	var defered = q.defer();
	var device = bundle.device;
	getLogParams(device)
	.then(function(logParams) {
		bundle.logParams = logParams;
		defered.resolve(bundle);
	}, function(err) {
		bundle.isError = true;
		bundle.error = err;
		defered.resolve(bundle);
	});
	return defered.promise;
}
function initFlashForFlashRead(bundle) {
	console.log('in initFlashForFlashRead', bundle.logParams.storedBytes.numBytes);
	var defered = q.defer();
	var device = bundle.device;
	if(bundle.error) {
		defered.reject(bundle);
	} else {
		initializeDigitFlashForRead(device)
		.then(function() {
			defered.resolve(bundle);
		}, function(err) {
			bundle.isError = true;
			bundle.error = err;
			defered.resolve(bundle);
		});
	}
	return defered.promise;
}
function readFlashForFlashRead(bundle) {
	console.log('in readFlashForFlashRead');
	var defered = q.defer();
	var device = bundle.device;

	

	if(bundle.error) {
		defered.reject(bundle);
	} else {
		readDigitSavedReadings(bundle)
		.then(function(data) {
			console.log('Read Digit saved readings', data.length);
			bundle.rawDeviceData = data;
			defered.resolve(bundle);
		}, function(err) {
			bundle.isError = true;
			bundle.error = err;
			defered.resolve(bundle);
		});
	}
	return defered.promise;
}
function formatAndCalibrateRawFlashData(bundle) {
	console.log('in formatAndCalibrateRawFlashData', bundle.logParams);
	var defered = q.defer();
	var device = bundle.device;

	var rawData = bundle.rawDeviceData;
	var numReadings = bundle.logParams.storedBytes.numBytes;
	var temperatureUnits = bundle.temperatureUnits;
	var itemsLogged = bundle.logParams.itemsLogged;
	var startTime = bundle.logParams.startTime;
	var logInterval = bundle.logParams.logInterval.time;
	var logIntervalMS = logInterval * 1000;
	var i = 0;
	var j = 0;
	var dataType = 'temperature';
	var formatData = false;
	var curData = {
		'temperature': 0,
		'humidity': 0,
		'light': 0,
		'sysFlags': {
			'warning': false,
			'pwrFail': false,
			'reset': false,
			'usbActive': false,
			'tErr': false,
		},
		'time': startTime,
	};
	var calibratedData = {
		'temperature': undefined,
		'humidity': undefined,
		'light': undefined,
	};
	var deviceCal = {
		'CalOffsetH': device.savedAttributes.DGT_HUMIDITY_CAL_OFFSET,
		'Hslope': device.savedAttributes.DGT_HUMIDITY_CAL_SLOPE,
		'TslopeH': device.savedAttributes.DGT_HUMIDITY_CAL_T_SLOPE,
	};
	var curTime = startTime;
	var numValuePairs = 1;
	while(i < numReadings - 1) {
		// Manage what type of data will come next
		if(dataType === 'temperature') {
			curData.temperature = rawData[i];
			curData.temperature = convertRawTemperatureC(rawData[i]);
			curData.sysFlags = getSystemFlagBits(rawData[i]);
			if(itemsLogged.humidity) {
				dataType = 'humidity';
			} else if(itemsLogged.light) {
				dataType = 'light';
			} else {
				formatData = true;
			}
		} else if(dataType === 'humidity') {
			curData.humidity = rawData[i];
			curData.humidity = convertRawHumidity(
				rawData[i],
				curData.temperature,
				deviceCal
			);
			if(itemsLogged.light) {
				dataType = 'light';
			} else {
				dataType = 'temperature';
				formatData = true;
			}
		} else if(dataType === 'light') {
			curData.light = rawData[i];
			curData.light = convertRawLight(
				rawData[i],
				curData.temperature,
				curData.sysFlags.usbActive
			);
			dataType = 'temperature';
			formatData = true;
		} else {
			console.log('Un-recognized type...', dataType);
		}

		// Increment the pointer variables.
		i += 1;
		j += 1;
		if(formatData) {
			if(i < 30) {
				// console.log('Incrementing Time', curData.time);
			}
			// calibratedData.temperature = convertRawTemperatureC(
			// 	curData.temperature
			// );
			if(((numValuePairs) % 60) === 0) {
				if(i < 1000000) {
					// console.log('Cur Data', curData.time, numValuePairs);
				}
			}
			if(i == (numReadings-3)) {
				console.log('Last reading', curData.time, numValuePairs);
			}

			numValuePairs += 1;
			// Increment the time...
			curTime = new Date((curTime.valueOf() + logIntervalMS));
			curData.time = curTime;

			// Re-set the data for the next group of TLH data.
			curData.temperature = 0;
			curData.humidity = 0;
			curData.light = 0;
			formatData = false;
		} else {
			if(i < 30) {
				// console.log('Not Incrementing Time');
			}
		}
	}
	console.log('Num Readings', numReadings);
	var numGroups = numReadings/3;
	console.log('Num Value Groups', numGroups);
	console.log('Log Interval (s)', logInterval);
	var logDurationS = numGroups * logInterval;
	var logDurationM = logDurationS/60;
	var logDurationH = logDurationM/60;
	var logDurationD = logDurationM/24;
	console.log('Log Duration (s)', logDurationS);
	console.log('Log Duration (m)', logDurationM);
	console.log('Log Duration (h)', logDurationH);
	console.log('Log Duration (d)', logDurationD);
	console.log('Log Interval...', logIntervalMS, startTime, curTime);
	defered.resolve(bundle);
	return defered.promise;
}

function readDigitLoggedData(device) {
	var defered = q.defer();
	var bundle = {
		'device': device,
		'logParams': undefined,
		'rawDeviceData': [],
		'data': {},
		'isError': false,
		'error': undefined,
		'temperatureUnits': 'C',
		'updateFunc': function onUpdate(percent) {
			// console.log(' - Update:', percent, '%');
		}
	};

	function onError(errBundle) {
		console.log('Error...', errBundle);
		defered.reject(errBundle.error);
	}
	function onSuccess(succBundle) {
		console.log('Successfully read data', Object.keys(succBundle), Object.keys(succBundle.logParams));
		defered.resolve(succBundle.data);
	}
	getLogParamsForFlashRead(bundle)
	.then(initFlashForFlashRead)
	.then(readFlashForFlashRead)
	.then(formatAndCalibrateRawFlashData)
	.then(onSuccess, onError);
	return defered.promise;
}



exports.getLogParams = getLogParams;
exports.readDigitLoggedData = readDigitLoggedData;