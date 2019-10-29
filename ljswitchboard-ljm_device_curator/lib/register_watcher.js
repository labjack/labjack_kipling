
var q = require('q');
// var math = require('mathjs');
var gcd = require('compute-gcd');

var DEBUG_DATA_COLLECTOR = false;

function createWatcherObject(watcherName, collectionFunction, callback, curatedDevice) {
	this.timerRef = undefined;
	this.reportResults = false;
	this.registerGroups = [];
	this.dataCache = {};

	this.statistics = {
		'numSkipped': 0,
		'numReads': 0,
		'numErrors': 0,
		'numReadResults': 0,
		'numUpdates': 0,
	};

	this.isDataCollectorActive = false;
	var handleSuccessfulDataCollection = function(results) {
		if(DEBUG_DATA_COLLECTOR) {
			console.log('  - Successful Data Collection', results);
		}
		self.statistics.numReadResults += 1;
		var newData = [];
		// Parse data and determine if it is new.
		results.forEach(function(result) {
			var registerName = result.name;
			// Check to see if the value is currently cached
			if(typeof(self.dataCache[registerName]) !== 'undefined') {
				// The value is cached.
				// Check to see if the cached value is the same as the read val.
				if(self.dataCache[registerName].res !== result.res) {
					// Update the cached value
					self.dataCache[registerName] = result;

					// Add the result to the newData array
					newData.push(result);
				} else {
					// The value is the same as before and can be ignored.
				}
			} else {
				// The value is not cached and is therefore a new value.
				// Cache the value
				self.dataCache[registerName] = result;

				// Add result to the newData array
				newData.push(result);
			}
		});

		if(self.reportResults) {
			if(newData.length > 0) {
				if(typeof(callback) === 'function') {
					self.statistics.numUpdates += 1;
					try {
						callback(newData);
					} catch(err) {
						// Error calling callback function.
						console.error('Error calling callback', err);
					}
				} else {
					console.error(
						'callback invalid',
						typeof(callback),
						newData
					);
				}
			}
		}
		self.isDataCollectorActive = false;
	};
	var handleFailedDataCollection = function(errorData) {
		if(DEBUG_DATA_COLLECTOR) {
			console.log('  - Failed Data Collection', errorData);
		}
		// Ignore this data and indicate that the data collector isn't active
		// anymore.
		self.isDataCollectorActive = false;
		self.statistics.numErrors += 1;
	};
	var performDataCollection = function() {
		var i,j;
		var numGroups = self.registerGroups.length;
		var readRegisters = [];
		for(i = 0; i < numGroups; i++) {
			// Decrement the currentDelay value for the register group.
			self.registerGroups[i].currentDelay -= 1;

			// If the decremented value is less than or equal to 0 than it needs
			// to be read.  A value of 0 will indicate that the register group
			// should be read every loop iteration.
			if(self.registerGroups[i].currentDelay <= 0) {
				// Add the register group's list of registers to the list of
				// registers that should be read.
				for(j = 0; j < self.registerGroups[i].registers.length; j++) {
					readRegisters.push(self.registerGroups[i].registers[j]);
				}

				// Re-set the register group's delay.
				var delayResetVal = self.registerGroups[i].delayResetVal;
				self.registerGroups[i].currentDelay = delayResetVal;
			}
		}

		// query the device for data
		if(DEBUG_DATA_COLLECTOR) {
			console.log('  - Collecting data', collectionFunction, readRegisters);
		}
		self.statistics.numReads += 1;
		curatedDevice[collectionFunction](readRegisters)
		.then(handleSuccessfulDataCollection, handleFailedDataCollection);
	};
	var skipDataCollection = function() {
		if(DEBUG_DATA_COLLECTOR) {
			console.log('  - in skipDataCollection');
		}
		var i;
		var numGroups = self.registerGroups.length;
		for(i = 0; i < numGroups; i++) {
			// Decrement the currentdelay value for the register group.
			self.registerGroups[i].currentDelay -= 1;
		}
		self.statistics.numSkipped += 1;
	};
	var dataCollector = function() {
		try {
			if(self.isDataCollectorActive) {
				skipDataCollection();
			} else {
				self.isDataCollectorActive = true;
				performDataCollection();
			}
		} catch(err) {
			console.log('Error in dataCollector', err);
			console.log('Stack:', err.stack);
		}
	};

	var performInitialDataCollection = function() {
		self.isDataCollectorActive = true;
		var i,j;
		var numGroups = self.registerGroups.length;
		var readRegisters = [];
		for(i = 0; i < numGroups; i++) {
			// Add the register group's list of registers to the list of
			// registers that should be read.
			for(j = 0; j < self.registerGroups[i].registers.length; j++) {
				readRegisters.push(self.registerGroups[i].registers[j]);
			}
		}

		// query the device for data
		if(DEBUG_DATA_COLLECTOR) {
			console.log('  - Collecting Initial data', collectionFunction, readRegisters);
		}
		self.statistics.numReads += 1;
		curatedDevice[collectionFunction](readRegisters)
		.then(handleSuccessfulDataCollection, handleFailedDataCollection);
	};
	var innerConfigureWatcher = function(newConfig) {
		var defered = q.defer();
		try {
			// Make sure that the configuration is in an array form.
			var newConfigs = [];
			if(Array.isArray(newConfig)) {
				newConfigs = newConfig;
			} else {
				newConfigs.push(newConfig);
			}

			var numConfigs = newConfig.length;
			
			// Calculate the greatest common denominator of the configuration 
			// rates to determine how often the timer will run.
			var collectionRates = [];
			newConfigs.forEach(function(config) {
				collectionRates.push(config.ms);
			});
			var coreRate;
			if(collectionRates.length > 1) {
				// coreRate = math.gcd.apply(undefined, collectionRates);
				coreRate = gcd(collectionRates);
			} else {
				coreRate = collectionRates[0];
			}

			// Initialize the dataGroups object that contains the state of the
			// registers being watched. essentially an RTOS setup.
			self.registerGroups = [];
			newConfigs.forEach(function(config) {
				var data = {};
				data.userMS = config.ms;
				var initialDelay = parseInt(config.ms/coreRate);
				data.delayResetVal = initialDelay;
				data.currentDelay = initialDelay;
				data.registers = config.registers;
				self.registerGroups.push(data);
			});

			// Clear the currently cached data.
			self.dataCache = {};

			// Start the data collector & perform an initial dataCollection 
			// routine for all required data.
			self.reportResults = true;
			performInitialDataCollection();
			self.timerRef = setInterval(dataCollector, coreRate);
			defered.resolve(watcherName);
		} catch(err) {
			console.log('Error', err);
			defered.reject(watcherName);
		}
		
		return defered.promise;
	};
	this.configureWatcher = function(newConfig) {
		var defered = q.defer();
		self.stopWatcher()
		.then(function() {
			innerConfigureWatcher(newConfig)
			.then(defered.resolve, defered.promise);
		});
		return defered.promise;
	};
	this.stopWatcher = function() {
		var defered = q.defer();

		self.reportResults = false;
		if(self.timerRef) {
			clearInterval(self.timerRef);
		}
		defered.resolve(watcherName);
		return defered.promise;
	};
	var self = this;
}

