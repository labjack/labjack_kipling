
var q = require('q');
var path = require('path');
var async = require('async');

var config_loader = require('../../lib/config_loader');

var cwd = process.cwd();
var logger_config_files_dir = path.join(cwd, 'test', 'logger_config_files');


var mock_device_manager = require('../mock_device_manager');
var mockDeviceManager = mock_device_manager.createDeviceManager();

var driver_const = require('ljswitchboard-ljm_driver_constants');

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

/* What logging configurations should be tested. */
var configurations;
try {
	configurations = require('../test_config_files/standard_tests').configurations;
} catch(err) {
	console.log('Error requiring configurations', err);
	configurations = [];
}

var data_collector;
var dataCollector;
var dcEvents;
	
var DEBUG_COLLECTED_EVENTS = false;
var logEvent = function() {
	if(DEBUG_COLLECTED_EVENTS) {
		console.log.apply(console, arguments);
	}
};
var DEBUG_TEST_LOG = false;
var debugTest = function() {
	if(DEBUG_TEST_LOG) {
		console.log.apply(console, arguments);
	}
};

var DEBUG_COLLECTED_DATA = false;
var logCollectedData = function() {
	if(DEBUG_COLLECTED_DATA) {
		console.log.apply(console, arguments);
	}
};


function DATA_COLLECTOR_TESTER () {
	this.eventLog = [];

	this.dataGroupData = {};

	this.triggerStopDataCollection = undefined;

	this.config = undefined;

	this.shouldStop = function() {
		var shouldStop = true;

		var data_groups = self.config.data.data_groups;
		data_groups.forEach(function(data_group) {
			var numRequired = self.config.stopCases[data_group];
			var numCollected = self.dataGroupData[data_group].length;
			if(numCollected < numRequired) {
				shouldStop = false;
			}
		});
		return shouldStop;
	};
	this.getEventListener = function(eventName) {
		return function(newData) {
			self.eventLog.push({
				'eventName': eventName,
				'data': newData,
			});

			if(eventName === 'COLLECTOR_DATA') {
				var groupNames = Object.keys(newData);
				groupNames.forEach(function(groupName) {
					var groupData = newData[groupName];
					self.dataGroupData[groupName].push(groupData);

					if(self.shouldStop()) {
						debugTest(
							'Stopping Data Collection',
							typeof(self.triggerStopDataCollection)
						);
						if(self.triggerStopDataCollection) {
							self.triggerStopDataCollection();
						}
					}
				});
				// console.log('  - ', newData.groupKey, JSON.stringify(newData.data));
			} else {
				// console.log('!!! Event Fired', eventName, newData);
			}
		};
	};
	this.dataListener = function(newData) {
		console.log('Got new data', newData);
	};
	this.linkToDataCollector = function(bundle) {
		var defered = q.defer();

		var keys = Object.keys(dcEvents);
		keys.forEach(function(key) {
			var eventName = dcEvents[key];
			dataCollector.on(eventName, self.getEventListener(eventName));
		});

		defered.resolve(bundle);
		return defered.promise;
	};
	this.initializeTester = function(config) {
		var defered = q.defer();
		
		// Clear the captured event log
		self.config = config;
		self.eventLog = [];
		self.dataGroupData = {};

		config.data.data_groups.forEach(function(data_group) {
			self.dataGroupData[data_group] = [];
		});

		// Resolve to the actual config data for the data_collector to use for
		// initialization.
		defered.resolve(config.data);
		return defered.promise;
	};
	this.collectData = function(bundle) {
		var defered = q.defer();

		self.triggerStopDataCollection = function() {
			defered.resolve(bundle);
		};
		// setTimeout(function() {
		// 	defered.resolve(bundle);
		// }, 500);
		return defered.promise;
	};

	var reportResults = function(collectorData) {
		var groupNames = Object.keys(collectorData);
		groupNames.forEach(function(groupName) {
			var groupData = collectorData[groupName];
			var serialNumbers = Object.keys(groupData);
			serialNumbers.forEach(function(sn) {
				var deviceData = groupData[sn];
				var results = deviceData.results;
				logEvent(groupName, sn);
				logCollectedData('Data', deviceData);
			});
		});
	};
	var aggregateResultsForTesting = function(collectorData) {
		var aggregatedData = {};

		var groupNames = Object.keys(collectorData);
		groupNames.forEach(function(groupName) {
			var aggregatedGroupData = {};

			var groupData = collectorData[groupName];
			var serialNumbers = Object.keys(groupData);
			serialNumbers.forEach(function(sn) {
				var aggregatedDeviceData = [];

				var deviceData = groupData[sn];
				var results = deviceData.results;
				var resultKeys = Object.keys(results);

				resultKeys.forEach(function(resultKey) {
					var result = results[resultKey];
					// console.log('Aggregating...', groupName, sn, result.register, result.result);
					// aggregatedDeviceData[result.register] = result.result;
					aggregatedDeviceData.push(result.register);
				});
				// console.log('Device Data', aggregatedDeviceData);
				aggregatedGroupData[sn] = aggregatedDeviceData;
			});
			// console.log('Group Data', aggregatedGroupData);
			aggregatedData[groupName] = aggregatedGroupData;
		});

		// console.log('Collected Data', aggregatedData);
		return aggregatedData;
	};
	this.testExecution = function(test) {
		console.log('  - Testing... Number of captured events', self.eventLog.length);

		var requestedDeviceData = [];
		var reportedDataGroups = [];
		var collectedGroupData = [];

		var expRequestedDeviceData = [];
		var expReportedDataGroups = [];
		var expCollectedGroupData = [];

		// console.log(
		// 	'Config requestedDeviceDataPattern',
		// 	self.config.requestedDeviceDataPattern
		// );
		// console.log(
		// 	'Config reportedDataGroupsPattern',
		// 	self.config.reportedDataGroupsPattern
		// );
		// console.log(
		// 	'Config collectedGroupDataPattern',
		// 	self.config.collectedGroupDataPattern
		// );
		// console.log(
		// 	'Config numExpectedPatterns',
		// 	self.config.numExpectedPatterns
		// );

		for(var i = 0; i < self.config.numExpectedPatterns; i++) {
			expRequestedDeviceData = expRequestedDeviceData.concat(
				self.config.requestedDeviceDataPattern
			);
			expReportedDataGroups = expReportedDataGroups.concat(
				self.config.reportedDataGroupsPattern
			);
			expCollectedGroupData = expCollectedGroupData.concat(
				self.config.collectedGroupDataPattern
			);
		}

		// Append ending/extra data patterns.
		expRequestedDeviceData = expRequestedDeviceData.concat(
			self.config.extraRequestedDeviceDataPattern
		);
		expReportedDataGroups = expReportedDataGroups.concat(
			self.config.extraReportedDataGroupsPattern
		);
		expCollectedGroupData = expCollectedGroupData.concat(
			self.config.extraCollectedGroupDataPattern
		);


		if(true) {
			self.eventLog.forEach(function(singleEvent) {
				if(singleEvent.eventName === 'COLLECTOR_DATA') {
					logEvent(
						'  - ',
						singleEvent.eventName,
						// singleEvent.data,
						Object.keys(singleEvent.data)
					);
					reportResults(singleEvent.data);

					// store the data group names for testing
					var groupNames = Object.keys(singleEvent.data);
					reportedDataGroups.push(groupNames);

					collectedGroupData.push(aggregateResultsForTesting(
						singleEvent.data
					));
					logEvent();
				} else if(singleEvent.eventName === 'COLLECTING_DEVICE_DATA') {
					logEvent(
						'  - ',
						singleEvent.eventName,
						singleEvent.data.data,
						singleEvent.data.count
					);
					// Store all of the acquired data so that it can be tested.
					requestedDeviceData.push(singleEvent.data.data);
				} else if(singleEvent.eventName === 'COLLECTING_GROUP_DATA') {
					logEvent(
						'  - ',
						singleEvent.eventName,
						singleEvent.data.data
					);
				} else if(singleEvent.eventName === 'REPORTING_COLLECTED_DATA') {
					logEvent(
						'  - ',
						singleEvent.eventName,
						singleEvent.data.data
					);
				} else {
					logEvent(
						'  - ',
						singleEvent.eventName
					);
				}
			});
			// console.log('requestedDeviceData:', requestedDeviceData);
			// console.log('expRequestedDeviceData:', expRequestedDeviceData);
			test.deepEqual(
				requestedDeviceData,
				expRequestedDeviceData,
				'Unexpected requestedDeviceData received'
			);
			// console.log('reportedDataGroups:', reportedDataGroups);
			// console.log('expReportedDataGroups:', expReportedDataGroups);
			test.deepEqual(
				reportedDataGroups,
				expReportedDataGroups,
				'Unexpected reportedDataGroups received'
			);
			// console.log('collectedGroupData:', collectedGroupData);
			// console.log('expCollectedGroupData:', expCollectedGroupData);
			test.deepEqual(
				collectedGroupData,
				expCollectedGroupData,
				'Unexpected collectedGroupData received'
			);
		}
		test.ok(true);
	};
	var self = this;
}
var dataCollectorTester = new DATA_COLLECTOR_TESTER();


