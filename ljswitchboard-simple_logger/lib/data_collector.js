
var EventEmitter = require('events').EventEmitter;
var util = require('util');
var q = require('q');
var async = require('async');
var gcd = require('compute-gcd');
var vm = require('vm');

// Constants
var COLLECTOR_MODES = {
	COLLECTING: 'COLLECTING',
	IDLE: 'IDLE'
};

var errorCodes = require('./error_codes').errorCodes;

var DATA_COLLECTOR_EVENTS = {
	// Event indicating that the device listing was updated.
	DEVICE_LISTING_CHANGED: 'DEVICE_LISTING_CHANGED',

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
	COLLECTOR_GROUP_DATA: 'COLLECTOR_GROUP_DATA',
	SETUP_DATA: 'SETUP_DATA',

	/*
	Events indicating when data collection is starting.
	*/
	COLLECTING_DEVICE_DATA: 'COLLECTING_DEVICE_DATA',
	COLLECTING_GROUP_DATA: 'COLLECTING_GROUP_DATA',
	REPORTING_COLLECTED_DATA: 'REPORTING_COLLECTED_DATA',

	/*
	Events indicating when the data collector is executing user defined functions.
	*/
	EXECUTING_USER_FUNCTIONS: 'EXECUTING_USER_FUNCTIONS',
	EXECUTING_USER_FUNCTION: 'EXECUTING_USER_FUNCTION',

	/*
	Event indicating that not all required devices were found.  Is fired once
	per device not found.
	*/
	REQUIRED_DEVICE_NOT_FOUND: 'REQUIRED_DEVICE_NOT_FOUND',

	COLLECTOR_WARNING: 'COLLECTOR_WARNING',

	COLLECTOR_ERROR: 'COLLECTOR_ERROR',
};

var data_group_manager = require('./data_group_manager');
var device_data_collector = require('./device_data_collector');

var ENABLE_DEBUG_LOG = false;
function debugLog() {
	if(ENABLE_DEBUG_LOG) {
		var dataToPrint = [];
		dataToPrint.push('(data_collector.js)');
		for(var i = 0; i < arguments.length; i++) {
			dataToPrint.push(arguments[i]);
		}
		console.log.apply(console, dataToPrint);
	}
}

