/* 
 * This file is in charge of saving collected data to files.
 */

var EventEmitter = require('events').EventEmitter;
var util = require('util');
var q = require('q');
var async = require('async');
var path = require('path');
var fs = require('fs');
var fse = require('fs-extra');

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
[name] + '-' + [group_name] + "-config" + file_ending(.csv)
[name] + '-' + [group_name] + "-data" + extraTextToBeUnique("_0" ... "_100") + file_ending(.csv)


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

DEFAULT_ROOT_DIR = path.join(DEFAULT_ROOT_DIR, 'labjack_data_logger');
var DEFAULTS = {
	'ROOT_DIRECTORY': DEFAULT_ROOT_DIR,

	// Define the default num data points per file.
	'MAX_SAMPLES_PER_FILE': 65535,

	// Define the default set of characters to include at the end of a line
	'LINE_ENDING': '\r\n',

	// Define the default value separator.
	'VALUE_SEPARATOR': ',',

	// Define the data-file ending string.
	'FILE_NAME_ENDING': '-data',

	// Define the default file extension string.
	'FILE_EXTENSION': '.csv',

	// Define the default time stamp format
	'TIME_STAMP_FORMAT': 'default',
};



var DEFAULT_NUM_DATA_POINTS = 65536;

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

function print() {
	var dataToPrint = [];
	dataToPrint.push('(data_logger.js)');
	for(var i = 0; i < arguments.length; i++) {
		dataToPrint.push(arguments[i]);
	}
	console.log.apply(console, dataToPrint);
}

function debugLogFiles() {
	if(false) {
		print.apply(this,arguments);
	}
}

function debugDataSaving() {
	if(false) {
		print.apply(this,arguments);
	}
}

