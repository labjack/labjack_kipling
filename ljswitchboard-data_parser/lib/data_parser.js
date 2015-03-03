

var data_formatters = require('./data_formatters');

var modbus_map = require('ljswitchboard-modbus_map');
var constants = modbus_map.getConstants();
var driver_const = require('ljswitchboard-ljm_driver_constants');

var formatters = data_formatters.list;
var formatterKeys = Object.keys(formatters);
var numFormatterKeys = formatterKeys.length;

var parseResult = function(address, result, deviceType) {
	var dt;
	var regInfo = constants.getAddressInfo(address);
	var regName = regInfo.data.name;
	var retData = {
		'register': address,
		'name': regName,
		'address': regInfo.data.address,
		'res': result,
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
		retResults.push(parseResult(addresses[i], results[i]));
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
	if(deviceType) {
		dt = driver_const.deviceTypes[deviceType];
		if(formatters[dt]) {
			if(formatters[dt][regName]) {
				if(formatters[dt][regName].encode) {
					retData = formatters[dt][regName].encode(value);
				}
			}
		} else {
			retData = value;
		}
	} else {
		var i;
		var formattedResult = false;
		for(i = 0; i < numFormatterKeys; i++) {
			dt = formatterKeys[i];
			if(formatters[dt][regName]) {
				if(formatters[dt][regName].encode) {
					formattedResult = true;
					retData = formatters[dt][regName].encode(value);
				}
			}
		}
		if(!formattedResult) {
			retData = value;
		}
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
		retResults.push(encodeValue(addresses[i], results[i]));
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