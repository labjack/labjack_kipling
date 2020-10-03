/**
	This test aims to show how the io_manager library should be used.  It
	shows the initialization, some basic usage steps, and destruction of the
	library.
**/

var assert = require('chai').assert;

var utils = require('../utils/utils');
var qExec = utils.qExec;

var labjack_nodejs = require('labjack-nodejs');
var constants = labjack_nodejs.driver_const;

var io_manager;
var io_interface;

// Managers
var driver_controller;
var device_controller;

var device;

describe('basic live', function() {
	return;
	this.skip();
	it('initialization', function (done) {
		console.log('');
		console.log('**** basic_live_test ****');
		console.log('**** Please connect 1x T7 via USB ****');

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
			'mockDevice': false
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
	it('test getHandleInfo', function (done) {
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
			assert.strictEqual(resKeys.length, requiredKeys.length, msg);
			requiredKeys.forEach(function(key, i) {
				assert.strictEqual(resKeys[i], key, msg + ': ' + key);
			});
			done();
		}, function(err) {
			console.log('getHandleInfo error', err);
			assert.isOk(false);
			done();
		});
	});
	it('test getDeviceAttributes', function (done) {
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
				assert.isOk((givenAttributes.indexOf(requiredAttribute) >= 0), msg);
			});
			done();
		}, function(err) {
			assert.isOk(false, 'read should not have returned an error: ' + JSON.stringify(err));
			done();
		});
	});
	it('test read', function (done) {
		device.read('AIN0')
		.then(function(res) {
			var isOk = true;
			if((res > 11) || (res < -11)) {
				isOk = false;
			}
			assert.isOk(isOk, 'AIN0 read result is out of range');
			done();
		}, function(err) {
			assert.isOk(false, 'AIN0 read result returned an error: ' + JSON.stringify(err));
			done();
		});
	});
	it('test readMultiple', function (done) {
		var results = [];
		qExec(device, 'readMultiple', ['AIN0','DAC0'])(results)
		.then(function(res) {
			var expectedResults = [
				{
					'functionCall': 'readMultiple',
					'retData': [
						{'address': 'AIN0', 'isErr': false, 'type': 'range', 'min': -11, 'max': 11},
						{'address': 'DAC0', 'isErr': false, 'type': 'range', 'min': -0.1, 'max': 6}
					]
				}
			];
			utils.testResultsArray(expectedResults, res);
			done();
		}, function(err) {
			assert.isOk(false, 'read should not have returned an error: ' + JSON.stringify(err));
			done();
		});
	});
	it('test readMany', function (done) {
		device.readMany(['AIN0','DAC0'])
		.then(function(res) {
			if((res[0] < -11) || (res[0] > 11)) {
				assert.isOk(false, 'AIN0 result out of range');
			} else {
				assert.isOk(true);
			}
			if((res[1] < 0) || (res[1] > 6)) {
				assert.isOk(false, 'DAC0 result out of range');
			} else {
				assert.isOk(true);
			}
			done();
		}, function(err) {
			assert.isOk(false, 'read should not have returned an error: ' + JSON.stringify(err));
			done();
		});
	});
	it('test write', function (done) {
		device.write('DAC0', 1)
		.then(function(res) {
			device.read('DAC0')
			.then(function(res) {
				if((res < 0.8) || (res > 1.1)) {
					assert.isOk(false, 'DAC0 value not set');
				} else {
					assert.isOk(true);
				}
				done();
			}, function(err) {
				assert.isOk(false);
				done();
			});
		}, function(err) {
			assert.isOk(false, 'read should not have returned an error: ' + JSON.stringify(err));
			done();
		});
	});
	it('test writeMany', function (done) {
		device.writeMany(['DAC0','DAC1'], [2.5,1])
		.then(function(res) {
			device.readMany(['DAC0','DAC1'])
			.then(function(res) {
				if((res[0] < 2) || (res[0] > 3)) {
					assert.isOk(false, 'DAC0 result out of range');
				} else {
					assert.isOk(true);
				}
				if((res[1] < 0.8) || (res[1] > 1.1)) {
					assert.isOk(false, 'DAC1 result out of range');
				} else {
					assert.isOk(true);
				}
				done();
			}, function(err) {
				assert.isOk(false);
				done();
			});
		}, function(err) {
			assert.isOk(false, 'read should not have returned an error: ' + JSON.stringify(err));
			done();
		});
	});
	it('test rwMany', function (done) {
		device.rwMany(
			['AIN0','DAC1','DAC1'],
			[constants.LJM_READ, constants.LJM_WRITE, constants.LJM_READ],
			[1,1,1],
			[0,2,0]
		)
		.then(function(res) {
			assert.strictEqual(res.length,2,'invalid number of results returned');
			if((res[0] < -11) || (res[0] > 11)) {
				assert.isOk(false, 'AIN0 result out of range');
			} else {
				assert.isOk(true);
			}
			if((res[1] < 1.8) || (res[1] > 2.2)) {
				assert.isOk(false, 'DAC1 result out of range');
			} else {
				assert.isOk(true);
			}
			done();
		}, function(err) {
			assert.isOk(false, 'read should not have returned an error: ' + JSON.stringify(err));
			done();
		});
	});
	it('test readUINT64', function (done) {
		device.readUINT64('ethernet')
		.then(function(res) {
			var numColons = res.split(':');
			assert.strictEqual(numColons.length, 6, 'invalid mac address');
			done();
		}, function(err) {
			assert.isOk(false, 'read should not have returned an error: ' + JSON.stringify(err));
			done();
		});
	});
	it('test qRead', function (done) {
		device.qRead('AIN0')
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
	it('test qReadMany', function (done) {
		var addresses = ['AIN0','DAC0'];
		device.qReadMany(addresses)
		.then(function(res) {
			if((res[0] < -11) || (res[0] > 11)) {
				assert.isOk(false, 'AIN0 result out of range');
			} else {
				assert.isOk(true);
			}
			if((res[1] < 0) || (res[1] > 6)) {
				assert.isOk(false, 'DAC0 result out of range');
			} else {
				assert.isOk(true);
			}
			done();
		}, function(err) {
			assert.isOk(false, 'read should not have returned an error: ' + JSON.stringify(err));
			done();
		});
	});
	it('test qWrite', function (done) {
		device.qWrite('DAC0', 2.5)
		.then(function(res) {
			device.read('DAC0')
			.then(function(res) {
				if((res < 2.4) || (res > 2.6)) {
					assert.isOk(false, 'DAC0 value not set');
				} else {
					assert.isOk(true);
				}
				done();
			}, function(err) {
				assert.isOk(false);
				done();
			});
		}, function(err) {
			assert.isOk(false, 'read should not have returned an error: ' + JSON.stringify(err));
			done();
		});
	});
	it('test qWriteMany', function (done) {
		device.qWriteMany(['DAC0','DAC1'], [0.8,3])
		.then(function(res) {
			device.readMany(['DAC0','DAC1'])
			.then(function(res) {
				if((res[0] < 0.7) || (res[0] > 0.9)) {
					assert.isOk(false, 'DAC0 result out of range');
				} else {
					assert.isOk(true);
				}
				if((res[1] < 2.9) || (res[1] > 3.1)) {
					assert.isOk(false, 'DAC1 result out of range');
				} else {
					assert.isOk(true);
				}
				done();
			}, function(err) {
				assert.isOk(false);
				done();
			});
		}, function(err) {
			assert.isOk(false, 'read should not have returned an error: ' + JSON.stringify(err));
			done();
		});
	});
	it('test qrwMany', function (done) {
		device.qrwMany(
			['AIN0','DAC1'],
			[constants.LJM_READ, constants.LJM_WRITE],
			[1,1],
			[0,2]
		)
		.then(function(res) {
			assert.strictEqual(res.length, 1, 'wrong number of results');
			if((res[0] < -11) || (res[0] > 11)) {
					assert.isOk(false, 'AIN0 result out of range');
				} else {
					assert.isOk(true);
				}
			done();
		}, function(err) {
			assert.isOk(false, 'read should not have returned an error: ' + JSON.stringify(err));
			done();
		});
	});
	it('test qReadUINT64', function (done) {
		device.qReadUINT64('ethernet')
		.then(function(res) {
			var numColons = res.split(':');
			assert.strictEqual(numColons.length, 6, 'invalid mac address');
			done();
		}, function(err) {
			assert.isOk(false, 'read should not have returned an error');
			done();
		});
	});
	it('close device', function (done) {
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
