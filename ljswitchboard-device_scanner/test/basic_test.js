
var device_scanner = require('../lib/ljswitchboard-device_scanner').getDeviceScanner();

exports.tests = {
	'basic test': function(test) {
		var currentDeviceList = {};
		var startTime = new Date();
		var deviceScanner = new device_scanner.deviceScanner();
		deviceScanner.findAllDevices(currentDeviceList)
		.then(function(res) {
			var endTime = new Date();
			console.log('Finished Scanning');
			console.log('Number of Device Types', res.length);
			res.forEach(function(deviceType) {
				console.log('Number of', deviceType.deviceTypeName, 'Devices:', deviceType.devices.length);
				deviceType.devices.forEach(function(device) {
					console.log(
						'Connection Types',
						device.connectionTypes.length,
						device.deviceType,
						device.productType
					);
					device.connectionTypes.forEach(function(connectionType) {
						console.log('  - ', connectionType.name, connectionType.insertionMethod, connectionType.verified);
					});
					console.log('Available Data', Object.keys(device));
				});
			});
			console.log('Duration', (endTime - startTime)/1000);
			test.done();
		}, function(err) {
			console.log('Scanning Error');
			test.done();
		});
	}
};