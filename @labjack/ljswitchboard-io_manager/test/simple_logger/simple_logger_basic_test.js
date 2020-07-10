
/**
	This test aims to show how the io_manager library should be used.  It
	shows the initialization, some basic usage steps, and destruction of the
	library.
**/

var fse = require('fs-extra');
var path = require('path');

var LOG_CWD = path.join(process.cwd(),'test','simple_logger','output');
var TEST_NAME = 'io_man-simp_log_basic_test';

var utils = require('../utils/utils');
var testDeviceObject = utils.testDeviceObject;
var testDeviceObjects = utils.testDeviceObjects;

var q = require('q');
var constants = require('../../lib/common/constants');


var io_manager;
var io_interface;

var ENABLE_DEBUG = false;
function getPrinter(ENABLED) {
	return function print() {
		if(ENABLED) {
			console.log.apply(console, arguments);
		}
	}
}
var debug = getPrinter(ENABLE_DEBUG);


// Managers
var driver_controller;
var device_controller;

var device;
var deviceB;

var capturedEvents = [];

var getDeviceControllerEventListener = function(eventKey) {
	var deviceControllerEventListener = function(eventData) {
		capturedEvents.push({'eventName': eventKey, 'data': eventData});

		if(eventKey === 'NEW_VIEW_DATA') {
			if(eventData.view_type === 'current_values') {
				// New data is available for both devices... only display AIN0 of Dev 0.
				console.log(
					'  - New cur-vals data, data:',
					eventData.data_cache[mockDevices[0].mockDeviceConfig.serialNumber].AIN0.toFixed(2)
				);
			} else if(eventData.view_type === 'basic_graph') {
				console.log(
					'  - New Graph Data, numValsToDisplay:',
					eventData.data_cache.length
				);
			}
			// console.log('New View Data', eventData);
		} else {
			console.log('(simple-logger-evt): Captured an event', eventKey);
		}
	};
	return deviceControllerEventListener;
};

var mockDevices = [{
	'deviceType': 'LJM_dtT7',
	'connectionType': 'LJM_ctUSB',
	'identifier': 'LJM_idANY',
	'mockDevice': true,
	'mockDeviceConfig': {
		'serialNumber': 1010,
		'HARDWARE_INSTALLED': 15, // T7-Pro
		'FIRMWARE_VERSION': 1.0159
		},
}, {
	'deviceType': 'LJM_dtT7',
	'connectionType': 'LJM_ctETHERNET',
	'identifier': 'LJM_idANY',
	'mockDevice': true,
	'mockDeviceConfig': {
		'serialNumber': 1,
		'HARDWARE_INSTALLED': 15, // T7-Pro
		'ipAddress': '192.168.1.100',
		},
},
];
var printDeviceInfo = function(device) {
	console.log('Attributes:')
	var attributes = device.savedAttributes;
	var attrKeys = Object.keys(attributes);
	attrKeys.forEach(function(key) {
		if(typeof(attributes[key]) !== 'object') {
			console.log('  - ', key+':', attributes[key]);
		} else {
			console.log('  - ', key+':', '[...]');
		}
	});
};
exports.tests = {
	'initialization': function(test) {
		console.log('');
		console.log('**** simple_logger_basic_test ****');
		console.log('**** No Devices Required ****');

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
	'open mock device': function(test) {
		var params = mockDevices[0];

		device_controller.openDevice(params)
		.then(function(newDevice) {
			device = newDevice;
			test.ok(true, 'Device has been opened.');
			test.done();
		}, function(err) {
			console.log("Error opening device", err);
			test.ok(false, 'failed to create new device object');
			test.done();
		});
	},
	'open second device': function(test) {
		capturedEvents = [];
		// Configure the device so that its serial number is one of the mock
		// devices that gets found.
		var params = mockDevices[1];
		

		device_controller.openDevice(params)
		.then(function(newDevice) {
			deviceB = newDevice;
			test.ok(true, 'Device has been opened.');
			test.done();
		}, function(err) {
			console.log("Error opening device", err);
			test.ok(false, 'failed to create new device object');
			test.done();
		});
	},
	'get number of devices': function(test) {
		device_controller.getNumDevices()
		.then(function(numDevices) {
			test.strictEqual(numDevices, 2, 'Unexpected number of already open devices');
			test.done();
		});
	},
	'get device listing': function(test) {
		device_controller.getDeviceListing()
		.then(function(foundDevices) {
			test.strictEqual(foundDevices.length, 2, 'Unexpected number of already open devices');
			// console.log('Listing', foundDevices);
			test.done();
		});
	},
	'get devices': function(test) {
		device_controller.getDevices()
		.then(function(devices) {
			try {
				test.strictEqual(devices.length, 2, 'Unexpected number of already open devices');
				devices.forEach(function(device, i) {
					var expDevice = mockDevices[i];
				});
				testDeviceObjects(test, devices, mockDevices);
				// console.log('Device Objects', devices);
				test.done();
			} catch(err) {
				console.log('err', err, err.stack);
			}
		});
	},
	'initialize logger': function(test) {
		device_controller.initializeLogger()
		.then(function(res) {
			// debug('Initialized Logger');
			test.ok(true, 'Initialized logger');
			test.done();
		}, function(err) {
			console.error('Failed to initialize logger', err);
			test.ok(false, 'Failed to init logger.');
			test.done();
		});
	},
	'update logger device listing': function(test) {
		device_controller.updateLoggerDeviceListing()
		.then(function(res) {
			// debug('Updated Loggers device listing');
			test.ok(true);
			test.done();
		}, function(err) {
			console.error('Failed to update dev listing', err);
			test.ok(false, 'Failed to update dev listing.');
			test.done();
		});
	},
	'create output directory': function(test) {
		fse.ensureDir(LOG_CWD, function(err) {
			if(err) {
				console.log('Error ensuring directory', err);
				test.ok(false, 'Failed to create output directory');
			} else {
				test.ok(true);
			}
			test.done();
		});
	},
	'configure logger with basic configs.': function(test) {
		device_controller.configLoggerWithBasicConfigs(LOG_CWD, TEST_NAME)
		.then(function(res) {
			debug('Updated logger config');
			test.ok(true);
			test.done();
		}, function(err) {
			console.error('Failed to update  logger config', err);
			test.ok(false, 'Failed to update  logger config.');
			test.done();
		});
	},
	'start logger': function(test) {
		device_controller.startLogger()
		.then(function(res) {
			debug('Started logger');
			test.ok(true);
			test.done();
		}, function(err) {
			console.error('Failed to start logger', err);
			test.ok(false, 'Failed to start logger.');
			test.done();
		});
	},
	'wait for logger to run': function(test) {
		// device_controller.once()

		setTimeout(function() {
			device_controller.stopLogger()
			.then(function succ() {
				debug('Logger Stopped-succ');
				test.ok(true);
				test.done();
			}, function err() {
				debug('Logger Stopped-err');
				test.ok(false, 'logger should have stopped');
				test.done();
			});
		}, 5000)
	},
	'close mock device': function(test) {
		device.close()
		.then(function(res) {
			test.ok(true, 'device has been closed');
			test.done();
		}, function(err) {
			console.log('Failed to close', err);
			test.ok(false);
			test.done();
		});
	},
	
	'close mock device (2)': function(test) {
		deviceB.close()
		.then(function(res) {
			test.ok(true, 'device has been closed');
			test.done();
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