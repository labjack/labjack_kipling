
var rewire = require('rewire');
// var device_scanner = require('../lib/ljswitchboard-device_scanner').getDeviceScanner();
var device_scanner = rewire('../lib/device_scanner');

var test_util = require('./test_util');
var printAvailableDeviceData = test_util.printAvailableDeviceData;
var testScanResults = test_util.testScanResults;

var performScan = function(test) {
	var expectedData = {
		'T7': {
			'devices': [{
				'connectionTypes': [{
					'name': 'USB',
					'insertionMethod': 'scan',
				}, {
					'name': 'Ethernet',
				}]
			}, {
				'connectionTypes': [{
					'name': 'USB',
					'insertionMethod': 'scan',
				}, {
					'name': 'Ethernet',
				}]
			}, {
				'connectionTypes': [{
					'name': 'USB',
					'insertionMethod': 'scan',
				}, {
					'name': 'Ethernet',
				}]
			}, {
				'connectionTypes': [{
					'name': 'Ethernet',
				}]
			}]
		},
		'Digit': {
			'devices': [{
				'connectionTypes': [{
					'name': 'USB',
					'insertionMethod': 'scan',
				}]
			}, {
				'connectionTypes': [{
					'name': 'USB',
					'insertionMethod': 'scan',
				}]
			}, {
				'connectionTypes': [{
					'name': 'USB',
					'insertionMethod': 'scan',
				}]
			}, {
				'connectionTypes': [{
					'name': 'USB',
					'insertionMethod': 'scan',
				}]
			}, {
				'connectionTypes': [{
					'name': 'USB',
					'insertionMethod': 'scan',
				}]
			}]
		}
	};
	var startTime = new Date();
	deviceScanner.findAllDevices()
	.then(function(deviceTypes) {
		var stopTime = new Date();
		testScanResults(deviceTypes, expectedData, test, {'test': false});
		console.log('Duration', (stopTime - startTime)/1000);
		test.done();
	}, function(err) {
		console.log('Scanning Error');
		test.done();
	});
};
var deviceScanner;
var tests = {
	'Starting Mock Test': function(test) {
		console.log('');
		console.log('*** Starting Crazy Test ***');
		test.done();
	},
	'create device scanner': function(test) {
		deviceScanner = new device_scanner.deviceScanner();
		test.done();
	},
	'configure crazy test': function(test) {
		// var SCAN_REQUEST_LIST = [{
		// 	'deviceType': 'LJM_dtDIGIT',
		// 	'connectionType': 'LJM_ctUSB',
		// 	'addresses': device_scanner.REQUIRED_INFO_BY_DEVICE.LJM_dtDIGIT
		// },{
		// 	'deviceType': 'LJM_dtt7',
		// 	'connectionType': 'LJM_ctUSB',
		// 	'addresses': device_scanner.REQUIRED_INFO_BY_DEVICE.LJM_dtT7
		// },{
		// 	'deviceType': 'LJM_dtt7',
		// 	'connectionType': 'LJM_ctTCP',
		// 	'addresses': device_scanner.REQUIRED_INFO_BY_DEVICE.LJM_dtT7
		// }];
		var SCAN_REQUEST_LIST = [{
			'deviceType': 'LJM_dtDIGIT',
			'connectionType': 'LJM_ctANY',
			'addresses': device_scanner.REQUIRED_INFO_BY_DEVICE.LJM_dtDIGIT
		},{
			'deviceType': 'LJM_dtT7',
			'connectionType': 'LJM_ctANY',
			'addresses': device_scanner.REQUIRED_INFO_BY_DEVICE.LJM_dtT7
		}];
		var scanStrategies = [
			// {'type': 'listAllExtended', 'enabled': true},
			// {'type': 'listAllExtended', 'enabled': true},
			{'type': 'listAll', 'enabled': true},
			{'type': 'listAll', 'enabled': true},

		];
		device_scanner.__set__('SCAN_REQUEST_LIST', SCAN_REQUEST_LIST);
		device_scanner.__set__('scanStrategies', scanStrategies);
		test.done();
	},
};

var numScans = 20;
var i;
for(i = 0; i < numScans; i++) {
	var testName = 'Performing scan number:' + i.toString();
	tests[testName] = performScan;
}

exports.tests = tests;