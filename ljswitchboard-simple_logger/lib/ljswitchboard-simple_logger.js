
/* Native Requirements */
var EventEmitter = require('events').EventEmitter;
var util = require('util');

/* 3rd party requirements */
var q = require('q');
var async = require('async');

/* LJ requirements, not sure if these are used. */
// var ljm = require('labjack-nodejs');
// var driver_const = require('ljswitchboard-ljm_driver_constants');
// var driver = ljm.driver();
// var data_parser = require('ljswitchboard-data_parser');
// var curatedDevice = require('ljswitchboard-ljm_device_curator');
// var modbus_map = require('ljswitchboard-modbus_map');
// var constants = modbus_map.getConstants();


// Utilities to load and verify logger config files.
var config_loader = require('./config_loader');
var config_checker = require('./config_checker');

// Code that coordinates the data collection & reporting efforts.
var log_coordinator = require('./coordinator');

var ENABLE_DEBUG_LOG = true;
function debugLog() {
	if(ENABLE_DEBUG_LOG) {
		var dataToPrint = [];
		dataToPrint.push('(-simple_logger.js)');
		for(var i = 0; i < arguments.length; i++) {
			dataToPrint.push(arguments[i]);
		}
		console.log.apply(console, dataToPrint);
	}
}

var CONFIG_TYPES = {
	'FILE': 'filePath',
	'OBJECT': 'object',
};

var eventList = require('./events').events;

function rippleError(bundle) {
	var defered = q.defer();
	console.error('Ripple Error', bundle);
	defered.reject(bundle);
	return defered.promise;
}

