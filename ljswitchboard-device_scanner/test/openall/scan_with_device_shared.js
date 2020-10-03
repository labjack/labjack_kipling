// Legacy test for the old ListAll scan method. Expects to open real devices.
var assert = require('chai').assert;

var deviceScanner;
var device_scanner = require('../../lib/ljswitchboard-device_scanner');
var test_util = require('../utils/test_util');
var printScanResultsData = test_util.printScanResultsData;
var verifyScanResults = test_util.verifyScanResults;

var device_curator = require('ljswitchboard-ljm_device_curator');

var device = null;
var devices = [];

describe('scan with device shared', function() {
	it('Starting Basic Test', function (done) {
		console.log('');
		console.log('*** Starting Basic Ethernet (OpenAll) Test ***');

		deviceScanner = device_scanner.getDeviceScanner('open_all');

		done();
	});
	it('open device', function (done) {
		device = new device_curator.device();
		devices.push(device);
		// device.open('LJM_dtT7', 'LJM_ctEthernet', 'LJM_idANY')
		device.open('LJM_dtT4', 'LJM_ctUSB', 'LJM_idANY')
		.then(function() {
			done();
		}, function() {
			devices[0].destroy();
			devices = [];
			done();
		});
	});
	it('open device in ljlogm', function (done) {
		if (process.platform !== 'win32') {
			console.warn('Test \'open device in ljlogm\' not supported except on Windows');
			done();
			return;
		}
		var scanFinished = false;
		var ljlogmFinished = false;
		function finishTest() {
			if(scanFinished && ljlogmFinished) {
				console.log('  - Scan & LJLogM Finished'.green);
				done();
			} else {
				console.log(
					'  - Trying to finish step...'.yellow,
					'scanFinished:',scanFinished,
					'ljlogmFinished:',ljlogmFinished
				);
			}
		}
		setTimeout(function() {
            var startTime = new Date();
            console.log('  - Starting LJM Scan'.green, startTime);
            console.log('  - Exit LJLogM to continue test'.yellow);
			deviceScanner.findAllDevices(devices)
			.then(function(deviceTypes) {
				console.log('  - Finished Scanning!'.green);
				printScanResultsData(deviceTypes);
				verifyScanResults(deviceTypes, test, {debug: false});
				var endTime = new Date();
				// var testStatus = testScanResults(deviceTypes, expDeviceTypes, test, {'test': false, 'debug': false});
				// assert.isOk(testStatus, 'Unexpected test result');
				console.log('  - Duration'.cyan, (endTime - startTime)/1000);
				assert.isOk(true, 'Scan Finished');
				scanFinished = true;
				finishTest();
			}, function(err) {
				console.log('Scanning Error', err);
				assert.isOk(false, 'Reported a scan error');
				scanFinished = true;
				finishTest();
				// done();
			});
        },
        3000);
		device.openDeviceInLJLogM()
		.then(function() {
			assert.isOk(true, 'LJLogM Finished');
			ljlogmFinished = true;
			finishTest();
		}, function(err) {
			assert.isOk(false, 'Should not fail to open in LJLogM');
			console.log('ERROR', err);
			ljlogmFinished = true;
			finishTest();
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
	it('read device SERIAL_NUMBER', function (done) {
		if(devices[0]) {
			devices[0].iRead('SERIAL_NUMBER')
			.then(function(res) {
				console.log('  - SN Res:'.green, res.val);
				done();
			}, function(err) {
				console.log('Failed to read SN:', err, devices[0].savedAttributes.serialNumber);
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
