
// Load the LJM Library.
var ljm_ffi = require('../lib/ljm-ffi');
var ljm = ljm_ffi.load();

// Load a utility function to get the connected device's info.
var utils = require('../examples/utils/utils');
var getHandleInfoSync = utils.getHandleInfoSync;
var getDeviceInfoSync = utils.getDeviceInfoSync;

// Define a variable that will store data from LJM function calls
var data;

// Initialize an array of length 128.
var aHandles = [];
for(var i = 0; i < 128; i++) { aHandles.push(0); }


function parseOpenAllData(openAllData, userStr) {
	var handleInfo = [];
	var numOpened = openAllData.NumOpened;
	var handles = [];
	for(var i = 0; i < numOpened; i++) {
		handles.push(openAllData.aHandles[i]);
		// handleInfo.push(getHandleInfoSync(openAllData.aHandles[i]));
		handleInfo.push(getDeviceInfoSync(openAllData.aHandles[i]));
	}
	console.log(userStr);
	console.log(handleInfo);
	console.log();
}

function performListAllTCP() {
	// Perform the open-all call.
	console.log('Performing OpenAll TCP');
	var openAllData = ljm.Internal_LJM_OpenAll(7, 2, 0, aHandles, 0,0, '');

	parseOpenAllData(openAllData, 'Opened Devices TCP:');
}

function performListAllUDP() {
	// Perform the open-all call.
	console.log('Performing OpenAll UDP');
	var openAllData = ljm.Internal_LJM_OpenAll(7, 5, 0, aHandles, 0,0, '');

	parseOpenAllData(openAllData, 'Opened Devices UDP:');
}

// LJM_FUNCTIONS.LJM_ListAll = {
// 	'ret': [{'LJM_ERROR_RETURN': 	'int'}],
// 	'args': [
// 		{'DeviceType': 				'int'},
// 		{'ConnectionType': 			'int'},
// 		{'NumFound': 				'int*'},
// 		{'aDeviceTypes': 			'a-int*'},
// 		{'aConnectionTypes': 		'a-int*'},
// 		{'aSerialNumbers': 			'a-int*'},
// 		{'aIPAddresses': 			'a-int*'},
// 	]
// };
function performListAllDevices() {
	// Perform the ListAll call.
	console.log('Performing List All');
	var aDeviceTypes = aHandles;
	var aConnectionTypes = aHandles;
	var aSerialNumbers = aHandles;
	var aIPAddresses = aHandles;
	var listAllData = ljm.LJM_ListAll(7, 0, 1, aDeviceTypes, aConnectionTypes, aSerialNumbers, aIPAddresses);
	console.log('Found Devices:', listAllData.NumFound);
}
// performListAllDevices();
// Perform device scan and print results.
// performListAllUDP();

function performListAllDigit() {
	// Perform the open-all call.
	console.log('Performing OpenAll Digits');
	var openAllData = ljm.Internal_LJM_OpenAll(200, 0, 0, aHandles, 0,0, '');

	parseOpenAllData(openAllData, 'Opened Digits:');
}

performListAllDigit();

// Close all devices
data = ljm.LJM_CloseAll();
