
var q = require('q');
var device_curator = require('../lib/device_curator');

var device;

var criticalError = false;
var stopTest = function(test, err) {
	test.ok(false, err);
	criticalError = true;
	test.done();
};

deviceFound = false;

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
	'createDevice': function(test) {
		try {
			device = new device_curator.device();
			console.log(Object.keys(device));
		} catch(err) {
			stopTest(test, err);
		}
		test.done();
	},
	'openDevice': function(test) {
		var td = {
			'dt': 'LJM_dtANY',
			'ct': 'LJM_ctANY',
			'id': 'LJM_idANY'
		};

		device.open(td.dt, td.ct, td.id)
		.then(function(res) {
			deviceFound = true;
			test.done();
		}, function(err) {
			test.done();
		});
	},
	'closeDevice': function(test) {
		device.close()
		.then(function(res) {
			console.log('closed device', res);
			test.done();
		});
	}
};