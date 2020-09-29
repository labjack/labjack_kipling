var assert = require('chai').assert;

var fs = require('fs');
var path = require('path');
var rewire = require('rewire');
var device_scanner = rewire('../lib/device_scanner');

var test_util = require('./utils/test_util');
var testScanResults = test_util.testScanResults;

var performScan = function(done) {
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
		testScanResults(deviceTypes, expectedData, {'test': false});
		console.log('Duration', (stopTime - startTime)/1000);
		done();
	}, function(err) {
		console.log('Scanning Error');
		done();
	});
};

var eventList = require('../lib/event_list').eventList;
var getEventHandler = function(eventName) {
	var eventHandler = function(data) {
		var time = new Date();
		var hrTime = process.hrTime;
		// console.log('  * Event fired:', eventName, data, time.valueOf());
	};
	return eventHandler;
};

var saveDataToFile = function(data) {
	var defered = q.defer();
	if(fileFD) {
		fs.write(fileFD, data, function(err, written){

		});
	} else {
		defered.resolve();
	}
	return defered.promise;
};
var deviceScanner;
var fileFD;

describe('crazy', function() {
	it('Starting Mock Test', function (done) {
		console.log('');
		console.log('*** Starting Crazy Test ***');
		done();
	});
	it('Open debug file', function (done) {
		var cwd = process.cwd();
		var debugFileName = 'crazy_test_dump.txt';
		var filePath = path.join(cwd, debugFileName);
		console.log('HERE', filePath);
		fs.open(filePath, 'w', function(err, fd) {
			if(err) {
				console.log('!!! error opening file');
			} else {
				fileFD = fd;
				done();
			}
		});
	});
	it('create device scanner', function (done) {
		deviceScanner = require('../lib/ljswitchboard-device_scanner').getDeviceScanner();

		var eventsToHandle = [
			eventList.PERFORMING_LIST_ALL_EXTENDED,
			eventList.FINISHED_LIST_ALL_EXTENDED,
			eventList.PERFORMING_LIST_ALL,
			eventList.FINISHED_LIST_ALL,
			eventList.VERIFYING_DEVICE_CONNECTION,
			eventList.VERIFIED_DEVICE_CONNECTION,
			eventList.FAILED_DEVICE_CONNECTION_VERIFICATION,
		];
		eventsToHandle.forEach(function(eventKey) {
			deviceScanner.on(eventKey, getEventHandler(eventKey));
		});
		done();
	});
	it('configure crazy test', function (done) {
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
		done();
	});

	var numScans = 0;
	var i;
	for(i = 0; i < numScans; i++) {
		var testName = 'Performing scan number:' + i.toString();
		it(testName, performScan);
	}

	it('closeDebugFile', function (done) {
		if(fileFD) {
			fs.close(fileFD, function(err) {
				if(err) {
					console.log('!!! Error closing debug file');
					done();
				} else {
					done();
				}
			});
		}
	});

});
