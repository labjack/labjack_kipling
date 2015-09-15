/* 
 * This file is in charge of saving collected data to files.
 */

var EventEmitter = require('events').EventEmitter;
var util = require('util');
var q = require('q');
var async = require('async');
var path = require('path');

var events = {};
exports.events = events;


/* Things that I need...

1. A Root Directory to save data to
 - Mac:
 - Windows:
 - Linux:

2. Default file/folder structure
(It may make sense to allow this to be customized, add flags in the .json file...)

root/[logging_config.name + extraTextToBeUnique("_0" ... "_100")]

for each data-group... create a folder:
/[group_name] + extraTextToBeUnique("_0" ... "_100")

each folder will then contain files...
[name] + [group_name] + "-config" + file_ending(.csv)
[name] + [group_name] + "-data" + extraTextToBeUnique("_0" ... "_100") + file_ending(.csv)


3. When starting the logger I need to initialize the required folder/file structure.

4. Enabling & disabling logger behavior.
Logging is very configurable.  Overall, the logger can be enabled/disabled.
Every time it goes from disabled -> enabled it will initialize a new folder
structure.

Each data-group's logging functionality can also be enabled/disabled.
Every time they go from disabled -> enabled a new folder will get created.
*/

var DEFAULT_ROOT_DIR = {
	'win32': process.env.USERPROFILE,
	'darwin': process.env.HOME,
}[process.platform];
if(typeof(DEFAULT_ROOT_DIR) === 'undefined') {
	if(process.env.HOME) {
		DEFAULT_ROOT_DIR = process.env.HOME;
	} else if(process.env.USERPROFILE) {
		DEFAULT_ROOT_DIR = process.env.USERPROFILE;
	} else {
		DEFAULT_ROOT_DIR = '';
		console.error(
			'No valid default root directory found',
			process.env,
			process.platform
		);
	}
}

DEFAULT_ROOT_DIR = path.join(DEFAULT_ROOT_DIR, 'labjack_logger_data');


