/**
	This test aims to show how the io_manager library should be used.  It
	shows the initialization, some basic usage steps, and destruction of the
	library.
**/

var assert = require('chai').assert;

var io_manager;
var io_interface;

// Managers
var driver_controller;
var device_controller;

var device;

describe('update usb device', function() {
	return;
	this.skip();
	it('initialization', function (done) {
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

			assert.isOk(true);
			done();
		}, function(err) {
			assert.isOk(false, 'error initializing io_interface' + JSON.stringify(err));
			done();
		});
	});
	it('open mock device', function (done) {
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
				assert.strictEqual(res, 1, 'wrong number of devices are open');
				done();
			});
		}, function(err) {
			console.log("Error opening device", err);
			assert.isOk(false, 'failed to create new device object');
			done();
		});
	});
	it('update firmware', function (done) {
		// var fwLocation = 'https://labjack.com/sites/default/files/2014/12/T7firmware_010135_2014-11-24.bin';
		var fwLocation = 'https://labjack.com/sites/default/files/2015/03/T7firmware_010159_2015-03-23.bin';
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
			assert.isOk(true);
			if(numPercentUpdates > 0) {
				assert.isOk(true);
			} else {
				assert.isOk(false, 'did not receive any percent updates');
			}
			if(numPercentUpdates > 0) {
				assert.isOk(true);
			} else {
				assert.isOk(false, 'did not receive any step updates');
			}
			done();
		}, function(err) {
			console.log('Update Failed', err);
			assert.isOk(false, 'Update failed to complete');
			done();
		});
	});
	it('close mock device', function (done) {
		device.close()
		.then(function(res) {
			assert.strictEqual(res.comKey, 0, 'expected to receive a different comKey');
			done();
		}, function(err) {
			console.log('Failed to close mock device', err);
			assert.isOk(false, 'Failed to close mock device');
			done();
		});
	});
	it('destruction', function (done) {
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
