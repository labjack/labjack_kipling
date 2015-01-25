
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

var device;

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
	'open mock device': function(test) {
		var params = {
			'deviceType': 'LJM_dtT7',
			'connectionType': 'LJM_ctUSB',
			'identifier': 'LJM_idANY',
			'mockDevice': false
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
	'update firmware': function(test) {
		var fwLocation = 'http://labjack.com/sites/default/files/2014/12/T7firmware_010135_2014-11-24.bin';
		var numPercentUpdates = 0;
		var percentListener = function(percent) {
			console.log('    - Percent:', percent);
			numPercentUpdates += 1;
		};
		var numStepUpdates = 0;
		var stepListener = function(step) {
			console.log('  - Current Step:', step);
			numStepUpdates += 1;
		};
		device.updateFirmware(
			fwLocation,
			percentListener,
			stepListener
		)
		.then(function(res) {
			test.ok(true);
			if(numPercentUpdates > 0) {
				test.ok(true);
			} else {
				test.ok(false, 'did not receive any percent updates');
			}
			if(numPercentUpdates > 0) {
				test.ok(true);
			} else {
				test.ok(false, 'did not receive any step updates');
			}
			test.done();
		}, function(err) {
			console.log('Update Failed', err);
			test.ok(false, 'Update failed to complete');
			test.done();
		});
	},
	'close mock device': function(test) {
		device.close()
		.then(function(res) {
			test.strictEqual(res.comKey, 0, 'expected to receive a different comKey');
			test.done();
		}, function(err) {
			console.log('Failed to close mock device', err);
			test.ok(false, 'Failed to close mock device');
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