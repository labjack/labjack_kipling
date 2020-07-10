

var utils = require('../utils/utils');
var qRunner = utils.qRunner;
var qExec = utils.qExec;
var pResults = utils.pResults;
var q = require('q');

var io_manager;
var io_interface;

// Managers
var driver_controller;
var device_controller;
var file_io_controller;
var logger_controller;

var criticalError = false;
var stopTest = function(test, err) {
	test.ok(false, err);
	criticalError = true;
	test.done();
};

var TEST_DRIVER_MANAGER = false;

var loadedUserIPs = [];
exports.tests = {
	'setUp': function(callback) {
		if(criticalError) {
			process.exit(1);
		} else {
			callback();
		}
	},
	'tearDown': function(callback) {
		callback();
	},
	'require io_manager': function(test) {
		// Require the io_manager
		try {
			io_manager = require('../../lib/io_manager');
		} catch(err) {
			stopTest(test, err);
		}


		var keys = Object.keys(io_manager);
		test.deepEqual(keys, ['io_interface', 'info'], 'io_manager not required properly');
		test.done();
	},
	'create new io_interface': function(test) {
		io_interface = io_manager.io_interface();
		var keys = Object.keys(io_interface);
		var requiredKeys = [
			'driver_controller',
			'device_controller',
			'logger_controller',
			'file_io_controller'
		];
		var foundRequiredKeys = true;
		requiredKeys.forEach(function(requiredKey) {
			if (keys.indexOf(requiredKey) < 0) {
				foundRequiredKeys = false;
				var mesg = 'io_interface missing required key: ' + requiredKey;
				test.ok(false, mesg);
				process.exit(1);
			} else {
				test.ok(true);
			}
		});
		// var msg = 'io_interface not created properly';
		// test.deepEqual(keys, expectedKeys, msg);
		test.done();
	},
	'initialize io_interface': function(test) {
		console.log('TEST: Initializing io_interface');
		qRunner(test, io_interface.initialize)
		.then(function(res) {
			driver_controller = io_interface.getDriverController();
			test.ok(true, res);
			test.done();
		}, function(err) {
			test.ok(false, err);
			test.done();
		});
	},
	'check parse function of ljm_special_addresses': function(test) {
		driver_controller.specialAddresses.parse()
		.then(function(res) {
			console.log('Parse: Special Addresses Data', res);
			test.ok(true);
			test.done();
		}, function(err) {
			console.log('Parse: Error...', err);
			test.ok(false, 'ljm_special_addresses function should not have failed');
			test.done();
		});
		// console.log('Keys...', Object.keys(driver_controller.specialAddresses));
		// test.done();
	},
	'check load function of ljm_special_addresses': function(test) {
		driver_controller.specialAddresses.load()
		.then(function(res) {
			// console.log('Load: Special Addresses Data', res);
			loadedUserIPs = res.fileData;
			test.ok(true);
			test.done();
		}, function(err) {
			console.log('Load: Error...', err);
			test.ok(false, 'ljm_special_addresses function should not have failed');
			test.done();
		});
	},
	'check addIPs function of ljm_special_addresses': function(test) {
		// console.log('Keys...', Object.keys(driver_controller.specialAddresses));
		// test.done();
		var newIPs = [{
			'ip': '192.168.1.13',
			'comments': ['test comment 2'],
		}, {
			'ip': '192.168.1.14',
			'comments': ['test comment 3'],
		}];
		driver_controller.specialAddresses.addIPs(newIPs)
		.then(function(res) {
			console.log('addIPs: Special Addresses Data', res);
			// loadedUserIPs = res.fileData;
			test.ok(true);
			test.done();
		}, function(err) {
			console.log('addIPs: Error...', err);
			test.ok(false, 'ljm_special_addresses function should not have failed');
			test.done();
		});
	},
	'check save function of ljm_special_addresses': function(test) {
		// console.log('Keys...', Object.keys(driver_controller.specialAddresses));
		// test.done();
		loadedUserIPs.push({
			'ip': '192.168.1.12',
			'comments': ['test comment'],
		});
		driver_controller.specialAddresses.save(loadedUserIPs)
		.then(function(res) {
			console.log('Save: Special Addresses Data', res);
			// loadedUserIPs = res.fileData;
			test.ok(true);
			test.done();
		}, function(err) {
			console.log('Save: Error...', err);
			test.ok(false, 'ljm_special_addresses function should not have failed');
			test.done();
		});
	},
	'destroy io_interface': function(test) {
		qRunner(test, io_interface.destroy)
		.then(function(res) {
			test.ok(true, res);
			test.done();
		});
	},
};
