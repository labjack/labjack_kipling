var assert = require('chai').assert;

var rewire = require('rewire');
var device_scanner = rewire('../../lib/ljswitchboard-device_scanner');
var open_all_device_scanner = rewire('../../lib/open_all_device_scanner');
var driver_const = require('ljswitchboard-ljm_driver_constants');
var REQUIRED_INFO_BY_DEVICE = require('../../lib/required_device_info').requiredInfo;
var test_util = require('../utils/test_util');
var testScanResults = test_util.testScanResults;
var device_curator = require('ljswitchboard-ljm_device_curator');
var driver = require('labjack-nodejs').driver();

var deviceScanner;
var devices = [];

describe('mock openall', function() {
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
			console.log('Device Types', deviceTypes);
			var endTime = new Date();
			var debug = false;

			testScanResults(deviceTypes, expectedData, {'debug': true});

			if(debug) {
				console.log('  - Duration', (endTime - startTime)/1000);
			}
			done();
		}, function(err) {
			console.log('Scanning Error', err);
			done();
		});
	});
	it('re-configure - UDP Only', function (done) {
		var OPEN_ALL_SCAN_REQUEST_LIST = [
		    {
		        'deviceType': driver_const.LJM_DT_T7,
		        'connectionType': driver_const.LJM_CT_UDP,
		        'addresses': REQUIRED_INFO_BY_DEVICE.LJM_dtT7,
		        'numAttempts': 2,
		        'async': false,
		    },
		];
		open_all_device_scanner.__set__('OPEN_ALL_SCAN_REQUEST_LIST', OPEN_ALL_SCAN_REQUEST_LIST);
		done();
	});
	it('mock test - UDP Only', function (done) {
		var expectedData = {
			'T7': {
				'devices': [{
					'connectionTypes': [{
						'name': 'Ethernet',
						'insertionMethod': 'scan',
					}, {
						'name': 'WiFi',
						'insertionMethod': 'attribute'
					}]
				}]
			}
		};

		deviceScanner.findAllDevices()
		.then(function(deviceTypes) {
			// console.log('HERE', deviceTypes);
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
			testScanResults(deviceTypes, expectedData, false);
			done();
		}, function(err) {
			console.log('Scanning Error', err);
			done();
		});
	});

	it('re-configure - USB Only', function (done) {
		var OPEN_ALL_SCAN_REQUEST_LIST = [
		    {
		        'deviceType': driver_const.LJM_DT_DIGIT,
		        'connectionType': driver_const.LJM_CT_USB,
		        'addresses': REQUIRED_INFO_BY_DEVICE.LJM_dtDIGIT,
		        'numAttempts': 1,
		        'async': false,
		    },
		    {
		        'deviceType': driver_const.LJM_DT_T7,
		        'connectionType': driver_const.LJM_CT_USB,
		        'addresses': REQUIRED_INFO_BY_DEVICE.LJM_dtT7,
		        'numAttempts': 1,
		        'async': false,
		    },
		    // {
		    //     'deviceType': driver_const.LJM_DT_T7,
		    //     'connectionType': driver_const.LJM_CT_UDP,
		    //     'addresses': REQUIRED_INFO_BY_DEVICE.LJM_dtT7,
		    //     'numAttempts': 2,
		    //     'async': false,
		    // },
		];
		open_all_device_scanner.__set__('OPEN_ALL_SCAN_REQUEST_LIST', OPEN_ALL_SCAN_REQUEST_LIST);
		done();
	});
	it('mock test - USB Only', function (done) {
		var expectedData = {
			'T7': {
				'devices': [{
					'connectionTypes': [{
						'name': 'USB',
						'insertionMethod': 'scan',
					}, {
						'name': 'Ethernet',
						'insertionMethod': 'attribute',
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
			testScanResults(deviceTypes, expectedData, false);
			done();
		}, function(err) {
			console.log('Scanning Error', err);
			done();
		});
	});
	it('re-configure - Out of order', function (done) {
		var OPEN_ALL_SCAN_REQUEST_LIST = [
		    {
		        'deviceType': driver_const.LJM_DT_T7,
		        'connectionType': driver_const.LJM_CT_UDP,
		        'addresses': REQUIRED_INFO_BY_DEVICE.LJM_dtT7,
		        'numAttempts': 2,
		        'async': false,
		    },
		    {
		        'deviceType': driver_const.LJM_DT_DIGIT,
		        'connectionType': driver_const.LJM_CT_USB,
		        'addresses': REQUIRED_INFO_BY_DEVICE.LJM_dtDIGIT,
		        'numAttempts': 1,
		        'async': false,
		    },
		    {
		        'deviceType': driver_const.LJM_DT_T7,
		        'connectionType': driver_const.LJM_CT_USB,
		        'addresses': REQUIRED_INFO_BY_DEVICE.LJM_dtT7,
		        'numAttempts': 1,
		        'async': false,
		    },
		];
		open_all_device_scanner.__set__('OPEN_ALL_SCAN_REQUEST_LIST', OPEN_ALL_SCAN_REQUEST_LIST);
		done();
	});
	it('mock test - Out of order', function (done) {
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
			// console.log('HERE', deviceTypes);
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
			testScanResults(deviceTypes, expectedData, false);
			done();
		}, function(err) {
			console.log('Scanning Error', err);
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
	it('basic test', function (done) {
		var currentDeviceList = [];
		var startTime = new Date();
		deviceScanner.findAllDevices(devices)
		.then(function(deviceTypes) {
			// printScanResultsData(deviceTypes);
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
