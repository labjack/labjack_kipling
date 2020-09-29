var assert = require('chai').assert;

var utils = require('../utils/utils');
var qRunner = utils.qRunner;

var io_manager;
var io_interface;

// Managers
var driver_controller;

var criticalError = false;
var stopTest = function(done, err) {
	assert.isOk(false, err);
	criticalError = true;
	done();
};

var loadedUserIPs = [];

describe('ljm special addresses', function() {
	return;
	this.skip();
	beforeEach(function(callback) {
		if(criticalError) {
			process.exit(1);
		} else {
			callback();
		}
	});
	it('require io_manager', function (done) {
		// Require the io_manager
		try {
			io_manager = require('../../lib/io_manager');
		} catch(err) {
			stopTest(done, err);
		}


		var keys = Object.keys(io_manager);
		assert.deepEqual(keys, ['io_interface', 'info'], 'io_manager not required properly');
		done();
	});
	it('create new io_interface', function (done) {
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
				assert.isOk(false, mesg);
				process.exit(1);
			} else {
				assert.isOk(true);
			}
		});
		// var msg = 'io_interface not created properly';
		// assert.deepEqual(keys, expectedKeys, msg);
		done();
	});
	it('initialize io_interface', function (done) {
		console.log('TEST: Initializing io_interface');
		qRunner(done, io_interface.initialize)
		.then(function(res) {
			driver_controller = io_interface.getDriverController();
			assert.isOk(true, res);
			done();
		}, function(err) {
			assert.isOk(false, err);
			done();
		});
	});
	it('check parse function of ljm_special_addresses', function (done) {
		driver_controller.specialAddresses.parse()
		.then(function(res) {
			console.log('Parse: Special Addresses Data', res);
			assert.isOk(true);
			done();
		}, function(err) {
			console.log('Parse: Error...', err);
			assert.isOk(false, 'ljm_special_addresses function should not have failed');
			done();
		});
		// console.log('Keys...', Object.keys(driver_controller.specialAddresses));
		// done();
	});
	it('check load function of ljm_special_addresses', function (done) {
		driver_controller.specialAddresses.load()
		.then(function(res) {
			// console.log('Load: Special Addresses Data', res);
			loadedUserIPs = res.fileData;
			assert.isOk(true);
			done();
		}, function(err) {
			console.log('Load: Error...', err);
			assert.isOk(false, 'ljm_special_addresses function should not have failed');
			done();
		});
	});
	it('check addIPs function of ljm_special_addresses', function (done) {
		// console.log('Keys...', Object.keys(driver_controller.specialAddresses));
		// done();
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
			assert.isOk(true);
			done();
		}, function(err) {
			console.log('addIPs: Error...', err);
			assert.isOk(false, 'ljm_special_addresses function should not have failed');
			done();
		});
	});
	it('check save function of ljm_special_addresses', function (done) {
		// console.log('Keys...', Object.keys(driver_controller.specialAddresses));
		// done();
		loadedUserIPs.push({
			'ip': '192.168.1.12',
			'comments': ['test comment'],
		});
		driver_controller.specialAddresses.save(loadedUserIPs)
		.then(function(res) {
			console.log('Save: Special Addresses Data', res);
			// loadedUserIPs = res.fileData;
			assert.isOk(true);
			done();
		}, function(err) {
			console.log('Save: Error...', err);
			assert.isOk(false, 'ljm_special_addresses function should not have failed');
			done();
		});
	});
	it('destroy io_interface', function (done) {
		qRunner(done, io_interface.destroy)
		.then(function(res) {
			assert.isOk(true, res);
			done();
		});
	});
});
