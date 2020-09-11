
/**
	This test is like basic_live_test.js, but only performs a minimal T8 test.
**/

var utils = require('../utils/utils');
var qRunner = utils.qRunner;
var qExec = utils.qExec;
var pResults = utils.pResults;
var q = require('q');
var async = require('async');

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
		console.log('');
		console.log('**** basic_live_test ****');
		console.log('**** Please connect 1x T8 via USB ****');

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
			'deviceType': 'LJM_dtT8',
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
	'readFirmwareVersion': function(test) {
		var regs = [
			'FIRMWARE_VERSION',
			// 'BOOTLOADER_VERSION',
			'DEVICE_NAME_DEFAULT',
			// 'WIFI_VERSION'
		];
		var passes = true;
		var errorMessage = '';
		async.eachSeries(regs, function(reg, cb) {
			device.iRead(reg).then(
			function(res) {
				cb();
			}, function(err) {
				passes = false;
				errorMessage += 'Error reading: ' + reg + '\n';
				cb();
			});
		}, function(err) {
			test.ok(passes, errorMessage);
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
