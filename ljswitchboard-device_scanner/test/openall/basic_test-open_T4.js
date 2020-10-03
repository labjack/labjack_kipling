// Legacy test for the old ListAll scan method. Expects to open real devices.
var assert = require('chai').assert;

var deviceScanner;
var device_scanner = require('../../lib/ljswitchboard-device_scanner');
var test_util = require('../utils/test_util');
var printScanResultsData = test_util.printScanResultsData;
var verifyScanResults = test_util.verifyScanResults;

var device_curator = require('ljswitchboard-ljm_device_curator');

var devices = [];

describe('basic test open T4', function() {
	it('Starting Basic Test', function (done) {
		console.log('');
		console.log('*** Starting Basic (OpenAll) Test ***');

		deviceScanner = device_scanner.getDeviceScanner('open_all');

		done();
	});
	it('open device', function (done) {
		var device = new device_curator.device();
		devices.push(device);
		device.open('LJM_dtT4', 'LJM_ctUSB', 'LJM_idANY')
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
	it('basic test', function (done) {
		var currentDeviceList = [];
		var startTime = new Date();
		deviceScanner.findAllDevices(devices)
		.then(function(deviceTypes) {
			console.log('finished scanning, scan data', deviceTypes);
			printScanResultsData(deviceTypes);
			console.log('Finished printing scan results');
			verifyScanResults(deviceTypes, {debug: false});
			var endTime = new Date();
			// var testStatus = testScanResults(deviceTypes, expDeviceTypes, {'test': false, 'debug': false});
			// assert.isOk(testStatus, 'Unexpected test result');
			console.log('  - Duration'.cyan, (endTime - startTime)/1000);
			done();
		}, function(err) {
			console.log('Scanning Error');
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
