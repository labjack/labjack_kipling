var assert = require('chai').assert;

var utils = require('../utils/utils');
var qRunner = utils.qRunner;
var qExec = utils.qExec;

var io_manager;
var io_interface;

// Managers
var device_controller;

// device object
var device;
var deviceB;

var criticalError = false;
var stopTest = function(done, err) {
	assert.isOk(false, err);
	criticalError = true;
	done();
};

describe('two mock devs', function() {
	beforeEach(function(done) {
		if(criticalError) {
			process.exit(1);
			done();
		} else {
			done();
		}
	});
	it('require io_manager', function (done) {
		console.log('');
		console.log('**** open_close_mock_dev_test ****');
		console.log('**** No Device Required ****');

		// Require the io_manager
		try {
			io_manager = require('../../lib/io_manager');
		} catch(err) {
			stopTest(done, err);
		}
		done();
	});
	it('create new io_interface', function (done) {
		try {
			io_interface = io_manager.io_interface();
		} catch(err) {
			stopTest(done, err);
		}
		done();
	});
	it('initialize io_interface', function (done) {
		// io_interface.initialize('testCWD')
		io_interface.initialize(process.cwd())
		.then(function(res) {
			assert.isOk(true, res);
			done();
		}, function(err) {
			console.log('******');
			console.log('io_interface failed to initialize:');
			console.log(err);
			console.log('******');
			// console.log('** io_interface failed to initialize:');
			// var infoKeys = Object.keys(err);
			// infoKeys.forEach(function(key) {
			// 	console.log('    - ' + key + ': ' + JSON.stringify(err[key]));
			// });
			stopTest(done, 'io_interface failed to initialize');
		});
	});
	it('check device_controller', function (done) {
		device_controller = io_interface.getDeviceController();

		var bundle = [];
		qExec(io_interface, 'getRegisteredEndpoints')(bundle)

		// calls to execute various oneWay messages that print results.
		// .then(qExec(io_interface, 'testOneWayMessage'))
		// .then(qExec(device_controller, 'testSendMessage'))
		// .then(qExec(device_controller, 'testSend'))
		.then(function(results) {
			// console.log('Results', results);

			// Verify the getRegisteredEndpoints results:
			var expectedEndpointsResults = {
				'functionCall': 'getRegisteredEndpoints',
				'retData': ['io_manager', 'driver_manager', 'device_manager']
			};
			var endpointsMsg = 'The resulting endpoints were not expected';
			assert.deepEqual(results[0], expectedEndpointsResults, endpointsMsg);
			setTimeout(function() {
				done();
			}, 1000);
		}, function(err) {
			console.log('ERROR!', err);
			done();
		});
	});
	it('open mock device', function (done) {
		var params = {
			'deviceType': 'LJM_dtT5',
			'connectionType': 'LJM_ctUSB',
			'identifier': '470010549',
			'mockDevice': true
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
	it('open mock deviceB', function (done) {
		var params = {
			'deviceType': 'LJM_dtT5',
			'connectionType': 'LJM_ctUSB',
			'identifier': '470010548',
			'mockDevice': true
		};

		device_controller.openDevice(params)
		.then(function(newDevice) {
			// save device reference
			deviceB = newDevice;
			device_controller.getNumDevices()
			.then(function(res) {
				assert.strictEqual(res, 2, 'wrong number of devices are open');
				done();
			});
		}, function(err) {
			console.log("Error opening device", err);
			assert.isOk(false, 'failed to create new device object');
			done();
		});
	});
	it('get device attributes', function (done) {
		// Perform the first query with no filters enabled.  By default, no
		// mock devices are enabled.
		device_controller.getDeviceListing()
		.then(function(res) {
			assert.strictEqual(res.length,2,'Device listing should not be empty');
			assert.strictEqual(res[0].serialNumber, 470010549, 'Wrong Serial Number');
			assert.strictEqual(res[1].serialNumber, 470010548, 'Wrong Serial Number');
			done();
		});
	});
	it('get device attributes (2)', function (done) {
		// Perform the first query with
		device_controller.getDeviceListing([{'enableMockDevices': true}])
		.then(function(res) {
			// console.log('Data', res);
			assert.strictEqual(res.length,2,'Device listing should not be empty');
			assert.strictEqual(res[0].serialNumber, 470010549, 'Wrong Serial Number');
			assert.strictEqual(res[1].serialNumber, 470010548, 'Wrong Serial Number');
			done();
		});
	});
	it('close mock device', function (done) {
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
	it('close mock device(2)', function (done) {
		deviceB.close()
		.then(function(res) {
			assert.strictEqual(res.comKey, 1, 'expected to receive a different comKey');
			done();
		}, function(err) {
			console.log('Failed to close mock device', err);
			assert.isOk(false, 'Failed to close mock device');
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
