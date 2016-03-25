
var rewire = require('rewire');
var device_scanner = rewire('../../lib/device_scanner');
var driver = require('LabJack-nodejs').driver();

var test_util = require('../utils/test_util');
var printAvailableDeviceData = test_util.printAvailableDeviceData;
var printScanResultsData = test_util.printScanResultsData;
var printScanResultsKeys = test_util.printScanResultsKeys;
var testScanResults = test_util.testScanResults;
var verifyScanResults = test_util.verifyScanResults;

var deviceScanner;
exports.tests = {
	'Starting Mock Test': function(test) {
		console.log('');
		console.log('*** Starting Mock Test ***');
		test.done();
	},
	'create device scanner': function(test) {
		deviceScanner = new device_scanner.createDeviceScanner(driver);
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
			verifyScanResults(deviceTypes, test);
			var endTime = new Date();
			var debug = false;

			testScanResults(deviceTypes, expectedData, test, {'debug': false});
			// printScanResultsKeys(deviceTypes);
			if(debug) {
				console.log('  - Duration', (endTime - startTime)/1000);
			}
			test.done();
		}, function(err) {
			console.log('Scanning Error', err);
			test.done();
		});
	},
	're-configure - TCP all & extended': function(test) {
		var SCAN_REQUEST_LIST = [{
				'deviceType': 'LJM_dtT7',
				'connectionType': 'LJM_ctTCP',
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
	'mock test - TCP all & extended': function(test) {
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
			testScanResults(deviceTypes, expectedData, test, false);
			test.done();
		}, function(err) {
			console.log('Scanning Error', err);
			test.done();
		});
	},
	're-configure - TCP extended': function(test) {
		var SCAN_REQUEST_LIST = [{
				'deviceType': 'LJM_dtT7',
				'connectionType': 'LJM_ctTCP',
				'addresses': device_scanner.REQUIRED_INFO_BY_DEVICE.LJM_dtT7
			}];
		var scanStrategies = [
			{'type': 'listAllExtended', 'enabled': true},
		];
		device_scanner.__set__('SCAN_REQUEST_LIST', SCAN_REQUEST_LIST);
		device_scanner.__set__('scanStrategies', scanStrategies);
		test.done();
	},
	'mock test - TCP extended': function(test) {
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
			testScanResults(deviceTypes, expectedData, test, false);
			test.done();
		}, function(err) {
			console.log('Scanning Error', err);
			test.done();
		});
	},
	're-configure - TCP all': function(test) {
		var SCAN_REQUEST_LIST = [{
				'deviceType': 'LJM_dtT7',
				'connectionType': 'LJM_ctTCP',
				'addresses': device_scanner.REQUIRED_INFO_BY_DEVICE.LJM_dtT7
			}];
		var scanStrategies = [
			{'type': 'listAll', 'enabled': true},
		];
		device_scanner.__set__('SCAN_REQUEST_LIST', SCAN_REQUEST_LIST);
		device_scanner.__set__('scanStrategies', scanStrategies);
		test.done();
	},
	'mock test - TCP all': function(test) {
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
			testScanResults(deviceTypes, expectedData, test, false);
			test.done();
		}, function(err) {
			console.log('Scanning Error', err);
			test.done();
		});
	},
	're-configure - USB all & extended': function(test) {
		var SCAN_REQUEST_LIST = [{
				'deviceType': 'LJM_dtDIGIT',
				'connectionType': 'LJM_ctUSB',
				'addresses': device_scanner.REQUIRED_INFO_BY_DEVICE.LJM_dtDIGIT
			}, {
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
	'mock test - USB all & extended': function(test) {
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
			testScanResults(deviceTypes, expectedData, test, false);
			test.done();
		}, function(err) {
			console.log('Scanning Error', err);
			test.done();
		});
	},
	're-configure - USB extended': function(test) {
		var SCAN_REQUEST_LIST = [{
				'deviceType': 'LJM_dtDIGIT',
				'connectionType': 'LJM_ctUSB',
				'addresses': device_scanner.REQUIRED_INFO_BY_DEVICE.LJM_dtDIGIT
			}, {
				'deviceType': 'LJM_dtT7',
				'connectionType': 'LJM_ctUSB',
				'addresses': device_scanner.REQUIRED_INFO_BY_DEVICE.LJM_dtT7
			}];
		var scanStrategies = [
			{'type': 'listAllExtended', 'enabled': true},
		];

		device_scanner.__set__('SCAN_REQUEST_LIST', SCAN_REQUEST_LIST);
		device_scanner.__set__('scanStrategies', scanStrategies);
		test.done();
	},
	'mock test - USB extended': function(test) {
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
			testScanResults(deviceTypes, expectedData, test, false);
			test.done();
		}, function(err) {
			console.log('Scanning Error', err);
			test.done();
		});
	},
	're-configure - USB all': function(test) {
		var SCAN_REQUEST_LIST = [{
				'deviceType': 'LJM_dtDIGIT',
				'connectionType': 'LJM_ctUSB',
				'addresses': device_scanner.REQUIRED_INFO_BY_DEVICE.LJM_dtDIGIT
			}, {
				'deviceType': 'LJM_dtT7',
				'connectionType': 'LJM_ctUSB',
				'addresses': device_scanner.REQUIRED_INFO_BY_DEVICE.LJM_dtT7
			}];
		var scanStrategies = [
			{'type': 'listAll', 'enabled': true},
		];

		device_scanner.__set__('SCAN_REQUEST_LIST', SCAN_REQUEST_LIST);
		device_scanner.__set__('scanStrategies', scanStrategies);
		test.done();
	},
	'mock test - USB all': function(test) {
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
			testScanResults(deviceTypes, expectedData, test, false);
			test.done();
		}, function(err) {
			console.log('Scanning Error', err);
			test.done();
		});
	},
	're-configure - Out of order': function(test) {
		var SCAN_REQUEST_LIST = [{
				'deviceType': 'LJM_dtT7',
				'connectionType': 'LJM_ctTCP',
				'addresses': device_scanner.REQUIRED_INFO_BY_DEVICE.LJM_dtT7
			}, {
				'deviceType': 'LJM_dtDIGIT',
				'connectionType': 'LJM_ctUSB',
				'addresses': device_scanner.REQUIRED_INFO_BY_DEVICE.LJM_dtDIGIT
			}, {
				'deviceType': 'LJM_dtT7',
				'connectionType': 'LJM_ctUSB',
				'addresses': device_scanner.REQUIRED_INFO_BY_DEVICE.LJM_dtT7
			}, ];
		var scanStrategies = [
			{'type': 'listAllExtended', 'enabled': true},
			{'type': 'listAll', 'enabled': true},
		];

		device_scanner.__set__('SCAN_REQUEST_LIST', SCAN_REQUEST_LIST);
		device_scanner.__set__('scanStrategies', scanStrategies);
		test.done();
	},
	'mock test - Out of order': function(test) {
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
			testScanResults(deviceTypes, expectedData, test, false);
			test.done();
		}, function(err) {
			console.log('Scanning Error', err);
			test.done();
		});
	},
};