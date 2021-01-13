

var checkStr = function(str) {
	if(str) {
		return str;
	} else {
		return '';
	}
};
exports.checkStr = checkStr;

var parseIP = function(ipNum) {
	var isReal = false;
	if(ipNum !== 0) {
		isReal = true;
	}
	var ipStr = '';
	var ipAddr = Buffer.alloc(4);
	var text = '';
	ipAddr.writeUInt32LE(ipNum, 0);
	ipStr += ipAddr.readUInt8(3).toString();
	ipStr += '.';
	ipStr += ipAddr.readUInt8(2).toString();
	ipStr += '.';
	ipStr += ipAddr.readUInt8(1).toString();
	ipStr += '.';
	ipStr += ipAddr.readUInt8(0).toString();
	if(isReal) {
		text = ipStr;
	} else {
		text = 'Not Connected';
	}
	return {'str': ipStr, 'isReal':isReal, 'val': ipStr, 'text': text};
};
exports.parseIP = parseIP;

var encodeIP = function(ipStr) {
	var retData = 0;
	try {
		if(isNaN(ipStr)) {
			var ipBuf, i, ipVals;
			var convert = false;
			// If the ipStr is not a number, aka most likely an IP address
			if(ipStr.split) {
				ipVals = ipStr.split('.');
				convert = true;
			} else if(Array.isArray(ipStr)) {
				ipVals = ipStr;
				convert = true;
			}
			if(convert) {
				ipBuf = Buffer.alloc(4);
				ipBuf.fill(0);
				if(ipVals.length == 4) {
					for(i = 0; i < 4; i ++) {
						if(!isNaN(ipVals[i])) {
							ipBuf.writeUInt8(parseInt(ipVals[i], 10), i);
						}
					}
				}
				retData = ipBuf.readUInt32BE(0);
			}
		} else {
			// Treat the input as a number
			retData = Number(ipStr);
		}
	} catch(err) {
		retData = 0;
	}
	return retData;
};
exports.encodeIP = encodeIP;

// Force users to input value as a string IP address
var ipValidatorRegixEq = /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
var ipValidator = function(data) {
	var retData = {
		'isValid': false,
		'reason': ''
	};
	try {
		if(data.match) {
			if(data.match(ipValidatorRegixEq)) {
				retData.isValid = true;
			} else {
				retData.reason = 'invalid IP string.';
			}
		} else {
			if(isNaN(data)) {
				retData.reason = 'invalid data-type.';
			} else {
				var ipNum = Number(data);
				if((0 <= ipNum) && (ipNum <= 0xFFFFFFFF)) {
					retData.isValid = true;
				} else {
					retData.reason = 'invalid IP integer.  Out of range 0 -> 0xFFFFFFFF.';
				}
			}
		}
	} catch(err) {
		retData.isValid = false;
		retData.reason = 'Error encountered: ' + err.toString();
	}

	if(!retData.isValid) {
		retData.reason = 'IP address validation failed, ' + retData.reason;
	}
	return retData;
};

var ipDataType = {
	'decode': parseIP,
	'encode': encodeIP,
	'validate': ipValidator,
};
exports.ipDataType = ipDataType;

var statusBooleans = {
	'enabled': 1, 'enable': 1,
	'powered': 1, 'power': 1,
	'started': 1, 'start': 1,

	'disabled': 0, 'disable': 0,
	'un-powered': 0, 'un-power': 0, 'unpower': 0, 'unpowered': 0,
	'stop': 0, 'stopped': 0,
};
var statusBooleanResults = {
	'STREAM_ENABLE': {0: 'Stream Not Running', 1: 'Stream Running'},
};
var getSystemEnabledType = function(options) {
	var falseStr = 'Disabled';
	var trueStr = 'Enabled';
	var falseText = 'Disabled';
	var trueText = 'Enabled';

	if(options) {
		if(typeof(options.falseStr) !== 'undefined') {
			falseStr = options.falseStr;
		}
		if(typeof(options.trueStr) !== 'undefined') {
			trueStr = options.trueStr;
		}
		if(typeof(options.falseText) !== 'undefined') {
			falseText = options.falseText;
		}
		if(typeof(options.trueText) !== 'undefined') {
			trueText = options.trueText;
		}
		if(typeof(options.statusText) !== 'undefined') {
			var statusTextOptions = options.statusText.split('/');
			trueText = statusTextOptions[0];
			falseText = statusTextOptions[1];
		}
		if(typeof(options.textPrepend) !== 'undefined') {
			falseText = options.textPrepend + ' ' + falseText;
			trueText = options.textPrepend + ' ' + trueText;
		}
	}
	var parseSystemEnabled = function(status) {
		var statusStr = falseStr;
		var statusText = falseText;
		if(status === 1) {
			statusStr = trueStr;
			statusText = trueText;
		}
		return {'str': statusStr, 'text': statusText, 'val': status};
	};
	var encodeSystemEnabled = function(status) {
		var retData = 0;
		if(isNaN(status)) {
			tempStr = '';
			if(status.toLowerCase) {
				var tempStr = status.toLowerCase();
				if(typeof(statusBooleans[tempStr]) !== 'undefined') {
					retData = statusBooleans[tempStr];
				}
			}
		} else {
			retData = Number(status);
		}
		return retData;
	};
	var systemEnabledType = {
		'decode': parseSystemEnabled,
		'encode': encodeSystemEnabled,
	};
	return systemEnabledType;
};
exports.systemEnabledType = getSystemEnabledType();
exports.getSystemEnabledType = getSystemEnabledType;

var firmwareVersionRounder = function(res) {
	return {
		'val': parseFloat(res.toFixed(4)),
		'str': res.toFixed(4)
	};
};

var hardwareVersionRounder = function(res) {
	var val = parseFloat(res.toFixed(2));
	return {
		'val': val,
		'str': val.toPrecision(3),
	};
};

function bitmaskParser(res) {
	return {
		'res': res,
		'val': res,
		'str': res.toString(10),
		'binaryStr': 'b' + res.toString(2),
		'hexStr': '0x' + res.toString(16),
	};
}
exports.firmwareVersionRounder = firmwareVersionRounder;

var SHARED_LIST = {
	'FIRMWARE_VERSION': {
		'decode': firmwareVersionRounder
	},
	'BOOTLOADER_VERSION': {
		'decode': firmwareVersionRounder,
	},
	'HARDWARE_VERSION': {
		'decode': hardwareVersionRounder,
	},
	'DIO_STATE': {
		'decode': bitmaskParser,
	},
	'DIO_DIRECTION': {
		'decode': bitmaskParser,
	},
	'DIO_ANALOG_ENABLE': {
		'decode': bitmaskParser,
	},
	
};

exports.SHARED_LIST = SHARED_LIST;