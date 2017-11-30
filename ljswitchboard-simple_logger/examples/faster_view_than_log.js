console.log('Hello World.js!!');


/*
 * This is a hello world application for the simple_logger node.js app.

 * Usage is as follows:
 * 1. 
 */

/*
 * Normally you would require the project as "require('ljswitchboard-simple_logger');"
*/

var simple_logger = require('../lib/ljswitchboard-simple_logger');
var device_manager = require('./device_manager');
var async = require('async');
var q = require('q');
var path = require('path');


var eventMap = require('../lib/events').events;
var ignoreErrorsList = [
	eventMap.STOPPED_LOGGER,
	eventMap.CONFIGURATION_SUCCESSFUL,
];

var ENABLE_DEBUG_LOG = false;
var ENABLE_PRINTING = false;
function print() {
	if(ENABLE_DEBUG_LOG) {
		var dataToPrint = [];
		dataToPrint.push('(hello_world.js)');
		for(var i = 0; i < arguments.length; i++) {
			dataToPrint.push(arguments[i]);
		}
		console.log.apply(console, dataToPrint);
	}
}
function debugLog() {
	if(ENABLE_DEBUG_LOG) {
		var dataToPrint = [];
		dataToPrint.push('(hello_world.js)');
		for(var i = 0; i < arguments.length; i++) {
			dataToPrint.push(arguments[i]);
		}
		console.log.apply(console, dataToPrint);
	}
}
var ENABLE_NEW_DATA_REPORTING = true;
function printNewData() {
	if(ENABLE_NEW_DATA_REPORTING) {
		var dataToPrint = [];
		dataToPrint.push('(hello_world.js)');
		for(var i = 0; i < arguments.length; i++) {
			dataToPrint.push(arguments[i]);
		}
		console.log.apply(console, dataToPrint);
	}
}

var logger_config_file = 'basic_config.json';
var LOGGER_FILES_DIR = '/test/logger_config_files';
var TEMPLATE_LOGGER_CONFIG_FILE = '/examples/generated-template.json';
var cwd = process.cwd();
var example_path = path.normalize(path.join(
	cwd,
	'examples'
));
var logger_config_file_path = path.normalize(path.join(
	cwd,
	LOGGER_FILES_DIR,
	logger_config_file
));
var template_logger_config_file = path.normalize(path.join(
	cwd,
	TEMPLATE_LOGGER_CONFIG_FILE
));
console.log('--- Application CWD:',cwd);
console.log('--- Logger config file path:',logger_config_file_path);

function attachListeners(loggerObject) {
	var eventKeys = Object.keys(eventMap);
	eventKeys.forEach(function(eventKey) {
		var key = eventMap[eventKey];
		loggerObject.on(key, function(data) {
			if(ignoreErrorsList.indexOf(key) < 0) {
				debugLog('Captured Event!!', key, data);
			}
			var handeledEvent = false
			// print('Captured Event', key, data, Object.keys(data));
			if(key === 'NEW_VIEW_DATA') {
				if(data.view_type === 'current_values') {
					printNewData('New View Data', {
						data: data.data_cache
					});
					handeledEvent = true;
				} else if(data.view_type === 'basic_graph') {
					printNewData('New Graph Data', {
						numValsLogged: data.data_cache.length
					});
					handeledEvent = true;
				} else {
					console.error('un-handled... data.view_type', data.view_type)
				}
			} else {
				// console.log('un-handled... key', key)
			}
			if(!handeledEvent) {
				printNewData('Captured Event', key, data);
			}

		});
	});
}