function CREATE_DATA_LOGGER() {
	// Default Root Directory
	this.rootDirectory = DEFAULTS.ROOT_DIRECTORY;

	this.state = {
		'configured': false,
		'running': false,
		'initialized': false,
		'enabled': false,
		'name': '',
		'dir': '',
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
		var logging_config = self.config.logging_config;

		// Determine if the logger should actually save data.
		self.state.enabled = logging_config.write_to_file;

		// Establish the logger's name.
		var nameType = typeof(logging_config.name);
		var filePrefixType = typeof(logging_config.file_prefix);
		if(filePrefixType === 'string') {
			self.state.name = logging_config.file_prefix;
		} else if(nameType === 'string') {
			self.state.name = logging_config.name;
		} else {
			self.state.name = 'default_config';
		}

		// Initialize the logData object.
		self.logData = undefined;
		self.logData = {};
		
		// Parse the config file for various data.
		var data_groups = self.config.data_groups;
		data_groups.forEach(function(data_group) {
			// Get the dataGroup object.
			var dataGroup = self.config[data_group];
			var logging_options = dataGroup.logging_options;

			// Build an object that stores the enabled/disabled logging states.
			var logStatus = {};

			// Compile the header object that should be inserted above the data
			// in each output file.
			var dataCategories = [];
			var dataNames = [];

			// Add device serial number/register data.
			var serial_numbers = dataGroup.device_serial_numbers;
			serial_numbers.forEach(function(serial_number) {
				logStatus[serial_number] = {};
				var serialNumber = dataGroup[serial_number];
				var addedSerialNumber = false;
				
				// Add the device serial number to the data category array
				dataCategories.push('SN: ' + serial_number.toString());

				// Add the time header.
				dataNames.push('time');

				// Add each required registers & align the data category array.
				serialNumber.registers.forEach(function(register) {
					// Save the enabled/disabled logging state.
					logStatus[serial_number][register.name] = register.enable_logging;

					// Check to see if the register is enabled for logging
					if(register.enable_logging) {
						// Align the device serial number to its data
						dataCategories.push('');
						dataNames.push(register.name);
					}
				});

				// Add the error code header & align the data category.
				dataCategories.push('');
				dataNames.push('error code');
			});

			if(dataGroup.defined_user_values) {
				var addedUserValueCategory = false;

				var user_value_keys = dataGroup.defined_user_values;
				var userValues = dataGroup.user_values;
				user_value_keys.forEach(function(user_value_key) {
					var userValue = userValues[user_value_key];
					if(userValue.enable_logging) {
						if(!addedUserValueCategory) {
							dataCategories.push('User Values');
							addedUserValueCategory = true;
						} else {
							dataCategories.push('');
						}
						dataNames.push(userValue.name);
					}
				})
			}

			// Define the header data as a combination of the dataCategories and
			// dataNames arrays.
			var headerData = [['Data Categories'],dataCategories, dataNames];

			var isEnabled = logging_options.write_to_file;

			// Establish the group's name.
			var groupName = '';
			var groupFilePrefixType = typeof(logging_options.file_prefix);
			var groupNameType = typeof(dataGroup.group_name);
			if(groupFilePrefixType === 'string') {
				groupName = logging_options.file_prefix;
			} else if(groupNameType === 'string') {
				groupName = dataGroup.group_name;
			} else {
				// Default to the data group's key.
				groupName = data_group;
			}

			var options = {
				numDataPoints: DEFAULTS.MAX_SAMPLES_PER_FILE,
				lineEnding: DEFAULTS.LINE_ENDING,
				valueSeparator: DEFAULTS.VALUE_SEPARATOR,
				fileNameEnding: DEFAULTS.FILE_NAME_ENDING,
				fileExtension: DEFAULTS.FILE_EXTENSION,
			};

			var dataMap = [
				{
					'config_str': 'max_samples_per_file',
					'saveStr': 'numDataPoints',
					verify: function(val) { return !isNaN(val);},
					coerce: function(val) {return parseInt(val);},
				}, {
					'config_str': 'line_ending',
					'saveStr': 'lineEnding',
					verify: function(){return true;},
					coerce: function(val) {return val;},
				}, {
					'config_str': 'value_separator',
					'saveStr': 'valueSeparator',
					verify: function(){return true;},
					coerce: function(val) {return val;},
				}, {
					'config_str': 'file_name_ending',
					'saveStr': 'fileNameEnding',
					verify: function(){return true;},
					coerce: function(val) {return val;},
				}, {
					'config_str': 'file_extension',
					'saveStr': 'fileExtension',
					verify: function(){return true;},
					coerce: function(val) {return val;},
				}];

			dataMap.forEach(function(valMap) {
				if(logging_config[valMap.config_str]) {
					if(valMap.verify(logging_config[valMap.config_str])) {
						options[valMap.saveStr] = valMap.coerce(logging_config[valMap.config_str]);
					}
				}
				if(logging_options[valMap.config_str]) {
					if(valMap.verify(logging_options[valMap.config_str])) {
						options[valMap.saveStr] = valMap.coerce(logging_options[valMap.config_str]);
					}
				}
			});

			var lineEndingText = DEFAULTS.LINE_ENDING;
			var valueSeparatorText = DEFAULTS.VALUE_SEPARATOR;
			var fileNameEndingText = DEFAULTS.FILE_NAME_ENDING;
			var fileExtensionText = DEFAULTS.FILE_EXTENSION;

			// Save the headerData to the logData object.
			self.logData[data_group] = {
				'headerData': headerData,
				'enabled': isEnabled,
				'group_name': groupName,
				'dir': '',
				'numDataPoints': options.numDataPoints,
				'line_ending': options.lineEnding,
				'value_separator': options.valueSeparator,
				'file_name_ending': options.fileNameEnding,
				'file_extension': options.fileExtension,
				'file_stream_active': false,
				'file_path': '',
				'file_stream': undefined,
				'file_stream_buffer': [],
				'num_written_lines': 0,
				'logStatus': logStatus,
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

	function initializeDirectory(dir) {
		var defered = q.defer();
		fse.ensureDir(dir, function(err) {
			if(err) {
				fse.ensureDir(dir, function(err) {
					if(err) {
						defered.reject(dir);
					} else {
						defered.resolve(dir);
					}
				});
			} else {
				defered.resolve(dir);
			}
		});
		return defered.promise;
	}

	function initializeFileWriteStream(filePath) {
		var defered = q.defer();
		var file = fs.createWriteStream(filePath);
		file.on('open', function(fd) {
			debugLogFiles('Initialized file write stream');
			defered.resolve(file);
		});
		file.on('error', function(err) {
			console.error('Error initializing file write stream', err);
			defered.reject(err);
		});
		return defered.promise;
	}

	function finalizeFileWriteStream(fileStream) {
		var defered = q.defer();
		fileStream.once('finish', function() {
			defered.resolve(fileStream);
		});

		debugLogFiles('Finalizing file write stream');
		fileStream.end();
		return defered.promise;
	}

	function initializeRootDirectory(bundle) {
		var defered = q.defer();
		function onSuccess() {
			defered.resolve(bundle);
		}
		function onError() {
			defered.reject(bundle);
		}

		initializeDirectory(self.rootDirectory)
		.then(onSuccess, onError);
		return defered.promise;
	}
	function getUniqueDirectory(baseDir) {
		var defered = q.defer();
		var baseName = path.basename(baseDir);

		var directoryName = path.dirname(baseDir);
		var files = fs.readdirSync(directoryName);
		var folders = [];
		var isUnique = true;
		files.forEach(function(file) {
			var dir = path.join(directoryName, file);
			var isDirectory = fs.statSync(dir).isDirectory();
			if(isDirectory) {
				folders.push(file);
				if(file === baseName) {
					isUnique = false;
				}
			}
		});

		var uniqueName = baseName;
		if(!isUnique) {
			var i = 1;
			while(folders.indexOf(uniqueName) >= 0) {
				uniqueName = baseName + '_' + i.toString();
				i += 1;
			}
		}
		var uniqueDir = path.join(directoryName, uniqueName);
		defered.resolve(uniqueDir);
		return defered.promise;
	}
	function getUniqueFilePath(baseDir) {
		var defered = q.defer();
		var baseName = path.basename(baseDir);
		var extName = path.extname(baseDir);
		var fileName = baseName.slice(0, baseName.length - extName.length);

		var directoryName = path.dirname(baseDir);
		var files = fs.readdirSync(directoryName);
		var fileList = [];
		var isUnique = true;
		files.forEach(function(file) {
			var dir = path.join(directoryName, file);
			var isFile = fs.statSync(dir).isFile();
			if(isFile) {
				fileList.push(file);
				if(file === baseName) {
					isUnique = false;
				}
			}
		});

		var uniqueName = baseName;
		if(!isUnique) {
			var i = 1;
			while(fileList.indexOf(uniqueName) >= 0) {
				uniqueName = fileName + '_' + i.toString() + extName;
				i += 1;
			}
		}
		var uniqueFilePath = path.join(directoryName, uniqueName);
		defered.resolve(uniqueFilePath);
		return defered.promise;
	}

	function getCreateDirectory(objToUpdate) {
		return function createDirectory(dirToCreate) {
			var defered = q.defer();
			function onSuccess() {
				objToUpdate.dir = dirToCreate;
				defered.resolve(dirToCreate);
			}
			function onError(err) {
				defered.reject(err);
			}
			initializeDirectory(dirToCreate)
			.then(onSuccess, onError)
			.catch(onError)
			.done();
			return defered.promise;
		};
	}
	function initializeLoggerDirectory(bundle) {
		var defered = q.defer();
		var loggerDir = path.join(self.rootDirectory,self.state.name);

		function onSuccess() {
			defered.resolve(bundle);
		}
		function onError(err) {
			defered.reject(bundle);
		}

		getUniqueDirectory(loggerDir)
		.then(getCreateDirectory(self.state))
		.then(onSuccess, onError)
		.catch(onError)
		.done();
		return defered.promise;
	}

	
	function initializeDataGroupDirectory(data_group) {
		var defered = q.defer();

		var dataGroup = self.logData[data_group];
		var groupDir = path.join(self.state.dir, dataGroup.group_name);
		function onSuccess() {
			defered.resolve(data_group);
		}
		function onError() {
			defered.reject(data_group);
		}

		getUniqueDirectory(groupDir)
		.then(getCreateDirectory(dataGroup))
		.then(onSuccess, onError);
		return defered.promise;
	}
	function getEnabledDataGroupKeys() {
		var groupKeys = Object.keys(self.logData);
		var enabledGroupKeys = [];
		groupKeys.forEach(function(groupKey) {
			var groupData = self.logData[groupKey];
			if(groupData.enabled) {
				enabledGroupKeys.push(groupKey);
			}
		});
		return enabledGroupKeys;
	}
	function initializeDataGroupDirectories(bundle) {
		var defered = q.defer();

		var enabledGroupKeys = getEnabledDataGroupKeys();
		var promises = enabledGroupKeys.map(initializeDataGroupDirectory);

		q.allSettled(promises)
		.then(function() {
			defered.resolve(bundle);
		}).done();
		return defered.promise;
	}

	function initializeFolderStructure(bundle) {
		var defered = q.defer();

		initializeRootDirectory(bundle)
		.then(initializeLoggerDirectory, defered.reject)
		.then(initializeDataGroupDirectories, defered.reject)
		.then(defered.resolve, defered.reject)
		.catch(defered.reject)
		.done();
		return defered.promise;
	}

	function getCreateLogFileWriteStream(objToUpdate) {
		return function createLogFileWriteStream(filePath) {
			var defered = q.defer();
			function onSuccess(fileStream) {
				// Make sure that the file stream is not yet active as the heder
				// data still needs to be written.
				objToUpdate.file_stream_active = false;
				objToUpdate.file_path = filePath;
				objToUpdate.file_stream = fileStream;
				defered.resolve(fileStream);
			}
			function onError(err) {
				defered.reject(err);
			}
			initializeFileWriteStream(filePath)
			.then(onSuccess, onError)
			.catch(onError)
			.done();
			return defered.promise;
		};
	}


	function initializeLogFile(data_group) {
		var defered = q.defer();

		var dataGroup = self.logData[data_group];
		var groupDir = dataGroup.dir;

		var logName = self.state.name;
		var groupName = dataGroup.group_name;
		var logFileAppendText = dataGroup.file_name_ending;
		var fileExtensionType = dataGroup.file_extension;

		var logFileName = logName + '-' + groupName + logFileAppendText + fileExtensionType;
		var filePath = path.join(groupDir, logFileName);
		
		function onSuccess() {
			debugLogFiles('Successfully initialized log file', groupName);
			defered.resolve(data_group);
		}
		function onError(err) {
			console.error('Error initializing log file', groupName, err);
			defered.reject(data_group);
		}

		debugLogFiles('Initializing log file', groupName, filePath);
		getUniqueFilePath(filePath)
		.then(getCreateLogFileWriteStream(dataGroup))
		.then(onSuccess, onError);
		return defered.promise;
	}
	function initializeLogFiles(bundle) {
		var defered = q.defer();

		debugLogFiles('Initializing log files');
		var enabledGroupKeys = getEnabledDataGroupKeys();
		var promises = enabledGroupKeys.map(initializeLogFile);

		q.allSettled(promises)
		.then(function() {
			defered.resolve(bundle);
		}).done();
		return defered.promise;
	}

	function initializeLogFileHeader(data_group) {
		var defered = q.defer();

		var dataGroup = self.logData[data_group];
		var groupDir = dataGroup.dir;

		var logName = self.state.name;
		var groupName = dataGroup.group_name;
		var line_ending = dataGroup.line_ending;
		var value_separator = dataGroup.value_separator;
		var fileStream = dataGroup.file_stream;

		var fileData = '';

		var headerData = dataGroup.headerData;
		headerData.forEach(function(headerRow) {
			headerRow.forEach(function(headerCol) {
				fileData += headerCol.toString() + value_separator;
			});
			fileData += line_ending;
		});
		
		function onSuccess() {
			debugLogFiles('Successfully initialized log file header', groupName);

			// Indicate that the file stream is active and ready to be written to.
			self.logData[data_group].file_stream_active = true;

			// At this point it is safe to re-set the number of lines written to
			// the current file.
			self.logData[data_group].num_written_lines = 0;

			defered.resolve(data_group);
		}

		debugLogFiles('Initializing log file header', groupName);
		fileStream.write(fileData, onSuccess);
		return defered.promise;
	}
	function initializeLogFileHeaders(bundle) {
		var defered = q.defer();

		debugLogFiles('Initializing log file headers');
		var enabledGroupKeys = getEnabledDataGroupKeys();
		var promises = enabledGroupKeys.map(initializeLogFileHeader);

		q.allSettled(promises)
		.then(function() {
			defered.resolve(bundle);
		}).done();
		return defered.promise;
	}

	function finalizeLogFile(data_group) {
		var defered = q.defer();

		var dataGroup = self.logData[data_group];
		var groupName = dataGroup.group_name;
		var fileStream = dataGroup.file_stream;

		function onSuccess() {
			debugLogFiles('Successfully Finalized log file', groupName);
			defered.resolve(data_group);
		}
		function onError(err) {
			console.error('Error finalizing log file', groupName, err);
			defered.reject(data_group);
		}

		debugLogFiles('Finalizing log file', groupName);
		finalizeFileWriteStream(fileStream)
		.then(onSuccess, onError);
		return defered.promise;
	}
	function finalizeLogFiles(bundle) {
		
		var defered = q.defer();

		debugLogFiles('Finalizing log files');
		var enabledGroupKeys = getEnabledDataGroupKeys();
		var promises = enabledGroupKeys.map(finalizeLogFile);

		q.allSettled(promises)
		.then(function() {
			defered.resolve(bundle);
		}).done();
		return defered.promise;
	}

	function innerStartDataLogger(bundle) {
		var defered = q.defer();

		// Initialize the data logger statistics object.
		initializeStats();

		// Perform a full initialization of the directory structure.
		initializeFolderStructure(bundle)
		.then(initializeLogFiles, defered.reject)
		.then(initializeLogFileHeaders, defered.reject)
		.then(defered.resolve, defered.reject)
		.catch(defered.reject)
		.done();
		return defered.promise;
	}

	function innerStopDataLogger(bundle) {
		var defered = q.defer();

		// Finalize the data logger's statistics object.
		finalizeStats();

		var remainingData = {};
		var enabledGroupKeys = getEnabledDataGroupKeys();
		enabledGroupKeys.forEach(function(key) {
			remainingData[key] = self.logData[key].file_stream_buffer;
		});
		debugDataSaving('Remaining Data', remainingData);
		finalizeLogFiles(bundle)
		.then(defered.resolve, defered.reject)
		.catch(defered.reject)
		.done();
		return defered.promise;
	}

	function formatTimeStamp(timeStamp) {
		return timeStamp.toString();
	}

	function saveNewDataToBuffer(data) {
		var groupData = self.logData[data.groupKey];
		var line_ending = groupData.line_ending;
		var value_separator = groupData.value_separator;
		
		var dataToWrite = '';
		var dataGroups = data.data;
		var serialNumbers = [];
		var userValues;
		var groupKeys = Object.keys(dataGroups);
		groupKeys.forEach(function(groupKey) {
			if(groupKey !== 'userValues') {
				serialNumbers.push(groupKey);
			} else {
				userValues = dataGroups[groupKey];
			}
		});
		serialNumbers.forEach(function(serialNumber) {
			var deviceData = dataGroups[serialNumber];
			
			// Get and format the time stamp
			var time = formatTimeStamp(deviceData.time);
			dataToWrite += time + value_separator;

			var resultKeys = Object.keys(deviceData.results);
			resultKeys.forEach(function(resultKey) {
				// Determine if the result should be logged.
				var logData = groupData.logStatus[serialNumber][resultKey];

				var result = deviceData.results[resultKey];
				debugDataSaving('Result', serialNumber, result, logData);
				// If the result should be logged then save the result to the
				// string to be written.
				if(logData) {
					if(result.str) {
						dataToWrite += result.str + value_separator;
					} else {
						dataToWrite += result.result.toString() + value_separator;
					}
				}
			});

			dataToWrite += deviceData.errorCode.toString() + value_separator;
		});

		if(userValues) {
			var userValueKeys = Object.keys(userValues);
			debugDataSaving('Saving User Values', userValueKeys)
			userValueKeys.forEach(function(userValueKey) {
				debugDataSaving('User Val', userValueKey, userValues[userValueKey]);
				dataToWrite += userValues[userValueKey] + value_separator;
			});
		}
		// Add the line ending text.
		dataToWrite += line_ending;

		// Add the formatted data to the internal buffer.
		groupData.file_stream_buffer.push(dataToWrite);
	}
	function saveNewData(data) {
		debugDataSaving('Saving Data!!', data.groupKey, self.logData[data.groupKey].num_written_lines);

		// Format data & add it to the file_stream_buffer
		try {
			saveNewDataToBuffer(data);
		} catch(err) {
			console.error('(data_logger.js) Error executing saveNewDataToBuffer', err);
		}
		
		var groupKey = data.groupKey;
		var groupData = self.logData[data.groupKey];
		var file_stream_buffer = groupData.file_stream_buffer;
		var fileStream = groupData.file_stream;
		var isActive = groupData.file_stream_active;
		var ok = true;
		var isData = file_stream_buffer.length > 0;
		var initializeNewFile = false;
		/*
		 * 1. While there is data to be written.
		 * 2. the stream is healthy:
		      https://nodejs.org/api/stream.html#stream_event_drain
		 * 3. The stream buffer is active (not in the middle of changing files).
		 *
		 */
		debugDataSaving('Writing data', isData, ok, isActive);
		while((isData) && (ok) && (isActive)) {
			// un-shift one line of data.
			var dataToWrite = file_stream_buffer.shift(1);

			ok = fileStream.write(dataToWrite);

			// Update necessary values.
			isData = file_stream_buffer > 0;
			groupData.num_written_lines += 1;

			// Detect if we should switch to a new file
			if(groupData.num_written_lines >= groupData.numDataPoints) {
				// De-activate the current file stream to break out of the loop.
				isActive = false;
				groupData.file_stream_active = false;

				// Indicate that we need to switch to a new file.
				initializeNewFile = true;
			}
		}

		if(initializeNewFile) {
			debugLogFiles('Switching to a new file:', groupData.num_written_lines);
			finalizeLogFile(groupKey)
			.then(initializeLogFile)
			.then(initializeLogFileHeader)
			.catch(function switchFileError(err) {
				console.error('(data_logger.js) Error switching to new file.', err);
			})
			.done();
		}
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
			try {
				saveNewData(data);
			} catch(err) {
				print('Error saving data', err, err.stack);
			}
		} else {
			print(
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