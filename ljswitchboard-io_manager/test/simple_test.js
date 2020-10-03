/**
	This test aims to show how the io_manager library should be used.  It
	shows the initialization, some basic usage steps, and destruction of the
	library.
**/

var assert = require('chai').assert;

var constants = require('../lib/common/constants');

var io_manager;
var io_interface;

// Managers
var driver_controller;
var device_controller;

var device;

var capturedEvents = [];

describe('simple test', function() {
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

			assert.isOk(true);
			done();
		}, function(err) {
			assert.isOk(false, 'error initializing io_interface' + JSON.stringify(err));
			done();
		});
	});
	/**
		At its core, the driver_controller doesn't do much, it simply calls
		ljm functions from within a sub-process and returns the result.
		Therefore, we should test a very simple function whose return value
		never changes and not a complex function like listAll whose function
		should be tested else where.
	**/
	it('use_driver_controller', function (done) {
		driver_controller.errToStr(1236)
		.then(function(res) {
			assert.strictEqual(
				res,
				'Num: 1236, LJME_CANNOT_OPEN_DEVICE',
				'invalid error string detected'
			);
			done();
		});
	});
	it('open mock device', function (done) {
		var params = {
			'deviceType': 'LJM_dtT7',
			'connectionType': 'LJM_ctEthernet',
			'identifier': 'LJM_idANY',
			'mockDevice': true
		};

		device_controller.openDevice(params)
		.then(function(newDevice) {
			device = newDevice;
			setTimeout(function() {
				if(capturedEvents.length != 1) {
					assert.isOk(false, 'unexpected number of events triggered.');
				} else {
					assert.isOk(true);
				}
				done();
			},50);
		}, function(err) {
			console.log("Error opening device", err);
			assert.isOk(false, 'failed to create new device object');
			done();
		});
	});
	it('close mock device', function (done) {
		device.close()
		.then(function(res) {
			setTimeout(function() {
				if(capturedEvents.length != 2) {
					assert.isOk(false, 'unexpected number of events triggered.');
				} else {
					assert.isOk(true);
				}
				done();
			},50);
		}, function(err) {
			console.log('Failed to close', err);
			assert.isOk(false);
			done();
		});
	});
	it('destruction', function (done) {
		setImmediate(function() {
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
});
