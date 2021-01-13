

var q = require('q');
var async = require('async');
var driver_const = require('ljswitchboard-ljm_driver_constants');
var data_parser = require('ljswitchboard-data_parser');
var modbus_map = require('ljswitchboard-modbus_map').getConstants();
var REQUIRED_INFO_BY_DEVICE = require('../required_device_info').requiredInfo;

// var modbus_map = data_parser.getConstants();
var ljm_ffi = require('ljm-ffi');
var ljm = ljm_ffi.load();

var DEBUG_CURATED_DEVICE_READS = false;

function getLogger(bool) {
    return function logger() {
        if(bool) {
            console.log.apply(console, arguments);
        }
    };
}

var debugCuratedDeviceReads = getLogger(DEBUG_CURATED_DEVICE_READS);

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


function readCachedDeviceRegister(device, handle, deviceType, register, cb) {
	// If we made it into this function we can assume that we are working
	// with a curated device.
	var savedAttributes = device.curatedDevice.savedAttributes;

	// info about the register we are trying to read.
	var info = modbus_map.getAddressInfo(register, 0);
}
function readDeviceRegister(device, handle, deviceType, register, cb) {
	var info = modbus_map.getAddressInfo(register, 0);
	if(device.curatedDevice) {
		// console.log('VCT - ', handle, register);
		// var savedAttributes = device.curatedDevice.savedAttributes;
		// if(savedAttributes[register]) {
		// 	console.log('Cached info for', register, savedAttributes[register]);
		// } else {
		// 	console.log('Missing info for', register);
		// 	if(register === 'ETHERNET_IP') {

		// 	}
		// }
		// Try pulling data out of the savedAttributes object first
		var savedAttributes = device.curatedDevice.savedAttributes;
		if(savedAttributes[register] && register !== 'HARDWARE_INSTALLED') { // force HW-Installed reg to be c-read.
			debugCuratedDeviceReads('Cached info for', register, savedAttributes[register]);
			var pRes = data_parser.parseResult(
				info.address,
				savedAttributes[register],
				savedAttributes.deviceType
			);
			cb(pRes);
		} else {
			// If info wasn't in savedAttributes then try seeing if the value has been cached.
			debugCuratedDeviceReads('Reading Register',register);
			device.curatedDevice.cRead(register)
			.then(function(result) {
				debugCuratedDeviceReads('Reading Register',register);
				cb(result);
			}, function(err) {
				console.error('ljs-device_scanner ljm_utils: ERROR Cached READING', register, err);
				cb(err);
			});
		}
	} else {
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
							results.Value,
							deviceType
						);
						if(false) {
							console.log('READ REGISTER:', register, pRes);
						}
						cb(pRes);
					} else {
						console.log('ERROR READING INFO DURING OPENALL_SCAN (eRA)', handle, register, results.ljmError);

						var pErr = data_parser.parseError(
							info.address,
							results.ljmError,
							deviceType
						);
						var keys = Object.keys(pErr.defaultValue);
						keys.forEach(function(key) {
							pErr[key] = pErr.defaultValue[key];
						});
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
							results.String,
							deviceType
						);
						if(false) {
							console.log('READ REGISTER:', register, pRes);
						}
						cb(pRes);
					} else {
						console.log('ERROR READING INFO DURING OPENALL_SCAN (eRAS)', handle, register, results.ljmError);
						var pErr = data_parser.parseError(
							info.address,
							results.ljmError,
							deviceType
						);
						cb(pErr);
					}
				}
			);
		}
	}
}

function readAndParseRegisters(device, handle, deviceType, registers, cb) {
	var data = {};
	function getData(register, innerCB) {
		if(device.curatedDevice) {
			// readCachedDeviceRegister(device, handle, deviceType, register, function(regData) {
			// 	data[regData.name] = regData;
			// 	innerCB();
			// });
			readDeviceRegister(device, handle, deviceType, register, function(regData) {
				data[regData.name] = regData;
				innerCB();
			});
		} else {
			readDeviceRegister(device, handle, deviceType, register, function(regData) {
				data[regData.name] = regData;
				innerCB();
			});
		}
	}
	function returnResults(err) {
		cb(data);
	}
	async.eachSeries(registers, getData, returnResults);
}


function getProductType(deviceInfo) {
	var pt = driver_const.DEVICE_TYPE_NAMES[deviceInfo.dt];
	if(deviceInfo.dt === 7) {
		pt = deviceInfo.HARDWARE_INSTALLED.productType;
	} else if(deviceInfo.dt === 200) {
		pt = deviceInfo.DGT_INSTALLED_OPTIONS.productType;
	}
	return pt;
}
function getModelType(deviceInfo) {
	var mt = driver_const.DEVICE_TYPE_NAMES[deviceInfo.dt];
	if(deviceInfo.dt === 7) {
		mt = deviceInfo.HARDWARE_INSTALLED.productType;
	} else if(deviceInfo.dt === 200) {
		mt = deviceInfo.DGT_INSTALLED_OPTIONS.productType;
	}
	return mt;
}
/*
 * The "registers" argument is no longer valid.  It is over-written in function. 10/21/2019.
 */
