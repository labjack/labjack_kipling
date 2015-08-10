ljswitchboard-ljm_device_curator
================================
'ljswitchboard-ljm_device_curator' makes communicating with LabJack's devices in node.js super easy.

This library sits on top of the 'labjack-nodejs' library allowing it abstract several more LJM features and do some very convenient things with device connection management.  Again, it was created primarily for the use in LabJack's [Kipling](https://labjack.com/support/software/applications/kipling) application.

### Basic Usage:
```javascript
//Include the device curator
var device_curator = require('ljswitchboard-ljm_device_curator');

// Creating a new device object
var device = new device_curator.device();

// Opening a device, first found device.
device.open()
.then(function(deviceInfo){
	// Successfully opened device case
}, function(err) {
	// Failed to properly open device
}).done();

// Reading a devices analog input address.  Value gets automatically rounded to 6 digits of precision.
device.iRead('AIN0')
.then(function(result) {
	console.log('Rounded Value', result.val);
	console.log('Raw Value', result.res);
}).done();

// Reading a devices IP address.  IP Address formatting gets automatically applied.
device.iRead('ETHERNET_IP')
.then(function(result) {
	console.log('IP Address', result.val);
	console.log('Raw Value', result.res);
}).done();

// Closing a device
device.close()
.then(function(){
	console.log('Closed Device');
}).done();
```

This library also generates important events in regards to device disconnection/reconnection/errors, etc.  It automatically detects when a device becomes disconnected or re-connected through the "DEVICE_DISCONNECTED" and "DEVICE_RECONNECTED" events. You can also attach a universal "DEVICE_ERROR" event listener to detect when any errors occur so that they don't have to be handled on a case-by-case basis.

```javascript
// Device disconnection event
device.once('DEVICE_DISCONNECTED', function() {
	console.log('  - Device Disconnected');
});

// Detecting device errors
device.once('DEVICE_ERROR', function() {
	console.log('  - Device Reconnected');
});

// Device re-connecting
device.once('DEVICE_RECONNECTING', function() {
	console.log('  - Device Reconnected');
});

// Device re-connected event
device.once('DEVICE_RECONNECTED', function() {
	console.log('  - Device Reconnected');
});

// Device reconnected & ready to use
device.once('DEVICE_ATTRIBUTES_CHANGED', function() {
	console.log('  - Device Attributes Updated');
});
```

Other important abstractions that are made with this library are:
* A devices calibration status is checked every time it gets opened.
* If a device becomes disconnected and a user is using the i* functions they will get returned the last-read values.  This allowed Kipling to remain usable even when devices became disconnected.
* "Buffer" registers can be properly read written to with the readArray and writeArray functions that aren't implemented in the LJM library yet.
* It is possible to do two bulk read/write operations. readMultiple, readMany as well as writeMultiple and writeMany. The *Multiple functions perform their operations by executing multiple single reads to ensure users get individual errors for each register being written to/read.  The *Many functions use LJM's [multiple value functions](https://labjack.com/support/software/api/ljm/function-reference/multiple-value-functions) and only return one error.  Currently any data acquired when an error occurs is deamed to be invalid which is not true. 


Note:
-----
the rwMany function does not currently have any extra features attached to it.  They will be comming soon but most functionality in Kipling has been achieved through either reads or writes and has not required the ability to do both at the same time.

Look at the /test/test.js file for tests/examples that can be run by executing "npm test".  The "t7_basic_test.js" is a great resource for more getting started information.


This wrapper breaks device IO calls into four categories,
1. Functions wrapped by the q promise library
2. Functions that automatically get re-tried when a flash un-available error occurs.  Very convenient when using a T7-Pro and writing/reading _DEFAULT registers.
3. Functions that automatically apply formatting that converts ip address values into ip strings, rounding, etc.
4. Functions that automatically integrate with the last-read value cache to not return any errors.  Errors are still produced via the DEVICE_ERROR event.

Generic Opening/Closing
* open
* getDeviceAttributes
* close

LabJack-nodejs Functions wrapped by q
* read
* readArray
* readMany
* readMultiple
* readUINT64 // For reading a devices MAC address (Ethernet & WiFi)

* write
* writeArray
* writeMany
* writeMultiple

* rwMany

Functions that automatically re-try on flash un-available errors that commonly happen on T7-Pro devices when writing/reading _DEFAULT registers
* qRead
* qReadMany
* qReadUINT64

* qWrite
* qWriteMany

* qrwMany

Functions that automatically apply "intelligent" result formatting.  Happens on both reads and writes
* iRead
* iReadMany
* iReadMultiple

* iWrite
* iWriteMany
* iWriteMultiple

Functions that don't return errors because they automatically return the last-read values.
* sRead
* sReadMany
* sReadMultiple

Other functions:
* getCalibrationStatus
* writeDeviceName

Beta/Un-stable functions:
* updateFirmware
* readTempHumidityLight //Reading data from Digit-TL and Digit-TLH devices
* readTempLightHumidity //Reading data from Digit-TL and Digit-TLH devices

###Mock Devices
---------------
For testing purposes, it is possible to open "mock" devices that try to behave like standard devices and return dummy values.  Mock devices are declared when initializing the device object:
```javascript
//Include the device curator
var device_curator = require('ljswitchboard-ljm_device_curator');

// Creating a new device object
var device = new device_curator.device(true);
```

You can then perform most device IO calls without the requirement of having a device connected to a computer.