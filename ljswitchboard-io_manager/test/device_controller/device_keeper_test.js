
/**
	This test aims to show how the io_manager library should be used.  It
	shows the initialization, some basic usage steps, and destruction of the
	library.
**/

var utils = require('../utils/utils');
var testDeviceObject = utils.testDeviceObject;
var testDeviceObjects = utils.testDeviceObjects;

var qRunner = utils.qRunner;
var qExec = utils.qExec;
var pResults = utils.pResults;
var q = require('q');
var constants = require('../../lib/common/constants');

var test_util = require('../utils/scanner_test_util');
var printAvailableDeviceData = test_util.printAvailableDeviceData;
var testScanResults = test_util.testScanResults;

var io_manager;
var io_interface;

// Managers
var driver_controller;
var device_controller;
var file_io_controller;
var logger_controller;

var device;
var deviceB;
var deviceC;

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
	'mockDevice': true,
	'mockDeviceConfig': {
		'serialNumber': 1010,
		'HARDWARE_INSTALLED': 15,
		'FIRMWARE_VERSION': 1.0159
		},
}, {
	'deviceType': 'LJM_dtT7',
	'connectionType': 'LJM_ctETHERNET',
	'identifier': 'LJM_idANY',
	'mockDevice': true,
	'mockDeviceConfig': {
		'serialNumber': 1,
		'HARDWARE_INSTALLED': 15,
		'ipAddress': '192.168.1.100',
		},
}, {
	'deviceType': 'LJM_dtDIGIT',
	'connectionType': 'LJM_ctUSB',
	'identifier': 'LJM_idANY',
	'mockDevice': true,
	'mockDeviceConfig': {
		'serialNumber': 5,
		'FIRMWARE_VERSION': 1.2
		},
}];
var printDeviceInfo = function(device) {
	console.log('Attributes:')
	var attributes = device.savedAttributes;
	var attrKeys = Object.keys(attributes);
	attrKeys.forEach(function(key) {
		if(typeof(attributes[key]) !== 'object') {
			console.log('  - ', key+':', attributes[key]);
		} else {
			console.log('  - ', key+':', '[...]');
		}
	});
};
exports.tests = {
	'initialization': function(test) {
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

			test.ok(true);
			test.done();
		}, function(err) {
			test.ok(false, 'error initializing io_interface' + JSON.stringify(err));
			test.done();
		});
	},
	'open mock device': function(test) {
		var params = mockDevices[0];

		device_controller.openDevice(params)
		.then(function(newDevice) {
			device = newDevice;
			setTimeout(function() {
				if(capturedEvents.length != 1) {
					test.ok(false, 'unexpected number of events triggered.');
				} else {
					test.ok(true);
				}
				test.done();
			},50);
		}, function(err) {
			console.log("Error opening device", err);
			test.ok(false, 'failed to create new device object');
			test.done();
		});
	},
	'get mock device attributes': function(test) {
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
				'deviceTypeString',
				'deviceClass',
				'openParameters',
				'subclass',
				'isPro',
				'productType'
			];
			var listToCheck = {
				'serialNumber': 1010,
				'ipAddress': '0.0.0.0',
			};
			var givenAttributes = Object.keys(res);
			requiredAttributes.forEach(function(requiredAttribute) {
				var msg = 'Required key does not exist: ' + requiredAttribute;
				test.ok((givenAttributes.indexOf(requiredAttribute) >= 0), msg);
			});
			var keys = Object.keys(listToCheck);
			keys.forEach(function(key) {
				test.strictEqual(res[key], listToCheck[key], 'unexpected mock device attribute value');
			});
			test.done();
		}, function(err) {
			test.ok(false, 'read should not have returned an error: ' + JSON.stringify(err));
			test.done();
		});
	},
	'open second device': function(test) {
		capturedEvents = [];
		// Configure the device so that its serial number is one of the mock
		// devices that gets found.
		var params = mockDevices[1];
		

		device_controller.openDevice(params)
		.then(function(newDevice) {
			deviceB = newDevice;
			setTimeout(function() {
				if(capturedEvents.length != 1) {
					test.ok(false, 'unexpected number of events triggered.');
				} else {
					test.ok(true);
				}
				test.done();
			},50);
		}, function(err) {
			console.log("Error opening device", err);
			test.ok(false, 'failed to create new device object');
			test.done();
		});
	},
	'get mock deviceB attributes': function(test) {
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
				'deviceTypeString',
				'deviceClass',
				'openParameters',
				'subclass',
				'isPro',
				'productType'
			];
			var listToCheck = {
				'serialNumber': 1,
				'ipAddress': '192.168.1.100',
			};
			var givenAttributes = Object.keys(res);
			requiredAttributes.forEach(function(requiredAttribute) {
				var msg = 'Required key does not exist: ' + requiredAttribute;
				test.ok((givenAttributes.indexOf(requiredAttribute) >= 0), msg);
			});
			var keys = Object.keys(listToCheck);
			keys.forEach(function(key) {
				test.strictEqual(res[key], listToCheck[key], 'unexpected mock device attribute value');
			});
			test.done();
		}, function(err) {
			test.ok(false, 'read should not have returned an error: ' + JSON.stringify(err));
			test.done();
		});
	},
	'open digit': function(test) {
		capturedEvents = [];
		// Configure the device so that its serial number is one of the mock
		// devices that gets found.
		var params = mockDevices[2];
		

		device_controller.openDevice(params)
		.then(function(newDevice) {
			deviceC = newDevice;
			setTimeout(function() {
				if(capturedEvents.length != 1) {
					test.ok(false, 'unexpected number of events triggered.');
				} else {
					test.ok(true);
				}
				test.done();
			},50);
		}, function(err) {
			console.log("Error opening device", err);
			test.ok(false, 'failed to create new device object');
			test.done();
		});
	},
	'get mock deviceC attributes': function(test) {
		deviceC.getDeviceAttributes()
		.then(function(res) {
			// Test to make sure that there are a few key attributes.
			var requiredAttributes = [
				'deviceType',
				'connectionType',
				'serialNumber',
				'ipAddress',
				'port',
				'maxBytesPerMB',
				'deviceTypeString',
				'deviceClass',
				'openParameters',
				'subclass',
				'productType'
			];
			var listToCheck = {
				'serialNumber': 5,
				'ipAddress': '0.0.0.0',
			};
			var givenAttributes = Object.keys(res);
			requiredAttributes.forEach(function(requiredAttribute) {
				var msg = 'Required key does not exist: ' + requiredAttribute;
				test.ok((givenAttributes.indexOf(requiredAttribute) >= 0), msg);
			});
			var keys = Object.keys(listToCheck);
			keys.forEach(function(key) {
				test.strictEqual(res[key], listToCheck[key], 'unexpected mock device attribute value');
			});
			test.done();
		}, function(err) {
			test.ok(false, 'read should not have returned an error: ' + JSON.stringify(err));
			test.done();
		});
	},
	'get number of devices': function(test) {
		device_controller.getNumDevices()
		.then(function(numDevices) {
			test.strictEqual(numDevices, 3, 'Unexpected number of already open devices');
			test.done();
		});
	},
	'get device listing': function(test) {
		device_controller.getDeviceListing()
		.then(function(foundDevices) {
			test.strictEqual(foundDevices.length, 3, 'Unexpected number of already open devices');
			// console.log('Listing', foundDevices);
			test.done();
		});
	},
	'get devices': function(test) {
		device_controller.getDevices()
		.then(function(devices) {
			try {
				test.strictEqual(devices.length, 3, 'Unexpected number of already open devices');
				devices.forEach(function(device, i) {
					var expDevice = mockDevices[i];
				});
				testDeviceObjects(test, devices, mockDevices);
				// console.log('Device Objects', devices);
				test.done();
			} catch(err) {
				console.log('err', err, err.stack);
			}
		});
	},
	'test T7 Filter': function(test) {
		device_controller.getDevices([{'type': 'T7'}])
		.then(function(devices) {
			try {
				test.strictEqual(devices.length, 2, 'Unexpected number of already open devices');
				devices.forEach(function(device, i) {
					// printDeviceInfo(device);
				});
				testDeviceObjects(test, devices, [mockDevices[0],mockDevices[1]]);
				// console.log('Device Objects', devices);
				test.done();
			} catch(err) {
				console.log('err', err, err.stack);
			}
		});
	},
	'test Digit Filter': function(test) {
		device_controller.getDevices([{'type': 'Digit'}])
		.then(function(devices) {
			try {
				test.strictEqual(devices.length, 1, 'Unexpected number of already open devices');
				devices.forEach(function(device, i) {
					// printDeviceInfo(device);
				});
				testDeviceObjects(test, devices, [mockDevices[2]]);
				// console.log('Device Objects', devices);
				test.done();
			} catch(err) {
				console.log('err', err, err.stack);
			}
		});
	},
	'test Digit & T7 Filter': function(test) {
		device_controller.getDevices([{'type': 'T7'},{'type': 'Digit'}])
		.then(function(devices) {
			try {
				test.strictEqual(devices.length, 3, 'Unexpected number of already open devices');
				devices.forEach(function(device, i) {
					// printDeviceInfo(device);
				});
				testDeviceObjects(test, devices, mockDevices);
				// console.log('Device Objects', devices);
				test.done();
			} catch(err) {
				console.log('err', err, err.stack);
			}
		});
	},
	'test Digit & T7 (firmware) Filter': function(test) {
		device_controller.getDevices([{'type': 'T7','minFW': 1.015},{'type': 'Digit','minFW': 1.07}])
		.then(function(devices) {
			try {
				test.strictEqual(devices.length, 2, 'Unexpected number of already open devices');
				devices.forEach(function(device, i) {
					// printDeviceInfo(device);
				});
				var expectedDevices = [mockDevices[0],mockDevices[2]];
				test.strictEqual(devices.length, expectedDevices.length);
				testDeviceObjects(test, devices, expectedDevices);
				// console.log('Device Objects', devices);
				test.done();
			} catch(err) {
				console.log('err', err, err.stack);
			}
		});
	},
	'get device sn: first device': function(test) {
		var options = {
			'serialNumber':mockDevices[0].mockDeviceConfig.serialNumber,
		};
		device_controller.getDevices(options)
		.then(function(devices) {
			try {
				test.strictEqual(devices.length, 1, 'Unexpected number of already open devices');
				testDeviceObjects(test, devices, [mockDevices[0]]);
				test.done();
			} catch(err) {
				console.log('err', err, err.stack);
			}
		});
	},
	'get device sn: second device': function(test) {
		var options = {
			'serialNumber':mockDevices[1].mockDeviceConfig.serialNumber,
		};
		device_controller.getDevices(options)
		.then(function(devices) {
			try {
				test.strictEqual(devices.length, 1, 'Unexpected number of already open devices');
				testDeviceObjects(test, devices, [mockDevices[1]]);
				test.done();
			} catch(err) {
				console.log('err', err, err.stack);
			}
		});
	},
	'get device sn: third device': function(test) {
		var options = {
			'serialNumber':mockDevices[2].mockDeviceConfig.serialNumber,
		};
		device_controller.getDevices(options)
		.then(function(devices) {
			try {
				test.strictEqual(devices.length, 1, 'Unexpected number of already open devices');
				testDeviceObjects(test, devices, [mockDevices[2]]);
				test.done();
			} catch(err) {
				console.log('err', err, err.stack);
			}
		});
	},
	'get device data, sn': function(test) {
		var options = {
			'serialNumber':mockDevices[1].mockDeviceConfig.serialNumber,
		};
		device_controller.getDevice(options)
		.then(function(device) {
			try {
				testDeviceObject(test, device, mockDevices[1]);
				// console.log('device', device);
				test.done();
			} catch(err) {
				console.log('err', err, err.stack);
			}
		});
	},
	'close mock device': function(test) {
		console.log('  - Closing Mock-T7 (Ethernet)');
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
					test.ok(false, 'unexpected number of events triggered.');
				} else {
					test.ok(true);
				}
				test.done();
			},50);
		}, function(err) {
			console.log('Failed to close', err);
			test.ok(false);
			test.done();
		});
	},
	'get device data, sn -after close': function(test) {
		var options = {
			'serialNumber':mockDevices[1].mockDeviceConfig.serialNumber,
		};
		device_controller.getDevice(options)
		.then(function(device) {
			test.strictEqual(device, undefined, 'Device should not be found');
			test.done();
		});
	},
	'get device data first device -after close': function(test) {
		var options = {
			'serialNumber':mockDevices[0].mockDeviceConfig.serialNumber,
		};
		device_controller.getDevice(options)
		.then(function(device) {
			try {
				testDeviceObject(test, device, mockDevices[0]);
				test.done();
			} catch(err) {
				console.log('err', err, err.stack);
			}
		});
	},
	'get number of devices -after close': function(test) {
		device_controller.getNumDevices()
		.then(function(numDevices) {
			test.strictEqual(numDevices, 2, 'Unexpected number of already open devices');
			test.done();
		});
	},
	'get device listing -after close': function(test) {
		device_controller.getDeviceListing()
		.then(function(foundDevices) {
			test.strictEqual(foundDevices.length, 2, 'Unexpected number of already open devices');
			test.done();
		});
	},
	'get devices -after close': function(test) {
		device_controller.getDevices()
		.then(function(devices) {
			try {
				test.strictEqual(devices.length, 2, 'Unexpected number of already open devices');
				testDeviceObjects(test, devices, [mockDevices[0], mockDevices[2]]);
				test.done();
			} catch(err) {
				console.log('err', err, err.stack);
			}
		});
	},
	'close mock device (2)': function(test) {
		console.log('  - Closing Mock-T7 (USB)');
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
					test.ok(false, 'unexpected number of events triggered.');
				} else {
					test.ok(true);
				}
				test.done();
			},50);
		}, function(err) {
			console.log('Failed to close', err);
			test.ok(false);
			test.done();
		});
	},
	'get device data, sn -after close (2)': function(test) {
		var options = {
			'serialNumber':mockDevices[0].mockDeviceConfig.serialNumber,
		};
		device_controller.getDevice(options)
		.then(function(device) {
			test.strictEqual(device, undefined, 'Device should not be found');
			test.done();
		});
	},
	'get number of devices -after close (2)': function(test) {
		device_controller.getNumDevices()
		.then(function(numDevices) {
			test.strictEqual(numDevices, 1, 'Unexpected number of already open devices');
			test.done();
		});
	},
	'get device listing -after close (2)': function(test) {
		device_controller.getDeviceListing()
		.then(function(foundDevices) {
			test.strictEqual(foundDevices.length, 1, 'Unexpected number of already open devices');
			test.done();
		});
	},
	'get devices -after close (2)': function(test) {
		device_controller.getDevices()
		.then(function(devices) {
			try {
				test.strictEqual(devices.length, 1, 'Unexpected number of already open devices');
				testDeviceObjects(test, devices, [mockDevices[2]]);
				test.done();
			} catch(err) {
				console.log('err', err, err.stack);
			}
		});
	},
	'close mock device (3)': function(test) {
		console.log('  - Closing Mock-Digit');
		capturedEvents = [];
		var options = {
			'serialNumber':mockDevices[2].mockDeviceConfig.serialNumber,
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
					test.ok(false, 'unexpected number of events triggered.');
				} else {
					test.ok(true);
				}
				test.done();
			},50);
		}, function(err) {
			console.log('Failed to close', err);
			test.ok(false);
			test.done();
		});
	},
	'get device data, sn -after close (3)': function(test) {
		var options = {
			'serialNumber':mockDevices[2].mockDeviceConfig.serialNumber,
		};
		device_controller.getDevice(options)
		.then(function(device) {
			test.strictEqual(device, undefined, 'Device should not be found');
			test.done();
		});
	},
	'get number of devices -after close (3)': function(test) {
		device_controller.getNumDevices()
		.then(function(numDevices) {
			test.strictEqual(numDevices, 0, 'Unexpected number of already open devices');
			test.done();
		});
	},
	'get device listing -after close (3)': function(test) {
		device_controller.getDeviceListing()
		.then(function(foundDevices) {
			test.strictEqual(foundDevices.length, 0, 'Unexpected number of already open devices');
			test.done();
		});
	},
	'get devices -after close (3)': function(test) {
		device_controller.getDevices()
		.then(function(devices) {
			try {
				test.strictEqual(devices.length, 0, 'Unexpected number of already open devices');
				testDeviceObjects(test, devices, []);
				test.done();
			} catch(err) {
				console.log('err', err, err.stack);
			}
		});
	},
	'destruction': function(test) {
		console.log('Trying to destruct...');
		setImmediate(function() {
			io_interface.destroy()
			.then(function(res) {
				// io_interface process has been shut down
				test.ok(true);
				test.done();
			}, function(err) {
				test.ok(false, 'io_interface failed to shut down' + JSON.stringify(err));
				test.done();
			});
		});
	}
};