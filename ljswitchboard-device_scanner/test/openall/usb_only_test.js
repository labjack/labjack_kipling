// Legacy test for the old ListAll scan method. Expects to open real devices.
var assert = require('chai').assert;

var deviceScanner;
var device_scanner = require('../../lib/ljswitchboard-device_scanner');
var test_util = require('../utils/test_util');
var printScanResultsData = test_util.printScanResultsData;
var verifyScanResults = test_util.verifyScanResults;

var device_curator = require('ljswitchboard-ljm_device_curator');

var devices = [];

var scanOptions = {
    'scanUSB': true,
    'scanEthernet': false,
    'scanWiFi': false,
};

describe('usb only', function() {
	it('Starting Basic Test', function (done) {
		console.log('');
		console.log('*** Starting Basic (OpenAll) Test ***');

		deviceScanner = device_scanner.getDeviceScanner('open_all');

		done();
	});
	it('open device', function (done) {
		var device = new device_curator.device();
		devices.push(device);
		device.open('LJM_dtT7', 'LJM_ctUSB', 'LJM_idANY')
		.then(function() {
			done();
		}, function() {
			devices[0].destroy();
			devices = [];
			done();
		});
	});
	it('enable device scanning', function (done) {
		deviceScanner.enableDeviceScanning()
		.then(function() {
			done();
		});
	});
	it('perform scan', function (done) {
		var currentDeviceList = [];
		var startTime = new Date();
		deviceScanner.findAllDevices(devices, scanOptions)
		.then(function(deviceTypes) {
			console.log('finished scanning, scan data', deviceTypes);
			printScanResultsData(deviceTypes);
			console.log('Finished printing scan results');
			verifyScanResults(deviceTypes, test, {debug: false});
			var endTime = new Date();
			var duration = (endTime - startTime)/1000;
			// var testStatus = testScanResults(deviceTypes, expDeviceTypes, test, {'test': false, 'debug': false});
			// assert.isOk(testStatus, 'Unexpected test result');
			assert.isOk(duration < 1.0, "A USB only scan should take less than 1 second");
			console.log('  - Duration'.cyan, duration);
			done();
		}, function(err) {
			console.log('Scanning Error');
			assert.isOk(false, 'Scan should have worked properly');
			done();
		});
	});
	it('get erroneous devices', function (done) {
		deviceScanner.getLastFoundErroniusDevices()
		.then(function(res) {
			console.log('Erroneous devices', res);
			done();
		});
	});
	it('read device SERIAL_NUMBER', function (done) {
		if(devices[0]) {
			devices[0].iRead('SERIAL_NUMBER')
			.then(function(res) {
				console.log('  - SN Res:'.green, res.val);
				done();
			}, function(err) {
				console.log('Failed to read SN:', err, devices[0].savedAttributes);
				assert.isOk(false, 'Failed to read SN: ' + JSON.stringify(err));
				done();
			});
		} else {
			done();
		}
	});
	it('perform secondary cached read', function (done) {
		var startTime = new Date();
		deviceScanner.getLastFoundDevices(devices)
		.then(function(deviceTypes) {
			console.log('Finished scanning, scan data', deviceTypes);
			printScanResultsData(deviceTypes);

			var endTime = new Date();
			console.log('  - Duration'.cyan, (endTime - startTime)/1000);

			done();
		}, function(err) {
			console.log('Scanning Error');
			assert.isOk(false, 'Scan should have worked properly');
			done();
		});
	});
	it('close device', function (done) {
		if(devices[0]) {
			devices[0].close()
			.then(function() {
				done();
			}, function() {
				done();
			});
		} else {
			done();
		}
	});
	it('unload', function (done) {
		device_scanner.unload();
		done();
	});
});
