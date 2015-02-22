
var device_scanner = require('../lib/device_scanner');

exports.tests = {
	'basic test': function(test) {
		var currentDeviceList = [];
		var deviceScanner = new device_scanner.deviceScanner();
		deviceScanner.findAllDevices(currentDeviceList)
		.then(function(res) {
			console.log('Finished Scanning');
			console.log('Number of Devices', res.length);
			res.forEach(function(device) {
				console.log('Connection Types', device.connectionTypes.length);
				device.connectionTypes.forEach(function(connectionType) {
					console.log('  - ', connectionType.name, connectionType.insertionMethod);
				});
				console.log('Available Data', Object.keys(device));
			});
			test.done();
		}, function(err) {
			console.log('Scanning Error');
			test.done();
		});
	}
};