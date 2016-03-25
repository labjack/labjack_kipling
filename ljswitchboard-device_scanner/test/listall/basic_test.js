// Legacy test for the old ListAll scan method. Expects to open real devices.

var deviceScanner;

var test_util = require('../utils/test_util');
var printAvailableDeviceData = test_util.printAvailableDeviceData;
var printScanResultsData = test_util.printScanResultsData;
var testScanResults = test_util.testScanResults;

var expDeviceTypes = require('../utils/expected_devices').expectedDevices;

exports.tests = {
	'Starting Basic Test': function(test) {
		console.log('');
		console.log('*** Starting Basic (ListAll) Test ***');

		deviceScanner = require(
			'../../lib/ljswitchboard-device_scanner'
		).getDeviceScanner('device_scanner');

		test.done();
	},
	'basic test': function(test) {
		var currentDeviceList = {};
		var startTime = new Date();
		deviceScanner.findAllDevices(currentDeviceList)
		.then(function(deviceTypes) {
			// printAvailableDeviceData(deviceTypes);
			printScanResultsData(deviceTypes);
			var endTime = new Date();
			var testStatus = testScanResults(deviceTypes, expDeviceTypes, test, {'test': false, 'debug': false});
			test.ok(testStatus, 'Unexpected test result');
			console.log('  - Duration'.cyan, (endTime - startTime)/1000);
			test.done();
		}, function(err) {
			console.log('Scanning Error');
			test.done();
		});
	}
};