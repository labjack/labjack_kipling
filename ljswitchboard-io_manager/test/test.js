

var utils = require('./utils/utils');
var qRunner = utils.qRunner;
var qExec = utils.qExec;
var pResults = utils.pResults;
var q = require('q');

var io_manager;
var io_interface;

// Managers
var driver_controller;
var device_controller;
var file_io_controller;
var logger_controller;

var criticalError = false;
var stopTest = function(test, err) {
	test.ok(false, err);
	criticalError = true;
	test.done();
};




exports.basic_test = {
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
	'require io_manager': function(test) {
		// Require the io_manager
		try {
			io_manager = require('../lib/io_manager');
		} catch(err) {
			stopTest(test, err);
		}
		

		var keys = Object.keys(io_manager);
		test.deepEqual(keys, ['io_interface'], 'io_manager not required properly');
		test.done();
	},
	'create new io_interface': function(test) {
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
				test.ok(false, mesg);
				process.exit(1);
			} else {
				test.ok(true);
			}
		});
		// var msg = 'io_interface not created properly';
		// test.deepEqual(keys, expectedKeys, msg);
		test.done();
	},
	'initialize io_interface': function(test) {
		qRunner(test, io_interface.initialize)
		.then(function(res) {
			test.ok(true, res);
			test.done();
		});	
	},
	'check driver_manager': function(test) {
		driver_manager = io_interface.getDriverController();

		var keys = Object.keys(driver_manager);
		var requiredKeys = [
			'init',
			'listAll',
			'listAllExtended',
			'errToStr',
			'printErrToStr',
			'loadConstants',
			'readLibrary',
			'readLibraryS',
			'writeLibrary',
			'logS',
			'resetLog',
			'driverVersion'
		];
		var foundRequiredKeys = true;
		requiredKeys.forEach(function(requiredKey) {
			if (keys.indexOf(requiredKey) < 0) {
				foundRequiredKeys = false;
				var mesg = 'io_interface missing required key: ' + requiredKey;
				test.ok(false, mesg);
				process.exit(1);
			} else {
				test.ok(true);
			}
		});

		var bundle = [];
		qExec(driver_manager, 'listAll')(bundle)
		.then(qExec(driver_manager, 'listAllExtended', null, null, ["AIN0"]))
		.then(qExec(driver_manager, 'errToStr', 1269))
		.then(qExec(driver_manager, 'readLibrary', 'LJM_LIBRARY_VERSION'))
		.then(qExec(driver_manager, 'readLibraryS', 'LJM_MODBUS_MAP_CONSTANTS_FILE'))
		.then(qExec(driver_manager, 'writeLibrary', 'LJM_DEBUG_LOG_MODE', 'default'))
		.then(qExec(driver_manager, 'logS', 'BLA'))
		.then(qExec(driver_manager, 'resetLog'))
		.then(qExec(driver_manager, 'driverVersion'))
		.then(function(results) {
			var printIndividualResults = false;
			pResults(results, printIndividualResults)
			.then(function(results){
				test.done();
			});
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