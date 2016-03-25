
var rewire = require('rewire');
var device_scanner = rewire('../../lib/ljswitchboard-device_scanner');
var open_all_device_scanner = rewire('../../lib/open_all_device_scanner');
var driver_const = require('ljswitchboard-ljm_driver_constants');
var REQUIRED_INFO_BY_DEVICE = require('../../lib/required_device_info').requiredInfo;
var test_util = require('../utils/test_util');
var printAvailableDeviceData = test_util.printAvailableDeviceData;
var printScanResultsData = test_util.printScanResultsData;
var printScanResultsKeys = test_util.printScanResultsKeys;
var testScanResults = test_util.testScanResults;
var device_curator = require('ljswitchboard-ljm_device_curator');

var deviceScanner;
var driver;
var devices = [];
exports.tests = {
	'Starting Mock Test': function(test) {
		console.log('');
		console.log('*** Starting Mock OpenAll Test ***');
		test.done();
	},
	'create device scanner': function(test) {
		device_scanner.disableSafeLoad();
		driver = require('LabJack-nodejs').driver();
		deviceScanner = open_all_device_scanner.createDeviceScanner(driver);
		test.done();
	},
	'disable device scanning': function(test) {
		deviceScanner.disableDeviceScanning()
		.then(function() {
			test.done();
		});
	},
	'Add mock devices': function(test) {
		deviceScanner.addMockDevices([
			{
				'deviceType': 'LJM_dtT7',
				'connectionType': 'LJM_ctETHERNET',
				'serialNumber': 1,
			},
			{
				'deviceType': 'LJM_dtT7',
				'connectionType': 'LJM_ctUSB',
				'serialNumber': 1,
			},
			{
				'deviceType': 'LJM_dtDIGIT',
				'connectionType': 'LJM_ctUSB'
			}
		])
		.then(function() {
			test.done();
		});
	},
	'open mock device': function(test) {
		var device = new device_curator.device(true);
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
	'mock test': function(test) {
		var currentDeviceList = [];
		var startTime = new Date();
		deviceScanner.findAllDevices(devices)
		.then(function(deviceTypes) {
			printScanResultsData(deviceTypes);
			var endTime = new Date();
			// var testStatus = testScanResults(deviceTypes, expDeviceTypes, test, {'test': false, 'debug': false});
			// test.ok(testStatus, 'Unexpected test result');
			console.log('  - Duration'.cyan, (endTime - startTime)/1000);
			test.done();
		}, function(err) {
			console.log('Scanning Error');
			test.done();
		});
	},
	'read device AIN': function(test) {
		if(devices[0]) {
			devices[0].iRead('AIN0')
			.then(function(res) {
				console.log('  - AIN Res:'.green, res.val);
				test.done();
			}, function(err) {
				test.ok(false, 'Failed to read AIN0: ' + err.toString());
				test.done();
			});
		} else {
			test.done();
		}
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
};