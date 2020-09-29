var assert = require('chai').assert;

var rewire = require('rewire');
var device_scanner = rewire('../../lib/ljswitchboard-device_scanner');
var open_all_device_scanner = rewire('../../lib/open_all_device_scanner');
var test_util = require('../utils/test_util');
var printScanResultsData = test_util.printScanResultsData;
var device_curator = require('ljswitchboard-ljm_device_curator');
var driver = require('labjack-nodejs').driver();

var deviceScanner;
var devices = [];

describe('mock w device', function() {
	it('Starting Mock Test', function (done) {
		console.log('');
		console.log('*** Starting Mock OpenAll Test ***');
		done();
	});
	it('create device scanner', function (done) {
		device_scanner.disableSafeLoad();
		deviceScanner = open_all_device_scanner.createDeviceScanner(driver);
		done();
	});
	it('disable device scanning', function (done) {
		deviceScanner.disableDeviceScanning()
		.then(function() {
			done();
		});
	});
	it('Add mock devices', function (done) {
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
			done();
		});
	});
	it('open mock device', function (done) {
		var device = new device_curator.device(true);
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
	it('mock test', function (done) {
		var currentDeviceList = [];
		var startTime = new Date();
		deviceScanner.findAllDevices(devices)
		.then(function(deviceTypes) {
			printScanResultsData(deviceTypes);
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
	it('read device AIN', function (done) {
		if(devices[0]) {
			devices[0].iRead('AIN0')
			.then(function(res) {
				console.log('  - AIN Res:'.green, res.val);
				done();
			}, function(err) {
				assert.isOk(false, 'Failed to read AIN0: ' + err.toString());
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