// Create a general "register watcher" system that will be ported out and 
// directly accessable in the device_curator object.
function createRegisterWatcher(curatedDevice) {
	this.watchers = {};

	this.getWatchers = function() {
		var defered = q.defer();
		var watcherKeys = Object.keys(self.watchers);
		defered.resolve(watcherKeys);
		return defered.promise;
	};
	
	var isValidWatcher = function(watcherName) {
		var isValid = true;
		if(typeof(self.watchers[watcherName]) === 'undefined') {
			isValid = false;
			return isValid;
		}
		return isValid;
	};
	// createWatcher is the function that creates a new watcher if one doesn't
	// already exist.
	this.createWatcher = function(watcherName, callback, options) {
		var defered = q.defer();

		var collectionFunction = 'iReadMany';
		if(options) {
			if(options.collectionFunction) {
				collectionFunction = options.collectionFunction;
			}
		}
		// If there aren't any watchers
		if(!isValidWatcher(watcherName)) {
			self.watchers[watcherName] = new createWatcherObject(
				watcherName,
				collectionFunction,
				callback,
				curatedDevice
			);
			defered.resolve(watcherName);
		} else {
			defered.reject({'err': 'Watcher already exists'});
		}
		return defered.promise;
	};

	this.configureWatcher = function(watcherName, newConfig) {
		if(isValidWatcher(watcherName)) {
			return self.watchers[watcherName].configureWatcher(newConfig);
		} else {
			var defered = q.defer();
			defered.reject({'err': 'Watcher does not exist'});
			return defered.promise;
		}
	};

	var deleteWatcher = function(watcherName) {
		var defered = q.defer();
		var statistics = {};
		var keys = Object.keys(self.watchers[watcherName].statistics);
		keys.forEach(function(key) {
			statistics[key] = self.watchers[watcherName].statistics[key];
		});
		self.watchers[watcherName] = null;
		self.watchers[watcherName] = undefined;
		delete self.watchers[watcherName];
		defered.resolve({'name': watcherName, 'statistics': statistics});
		return defered.promise;
	};
	this.stopWatcher = function(watcherName) {
		var defered = q.defer();
		if(isValidWatcher(watcherName)) {
			self.watchers[watcherName].stopWatcher()
			.then(deleteWatcher)
			.then(defered.resolve, defered.reject);
		} else {
			defered.reject({'err': 'Watcher does not exist'});
		}
		return defered.promise;
	};

	this.stopAllWatchers = function() {
		var defered = q.defer();
		var watcherKeys = Object.keys(self.watchers);
		if(watcherKeys.length > 0) {
			var promises = watcherKeys.map(self.stopWatcher);

			q.AllSettled(promises)
			.then(function(results) {
				defered.resolve(watcherKeys);
			});
		} else {
			defered.resolve([]);
		}
		return defered.promise;
	};
	
	var self = this;
}

exports.createRegisterWatcher = createRegisterWatcher;