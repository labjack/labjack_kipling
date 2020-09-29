var assert = require('chai').assert;

var constants = require('../../lib/common/constants');

var io_manager;
var io_interface;

// Managers
var driver_controller;
var device_controller;

var device;

var capturedEvents = [];
var capturedDeviceEvents = [];

var getDeviceControllerEventListener = function(eventKey) {
	var deviceControllerEventListener = function(eventData) {
		// console.log('Captured an event', eventKey);
		capturedEvents.push({'eventName': eventKey, 'data': eventData});
	};
	return deviceControllerEventListener;
};

var getDeviceEventListener = function(eventKey) {
	var deviceEventListener = function(eventData) {
		capturedDeviceEvents.push({'eventName': eventKey, 'data': eventData});
	};
	return deviceEventListener;
};

var deviceParameters = [{
	'deviceType': 'LJM_dtT7',
	'connectionType': 'LJM_ctUSB',
	'identifier': 'LJM_idANY',
}];
// deviceParameters[0].connectionType = 'LJM_ctWifi';
// deviceParameters[0].identifier = 470010610;

var nameOptions = [
	'DeviceNameA', 'DeviceNameB'
];
var cachedDeviceName = '';
var chosenTempName = '';


describe('device errors', function() {
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
	it('open device', function (done) {
		var reportedToCmd = false;
		var connectToDevice = function() {
			var params = deviceParameters[0];

			device_controller.openDevice(params)
			.then(function(newDevice) {
				device = newDevice;
				var deviceEventKeys = Object.keys(constants.deviceEvents);
				deviceEventKeys.forEach(function(eventKey) {
					var eventName = constants.deviceEvents[eventKey];
					newDevice.on(eventName, getDeviceEventListener(eventName));
				});

				setTimeout(function() {
					if(capturedEvents.length != 1) {
						assert.isOk(false, 'unexpected number of events triggered.');
					} else {
						assert.isOk(true);
					}
					done();
				},50);
			}, function(err) {
				if(!reportedToCmd) {
					console.log('  - Please Connect a Device', params);
					reportedToCmd = true;
				}
				setTimeout(connectToDevice, 50);
			});
		};
		connectToDevice();
	});
	it('cause device error', function (done) {
		// Check to make sure that the device object is an event emitter.
		assert.strictEqual(
			typeof(device.on),
			'function',
			'device is not an event emitter'
		);
		var errorDetected = false;
		device.once('DEVICE_ERROR', function(data) {
			errorDetected = true;
		});
		device.read('AINA')
		.then(function(res) {
			assert.isOk(false, 'Should have run into an error');
		}, function(err) {
			assert.isOk(errorDetected, 'device should have thrown a "DEVICE_ERROR"');
			done();
		});
	});
	it('change device name', function (done) {
		device.qRead('DEVICE_NAME_DEFAULT')
		.then(function(res) {
			cachedDeviceName = res;
			if(nameOptions[0] === cachedDeviceName) {
				chosenTempName = nameOptions[1];
			} else {
				chosenTempName = nameOptions[0];
			}
			device.qWrite('DEVICE_NAME_DEFAULT', chosenTempName)
			.then(function() {
				done();
			});
		});
	});
	it('disconnect device', function (done) {
		console.log('  - Please Disconnect Device');
		device.once('DEVICE_DISCONNECTED', function() {
			console.log('  - Device Disconnected');
			done();
		});
	});
	it('wait for reconnecting error', function (done) {
		device.once('DEVICE_ERROR', function(data) {
			done();
		});
	});
	it('wait for device to emit DEVICE_RECONNECTING', function (done) {
		device.once('DEVICE_RECONNECTING', function(data) {
			done();
		});
	});
	it('get latest errors', function (done) {
		device.getLatestDeviceErrors()
		.then(function(latestErrors) {
			// console.log('Latest Errors', latestErrors);
			assert.strictEqual(latestErrors.numErrors, 3);
			assert.strictEqual(latestErrors.errors.length, 3);
			done();
		});
	});
	it('test reconnectToDevice', function (done) {
		console.log('  - Please Reconnect Device');
		device.once('DEVICE_RECONNECTED', function() {
			console.log('  - Device Reconnected');
			done();
		});
	});
	it('test device attributes updated', function (done) {
		device.once('DEVICE_ATTRIBUTES_CHANGED', function() {
			// console.log('  - Device Attributes Updated');
			done();
		});
	});
	it('write original device name', function (done) {
		assert.strictEqual(
			device.savedAttributes.DEVICE_NAME_DEFAULT,
			chosenTempName,
			'device name not written properly'
		);
		device.qWrite('DEVICE_NAME_DEFAULT', cachedDeviceName)
		.then(function() {
			done();
		}, function(err) {
			console.log('Error writing name', err);

		});
	});
	it('disconnect device (2)', function (done) {
		console.log('  - Please Disconnect Device');
		device.once('DEVICE_DISCONNECTED', function() {
			console.log('  - Device Disconnected');
			done();
		});
	});
	it('test reconnectToDevice (2)', function (done) {
		console.log('  - Please Reconnect Device');
		device.once('DEVICE_RECONNECTED', function() {
			console.log('  - Device Reconnected');
			done();
		});
	});
	it('test device attributes updated (2)', function (done) {
		device.once('DEVICE_ATTRIBUTES_CHANGED', function() {
			// console.log('  - Device Attributes Updated');
			done();
		});
	});
	it('verify name restoration', function (done) {
		assert.strictEqual(
			device.savedAttributes.DEVICE_NAME_DEFAULT,
			cachedDeviceName,
			'device name not restored properly'
		);
		done();
	});
	it('close device', function (done) {
		device.close()
		.then(function() {
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
