
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

var io_manager;
var io_interface;

// Managers
var driver_controller;
var device_controller;
var file_io_controller;
var logger_controller;

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
	// 'use_device_controller (mock device)': function(test) {
	// 	var params = {
	// 		'deviceType': 'LJM_dtT7',
	// 		'connectionType': 'LJM_ctUSB',
	// 		'identifier': 'LJM_idANY',
	// 		'mockDevice': true
	// 	};

	// 	device_controller.openDevice(params)
	// 	.then(function(newDevice) {
	// 		console.log('Created New Device Object', newDevice);
	// 		test.done();
	// 	}, function(err) {
	// 		console.log("Error opening device", err);
	// 		test.ok(false, 'failed to create new device object');
	// 		test.done();
	// 	});
	// },

	'destruction': function(test) {
		io_interface.destroy()
		.then(function(res) {
			// io_interface process has been shut down
			test.ok(true);
			test.done();
		}, function(err) {
			test.ok(false, 'io_interface failed to shut down' + JSON.stringify(err));
			test.done();
		});
	}
};