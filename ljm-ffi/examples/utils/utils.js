
try {
    ref = require('ref');       //Load variable type module
} catch(err) {
    ref = require('ref-napi');       //Load variable type module
}

var ljm_ffi = require('../../lib/ljm-ffi');
var ljm = ljm_ffi.load();

function parseIPAddress(ipInt) {
	var ipAddr = Buffer.alloc(4);
	ipAddr.writeUInt32LE(ipInt, 0);
	
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
			'H': handle,
			'DT': data.DeviceType,
			'CT': data.ConnectionType,
			'SN': data.SerialNumber,
			'IP': ipStr,
			'P': data.Port,
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
		'H': handle,
		'DT': data.DeviceType,
		'CT': data.ConnectionType,
		'SN': data.SerialNumber,
		'IP': ipStr,
		'P': data.Port,
	};
	return deviceData;
}
module.exports.getHandleInfoSync = getHandleInfoSync;

function getDeviceInfoSync(handle) {
	var handleInfo = ljm.LJM_GetHandleInfo(
		handle, // Handle
		0, // DeviceType
		0, // ConnectionType
		0, // SerialNumber
		0, // IPAddress
		0, // Port
		0 // MaxBytesPerMB
	);
	var ipStr = parseIPAddress(handleInfo.IPAddress);

	var deviceNameData = ljm.LJM_eReadNameString(handle, 'DEVICE_NAME_DEFAULT', '');
	var deviceName = deviceNameData.String;

	var wifiIPData = ljm.LJM_eReadName(handle, 'WIFI_IP', 0);
	var wifiIP = parseIPAddress(wifiIPData.Value);

	var ethernetIPData = ljm.LJM_eReadName(handle, 'ETHERNET_IP', 0);
	var ethernetIP = parseIPAddress(ethernetIPData.Value);

	var firmwareVersionData = ljm.LJM_eReadName(handle, 'FIRMWARE_VERSION', 0);
	var firmwareVersion = parseFloat(firmwareVersionData.Value.toFixed(4));

	console.log('DN', deviceName);
	console.log('WI', wifiIP);
	console.log('EI', ethernetIP);
	console.log('FV', firmwareVersion);

	var deviceData = {
		'H': handle,
		'DT': handleInfo.DeviceType,
		'CT': handleInfo.ConnectionType,
		'SN': handleInfo.SerialNumber,
		'IP': ipStr,
		'P': handleInfo.Port,
		'DN': deviceName,
		'EIP': ethernetIP,
		'WIP': wifiIP,
		'FV': firmwareVersion,
	};
	return deviceData;
}
module.exports.getDeviceInfoSync = getDeviceInfoSync;

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
