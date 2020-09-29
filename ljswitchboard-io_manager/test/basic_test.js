var assert = require('chai').assert;

var utils = require('./utils/utils');
var qRunner = utils.qRunner;

var io_manager;
var io_interface;

var criticalError = false;
var stopTest = function(done, err) {
	assert.isOk(false, err);
	criticalError = true;
	done();
};

describe('basic', function() {
	beforeEach(function(done) {
		if(criticalError) {
			process.exit(1);
		} else {
			done();
		}
	});
	afterEach(function(done) {
		done();
	});
	it('require io_manager', function (done) {
		// Require the io_manager
		try {
			io_manager = require('../lib/io_manager');
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
			// 'logger_controller', // TODO uncomment?
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
		qRunner(done, io_interface.initialize)
		.then(function(res) {
			assert.isOk(true, res);
			done();
		}, function(err) {
			assert.isOk(false, err);
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
