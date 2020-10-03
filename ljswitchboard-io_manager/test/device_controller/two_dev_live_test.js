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

var deviceA;
var deviceB;

describe('two dev live', function() {
	it('initialization', function (done) {
		console.log('');
		console.log('**** Two Device Live Test ****');
		console.log('**** Please connect 2x T7 via USB ****');

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
		if (process.env.SKIP_HARDWARE_TEST) {
			done();
			return;
		}

		var params = {
			'deviceType': 'LJM_dtANY',
			'connectionType': 'LJM_ctANY',
			'identifier': 'LJM_idANY',
			'mockDevice': false
		};

		device_controller.openDevice(params)
		.then(function(newDevice) {
			console.log(
				'  - Opened device A',
				newDevice.savedAttributes.deviceTypeName,
				newDevice.savedAttributes.connectionTypeName,
				newDevice.savedAttributes.serialNumber
			);
			// save device reference
			deviceA = newDevice;
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
	it('open deviceB', function (done) {
		if (process.env.SKIP_HARDWARE_TEST) {
			done();
			return;
		}

		var params = {
			'deviceType': 'LJM_dtANY',
			'connectionType': 'LJM_ctANY',
			'identifier': 'LJM_idANY',
			'mockDevice': false
		};

		device_controller.openDevice(params)
		.then(function(newDevice) {
			assert.isOk(false, 'Should have failed to create a second device');
			// save device reference
			deviceB = newDevice;
			device_controller.getNumDevices()
			.then(function(res) {
				assert.strictEqual(res, 1, 'wrong number of devices are open');
				done();
			});
		}, function(err) {
			if(Object.keys(err).length > 0) {
				console.log(
					"  - Prevented opening of duplicate device",
					err.deviceInfo.deviceTypeName,
					err.deviceInfo.connectionTypeName,
					err.deviceInfo.serialNumber
				);
				assert.isOk(true, 'failed to create a duplicate device.');
			} else {
				assert.isOk(false, 'should have failed to open a duplicate device.');
			}
			done();
		});
	});
	it('check num open devices', function (done) {
		if (process.env.SKIP_HARDWARE_TEST) {
			done();
			return;
		}

		device_controller.getNumDevices()
		.then(function(res) {
			assert.strictEqual(res, 1, 'wrong number of devices are open');
			done();
		});
	});
	it('close all devices', function (done) {
		if (process.env.SKIP_HARDWARE_TEST) {
			done();
			return;
		}

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
	it('open devices parallel', function (done) {
		if (process.env.SKIP_HARDWARE_TEST) {
			done();
			return;
		}

		var td = {
			'dt': 'LJM_dtANY',
			'ct': 'LJM_ctANY',
			'id': 'LJM_idANY'
		};

		var openSuccesses = [];
		var openErrors = [];
		function finalizeTest() {
			if(openSuccesses.length + openErrors.length == 2) {
				// console.log('Finished opening...', openSuccesses, openErrors);
				assert.equal(openSuccesses.length, 1, 'We received the wrong number of successful opens');
				assert.equal(openErrors.length, 1, 'We received the wrong number of error-ful opens');
				done();
			}
		}
		function onSuccess(res) {
			console.log(
				'  - Opened device',
				res.savedAttributes.deviceTypeName,
				res.savedAttributes.connectionTypeName,
				res.savedAttributes.serialNumber
			);
			openSuccesses.push(res);
			finalizeTest();
		}
		function onError(err) {
			if(Object.keys(err).length > 0) {
				console.log(
					"  - Prevented opening of duplicate device",
					err.deviceInfo.deviceTypeName,
					err.deviceInfo.connectionTypeName,
					err.deviceInfo.serialNumber
				);
				assert.isOk(true, 'failed to create a duplicate device.');
			} else {
				assert.isOk(false, 'should have failed to open a duplicate device.');
			}
			openErrors.push(err);
			finalizeTest();
		}
		device_controller.openDevice(td)
		.then(onSuccess, onError);

		device_controller.openDevice(td)
		.then(onSuccess, onError);
	});
	it('check num open devices 2', function (done) {
		if (process.env.SKIP_HARDWARE_TEST) {
			done();
			return;
		}

		device_controller.getNumDevices()
		.then(function(res) {
			assert.strictEqual(res, 1, 'wrong number of devices are open');
			done();
		});
	});
	it('close all devices 2', function (done) {
		if (process.env.SKIP_HARDWARE_TEST) {
			done();
			return;
		}

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
