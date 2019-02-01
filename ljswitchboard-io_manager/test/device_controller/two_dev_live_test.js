
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

var deviceA;
var deviceB;

exports.tests = {
	'initialization': function(test) {
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

			test.ok(true);
			test.done();
		}, function(err) {
			test.ok(false, 'error initializing io_interface' + JSON.stringify(err));
			test.done();
		});
	},
	'open device': function(test) {
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
				test.strictEqual(res, 1, 'wrong number of devices are open');
				test.done();
			});
		}, function(err) {
			console.log("Error opening device", err);
			test.ok(false, 'failed to create new device object');
			test.done();
		});
	},
	'open deviceB': function(test) {
		var params = {
			'deviceType': 'LJM_dtANY',
			'connectionType': 'LJM_ctANY',
			'identifier': 'LJM_idANY',
			'mockDevice': false
		};

		device_controller.openDevice(params)
		.then(function(newDevice) {
			test.ok(false, 'Should have failed to create a second device');
			// save device reference
			deviceB = newDevice;
			device_controller.getNumDevices()
			.then(function(res) {
				test.strictEqual(res, 1, 'wrong number of devices are open');
				test.done();
			});
		}, function(err) {
			if(Object.keys(err).length > 0) {
				console.log(
					"  - Prevented opening of duplicate device",
					err.deviceInfo.deviceTypeName,
					err.deviceInfo.connectionTypeName,
					err.deviceInfo.serialNumber
				);
				test.ok(true, 'failed to create a duplicate device.');
			} else {
				test.ok(false, 'should have failed to open a duplicate device.');
			}
			test.done();
		});
	},
	'check num open devices': function(test) {
		device_controller.getNumDevices()
		.then(function(res) {
			test.strictEqual(res, 1, 'wrong number of devices are open');
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
	'open devices parallel': function(test) {
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
				test.equal(openSuccesses.length, 1, 'We received the wrong number of successful opens');
				test.equal(openErrors.length, 1, 'We received the wrong number of error-ful opens');
				test.done();
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
				test.ok(true, 'failed to create a duplicate device.');
			} else {
				test.ok(false, 'should have failed to open a duplicate device.');
			}
			openErrors.push(err);
			finalizeTest();
		}
		device_controller.openDevice(td)
		.then(onSuccess, onError);
		
		device_controller.openDevice(td)
		.then(onSuccess, onError);
	},
	'check num open devices 2': function(test) {
		device_controller.getNumDevices()
		.then(function(res) {
			test.strictEqual(res, 1, 'wrong number of devices are open');
			test.done();
		});
	},
	'close all devices 2': function(test) {
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