
/**
	This test aims to show how the io_manager library should be used.  It
	shows the initialization, some basic usage steps, and destruction of the
	library.
**/

var utils = require('./utils/utils');
var qRunner = utils.qRunner;
var qExec = utils.qExec;
var pResults = utils.pResults;
var q = require('q');
var constants = require('../lib/common/constants');

var test_util = require('./utils/scanner_test_util');
var printAvailableDeviceData = test_util.printAvailableDeviceData;
var testScanResults = test_util.testScanResults;

var io_manager;
var io_interface;

// Managers
var driver_controller;
var device_controller;
var file_io_controller;
var logger_controller;

var device;
var deviceA;
var deviceB;

var capturedEvents = [];

var getDeviceControllerEventListener = function(eventKey) {
	var deviceControllerEventListener = function(eventData) {
		// console.log('Captured an event', eventKey);
		capturedEvents.push({'eventName': eventKey, 'data': eventData});
	};
	return deviceControllerEventListener;
};

exports.tests = {
	'initialization': function(test) {
		// Require the io_manager library
		io_manager = require('../lib/io_manager');

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

			test.ok(true);
			test.done();
		}, function(err) {
			test.ok(false, 'error initializing io_interface' + JSON.stringify(err));
			test.done();
		});
	},
	'open mock device': function(test) {
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
			deviceA = newDevice;
			setTimeout(function() {
				if(capturedEvents.length != 1) {
					test.ok(false, 'unexpected number of events triggered.');
				} else {
					test.ok(true);
				}
				test.done();
			},50);
		}, function(err) {
			console.log("Error opening device", err);
			test.ok(false, 'failed to create new device object');
			test.done();
		});
	},
	'get mock device attributes': function(test) {
		deviceA.getDeviceAttributes()
		.then(function(res) {
			// Test to make sure that there are a few key attributes.
			var requiredAttributes = [
				'deviceType',
				'connectionType',
				'serialNumber',
				'ip',
				'port',
				'maxBytesPerMB',
				'deviceTypeName',
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
				test.ok((givenAttributes.indexOf(requiredAttribute) >= 0), msg);
			});
			var keys = Object.keys(listToCheck);
			keys.forEach(function(key) {
				test.strictEqual(res[key], listToCheck[key], 'unexpected mock device attribute value');
			});
			test.done();
		}, function(err) {
			test.ok(false, 'read should not have returned an error: ' + JSON.stringify(err));
			test.done();
		});
	},
	'open first device': function(test) {
		capturedEvents = [];
		var params = {
			'deviceType': 'LJM_dtT7',
			'connectionType': 'LJM_ctUSB',
			'identifier': 'LJM_idANY'
		};

		device_controller.openDevice(params)
		.then(function(newDevice) {
			device = newDevice;
			setTimeout(function() {
				if(capturedEvents.length != 1) {
					test.ok(false, 'unexpected number of events triggered.');
				} else {
					test.ok(true);
				}
				test.done();
			},50);
		}, function(err) {
			console.log("Error opening device", err);
			test.ok(false, 'failed to create new device object');
			test.done();
		});
	},
	'get first device attributes': function(test) {
		device.getDeviceAttributes()
		.then(function(res) {
			// Test to make sure that there are a few key attributes.
			var requiredAttributes = [
				'deviceType',
				'connectionType',
				'serialNumber',
				'ipAddress',
				'port',
				'maxBytesPerMB',
				'deviceTypeName',
				'deviceTypeString',
				'deviceClass',
				'openParameters',
				'subclass',
				'isPro',
				'productType'
			];
			var listToCheck = {};
			var givenAttributes = Object.keys(res);
			requiredAttributes.forEach(function(requiredAttribute) {
				var msg = 'Required key does not exist: ' + requiredAttribute;
				test.ok((givenAttributes.indexOf(requiredAttribute) >= 0), msg);
			});
			var keys = Object.keys(listToCheck);
			keys.forEach(function(key) {
				test.strictEqual(res[key], listToCheck[key], 'unexpected mock device attribute value');
			});
			test.done();
		}, function(err) {
			test.ok(false, 'read should not have returned an error: ' + JSON.stringify(err));
			test.done();
		});
	},
	'open second device': function(test) {
		capturedEvents = [];

		var params = {
			'deviceType': 'LJM_dtT7',
			'connectionType': 'LJM_ctETHERNET',
			'identifier': 'LJM_idANY'
		};
		

		device_controller.openDevice(params)
		.then(function(newDevice) {
			deviceB = newDevice;
			setTimeout(function() {
				if(capturedEvents.length != 1) {
					test.ok(false, 'unexpected number of events triggered.');
				} else {
					test.ok(true);
				}
				test.done();
			},50);
		}, function(err) {
			console.log("Error opening device", err);
			test.ok(false, 'failed to create new device object');
			test.done();
		});
	},
	'get second device attributes': function(test) {
		deviceB.getDeviceAttributes()
		.then(function(res) {
			// Test to make sure that there are a few key attributes.
			var requiredAttributes = [
				'deviceType',
				'connectionType',
				'serialNumber',
				'ipAddress',
				'port',
				'maxBytesPerMB',
				'deviceTypeName',
				'deviceTypeString',
				'deviceClass',
				'openParameters',
				'subclass',
				'isPro',
				'productType'
			];
			var listToCheck = {};
			var givenAttributes = Object.keys(res);
			requiredAttributes.forEach(function(requiredAttribute) {
				var msg = 'Required key does not exist: ' + requiredAttribute;
				test.ok((givenAttributes.indexOf(requiredAttribute) >= 0), msg);
			});
			var keys = Object.keys(listToCheck);
			keys.forEach(function(key) {
				test.strictEqual(res[key], listToCheck[key], 'unexpected mock device attribute value');
			});
			test.done();
		}, function(err) {
			test.ok(false, 'read should not have returned an error: ' + JSON.stringify(err));
			test.done();
		});
	},
	'disable device scanning': function(test) {
		device_controller.enableMockDeviceScanning()
		.then(function() {
			test.done();
		});
	},
	'Add mock devices': function(test) {
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
			test.done();
		});
	},
	'get device listing': function(test) {
		device_controller.getDeviceListing()
		.then(function(foundDevices) {
			test.strictEqual(foundDevices.length, 3, 'Unexpected number of already open devices');
			test.done();
		});
	},
	'cached listAllDevices - empty': function(test) {
		device_controller.getCachedListAllDevices()
		.then(function(res) {
			// This result should be an empty array because the listAllDevices
			// function hasn't been called yet.
			test.deepEqual(res, [], 'array should be empty');

			test.done();
		});
	},
	'list all devices': function(test) {
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
						'isActive': false,
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
				}, {
					'connectionTypes': [{
						'name': 'USB',
						'insertionMethod': 'connected',
						'isActive': true,
					}]
				}, {
					'connectionTypes': [{
						'name': 'Ethernet',
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
		var extraActiveDeviceKeys = [
			'connectionType',
		];
		var requiredActiveDeviceKeys = [];
		var requiredInactiveDeviceKeys = [
			'isActive',
			'isMockDevice',
			'productType',
			'modelType',

			'deviceType',
			'deviceTypeName',
			'deviceTypeString',

			'connectionTypes',
			'serialNumber',
		];
		requiredInactiveDeviceKeys.forEach(function(key) {
			requiredActiveDeviceKeys.push(key);
		});
		extraActiveDeviceKeys.forEach(function(key) {
			requiredActiveDeviceKeys.push(key);
		});
		
		// Mocking out the listAllDevices function call sounds like a night mare
		// Therefore, the solution to verifying its functionality will be to 
		// check for a properly formatted & discovered mock-device.
		device_controller.listAllDevices()
		.then(function(deviceTypes) {
			testScanResults(deviceTypes, expectedData, test, {'debug': false, 'test': true});
			deviceTypes.forEach(function(deviceType) {
				var devices = deviceType.devices;
				devices.forEach(function(device) {
					// console.log('device', Object.keys(device));
					var keys;
					if(device.isActive) {
						keys = requiredActiveDeviceKeys;
					} else {
						keys = requiredInactiveDeviceKeys;
					}
					keys.forEach(function(key) {
						if(typeof(device[key]) !== 'undefined') {
							test.ok(true);
						} else {
							console.log('Missing Key for', device.serialNumber, key);
							test.ok(false, 'Missing required key: ' + key);
						}
					});
				});
			});
			test.done();
		});
	},
	'cached listAllDevices - populated': function(test) {
		device_controller.getCachedListAllDevices()
		.then(function(res) {
			// This result should not be an empty array because the 
			// listAllDevices function has been called.
			var len = res.length;
			if(len > 0) {
				test.ok(true);
			} else {
				test.ok(false, 'array should not be empty');
			}
			test.done();
		});
	},
	'close mock device': function(test) {
		capturedEvents = [];
		device.close()
		.then(function(res) {
			setTimeout(function() {
				if(capturedEvents.length != 1) {
					test.ok(false, 'unexpected number of events triggered.');
				} else {
					test.ok(true);
				}
				test.done();
			},50);
		}, function(err) {
			console.log('Failed to close', err);
			test.ok(false);
			test.done();
		});
	},
	'destruction': function(test) {
		setImmediate(function() {
			io_interface.destroy()
			.then(function(res) {
				// io_interface process has been shut down
				test.ok(true);
				test.done();
			}, function(err) {
				test.ok(false, 'io_interface failed to shut down' + JSON.stringify(err));
				test.done();
			});
		});
		
	}
};