function CREATE_SIMPLE_LOGGER () {
	this.devices = undefined;
	this.config = undefined;
	this.coordinator = undefined;

	var eventMap = [
		{from: 'CONFIGURATION_SUCCESSFUL', to: 'onConfigurationSuccessful'},
		{from: 'CONFIGURATION_ERROR', to: 'onConfigurationError'},
  
		{from:'STARTED_LOGGER', to: 'onStartedLogger'},
		{from: 'ERROR_STARTING_LOGGER', to: 'onErrorStartingLogger'},
  
		{from:'STOPPED_LOGGER', to: 'onStoppedLogger'},
		{from: 'ERROR_STOPPING_LOGGER', to: 'onErrorStoppingLogger'},
  
		{from:'NEW_VIEW_DATA', to: 'onNewViewData'},

		{from:'UPDATED_ACTIVE_FILES', to: 'onUpdatedActiveFiles'},
	];

	/*
	 * Use the eventMap to define functions for each event that needs to get 
	 * passed on.
	 */
	function createAndLinkEventListener(eventListing) {
		self[eventListing.to] = function(data) {
			self.emit(eventListing.from, data);
		};
		self.coordinator.on(eventListing.from, self[eventListing.to]);
	}

	function innerInitialize(bundle) {
		var defered = q.defer();

		self.coordinator = undefined;

		// Create a new coordinator instance.
		self.coordinator = log_coordinator.create();
		// console.error("self.coordinator", self.coordinator)
		// console.error("========== ", self.filePath, "================================")
		self.coordinator.setFileLocation(self.filepath)

		// Link to all of the events that it will emit.
		eventMap.forEach(createAndLinkEventListener);

		self.coordinator.initialize(bundle)
		.then(defered.resolve, defered.reject)
		.catch(defered.reject)
		.done();
		return defered.promise;
	}

	function innerUpdateDeviceListing(devices) {
		var defered = q.defer();

		self.devices = undefined;
		self.devices = devices;

		// Make sure that the coordinator is stopped before updating the
		// device listing.
		innerStopLogger(devices)

		// make sure that the coordinator is unconfigured.
		.then(self.coordinator.unconfigure)

		// After stopping & clearing the coordinators config. 
		//update its device listing.
		.then(self.coordinator.updateDeviceListing)
		.then(defered.resolve, defered.reject);
		return defered.promise;
	}

 

	function handleLoadConfigFileSuccess(configData) {
		var defered = q.defer();

		self.config = undefined;
		self.config = configData.data;

		defered.resolve(configData.data);
		return defered.promise;
	}
	function handleLoadConfigFileError(error) {
		var defered = q.defer();

		self.config = undefined;

		defered.reject(error);
		return defered.promise;
	}
	function loadConfigFile(filePath) {
		var defered = q.defer();
		
		config_checker.verifyConfigFile(filePath)
		.then(handleLoadConfigFileSuccess, handleLoadConfigFileError)
		.then(defered.resolve, defered.reject);
		return defered.promise;
	}
	function loadConfigObject(configData) {
		var defered = q.defer();
		self.config = undefined;
		self.config = configData;
		defered.resolve(configData);
		return defered.promise;
	}

	function verifyAndLoadConfiguration(loggerConfig) {
		var defered = q.defer();

		var configType = loggerConfig.configType;
		var filePath = loggerConfig.filePath;
		var configData = loggerConfig.configData;

		if(typeof(configData) !== 'undefined') {
			if(typeof(configData.config_file_path) === 'undefined') {
				configData.config_file_path = filePath;
			}
		}

		if(configType === CONFIG_TYPES.FILE) {
			loadConfigFile(filePath)
			.then(function succFunc(configData) {
				loggerConfig.configData = configData;
				loggerConfig.isValid = true;
				defered.resolve(loggerConfig);
			}, function errFunc(errorData) {
				// TODO: Figure out what the error data looks like.
				loggerConfig.isValid = false;
				loggerConfig.message = 'Invalid Config... there is error data...';
				loggerConfig.errorData = errorData;
				defered.reject(loggerConfig);
			});
		} else if( configType === CONFIG_TYPES.OBJECT) {
			// Verify config data.

			loadConfigObject(configData)
			.then(function succFunc(configData) {
				loggerConfig.configData = configData;
				loggerConfig.isValid = true;
				defered.resolve(loggerConfig);
			}, function errFunc(errorData) {
				// TODO: Figure out what the error data looks like.
				loggerConfig.isValid = false;
				loggerConfig.message = 'Invalid Config... there is error data...';
				loggerConfig.errorData = errorData;
				defered.reject(loggerConfig);
			});
			// loggerConfig.isValid = false;
			// loggerConfig.message = 'Need to validate config data...';
			// self.config = undefined;
			// self.config = undefined;
			// self.config = loggerConfig.configData;

			// defered.reject(loggerConfig);
		}
		return defered.promise;
	}

	function resolveToConfigData(loggerConfig) {
		var defered = q.defer();
		defered.resolve(loggerConfig.configData);
		return defered.promise;
	}
	function innerConfigureLogger(loggerConfig) {
		// console.warn("loggerConfig", loggerConfig)
		var defered = q.defer();
		var configData = {
			'configType': CONFIG_TYPES.OBJECT,
			'configData': {},
			'filePath': '',
			'isValid': false,
			'message': 'Invalid Logger Config',
			'errorData': {},
		};
		var configType = '';
		var isValidCall = false;

		debugLog('Checking to see if logger config data valid.');
		if(loggerConfig.configType) {
			configType = loggerConfig.configType;

			if(configType === CONFIG_TYPES.OBJECT) {
				configData.configData = loggerConfig.configData;
				isValidCall = true;
			} else if(configType === CONFIG_TYPES.FILE) {
				configData.filePath = loggerConfig.filePath;
				isValidCall = true;
			}

			configData.configType = configType;
		}

		function onSuccess(data) {
			// Let the coordinator fire the config-successful event.
			// self.onConfigurationSuccessful(data);
			debugLog('configured the logger!');
			defered.resolve(data);
		}
		function onError(data) {
			console.error('simple_logger.js config error', data);
			// Report the CONFIGURATION_ERROR event.
			self.onConfigurationError(data);
			// Force successful resolution of promise & errors to be handled via
			// event system.
			defered.reject(data);
		}
		debugLog('Is loggerConfig obj valid:', isValidCall);
		if(isValidCall) {
			verifyAndLoadConfiguration(loggerConfig)
			.then(resolveToConfigData, rippleError)
			.then(innerStopLogger, rippleError)
			.then(self.coordinator.unconfigure, rippleError)
			.then(self.coordinator.configure, rippleError)
			.then(onSuccess, onError)
			.catch(function(err) {
				console.error('Error in innerConfigureLogger.js:',err);
				onError(err);
			})
		} else {
			innerStopLogger(loggerConfig)
			.then(onError, onError);
		}
		return defered.promise;
	}
	function innerUnconfigureLogger(bundle) {
		return self.coordinator.unconfigure(bundle);
	}
	function innerStartLogger(startData) {
		var defered = q.defer();

		debugLog('Starting the logger, in "innerStartLogger"',startData);
		self.coordinator.start(startData)
		.then(defered.resolve, defered.reject)
		.catch(defered.reject)
		.done();
		return defered.promise;
	}
	function innerstopRunning(stopige){
		self.coordinator.stopRunning(stopige);
		return stopige;
	}
	function innerStopLogger(stopData) {
		var defered = q.defer();

		self.coordinator.stop(stopData)
		.then(defered.resolve, defered.reject)
		.catch(defered.reject)
		.done();
		return defered.promise;
	}

	/* Configuration File Loading & Checking functions */
	this.verifyConfigFile = function(filePath) {
		return config_checker.verifyConfigFile(filePath);
	};
	this.verifyConfigObject = function(dataObject) {
		return config_checker.verifyConfigObject(filePath);
	};

	/* Controls for the logger */
	this.initialize = function(bundle) {
		return innerInitialize(bundle);
	};
	this.updateDeviceListing = function(devices) {
		return innerUpdateDeviceListing(devices);
	};
	this.configureLogger = function(loggerConfig) {
		return innerConfigureLogger(loggerConfig);
	};
	this.unconfigureLogger = function(bundle) {
		return innerUnconfigureLogger(bundle);
	};
	this.startLogger = function(startData) {
		return innerStartLogger(startData);
	};
	this.stopLogger = function(stopData) {
		return innerStopLogger(stopData);
	};
	this.stopRunning = function(stopige){
		return innerstopRunning(stopige);
	};
	this.setFilePath = function(FilePath){
		this.filepath = FilePath;
	};



	var self = this;
}
util.inherits(CREATE_SIMPLE_LOGGER, EventEmitter);


