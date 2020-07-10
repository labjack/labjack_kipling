


var utils = require('./utils/utils');
var qRunner = utils.qRunner;
var qExec = utils.qExec;
var pResults = utils.pResults;
var q = require('q');

var io_manager;
var io_interface;

// Managers
var driver_controller;

var criticalError = false;
var stopTest = function(test, err) {
	test.ok(false, err);
	criticalError = true;
	test.done();
};

var TEST_DRIVER_CONTROLLER = true;


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
		qRunner(test, io_interface.initialize)
		.then(function(res) {
			test.ok(true, res);
			test.done();
		});	
	},
	'check driver_controller': function(test) {
		if(TEST_DRIVER_CONTROLLER) {
			driver_controller = io_interface.getDriverController();

			var keys = Object.keys(driver_controller);
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
			qExec(driver_controller, 'listAll')(bundle)
			.then(qExec(driver_controller, 'listAllExtended', null, null, ["AIN0"]))
			.then(qExec(driver_controller, 'errToStr', 1269))
			.then(qExec(driver_controller, 'readLibrary', 'LJM_LIBRARY_VERSION'))
			.then(qExec(driver_controller, 'readLibraryS', 'LJM_MODBUS_MAP_CONSTANTS_FILE'))
			.then(qExec(driver_controller, 'readLibraryS', 'LJM_DEBUG_LOG_FILE'))
			.then(qExec(driver_controller, 'writeLibrary', 'LJM_DEBUG_LOG_MODE', 'default'))
			.then(qExec(driver_controller, 'writeLibrary', 'LJM_DEBUG_LOG_LEVEL', 'LJM_TRACE')) // LJM_TRACE
			.then(qExec(driver_controller, 'writeLibrary', 'LJM_DEBUG_LOG_MODE', 'LJM_DEBUG_LOG_MODE_CONTINUOUS')) //LJM_DEBUG_LOG_MODE_CONTINUOUS
			.then(qExec(driver_controller, 'logS', 0, 'BLA'))
			.then(qExec(driver_controller, 'resetLog'))
			.then(qExec(driver_controller, 'errToStr', 202))
			.then(qExec(driver_controller, 'errToStr', 1299))
			.then(qExec(driver_controller, 'driverVersion'))
			.then(function(results) {
				var printIndividualResults = false;
				var expectedErrorsList = [
					'errToStr'
				];
				pResults(results, printIndividualResults, expectedErrorsList)
				.then(function(results){
					test.done();
				});
			}, function(err) {
				console.log('ERROR!', err);
				test.done();
			});
		} else {
			console.log('- Skipping check driver_controller');
			test.done();
		}
	},
	'destroy io_interface': function(test) {
		qRunner(test, io_interface.destroy)
		.then(function(res) {
			test.ok(true, res);
			test.done();
		});
	},
};
