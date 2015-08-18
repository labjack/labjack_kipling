
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

var data_collector;

exports.tests = {
	'Require data_collector': function(test) {
		try {
			data_collector = require('../../lib/data_collector');
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
	'configure data collector': function(test) {
		// Configure the data_collector with the available device objects.
		var devices = mockDeviceManager.getDevices();
		data_collector.updateDeviceObjects(devices)
		.then(function() {
			test.ok(true);
			test.done();
		}, function() {
			test.ok(false, 'Should have successfully configured the devices');
			test.done();
		});
	},
	'create data collector object': function(test) {
		console.log('Configurations', configurations);

		// q.longStackSupport = true;

		async.eachSeries(
			configurations,
			function(configuration, callback) {
				data_collector.configureDataCollector(configuration.data)
				.then(data_collector.startDataCollector)
				.then(function() {
					console.log('Successfully started data collector...');
					test.ok(true);
					callback();
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