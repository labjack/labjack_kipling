const ref = require('ref-napi');       //Load variable type module

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

function verifyResultKeys(test, results, functionName) {
	var expectedKeys = [];
	expectedKeys.push('ljmError');
	var test_args = module.exports[functionName].test_args;
	test_args.forEach(function(test_arg) {
		var argName = Object.keys(test_arg)[0];
		expectedKeys.push(argName);
	});
	debug(Object.keys(results), expectedKeys);
	assert.deepEqual(
		Object.keys(results),
		expectedKeys,
		'Found unexpected return argument'
	);
}

function verifyNoLJMError(test, results, functionName) {
	var ljmError = results.ljmError;
	assert.equal(
		ljmError,
		0,
		'There should not have been an LJM Error calling' + functionName
	);
}

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

var scanIntArray = [];
for(var i = 0; i < 128; i++) {
	scanIntArray.push(0);
}

module.exports.LJM_ListAll = {
	'test_args': [
		{'DeviceType': 0},
		{'ConnectionType': 0},
		{'NumFound': 0},
		{'aDeviceTypes': scanIntArray},
		{'aConnectionTypes': scanIntArray},
		{'aSerialNumbers': scanIntArray},
		{'aIPAddresses': scanIntArray},
	],
	'throws_err': false,
	'custom_verify': function(test, results, cb) {
		if(results.ljmError) {
			console.log('We got an error...', results.ljmError);
		}
		verifyResultKeys(test, results, 'LJM_ListAll');
		verifyNoLJMError(test, results, 'LJM_ListAll');

		if(results.NumFound > 0) {
			var deviceData = [];

			for(var i = 0; i < results.NumFound; i++) {
				var ipStr = parseIPAddress(results.aIPAddresses[i]);
				deviceData.push({
					'DT': results.aDeviceTypes[i],
					'CT': results.aConnectionTypes[i],
					'SN': results.aSerialNumbers[i],
					'IP': ipStr,
				});
			}

			log(' - Found Devices (', results.NumFound, '):');
			deviceData.forEach(function(info) {
				log('  -', info);
			});
		}
		cb();
	},
};

module.exports.LJM_ListAllS = {
	'test_args': [
		{'DeviceType': 'LJM_dtANY'},
		{'ConnectionType': 'LJM_ctANY'},
		{'NumFound': 0},
		{'aDeviceTypes': scanIntArray},
		{'aConnectionTypes': scanIntArray},
		{'aSerialNumbers': scanIntArray},
		{'aIPAddresses': scanIntArray},
	],
	'throws_err': false,
	'custom_verify': function(test, results, cb) {
		verifyResultKeys(test, results, 'LJM_ListAllS');
		if(results.NumFound > 0) {
			var deviceData = [];

			for(var i = 0; i < results.NumFound; i++) {
				var ipStr = parseIPAddress(results.aIPAddresses[i]);
				deviceData.push({
					'DT': results.aDeviceTypes[i],
					'CT': results.aConnectionTypes[i],
					'SN': results.aSerialNumbers[i],
					'IP': ipStr,
				});
			}

			log(' - Found Devices (', results.NumFound, '):');
			deviceData.forEach(function(info) {
				log('  -', info);
			});
		}
		cb();
	},
};

var aBytesArray = [];
for(var i = 0; i < (128 * 2 * 1); i++) {
	aBytesArray.push(0);
}

module.exports.LJM_ListAllExtended = {
	'test_args': [
		{'DeviceType': 				0},
		{'ConnectionType': 			0},
		{'NumAddresses': 			1},
		{'aAddresses': 				[0]},
		{'aNumRegs': 				[2]},
		{'MaxNumFound': 			128},
		{'NumFound': 				0},
		{'aDeviceTypes': 			scanIntArray},
		{'aConnectionTypes': 		scanIntArray},
		{'aSerialNumbers': 			scanIntArray},
		{'aIPAddresses': 			scanIntArray},
		{'aBytes': 					aBytesArray},
	],
	'throws_err': false,
	'custom_verify': function(test, results, cb) {
		verifyResultKeys(test, results, 'LJM_ListAllExtended');
		Object.keys(results);
		if(results.NumFound > 0) {
			var deviceData = [];

			for(var i = 0; i < results.NumFound; i++) {
				var ipStr = parseIPAddress(results.aIPAddresses[i]);
				deviceData.push({
					'DT': results.aDeviceTypes[i],
					'CT': results.aConnectionTypes[i],
					'SN': results.aSerialNumbers[i],
					'IP': ipStr,
				});
			}

			log(' - Found Devices (', results.NumFound, '):');
			deviceData.forEach(function(info) {
				log('  -', info);
			});
		}
		cb();
	},
};


