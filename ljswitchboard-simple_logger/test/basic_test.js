
/*
The basic_test tests the logger with a single logging configuration for basic
debugging & development purposes.  The adv_test.js executes the logger and makes
sure that it works with all of the test_config_files.
*/

var simple_logger = require('../lib/ljswitchboard-simple_logger');
var simpleLogger;
var driver_const = require('ljswitchboard-ljm_driver_constants');
var mock_device_manager = require('./mock_device_manager');
var mockDeviceManager = mock_device_manager.createDeviceManager();
var log_display = require('./utils/log_display');
var log_tester = require('./utils/log_tester');
var path = require('path');

/* Configure what devices to open/create */
mockDeviceManager.configure([{
	'deviceType': driver_const.LJM_DT_T7,
	'serialNumber': 1,
	'connectionType': driver_const.LJM_CT_USB,
}, {
	'deviceType': driver_const.LJM_DT_T7,
	'serialNumber': 2,
	'connectionType': driver_const.LJM_CT_USB,
}]);

/* Get the path of the basic_config.json file to be used for this test */
var logger_config_file = 'basic_config.json';
var LOGGER_FILES_DIR = '/test/logger_config_files';
var cwd = process.cwd();
var logger_config_file_path = path.normalize(path.join(
	cwd,
	LOGGER_FILES_DIR,
	logger_config_file
));

var eventMap = require('../lib/events').events;
eventMap = simple_logger.eventList;

var ignoreErrorsList = [
	eventMap.STOPPED_LOGGER,
	eventMap.CONFIGURATION_SUCCESSFUL,
];

var ENABLE_DEBUG_LOG = false;
function debugLog() {
	if(ENABLE_DEBUG_LOG) {
		var dataToPrint = [];
		dataToPrint.push('(basic_test.js)');
		for(var i = 0; i < arguments.length; i++) {
			dataToPrint.push(arguments[i]);
		}
		console.log.apply(console, dataToPrint);
	}
}

function attachListeners(loggerObject) {
	var eventKeys = Object.keys(eventMap);
	eventKeys.forEach(function(eventKey) {
		var key = eventMap[eventKey];
		loggerObject.on(key, function(data) {
			if(ignoreErrorsList.indexOf(key) < 0) {
				debugLog('Captured Event!!', key, data);
			}
			// console.log('Captured Event (basic_test)!!', key, data);
		});
	});
}


/* Define Test Cases */
exports.tests = {
	'Starting Basic Test': function(test) {
		console.log('');
		console.log('*** Starting Basic Test ***');
		test.done();
	},
	'Create simpleLogger': function(test) {
		simpleLogger = simple_logger.create();
		attachListeners(simpleLogger);
		test.done();
	},
	'Open Devices': mockDeviceManager.openDevices,
	'Initialize Logger': function(test) {
		simpleLogger.initialize()
		.then(function() {
			test.done();
		}, function() {
			test.ok(false, 'Should not have failed to initialize logger');
			test.done();
		});
	},
	'Update Loggers Device Listing': function(test) {
		simpleLogger.updateDeviceListing(mockDeviceManager.getDevices())
		.then(function() {
			test.done();
		}, function() {
			test.ok(false, 'Should not have failed to updateDeviceListing');
			// process.exit();
			test.done();
		});
	},
	'Load Config File': function(test) {
		simpleLogger.configureLogger({
			'configType': 'filePath',
			'filePath': logger_config_file_path
		})
		.then(function() {
			test.done();
		}, function() {
			test.ok(false);
			test.done();
		});
	},
	'Attach Display to Logger': function(test) {
		// log_display.initialize();
		// log_tester.initialize();
		test.done();

	},
	'Run Logger': function(test) {
		simpleLogger.once(eventMap.STOPPED_LOGGER, function(stopData) {
			debugLog('Logger Stopped');
			test.done();
		});
		simpleLogger.startLogger()
		.then(function succ() {
			test.ok(true);
			debugLog('Logger Started');
		}, function err() {
			test.ok(false, 'Logger should have started');
			debugLog('Logger Started');
		});
	},
	'Verify Configuration': function(test) {
		test.done();
	},
	'Close Devices': mockDeviceManager.closeDevices,
};