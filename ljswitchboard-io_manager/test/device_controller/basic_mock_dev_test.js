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

describe('basic live', function() {
	it('initialization', function (done) {
		console.log('');
		console.log('**** open_close_mock_dev_test ****');
		console.log('**** No Device Required ****');

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
			'mockDevice': true
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
	it('read AIN0', function (done) {
		device.read('AIN0')
		.then(function(res) {
			var isOk = true;
			if((res > 11) || (res < -11)) {
				isOk = false;
			}
			assert.isOk(isOk, 'AIN0 read result is out of range');
			done();
		}, function(err) {
			assert.isOk(false, 'AIN0 read result returned an error');
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
	it('verify device closure', function (done) {
		device.read('AIN0')
		.then(function(res) {
			console.log('read returned', res);
			assert.isOk(false, 'should have caused an error');
			done();
		}, function(err) {
			done();
		});
	});
	it('close all devices', function (done) {
		device_controller.closeAllDevices()
		.then(function(res) {
			// console.log('Num Devices Closed', res);
			assert.strictEqual(res.numClosed, 0, 'wrong number of devices closed');
			done();
		}, function(err) {
			console.log('Error closing all devices', err);
			assert.isOk(false, 'failed to close all devices');
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
