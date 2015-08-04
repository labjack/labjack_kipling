
var q = require('q');
var config_loader = require('./config_loader');



function interpretLoadConfigFileResults(bundle) {
	var defered = q.defer();
	var results = {
		'isValid': true,
		'data': {},
		'message': '',
		'warning': '',
	};

	if(bundle.isError) {
		// There was an error reading the file.
		results.isValid = false;
		results.message = bundle.errorMessage;
		defered.reject(results);
	} else {
		// There was not an error reading the file.
		results.data = bundle.data;
		defered.resolve(results);
	}
	return defered.promise;
}

var requiredConfigKeys = [
	'logging_period_ms',
	'logging_config',
	'view_config',
	'views',
	'data_groups',
];
function verifyConfigFileRequiredKeys(bundle) {
	var defered = q.defer();
	
	var missingKeys = [];
	requiredConfigKeys.forEach(function(requiredConfigKey){
		if(typeof(bundle.data[requiredConfigKey]) === 'undefined') {
			missingKeys.push(requiredConfigKey);
		}
	});

	if(missingKeys.length > 0) {
		var message = 'Missing keys: ';
		message += JSON.stringify(missingKeys);
		bundle.isValid = false;
		bundle.message = message;
		defered.reject(bundle);
	} else {
		defered.resolve(bundle);
	}
	return defered.promise;
}

function verifyDefinedViews(bundle) {
	var defered = q.defer();

	var definedViews = bundle.data.views;
	var missingViews = [];

	definedViews.forEach(function(definedViewKey){
		if(typeof(bundle.data[definedViewKey]) === 'undefined') {
			missingViews.push(definedViewKey);
		}
	});

	if(missingViews.length > 0) {
		var message = 'Missing defined views: ';
		message += JSON.stringify(missingViews);
		bundle.isValid = false;
		bundle.message = message;
		defered.reject(bundle);
	} else {
		defered.resolve(bundle);
	}
	return defered.promise;
}

function verifyDefinedDataGroups(bundle) {
	var defered = q.defer();

	var definedDataGroups = bundle.data.data_groups;
	var missingDataGroups = [];

	definedDataGroups.forEach(function(definedDataGroupKey){
		if(typeof(bundle.data[definedDataGroupKey]) === 'undefined') {
			missingDataGroups.push(definedDataGroupKey);
		}
	});

	if(missingDataGroups.length > 0) {
		var message = 'Missing defined data_groups: ';
		message += JSON.stringify(missingDataGroups);
		bundle.isValid = false;
		bundle.message = message;
		defered.reject(bundle);
	} else {
		defered.resolve(bundle);
	}
	return defered.promise;
}

function verifyConfigFile(filePath) {
	var defered = q.defer();

	config_loader.loadConfigFile(filePath)
	.then(
		interpretLoadConfigFileResults,
		interpretLoadConfigFileResults
	)
	.then(verifyConfigFileRequiredKeys, defered.reject)
	.then(verifyDefinedViews, defered.reject)
	.then(verifyDefinedDataGroups, defered.reject)
	.then(defered.resolve, defered.reject);

	return defered.promise;
}
exports.verifyConfigFile = verifyConfigFile;

function verifyConfigObject(dataObject) {
	var defered = q.defer();

	var results = {
		'isValid': true,
		'data': {},
		'message': '',
		'warning': '',
	};
	try {
		results.data = JSON.parse(JSON.stringify(dataObject));

		verifyConfigFileRequiredKeys(results)
		.then(verifyDefinedViews, defered.reject)
		.then(verifyDefinedDataGroups, defered.reject)
		.then(defered.resolve, defered.reject);
	} catch(err) {
		results.isValid = false;
		results.message = 'Failed to parse given data object: ' + err.toString();
		defered.reject(results);
	}

	return defered.promise;
}
exports.verifyConfigObject = verifyConfigObject;

