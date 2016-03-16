
var async = require('async');
var ref = require('ref');
var q = require('q');
var ljm_ffi = require('../../lib/ljm-ffi');
var ljm = ljm_ffi.load();


function parseIPAddress(ipInt) {
	var ipAddr = ref.alloc('uint', 1);
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

function getHandleInfos(handles, cb) {
	var deviceData = [];
	function getHandleInfo(handle, innerCB) {
		var res = ljm.LJM_GetHandleInfo.async(
			handle, // Handle
			0, // DeviceType
			0, // ConnectionType
			0, // SerialNumber
			0, // IPAddress
			0, // Port
			0, // MaxBytesPerMB
			function handleInfoReporter(data) {
				// console.log('Handle Info', data);
				var ipStr = parseIPAddress(data.IPAddress);
				deviceData.push({
					'DT': data.DeviceType,
					'CT': data.ConnectionType,
					'SN': data.SerialNumber,
					'IP': ipStr,
				});
				innerCB();
			}
		);
	}
	function finished(err) {
		cb(deviceData);
	}
	async.each(handles, getHandleInfo, finished);
}
module.exports.getHandleInfos = getHandleInfos;

function getDeviceInfos(handles, cb) {
	var deviceData = {};
	function getHandleInfo(handle, innerCB) {
		var res = ljm.LJM_GetHandleInfo.async(
			handle, // Handle
			0, // DeviceType
			0, // ConnectionType
			0, // SerialNumber
			0, // IPAddress
			0, // Port
			0, // MaxBytesPerMB
			function handleInfoReporter(data) {
				// console.log('Handle Info', data);
				var ipStr = parseIPAddress(data.IPAddress);
				deviceData[handle] = {
					'DT': data.DeviceType,
					'CT': data.ConnectionType,
					'SN': data.SerialNumber,
					'IP': ipStr,
				};
				innerCB();
			}
		);
	}

	function finishedHandleInfo(err) {
		async.each(handles, getRemainingInfo, finishedCollectingInfo);
	}

	function getRemainingInfo(handle, innerCB) {
		var res = ljm.LJM_eReadNames.async(
			handle, // Handle
			2,
			['FIRMWARE_VERSION', 'HARDWARE_INSTALLED'],
			[0, 0],
			0,
			function handleReadNames(data) {
				if(data.ljmError === 0) {
					// console.log('Read Data', data);
					var fwVersionVal = data.aValues[0];
					var fw = parseFloat(fwVersionVal.toFixed(4));
					var hwInstalledVal = data.aValues[1];


					deviceData[handle].FW = fw;
				} else {
					deviceData[handle].FW = -1;
				}
				innerCB();
			}
		);
	}

	function finishedCollectingInfo(err) {
		var deviceDataArray = [];
		var keys = Object.keys(deviceData);
		keys.forEach(function(key) {
			deviceDataArray.push(deviceData[key]);
		});
		cb(deviceDataArray);
	}

	async.each(handles, getHandleInfo, finishedHandleInfo);
}
module.exports.getDeviceInfos = getDeviceInfos;