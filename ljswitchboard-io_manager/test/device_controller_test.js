

var utils = require('./utils/utils');
var qRunner = utils.qRunner;
var qExec = utils.qExec;
var pResults = utils.pResults;
var q = require('q');

var io_manager;
var io_interface;

// Managers
var device_controller;

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
		.then(qExec(device_controller, 'testSendMessage'))
		.then(qExec(device_controller, 'testSend'))
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
			// var printIndividualResults = false;
			// var expectedErrorsList = [];
			// pResults(results, printIndividualResults, expectedErrorsList)
			// .then(function(results){
			// 	test.done();
			// });
		}, function(err) {
			console.log('ERROR!', err);
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
