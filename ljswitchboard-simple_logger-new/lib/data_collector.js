var EventEmitter = require('events').EventEmitter;
var util = require('util');
var q = require('q');
var async = require('async');
var gcd = require('compute-gcd');
var vm = require('vm');
// var user_code_executor = require('./user_code_executor'); // We do not want to execute user code on registers FOR NOW
var errorCodes = require('./error_codes').errorCodes;

// Constants
var COLLECTOR_MODES = {
    COLLECTING: 'COLLECTING',
    IDLE: 'IDLE'
};

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
    Zander - do we need this a a declaration or is this used somewhere else
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
        for(var i = 0; i < arguments.length; i++){
            dataToPrint.push(arguments[i]);
        }
        console.log.apply(console, dataToPrint);
    }
}

var ENABLE_INITIALIZATION_STEP_DEBUGGING = false;
function stepDebug() {
    if(ENABLE_INITIALIZATION_STEP_DEBUGGING) {
        var dataToPrint = [];
        dataToPrint.push('(data_collector.js)');
        for(var i = 0; i < arguments.length; i++){
            dataToPrint.push(arguments[i]);
        }
        console.log.apply(console, dataToPrint);
    }
}

var DEBUG_DATA_ACQUISITION = false;
function debugDataAcquisition() {
    if(DEBUG_DATA_ACQUISITION) {
        var dataToPrint = [];
        dataToPrint.push('(data_collector.js)');
        for(var i = 0; i < arguments.length; i++){
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
        'mode': COLLECTOR_MODES.IDLE,
    };
    this.isActive = false;

    // Variables that are used for the data collection timer.
    this.daqTimer = undefined;

    // Object that stores device_data_collector objects that be indexed by their serial number.
    this.deviceDataCollector = [];

    // Zander - do we need this function it is just checking to make sure the is no updates with the device
    this.updateDeviceObjects = function(devices) {
        var defered = q.defer();

        // Remove old reference
        this.devices = undefined;

        // Set new Reference
        this.devices = devices;

        // Report that the devices listing has changed.
        this.emit(this.eventList.DEVICE_LISTING_CHANGED, {
            'numDevices': this.devices.length,
        });
        
        defered.resolve(devices);
        return defered.promise;
    };

    // Zander - why are we declaring this here when we declare it ad undefined and then as an empty array
    this.requireDeviceSerialNumbers = [];

    var saveRequiredDeviceSerialNumbers = function() {
        this.requiredDeviceSerialNumbers = undefined;
        this.requiredDeviceSerialNumbers = [];

        var data_group_keys = this.config.data_groups;
        data_group_keys.forEach(function(data_group_key){
            var data_group = this.config[data_group_key];

            var device_serial_number_strs = data_group.device_serial_numbers;
            device_serial_number_strs.forEach(function(device_serial_number_str){
                if(this.requiredDeviceSerialNumbers.indexOf(device_serial_number_str) < 0){
                    this.requiredDeviceSerialNumbers.push(device_serial_number_str);
                }
            });
        });
    };
    // Jimmy - We don't need this here, not creating user functions
    function createUserValueFunction(execMethod, funcText, errors) {
        var sandbox = {
            val: 0,
        };
        var timeoutMs = 5000;
        if(execMethod === 'sync'){
            timeoutMs = 50;
        }
        stepDebug('in createUserValueFunction', this.config);
        var executor = new user_code_executor.create(
            this.config.config_file_path,
            funcText,
            sandbox,
            {timeout: timeoutMs},
        );

        function executeUserFunc(groupData) {
            var defered = q.defer();
            function onSuccess(val) {
                defered.resolve(val);
            }
            function onError(val){
                defered.reject(val);
            }
            try {
                executor.sandbox.data = groupData;
                if(execMethod === 'sync') {
                    // Enforce formatting scripts to finish in less than 50ms.
					// script.runInContext(context, {timeout: 50});
                    executor.run();
                    defered.resolve(sandbox.val);
                } else if(execMethod === 'async') {
                    // Enforce formatting scripts to finish in less than 50ms.
					// script.runInContext(context, {timeout: 5000});
                    executor.sandbox.cb = onSuccess;
                    executor.run();
                } else if(execMethod === 'q') {
                    executor.sandbox.defered = defered;
                    executor.run();
                } else {
                    onError(0);
                }
            } catch(err) {
                onError(err);
            }

            return defered.promise;
        }
        return executeUserFunc;
    }
    // Jimmy - We don't need this either
    // Zander - this definitly does not need to be here right?
	// does it also seem that we need to transfer some of the values from this to somewhere else?
	// such as the data_group_keys
    function initializeUserFunctions() {
        stepDebug('in initializeUserFunctions');
        var errors = [];
        var data_group_keys = this.config.data_groups;
        
        data_group_keys.forEach(function(data_group_key) {
            var data_group = this.config[data_group_key];

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

                    stepDebug('executing createUserValueFunction', execMethod, func, errors);
                    userValue.userFunc = createUserValueFunction(execMethod, func, errors);
                });
            }
        });
        return errors;
    }

    var saveLoggerConfigReference = function(config) {
        stepDebug('in saveLoggerConfigReference');
        var defered = q.defer();

        // Remove old reference
        this.config = undefined;

        // Set new reference
        this.config = JSON.parse(JSON.stringify(config));

        // Start parsing the config file.
        // Determine what devices are required
        saveRequiredDeviceSerialNumbers();

        // Create user functions.
        // Zander - this will not need to be called because we are avoiding to user the userfunction
        var initErrors = initializeUserFunctions();
        if(initErrors.length > 0) {
            console.log('There were errors initializing user function!');
        }

        this.config.dataGroups = [];
        this.config.data_groups.forEach(function(key) {
            this.config[key].groupKey = key;
            this.config.dataGroups.push(this.config[key]);
        });

        defered.resolve(config);
        return defered.promise;
    };

    var calculateTimerData = function(bundle) {
        var defered = q.defer();
        stepDebug('in calculateTimerData');

        // Get a list of all required periods.
        var periods = [];
        this.config.dataGroups.forEach(function(dataGroup) {
            periods.push(dataGroup.group_period_ms);
        });

        // Calculate GCD
        if(periods.length > 1) {
            // If there are multiple periods calculate their greatest common denominator.
            this.config.core_period = gcd(periods);
        } else {
            // If there is only one period than use that period.
            this.config.core_period = periods[0];
        }

        this.config.dataGroups.forEach(function(dataGroup) {
            dataGroup.group_delay = (dataGroup.group_period_ms / this.config.core_period) - 1
        });

        defered.resolve(bundle);
        return defered.promise;
    };

    this.dataGroupManagers = [];
    // Zander - why is this green? does it think it is a class
    var createDataGroupManagers = function(bundle) {
        stepDebug('in createDataGroupManagers');
        var defered = q.defer();

        // Un-refrence the old dataGroupManagers
        // Zander - we are unrefrencing it but do we really need to do this
        this.dataGroupManagers = undefined;
        this.dataGroupManagers = [];

        // Create one Data_group_manager for each defined data_group.
        this.config.dataGroups.forEach(function(dataGroup) {
            this.dataGroupManagers.push(data_group_manager.create(dataGroup, this.config));
        });

        defered.resolve(bundle);
        return defered.promise;
    };

    // Zander - Does this need to be an array?
    this.deviceDataCollector = {};
    var createDeviceDataCollectors = function(bundle) {
        stepDebug('in createDeviceDataCollectors');
        var defered = q.defer();

        // Un-refrence the old deviceDataCollectors
        // Zander - we are unrefrencing it but do we really need to do this
        this.deviceDataCollector = undefined;
        this.deviceDataCollector = {};

        // Create one device_data_collector object for each required device.
        this.requireDeviceSerialNumbers.forEach(function(sn) {
            var newCollector = device_data_collector.createDeviceDataCollector();
            this.deviceDataCollector[sn] = newCollector;
        });

        defered.resolve(bundle);
        return defered.promise;
    };

    // Zander - this is used to update the device listing but we are only using one device, do we even need this
    var updateDeviceDataCollectorDeviceListings = function(bundle) {
        stepDebug('in updateDeviceDataCollectorDeviceListings');
        var defered = q.defer();
        var keys = Object.keys(this.deviceDataCollectors);
        var promises = keys.map(function(key) {
            var dc = this.deviceDataCollectors[key];
            return dc.updateDeviceListing(this.devices);
        });

        q.allSettled(promises)
        .then(function() {
            defered.resolve(bundle);
        })
        .catch(function(err) {
            console.error('Error updating device data collector device listing');
            defered.reject(bundle)
        })
        .done();
        return defered.promise;
    };

    var linkDeviceDataCollectorsToDevices = function(bundle) {
        stepDebug('in linkDeviceDataCollectorsToDevices');
        var defered = q.defer();
        var serialNumbers = Object.keys(this.deviceDataCollectors);
        var promises = serialNumbers.map(function(serialNumber) {
            var dc = this.deviceDataCollectors[serialNumber];
            return dc.linkToDevices(serialNumber);
        });

        q.allSettled(promises)
        .then(function() {
            var eventName = DATA_COLLECTOR_EVENTS.COLLECTOR_WARNING;
            var keys = Object.keys(this.deviceDataCollectors);
            keys.forEach(function(key) {
                var deviceDataCollector = this.deviceDataCollectors[key];
                var isFound = deviceDataCollector.isValidDevice;
                if(!isFound) {
                    this.emit(eventName, {
                        'message': 'Required device is not found',
                        'deviceSerialNumber': deviceDataCollector.deviceSerialNumber,
                        'isFound': isFound,
                    });
                }
            });
            defered.resolve(bundle);
        })
        .catch(function(err) {
            console.error('Error updating device data collector device listing', err);
            defered.reject(bundle);
        })
        .done();
        return defered.promise;
    };

    var attachDeviceDataCollectorListeners = function(bundle) {
        stepDebug('in attachDeviceDataCollectorListeners');
        var defered = q.defer();
        var keys = Object.keys(this.deviceDataCollectors);
        keys.forEach(function(key) {
            // Attach to the new data event of each of the deviceDataCollector.
            var newDataEvent = device_data_collector.EVENT_LIST.DATA;
            var  deviceDataCollector = this.deviceDataCollectors[key];
            deviceDataCollector.on(
                newDataEvent,
                this.deviceDataCollectorDataListener,
            );
        });
        defered.resolve(bundle);
        return defered.promise;
    };

    var finishDataCollectorConfig = function(bundle) {
        var defered = q.defer();
        stepDebug('in finishDataCollectorConfig');
        // Report that the data collector has been configured.
        this.emit(this.eventList.COLLECTOR_CONFIGURED, {
            'requireDeviceSerialNumbers': this.requiredDeviceSerialNumbers,
        });
        defered.resolve(bundle);
        return defered.promise;
    };

    this.configureDataCollector = function(config) {
        debugLog('in configureDataCollector');
        // return innerStopLoggingSession(config)
        // Zander this should do the same thing am i wrong or will this take longer
        // might also need to make sure that i don't need the self=this function to make some of theys not a class function
        return this.stopDataCollector(config)
        .then(saveLoggerConfigReference)
        .then(calculateTimerData)
        .then(createDataGroupManagers)
        .then(createDeviceDataCollectors)
        .then(updateDeviceDataCollectorDeviceListings)
		.then(linkDeviceDataCollectorsToDevices)
		.then(attachDeviceDataCollectorListeners)
		.then(finishDataCollectorConfig);
    };

    this.startDataCollector = function(){
        return innerStartDataCollector();
    };

    this.activeDataStore = {};
    this.orderActiveDataStore = {};
    this.deviceDataCollectorDataListener = function(data) {
        if(this.isActive) {
            var deviceData = data.results;
            debugDataAcquisition('Acquired New Data', data);
            debugLog('Acquired Data from deviceDataCollector', data.serialNumber, deviceData.registers);
            var sn = data.serialNumber.toString();
            if(this.activeDataStore[sn]) {
            } else {
                this.activeDataStore[sn] = {};
            }
            deviceData.results.forEach(function(result, i) {
                var register = deviceData.registers[i];
                this.activeDataStore[sn][register] = {
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

    // This is important for ordering the queried device data.
    this.initializeDataStoreValues = function(index, sn, registers) {
        // If the index doesn't already exist, add it
        if(typeof(this.orderActiveDataStore[sn][index] === 'undefined')) {
            this.orderActiveDataStore[sn] = {};
        }

        // If the serial number key doesn't already exist, add it.
        if(typeof(this.orderActiveDataStore[sn][index]) === 'undefined') {
            this.orderActiveDataStore[sn][index] = {};
        }

        // Initialize the data store for each queried register
        var datastoreRef = this.orderActiveDataStore[sn][index];
        registers.forEach(function(register) {
            if(typeof(datastoreRef[register]) === 'undefined') {
                this.orderActiveDataStore[sn][index][register] = {
                    'register': register,
					'result': -9999,
					'errorCode': errorCodes.VALUE_INITIALIZED,
					'time': new Date(),
					'duration': 0,
					'interval': 0,
					'index': 0,
					// 'queriedIndex': index, // When was the value requested? Must have been intended for something but is never used so this is not needed.
					// 'resultIndex': 0, // When was the value received? Must have been intended for something but is never used so this is not needed.
					'numDependent': 1,
                };
            } else {
                // Increase the number of dependents.
                this.orderActiveDataStore[sn][index][register].numDependent += 1;
            }
        });
    };

    this.clearDataStoreValue = function(sn, register) {
		this.activeDataStore[sn][register] = {
			'register': register,
			'result': -9999,
			'errorCode': errorCodes.VALUE_INITIALIZED,
			'time': new Date(),
			'duration': 0,
			'interval': 0,
			'index': 0,
            // 'numDependent': 1, // do we need "numDepedent" in this area?
		};
	};

    this.reportCollectedData = function(dataCollectionObj) {
        var defered = q.defer();
        var requiredData = dataCollectionObj.requiredData;
        var activeGroups = dataCollectionObj.activeGroups;
        var serialNumbers = dataCollectionObj.serialNumbers;

        // Organize what data needs to be given to each dataGroup,
        var organizedData = dataCollectionObj.organizedData;

        /*
		Save a copy of the data that was acquired to make room for new
		data.  This must be done after the each deviceDataCollector is
		instructed to read new data so that it has a chance to report error
		data.
		*/
        var oldData = JSON.parse(JSON.stringify(this.activeDataStore));

        // Clear the activeDataStore
        serialNumbers.forEach(function(serialNumber) {
            requiredData[serialNumber].forEach(function(register) {
                this.clearDataStoreValue(serialNumber, register);
            });
        });

        var activeGroupKeys = Object.keys(activeGroups);
        this.emit(this.eventList.REPORTING_COLLECTED_DATA, {
            'data': activeGroupKeys,
        });

        async.eachSeries(
            activeGroupKeys,
            function(activeGroupKey, callback) {
                // Zander - does this need to be declared a a function or does it need to be an aray
                var organizedGroupData = {}
                var activeGroup = activeGroups[activeGroupKey];
                var serialNumbers = Object.keys(activeGroup);

                serialNumbers.forEach(function(serialNumber) {
                    var organizedDeviceData = {};
                    var index = -1;

                    // Get the devices data.
                    var newDeviceData = oldData[serialNumber];

                    // Save timing data & error codes.
                    organizedDeviceData.errorCode = newDeviceData.errorCodes;
                    organizedDeviceData.time = newDeviceData.time;
                    organizedDeviceData.duration = newDeviceData.duration;
                    organizedDeviceData.interval = newDeviceData.interval;

                    // Make room for acquired device data
                    organizedDeviceData.results = {};

                    var reqDeviceData = activeGroup[serialNumber];
                    var deviceDataIDs = Object.keys(reqDeviceData);
                    deviceDataIDs.forEach(function(deviceDataID) {
                        var reqReg = reqDeviceData[deviceDataID];
                        var regName = reqReg.name;
                        var regValue;
                        var formattedValue;

                        // Get the required data point & save it to the regValue variable.
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

                        // Apply formatting to acquired data.
                        formattedValue = regValue;
                        if(reqReg.formatFunc) {
                            formattedValue.result = reqReg.formatFunc(regValue.result);
                        }

                        // Organize the collected data.
                        organizedDeviceData.results[regName] = formattedValue;
                    });
                    organizedGroupData[serialNumber] = organizedDeviceData;
                });
                var promises = [];
                var activeGroupObj = this.config[activeGroupKey];
                // Zander - will we need this if statment beceaseu we are not ising any user values?
                if(activeGroupObj.defined_user_values) {
                    // Report that we are executing user functions.
                    this.emit(this.eventList.EXECUTING_USER_FUNCTION, {
                        'groupKey': activeGroupKey,
                        'userFunction': activeGroupObj.defined_user_values,
                    });

                    // Execute user function & make room int eh organizedGroupData object for user values.
                    organizedGroupData.userValues = {};
                    var user_value_keys = activeGroupObj.defined_user_values;
                    var userValueKeys = [];
                    user_value_keys.forEach(function(user_value_key) {
                        var userValue = activeGroupObj.user_values[user_value_key];

                        // Report that we are executing the user function.
                        this.emit(this.eventList.EXECUTING_USER_FUNCTION, {
                            'functionName': userValue.name,
                        });
                        userValueKeys.push(user_value_key);
                        promises.push(userValue.userFunc(organizedGroupData));
                    });
                }

                debugLog('Waiting for reportCollectedData promises');
                q.allSettled(promises)
                .then(function(results) {
                    // Zander - do we really need all of these debugLog's?
                    debugLog('completed for reportCollectedData promises', results);
                    if(results){
                        // Save the returned results into the organizedGroupData object.
                        results.forEach(function(result, i) {
                            var valueKey = userValueKeys[i];
                            if(result.state === 'fulfilled') {
                                organizedGroupData.userValues[valueKey] = result.value;
                            } else {
                                // If there was an error use the default value of zero
                                var defaultVal = 0;
                                var userValue = activeGroupObj.user_values[valueKey];
                                if(userValue.default_value) {
                                    defaultVal = userValue.default_value;
                                }
                                organizedGroupData.userValues[valueKey] = defaultVal;
                            }
                        });
                    }
                    this.emit(this.eventList.COLLECTOR_GROUP_DATA, {
                        'groupKey': activeGroupKey,
                        'data': organizedGroupData,
                    });

                    // Save organized group data to the organizedData object.
                    organizedData[activeGroupKey] = organizedGroupData;
                    callback();
                });
            }, function (err) {
                // Report the collected data
                this.emit(this.eventList.COLLECTOR_DATA, organizedData);
                defered.resolve(dataCollectionObj);
            }
        )
    };

    this.dataCollectionCounter = 0;
    var innerPerformDataCollection = function() {
        var requiredData = {};
        var activeGroups = {};
        var organizedData = {};

        this.dataGroupManagers.forEach(function(manager) {
            var reqData = manager.getRequiredData();
            if(reqData) {
                var registers = reqData.registers;
                var serialNumbers = Object.keys(registers);
                // Zander - I feel as if this can be simplified so run more efficiently and take sell time
                serialNumbers.forEach(function(sn) {
                    if(requiredData[sn]) {
                        registers[sn].forEach(function(reqReg) {
                            if(requiredData[sn].indexOf(reqReg) < 0) {
                                requiredData[sn].push(reqReg)
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

        // Report what data groups are active
        this.emit(this.eventList.COLLECTING_GROUP_DATA, {
            'data': Object.keys(activeGroups),
        });

        // Report what data is being collected from each device
        this.emit(this.eventList.COLLECTING_DEVICE_DATA, {
            'data': requiredData,
            'count': this.dataCollectionCounter,
        });

        var serialNumbers = Object.keys(requiredData);
        var promises = serialNumbers.map(function(serialNumber) {
            var deviceDataCollector = this.deviceDataCollector[serialNumber];
            var dataToRead = requiredData[serialNumber];
            debugDataAcquisition(
                'Starting a new read',
                this.dataCollectionCounter,
                serialNumber,
                dataToRead,
            );
            // Make room in the data store for the values trying to be read.
            this.initializeDataStoreValues(
                this.dataCollectionCounter,
                serialNumber,
                dataToRead,
            );

            return deviceDataCollector.startNewRead(
                dataToRead,
                this.dataCollectionCounter,
            );
        });

        var dataCollectionObj = {
			'requiredData': requiredData,
			'activeGroups': activeGroups,
			'organizedData': organizedData,
			'serialNumbers': serialNumbers,
		};
        debugLog('Waiting for read promises');
        q.allSettled(promises)
        .then(function() {
            debugLog('Completed read promises');
            if(this.isFirstDataCollectionIteration) {
                this.isFirstDataCollectionIteration = false;
            } else {
                try {
                    debugLog('Executing reportCollectedData');
                    this.reportCollectedData(dataCollectionObj);
                } catch(err) {
                    console.log('Error reporting collected data', err, err.stack);
                }
            }
            // Increment the counter
            this.dataCollectionCounter += 1;
        });
    };

    this.performDataCollection = function() {
        try {
            innerPerformDataCollection();
        } catch(err) {
            console.log('Error performing data collection', err);
            this.emit(this.eventList.COLLECTOR_ERROR, {
                'message': 'Error performing data collection',
                'error': err,
            });
        }
    };

    var clearDataCollectionVariables = function() {
		// Re-set the increment counter
		this.dataCollectionCounter = 0;

		this.activeDataStore = undefined;
		this.activeDataStore = {};

		this.orderActiveDataStore = undefined;
		this.orderActiveDataStore = {};
	};
	this.isFirstDataCollectionIteration = false;
	var innerStartDataCollector = function(bundle) {
		var defered = q.defer();

		// Clear data-collection variables.
		clearDataCollectionVariables();

        debugLog('Starting Data Collector', this.config.core_period);
        this.isActive = true;
        this.isFirstDataCollectionIteration = true;
        // Jimmy - We are replacing setInterval with setTimeout and managing the clock
        // this.daqTimer = setInterval(
        //     this.performDataCollection,
        //     this.config.core_period
        // );
        // Zander - this should be the correct whay that we need to do this.
        this.daqTimer = setTimeout(
            this.performDataCollection,
            this.config.core_period,
        )

        // Report that the data collector has been started.
        this.emit(this.eventList.COLLECTOR_STARTED, {});

        defered.resolve(bundle);
        return defered.promise;
    };

    // Zander - should change some naming conventions? it may make it easier to read.
    tshis.stopDataCollector = function(bundle) {
        return innerStopLoggingSession(bundle);
    };

    var innerStopLoggingSession = function(bundle) {
        var defered = q.defer();
        this.isActive = false;
        clearInterval(this.daqTimer);
        this.daqTimer = undefined;

        // Report that the data collector has been stopped.
        this.emit(this.eventList.COLLECTOR_STOPPED, {});

        defered.resolve(bundle);
        return defered.promise;
    };
    // Zander - there used to be "var self=this" i didn't implement it but not this may cause issues in the future
}

// The data collector is an event-emitter.
// Zander - is there a difrent way that we can do this because VSCode is saying that this is not the best idea.
util.inherits(CREATE_DATA_COLLECTOR, EventEmitter);
exports.create = function() {
    return new CREATE_DATA_COLLECTOR();
};
var data_collector = new CREATE_DATA_COLLECTOR();

exports.eventList = DATA_COLLECTOR_EVENTS;