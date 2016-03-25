// Test for the OpenAll scan method. Expects to open real devices.

var deviceScanner;

var test_util = require('./test_util');
var printAvailableDeviceData = test_util.printAvailableDeviceData;
var testScanResults = test_util.testScanResults;

var expDeviceTypes = require('./expected_devices').expectedDevices;

exports.tests = {
	'Starting Basic Test': function(test) {
		console.log('');
		console.log('*** Starting Basic (OpenAll) Test ***');

		deviceScanner = require(
			'../lib/ljswitchboard-device_scanner'
		).getDeviceScanner('open_all_device_scanner');

		test.done();
	},
	'basic test': function(test) {
		var currentDeviceList = {};
		var startTime = new Date();
		if (!deviceScanner.hasOpenAll) {
			test.ok(false, 'Cannot perform open_all_basic_test because LJM does not have OpenAll');
			test.done();
		}
		else {
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
	}
};