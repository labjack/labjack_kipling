/**
	This test aims to show how the io_manager library should be used.  It
	shows the initialization, some basic usage steps, and destruction of the
	library.
**/

var assert = require('chai').assert;

var constants = require('../../lib/common/constants');

var test_util = require('../utils/scanner_test_util');
var testScanResults = test_util.testScanResults;

var io_manager;
var io_interface;

// Managers
var driver_controller;
var device_controller;

var device;
var deviceB;

var capturedEvents = [];

var getDeviceControllerEventListener = function(eventKey) {
	var deviceControllerEventListener = function(eventData) {
		// console.log('Captured an event', eventKey);
		capturedEvents.push({'eventName': eventKey, 'data': eventData});
	};
	return deviceControllerEventListener;
};

describe('open advanced', function() {
	return;
	this.skip();
	it('initialization', function (done) {
		// Require the io_manager library
		io_manager = require('../../lib/io_manager');

		// Require the io_interface that gives access to the ljm driver,
		// device controller, logger, and file_io_controller objects.
		io_interface = io_manager.io_interface();


		// Initialize the io_interface
		io_interface.initialize()
		.then(function(res) {
			// io_interface has initialized and is ready for use

			// Save local pointers to the created objects
			driver_controller = io_interface.getDriverController();
			device_controller = io_interface.getDeviceController();

			var eventKeys = Object.keys(constants.deviceControllerEvents);
			eventKeys.forEach(function(eventKey) {
				var eventName = constants.deviceControllerEvents[eventKey];
				device_controller.on(
					eventName,
					getDeviceControllerEventListener(eventName)
				);
			});

			assert.isOk(true);
			done();
		}, function(err) {
			assert.isOk(false, 'error initializing io_interface' + JSON.stringify(err));
			done();
		});
	});
	it('open mock device', function (done) {
		var mockData = {
			'serialNumber': 1010,
			'HARDWARE_INSTALLED': 15,
		};
		var params = {
			'deviceType': 'LJM_dtT7',
			'connectionType': 'LJM_ctUSB',
			'identifier': 'LJM_idANY',
			'mockDevice': true,
			'mockDeviceConfig': mockData,
		};

		device_controller.openDevice(params)
		.then(function(newDevice) {
			device = newDevice;
			setTimeout(function() {
				if(capturedEvents.length != 1) {
					assert.isOk(false, 'unexpected number of events triggered.');
				} else {
					assert.isOk(true);
				}
				done();
			},50);
		}, function(err) {
			console.log("Error opening device", err);
			assert.isOk(false, 'failed to create new device object');
			done();
		});
	});
	it('get mock device attributes', function (done) {
		device.getDeviceAttributes()
		.then(function(res) {
			// Test to make sure that there are a few key attributes.
			var requiredAttributes = [
				'deviceType',
				'connectionType',
				'serialNumber',
				'ip',
				'port',
				'maxBytesPerMB',
				'deviceTypeString',
				'deviceClass',
				'openParameters',
				'subclass',
				'isPro',
				'productType'
			];
			var listToCheck = {
				'serialNumber': 1010,
				'ip': '0.0.0.0',
			};
			var givenAttributes = Object.keys(res);
			requiredAttributes.forEach(function(requiredAttribute) {
				var msg = 'Required key does not exist: ' + requiredAttribute;
				assert.isOk((givenAttributes.indexOf(requiredAttribute) >= 0), msg);
			});
			var keys = Object.keys(listToCheck);
			keys.forEach(function(key) {
				assert.strictEqual(res[key], listToCheck[key], 'unexpected mock device attribute value');
			});
			done();
		}, function(err) {
			assert.isOk(false, 'read should not have returned an error: ' + JSON.stringify(err));
			done();
		});
	});
	it('open second device', function (done) {
		capturedEvents = [];
		// Configure the device so that its serial number is one of the mock
		// devices that gets found.
		var mockData = {
			'serialNumber': 1,
			'HARDWARE_INSTALLED': 15,
			'ipAddress': '192.168.1.100',
		};

		var params = {
			'deviceType': 'LJM_dtT7',
			'connectionType': 'LJM_ctETHERNET',
			'identifier': 'LJM_idANY',
			'mockDevice': true,
			'mockDeviceConfig': mockData
		};


		device_controller.openDevice(params)
		.then(function(newDevice) {
			deviceB = newDevice;
			setTimeout(function() {
				if(capturedEvents.length != 1) {
					assert.isOk(false, 'unexpected number of events triggered.');
				} else {
					assert.isOk(true);
				}
				done();
			},50);
		}, function(err) {
			console.log("Error opening device", err);
			assert.isOk(false, 'failed to create new device object');
			done();
		});
	});
	it('get mock deviceB attributes', function (done) {
		deviceB.getDeviceAttributes()
		.then(function(res) {
			// Test to make sure that there are a few key attributes.
			var requiredAttributes = [
				'deviceType',
				'connectionType',
				'serialNumber',
				'ip',
				'port',
				'maxBytesPerMB',
				'deviceTypeString',
				'deviceClass',
				'openParameters',
				'subclass',
				'isPro',
				'productType'
			];
			var listToCheck = {
				'serialNumber': 1,
				'ip': '192.168.1.100',
			};
			var givenAttributes = Object.keys(res);
			requiredAttributes.forEach(function(requiredAttribute) {
				var msg = 'Required key does not exist: ' + requiredAttribute;
				assert.isOk((givenAttributes.indexOf(requiredAttribute) >= 0), msg);
			});
			var keys = Object.keys(listToCheck);
			keys.forEach(function(key) {
				assert.strictEqual(res[key], listToCheck[key], 'unexpected mock device attribute value');
			});
			done();
		}, function(err) {
			assert.isOk(false, 'read should not have returned an error: ' + JSON.stringify(err));
			done();
		});
	});
	it('disable device scanning', function (done) {
		device_controller.enableMockDeviceScanning()
		.then(function() {
			done();
		});
	});
	it('Add mock devices', function (done) {
		device_controller.addMockDevices([
			{
				'deviceType': 'LJM_dtT7',
				'connectionType': 'LJM_ctUSB',
				'serialNumber': 1,
			},
			{
				'deviceType': 'LJM_dtT7',
				'connectionType': 'LJM_ctETHERNET',
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
	it('get device listing', function (done) {
		device_controller.getDeviceListing()
		.then(function(foundDevices) {
			assert.strictEqual(foundDevices.length, 2, 'Unexpected number of already open devices');
			done();
		});
	});

	it('cached listAllDevices - empty', function (done) {
		device_controller.getCachedListAllDevices()
		.then(function(res) {
			// This result should be an empty array because the listAllDevices
			// function hasn't been called yet.
			assert.deepEqual(res, [], 'array should be empty');

			done();
		});
	});
	it('list all devices', function (done) {
		var expectedData = {
			'T7': {
				'devices': [{
					'connectionTypes': [{
						'name': 'USB',
						'insertionMethod': 'scan',
						'isActive': false,
					}, {
						'name': 'Ethernet',
						'insertionMethod': 'scan',
						'isActive': true,
					}, {
						'name': 'WiFi',
						'insertionMethod': 'attribute',
						'isActive': false,
					}]
				}, {
					'connectionTypes': [{
						'name': 'USB',
						'insertionMethod': 'connected',
						'isActive': true,
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
		// Mocking out the listAllDevices function call sounds like a night mare
		// Therefore, the solution to verifying its functionality will be to
		// check for a properly formatted & discovered mock-device.
		device_controller.listAllDevices()
		.then(function(deviceTypes) {
			testScanResults(deviceTypes, expectedData, {'debug': false, 'test': true});
			done();
		});
	});
	it('cached listAllDevices - populated', function (done) {
		device_controller.getCachedListAllDevices()
		.then(function(res) {
			// This result should not be an empty array because the
			// listAllDevices function has been called.
			var len = res.length;
			if(len > 0) {
				assert.isOk(true);
			} else {
				assert.isOk(false, 'array should not be empty');
			}
			done();
		});
	});
	it('close mock device', function (done) {
		capturedEvents = [];
		device.close()
		.then(function(res) {
			setTimeout(function() {
				if(capturedEvents.length != 1) {
					assert.isOk(false, 'unexpected number of events triggered.');
				} else {
					assert.isOk(true);
				}
				done();
			},50);
		}, function(err) {
			console.log('Failed to close', err);
			assert.isOk(false);
			done();
		});
	});
	it('destruction', function (done) {
		setImmediate(function() {
			io_interface.destroy()
			.then(function(res) {
				// io_interface process has been shut down
				assert.isOk(true);
				done();
			}, function(err) {
				assert.isOk(false, 'io_interface failed to shut down' + JSON.stringify(err));
				done();
			});
		});

	});
});