exports.create = function() {
	return new CREATE_SIMPLE_LOGGER();
};

/* feature discovery & event constant handling */
exports.eventList = eventList;

/* Functions for configuration file loading & verification */
exports.verifyConfigFile = function(filePath) {
	return config_checker.verifyConfigFile(filePath);
};
exports.verifyConfigObject = function(dataObject) {
	return config_checker.verifyConfigObject(filePath);
};

exports.generateBasicConfig = function(basicData, devices) {
	var configObj = {
		"logging_config": {
			"name": "Basic Config Auto-Template",
			"file_prefix": "basic_config Auto-Template",
			"write_to_file": true,
			"default_result_view": "0",
			"default_result_file": "0"
		},
		"view_config": {
			"update_rate_ms": 200
		},
		"views": [
			"basic_view",
			"current_values_view"
		],
		"basic_view": {
			"name": "Basic Graph",
			"view_type": "basic_graph",
			"window_size": 5,
			"group": "basic_data_group"
		},
		"current_values_view": {
			"name": "Current Values",
			"view_type": "current_values",
			"group": "basic_data_group"
		},
		"data_groups": [
			"basic_data_group"
		],
		"basic_data_group": {
			"group_name": "Basic Data Group",
			// this should be the rate at wich the logger runs
			"group_period_ms": 10,
			"is_stream": false,
			// programaticaly define fill device_serial_numbers array and define device sn objects.
			"device_serial_numbers": [],
			"defined_user_values": [],
			// programatically fill the defined_user_values array and populate the user_values object.  For now, just make them the register names...
			"user_values": {},
			"logging_options": {
				"write_to_file": true,
				"file_prefix": "basic_group",
				"max_samples_per_file": 65335,
				"data_collector_config": {
					"REPORT_DEVICE_IS_ACTIVE_VALUES": true,
					"REPORT_DEFAULT_VALUES_WHEN_LATE": false
				}
			}
		},
		"stop_trigger": {
			"relation": "and",
			"triggers": [
			  {
				"attr_type": "num_logged",
				"data_group": "basic_data_group",
				"val": 0
				// for: "00:00:10",
			  }
			]
		  }
		// "stop_trigger": {
		// 	"relation": "and",
		// 	"triggers": [{
		// 		"attr_type": "num_logged", "data_group": "basic_data_group", "val": 8
		// 	}]
		// }
	};

	var validSN;
	// for the value of how long it runs it is as follows
	// configObj.stop_trigger.trigers[0].val
	if(basicData.same_vals_all_devices) {
		configObj.stop_trigger.triggers[0].val = basicData.logTime;
		// Zander this is for a prouf oc concepts
		// var sn = devices[0].savedAttributes.serialNumber;
		// var sn = "470010175";
		// var sn = "440017663"
		var sn = "470016039";
		validSN = sn;
		configObj.basic_data_group.device_serial_numbers.push(validSN);
		// configObj.basic_data_group.device_serial_numbers.push(sn);
		// console.warn("registers1", registers)
		configObj.basic_data_group[sn] = {
			'registers': []
		};
		basicData.registers.forEach(function(register) {
			configObj.basic_data_group[sn].registers.push({
				name: register,
				human_name: register,
				format:"default",
				enable_logging: true,
				enable_view: true,
			});
		});
		// devices.forEach(function(device) {
		// 	var sn = device.savedAttributes.serialNumber;
		// 	validSN = sn;
		// 	console.error("============", device)
		// 	// configObj.basic_data_group.device_serial_numbers.push(validSN);
		// 	configObj.basic_data_group.device_serial_numbers.push(sn);
		// 	configObj.basic_data_group[sn] = {
		// 		'registers': []
		// 	};
		// 	basicData.registers.forEach(function(register) {
		// 		configObj.basic_data_group[sn].registers.push({
		// 			name: register,
		// 			human_name: register,
		// 			format:"default",
		// 			enable_logging: true,
		// 			enable_view: true,
		// 		});
		// 	});
		// });
		// 'CORE_TIMER','AIN0','AIN1','AIN2','AIN3','AIN4'
		configObj.basic_data_group.defined_user_values.push('CORE_TIMER');
		configObj.basic_data_group.defined_user_values.push('AIN0');
		configObj.basic_data_group.defined_user_values.push('AIN1');
		configObj.basic_data_group.defined_user_values.push('AIN2');
		configObj.basic_data_group.defined_user_values.push('AIN3');
		configObj.basic_data_group.defined_user_values.push('AIN4');
		
		basicData.registers.forEach(function(register) {
			console.log("increment")
			// var valName = register;
			// var valName = 'custom-'+register;
			// console.warn("register", register)
			// console.log("valName", valName)
			
			
			configObj.basic_data_group.user_values[register] = {
				'name': register,
				'human_name': register,
				"exec_method": "sync",
				"func": "val = data['"+'470016039'+"'].results."+register+".result",
				"enable_logging": false,
				"enable_view": true
			}
		});
	}
	// console.warn("configObj", configObj)
	return configObj
	// 'same_vals_all_devices': true,
	// 'registers': ['AIN0','AIN1'],
	// 'update_rate_ms': 100,
};

exports.eventsMap = {
	
	/* Events regarding logger configurtation */
	'CONFIGURATION_SUCCESSFUL': 'CONFIGURATION_SUCCESSFUL',
	'CONFIGURATION_ERROR': 'CONFIGURATION_ERROR',

	/* Events regarding starting logger */
	'STARTED_LOGGER': 'STARTED_LOGGER',
	'ERROR_STARTING_LOGGER': 'ERROR_STARTING_LOGGER',

	/* Events regarding stopping logger */
	'STOPPED_LOGGER': 'STOPPED_LOGGER',
	'ERROR_STOPPING_LOGGER': 'ERROR_STOPPING_LOGGER',

	/* Events regarding data collection & reporting */
	'NEW_VIEW_DATA': 'NEW_VIEW_DATA',

	/* Events regarding the status of log-files */
	'UPDATED_ACTIVE_FILES': 'UPDATED_ACTIVE_FILES',

	/* Logging Errors */
	'DATA_COLLECTOR_ERROR': 'DATA_COLLECTOR_ERROR',
};
