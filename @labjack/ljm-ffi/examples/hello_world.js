
// Load the LJM Library.
var ljm_ffi = require('../lib/ljm-ffi');
var ljm = ljm_ffi.load();

// Load a utility function to get the connected device's info.
var utils = require('./utils/utils');
var getHandleInfoSync = utils.getHandleInfoSync;

// Define a variable that will store data from LJM function calls
var data;

// Define a variable that will store the device's handle.
var handle;

// Open the first found T7.
data = ljm.LJM_OpenS('LJM_dtT7', 'LJM_ctANY', 'LJM_idANY', 0);

// Exit the program if a device was not found.
if(data.ljmError !== 0) {
	console.log('Failed to open a device, please connect a T7 to your computer.');
	process.exit();
} else {
	handle = data.handle;
	console.log('Connected to device:', getHandleInfoSync(handle));
}

// Read the T7's AIN0.
data = ljm.LJM_eReadName(handle, 'AIN0', 0);
console.log('AIN0', data.Value);

// Close the device.
data = ljm.LJM_Close(handle);
