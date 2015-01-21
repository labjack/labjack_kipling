
/**
	This test aims to show how the io_manager library should be used.  It
	shows the initialization, some basic usage steps, and destruction of the
	library.
**/

var utils = require('./utils/utils');
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

var device;

exports.tests = {
	'initialization': function(test) {
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

			test.ok(true);
			test.done();
		}, function(err) {
			test.ok(false, 'error initializing io_interface' + JSON.stringify(err));
			test.done();
		});
	},
	'open device': function(test) {
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
				test.strictEqual(res, 1, 'wrong number of devices are open');
				test.done();
			});
		}, function(err) {
			console.log("Error opening device", err);
			test.ok(false, 'failed to create new device object');
			test.done();
		});
	},
	'test getHandleInfo': function(test) {
		device.getHandleInfo()
		.then(function(res) {
			var requiredKeys = [
				'deviceType',
				'connectionType',
				'serialNumber',
				'ipAddress',
				'port',
				'maxBytesPerMB'
			];
			var resKeys = Object.keys(res);
			var msg = 'required keys do not match keys in response';
			test.strictEqual(resKeys.length, requiredKeys.length, msg);
			requiredKeys.forEach(function(key, i) {
				test.strictEqual(resKeys[i], key, msg + ': ' + key);
			});
			test.done();
		}, function(err) {
			console.log('getHandleInfo error', err);
			test.ok(false);
			test.done();
		});
	},
	'test getDeviceAttributes': function(test) {
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
			var givenAttributes = Object.keys(res);
			requiredAttributes.forEach(function(requiredAttribute) {
				var msg = 'Required key does not exist: ' + requiredAttribute;
				test.ok((givenAttributes.indexOf(requiredAttribute) >= 0), msg);
			});
			test.done();
		}, function(err) {
			test.ok(false, 'read should not have returned an error: ' + JSON.stringify(err));
			test.done();
		});
	},
	'test read': function(test) {
		device.read('AIN0')
		.then(function(res) {
			var isOk = true;
			if((res > 11) || (res < -11)) {
				isOk = false;
			}
			test.ok(isOk, 'AIN0 read result is out of range');
			test.done();
		}, function(err) {
			test.ok(false, 'AIN0 read result returned an error: ' + JSON.stringify(err));
			test.done();
		});
	},
	'test readMultiple': function(test) {
		var results = [];
		qExec(device, 'readMultiple', ['AIN0','DAC0'])(results)
		.then(function(res) {
			var expectedResults = [
				{
					'functionCall': 'readMultiple',
					'retData': [
						{'address': 'AIN0', 'isErr': false, 'type': 'range', 'min': -11, 'max': 11},
						{'address': 'DAC0', 'isErr': false, 'type': 'range', 'min': 0, 'max': 6}
					]
				}
			];
			utils.testResultsArray(test, expectedResults, res);
			test.done();
		}, function(err) {
			test.ok(false, 'read should not have returned an error: ' + JSON.stringify(err));
			test.done();
		});
	},
	'test readMany': function(test) {
		device.readMany(['AIN0','DAC0'])
		.then(function(res) {
			if((res[0] < -11) || (res[0] > 11)) {
				test.ok(false, 'AIN0 result out of range');
			} else {
				test.ok(true);
			}
			if((res[1] < 0) || (res[1] > 6)) {
				test.ok(false, 'DAC0 result out of range');
			} else {
				test.ok(true);
			}
			test.done();
		}, function(err) {
			test.ok(false, 'read should not have returned an error: ' + JSON.stringify(err));
			test.done();
		});
	},
	'test write': function(test) {
		device.write('DAC0', 1)
		.then(function(res) {
			device.read('DAC0')
			.then(function(res) {
				if((res < 0.8) || (res > 1.1)) {
					test.ok(false, 'DAC0 value not set');
				} else {
					test.ok(true);
				}
				test.done();
			}, function(err) {
				test.ok(false);
				test.done();
			});
		}, function(err) {
			test.ok(false, 'read should not have returned an error: ' + JSON.stringify(err));
			test.done();
		});
	},
	'test writeMany': function(test) {
		device.writeMany(['DAC0','DAC1'], [2.5,1])
		.then(function(res) {
			device.readMany(['DAC0','DAC1'])
			.then(function(res) {
				if((res[0] < 2) || (res[0] > 3)) {
					test.ok(false, 'DAC0 result out of range');
				} else {
					test.ok(true);
				}
				if((res[1] < 0.8) || (res[1] > 1.1)) {
					test.ok(false, 'DAC1 result out of range');
				} else {
					test.ok(true);
				}
				test.done();
			}, function(err) {
				test.ok(false);
				test.done();
			});
		}, function(err) {
			test.ok(false, 'read should not have returned an error: ' + JSON.stringify(err));
			test.done();
		});
	},
	'test rwMany': function(test) {
		device.rwMany(
			['AIN0','DAC1','DAC1'],
			[constants.LJM_READ, constants.LJM_WRITE, constants.LJM_READ],
			[1,1,1],
			[0,2,0]
		)
		.then(function(res) {
			test.strictEqual(res.length,2,'invalid number of results returned');
			if((res[0] < -11) || (res[0] > 11)) {
				test.ok(false, 'AIN0 result out of range');
			} else {
				test.ok(true);
			}
			if((res[1] < 1.8) || (res[1] > 2.2)) {
				test.ok(false, 'DAC1 result out of range');
			} else {
				test.ok(true);
			}
			test.done();
		}, function(err) {
			test.ok(false, 'read should not have returned an error: ' + JSON.stringify(err));
			test.done();
		});
	},
	'test readUINT64': function(test) {
		device.readUINT64('ethernet')
		.then(function(res) {
			var numColons = res.split(':');
			test.strictEqual(numColons.length, 6, 'invalid mac address');
			test.done();
		}, function(err) {
			test.ok(false, 'read should not have returned an error: ' + JSON.stringify(err));
			test.done();
		});
	},
	'test qRead': function(test) {
		device.qRead('AIN0')
		.then(function(res) {
			var isOk = true;
			if((res > 11) || (res < -11)) {
				isOk = false;
			}
			test.ok(isOk, 'AIN0 read result is out of range');
			test.done();
		}, function(err) {
			test.ok(false, 'AIN0 read result returned an error');
			test.done();
		});
	},
	'test qReadMany': function(test) {
		var addresses = ['AIN0','DAC0'];
		device.qReadMany(addresses)
		.then(function(res) {
			if((res[0] < -11) || (res[0] > 11)) {
				test.ok(false, 'AIN0 result out of range');
			} else {
				test.ok(true);
			}
			if((res[1] < 0) || (res[1] > 6)) {
				test.ok(false, 'DAC0 result out of range');
			} else {
				test.ok(true);
			}
			test.done();
		}, function(err) {
			test.ok(false, 'read should not have returned an error: ' + JSON.stringify(err));
			test.done();
		});
	},
	'test qWrite': function(test) {
		device.qWrite('DAC0', 2.5)
		.then(function(res) {
			device.read('DAC0')
			.then(function(res) {
				if((res < 2.4) || (res > 2.6)) {
					test.ok(false, 'DAC0 value not set');
				} else {
					test.ok(true);
				}
				test.done();
			}, function(err) {
				test.ok(false);
				test.done();
			});
		}, function(err) {
			test.ok(false, 'read should not have returned an error: ' + JSON.stringify(err));
			test.done();
		});
	},
	'test qWriteMany': function(test) {
		device.qWriteMany(['DAC0','DAC1'], [0.8,3])
		.then(function(res) {
			device.readMany(['DAC0','DAC1'])
			.then(function(res) {
				if((res[0] < 0.7) || (res[0] > 0.9)) {
					test.ok(false, 'DAC0 result out of range');
				} else {
					test.ok(true);
				}
				if((res[1] < 2.9) || (res[1] > 3.1)) {
					test.ok(false, 'DAC1 result out of range');
				} else {
					test.ok(true);
				}
				test.done();
			}, function(err) {
				test.ok(false);
				test.done();
			});
		}, function(err) {
			test.ok(false, 'read should not have returned an error: ' + JSON.stringify(err));
			test.done();
		});
	},
	'test qrwMany': function(test) {
		device.qrwMany(
			['AIN0','DAC1'],
			[constants.LJM_READ, constants.LJM_WRITE],
			[1,1],
			[0,2]
		)
		.then(function(res) {
			test.strictEqual(res.length, 1, 'wrong number of results');
			if((res[0] < -11) || (res[0] > 11)) {
					test.ok(false, 'AIN0 result out of range');
				} else {
					test.ok(true);
				}
			test.done();
		}, function(err) {
			test.ok(false, 'read should not have returned an error: ' + JSON.stringify(err));
			test.done();
		});
	},
	'test qReadUINT64': function(test) {
		device.qReadUINT64('ethernet')
		.then(function(res) {
			var numColons = res.split(':');
			test.strictEqual(numColons.length, 6, 'invalid mac address');
			test.done();
		}, function(err) {
			test.ok(false, 'read should not have returned an error');
			test.done();
		});
	},
	'close device': function(test) {
		device.close()
		.then(function(res) {
			test.strictEqual(res.comKey, 0, 'expected to receive a different comKey');
			test.done();
		}, function(err) {
			console.log('Failed to close mock device', err);
			test.ok(false, 'Failed to close mock device');
			test.done();
		});
	},
	'verify device closure': function(test) {
		device.read('AIN0')
		.then(function(res) {
			console.log('read returned', res);
			test.ok(false, 'should have caused an error');
			test.done();
		}, function(err) {
			test.done();
		});
	},
	'close all devices': function(test) {
		device_controller.closeAllDevices()
		.then(function(res) {
			// console.log('Num Devices Closed', res);
			test.strictEqual(res.numClosed, 0, 'wrong number of devices closed');
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