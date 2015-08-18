

/*
This file is the basic test for the data_group_manager object.

It tests for syntax errors (ability to properly require & use) as well as some
basic functionality.

*/
var path = require('path');
var q = require('q');
var async = require('async');
var gcd = require('compute-gcd');

var data_group_manager;

/* Code that is required to load a logger-configuration */
var config_loader = require('../../lib/config_loader');
var cwd = process.cwd();
var logger_config_files_dir = path.join(cwd, 'test', 'logger_config_files');
var basic_config = undefined;

var driver_const = require('ljswitchboard-ljm_driver_constants');


/* What devices should be logged from */
var configurations = [
{
	'fileName': 'basic_config.json',
	'filePath': '',
	'data': undefined,
	'core_period': 0,
	'dataGroups': [],
	'managers': [],
	'results': [],

	'pattern': [{
		"1": ["AIN0"],
		"2": ["AIN0"]
	}],
	'numExpectedPatterns': 4,
},
{
	'fileName': 'two_data_groups.json',
	'filePath': '',
	'data': undefined,
	'core_period': 0,
	'dataGroups': [],
	'managers': [],
	'results': [],

	'pattern': [{
		"1": ["AIN1"],
	}, {
		"1": ["AIN0","AIN1"],
		"2": ["AIN0"]
	}],
	'numExpectedPatterns': 2,
}
];


var ENABLE_DEBUGGING = false;
function debugLog() {
	if(ENABLE_DEBUGGING) {
		console.log.apply(console, arguments);
	}
}
/*
Begin defining test cases.
*/
exports.basic_tests = {
	'Require data_group_manager': function(test) {
		try {
			data_group_manager = require('../../lib/data_group_manager');
			test.ok(true);
		} catch(err) {
			test.ok(false, 'error loading data_group_manager');
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
	'create data_group_managers': function(test) {
		configurations.forEach(function(config) {
			config.managers = config.dataGroups.map(function(dataGroup) {
				return data_group_manager.create(dataGroup);
			});
		});
		test.done();
	},
	'execute and test operation ticks': function(test) {
		var numIterations = 4;
		var iterations = [];
		for(var i = 0; i < numIterations; i++) {
			iterations.push(i);
		}

		iterations.forEach(function(iteration) {
			configurations.forEach(function(config) {
				var combinedData = {};

				config.managers.forEach(function(manager) {
					var reqData = manager.getRequiredData();
					if(reqData) {
						var reqRegisters = reqData.registers;
						var serialNumbers = Object.keys(reqRegisters);
						serialNumbers.forEach(function(sn) {
							if(combinedData[sn]) {
								combinedData[sn] = combinedData[sn].concat(reqRegisters[sn]);
							} else {
								combinedData[sn] = reqRegisters[sn];
							}
						});
					}
				});
				config.results.push(combinedData);
			});
		});

		configurations.forEach(function(config) {
			expectedResults = [];
			for(var i = 0; i < config.numExpectedPatterns; i++) {
				expectedResults = expectedResults.concat(config.pattern);
			}
			// console.log('Results', config.fileName);
			// console.log(JSON.stringify(config.results, null, 2));
			// console.log(JSON.stringify(expectedResults, null, 2));
			test.deepEqual(config.results, expectedResults, 'Results do not match pattern');
		});
		test.done();
	},
};