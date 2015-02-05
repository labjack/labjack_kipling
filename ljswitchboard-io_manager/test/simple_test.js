
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

var io_manager;
var io_interface;

// Managers
var driver_controller;
var device_controller;
var file_io_controller;
var logger_controller;

var device;

var capturedEvents = [];

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

			// Attach event listener to the device_controller object to detect
			// when a device is opened.
			var newDevEvent = constants.DEVICE_CONTROLLER_DEVICE_OPENED;
			device_controller.on(newDevEvent, function(data) {
				capturedEvents.push({'eventName':newDevEvent,'data':data});
				// console.log('Device Opened event:', data.serialNumber);
			});
			var closedDevEvent = constants.DEVICE_CONTROLLER_DEVICE_CLOSED;
			device_controller.on(closedDevEvent, function(data) {
				capturedEvents.push({'eventName':closedDevEvent,'data':data});
				// console.log('Device Closed event:', data);
			});

			test.ok(true);
			test.done();
		}, function(err) {
			test.ok(false, 'error initializing io_interface' + JSON.stringify(err));
			test.done();
		});
	},
	/**
		At its core, the driver_controller doesn't do much, it simply calls
		ljm functions from within a sub-process and returns the result.
		Therefore, we should test a very simple function whose return value
		never changes and not a complex function like listAll whose function
		should be tested else where.
	**/
	'use_driver_controller': function(test) {

		driver_controller.errToStr(1236)
		.then(function(res) {
			test.strictEqual(
				res,
				'Num: 1236, LJME_CANNOT_OPEN_DEVICE',
				'invalid error string detected'
			);
			test.done();
		});
	},
	'open mock device': function(test) {
		var params = {
			'deviceType': 'LJM_dtT7',
			'connectionType': 'LJM_ctUSB',
			'identifier': 'LJM_idANY',
			'mockDevice': true
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
	'close mock device': function(test) {
		device.close()
		.then(function(res) {
			setTimeout(function() {
				if(capturedEvents.length != 2) {
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