function loggerApp() {
	this.simpleLogger;
	this.deviceManager;
	this.logConfigs;

	this.initializeLogger = function(){
		debugLog('--- In Func: initializeLogger');
		var defered = q.defer();
		self.simpleLogger = simple_logger.create();
		attachListeners(self.simpleLogger);

		self.simpleLogger.initialize()
		.then(function(res) {
			debugLog('--- App Initialized',res);
			defered.resolve();
		}, function(err) {
			console.error('Failed to initialize the logger',err);
			defered.resolve();
		});
		return defered.promise;
	};
	this.initializeDeviceManager = function() {
		debugLog('--- In Func: initializeDeviceManager');
		var defered = q.defer();
		self.deviceManager = device_manager.create();

		self.deviceManager.connectToDevices([{
			dt:'LJM_dtANY',
			ct:'LJM_ctANY',
			id:'LJM_idANY',
		}])
		.then(function(res) {
			debugLog('--- Connected to devices!',res);
			defered.resolve();
		}, function(err) {
			console.error('Failed to connect to devices',err);
			defered.resolve();
		});
		return defered.promise;
	}
	this.updateDeviceListing = function() {
		debugLog('--- In Func: updateDeviceListing');
		debugLog('Connected Devices', self.deviceManager.getDevices());
		var defered = q.defer();
		self.simpleLogger.updateDeviceListing(self.deviceManager.getDevices())
		.then(function(res) {
			debugLog('Device listing has been passwd to the logger',res);
			defered.resolve();
		}, function(err) {
			console.error('Failed to save the device listing to the logger',err)
			defered.resolve();
		});
		return defered.promise;
	}
	this.configureLogger = function() {
		debugLog('--- In Func: configureLogger');
		var defered = q.defer();

		/*
		Old config:
		{
			'configType': 'filePath',
			'filePath': logger_config_file_path
		}
		*/
		self.logConfigs = simple_logger.generateBasicConfig({
			'same_vals_all_devices': true,
			'registers': ['AIN0','AIN1'],
			'update_rate_ms': 100,
		},self.deviceManager.getDevices());

		var fs = require('fs');
		fs.writeFile(template_logger_config_file,JSON.stringify(self.logConfigs,null,2),function(err) {
			if(err) {
				console.error('Error saving generated configs');
			} else {
				debugLog('Data was appended to the config file.');
			}
			self.simpleLogger.configureLogger({
				'configType': 'filePath',
				'filePath': template_logger_config_file
			})
			// self.simpleLogger.configureLogger({
			// 	configType: 'object',
			// 	configData: self.logConfigs,
			// 	filePath: cwd
			// })
			.then(function(res) {
				debugLog('Logger has been configured.',res)
				defered.resolve();
			}, function(err) {
				console.error('Logger failed to be configured.',err)
				defered.resolve();
			});
		});

		


		
		return defered.promise;
	}
	this.startLogger = function() {
		debugLog('--- In Func: startLogger');
		var defered = q.defer();
		self.simpleLogger.once(eventMap.STOPPED_LOGGER, function(stopData) {
			debugLog('Logger Stopped');
			// console.log('(hello_world.js) Logger has stopped!!')
			defered.resolve();
		});
		self.simpleLogger.startLogger()
		.then(function succ() {
			
			debugLog('Logger Started');
		}, function err() {
			
			debugLog('Logger Started');
		});
		return defered.promise;
	}
	this.waitForLoggerToRun = function() {
		debugLog('--- In Func: waitForLoggerToRun');
		var defered = q.defer();
		defered.resolve();
		return defered.promise;
	}
	this.closeDevices = function() {
		var defered = q.defer();
		self.deviceManager.closeDevices()
		.then(defered.resolve, defered.reject);
		return defered.promise;
	}
	this.finish = function() {
		debugLog('--- In Func: finish');
		var defered = q.defer();
		// setTimeout(defered.resolve, 1000);
		defered.resolve();
		return defered.promise;
	}
	var self = this;
}
var app = new loggerApp();


var loggerAppSteps = [
	'initializeLogger',				// Performed at start-up
	'initializeDeviceManager',		// Performed at start-up
	'updateDeviceListing',			// Performed when configuring logger
	'configureLogger',				// Performed when configuring logger
	'startLogger',					// Performed when starting logger
	'waitForLoggerToRun',			// Allowing the logger to run...
	'closeDevices',					
	'finish',
];
loggerAppSteps.forEach(function(step) {
	if(typeof(app[step]) != 'function') {
		console.error('App Step', step, 'is not defined!');
		process.exit();
	}
})

var isTerminated = false;
async.eachSeries(
	loggerAppSteps,
	function(step, cb) {
		function onErr(err) {
			isTerminated = true;
			cb(err);
		}
		try {
			app[step]().then(cb, onErr);
		} catch(err) {
			console.error('Error executing app step', step, err);
		}
	},
	function(err) {
		// console.log('This was the error...', err);
	});
