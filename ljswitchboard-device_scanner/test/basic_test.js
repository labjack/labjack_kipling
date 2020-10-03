// Legacy test for the old ListAll scan method. Expects to open real devices.

var assert = require('chai').assert;

var deviceScanner;
var device_scanner = require('../lib/ljswitchboard-device_scanner');
var test_util = require('./utils/test_util');
var printScanResultsData = test_util.printScanResultsData;
var verifyScanResults = test_util.verifyScanResults;

var device_curator = require('ljswitchboard-ljm_device_curator');

var devices = [];

describe('basic', function() {
	return;
	this.skip();
	it('Starting Basic Test', function (done) {
		console.log('');
		console.log('*** Starting Basic Test ***');

		deviceScanner = device_scanner.getDeviceScanner();

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
	it('basic test', function (done) {
		var currentDeviceList = [];
		var startTime = new Date();
		deviceScanner.findAllDevices(devices)
		.then(function(deviceTypes) {
			printScanResultsData(deviceTypes);
			verifyScanResults(deviceTypes, test, {debug: false});
			var endTime = new Date();
			// var testStatus = testScanResults(deviceTypes, expDeviceTypes, test, {'test': false, 'debug': false});
			// assert.isOk(testStatus, 'Unexpected test result');
			console.log('  - Duration'.cyan, (endTime - startTime)/1000);
			done();
		}, function(err) {
			console.log('Scanning Error');
			done();
		});
	});
	it('read device SN', function (done) {
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
	it('get last scan results', function (done) {
		deviceScanner.getLastFoundDevices()
		.then(function(deviceTypes) {
			printScanResultsData(deviceTypes);
			verifyScanResults(deviceTypes, test, {debug: false});
			assert.isOk(true);
			done();
		}, function(err) {
			console.log('Error getting cached scan results');
			assert.isOk(false);
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
