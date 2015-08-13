
var EventEmitter = require('events').EventEmitter;
var util = require('util');
var q = require('q');

// Constants
var COLLECTOR_MODES = {
	COLLECTING: 'COLLECTING',
	IDLE: 'IDLE'
};

var DATA_COLLECTOR_EVENTS = {
	// Event indicating a new data collector configuration has been data collector
	COLLECTOR_CONFIGURED: 'COLLECTOR_CONFIGURED',
	
	// Events indicating the starting & stopping of the data collector
	COLLECTOR_STARTED: 'COLLECTOR_STARTED',
	COLLECTOR_STOPPED: 'COLLECTOR_STOPPED',

	/*
	 * Events indicating that new data is available:
	 * COLLECTOR_DATA: Reports data collected by the data collector
	 * SETUP_DATA: Reports data collected in setup-mode
	 */
	COLLECTOR_DATA: 'COLLECTOR_DATA',
	SETUP_DATA: 'SETUP_DATA',
};



function CREATE_DATA_COLLECTOR() {
	this.devices = undefined;
	this.config = undefined;

	this.eventList = DATA_COLLECTOR_EVENTS;

	this.status = {
		'mode': COLLECTOR_MODES.IDLE
	};

	// This array contains

	// Object that stores device_data_collector objects that can be indexed
	// by their serial numbers.
	this.deviceDataCollectors = {};

	this.updateDeviceObjects = function(devices) {
		var defered = q.defer();

		// Remove old reference
		self.devices = undefined;

		// Set new reference
		self.devices = devices;

		defered.resolve(devices);
		return defered.promise;
	};
	
	var getRequiredDevices = function() {
		var device_serial_numbers = [];

		var data_group_keys = self.config.data_groups;
		data_group_keys.forEach(function(data_group_key) {
			var data_group = self.config[data_group_key];

			var device_serial_number_strs = data_group.device_serial_numbers;
			device_serial_number_strs.forEach(function(device_serial_number_str){
				if(device_serial_numbers.indexOf(device_serial_number_str) < 0) {
					var num = parseInt(device_serial_number_str);
					device_serial_numbers.push(num);
				}
			});
		});

		console.log('Required Device Serial Numbers', device_serial_numbers);
	};
	var saveLoggerConfigReference = function(config) {
		var defered = q.defer();

		// Remove old reference
		self.config = undefined;

		// Set new reference
		self.config = JSON.parse(JSON.stringify(config));


		// Start parsing the config file

		// Determine what devices are required
		getRequiredDevices();


		defered.resolve(config);
		return defered.promise;
	};
	this.configureLogger = function(config) {
		return stopLoggingSession(config)
		.then(saveLoggerConfigReference);
	};

	var stopLoggingSession = function(bundle) {
		var defered = q.defer();

		defered.resolve(bundle);
		return defered.promise;
	};

	var self = this;
}

var data_collector = new CREATE_DATA_COLLECTOR();

exports.updateDeviceObjects = data_collector.updateDeviceObjects;
exports.configureLogger = data_collector.configureLogger;