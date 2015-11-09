
var q = require('q');
var async = require('async');

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
function readDigitFlash(device, numBytes) {

}
function readDigitSavedReadings(device, numReadings) {
	var defered = q.defer();
	defered.resolve();
	return defered.promise;
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
	console.log('in initFlashForFlashRead');
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
		readDigitSavedReadings(device)
		.then(function(data) {
			console.log('Read Digit saved readings', data);
			defered.resolve(bundle);
		}, function(err) {
			bundle.isError = true;
			bundle.error = err;
			defered.resolve(bundle);
		});
	}
	return defered.promise;
}

function readDigitLoggedData(device) {
	var defered = q.defer();
	var bundle = {
		'device': device,
		'logParams': undefined,
		'data': {},
		'isError': false,
		'error': undefined,
	};

	function onError(errBundle) {
		console.log('Error...', errBundle);
		defered.reject(errBundle.error);
	}
	function onSuccess(succBundle) {
		console.log('Successfully read data', Object.keys(succBundle));
		defered.resolve(succBundle.data);
	}
	getLogParamsForFlashRead(bundle)
	.then(initFlashForFlashRead)
	.then(readFlashForFlashRead)
	.then(onSuccess, onError);
	return defered.promise;
}



exports.getLogParams = getLogParams;
exports.readDigitLoggedData = readDigitLoggedData;