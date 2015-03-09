
var device_scanner = require('../lib/ljswitchboard-device_scanner').getDeviceScanner();

var test_util = require('./test_util');
var printAvailableDeviceData = test_util.printAvailableDeviceData;
var testScanResults = test_util.testScanResults;



exports.tests = {
	'Starting Basic Test': function(test) {
		console.log('');
		console.log('*** Starting Basic Test ***');
		test.done();
	},
	'basic test': function(test) {
		var currentDeviceList = {};
		var startTime = new Date();
		var deviceScanner = new device_scanner.deviceScanner();

		var expDeviceTypes = {
			'T7': {
				'devices': [{
					'connectionTypes': [{
						'name': 'USB',
						'insertionMethod': 'scan',
					}, {
						'name': 'Ethernet',
						'insertionMethod': 'scan',
					}]
				}]
			},
			'Digit': {
				'devices': [{
					'connectionTypes': [{
						'name': 'USB',
						'insertionMethod': 'scan',
					}]
				}]
			},
		};
		deviceScanner.findAllDevices(currentDeviceList)
		.then(function(deviceTypes) {
			var endTime = new Date();
			var testStatus = testScanResults(deviceTypes, expDeviceTypes, test, {'test': false, 'debug': false});
			test.ok(testStatus, 'Unexpected test result');
			console.log('Duration', (endTime - startTime)/1000);
			test.done();
		}, function(err) {
			console.log('Scanning Error');
			test.done();
		});
	}
};