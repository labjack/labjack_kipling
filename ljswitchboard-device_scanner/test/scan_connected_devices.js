
var rewire = require('rewire');
// var device_scanner = require('../lib/ljswitchboard-device_scanner').getDeviceScanner();
var device_scanner = rewire('../lib/device_scanner');
var device_curator = require('ljswitchboard-ljm_device_curator');
var ljm = require('labjack-nodejs');
var driver = ljm.driver();

var test_util = require('./test_util');
var printAvailableDeviceData = test_util.printAvailableDeviceData;
var testScanResults = test_util.testScanResults;

var deviceScanner;
var device;

exports.tests = {
	'Starting Mock Test': function(test) {
		console.log('');
		console.log('*** Starting Scanning for Connected Devices ***');
		test.done();
	},
	'create device scanner': function(test) {
		deviceScanner = new device_scanner.deviceScanner();
		test.done();
	},
	// 'disable device scanning': function(test) {
	// 	deviceScanner.disableDeviceScanning()
	// 	.then(function() {
	// 		test.done();
	// 	});
	// },
	// 'Add mock devices': function(test) {
	// 	deviceScanner.addMockDevices([
	// 		{
	// 			'deviceType': 'LJM_dtT7',
	// 			'connectionType': 'LJM_ctETHERNET',
	// 			'serialNumber': 1,
	// 		},
	// 		{
	// 			'deviceType': 'LJM_dtT7',
	// 			'connectionType': 'LJM_ctUSB',
	// 			'serialNumber': 1,
	// 		},
	// 		{
	// 			'deviceType': 'LJM_dtDIGIT',
	// 			'connectionType': 'LJM_ctUSB'
	// 		}
	// 	])
	// 	.then(function() {
	// 		test.done();
	// 	});
	// },
	// 'mock test': function(test) {
	// 	var startTime = new Date();
		
	// 	var expectedData = {
	// 		'T7': {
	// 			'devices': [{
	// 				'connectionTypes': [{
	// 					'name': 'USB',
	// 					'insertionMethod': 'scan',
	// 				}, {
	// 					'name': 'Ethernet',
	// 					'insertionMethod': 'scan',
	// 				}, {
	// 					'name': 'WiFi',
	// 					'insertionMethod': 'attribute'
	// 				}]
	// 			}]
	// 		},
	// 		'Digit': {
	// 			'devices': [{
	// 				'connectionTypes': [{
	// 					'name': 'USB',
	// 					'insertionMethod': 'scan',
	// 				}]
	// 			}]
	// 		},
	// 	};

	// 	deviceScanner.findAllDevices()
	// 	.then(function(deviceTypes) {
	// 		var endTime = new Date();
	// 		var debug = false;

	// 		testScanResults(deviceTypes, expectedData, test, {'debug': false});
			
	// 		if(debug) {
	// 			console.log('  - Duration', (endTime - startTime)/1000);
	// 		}
	// 		test.done();
	// 	}, function(err) {
	// 		console.log('Scanning Error', err);
	// 		test.done();
	// 	});
	// },
	'Enable device scanning': function(test) {
		deviceScanner.enableDeviceScanning()
		.then(function() {
			test.done();
		});
	},
	're-configure - TCP all & extended': function(test) {
		var SCAN_REQUEST_LIST = [{
				'deviceType': 'LJM_dtT7',
				'connectionType': 'LJM_ctUSB',
				'addresses': device_scanner.REQUIRED_INFO_BY_DEVICE.LJM_dtT7
			}];
		var scanStrategies = [
			{'type': 'listAllExtended', 'enabled': true},
			{'type': 'listAll', 'enabled': true},
		];
		device_scanner.__set__('SCAN_REQUEST_LIST', SCAN_REQUEST_LIST);
		device_scanner.__set__('scanStrategies', scanStrategies);
		test.done();
	},
	'perform initial scan': function(test) {
		var currentDeviceList = {};
		var expDeviceTypes = {
			'T7': {
				'devices': [{
					'connectionTypes': [{
						'name': 'USB',
						'insertionMethod': 'scan',
					}, {
						'name': 'Ethernet',
						'insertionMethod': 'scan',
					}]
				}]
			},
		};
		deviceScanner.findAllDevices(currentDeviceList)
		.then(function(deviceTypes) {
			var testStatus = testScanResults(deviceTypes, expDeviceTypes, test, {'test': false, 'debug': false});
			test.ok(testStatus, 'Unexpected test result');
			var dA = deviceTypes[0].devices[0];

			device = new device_curator.device();
			device.open(dA.deviceType, dA.connectionTypes[0].str, dA.serialNumber)
			.then(function(res) {
				if(false) {
					console.log(
						"  - Opened T7:",
						res.productType,
						res.connectionTypeName,
						res.serialNumber
					);
				}
				// console.log('in t7_basic_test.js, openDevice', res);
				test.ok(true, 'Successfully scanned for and opened a device');
				test.done();
			}, function(err) {
				console.log('Failed to open device', err);
				test.ok(false,'Failed to open device: ' + err.toString());
				test.done();
			});
		}, function(err) {
			console.log('Scanning Error');
			test.ok(false,'Failed to scan for devices: ' + err.toString());
			test.done();
		});
	},
	'verify device communications': function(test) {
		device.read('PRODUCT_ID')
		.then(function(productID) {
			test.ok(true, 'Verified device communications');
			test.done();
		}, function(err) {
			test.ok(false, 'Unable to read the Product ID', err);
			test.done();
		});
	},
	'Re-scan for devices': function(test) {
		var currentDeviceList = [device];
		var expDeviceTypes = {
			'T7': {
				'devices': [{
					'connectionTypes': [{
						'name': 'USB',
						'insertionMethod': 'scan',
					}, {
						'name': 'WiFi',
						'insertionMethod': 'attribute',
					}]
				}]
			},
		};
		deviceScanner.findAllDevices(currentDeviceList)
		.then(function(deviceTypes) {
			var testStatus = testScanResults(deviceTypes, expDeviceTypes, test, {'test': false, 'debug': false});
			test.ok(testStatus, 'Unexpected test result');
			var dA = deviceTypes[0].devices[0];

			test.strictEqual(
				dA.serialNumber,
				device.savedAttributes.serialNumber,
				'Unexpected Scanned-for device'
			);

			test.ok(true, 'Successfully scanned for devices');
			test.done();
		}, function(err) {
			console.log('Scanning Error');
			test.ok(false,'Failed to scan for devices: ' + err.toString());
			test.done();
		});
	},
	// 'verify device communications did not break': function(test) {
	// 	device.read('PRODUCT_ID')
	// 	.then(function(productID) {
	// 		test.ok(true, 'Verified device communications');
	// 		test.done();
	// 	}, function(err) {
	// 		test.ok(false, 'Unable to read the Product ID', err);
	// 		test.done();
	// 	});
	// },
	'close Device': function(test) {
		device.close()
		.then(function(res) {
			test.done();
		}, function(err) {
			console.log('Failed to close device', err);
			// test.ok(false, 'failed to close');
			test.done();
		})
	},
};