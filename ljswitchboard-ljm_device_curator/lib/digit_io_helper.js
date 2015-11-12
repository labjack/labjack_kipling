
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
			try {
			deviceData.forEach(function(result) {
				var key = saveKeys[result.name];
				logParams[key] = result;
			});
			defered.resolve(logParams);
		} catch(err) {
			console.log('Err...', err);
		}
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
			var month = deviceData[1] - 1;
			var day = deviceData[2];
			var hours = deviceData[4];
			var minutes = deviceData[5];
			var seconds = deviceData[6];
			var date = new Date(year, month, day, hours, minutes, seconds, 0);
			// console.log('Time Started', date);
			logParams.startTime = {
				'time': date,
				'value': date.valueOf()
			};
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
function readDigitFlash(device, numReads, options) {
	return device.qReadArray('DGT_FLASH_READ', numReads, options);
}
function readDigitSavedReadings(bundle) {
	var device = bundle.device;
	var numReadings = bundle.logParams.storedBytes.numReadings;
	// var defered = q.defer();
	return readDigitFlash(device, numReadings, {'update': bundle.updateFunc});
	// defered.resolve();
	// return defered.promise;
}

function getLogParamsForFlashRead(bundle) {
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
	var defered = q.defer();
	var device = bundle.device;

	

	if(bundle.error) {
		defered.reject(bundle);
	} else {
		readDigitSavedReadings(bundle)
		.then(function(data) {
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
function conditionallyConvertTemperature(temperature, unit) {
	if((unit === 'C')||(unit === 'c')) {
		return parseFloat((temperature).toFixed(3));
	} else if((unit === 'F')||(unit === 'f')) {
		return parseFloat((temperature * 1.8 + 32).toFixed(3));
	} else if((unit === 'K')||(unit === 'k')) {
		return parseFloat((temperature + 273.15).toFixed(3));
	} else {
		return parseFloat((temperature).toFixed(3));
	}
}
function formatAndCalibrateRawFlashData(bundle) {
	var defered = q.defer();
	var device = bundle.device;

	var rawData = bundle.rawDeviceData;
	var numReadings = bundle.logParams.storedBytes.numReadings;
	var temperatureUnits = bundle.temperatureUnits;
	var itemsLogged = bundle.logParams.itemsLogged;
	var startTime = bundle.logParams.startTime.value;
	var logInterval = bundle.logParams.logInterval.time;
	var logIntervalMS = logInterval * 1000;
	var desiredTemperatureUnit = bundle.temperatureUnits;
	var i = 0;
	var j = 0;
	var dataType = 'temperature';
	var formatData = false;
	var curData = {
		'temperature': 0,
		'temperatureC': 0,
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
	var deviceCal = {
		'CalOffsetH': device.savedAttributes.DGT_HUMIDITY_CAL_OFFSET,
		'Hslope': device.savedAttributes.DGT_HUMIDITY_CAL_SLOPE,
		'TslopeH': device.savedAttributes.DGT_HUMIDITY_CAL_T_SLOPE,
	};
	var curTime = startTime;

	var collectedData = [];
	while(i < numReadings - 1) {
		// Manage what type of data will come next
		if(dataType === 'temperature') {
			curData.temperatureC = convertRawTemperatureC(rawData[i]);
			curData.temperature = conditionallyConvertTemperature(
				curData.temperatureC,
				desiredTemperatureUnit
			);
			curData.sysFlags = getSystemFlagBits(rawData[i]);
			if(itemsLogged.humidity) {
				dataType = 'humidity';
			} else if(itemsLogged.light) {
				dataType = 'light';
			} else {
				formatData = true;
			}
		} else if(dataType === 'humidity') {
			curData.humidity = convertRawHumidity(
				rawData[i],
				curData.temperatureC,
				deviceCal
			);
			if(itemsLogged.light) {
				dataType = 'light';
			} else {
				dataType = 'temperature';
				formatData = true;
			}
		} else if(dataType === 'light') {
			curData.light = convertRawLight(
				rawData[i],
				curData.temperatureC,
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
			collectedData.push(JSON.parse(JSON.stringify(curData)));
			
			if(false) {
				if(i == (numReadings-3)) {
					console.log('Last reading', new Date(curData.time));
				}
			}

			// Increment the time...
			curTime = curTime + logIntervalMS;
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
	if(false) {
		console.log('Num Readings', numReadings);
		var numGroups = numReadings/3;
		console.log('Num Value Groups', numGroups);
		console.log('Log Interval (s)', logInterval);
		var logDurationS = numGroups * logInterval;
		var logDurationM = logDurationS/60;
		var logDurationH = logDurationM/60;
		var logDurationD = logDurationH/24;
		console.log('Log Duration (s)', logDurationS);
		console.log('Log Duration (m)', logDurationM);
		console.log('Log Duration (h)', logDurationH);
		console.log('Log Duration (d)', logDurationD);
		console.log('Log Interval...', logIntervalMS, startTime, curTime);
	}

	bundle.data = collectedData;
	defered.resolve(bundle);
	return defered.promise;
}

function printLoggedData(collectedData) {
	var startIndex = collectedData.length -5;
	for(var i = startIndex; i < collectedData.length; i++) {
		console.log(
			'Collected Data',
			collectedData[i].temperature,
			collectedData[i].humidity,
			collectedData[i].light,
			new Date(collectedData[i].time));
	}
}

function validateTemperatureUnits(unit) {
	var validUnits = ['C', 'c', 'F', 'f', 'K', 'k'];
	var isValid = validUnits.some(function(validUnit) {
		if(unit === validUnit) {
			return true;
		} else {
			return false;
		}
	});
	return isValid;
}
function readDigitLoggedData(device, options) {
	var defered = q.defer();
	var bundle = {
		'device': device,
		'logParams': undefined,
		'rawDeviceData': [],
		'data': undefined,
		'isError': false,
		'error': undefined,
		'temperatureUnits': 'f',
		'updateFunc': function onUpdate(percent) {}
	};

	if(options) {
		if(options.temperatureUnits) {
			if(validateTemperatureUnits(options.temperatureUnits)) {
				bundle.temperatureUnits = options.temperatureUnits;
			}
		}
		if(options.updateFunc) {
			if(typeof(options.updateFunc) === 'function') {
				bundle.updateFunc = options.updateFunc;
			}
		}
	}

	function onError(errBundle) {
		console.log('Error...', errBundle);
		defered.reject(errBundle.error);
	}
	function onSuccess(succBundle) {
		// console.log('Successfully read data', Object.keys(succBundle), Object.keys(succBundle.logParams));
		// printLoggedData(succBundle.data);
		defered.resolve({
			'logParams': succBundle.logParams,
			'data': succBundle.data,
			'temperatureUnits': succBundle.temperatureUnits,
			'isError': succBundle.isError,
			'error': succBundle.error,
		});
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