function CREATE_DATA_COLLECTOR() {
	this.devices = undefined;
	this.config = undefined;

	this.eventList = DATA_COLLECTOR_EVENTS;

	this.status = {
		'mode': COLLECTOR_MODES.IDLE
	};

	this.isActive = false;

	// Variables that are used for the data collection timer
	this.daqTimer = undefined;

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

		// Report that the devices listing has changed.
		self.emit(self.eventList.DEVICE_LISTING_CHANGED, {
			'numDevices': self.devices.length,
		});

		defered.resolve(devices);
		return defered.promise;
	};
	
	this.requiredDeviceSerialNumbers = [];

	var saveRequiredDeviceSerialNumbers = function() {
		self.requiredDeviceSerialNumbers = undefined;
		self.requiredDeviceSerialNumbers = [];

		var data_group_keys = self.config.data_groups;
		data_group_keys.forEach(function(data_group_key) {
			var data_group = self.config[data_group_key];

			var device_serial_number_strs = data_group.device_serial_numbers;
			device_serial_number_strs.forEach(function(device_serial_number_str){
				if(self.requiredDeviceSerialNumbers.indexOf(device_serial_number_str) < 0) {
					
					self.requiredDeviceSerialNumbers.push(device_serial_number_str);
				}
			});
		});
	};

	function createUserValueFunction(execMethod, funcText, errors) {
		var sandbox = {
			val: 0,
			console: console,
		};
		var context = new vm.createContext(sandbox);
		var script;
		try {
			script = new vm.Script(funcText, {filename: 'format_func.vm'});
		} catch(err) {
			console.log('Tried to create a bad script', err);
			errors.push(err);
			script = new vm.Script('', {filename: 'format_func.vm'});
		}

		function executeUserFunc(groupData) {
			var defered = q.defer();
			 try {
				sandbox.data = groupData;
				if(execMethod === 'sync') {
					// Enforce formatting scripts to finish in less than 50ms.
					script.runInContext(context, {timeout: 50});
					defered.resolve(sandbox.val);
				} else if(execMethod === 'async') {
					sandbox.cb = function(val) {
						defered.resolve(val);
					};
					// Enforce formatting scripts to finish in less than 50ms.
					script.runInContext(context, {timeout: 5000});

				} else if(execMethod === 'q') {
					sandbox.defered = defered;

					script.runInContext(context, {timeout: 5000});
				} else {
					defered.reject(0);
				}
			} catch(err) {
				defered.reject(err);
			}

			return defered.promise;
		}

		return executeUserFunc;
	}

	function initializeUserFunctions() {
		var errors = [];
		var data_group_keys = self.config.data_groups;
		data_group_keys.forEach(function(data_group_key) {
			var data_group = self.config[data_group_key];

			// For each serial number, check each required register for any 
			// formatting functions that need to be created.
			// var serial_numbers = data_group.device_serial_numbers;
			// serial_numbers.forEach(function(serial_number) {
			// 	var registers = data_group[serial_number].registers;
			// 	registers.forEach(function(reg) {
			// 		if(reg.format_func) {
			// 			reg.formatFunc = createFormattingFunction(reg.format_func, errors);

			// 			// Example to execute format function
			// 			// var newVal = reg.formatFunc(12);
			// 		}
			// 	});
			// });

			// For each custom register check to see if there are any functions
			// that need to be created.
			if(data_group.defined_user_values) {
				var user_value_keys = data_group.defined_user_values;
				user_value_keys.forEach(function(user_value_key) {
					var userValue = data_group.user_values[user_value_key];
					var execMethod = userValue.exec_method;
					var func = userValue.func;
					userValue.userFunc = createUserValueFunction(execMethod, func, errors);
				});
			}
		});
		return errors;
	}
	var saveLoggerConfigReference = function(config) {
		var defered = q.defer();

		// Remove old reference
		self.config = undefined;

		// Set new reference
		self.config = JSON.parse(JSON.stringify(config));


		// Start parsing the config file

		// Determine what devices are required
		saveRequiredDeviceSerialNumbers();
		// self.requiredDeviceSerialNumbers;

		// Create user functions.
		var initErrors = initializeUserFunctions();
		if(initErrors.length > 0) {
			console.log('There were errors initializing user functions!');
		}

		// create the dataGroups array by getting the data group keys from the
		// config's "data_group" variable.
		self.config.dataGroups = [];

		self.config.data_groups.forEach(function(key) {
			self.config[key].groupKey = key;
			self.config.dataGroups.push(self.config[key]);
		});
		

		defered.resolve(config);
		return defered.promise;
	};

	var calculateTimerData = function(bundle) {
		var defered = q.defer();

		// Get a list of all required periods.
		var periods = [];
		self.config.dataGroups.forEach(function(dataGroup) {
			periods.push(dataGroup.group_period_ms);
		});

		// Calculate GCD
		if(periods.length > 1) {
			// If there are multiple periods calculate their greatest common
			// denominator.
			self.config.core_period = gcd(periods);
		} else {
			// If there is only one period than use that period.
			self.config.core_period = periods[0];
		}

		// Calculate group_delay values for each data group to determine how
		// frequently each data-group will report what registers need to be
		// collected from.
		self.config.dataGroups.forEach(function(dataGroup) {
			dataGroup.group_delay = (dataGroup.group_period_ms / self.config.core_period) - 1;
		});

		defered.resolve(bundle);
		return defered.promise;
	};

	this.dataGroupManagers = [];
	var createDataGroupManagers = function(bundle) {
		var defered = q.defer();

		// Un-reference the old dataGroupManagers
		self.dataGroupManagers = undefined;
		self.dataGroupManagers = [];

		// Create one data_group_manager for each defined data_group.
		self.config.dataGroups.forEach(function(dataGroup) {
			self.dataGroupManagers.push(data_group_manager.create(dataGroup));
		});

		defered.resolve(bundle);
		return defered.promise;
	};

	this.deviceDataCollectors = {};
	var createDeviceDataCollectors = function(bundle) {
		var defered = q.defer();

		// Un-reference the old deviceDataCollectors
		self.deviceDataCollectors = undefined;
		self.deviceDataCollectors = {};

		// Create one device_data_collector object for each required device.
		self.requiredDeviceSerialNumbers.forEach(function(sn) {
			var newCollector = device_data_collector.createDeviceDataCollector();
			self.deviceDataCollectors[sn] = newCollector;
		});

		defered.resolve(bundle);
		return defered.promise;
	};

	var updateDeviceDataCollectorDeviceListings = function(bundle) {
		var defered = q.defer();

		var keys = Object.keys(self.deviceDataCollectors);
		var promises = keys.map(function(key) {
			var dc = self.deviceDataCollectors[key];
			return dc.updateDeviceListing(self.devices);
		});

		q.allSettled(promises)
		.then(function() {
			defered.resolve(bundle);
		})
		.catch(function(err) {
			console.error('Error updating device data collector device listings');
			defered.reject(bundle);
		})
		.done();
		return defered.promise;
	};

	var linkDeviceDataCollectorsToDevices = function(bundle) {
		var defered = q.defer();

		var serialNumbers = Object.keys(self.deviceDataCollectors);
		var promises = serialNumbers.map(function(serialNumber) {
			var dc = self.deviceDataCollectors[serialNumber];
			return dc.linkToDevice(serialNumber);
		});

		q.allSettled(promises)
		.then(function() {
			var eventName = DATA_COLLECTOR_EVENTS.COLLECTOR_WARNING;
			var keys = Object.keys(self.deviceDataCollectors);
			keys.forEach(function(key) {
				var deviceDataCollector = self.deviceDataCollectors[key];
				var isFound = deviceDataCollector.isValidDevice;
				if(!isFound) {
					self.emit(eventName, {
						'message': 'Required device is not found',
						'deviceSerialNumber': deviceDataCollector.deviceSerialNumber,
						'isFound': isFound,
					});
				}
			});
			defered.resolve(bundle);
		})
		.catch(function(err) {
			console.error('Error updating device data collector device listings', err);
			defered.reject(bundle);
		})
		.done();

		return defered.promise;
	};

	var attachDeviceDataCollectorListeners = function(bundle) {
		var defered = q.defer();

		var keys = Object.keys(self.deviceDataCollectors);
		keys.forEach(function(key) {
			// Attach to the new data event of each of the deviceDataCollectors.
			var newDataEvent = device_data_collector.EVENT_LIST.DATA;
			var deviceDataCollector = self.deviceDataCollectors[key];
			deviceDataCollector.on(
				newDataEvent,
				self.deviceDataCollectorDataListener
			);
		});

		defered.resolve(bundle);
		return defered.promise;
	};

	

	var finishDataCollectorConfig = function(bundle) {
		var defered = q.defer();

		// Report that the data collector has been configured.
		self.emit(self.eventList.COLLECTOR_CONFIGURED, {
			'requiredDeviceSerialNumbers': self.requiredDeviceSerialNumbers,
		});

		defered.resolve(bundle);
		return defered.promise;
	};
	this.configureDataCollector = function(config) {
		return innerStopLoggingSession(config)
		.then(saveLoggerConfigReference)
		.then(calculateTimerData)
		.then(createDataGroupManagers)
		.then(createDeviceDataCollectors)
		.then(updateDeviceDataCollectorDeviceListings)
		.then(linkDeviceDataCollectorsToDevices)
		.then(attachDeviceDataCollectorListeners)
		.then(finishDataCollectorConfig);
	};

	this.startDataCollector = function() {
		return innerStartDataCollector();
	};

	this.activeDataStore = {};
	this.deviceDataCollectorDataListener = function(data) {
		if(self.isActive) {
			var deviceData = data.results;
			debugLog('Acquired Data from deviceDataCollector', data.serialNumber, deviceData.registers);
			var sn = data.serialNumber.toString();
			if(self.activeDataStore[sn]) {
			} else {
				self.activeDataStore[sn] = {};
			}
			deviceData.results.forEach(function(result, i) {
				var register = deviceData.registers[i];
				self.activeDataStore[sn][register] = {
					'register': register,
					'result': result,
					'errorCode': deviceData.errorCode,
					'time': deviceData.time,
					'duration': deviceData.duration,
					'interval': deviceData.interval,
					'index': deviceData.index,
				};
			});
		} else {
			debugLog('Acquired late data', data.serialNumber, data.results.registers);
		}
	};

	this.clearDataStoreValue = function(sn, register) {
		self.activeDataStore[sn][register] = {
			'register': register,
			'result': -9999,
			'errorCode': errorCodes.errorCodes,
			'time': new Date(),
			'duration': 0,
			'interval': 0,
			'index': 0,
		};
	};

	this.reportCollectedData = function(dataCollectionObj) {
		var defered = q.defer();

		var requiredData = dataCollectionObj.requiredData;
		var activeGroups = dataCollectionObj.activeGroups;
		var serialNumbers = dataCollectionObj.serialNumbers;

		// Organize what data needs to be given to each dataGroup.
		var organizedData = dataCollectionObj.organizedData;
		
		// console.log('Started New Reads...');
		
		/*
		Save a copy of the data that was acquired to make room for new
		data.  This must be done after the each deviceDataCollector is
		instructed to read new data so that it has a chance to report error
		data.
		*/
		var oldData = JSON.parse(JSON.stringify(self.activeDataStore));

		// Clear the activeDataStore
		serialNumbers.forEach(function(serialNumber) {
			requiredData[serialNumber].forEach(function(register) {
				self.clearDataStoreValue(serialNumber, register);
			});
		});


		var activeGroupKeys = Object.keys(activeGroups);
		self.emit(self.eventList.REPORTING_COLLECTED_DATA, {
			'data': activeGroupKeys
		});

		async.eachSeries(
			activeGroupKeys,
			function(activeGroupKey, callback) {
				var organizedGroupData = {};

				var activeGroup = activeGroups[activeGroupKey];
				var serialNumbers = Object.keys(activeGroup);
				serialNumbers.forEach(function(serialNumber) {
					var organizedDeviceData = {};

					// Get the devices data
					var newDeviceData = oldData[serialNumber];

					// Save timing data & error code.
					organizedDeviceData.errorCode = newDeviceData.errorCode;
					organizedDeviceData.time = newDeviceData.time;
					organizedDeviceData.duration = newDeviceData.duration;
					organizedDeviceData.interval = newDeviceData.interval;

					var index = -1;
					// Make room for acquired device data
					organizedDeviceData.results = {};

					var reqDeviceData = activeGroup[serialNumber];

					var deviceDataIDs = Object.keys(reqDeviceData);
					deviceDataIDs.forEach(function(deviceDataID) {
						var reqReg = reqDeviceData[deviceDataID];
						var regName = reqReg.name;
						var regValue;
						var formattedValue;

						// Get the required data point & save it to the regValue
						// variable.
						regValue = newDeviceData[regName];

						// Save the initial index value.
						var saveDeviceData = false;
						if(index < 0) {
							saveDeviceData = true;
						}
						if(regValue.index < index) {
							saveDeviceData = true;
						}

						if(saveDeviceData) {
							index = regValue.index;
							organizedDeviceData.errorCode = regValue.errorCode;
							organizedDeviceData.time = regValue.time;
							organizedDeviceData.duration = regValue.duration;
							organizedDeviceData.interval = regValue.interval;
						}

						// console.log('Req Data', activeGroupKey, serialNumber, regName, regValue);

						// Apply formatting to acquired data
						formattedValue = regValue;
						if(reqReg.formatFunc) {
							formattedValue.result = reqReg.formatFunc(regValue.result);
						}

						// Organize the collected data.
						organizedDeviceData.results[regName] = formattedValue;
					});
					organizedGroupData[serialNumber] = organizedDeviceData;
				});
				// console.log('Collected Group Data', organizedGroupData);

				var promises = [];
				var activeGroupObj = self.config[activeGroupKey];
				if(activeGroupObj.defined_user_values) {
					
					// Report that we are executing user functions.
					self.emit(self.eventList.EXECUTING_USER_FUNCTIONS, {
						'groupKey': activeGroupKey,
						'useFunctions': activeGroupObj.defined_user_values
					});
	
					// Execute user functions
					// Make room in the organizedGroupData object for user values.
					organizedGroupData.userValues = {};
					
					var user_value_keys = activeGroupObj.defined_user_values;
					var userValueKeys = [];
					
					user_value_keys.forEach(function(user_value_key) {
						var userValue = activeGroupObj.user_values[user_value_key];
						
						// Report that we are executing the user funciton.
						self.emit(self.eventList.EXECUTING_USER_FUNCTION, {
							'functionName': userValue.name
						});
						userValueKeys.push(user_value_key);
						promises.push(userValue.userFunc(organizedGroupData));
					});
				}

				q.allSettled(promises)
				.then(function(results) {
					if(results) {
						// Save the returned results into the organizedGroupData object.
						// If there was an error use the default value of zero.
						results.forEach(function(result, i) {
							var valueKey = userValueKeys[i];
							if(result.state === 'fulfilled') {
								organizedGroupData.userValues[valueKey] = result.value;
							} else {
								var defaultVal = 0;
								var userValue = activeGroupObj.user_values[valueKey];
								if(userValue.default_value) {
									defaultVal = userValue.default_value;
								}
								organizedGroupData.userValues[valueKey] = defaultVal;
							}
						});
					}

					// Report the collected group data
					self.emit(self.eventList.COLLECTOR_GROUP_DATA, {
						'groupKey': activeGroupKey,
						'data': organizedGroupData
					});

					// Save organized group data to the organizedData object.
					organizedData[activeGroupKey] = organizedGroupData;

					callback();
				});
			}, function(err) {
				// Report the collected data
				self.emit(self.eventList.COLLECTOR_DATA, organizedData);
				defered.resolve(dataCollectionObj);
			});
	};
	this.dataCollectionCounter = 0;
	var innerPerformDataCollection = function() {
		var requiredData = {};
		var activeGroups = {};
		var organizedData = {};

		self.dataGroupManagers.forEach(function(manager) {
			var reqData = manager.getRequiredData();
			if(reqData) {
				var registers = reqData.registers;
				var serialNumbers = Object.keys(registers);
				serialNumbers.forEach(function(sn) {
					if(requiredData[sn]) {
						registers[sn].forEach(function(reqReg) {
							if(requiredData[sn].indexOf(reqReg) < 0) {
								requiredData[sn].push(reqReg);
							}
						});
					} else {
						requiredData[sn] = registers[sn];
					}
				});

				// Save the active-group data
				var registerData = reqData.registerData;
				var groupKey = manager.options.groupKey;
				activeGroups[groupKey] = registerData;
			}
		});

		// Report what data groups are active.
		self.emit(self.eventList.COLLECTING_GROUP_DATA, {
			'data': Object.keys(activeGroups),
		});

		// Report what data is being collected from each device
		self.emit(self.eventList.COLLECTING_DEVICE_DATA, {
			'data': requiredData,
			'count': self.dataCollectionCounter,
		});

		var serialNumbers = Object.keys(requiredData);
		var promises = serialNumbers.map(function(serialNumber) {
			var deviceDataCollector = self.deviceDataCollectors[serialNumber];
			var dataToRead = requiredData[serialNumber];

			return deviceDataCollector.startNewRead(
				dataToRead,
				self.dataCollectionCounter
			);
		});

		var dataCollectionObj = {
			'requiredData': requiredData,
			'activeGroups': activeGroups,
			'organizedData': organizedData,
			'serialNumbers': serialNumbers,
		};


		q.allSettled(promises)
		.then(function() {
			if(self.isFirstDataCollectionIteration) {
				self.isFirstDataCollectionIteration = false;
			} else {
				try {
					self.reportCollectedData(dataCollectionObj);
				} catch(err) {
					console.log('Error reporting collected data', err, err.stack);
				}
			}

			// Increment the counter
			self.dataCollectionCounter += 1;
		});
	};

	this.performDataCollection = function() {
		try {
			innerPerformDataCollection();
		} catch(err) {
			console.log('Error performing data collection', err);
			self.emit(self.eventList.COLLECTOR_ERROR, {
				'message': 'Error performing data collection',
				'error': err,
			});
		}
	};

	var clearDataCollectionVariables = function() {
		// Re-set the increment counter
		self.dataCollectionCounter = 0;

		self.activeDataStore = undefined;
		self.activeDataStore = {};

		self.dataCollectionCounter = 0;
	};
	this.isFirstDataCollectionIteration = false;
	var innerStartDataCollector = function(bundle) {
		var defered = q.defer();

		// Clear data-collection variables.
		clearDataCollectionVariables();

		debugLog('Starting Data Collector', self.config.core_period);
		self.isActive = true;
		self.isFirstDataCollectionIteration = true;
		self.daqTimer = setInterval(
			self.performDataCollection,
			self.config.core_period
		);

		// Report that the data collector has been started.
		self.emit(self.eventList.COLLECTOR_STARTED, {});

		defered.resolve(bundle);
		return defered.promise;
	};
	this.stopDataCollector = function(bundle) {
		return innerStopLoggingSession(bundle);
	};
	var innerStopLoggingSession = function(bundle) {
		var defered = q.defer();

		self.isActive = false;
		clearInterval(self.daqTimer);
		self.daqTimer = undefined;

		// Report that the data collector has been started.
		self.emit(self.eventList.COLLECTOR_STOPPED, {});

		defered.resolve(bundle);
		return defered.promise;
	};

	var self = this;
}

