
var device_scanning = require('../lib/device_scanning');

exports.tests = {
	'basic test': function(test) {
		var currentDeviceList = [];
		var deviceScanner = new device_scanning.deviceScanner();
		deviceScanner.findAllDevices(currentDeviceList)
		.then(function(res) {
			// console.log('Finished Scanning', res);
			test.done();
		}, function(err) {
			console.log('Scanning Error');
			test.done();
		});
	}
};