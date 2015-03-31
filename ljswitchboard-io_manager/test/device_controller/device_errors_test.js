

var utils = require('../utils/utils');
var testDeviceObject = utils.testDeviceObject;
var testDeviceObjects = utils.testDeviceObjects;

var qRunner = utils.qRunner;
var qExec = utils.qExec;
var pResults = utils.pResults;
var q = require('q');
var constants = require('../../lib/common/constants');

var test_util = require('../utils/scanner_test_util');
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

var capturedEvents = [];
var capturedDeviceEvents = [];

var getDeviceControllerEventListener = function(eventKey) {
	var deviceControllerEventListener = function(eventData) {
		// console.log('Captured an event', eventKey);
		capturedEvents.push({'eventName': eventKey, 'data': eventData});
	};
	return deviceControllerEventListener;
};

var getDeviceEventListener = function(eventKey) {
	var deviceEventListener = function(eventData) {
		capturedDeviceEvents.push({'eventName': eventKey, 'data': eventData});
	};
	return deviceEventListener;
};

var deviceParameters = [{
	'deviceType': 'LJM_dtT7',
	'connectionType': 'LJM_ctUSB',
	'identifier': 'LJM_idANY',
}];
// deviceParameters[0].connectionType = 'LJM_ctWifi';
// deviceParameters[0].identifier = 470010610;

exports.tests = {
	'initialization': function(test) {
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

			test.ok(true);
			test.done();
		}, function(err) {
			test.ok(false, 'error initializing io_interface' + JSON.stringify(err));
			test.done();
		});
	},
	'open device': function(test) {
		var reportedToCmd = false;
		var connectToDevice = function() {
			var params = deviceParameters[0];

			device_controller.openDevice(params)
			.then(function(newDevice) {
				device = newDevice;
				var deviceEventKeys = Object.keys(constants.deviceEvents);
				deviceEventKeys.forEach(function(eventKey) {
					var eventName = constants.deviceEvents[eventKey];
					newDevice.on(eventName, getDeviceEventListener(eventName));
				});

				setTimeout(function() {
					if(capturedEvents.length != 1) {
						test.ok(false, 'unexpected number of events triggered.');
					} else {
						test.ok(true);
					}
					test.done();
				},50);
			}, function(err) {
				if(!reportedToCmd) {
					console.log('  - Please Connect a Device', params);
					reportedToCmd = true;
				}
				setTimeout(connectToDevice, 50);
			});
		};
		connectToDevice();
	},
	'cause device error': function(test) {
		// Check to make sure that the device object is an event emitter.
		test.strictEqual(
			typeof(device.on),
			'function',
			'device is not an event emitter'
		);
		var errorDetected = false;
		device.once('DEVICE_ERROR', function(data) {
			errorDetected = true;
		});
		device.read('AINA')
		.then(function(res) {
			test.ok(false, 'Should have run into an error');
		}, function(err) {
			test.ok(errorDetected, 'device should have thrown a "DEVICE_ERROR"');
			test.done();
		});
	},
	'disconnect device': function(test) {
		console.log('  - Please Disconnect Device');
		device.once('DEVICE_DISCONNECTED', function() {
			console.log('  - Device Disconnected');
			test.done();
		});
	},
	'wait for reconnecting error': function(test) {
		device.once('DEVICE_ERROR', function(data) {
			test.done();
		});
	},
	'get latest errors': function(test) {
		device.getLatestDeviceErrors()
		.then(function(latestErrors) {
			// console.log('Latest Errors', latestErrors);
			test.strictEqual(latestErrors.numErrors, 3);
			test.strictEqual(latestErrors.errors.length, 3);
			test.done();
		});
	},
	'test reconnectToDevice': function(test) {
		console.log('  - Please Reconnect Device');
		device.once('DEVICE_RECONNECTED', function() {
			console.log('  - Device Reconnected');
			test.done();
		});
	},
	'close device': function(test) {
		device.close()
		.then(function() {
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