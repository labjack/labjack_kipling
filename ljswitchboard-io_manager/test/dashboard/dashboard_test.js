
/**
	This test aims to show how the io_manager library should be used.  It
	shows the initialization, some basic usage steps, and destruction of the
	library.
**/

var utils = require('../utils/utils');
var qRunner = utils.qRunner;
var qExec = utils.qExec;
var pResults = utils.pResults;
var q = require('q');

var labjack_nodejs = require('labjack-nodejs');
var constants = labjack_nodejs.driver_const;

var io_manager;
var io_interface;

// Managers
var driver_controller;
var device_controller;
var file_io_controller;
var logger_controller;

var device;

function getDashboardDataUpdateHandler(test) {
	return function dashboardDataUpdateHandler(data) {
		console.log('New Data', data);
		test.done();
	};
}

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

			test.ok(true);
			test.done();
		}, function(err) {
			test.ok(false, 'error initializing io_interface' + JSON.stringify(err));
			test.done();
		});
	},
	'open device': function(test) {
		var params = {
			'deviceType': 'LJM_dtT7',
			'connectionType': 'LJM_ctUSB',
			'identifier': 'LJM_idANY',
			'mockDevice': true
		};

		device_controller.openDevice(params)
		.then(function(newDevice) {
			// save device reference
			device = newDevice;
			device_controller.getNumDevices()
			.then(function(res) {
				test.strictEqual(res, 1, 'wrong number of devices are open');
				test.done();
			});
		}, function(err) {
			console.log("Error opening device", err);
			test.ok(false, 'failed to create new device object');
			test.done();
		});
	},
	'start dashboard': function(test) {
		device.dashboard_start('dashboard')
		.then(function(res) {
			console.log('Started dashboard', res);
			device.on('DASHBOARD_DATA_UPDATE', getDashboardDataUpdateHandler(test));
		}, function(err) {
			test.ok(false, 'dashboard_start returned an error: ' + JSON.stringify(err));
			test.done();
		});
	},
	'stop dashboard': function(test) {
		device.dashboard_stop('dashboard')
		.then(function(res) {
			console.log('Stopped dashboard');
			test.done();
		}, function(err) {
			test.ok(false, 'dashboard_stop returned an error: ' + JSON.stringify(err));
			test.done();
		});
	},
	'close all devices': function(test) {
		device_controller.closeAllDevices()
		.then(function(res) {
			// console.log('Num Devices Closed', res);
			test.strictEqual(res.numClosed, 1, 'wrong number of devices closed');
			test.done();
		}, function(err) {
			console.log('Error closing all devices', err);
			test.ok(false, 'failed to close all devices');
			test.done();
		});
	},
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