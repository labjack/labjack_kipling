
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
	'get device listing': function(test) {
		device_controller.getDeviceListing()
		.then(function(res) {
			console.log('Current Listing', res);
			test.done();
		});
	},
	'list all devices': function(test) {
		console.log('Need to integrate the getDeviceListing function with the listAllDevices function');
		console.log('In the device_keeper.js file.  use the 1st func to apply data to the secondary one regarding "already open" and add any un-found devices...');
		device_controller.listAllDevices()
		.then(function(res) {
			console.log('Number of Devices', res.length);
			res.forEach(function(device) {
				console.log('Connection Types', device.connectionTypes.length);
				device.connectionTypes.forEach(function(connectionType) {
					console.log('  - ', connectionType.name, connectionType.insertionMethod, connectionType.verified);
				});
				// console.log('Available Data', Object.keys(device));
			});
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