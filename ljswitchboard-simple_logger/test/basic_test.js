

var simple_logger = require('../lib/ljswitchboard-simple_logger');
var simpleLogger;
var driver_const = require('ljswitchboard-ljm_driver_constants');
var mock_device_manager = require('./mock_device_manager');
var mockDeviceManager = mock_device_manager.createDeviceManager();
var log_display = require('./utils/log_display');
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
var ignoreErrorsList = [
	eventMap.STOPPED_LOGGER,
	eventMap.CONFIGURATION_SUCCESSFUL,
];
function attachListeners(loggerObject) {
	
	var eventKeys = Object.keys(eventMap);
	eventKeys.forEach(function(eventKey) {
		var key = eventMap[eventKey];
		loggerObject.on(key, function(data) {
			if(ignoreErrorsList.indexOf(key) < 0) {
				console.log('Captured Event (basic_test)!!', key, data);
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
		test.done();

	},
	'Run Logger': function(test) {
		simpleLogger.once(eventMap.STOPPED_LOGGER, function(stopData) {
			console.log('Logger Stopped');
			test.done();
		});
		simpleLogger.startLogger()
		.then(function succ() {
			test.ok(true);
			console.log('Logger Started');
		}, function err() {
			test.ok(false, 'Logger should have started');
			console.log('Logger Started');
		});
	},
	'Verify Configuration': function(test) {
		test.done();
	},
	'Close Devices': mockDeviceManager.closeDevices,
};