function getDeviceInfo(device, handle, registers, cb) {
	var DEBUG_ALREADY_CONNECTED_DEVICE = false;
	// console.log('getDeviceInfo DEVICE', device);
	// debugCuratedDeviceReads('ljswitchboard-device_scanner/~/ljm_utils.js TODO: search for .isActive, and do similar things for device.savedAttributes.isConnected??');
	debugCuratedDeviceReads('getDeviceInfo for',handle, registers);
	var previouslyAcquiredHandleInfo = {
		isValid: false,
		DeviceType: null,
		ConnectionType: null,
		SerialNumber: null,
		IPAddress: null,
		Port: null,
		MaxBytesPerMB: null,
		productType: null,
		modelType: null,
	};
	if(device.curatedDevice) {
		// This case happens when a device has already been connected.
		debugCuratedDeviceReads('Device Info', device.curatedDevice.savedAttributes.serialNumber);
		debugCuratedDeviceReads('Device Info:', Object.keys(device.curatedDevice.savedAttributes));
		debugCuratedDeviceReads('Device Handle', handle);

		// Build previously acquired handle info object to be used instead of LJM call.
		previouslyAcquiredHandleInfo.DeviceType = device.curatedDevice.savedAttributes.deviceType;
		previouslyAcquiredHandleInfo.ConnectionType = device.curatedDevice.savedAttributes.connectionType;
		previouslyAcquiredHandleInfo.SerialNumber = device.curatedDevice.savedAttributes.serialNumber;
		previouslyAcquiredHandleInfo.IPAddress = device.curatedDevice.savedAttributes.ipAddress;
		previouslyAcquiredHandleInfo.Port = device.curatedDevice.savedAttributes.port;
		previouslyAcquiredHandleInfo.MaxBytesPerMB = device.curatedDevice.savedAttributes.maxBytesPerMB;
		previouslyAcquiredHandleInfo.isValid = true;
		
		debugCuratedDeviceReads('Info',previouslyAcquiredHandleInfo);
		// Print out saved device attribute keys.
		// var attrsToPrint = [
		// 	'isConnected', 'productType', 'deviceType', 'connectionType',
		// ];
		// attrsToPrint.forEach(function(attr) {
		// 	console.log(attr, device.curatedDevice.savedAttributes[attr]);
		// });
	} else {
		// This case happens when a device has been found by a scan.
		// console.log('Weird Connection???', device);
	}

	var deviceInfo = {};
	function handleReadData(results) {
		var isError = false;
		var keys = Object.keys(results);
		keys.forEach(function(key) {
			deviceInfo[key] = results[key];
			if(results[key].errorCode) {
				isError = true;
			}
		});

		deviceInfo.acquiredRequiredData = !isError;
		deviceInfo.productType = getProductType(deviceInfo);
		deviceInfo.modelType = getModelType(deviceInfo);

		debugCuratedDeviceReads('Device Info', deviceInfo.handle, Object.keys(deviceInfo));
		cb(deviceInfo);
	}

	function handleGetHandleInfo(handleInfo) {
		deviceInfo.handle = handle;

		var dt = handleInfo.DeviceType;
		deviceInfo.dt = dt;
		deviceInfo.deviceType = dt;
		deviceInfo.deviceTypeStr = driver_const.DRIVER_DEVICE_TYPE_NAMES[dt];
		deviceInfo.deviceTypeString = driver_const.DRIVER_DEVICE_TYPE_NAMES[dt];
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

		var reqRegisters = REQUIRED_INFO_BY_DEVICE[deviceInfo.deviceTypeStr];
		readAndParseRegisters(device, handle, dt, reqRegisters, handleReadData);
	}

	if(previouslyAcquiredHandleInfo.isValid) {
		setImmediate(function() {
			handleGetHandleInfo(previouslyAcquiredHandleInfo);
		});
	} else {
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

function closeDevice (handle, cb) {
	function handleDeviceClose(closeInfo) {
		var deviceClosed = false;
		var closeError = closeInfo.ljmError;
		if(closeInfo.ljmError === 0) {
			deviceClosed = true;
		} else {
			deviceClosed = false;
		}
		
		cb({
			deviceClosed: deviceClosed,
			closeError: closeError,
		});
	}
	ljm.LJM_Close.async(
		handle,
		handleDeviceClose
	);
}
module.exports.closeDevice = closeDevice;
