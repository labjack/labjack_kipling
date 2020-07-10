
/*
 * This is a script that performs a scan for devices so that you can see what LabJack devices
 * are currently available.
*/
var deviceScanner = require('../lib/ljswitchboard-device_scanner')
	.getDeviceScanner('device_scanner');


var foundDevices = {};

// This is an array of curated devices produced by the ljswitchboard-ljm_device_curator module.
var connectedDevices = [];

// Perform Scan
deviceScanner.findAllDevices(connectedDevices)
.then(function(deviceTypes) {
	// Loop through each found device type, Digit, T7, etc.
	deviceTypes.forEach(function(deviceType) {
		// Add the device type to the foundDevices object.

		// If the device type is not currently there then add it.
		if(typeof(foundDevices[deviceType.deviceTypeName]) === 'undefined') {
			foundDevices[deviceType.deviceTypeName] = {
				'devices': []
			};
		}

		// Now we can loop through each found device of the given device type.
		deviceType.devices.forEach(function(device) {
			var sn = device.serialNumber;
			var dtn = device.deviceTypeName;

			var deviceScanData = {
				'connectionTypes':[]
			};

			// Not sure what keys are here...
			// console.log(
			// 	'Device Type:',
			// 	deviceType.deviceTypeName,
			// 	// 'Keys', Object.keys(device),
			// 	sn
			// );
			
			// Each found device can have multiple connection types.
			device.connectionTypes.forEach(function(connectionType) {
				// console.log(sn,':', connectionType.name, connectionType.insertionMethod);
				var connectionTypeData = {
					'name': connectionType.name,
					'insertionMethod': connectionType.insertionMethod,
				};
				deviceScanData.connectionTypes.push(connectionTypeData);
			});

			foundDevices[dtn].devices.push(deviceScanData);
		});
	});
	
	console.log('Scan Results');
	console.log(JSON.stringify(deviceTypes, null, 2));

	// Print out the found devices.
	console.log('Parsed Results');
	console.log(JSON.stringify(foundDevices, null, 2));
}, function(err) {
	console.log('Scanning Error', err);
});