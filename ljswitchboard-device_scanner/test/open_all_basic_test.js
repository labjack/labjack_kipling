// Test for the OpenAll scan method. Expects to open real devices.
var assert = require('chai').assert;

var deviceScanner;

var test_util = require('./utils/test_util');
var testScanResults = test_util.testScanResults;

var expDeviceTypes = require('./utils/expected_devices').expectedDevices;

describe('open all basic', function() {
	return;
	this.skip();
	it('Starting Basic Test', function (done) {
		console.log('');
		console.log('*** Starting Basic (OpenAll) Test ***');

		deviceScanner = require(
			'../lib/ljswitchboard-device_scanner'
		).getDeviceScanner('open_all_device_scanner');

		done();
	});
	it('basic test', function (done) {
		var currentDeviceList = {};
		var startTime = new Date();
		if (!deviceScanner.hasOpenAll) {
			assert.isOk(false, 'Cannot perform open_all_basic_test because LJM does not have OpenAll');
			done();
		}
		else {
			deviceScanner.findAllDevices(currentDeviceList)
			.then(function(deviceTypes) {
				var endTime = new Date();
				var testStatus = testScanResults(deviceTypes, expDeviceTypes, test, {'test': false, 'debug': false});
				assert.isOk(testStatus, 'Unexpected test result');
				console.log('Duration', (endTime - startTime)/1000);
				done();
			}, function(err) {
				console.log('Scanning Error');
				done();
			});
		}
	});
});
