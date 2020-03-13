
var rewire = require('rewire');
var device_scanner = rewire('../../lib/ljswitchboard-device_scanner');

var test_util = require('../utils/test_util');
var printAvailableDeviceData = test_util.printAvailableDeviceData;
var testScanResults = test_util.testScanResults;
var printScanResultsKeys = test_util.printScanResultsKeys;
var verifyScanResults = test_util.verifyScanResults;

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
				'deviceType': 'LJM_dtT5',
				'connectionType': 'LJM_ctUSB',
				'serialNumber': 5,
			},
			{
				'deviceType': 'LJM_dtT4',
				'connectionType': 'LJM_ctUSB',
				'serialNumber': 4,
			},
			{
				'deviceType': 'LJM_dtT8',
				'connectionType': 'LJM_ctUSB',
				'serialNumber': 8,
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
			// The T4/T5/T8 don't necessairly have WiFi 
			'T8': {
				'devices': [{
					'connectionTypes': [{
						'name': 'USB',
						'insertionMethod': 'scan',
					}, {
						'name': 'Ethernet',
						'insertionMethod': 'attribute'
					}, {
						'name': 'WiFi',
						'insertionMethod': 'attribute'
					}]
				}]
			},
			'T5': {
				'devices': [{
					'connectionTypes': [{
						'name': 'USB',
						'insertionMethod': 'scan',
					}, {
						'name': 'Ethernet',
						'insertionMethod': 'attribute'
					}, {
						'name': 'WiFi',
						'insertionMethod': 'attribute'
					}]
				}]
			},
			'T4': {
				'devices': [{
					'connectionTypes': [{
						'name': 'USB',
						'insertionMethod': 'scan',
					}, {
						'name': 'Ethernet',
						'insertionMethod': 'attribute'
					}, {
						'name': 'WiFi',
						'insertionMethod': 'attribute'
					}]
				}]
			},
		};

		deviceScanner.findAllDevices()
		.then(function(deviceTypes) {
			// console.log('Device Type information:', deviceTypes);
			var outStr = JSON.stringify(deviceTypes, null, 4);
			fs = require('fs');
			path = require('path');
			var fp = path.join(process.cwd(), 'scan_data.json');
			fs.writeFileSync(fp, outStr);

			// console.log('Manual Debug Results', deviceTypes);
			// deviceTypes.forEach(function(deviceType) {
			// 	var devices = deviceType.devices;
			// 	devices.forEach(function(device) {
			// 		// console.log('Device Info...', device);
			// 		device.connectionTypes.forEach(function(ct){
			// 			console.log(
			// 				device.serialNumber,
			// 				'CT:',
			// 				ct.connectionTypeName,
			// 				ct.isScanned,
			// 				ct.insertionMethod);
			// 		});
			// 	});
			// });

			var endTime = new Date();
			var debug = false;
			// printScanResultsKeys(deviceTypes);
			verifyScanResults(deviceTypes, test);
			testScanResults(deviceTypes, expectedData, test, {'debug': debug});
			
			if(debug) {
				console.log('  - Duration', (endTime - startTime)/1000);
			}
			test.done();
		}, function(err) {
			console.log('Scanning Error', err);
			test.done();
		});
	},
	'unload': function(test) {
		device_scanner.unload();
		test.done();
	},
};