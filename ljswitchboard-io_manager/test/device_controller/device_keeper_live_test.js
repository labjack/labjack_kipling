/**
	This test aims to show how the io_manager library should be used.  It
	shows the initialization, some basic usage steps, and destruction of the
	library.
**/
var assert = require('chai').assert;

var utils = require('../utils/utils');
var testDeviceObject = utils.testDeviceObject;
var testDeviceObjects = utils.testDeviceObjects;

var constants = require('../../lib/common/constants');

var io_manager;
var io_interface;

// Managers
var driver_controller;
var device_controller;

var device;
var deviceB;

var capturedEvents = [];

var getDeviceControllerEventListener = function(eventKey) {
	var deviceControllerEventListener = function(eventData) {
		// console.log('Captured an event', eventKey);
		capturedEvents.push({'eventName': eventKey, 'data': eventData});
	};
	return deviceControllerEventListener;
};

var mockDevices = [{
	'deviceType': 'LJM_dtT7',
	'connectionType': 'LJM_ctUSB',
	'identifier': 'LJM_idANY',
}, {
	'deviceType': 'LJM_dtT7',
	'connectionType': 'LJM_ctETHERNET',
	'identifier': 'LJM_idANY',
}];

describe('device keeper live', function() {
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
		var params = mockDevices[0];

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
	it('get mock device attributes', function (done) {
		device.getDeviceAttributes()
		.then(function(res) {
			// Test to make sure that there are a few key attributes.
			var requiredAttributes = [
				'deviceType',
				'connectionType',
				'serialNumber',
				'ipAddress',
				'port',
				'maxBytesPerMB',
				'deviceTypeName',
				'deviceTypeString',
				'deviceClass',
				'openParameters',
				'subclass',
				'isPro',
				'productType'
			];
			var listToCheck = {
				'ipAddress': '0.0.0.0',
			};
			var givenAttributes = Object.keys(res);
			requiredAttributes.forEach(function(requiredAttribute) {
				var msg = 'Required key does not exist: ' + requiredAttribute;
				assert.isOk((givenAttributes.indexOf(requiredAttribute) >= 0), msg);
			});
			var keys = Object.keys(listToCheck);
			keys.forEach(function(key) {
				assert.strictEqual(res[key], listToCheck[key], 'unexpected mock device attribute value');
			});
			done();

		}, function(err) {
			assert.isOk(false, 'read should not have returned an error: ' + JSON.stringify(err));
			done();
		});
	});
	it('open second device', function (done) {
		capturedEvents = [];
		// Configure the device so that its serial number is one of the mock
		// devices that gets found.
		var params = mockDevices[1];


		device_controller.openDevice(params)
		.then(function(newDevice) {
			deviceB = newDevice;
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
	it('get mock deviceB attributes', function (done) {
		deviceB.getDeviceAttributes()
		.then(function(res) {
			// Test to make sure that there are a few key attributes.
			var requiredAttributes = [
				'deviceType',
				'connectionType',
				'serialNumber',
				'ipAddress',
				'port',
				'maxBytesPerMB',
				'deviceTypeName',
				'deviceTypeString',
				'deviceClass',
				'openParameters',
				'subclass',
				'isPro',
				'productType'
			];
			var listToCheck = {
			};
			var givenAttributes = Object.keys(res);
			requiredAttributes.forEach(function(requiredAttribute) {
				var msg = 'Required key does not exist: ' + requiredAttribute;
				assert.isOk((givenAttributes.indexOf(requiredAttribute) >= 0), msg);
			});
			var keys = Object.keys(listToCheck);
			keys.forEach(function(key) {
				assert.strictEqual(res[key], listToCheck[key], 'unexpected mock device attribute value');
			});
			done();
		}, function(err) {
			assert.isOk(false, 'read should not have returned an error: ' + JSON.stringify(err));
			done();
		});
	});
	it('get number of devices', function (done) {
		device_controller.getNumDevices()
		.then(function(numDevices) {
			assert.strictEqual(numDevices, 2, 'Unexpected number of already open devices');
			done();
		});
	});
	it('get device listing', function (done) {
		device_controller.getDeviceListing()
		.then(function(foundDevices) {
			assert.strictEqual(foundDevices.length, 2, 'Unexpected number of already open devices');

			// Save device data to the mockDevices object for testing & later operations
			foundDevices.forEach(function(device, i) {
				mockDevices[i].mockDeviceConfig = {
					'serialNumber': device.serialNumber,
					'DEVICE_NAME_DEFAULT': device.DEVICE_NAME_DEFAULT,
					'ipAddress': device.ipAddress,
				};
			});
			done();
		});
	});
	it('get devices', function (done) {
		device_controller.getDevices()
		.then(function(devices) {
			try {
				assert.strictEqual(devices.length, 2, 'Unexpected number of already open devices');
				testDeviceObjects(devices, mockDevices);
				// console.log('Device Objects', devices);
				done();
			} catch(err) {
				console.log('err', err, err.stack);
			}
		});
	});
	it('get device sn: first device', function (done) {
		var options = {
			'serialNumber':mockDevices[0].mockDeviceConfig.serialNumber,
		};
		device_controller.getDevices(options)
		.then(function(devices) {
			try {
				assert.strictEqual(devices.length, 1, 'Unexpected number of already open devices');
				testDeviceObjects(devices, [mockDevices[0]]);
				done();
			} catch(err) {
				console.log('err', err, err.stack);
			}
		});
	});
	it('get device sn: second device', function (done) {
		var options = {
			'serialNumber':mockDevices[1].mockDeviceConfig.serialNumber,
		};
		device_controller.getDevices(options)
		.then(function(devices) {
			try {
				assert.strictEqual(devices.length, 1, 'Unexpected number of already open devices');
				testDeviceObjects(devices, [mockDevices[1]]);
				done();
			} catch(err) {
				console.log('err', err, err.stack);
			}
		});
	});
	it('get device data, sn', function (done) {
		var options = {
			'serialNumber':mockDevices[1].mockDeviceConfig.serialNumber,
		};
		device_controller.getDevice(options)
		.then(function(device) {
			try {
				testDeviceObject(device, mockDevices[1]);
				// console.log('device', device);
				done();
			} catch(err) {
				console.log('err', err, err.stack);
			}
		});
	});
	it('close mock device', function (done) {
		capturedEvents = [];
		var options = {
			'serialNumber':mockDevices[1].mockDeviceConfig.serialNumber,
		};
		device_controller.getDevice(options)
		.then(device_controller.closeDeviceRef)
		// .then(function(device) {
		// 	console.log('Closing Device, sn:', device.savedAttributes.serialNumber);
		// 	return device.close();
		// })
		// device.close()
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
	it('get device data, sn -after close', function (done) {
		var options = {
			'serialNumber':mockDevices[1].mockDeviceConfig.serialNumber,
		};
		device_controller.getDevice(options)
		.then(function(device) {
			assert.strictEqual(device, undefined, 'Device should not be found');
			done();
		});
	});
	it('get device data first device -after close', function (done) {
		var options = {
			'serialNumber':mockDevices[0].mockDeviceConfig.serialNumber,
		};
		device_controller.getDevice(options)
		.then(function(device) {
			try {
				testDeviceObject(device, mockDevices[0]);
				done();
			} catch(err) {
				console.log('err', err, err.stack);
			}
		});
	});
	it('get number of devices -after close', function (done) {
		device_controller.getNumDevices()
		.then(function(numDevices) {
			assert.strictEqual(numDevices, 1, 'Unexpected number of already open devices');
			done();
		});
	});
	it('get device listing -after close', function (done) {
		device_controller.getDeviceListing()
		.then(function(foundDevices) {
			assert.strictEqual(foundDevices.length, 1, 'Unexpected number of already open devices');
			done();
		});
	});
	it('get devices -after close', function (done) {
		device_controller.getDevices()
		.then(function(devices) {
			try {
				assert.strictEqual(devices.length, 1, 'Unexpected number of already open devices');
				testDeviceObjects(devices, [mockDevices[0]]);
				done();
			} catch(err) {
				console.log('err', err, err.stack);
			}
		});
	});
	it('close mock device (2)', function (done) {
		capturedEvents = [];
		var options = {
			'serialNumber':mockDevices[0].mockDeviceConfig.serialNumber,
		};
		device_controller.getDevice(options)
		.then(device_controller.closeDeviceRef)
		// .then(function(device) {
		// 	console.log('Closing Device, sn:', device.savedAttributes.serialNumber);
		// 	return device.close();
		// })
		// device.close()
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
	it('get device data, sn -after close (2)', function (done) {
		var options = {
			'serialNumber':mockDevices[0].mockDeviceConfig.serialNumber,
		};
		device_controller.getDevice(options)
		.then(function(device) {
			assert.strictEqual(device, undefined, 'Device should not be found');
			done();
		});
	});
	it('get number of devices -after close (2)', function (done) {
		device_controller.getNumDevices()
		.then(function(numDevices) {
			assert.strictEqual(numDevices, 0, 'Unexpected number of already open devices');
			done();
		});
	});
	it('get device listing -after close (2)', function (done) {
		device_controller.getDeviceListing()
		.then(function(foundDevices) {
			assert.strictEqual(foundDevices.length, 0, 'Unexpected number of already open devices');
			done();
		});
	});
	it('get devices -after close (2)', function (done) {
		device_controller.getDevices()
		.then(function(devices) {
			try {
				assert.strictEqual(devices.length, 0, 'Unexpected number of already open devices');
				done();
			} catch(err) {
				console.log('err', err, err.stack);
			}
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
