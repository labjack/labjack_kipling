var assert = require('chai').assert;

var utils = require('./utils/utils');
var qRunner = utils.qRunner;

var single_device_interface;
var singleDeviceInterface;

var criticalError = false;
var stopTest = function(done, err) {
	assert.isOk(false, err);
	criticalError = true;
	done();
};

describe('single device controller', function() {
	beforeEach(function(done) {
		if(criticalError) {
			process.exit(1);
		} else {
			done();
		}
	});
	it('require single_device_interface', function (done) {
		try {
			single_device_interface = require('../lib/single_device_interface');
		} catch(err) {
			stopTest(done, err);
		}
		done();
	});
	it('create singleDeviceInterface', function (done) {
		try {
			singleDeviceInterface = single_device_interface.createSingleDeviceInterface();
		} catch(err) {
			stopTest(done, err);
		}
		done();
	});
	it('initialize singleDeviceInterface', function (done) {
		qRunner(done, singleDeviceInterface.initialize)
		.then(function() {
			done();
		});
	});
	it('destroy singleDeviceInterface', function (done) {
		qRunner(done, singleDeviceInterface.destroy)
		.then(function(res) {
			done();
		});
	});
	// it('create createDeviceObject', function (done) {
	// 	qRunner(singleDeviceInterface.createDeviceObject)
	// 	.then(function(device) {

	// 		var deviceKeys = [
	// 			'open',
	// 			'close'
	// 		];
	// 		var keys = Object.keys(device);

	// 		deviceObject = device;
	// 		assert.isOk(true, device);
	// 		done();
	// 	});
	// },
	// it('open device', function (done) {
	// 	var testDeviceAttributes = {
	// 		'deviceType': 'LJM_dtANY',
	// 		'connectionType': 'LJM_ctANY',
	// 		'identifier': 'LJM_idANY'
	// 	};

	// 	deviceObject.open(testDeviceAttributes)
	// 	.then(function(device) {
	// 		done();
	// 	});
	// },
	// it('close device', function (done) {
	// 	deviceObject.close()
	// 	.then(function(deviceReferenceKey) {
	// 		done();
	// 	});
	// },
	// it('destroyInactiveDeviceObjects', function (done) {
	// 	qRunner(singleDeviceInterface.destroyInactiveDeviceObjects)
	// 	.then(function() {
	// 		done();
	// 	});
	// }
});
