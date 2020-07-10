

var utils = require('./utils/utils');
var qRunner = utils.qRunner;
var qExec = utils.qExec;
var pResults = utils.pResults;
var q = require('q');

var single_device_interface;
var singleDeviceInterface;
var single_device_controller;

var deviceObject;

var criticalError = false;
var stopTest = function(test, err) {
	test.ok(false, err);
	criticalError = true;
	test.done();
};

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
	'require single_device_interface': function(test) {
		try {
			single_device_interface = require('../lib/single_device_interface');
		} catch(err) {
			stopTest(test, err);
		}
		test.done();
	},
	'create singleDeviceInterface': function(test) {
		try {
			singleDeviceInterface = single_device_interface.createSingleDeviceInterface();
		} catch(err) {
			stopTest(test, err);
		}
		test.done();
	},
	'initialize singleDeviceInterface': function(test) {
		qRunner(test, singleDeviceInterface.initialize)
		.then(function() {
			test.done();
		});
	},
	'destroy singleDeviceInterface': function(test) {
		qRunner(test, singleDeviceInterface.destroy)
		.then(function(res) {
			test.done();
		});
	},
	// 'create createDeviceObject': function(test) {
	// 	qRunner(singleDeviceInterface.createDeviceObject)
	// 	.then(function(device) {

	// 		var deviceKeys = [
	// 			'open',
	// 			'close'
	// 		];
	// 		var keys = Object.keys(device);

	// 		deviceObject = device;
	// 		test.ok(true, device);
	// 		test.done();
	// 	});
	// },
	// 'open device': function(test) {
	// 	var testDeviceAttributes = {
	// 		'deviceType': 'LJM_dtANY',
	// 		'connectionType': 'LJM_ctANY',
	// 		'identifier': 'LJM_idANY'
	// 	};

	// 	deviceObject.open(testDeviceAttributes)
	// 	.then(function(device) {
	// 		test.done();
	// 	});
	// },
	// 'close device': function(test) {
	// 	deviceObject.close()
	// 	.then(function(deviceReferenceKey) {
	// 		test.done();
	// 	});
	// },
	// 'destroyInactiveDeviceObjects': function(test) {
	// 	qRunner(singleDeviceInterface.destroyInactiveDeviceObjects)
	// 	.then(function() {
	// 		test.done();
	// 	});
	// }
};