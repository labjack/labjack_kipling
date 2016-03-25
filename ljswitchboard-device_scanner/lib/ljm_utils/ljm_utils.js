
var ref = require('ref');
var q = require('q');
var async = require('async');
var driver_const = require('ljswitchboard-ljm_driver_constants');
var data_parser = require('ljswitchboard-data_parser');
var modbus_map = require('ljswitchboard-modbus_map').getConstants();
// var modbus_map = data_parser.getConstants();
var ljm_ffi = require('ljm-ffi');
var ljm = ljm_ffi.load();

function parseIPAddress(ipInt) {
	var ipAddr = new Buffer(4);
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
			'ljmError': data.ljmError,
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

function readDeviceRegister(handle, register, cb) {
	var info = modbus_map.getAddressInfo(register, 0);
	if(info.typeString !== 'STRING') {
		// data_parser.parseResult
		ljm.LJM_eReadAddress.async(
			handle, // Handle
			info.address,
			info.type,
			0,
			function(results) {
				if(results.ljmError === 0) {
					var pRes = data_parser.parseResult(
						info.address,
						results.Value
					);
					cb(pRes);
				} else {
					var pErr = data_parser.parseError(
						info.address,
						results.ljmError
					);
					cb(pErr);
				}
			}
		);
	} else {
		// data_parser.parseResult
		ljm.LJM_eReadAddressString.async(
			handle, // Handle
			info.address,
			'',
			function(results) {
				if(results.ljmError === 0) {
					var pRes = data_parser.parseResult(
						info.address,
						results.String
					);
					cb(pRes);
				} else {
					var pErr = data_parser.parseError(
						info.address,
						results.ljmError
					);
					cb(pErr);
				}
			}
		);
	}
}

function readAndParseRegisters(handle, registers, cb) {
	var data = {};
	function getData(register, innerCB) {
		readDeviceRegister(handle, register, function(regData) {
			data[regData.name] = regData;
			innerCB();
		});
	}
	function returnResults(err) {
		cb(data);
	}
	async.eachSeries(registers, getData, returnResults);
}

function getDeviceInfo(handle, registers, cb) {

	var deviceInfo = {};
	function handleReadData(results) {
		var keys = Object.keys(results);
		keys.forEach(function(key) {
			deviceInfo[key] = results[key];
		});
		// console.log('Device Info', deviceInfo);
		cb(deviceInfo);
	}

	function handleGetHandleInfo(handleInfo) {
		deviceInfo.handle = handle;

		var dt = handleInfo.DeviceType;
		deviceInfo.dt = dt;
		deviceInfo.deviceType = dt;
		deviceInfo.deviceTypeStr = driver_const.DRIVER_DEVICE_TYPE_NAMES[dt];
		deviceInfo.deviceTypeName = driver_const.DEVICE_TYPE_NAMES[dt];

		var ct = handleInfo.ConnectionType;
		deviceInfo.handleConnectionType = ct;
		deviceInfo.handleConnectionTypeStr = driver_const.DRIVER_CONNECTION_TYPE_NAMES[ct];
		deviceInfo.handleConnectionTypeName = driver_const.CONNECTION_TYPE_NAMES[ct];
		
		var liveCT = driver_const.CONNECTION_MEDIUM[ct];
		deviceInfo.ct = liveCT;
		deviceInfo.connectionType = liveCT;
		deviceInfo.connectionTypeStr = driver_const.DRIVER_CONNECTION_TYPE_NAMES[liveCT];
		deviceInfo.connectionTypeName = driver_const.CONNECTION_TYPE_NAMES[liveCT];

		deviceInfo.serialNumber = handleInfo.SerialNumber;
		deviceInfo.ip = parseIPAddress(handleInfo.IPAddress);
		deviceInfo.port = handleInfo.Port;
		deviceInfo.maxBytesPerMB = handleInfo.MaxBytesPerMB;
		readAndParseRegisters(handle, registers, handleReadData);
	}

	var res = ljm.LJM_GetHandleInfo.async(
		handle, // Handle
		0, // DeviceType
		0, // ConnectionType
		0, // SerialNumber
		0, // IPAddress
		0, // Port
		0, // MaxBytesPerMB
		handleGetHandleInfo
	);
}
module.exports.getDeviceInfo = getDeviceInfo;

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

var DEBUG_VERIFY_DEVICE_CONNECTION = false;
function verifyDeviceConnection(dt, ct, id, cb) {
	var deviceOpened = false;
	var openError = 0;
	var deviceHandle = 0;
	var deviceClosed = false;
	var closeError = 0;
	var isVerified = false;
	var ljmHandleInfo = {};
	function handleDeviceClose(closeInfo) {
		if(DEBUG_VERIFY_DEVICE_CONNECTION) {
			console.log('VCT - in handleDeviceClose', deviceHandle, closeInfo.ljmError, ct, id);
		}
		closeError = closeInfo.ljmError;
		if(closeInfo.ljmError === 0) {
			deviceClosed = true;
		} else {
			deviceClosed = false;
		}
		isVerified = deviceOpened && deviceClosed;
		// isVerified = deviceOpened;
		if(deviceOpened) {
			if(!deviceClosed) {
				console.error(
					'Error Closing Opened Device.... Uh... WEIRD! device_scanner, ljm_utils',
					dt, ct, id, closeError);
			}
		}
		cb({
			deviceOpened: deviceOpened,
			openError: openError,
			deviceClosed: deviceClosed,
			closeError: closeError,
			isVerified: isVerified,
			handleInfo: ljmHandleInfo,
		});
	}
	function handleGetHandleInfo(handleInfo) {
		if(DEBUG_VERIFY_DEVICE_CONNECTION) {
			console.log('VCT - in handleGetHandleInfo', deviceHandle, handleInfo.ljmError, ct, id);
		}
		ljmHandleInfo = handleInfo;
		ljm.LJM_Close.async(deviceHandle, handleDeviceClose);
	}
	function handleDeviceOpen(openInfo) {
		deviceHandle = openInfo.handle;
		if(DEBUG_VERIFY_DEVICE_CONNECTION) {
			console.log('VCT - in handleDeviceOpen', deviceHandle, openInfo.ljmError, ct, id);
		}
		openError = openInfo.ljmError;
		if(openInfo.ljmError === 0) {
			deviceOpened = true;
			// 
			getHandleInfo(deviceHandle, handleGetHandleInfo);
		} else {
			ljm.LJM_Close.async(deviceHandle, handleDeviceClose);
		}
	}
	if(DEBUG_VERIFY_DEVICE_CONNECTION) {
		console.log('VCT - Opening Device', ct, id);
	}
	ljm.LJM_Open.async(
		dt,
		ct,
		id,
		0, // Handle
		handleDeviceOpen
	);
}
module.exports.verifyDeviceConnection = verifyDeviceConnection;
