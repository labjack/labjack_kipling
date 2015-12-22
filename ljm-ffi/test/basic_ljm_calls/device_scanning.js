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
	'custom_verify': function(test, results) {
		if(results.NumFound > 0) {
			var deviceTypes = [];
			var connectionTypes = [];
			var serialNumbers = [];
			var ipAddresses = [];
			for(var i = 0; i < results.NumFound; i++) {
				deviceTypes.push(results.aDeviceTypes[i]);
				connectionTypes.push(results.aConnectionTypes[i]);
				serialNumbers.push(results.aSerialNumbers[i]);
				ipAddresses.push(results.aIPAddresses[i]);
			}
			console.log('Results:', results.NumFound);
			console.log('deviceTypes', deviceTypes);
			console.log('connectionTypes', connectionTypes);
			console.log('serialNumbers', serialNumbers);
			console.log('ipAddresses', ipAddresses);
		}
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
	'custom_verify': function(test, results) {
		if(results.NumFound > 0) {
			var deviceTypes = [];
			var connectionTypes = [];
			var serialNumbers = [];
			var ipAddresses = [];
			for(var i = 0; i < results.NumFound; i++) {
				deviceTypes.push(results.aDeviceTypes[i]);
				connectionTypes.push(results.aConnectionTypes[i]);
				serialNumbers.push(results.aSerialNumbers[i]);
				ipAddresses.push(results.aIPAddresses[i]);
			}
			console.log('Results:', results.NumFound);
			console.log('deviceTypes', deviceTypes);
			console.log('connectionTypes', connectionTypes);
			console.log('serialNumbers', serialNumbers);
			console.log('ipAddresses', ipAddresses);
		}
	},
};

var aBytesArray = [];
for(var i = 0; i < (128 * 2 * 1); i++) {
	aBytesArray.push(0);
}

module.exports.LJM_ListAllExtended = {
	'test_args': [
		{'DeviceType': 				0},
		{'Connection Type': 		0},
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
	'custom_verify': function(test, results) {
		console.log('We are here!!')
		if(results.NumFound > 0) {
			var deviceTypes = [];
			var connectionTypes = [];
			var serialNumbers = [];
			var ipAddresses = [];
			for(var i = 0; i < results.NumFound; i++) {
				deviceTypes.push(results.aDeviceTypes[i]);
				connectionTypes.push(results.aConnectionTypes[i]);
				serialNumbers.push(results.aSerialNumbers[i]);
				ipAddresses.push(results.aIPAddresses[i]);
			}
			console.log('Results:', results.NumFound);
			console.log('deviceTypes', deviceTypes);
			console.log('connectionTypes', connectionTypes);
			console.log('serialNumbers', serialNumbers);
			console.log('ipAddresses', ipAddresses);
		}
	},
};

