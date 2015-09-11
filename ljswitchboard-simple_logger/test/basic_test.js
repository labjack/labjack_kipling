

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

function attachListeners(loggerObject) {
	var eventMap = require('../lib/events').events;
	var eventKeys = Object.keys(eventMap);
	eventKeys.forEach(function(eventKey) {
		var key = eventMap[eventKey];
		loggerObject.on(key, function(data) {
			console.log('Captured Event!!', key, data);
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
			test.ok(false);
			test.done();
		});
	},
	'Update Loggers Device Listing': function(test) {
		simpleLogger.initialize(mockDeviceManager.getDevices())
		.then(function() {
			test.done();
		}, function() {
			test.ok(false);
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
	'Verify Configuration': function(test) {
		test.done();
	},
	'Close Devices': mockDeviceManager.closeDevices,
};