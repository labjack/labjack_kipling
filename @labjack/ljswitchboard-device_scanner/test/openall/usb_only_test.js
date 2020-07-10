// Legacy test for the old ListAll scan method. Expects to open real devices.

var deviceScanner;
var device_scanner = require('../../lib/ljswitchboard-device_scanner');
var test_util = require('../utils/test_util');
var printAvailableDeviceData = test_util.printAvailableDeviceData;
var printScanResultsData = test_util.printScanResultsData;
var printScanResultsKeys = test_util.printScanResultsKeys;
var verifyScanResults = test_util.verifyScanResults;
var testScanResults = test_util.testScanResults;

var expDeviceTypes = require('../utils/expected_devices').expectedDevices;

var device_curator = require('@labjack/ljswitchboard-ljm_device_curator');

var devices = [];

var scanOptions = {
    'scanUSB': true,
    'scanEthernet': false,
    'scanWiFi': false,
};
exports.tests = {
	'Starting Basic Test': function(test) {
		console.log('');
		console.log('*** Starting Basic (OpenAll) Test ***');

		deviceScanner = device_scanner.getDeviceScanner('open_all');

		test.done();
	},
	'open device': function(test) {
		var device = new device_curator.device();
		devices.push(device);
		device.open('LJM_dtT7', 'LJM_ctUSB', 'LJM_idANY')
		.then(function() {
			test.done();
		}, function() {
			devices[0].destroy();
			devices = [];
			test.done();
		});
	},
	'enable device scanning': function(test) {
		deviceScanner.enableDeviceScanning()
		.then(function() {
			test.done();
		});
	},
	'perform scan': function(test) {
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
			// test.ok(testStatus, 'Unexpected test result');
			test.ok(duration < 1.0, "A USB only scan should take less than 1 second");
			console.log('  - Duration'.cyan, duration);
			test.done();
		}, function(err) {
			console.log('Scanning Error');
			test.ok(false, 'Scan should have worked properly');
			test.done();
		});
	},
	'get erroneous devices': function(test) {
		deviceScanner.getLastFoundErroniusDevices()
		.then(function(res) {
			console.log('Erroneous devices', res);
			test.done();
		});
	},
	'read device SERIAL_NUMBER': function(test) {
		if(devices[0]) {
			devices[0].iRead('SERIAL_NUMBER')
			.then(function(res) {
				console.log('  - SN Res:'.green, res.val);
				test.done();
			}, function(err) {
				console.log('Failed to read SN:', err, devices[0].savedAttributes);
				test.ok(false, 'Failed to read SN: ' + JSON.stringify(err));
				test.done();
			});
		} else {
			test.done();
		}
	},
	'perform secondary cached read': function(test) {
		var startTime = new Date();
		deviceScanner.getLastFoundDevices(devices)
		.then(function(deviceTypes) {
			console.log('Finished scanning, scan data', deviceTypes);
			printScanResultsData(deviceTypes);

			var endTime = new Date();
			console.log('  - Duration'.cyan, (endTime - startTime)/1000);

			test.done();
		}, function(err) {
			console.log('Scanning Error');
			test.ok(false, 'Scan should have worked properly');
			test.done();
		});
	},
	'close device': function(test) {
		if(devices[0]) {
			devices[0].close()
			.then(function() {
				test.done();
			}, function() {
				test.done();
			});
		} else {
			test.done();
		}
	},
	'unload': function(test) {
		device_scanner.unload();
		test.done();
	},
};