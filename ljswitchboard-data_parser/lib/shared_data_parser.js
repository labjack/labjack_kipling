

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
	var ipAddr = new Buffer(4);
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
				ipBuf = new Buffer(4);
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
			retData = parseInt(ipStr, 10);
		}
	} catch(err) {
		retData = 0;
	}
	return retData;
};
exports.encodeIP = encodeIP;

var ipDataType = {
	'decode': parseIP,
	'encode': encodeIP
};

var firmwareVersionRounder = function(res) {
	return {
		'val': parseFloat(res.toFixed(4)),
		'str': res.toFixed(4)
	};
};
exports.firmwareVersionRounder = firmwareVersionRounder;

var SHARED_LIST = {
	'FIRMWARE_VERSION': {
		'decode': firmwareVersionRounder
	},
	'BOOTLOADER_VERSION': {
		'decode': firmwareVersionRounder,
	},
};

exports.SHARED_LIST = SHARED_LIST;