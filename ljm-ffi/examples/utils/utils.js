
var ref = require('ref');

var ljm_ffi = require('../../lib/ljm-ffi');
var ljm = ljm_ffi.load();

function parseIPAddress(ipInt) {
	var ipAddr = ref.alloc('int', 1);
	ipAddr.writeInt32LE(ipInt, 0);
	
	var ipStr = "";
	ipStr += ipAddr.readUInt8(3).toString();
	ipStr += ".";
	ipStr += ipAddr.readUInt8(2).toString();
	ipStr += ".";
	ipStr += ipAddr.readUInt8(1).toString();
	ipStr += ".";
	ipStr += ipAddr.readUInt8(0).toString();
	return ipStr;
}
module.exports.parseIPAddress = parseIPAddress;

function getHandleInfo(handle, cb) {
	function handleInfoReporter(data) {
		// console.log('Handle Info', data);
		var ipStr = parseIPAddress(data.IPAddress);
		var deviceData = {
			'DT': data.DeviceType,
			'CT': data.ConnectionType,
			'SN': data.SerialNumber,
			'IP': ipStr,
		};
		cb(deviceData);
	}
	var res = ljm.LJM_GetHandleInfo.async(
		handle, // Handle
		0, // DeviceType
		0, // ConnectionType
		0, // SerialNumber
		0, // IPAddress
		0, // Port
		0, // MaxBytesPerMB
		handleInfoReporter
	);
}
module.exports.getHandleInfo = getHandleInfo;

function getHandleInfoSync(handle) {
	var data = ljm.LJM_GetHandleInfo(
		handle, // Handle
		0, // DeviceType
		0, // ConnectionType
		0, // SerialNumber
		0, // IPAddress
		0, // Port
		0 // MaxBytesPerMB
	);
	var ipStr = parseIPAddress(data.IPAddress);
	var deviceData = {
		'DT': data.DeviceType,
		'CT': data.ConnectionType,
		'SN': data.SerialNumber,
		'IP': ipStr,
	};
	return deviceData;
}
module.exports.getHandleInfoSync = getHandleInfoSync;

var ENABLE_DEBUG = false;
function debug() {
	if(ENABLE_DEBUG) {
		console.log.apply(console, arguments);
	}
}
module.exports.debug = debug;

var ENABLE_LOG = true;
function log() {
	if(ENABLE_LOG) {
		console.log.apply(console, arguments);
	}
}
module.exports.log = log;