var DATA_LOGGER_EVENTS = {
	// Event indicating that the data logger's root directory has been changed.
	ROOT_DIRECTORY_CHANGED: 'ROOT_DIRECTORY_CHANGED',

	// Event indicating that data logger's log-state has changed.  Either it has
	// been turned on/off or one of the data-group's has been enabled/disabled.
	DATA_LOGGER_STATE_UPDATE: 'DATA_LOGGER_STATE_UPDATE',

	// ERROR EVENTS:
	// Event indicating that the data logger failed to create a required folder.
	ERROR_CREATING_FOLDER: 'ERROR_CREATING_FOLDER',

	// Event indicating that the data logger failed to create a required file.
	ERROR_CREATING_FILE: 'ERROR_CREATING_FILE',

};
function CREATE_DATA_LOGGER() {
	// Default Root Directory
	this.rootDirectory = DEFAULT_ROOT_DIR;

	this.state = {
		'configured': false,
		'running': false,
		'initialized': false,
		'enabled': false,
		'name': '',
	};

	this.stats = {
		// This object will get initialized with each data_group's name and a
		// value of zero when data collection starts.
		'num_collected': {},

		'start_time': undefined,
		'stop_time': undefined,
	};
	function initializeStats() {
		// Initialize the num_collected variable.
		self.stats.num_collected = {};
		self.config.data_groups.forEach(function(data_group) {
			self.stats.num_collected[data_group] = 0;
		});

		// Initialize the starting time of the log.
		self.stats.start_time = new Date();
	}
	function updateStats(data) {
		self.stats.num_collected[data.groupKey] += 1;
	}
	function finalizeStats() {
		self.stats.stop_time = new Date();
	}

	this.config = undefined;

	// Organized data for the logger.
	this.logData = {};

	function initializeLogData() {
		// Determine if the logger should actually save data.
		self.state.enabled = self.config.logging_config.write_to_file;

		// Establish the logger's name.
		var nameType = typeof(self.config.logging_config.name);
		var filePrefixType = typeof(self.config.logging_config.file_prefix);
		if(filePrefixType === 'string') {
			self.state.name = self.config.logging_config.file_prefix;
		} else if(nameType === 'string') {
			self.state.name = self.config.logging_config.name;
		} else {
			self.state.name = 'default_config';
		}

		// Initialize the logData object.
		self.logData = {};
		
		// Parse the config file for various data.
		var data_groups = self.config.data_groups;
		data_groups.forEach(function(data_group) {
			// Get the dataGroup object.
			var dataGroup = self.config[data_group];

			// Compile the header object that should be inserted above the data
			// in each output file.
			var dataCategories = [];
			var dataNames = [];

			// Add device serial number/register data.
			var serial_numbers = dataGroup.device_serial_numbers;
			serial_numbers.forEach(function(serial_number) {
				var serialNumber = dataGroup[serial_number];
				var addedSerialNumber = false;
				
				// Add the device serial number to the data category array
				dataCategories.push(serial_number.toString());

				// Add the time header.
				dataNames.push('time');

				// Add each required registers & align the data category array.
				serialNumber.registers.forEach(function(register) {
					// Align the device serial number to its data
					dataCategories.push('');
					dataNames.push(register.name);
				});

				// Add the error code header & align the data category.
				dataCategories.push('');
				dataNames.push('error code');
			});

			// Define the header data as a combination of the dataCategories and
			// dataNames arrays.
			var headerData = [dataCategories, dataNames];

			var isEnabled = dataGroup.logging_options.write_to_file;

			// Establish the group's name.
			var groupName = '';
			var groupFilePrefixType = typeof(dataGroup.logging_options.file_prefix);
			var groupNameType = typeof(dataGroup.group_name);
			if(groupFilePrefixType === 'string') {
				groupName = dataGroup.logging_options.file_prefix;
			} else if(groupNameType === 'string') {
				groupName = dataGroup.group_name;
			} else {
				// Default to the data group's key.
				groupName = data_group;
			}

			// Save the headerData to the logData object.
			self.logData[data_group] = {
				'headerData': headerData,
				'enabled': isEnabled,
				'group_name': groupName,
			};
		});
	}

	function reportLoggerState() {
		var loggerState = {
			'enabled': self.state.enabled,
			'data_groups': {},
		};
		var keys = Object.keys(self.logData);
		keys.forEach(function(key) {
			dataGroup = self.logData[key];
			loggerState[key] = dataGroup.enabled;
		});
		self.emit(DATA_LOGGER_EVENTS.DATA_LOGGER_STATE_UPDATE, loggerState);
	}

	function innerConfigureDataLogger(config) {
		var defered = q.defer();
		// Save the loaded configuration.
		self.config = config;

		// Initialize the logData.
		initializeLogData();

		// Report the logger's state.
		reportLoggerState();

		defered.resolve(config);
		return defered.promise;
	}

	function innerStartDataLogger(bundle) {
		var defered = q.defer();

		// Initialize the data logger statistics object.
		initializeStats();

		defered.resolve(bundle);
		return defered.promise;
	}

	function innerStopDataLogger(bundle) {
		var defered = q.defer();

		// Finalize the data logger's statistics object.
		finalizeStats();
		defered.resolve(bundle);
		return defered.promise;
	}

	function saveNewData(data) {
		console.log('Saving Data!!');
	}
	/* Externally Accessable functions */
	this.onNewData = function(data) {
		var saveData = false;
		// Check to see if the logger is enabled.
		if(self.state.enabled) {
			// Check to see if the data group is enabled for logging.
			if(self.logData[data.groupKey].enabled) {
				saveData = true;
			}
		}
		if(saveData) {
			saveNewData(data);
		} else {
			console.log(
				'Not Saving Data.... :(',
				self.state.enabled,
				self.logData[data.groupKey].enabled
			);
		}
	};
	this.configure = function(bundle) {
		return innerConfigureDataLogger(bundle);
	};
	this.unconfigure = function(bundle) {
		return innerUnconfigureDataLogger(bundle);
	};
	this.start = function(bundle) {
		return innerStartDataLogger(bundle);
	};
	this.stop = function(bundle) {
		return innerStopDataLogger(bundle);
	};

	// Special functions to allow for on-the-fly enabling & disabling of logging.
	this.enableLogging = function(bundle) {
		return innerEnableLogging(bundle);
	};
	this.disableLogging = function(bundle) {
		return innerDisableLogging(bundle);
	};
	this.enableGroupLogging = function(bundle) {
		return innerEnableGroupLogging(bundle);
	};
	this.disableGroupLogging = function(bundle) {
		return innerDisableGroupLogging(bundle);
	};
	var self = this;
}

util.inherits(CREATE_DATA_LOGGER, EventEmitter);

exports.create = function() {
	return new CREATE_DATA_LOGGER();
};