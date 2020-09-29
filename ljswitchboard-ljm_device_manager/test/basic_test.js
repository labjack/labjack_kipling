var assert = require('chai').assert;

var ljm_device_manager;
var deviceManager;

describe('basic', function() {
	it('include ljm_device_manager', function (done) {
		console.log('');
		console.log('**** basic_test ****');
		ljm_device_manager = require('../lib/ljm_device_manager');
		deviceManager = ljm_device_manager.load();

		console.log('Availiable Functions', Object.keys(deviceManager));
		done();
	});
});
