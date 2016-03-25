
var rewire = require('rewire');
var device_scanner = rewire('../../lib/ljswitchboard-device_scanner');
// var driver = require('LabJack-nodejs').driver();

var test_util = require('../utils/test_util');
var printAvailableDeviceData = test_util.printAvailableDeviceData;
var testScanResults = test_util.testScanResults;

var deviceScanner;
exports.tests = {
	'Starting Mock Test': function(test) {
		console.log('');
		console.log('*** Starting Basic Openall Mock Test ***');
		test.done();
	},
	'create device scanner': function(test) {
		device_scanner.disableSafeLoad();
		deviceScanner = device_scanner.deviceScanner();
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
	'mock test': function(test) {
		var startTime = new Date();
		
		// var expectedData = {
		// 	'T7': {
		// 		'devices': [{
		// 			'connectionTypes': [{
		// 				'name': 'USB',
		// 				'insertionMethod': 'scan',
		// 			}, {
		// 				'name': 'Ethernet',
		// 				'insertionMethod': 'scan',
		// 			}, {
		// 				'name': 'WiFi',
		// 				'insertionMethod': 'attribute'
		// 			}]
		// 		}]
		// 	},
		// 	'Digit': {
		// 		'devices': [{
		// 			'connectionTypes': [{
		// 				'name': 'USB',
		// 				'insertionMethod': 'scan',
		// 			}]
		// 		}]
		// 	},
		// };

		deviceScanner.findAllDevices()
		.then(function(deviceTypes) {
			// console.log('HERE', deviceTypes);
			// deviceTypes.forEach(function(deviceType) {
			// 	var devices = deviceType.devices;
			// 	devices.forEach(function(device) {
			// 		console.log('Device Info...', device);
			// 	});
			// });
			// var endTime = new Date();
			// var debug = false;

			// testScanResults(deviceTypes, expectedData, test, {'debug': false});
			
			// if(debug) {
			// 	console.log('  - Duration', (endTime - startTime)/1000);
			// }
			test.done();
		}, function(err) {
			console.log('Scanning Error', err);
			test.done();
		});
	},
};