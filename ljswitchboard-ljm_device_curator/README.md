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

Look at the /test/test.js file for tests/examples that can be run by executing "npm test".  The "t7_basic_test.js" is a great resource for more getting started information.