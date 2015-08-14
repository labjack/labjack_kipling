

var EventEmitter = require('events').EventEmitter;
var util = require('util');
var q = require('q');
var async = require('async');
var ljm = require('labjack-nodejs');
var driver_const = require('ljswitchboard-ljm_driver_constants');
var driver = ljm.driver();
var data_parser = require('ljswitchboard-data_parser');
var curatedDevice = require('ljswitchboard-ljm_device_curator');
var modbus_map = require('ljswitchboard-modbus_map');
var constants = modbus_map.getConstants();


// Utilities to load and verify logger config files.
var config_loader = require('./config_loader');
var config_checker = require('./config_checker');

// Code that collects data from devices.
var data_collector = require('./data_collector');

// Code that logs data to files.
var data_logger = require('./data_logger');

// Code that collects & reports data to listeners.
var data_reporter = require('./data_reporter');



function CREATE_SIMPLE_LOGGER () {
	this.devices = undefined;
	this.config = undefined;

	this.eventList = {

	};

	this.initialize = function(devices) {
		self.devices = undefined;
		self.devices = devices;

		return data_collector.updateDeviceObjects(devices);
	};

	/* Configuration File Loading & Checking functions */
	this.verifyConfigFile = function(filePath) {
		return config_checker.verifyConfigFile(filePath);
	};
	this.verifyConfigObject = function(dataObject) {
		return config_checker.verifyConfigObject(filePath);
	};

	var handleLoadConfigFileSuccess = function(configData) {
		self.config = undefined;
		self.config = configData.data;

		return data_collector.configureLogger(configData.data);
	};
	var handleLoadConfigFileError = function(error) {
		var defered = q.defer();

		defered.reject(error);
		return defered.promise;
	};
	this.loadConfigFile = function(filePath) {
		var defered = q.defer();
		
		config_checker.verifyConfigFile(filePath)
		.then(handleLoadConfigFileSuccess, handleLoadConfigFileError)
		.then(defered.resolve, defered.reject);
		return defered.promise;
	};




	var self = this;
}
util.inherits(CREATE_SIMPLE_LOGGER, EventEmitter);


var simple_logger = new CREATE_SIMPLE_LOGGER();

/* feature discovery & event constant handling */
exports.eventList = simple_logger.eventList;

/* Initialization functions */
exports.initialize = simple_logger.initialize;

/* Functions for configuration file loading & verification */
exports.verifyConfigFile = simple_logger.verifyConfigFile;
exports.verifyConfigObject = simple_logger.verifyConfigObject;
exports.loadConfigFile = simple_logger.loadConfigFile;



