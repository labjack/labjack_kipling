var async = require('async');
var ref = require('ref');

var ENABLE_DEBUG = false;
function debug() {
	if(ENABLE_DEBUG) {
		console.log.apply(console, arguments);
	}
}
var ENABLE_LOG = true;
function log() {
	if(ENABLE_LOG) {
		console.log.apply(console, arguments);
	}
}

var scanIntArray = [];
for(var i = 0; i < 128; i++) {
	scanIntArray.push(0);
}
var aBytesArray = [];
for(var i = 0; i < (128 * 2 * 1); i++) {
	aBytesArray.push(0);
}

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





module.exports.LJM_OpenAll = {
	'test_args': [
		{'DeviceType': 				0},
		{'ConnectionType': 			0},
		{'NumOpened': 				0},
		{'aHandles': 				scanIntArray},
		{'NumErrors': 				0},
		{'aErrors': 				scanIntArray},
	],
	'throws_err': false,
	'custom_verify': function(test, results, cb) {
		debug('ljmError', results.ljmError);
		debug('ConnectionType', results.ConnectionType);
		debug('NumOpened', results.NumOpened);
		// debug('aHandles', results.aHandles);
		debug('NumErrors', results.NumErrors);
		var handles = [];
		for(var i = 0; i < results.NumOpened; i++) {
			handles.push(results.aHandles[i]);
		}
		
		getHandleInfos(handles, function(infos) {
			log(' - Found Devices (', infos.length, '):');
			infos.forEach(function(info) {
				log('  -', info);
			});
			cb();
		});
	},
};

module.exports.LJM_CloseAll = {
	'test_args': [],
	'throws_err': false,
	'custom_verify': function(test, results, cb) {
		// console.log('Finished closing all...', results);
		cb();
	}
};
