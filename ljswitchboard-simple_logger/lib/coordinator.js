
var EventEmitter = require('events').EventEmitter;
var util = require('util');
var q = require('q');
var async = require('async');

// Code that collects data from devices.
var data_collector = require('./data_collector');
var dataCollectorEvents = data_collector.eventList;
var DATA_COLLECTOR_EVENTS_MAP = [
	// Data collector start & stop events.
	{'eventName': 'COLLECTOR_STARTED', 'funcName': 'onDataCollectorStarted'},
	{'eventName': 'COLLECTOR_STOPPED', 'funcName': 'onDataCollectorStopped'},

	// Data collector function that reports new data.
	{'eventName': 'COLLECTOR_GROUP_DATA', 'funcName': 'onDataCollectorGroupData'},

	// Data collector errors.
	{'eventName': 'REQUIRED_DEVICE_NOT_FOUND', 'funcName': 'onDataCollectorError'},
	{'eventName': 'COLLECTOR_WARNING', 'funcName': 'onDataCollectorError'},
	{'eventName': 'COLLECTOR_ERROR', 'funcName': 'onDataCollectorError'},
];

// Code that logs data to files.
var data_logger = require('./data_logger');
var dataLoggerEvents = data_logger.eventList;
var DATA_LOGGER_EVENTS_MAP = [
	// Data logger event indicating that logging has been enabled/disabled.
	{'eventName': 'DATA_LOGGER_STATE_UPDATE', 'funcName': 'onDataLoggerStateUpdate'},
];

// Code that collects & reports data to listeners.
var data_reporter = require('./data_reporter');
var dataLReporterEvents = data_reporter.eventList;
var DATA_REPORTER_EVENTS_MAP = [
	// Data reporter event indicating that the logger's "view" should be updated
	{'eventName': 'NEW_VIEW_DATA', 'funcName': 'onDataReporterViewData'},
];

var eventList = require('./events').events;

function print() {
	var dataToPrint = [];
	dataToPrint.push('(coordinator.js)');
	for(var i = 0; i < arguments.length; i++) {
		dataToPrint.push(arguments[i]);
	}
	console.log.apply(console, dataToPrint);
}

