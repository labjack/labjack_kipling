
// Load the LJM Library.
var ljm_ffi = require('../lib/ljm-ffi');
var ljm = ljm_ffi.load();

// Load a utility function to get the connected device's info.
var utils = require('../examples/utils/utils');
var getHandleInfoSync = utils.getHandleInfoSync;

// Define a variable that will store data from LJM function calls
var data;

// Define a variable that will store the device's handle.
var handle;

console.log('Please make sure that there are 2-3 T7\'s connected to your network');
console.log();

function openOneEthernetDevice() {
	// Open the first found T7.
	console.log('Opening the first found Ethernet device');
	data = ljm.LJM_OpenS('LJM_dtT7', 'LJM_ctUDP', 'LJM_idANY', 0);

	// Exit the program if a device was not found.
	if(data.ljmError !== 0) {
		console.log('Failed to open a device, please connect a T7 to your computer.');
		process.exit();
	} else {
		handle = data.handle;
		console.log('Connected to device via OpenS:');
		console.log(getHandleInfoSync(handle));
		console.log();
	}
}
openOneEthernetDevice();

// Initialize an array of length 128.
var aHandles = [];
for(var i = 0; i < 128; i++) { aHandles.push(0); }


function parseOpenAllData(openAllData, userStr) {
	var handleInfo = [];
	var numOpened = openAllData.NumOpened;
	var handles = [];
	for(var i = 0; i < numOpened; i++) {
		handles.push(openAllData.aHandles[i]);
		handleInfo.push(getHandleInfoSync(openAllData.aHandles[i]));
	}
	console.log(userStr);
	console.log(handleInfo);
	console.log();
}
function performListAllTCP() {
	// Perform the open-all call.
	console.log('Performing OpenAll TCP')
	openAllData = ljm.Internal_LJM_OpenAll(7, 2, 0, aHandles, 0,0, '');

	parseOpenAllData(openAllData, 'Opened Devices TCP:');
}

function performListAllUDP() {
	// Perform the open-all call.
	console.log('Performing OpenAll UDP')
	openAllData = ljm.Internal_LJM_OpenAll(7, 5, 0, aHandles, 0,0, '');

	parseOpenAllData(openAllData, 'Opened Devices UDP:');
}


performListAllUDP();
console.log('I Would have expected all of the devices to be found and UDP based Ethernet handles returned for the devices.');
console.log('Unfortunately, only two new handles are created for an ethernet connection type.');
console.log();

performListAllTCP();
console.log('No new handles are created after performing an OpenAll TCP call, the handle numbers are 1,2,3');
console.log('I believe this means that the handles were upgraded to TCP handles?');
console.log();

performListAllUDP();
console.log('Performed a second OpenAll UDP call.  The second call results in consistent results which is good.')
console.log();

performListAllTCP();
console.log('Performed a second OpenAll TCP call.  The second call results in consistent results which is good.')
console.log();

console.log('Closing All handles via LJM_CloseAll...');
data = ljm.LJM_CloseAll();
console.log();

openOneEthernetDevice();
performListAllTCP();
console.log('Why do these devices report a CT of 2 indicating a TCP connection type?');
console.log('Shouldn\'t they report either 3 or 4?');
console.log();

performListAllUDP();
console.log('Why aren\'t any handles returned?  The devices should still be discoverable via UDP.');
console.log();

performListAllTCP();
console.log('Performed a second OpenAll TCP call.  The second call results in consistent results which is good.')
console.log();

performListAllUDP();
console.log('Performed a second OpenAll UDP call.  The second call results in consistent results which is good.')
console.log();



// Close the device.
data = ljm.LJM_Close(handle);

// Close all devices
data = ljm.LJM_CloseAll();
