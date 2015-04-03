

var data_formatters = require('./data_formatters');

var modbus_map = require('ljswitchboard-modbus_map');
var constants = modbus_map.getConstants();
var driver_const = require('ljswitchboard-ljm_driver_constants');

var formatters = data_formatters.list;
var formatterKeys = Object.keys(formatters);
var errorDefaults = data_formatters.errorList;
var errorKeys = Object.keys(errorDefaults);

var numFormatterKeys = formatterKeys.length;


var addErrorInfo = function(bundle, err) {
	var errorCode = 0;
	if(isNaN(err)) {
		errorCode = err.retError;
	} else {
		errorCode = err;
	}
	var errorInfo = constants.getErrorInfo(errorCode);

	bundle.errorCode = errorCode;
	bundle.errorString = errorInfo.string;
	bundle.err = err;
	return bundle;
};
var addErrorData = function(bundle, address, options) {
	var valueCache = {};
	var customValues = {};
	var deviceType = undefined;
	if(options) {
		if(options.valueCache) {
			valueCache = options.valueCache;
		}
		if(options.customValues){
			customValues = options.customValues;
		}
		if(options.deviceType){
			deviceType = options.deviceType;
		}
	}

	var dt;
	var regInfo = constants.getAddressInfo(address);
	var regName;
	var regAddress;
	if(regInfo.data) {
		regName = regInfo.data.name;
		regAddress = regInfo.data.address;
	} else {
		regName = '';
		regAddress = -1;
	}

	// Populate the default value based off the expected type.
	var defaultValue;
	if(driver_const.defaultValues[regInfo.type]) {
		defaultValue = driver_const.defaultValues[regInfo.type];
	} else {
		defaultValue = 0;
	}

	// Check to see if there is a "last-valid value"
	var lastValue = defaultValue;
	if(typeof(valueCache[regName]) !== 'undefined') {
		lastValue = valueCache[regName];
	}

	// Check to see if there is a custom-value
	if(typeof(customValues[regName]) !== 'undefined') {
		defaultValue = customValues[regName];
	} else {
		// search through the data_parser for data.
		if(deviceType) {
			dt = driver_const.deviceTypes[deviceType];
			if(errorDefaults[dt]) {
				if(errorDefaults[dt][regName]) {
					defaultValue = errorDefaults[dt][regName];
				}
			}
		} else {
			var j;
			for(j = 0; j < numFormatterKeys; j++) {
				dt = errorKeys[j];
				if(errorDefaults[dt][regName]) {
					defaultValue = errorDefaults[dt][regName];
				}
			}
		}
	}
	bundle.register = address;
	bundle.name = regName;
	bundle.address = regAddress;
	bundle.defaultValue = defaultValue;
	bundle.lastValue = lastValue;
	return bundle;

};
var parseError = function(address, err, options) {
	var retData = {};
	addErrorData(retData, address, options);
	addErrorInfo(retData, err);
	return retData;
};
var parseErrorMultiple = function(addresses, error, options) {
	var retData = {
		'data': []
	};
	addresses.forEach(function(address) {
		var errData = {};
		addErrorData(errData, address, options);
		retData.data.push(errData);
	});
	addErrorInfo(retData, error);
	return retData;
};
var parseErrors = function(addresses, errors, options) {
	// Options:
	// options.valueCache, options.customValues, options.deviceType, options.values, options.val
	var i;
	var num = addresses.length;
	var retResults = [];
	for(i = 0; i < num; i ++) {
		if(options.values) {
			options.val = options.values[i];
		}
		retResults.push(parseError(addresses[i], errors[i], options));
	}
	return retResults;

};
var parseResult = function(address, result, deviceType) {
	var dt;
	var regInfo = constants.getAddressInfo(address);
	var regName;
	var regAddress;
	if(regInfo.data) {
		regName = regInfo.data.name;
		regAddress = regInfo.data.address;
	} else {
		regName = '';
		regAddress = -1;
	}
	var retData = {
		'register': address,
		'name': regName,
		'address': regAddress,
		'res': result,
		'val': result,
	};
	var parsedData;
	var keys;
	var i;
	if(deviceType) {
		dt = driver_const.deviceTypes[deviceType];
		if(formatters[dt]) {
			if(formatters[dt][regName]) {
				if(formatters[dt][regName].decode) {
					parsedData = formatters[dt][regName].decode(result);
					keys = Object.keys(parsedData);
					for(i = 0; i < keys.length; i++) {
						retData[keys[i]] = parsedData[keys[i]];
					}
				}
			}
		}
	} else {
		var j;
		for(j = 0; j < numFormatterKeys; j++) {
			dt = formatterKeys[j];
			if(formatters[dt][regName]) {
				if(formatters[dt][regName].decode) {
					parsedData = formatters[dt][regName].decode(result);
					keys = Object.keys(parsedData);
					for(i = 0; i < keys.length; i++) {
						retData[keys[i]] = parsedData[keys[i]];
					}
				}
			}
		}
	}
	return retData;
};
var parseResults = function(addresses, results, deviceType) {
	var i;
	var num = addresses.length;
	var retResults = [];
	for(i = 0; i < num; i ++) {
		retResults.push(parseResult(addresses[i], results[i], deviceType));
	}
	return retResults;
};

var encodeValue = function(address, value, deviceType) {
	var dt;
	var regInfo = constants.getAddressInfo(address);
	var retData;
	var isString = false;
	if(regInfo.typeString !== 'STRING') {
		retData = 0;
	} else {
		isString = true;
		retData = '';
	}

	var regName = regInfo.data.name;
	var formattedResult = false;
	if(deviceType) {
		dt = driver_const.deviceTypes[deviceType];
		if(formatters[dt]) {
			if(formatters[dt][regName]) {
				if(formatters[dt][regName].encode) {
					formattedResult = true;
					retData = formatters[dt][regName].encode(value);
				}
			}
		}
	} else {
		var i;
		for(i = 0; i < numFormatterKeys; i++) {
			dt = formatterKeys[i];
			if(formatters[dt][regName]) {
				if(formatters[dt][regName].encode) {
					formattedResult = true;
					retData = formatters[dt][regName].encode(value);
				}
			}
		}
	}
	if(!formattedResult) {
			retData = value;
		}
	if(isString) {
		retData = retData.toString();
	}
	return retData;
};
var encodeValues = function(addresses, values, deviceType) {
	var i;
	var num = addresses.length;
	var retResults = [];
	for(i = 0; i < num; i ++) {
		retResults.push(encodeValue(addresses[i], results[i], deviceType));
	}
	return retResults;
};

var createDataParser = function(deviceType) {
	this.parseResult = function(address, result) {
		return parseResult(address, result, deviceType);
	};
	this.parseResults = function(addresses, results) {
		return parseResults(addresses, results, deviceType);
	};
	this.encodeValue = function(address, value) {
		return encodeValue(address, value, deviceType);
	};
	this.encodeValues = function(addresses, values) {
		return encodeValues(addresses, values, deviceType);
	};
	var self = this;
};

// Define External Interface
exports.createDataParser = createDataParser;
exports.parseResult = parseResult;
exports.parseResults = parseResults;
exports.encodeValue = encodeValue;
exports.encodeValues = encodeValues;
exports.parseError = parseError;
exports.parseErrors = parseErrors;
exports.parseErrorMultiple = parseErrorMultiple;