function CREATE_COORDINATOR () {
	this.state = {
		'initialized': false,
		'configured': false,
		'running': false,
	};

	this.stats = {
		// This object will get initialized with each data_group's name and a
		// value of zero when data collection starts.
		'num_collected': {},

		'start_time': undefined,
		'stop_time': undefined,
	};
	this.initializeStats = function() {
		// Initialize the num_collected variable.
		self.stats.num_collected = {};
		self.config.data_groups.forEach(function(data_group) {
			self.stats.num_collected[data_group] = 0;
		});

		// Initialize the starting time of the log.
		self.stats.start_time = new Date();
	};
	this.updateStats = function(data) {
		self.stats.num_collected[data.groupKey] += 1;
	};
	this.finalizeStats = function() {
		self.stats.stop_time = new Date();
	};

	this.shouldStop = function() {
		var relation = self.config.stop_trigger.relation;
		var triggers = self.config.stop_trigger.triggers;

		var shouldStop = false;
		if(relation === 'and') {
			shouldStop = true;
		}
		triggers.forEach(function(trigger){
			if(trigger.attr_type === 'num_logged') {
				var groupKey = trigger.data_group;
				var numRequired = trigger.val;
				var numCollected = self.stats.num_collected[groupKey];
				if(numCollected < numRequired) {
					shouldStop &= false;
				}
			}
		});

		if(shouldStop) {
			return true;
		} else {
			return false;
		}
	};

	this.config = undefined;
	this.devices = undefined;
	this.dataCollector = undefined;

	this.dataLogger = undefined;
	this.dataReporter = undefined;

	/* Define event handler functions that get linked to by the initializer. */
	// Events that get linked to the DataCollector
	this.onDataCollectorStarted = function(data) {
		print('in onDataCollectorStarted', data);
		self.emit(eventList.STARTED_LOGGER, data);
	};
	this.onDataCollectorStopped = function(data) {
		print('in onDataCollectorStopped', data);
		self.emit(eventList.STOPPED_LOGGER, data);
	};
	this.onDataCollectorGroupData = function(data) {
		print('in onDataCollectorGroupData', Object.keys(data));
		self.updateStats(data);

		// Send data to the dataLogger and dataReporter.
		self.dataLogger.onNewData(data);
		self.dataReporter.onNewData(data);

		// Determine if the logger should stop based on the config file's
		// "stop_trigger" attribute.
		if(self.config.stop_trigger) {
			if(self.shouldStop()) {

				// Instruct the logger to stop.
				self.stop().done();
			}
		}
	};
	this.onDataCollectorError = function(data) {
		print('in onDataCollectorError', data);
		self.emit(eventList.DATA_COLLECTOR_ERROR, data);
	};

	// Events that get linked to the dataReporter object.
	this.onDataReporterViewData = function(data) {
		print('in onDataReporterViewData', data);
	};

	function getAttachListener(emitter) {
		return function attachListener(map) {
			// Remove any listeners listening to the event.
			emitter.removeAllListeners(map.eventName);

			// Add event listeners if the function exists.
			if(typeof(self[map.funcName]) === 'function') {
				emitter.on(map.eventName, self[map.funcName]);
			} else {
				print('Undefined function...', map.funcName, map.eventName);
			}
		};
	}

	/*
	 * Initialization function that attaches various event listeners to events
	 * and initializes various things.
	*/
	var innerInitializeCoordinator = function(bundle) {
		var defered = q.defer();

		// Initialize the dataCollector object.
		self.dataCollector = data_collector.create();

		// Attach listeners to the dataCollector object.
		DATA_COLLECTOR_EVENTS_MAP.forEach(getAttachListener(self.dataCollector));

		// Initialize the dataLogger object.
		self.dataLogger = data_logger.create();

		// Attach listeners to the dataLogger object.
		DATA_COLLECTOR_EVENTS_MAP.forEach(getAttachListener(self.dataLogger));


		// Initialize the dataReporter object.
		self.dataReporter = data_reporter.create();

		// Attach listeners to the dataReporter object.
		DATA_COLLECTOR_EVENTS_MAP.forEach(getAttachListener(self.dataReporter));


		// Configure coordinator state to be initialized.
		self.state.initialized = true;

		defered.resolve(bundle);
		return defered.promise;
	};

	var innerUpdateDeviceListing = function(devices) {
		var defered = q.defer();
		self.devices = undefined;
		self.devices = devices;

		// Configure the dataCollector with the available device objects.
		self.dataCollector.updateDeviceObjects(devices)
		.then(defered.resolve, defered.reject)
		.catch(defered.reject)
		.done();
		return defered.promise;
	};

	var innerConfigureCoordinator = function(config) {
		var defered = q.defer();
		
		if(self.state.configured) {
			defered.resolve(config);
			return defered.promise;
		} else {
			self.config = config;
			function onSuccess(resBundle) {
				self.state.configured = true;
				self.emit(eventList.CONFIGURATION_SUCCESSFUL, resBundle);
				defered.resolve(resBundle);
			}
			function onError(errBundle) {
				self.state.configured = false;
				// Don't emit a CONFIGURATION_ERROR event.  The caller needs to
				// report the errors. 
				// self.emit(eventList.CONFIGURATION_ERROR, errBundle);
				defered.reject(errBundle);
			}

			// Configure dataCollector object
			self.dataCollector.configureDataCollector(config)
			.then(self.dataLogger.configure, onError)
			.then(self.dataReporter.configure, onError)
			.then(onSuccess, onError)
			.catch(onError)
			.done();
			return defered.promise;
		}
	};

	var innerUnconfigureCoordinator = function(bundle) {
		var defered = q.defer();

		if(!self.state.configured) {
			defered.resolve(bundle);
			return defered.promise;
		} else {
			self.config = undefined;
			self.state.configured = false;
			defered.resolve(bundle);
			return defered.promise;
		}
	};

	var innerStartCoordinator = function(bundle) {
		var defered = q.defer();

		if(self.state.running) {
			defered.resolve(bundle);
			return defered.promise;
		} else {
			function onSuccess(resBundle) {
				self.state.running = true;
				// self.emit(eventList.STARTED_LOGGER, resBundle);
				defered.resolve(resBundle);
			}
			function onError(errBundle) {
				self.state.running = false;
				self.emit(eventList.ERROR_STARTING_LOGGER, resBundle);
				defered.reject(resBundle);
			}

			// Initialize the log stats tracker object.
			self.initializeStats();

			// Start the dataLogger, dataReporter, and dataCollector.
			self.dataLogger.start(bundle)
			.then(self.dataReporter.start, onError)
			.then(self.dataCollector.startDataCollector, onError)
			.then(onSuccess, onError)
			.catch(onError)
			.done();
			return defered.promise;
		}
	};

	var innerStopCoordinator = function(bundle) {
		var defered = q.defer();
		if(!self.state.running) {
			defered.resolve(bundle);
			return defered.promise;
		} else {
			function onSuccess(resBundle) {
				self.state.running = false;
				// self.emit(eventList.STOPPED_LOGGER, resBundle);
				defered.resolve(resBundle);
			}
			function onError(errBundle) {
				self.state.running = false;
				self.emit(eventList.ERROR_STOPPING_LOGGER, errBundle);
				defered.reject(errBundle);
			}

			// Finalize the log stats tracker object
			self.finalizeStats();

			// Stop the dataCollector, dataLogger, and dataReporter.
			self.dataCollector.stopDataCollector(bundle)
			.then(self.dataLogger.stop, onError)
			.then(self.dataReporter.stop, onError)
			.then(onSuccess, onError)
			.catch(onError)
			.done();
			return defered.promise;
		}
	};


	/* Externally Accessable functions */
	this.initialize = function(bundle) {
		return innerInitializeCoordinator(bundle);
	};
	this.updateDeviceListing = function(bundle) {
		return innerUpdateDeviceListing(bundle);
	};
	this.configure = function(bundle) {
		return innerConfigureCoordinator(bundle);
	};
	this.unconfigure = function(bundle) {
		return innerUnconfigureCoordinator(bundle);
	};
	this.start = function(bundle) {
		return innerStartCoordinator(bundle);
	};
	this.stop = function(bundle) {
		return innerStopCoordinator(bundle);
	};

	var self = this;
}
util.inherits(CREATE_COORDINATOR, EventEmitter);

exports.create = function() {
	return new CREATE_COORDINATOR();
};
