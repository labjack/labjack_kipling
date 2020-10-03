/**
	This test aims to show how the io_manager library should be used.  It
	shows the initialization, some basic usage steps, and destruction of the
	library.
**/

var assert = require('chai').assert;

var constants = require('../../lib/common/constants');

var io_manager;
var io_interface;

// Managers
var driver_controller;
var device_controller;

var device;

var capturedEvents = [];

var getDeviceControllerEventListener = function(eventKey) {
	var deviceControllerEventListener = function(eventData) {
		// console.log('Captured an event', eventKey);
		if(eventKey === 'VERIFYING_DEVICE_CONNECTION') {
			console.log('Captured an event', eventKey, eventData);
		}
		if(eventKey === 'CLOSING_FOUND_DEVICE') {
			console.log('Captured an event', eventKey);
		}
		capturedEvents.push({'eventName': eventKey, 'data': eventData});
	};
	return deviceControllerEventListener;
};

describe('device scanner', function() {
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

			var eventKeys = Object.keys(constants.deviceControllerEvents);
			eventKeys.forEach(function(eventKey) {
				var eventName = constants.deviceControllerEvents[eventKey];
				device_controller.on(
					eventName,
					getDeviceControllerEventListener(eventName)
				);
			});

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
	it('get device listing', function (done) {
		device_controller.getDeviceListing()
		.then(function(foundDevices) {
			assert.strictEqual(foundDevices.length, 1);
			done();
		});
	});
	it('cached listAllDevices - empty', function (done) {
		device_controller.getCachedListAllDevices()
		.then(function(res) {
			// This result should be an empty array because the listAllDevices
			// function hasn't been called yet.
			console.log('Result', res);
			assert.deepEqual(res, [], 'array should be empty');

			done();
		});
	});
	it('list all devices', function (done) {
		// Mocking out the listAllDevices function call sounds like a night mare
		// Therefore, the solution to verifying its functionality will be to
		// check for a properly formatted & discovered mock-device.
		device_controller.listAllDevices()
		.then(function(res) {
			console.log('Number of Device Types', res.length);
			res.forEach(function(deviceType) {
				var devices = deviceType.devices;
				console.log('Number of', deviceType.deviceTypeName, 'devices found', devices.length);
				devices.forEach(function(device) {
					console.log(
						'Connection Types',
						device.connectionTypes.length,
						device.deviceTypeString,
						device.productType
					);
					device.connectionTypes.forEach(function(connectionType) {
						console.log(
							'  - ',
							connectionType.name,
							connectionType.insertionMethod,
							connectionType.verified,
							connectionType.isActive);
					});
					// console.log('Available Data', Object.keys(device));
					console.log('isMockDevice', device.isMockDevice);
					console.log('isActive', device.isActive);
				});
			});
			done();
		});
	});
	it('cached listAllDevices - populated', function (done) {
		device_controller.getCachedListAllDevices()
		.then(function(res) {
			// This result should not be an empty array because the
			// listAllDevices function has been called.
			var len = res.length;
			if(len > 0) {
				assert.isOk(true);
			} else {
				assert.isOk(false, 'array should not be empty');
			}
			done();
		});
	});
	it('close mock device', function (done) {
		capturedEvents = [];
		device.close()
		.then(function(res) {
			setTimeout(function() {
				if(capturedEvents.length != 1) {
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
