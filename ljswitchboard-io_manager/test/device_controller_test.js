

var utils = require('./utils/utils');
var qRunner = utils.qRunner;
var qExec = utils.qExec;
var pResults = utils.pResults;
var q = require('q');

var io_manager;
var io_interface;

// Managers
var device_controller;

// device object
var device;
var deviceB;

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
			callback();
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
			io_manager = require('../lib/io_manager');
		} catch(err) {
			stopTest(test, err);
		}
		test.done();
	},
	'create new io_interface': function(test) {
		try {
			io_interface = io_manager.io_interface();
		} catch(err) {
			stopTest(test, err);
		}
		test.done();
	},
	'initialize io_interface': function(test) {
		// io_interface.initialize('testCWD')
		io_interface.initialize(process.cwd())
		.then(function(res) {
			test.ok(true, res);
			test.done();
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
			stopTest(test, 'io_interface failed to initialize');
		});	
	},
	'check device_controller': function(test) {
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
			test.deepEqual(results[0], expectedEndpointsResults, endpointsMsg);
			setTimeout(function() {
				test.done();
			}, 1000);
		}, function(err) {
			console.log('ERROR!', err);
			test.done();
		});
	},
	'open mock device': function(test) {
		var params = {
			'deviceType': 'LJM_dtT7',
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
				test.strictEqual(res, 1, 'wrong number of devices are open');
				test.done();
			});
		}, function(err) {
			console.log("Error opening device", err);
			test.ok(false, 'failed to create new device object');
			test.done();
		});
	},
	'open mock deviceB': function(test) {
		var params = {
			'deviceType': 'LJM_dtT7',
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
				test.strictEqual(res, 2, 'wrong number of devices are open');
				test.done();
			});
		}, function(err) {
			console.log("Error opening device", err);
			test.ok(false, 'failed to create new device object');
			test.done();
		});
	},
	'get device attributes': function(test) {
		// Perform the first query with no filters enabled.  By default, no 
		// mock devices are enabled.
		device_controller.getDeviceListing()
		.then(function(res) {
			test.deepEqual(res,[],'Device listing should be empty, only mockDevices are open');
			test.done();
		});
	},
	'get device attributes (2)': function(test) {
		// Perform the first query with
		device_controller.getDeviceListing([{'enableMockDevices': true}])
		.then(function(res) {
			test.strictEqual(res.length,2,'Device listing should not be empty');
			test.strictEqual(res[0].serialNumber, 470010549, 'Wrong Serial Number');
			test.strictEqual(res[1].serialNumber, 470010548, 'Wrong Serial Number');
			test.done();
		});
	},
	'close mock device': function(test) {
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
	'destroy io_interface': function(test) {
		qRunner(test, io_interface.destroy)
		.then(function(res) {
			test.ok(true, res);
			test.done();
		});
	},
};
