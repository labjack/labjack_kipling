

var checkStr = function(str) {
	if(str) {
		return str;
	} else {
		return '';
	}
};

var parseIP = function(ipNum) {
	var isReal = false;
	if(ipNum !== 0) {
		isReal = true;
	}
	var ipStr = "";
	var ipAddr = new Buffer(4);
	ipAddr.writeUInt32LE(ipNum, 0);
	ipStr += ipAddr.readUInt8(3).toString();
	ipStr += ".";
	ipStr += ipAddr.readUInt8(2).toString();
	ipStr += ".";
	ipStr += ipAddr.readUInt8(1).toString();
	ipStr += ".";
	ipStr += ipAddr.readUInt8(0).toString();
	return {'str': ipStr, 'isReal':isReal};
};
exports.parseIP = parseIP;

var encodeIP = function(ipStr) {
	var ipBuf = new Buffer(4);
	var i;
	ipBuf.fill(0);
	if(ipStr.split) {
		var ipVals = ipStr.split('.');
		if(ipVals.length == 4) {
			for(i = 0; i < 4; i ++) {
				if(!isNaN(ipVals[i])) {
					ipBuf.writeUInt8(parseInt(ipVals[i], 10), i);
				}
			}
		}
	}
	return ipBuf.readUInt32BE(0);
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