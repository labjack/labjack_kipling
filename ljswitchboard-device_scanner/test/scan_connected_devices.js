/**
 * Tests for the legacy ListAll device scanner
 */
var assert = require('chai').assert;

var rewire = require('rewire');
var device_scanner = rewire('../lib/device_scanner');
var assert = require('chai').assert;

var device_curator = require('ljswitchboard-ljm_device_curator');

var test_util = require('./utils/test_util');
var testScanResults = test_util.testScanResults;

var deviceScanner;
var device;


var GLOBAL_TEST_EXPECTED_DEVICE_LIST = true;

var GLOBAL_EXPECTED_DEVICE_TYPES = require('./utils/expected_devices').expectedDevices;

describe('scan connected devices', function() {
	return;
	this.skip();
	it('Starting Mock Test', function (done) {
		console.log('');
		console.log('*** Starting Scanning for Connected Devices ***');
		done();
	});
	it('create device scanner', function (done) {
		deviceScanner = require(
			'../lib/ljswitchboard-device_scanner'
		).getDeviceScanner('device_scanner');
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
	it('mock test', function (done) {
		var startTime = new Date();

		var expectedData = {
			'T7': {
				'devices': [{
					'connectionTypes': [{
						'name': 'USB',
						'insertionMethod': 'scan',
					}, {
						'name': 'Ethernet',
						'insertionMethod': 'scan',
					}, {
						'name': 'WiFi',
						'insertionMethod': 'attribute'
					}]
				}]
			},
			'Digit': {
				'devices': [{
					'connectionTypes': [{
						'name': 'USB',
						'insertionMethod': 'scan',
					}]
				}]
			},
		};

		deviceScanner.findAllDevices()
		.then(function(deviceTypes) {
			var endTime = new Date();
			var debug = false;

			testScanResults(deviceTypes, expectedData, {'debug': false});

			if(debug) {
				console.log('  - Duration', (endTime - startTime)/1000);
			}
			done();
		}, function(err) {
			console.log('Scanning Error', err);
			done();
		});
	});
	it('Enable device scanning', function (done) {
		deviceScanner.enableDeviceScanning()
		.then(function() {
			done();
		});
	});
	it('re-configure - TCP all & extended', function (done) {
		var SCAN_REQUEST_LIST = [{
				'deviceType': 'LJM_dtT7',
				'connectionType': 'LJM_ctUSB',
				'addresses': device_scanner.REQUIRED_INFO_BY_DEVICE.LJM_dtT7
			}];
		var scanStrategies = [
			{'type': 'listAllExtended', 'enabled': true},
			{'type': 'listAll', 'enabled': true},
		];
		// device_scanner.__set__('SCAN_REQUEST_LIST', SCAN_REQUEST_LIST);
		// device_scanner.__set__('scanStrategies', scanStrategies);
		done();
	});
	it('perform initial scan', function (done) {
		var currentDeviceList = {};
		var expDeviceTypes = GLOBAL_EXPECTED_DEVICE_TYPES;
		deviceScanner.findAllDevices(currentDeviceList)
		.then(function(deviceTypes) {
			var testStatus = testScanResults(deviceTypes, expDeviceTypes, test, {'test': GLOBAL_TEST_EXPECTED_DEVICE_LIST, 'debug': false});
			assert.isOk(testStatus, 'Unexpected test result');
			if (deviceTypes.length === 0) {
				console.log('Expected at least one device; exiting process');
				done();
				process.exit();
				return;
			}
			var dA = deviceTypes[0].devices[0];

			device = new device_curator.device();
			device.open(dA.deviceType, dA.connectionTypes[0].str, dA.serialNumber)
			.then(function(res) {
				if(true) {
					console.log(
						"  - Opened T7:",
						res.productType,
						res.connectionTypeName,
						res.serialNumber
					);
				}
				// console.log('in t7_basic_test.js, openDevice', res);
				assert.isOk(true, 'Successfully scanned for and opened a device');
				done();
			}, function(err) {
				console.log('Failed to open device', err);
				assert.isOk(false,'Failed to open device: ' + err.toString());
				done();
			});
		}, function(err) {
			console.log('Scanning Error');
			assert.isOk(false,'Failed to scan for devices: ' + err.toString());
			done();
		});
	});
	it('verify device communications', function (done) {
		device.read('PRODUCT_ID')
		.then(function(productID) {
			assert.isOk(true, 'Verified device communications');
			done();
		}, function(err) {
			assert.isOk(false, 'Unable to read the Product ID', err);
			done();
		});
	});
	it('Re-scan for devices', function (done) {
		var currentDeviceList = [device];
		var expDeviceTypes = GLOBAL_EXPECTED_DEVICE_TYPES;
		deviceScanner.findAllDevices(currentDeviceList)
		.then(function(deviceTypes) {
			var testStatus = testScanResults(deviceTypes, expDeviceTypes, test, {'test': GLOBAL_TEST_EXPECTED_DEVICE_LIST, 'debug': false});
			assert.isOk(testStatus, 'Unexpected test result');


			var expectedSerialNumber = device.savedAttributes.serialNumber;
			var foundDeviceAgain = false;
			var foundT7s = [];
			deviceTypes[0].devices.forEach(function(t7Device) {
				var sn = t7Device.serialNumber;
				foundT7s.push(sn);

				if(sn == expectedSerialNumber) {
					foundDeviceAgain = true;
				}
			});

			assert.isOk(foundDeviceAgain, 'We should have been able to find the connected device a second time.');
			// var dA = deviceTypes[0].devices[0];
			// assert.strictEqual(
			// 	dA.serialNumber,
			// 	device.savedAttributes.serialNumber,
			// 	'Unexpected Scanned-for device'
			// );

			assert.isOk(true, 'Successfully scanned for devices');
			done();
		}, function(err) {
			console.log('Scanning Error');
			assert.isOk(false,'Failed to scan for devices: ' + err.toString());
			done();
		});
	});
	// it('verify device communications did not break', function (done) {
	// 	device.read('PRODUCT_ID')
	// 	.then(function(productID) {
	// 		assert.isOk(true, 'Verified device communications');
	// 		done();
	// 	}, function(err) {
	// 		assert.isOk(false, 'Unable to read the Product ID', err);
	// 		done();
	// 	});
	// });
	it('close Device', function (done) {
		device.close()
		.then(function(res) {
			done();
		}, function(err) {
			console.log('Failed to close device', err);
			// assert.isOk(false, 'failed to close');
			done();
		});
	});
});