// The data collector is an event-emitter.
util.inherits(CREATE_DATA_COLLECTOR, EventEmitter);

exports.create = function() {
	return new CREATE_DATA_COLLECTOR();
};
var data_collector = new CREATE_DATA_COLLECTOR();

/* Expose event functions */
// var dataCollectorFunctionList = [
// 	// Standard functions
// 	'updateDeviceObjects',
// 	'configureDataCollector',
// 	'startDataCollector',
// 	'stopDataCollector',

// 	// Event functions
// 	'addListener',
// 	'on',
// 	'once',
// 	'removeListener',
// 	'removeAllListeners',
// 	'setMaxListeners',
// 	'setMaxListeners',
// 	'emit',
// ];

// dataCollectorFunctionList.forEach(function(dataCollectorFunction) {
// 	exports[dataCollectorFunction] = function() {
// 		return data_collector[dataCollectorFunction].apply(
// 			data_collector,
// 			arguments
// 		);
// 	};
// });

// exports.updateDeviceObjects = data_collector.updateDeviceObjects;
// exports.configureDataCollector = data_collector.configureDataCollector;
// exports.startDataCollector = data_collector.startDataCollector;
// exports.stopDataCollector = data_collector.stopDataCollector;

// exports.addListener = data_collector.addListener;
// exports.on = function(eventName, listener) {
// 	data_collector.on(eventName, listener);
// };
// exports.once = data_collector.once;
// exports.removeListener = data_collector.removeListener;
// exports.removeAllListeners = data_collector.removeAllListeners;
// exports.setMaxListeners = data_collector.setMaxListeners;
// exports.setMaxListeners = data_collector.setMaxListeners;
// exports.emit = data_collector.emit;

exports.eventList = DATA_COLLECTOR_EVENTS;
