var assert = require('chai').assert;

var rewire = require('rewire');
var device_scanner = rewire('../../lib/device_scanner');
var driver = require('labjack-nodejs').driver();

var test_util = require('../utils/test_util');
var testScanResults = test_util.testScanResults;
var verifyScanResults = test_util.verifyScanResults;

var deviceScanner;

describe('mock', function() {
	it('Starting Mock Test', function (done) {
		console.log('');
		console.log('*** Starting Mock Test ***');
		done();
	});
	it('create device scanner', function (done) {
		deviceScanner = new device_scanner.createDeviceScanner(driver);
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
			verifyScanResults(deviceTypes, test);
			var endTime = new Date();
			var debug = false;

			testScanResults(deviceTypes, expectedData, {'debug': false});
			// printScanResultsKeys(deviceTypes);
			if(debug) {
				console.log('  - Duration', (endTime - startTime)/1000);
			}
			done();
		}, function(err) {
			console.log('Scanning Error', err);
			done();
		});
	});
	it('re-configure - TCP all & extended', function (done) {
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
		done();
	});
	it('mock test - TCP all & extended', function (done) {
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
			testScanResults(deviceTypes, expectedData, false);
			done();
		}, function(err) {
			console.log('Scanning Error', err);
			done();
		});
	});
	it('re-configure - TCP extended', function (done) {
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
		done();
	});
	it('mock test - TCP extended', function (done) {
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
			testScanResults(deviceTypes, expectedData, false);
			done();
		}, function(err) {
			console.log('Scanning Error', err);
			done();
		});
	});
	it('re-configure - TCP all', function (done) {
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
		done();
	});
	it('mock test - TCP all', function (done) {
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
			testScanResults(deviceTypes, expectedData, false);
			done();
		}, function(err) {
			console.log('Scanning Error', err);
			done();
		});
	});
	it('re-configure - USB all & extended', function (done) {
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
		done();
	});
	it('mock test - USB all & extended', function (done) {
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
	it('re-configure - USB extended', function (done) {
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
		done();
	});
	it('mock test - USB extended', function (done) {
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
	it('re-configure - USB all', function (done) {
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
		done();
	});
	it('mock test - USB all', function (done) {
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
			testScanResults(deviceTypes, expectedData, false);
			done();
		}, function(err) {
			console.log('Scanning Error', err);
			done();
		});
	});
});
