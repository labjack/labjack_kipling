/**
	This test aims to show how the io_manager library should be used.  It
	shows the initialization, some basic usage steps, and destruction of the
	library.
**/

var io_manager;
var io_interface;

// Managers
var driver_controller;
var device_controller;

var device;

function getDashboardDataUpdateHandler(done) {
	return function dashboardDataUpdateHandler(data) {
		console.log('New Data', data);
		done();
	};
}

describe('dashboard', function() {
	return;
	this.skip();
	it('initialization', function (done) {
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
	it('open device', function (done) {
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
	it('start dashboard', function (done) {
		device.dashboard_start('dashboard')
		.then(function(res) {
			console.log('Started dashboard', res);
			device.on('DASHBOARD_DATA_UPDATE', getDashboardDataUpdateHandler(done));
		}, function(err) {
			assert.isOk(false, 'dashboard_start returned an error: ' + JSON.stringify(err));
			done();
		});
	});
	it('stop dashboard', function (done) {
		device.dashboard_stop('dashboard')
		.then(function(res) {
			console.log('Stopped dashboard');
			done();
		}, function(err) {
			assert.isOk(false, 'dashboard_stop returned an error: ' + JSON.stringify(err));
			done();
		});
	});
	it('close all devices', function (done) {
		device_controller.closeAllDevices()
		.then(function(res) {
			// console.log('Num Devices Closed', res);
			assert.strictEqual(res.numClosed, 1, 'wrong number of devices closed');
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
