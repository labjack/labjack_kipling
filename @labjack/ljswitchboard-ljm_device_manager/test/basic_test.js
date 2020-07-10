
var q = require('q');
var fs = require('fs');
var path = require('path');

var ljm_device_manager;
var deviceManager;

var tests = {
	'include ljm_device_manager': function(test) {
		console.log('');
		console.log('**** basic_test ****');
		ljm_device_manager = require('../lib/ljm_device_manager');
		deviceManager = ljm_device_manager.load();

		console.log('Availiable Functions', Object.keys(deviceManager));
		test.done();
	},
};
exports.tests = tests;