exports.tests = {
	'Require data_collector': function(test) {
		try {
			data_collector = require('../../lib/data_collector');
			dcEvents = data_collector.eventList;
			dataCollector = data_collector.create();
			test.ok(true);
		} catch(err) {
			test.ok(false, 'error loading data_collector');
			console.log('Error...', err);
		}
		test.done();
	},
	'Load Test Files': function(test) {
		var promises = configurations.map(function(config) {
			config.filePath = path.join(
				logger_config_files_dir,
				config.fileName
			);

			return config_loader.loadConfigFile(config.filePath)
			.then(function(configData) {
				var defered = q.defer();
				config.data = configData.data;

				debugLog('Loaded File');
				var dataGroupNames = config.data.data_groups;

				debugLog('Group Names', dataGroupNames);
				dataGroupNames.forEach(function(groupName) {
					config.dataGroups.push(config.data[groupName]);
				});

				var periods = [];
				config.dataGroups.forEach(function(dataGroup) {
					periods.push(dataGroup.group_period_ms);
				});

				debugLog('Calculating GCD');
				// Calculate GCD
				if(periods.length > 1) {
					config.core_period = gcd(periods);
				} else {
					config.core_period = periods[0];
				}

				// Calculate the data group's "group_delay" value to determine
				// how frequently the data-groups will report that their values
				// need to be collected.
				config.dataGroups.forEach(function(dataGroup) {
					dataGroup.group_delay = (dataGroup.group_period_ms / config.core_period) - 1;
				});

				debugLog('Data Groups', config.dataGroups);
				defered.resolve();
				return defered.promise;
			}, function(err) {
				var defered = q.defer();
				console.log('Failed to load file...', err);
				test.ok(false, 'Failed to load file... ' + config.fileName + '. ' + err.errorMessage);
				
				defered.reject(err);
				return defered.promise;
			});
		});

		q.allSettled(promises)
		.then(function() {
			test.done();
		});
	},
	'Open Devices': mockDeviceManager.openDevices,
	'Verify Device Info': mockDeviceManager.getDevicesInfo,
	'link tester to data collector': function(test) {
		dataCollectorTester.linkToDataCollector()
		.then(function() {
			test.ok(true);
			test.done();
		})
		.catch(function(error) {
			test.ok(false, 'Failed to link tester to data collector');
			test.done();
		})
		.done();
	},
	'configure data collector': function(test) {
		// Configure the dataCollector with the available device objects.
		var devices = mockDeviceManager.getDevices();
		dataCollector.updateDeviceObjects(devices)
		.then(function() {
			test.ok(true);
			test.done();
		}, function() {
			test.ok(false, 'Should have successfully configured the devices');
			test.done();
		});
	},
	'configure and test data collector': function(test) {
		// console.log('Configurations', configurations);

		// q.longStackSupport = true;

		async.eachSeries(
			configurations,
			function(configuration, callback) {
				dataCollectorTester.initializeTester(configuration)
				.then(dataCollector.configureDataCollector)
				.then(dataCollector.startDataCollector)
				.then(dataCollectorTester.collectData)
				.then(dataCollector.stopDataCollector)
				.then(function() {
					console.log('  * Testing', configuration.fileName);
					console.log('  - Successfully ran data collector...');
					dataCollectorTester.testExecution(test);
					console.log('  - Delaying to let any data come in...');
					console.log();
					setTimeout(function() {
						callback();
					}, 1000);
				})
				.catch(function(error) {
					test.ok(false,'Caught an error running the data collector');
					console.log('write.... q.longStackSupport = true;');
					console.log('Error...', error);
					console.log('Error Keys', Object.keys(error));
					console.log('Error Stack', error.stack);
					test.done();
				})
				.done();
			}, function(err) {
				test.done();
			});
	},
	'execute and test data collector': function(test) {
		test.done();
	},
	'Close Devices':mockDeviceManager.closeDevices,
};