var fs = require('fs');             //Load File System module
var os = require('os');             //Load OS module
var path = require('path');
var EventEmitter = require('events').EventEmitter;
var util = require('util');

// Make this modune an event-emitter:
// module.exports = new EventEmitter();
// to emmit an event:
// module.exports.emit('ready');

const q = require('q');
var dict;
var async;
var exposedLibs;
var task_manager;

var task_state = '';
var isStarted = false;
var startDefered;
var updateIntervalHandled;
var dataBuffersDict;
var bufferModifications;
var activeDataBuffersDict;
var dataBuffers;

function createNewBuffer(initData) {
	this.bufferInfo = {};
	this.dataBuffers = [];

	// values that get initialized
	this.key = '';
	this.maxNumRows = 65535;
	this.curNumRows = 0;
	this.curNumFiles = 0;
	this.writeDelay = 1;
	this.curDelay = 1;
	this.activeBuffer = 0;
	this.inactiveBuffer = 1;

	this.fileReferences = new Map();

	var lastProcessTime = 0;
	var getTimeDifference = function() {
		var d = new Date();
		var newTime = (d.getMinutes() * 60 + d.getSeconds())*1000 + d.getMilliseconds();
		var retTime = 0;
		if(lastProcessTime === 0) {
			lastProcessTime = newTime;
			return retTime;
		} else {
			retTime = newTime - lastProcessTime;
			lastProcessTime = newTime;
			return retTime;
		}
	};
	var init = function(data) {
		var keys = Object.keys(data);

		// Default values
		var newBufferInfo = {
			'formatting': {
				'lineEnding': '\r\n',
				'valueSeparation': ', ',
				'misingValue': '0.000000001'
			},
			'includeHeaderInfo': false,
			'maxNumRows': 65535,
			'writeDelay': 1,
			'curDelay': 1,
			'activeBuffer': 0,
			'inactiveBuffer': 1
		};
		keys.forEach(function(givenKey) {
			newBufferInfo[givenKey] = data[givenKey];
		});
		var transferKeys = [
			'key',
			'maxNumRows',
			'writeDelay',
			'curDelay',
			'activeBuffer',
			'inactiveBuffer'
		];
		transferKeys.forEach(function(transferKey) {
			self[transferKey] = newBufferInfo[transferKey];
			newBufferInfo[transferKey] = undefined;
			delete newBufferInfo[transferKey];
		});
		var keysList = newBufferInfo.dataKeys;
		var lastKey = keysList[keysList.length - 1];
		newBufferInfo.lastKey = lastKey;

		var uniqueFileName = newBufferInfo.fileName;
		var uniqueStr = '';
		var makeUnique = true;
		while(makeUnique) {
			var fileName = newBufferInfo.fileName;
			var fileEnding = newBufferInfo.fileEnding;
			var fileLocation = newBufferInfo.location;
			var chkFP = path.join(fileLocation, fileName + uniqueStr + fileEnding);
			if(fs.existsSync(chkFP)) {
				uniqueStr += '_';
			} else {
				makeUnique = false;
				uniqueFileName = fileName + uniqueStr;
			}
		}
		newBufferInfo.currentFileName = newBufferInfo.fileName;
		newBufferInfo.uniqueFileName = uniqueFileName;
		newBufferInfo.numFilesCreated = 0;
		self.bufferInfo = newBufferInfo;
		self.dataBuffers = [[],[]];
		self.fileReferences = new Map();

		getTimeDifference();
	};

	
	var getIncrementalFileName = function(increment) {
		return self.bufferInfo.fileName + '_' + increment.toString();
	};
	var getNextBuffer = function(cur) {
		var retInt = cur + 1;
		if(retInt > 1) {
			retInt = 0;
		}
		return retInt;
	};
	this.getUniqueFilePath = function(bundle) {
		var fileNumber = bundle.fileNumber;
		bundle.uniqueFilePath = '';
		var defered = q.defer();
		var buildUniqueFilePath = function(num, uniqStr) {
			var fileName = self.bufferInfo.uniqueFileName;
			var fileEnding = self.bufferInfo.fileEnding;
			var location = self.bufferInfo.location;
			var incStr = '_' + num.toString();
			return path.join(location, uniqStr + fileName + incStr + fileEnding);
		};
		var uniqStr = '';
		var uniqueFilePath = buildUniqueFilePath(fileNumber, uniqStr);
		var makeUnique = function(exists) {
			if(exists) {
				uniqStr += '*';
				uniqueFilePath = buildUniqueFilePath(fileNumber, uniqStr);
				fs.exists(uniqueFilePath, makeUnique);
			} else {
				bundle.uniqueFilePath = uniqueFilePath;
				defered.resolve(bundle);
			}
		};
		fs.exists(uniqueFilePath, makeUnique);
		return defered.promise;
	};
	this.createFileStream = function(bundle) {
		var defered = q.defer();
		var newWriteStream = fs.createWriteStream(bundle.uniqueFilePath);
		newWriteStream.once('open', function() {
			self.curNumFiles += 1;
			bundle.fileStream = newWriteStream;
			defered.resolve(bundle);
		});
		return defered.promise;
	};
	this.saveFileStream = function(bundle) {
		var defered = q.defer();
		var newFileRefKey = getIncrementalFileName(bundle.fileNumber);
		self.fileReferences.set(newFileRefKey, bundle.fileStream);
		defered.resolve(bundle);
		return defered.promise;
	};
	this.writeToStream = function(fileNum, data) {
		var defered = q.defer();
		var fileKey = getIncrementalFileName(fileNum);
		if(!self.fileReferences.has(fileKey)) {
			console.log('in writeToStream, stream DNE', fileNum, self.fileReferences.size);
			self.fileReferences.forEach(function(stream, key) {
				console.log(key);
			});
		}
		self.fileReferences.get(fileKey).write(data, function() {
			defered.resolve();
		});
		return defered.promise;
	};
	this.stringifyHeaderData = function() {
		return '';
	};
	this.writeFileHeader = function(bundle) {
		var defered = q.defer();

		var strData = '';
		if(self.bufferInfo.includeHeaderInfo) {
			strData += self.stringifyHeaderData();
		}
		self.bufferInfo.dataKeys.forEach(function(dataKey) {
			if(dataKey !== self.bufferInfo.lastKey) {
				strData += (dataKey + self.bufferInfo.formatting.valueSeparation);
			} else {
				strData += (dataKey + self.bufferInfo.formatting.lineEnding);
			}
		});
		self.writeToStream(bundle.fileNumber, strData)
		.then(function() {
			defered.resolve(bundle);
		}, function(err) {
			console.log('Error writing header', err);
			defered.reject(bundle);
		});
		return defered.promise;
	};
	this.initFile = function(fileNumber) {
		var defered = q.defer();
		// console.log('--- Initializing File', self.curNumFiles, fileNumber);
		
		var initBundle = {
			'fileNumber': fileNumber
		};
		self.getUniqueFilePath(initBundle)
		.then(self.createFileStream)
		.then(self.saveFileStream)
		.then(self.writeFileHeader)
		.then(defered.resolve, defered.reject);

		return defered.promise;
	};
	this.closeFile = function(fileNumber) {
		var defered = q.defer();
		// console.log('--- Closing File', self.curNumFiles, fileNumber);
		var fileRefKey = getIncrementalFileName(fileNumber);
		if(self.fileReferences.has(fileRefKey)) {
			var fileStream = self.fileReferences.get(fileRefKey);
			fileStream.end(function() {
				self.fileReferences.delete(fileRefKey);
				defered.resolve();
			});
		} else {
			console.log('File Key:', fileRefKey, 'does not exist');
			defered.reject();
		}
		return defered.promise;
	};
	this.manageActiveFile = function() {
		var defered = q.defer();
		if(self.curNumFiles === 0) {
			self.initFile(self.curNumFiles)
			.then(defered.resolve, defered.reject);
		} else {
			defered.resolve();
		}
		return defered.promise;
	};
	var convertDataToString = function(dataType, data, curLineCount, maxLineCount) {
		var retObj = [''];
		var curIndex = 0;
		var addLine = function(str) {
			if(self.curNumRows < (self.maxNumRows - 1)) {
				str += self.bufferInfo.formatting.lineEnding;
				retObj[curIndex] += str;
				self.curNumRows += 1;
			} else {
				self.curNumRows = 0;
				self.curNumRows += 1;
				curIndex += 1;
				str += self.bufferInfo.formatting.lineEnding;
				retObj.push(str);
			}
		};
		var handleSingleType = function(newData) {
			var newLine = '';
			self.bufferInfo.dataKeys.forEach(function(dataKey) {
				var newStr = '';
				if(newData[dataKey]) {
					newStr += newData[dataKey];
				} else {
					newStr += self.bufferInfo.formatting.misingValue;
				}
				if(dataKey !== self.bufferInfo.lastKey) {
					newStr += self.bufferInfo.formatting.valueSeparation;
				}
				newLine += newStr;
			});
			addLine(newLine);
		};
		if(dataType === 'raw') {
			var rawStr = '';
			rawStr = data.toString();
			var splitStr = rawStr.split(self.bufferInfo.formatting.lineEnding);
			splitStr.forEach(function(str) {
				addLine(str);
			});
		} else if(dataType === 'single') {
			handleSingleType(data);
		} else if(dataType === 'multiple') {
			var sortedResults = [];
			self.bufferInfo.dataKeys.forEach(function(dataKey) {
				if(data[dataKey]) {
					if(sortedResults.length === 0) {
						data[dataKey].forEach(function(dataPoint) {
							var newDataPoint = {};
							newDataPoint[dataKey] = dataPoint;
							sortedResults.push(newDataPoint);
						});
					} else {
						var i = 0;
						if(data[dataKey].length === sortedResults.length) {
							for(i; i < sortedResults.length; i++) {
								sortedResults[i][dataKey] = data[dataKey][i];
							}
						} else {
							var firstLen = 0;
							var secondLen = 0;
							if(data[dataKey].length > sortedResults.length) {
								firstLen = data[dataKey].length;
								secondLen = sortedResults.length;
								for(i; i < firstLen; i++) {
									sortedResults[i][dataKey] = data[dataKey][i];
								}
								for(i; i < secondLen; i++) {
									sortedResults[i][dataKey] = 0;
								}
							} else {
								firstLen = data[dataKey].length;
								for(i; i < firstLen; i++) {
									sortedResults[i][dataKey] = data[dataKey][i];
								}
							}
							throw new Error('Error adding data to buffer, mis-matched size');
						}
					}
				}
			});
			for(i = 0; i < sortedResults.length; i++) {
				var sortedResult = sortedResults[i];
				handleSingleType(sortedResult);
			}
		}
		return retObj;
	};
	this.swapAndSaveBuffer = function(activeIndex, inactiveIndex) {
		var defered = q.defer();
		// Swap the active buffer and then save its data
		self.activeBuffer = getNextBuffer(activeIndex);
		self.inactiveBuffer = getNextBuffer(inactiveIndex);

		// Save the buffer's data locally and empty the buffers contents
		var newData = self.dataBuffers[activeIndex];
		self.dataBuffers[activeIndex] = [];

		defered.resolve(newData);
		return defered.promise;
	};
	this.transformDataToFileArrays = function(newData) {
		var defered = q.defer();
		var streamNum = self.curNumFiles - 1;
		var fileKey = getIncrementalFileName(streamNum);
		var filesData = [{
			'data': '',
			'createNewFile': false,
			'num':streamNum,
			'fileKey': fileKey,
			'closeFile': false
		}];
		var curIndex = 0;
		var addDataToFilesData = function(newFileData) {
			if(newFileData.length === 1) {
				filesData[curIndex].data += newFileData.pop();
			} else {
				filesData[curIndex].data += newFileData[0];
				filesData[curIndex].closeFile = true;
				for (i = 1; i < newFileData.length; i++) {
					curIndex += 1;
					var streamNum = self.curNumFiles - 1 + curIndex;
					var fileKey = getIncrementalFileName(streamNum);
					filesData.push({
						'data': '',
						'createNewFile': true,
						'num': streamNum,
						'fileKey': fileKey,
						'closeFile': false
					});
					filesData[curIndex].data += newFileData[i];
				}
			}
		};
		newData.forEach(function(newDataObj) {
			var data = newDataObj.data;
			var dataType = newDataObj.dataType;
			if(Array.isArray(data)) {
				data.forEach(function(dataPoint) {
					var newConvertedData = convertDataToString(dataType, dataPoint);
					addDataToFilesData(newConvertedData);
				});
			} else {
				var newConvertedData = convertDataToString(dataType, data);
				addDataToFilesData(newConvertedData);
			}
			
		});
		defered.resolve(filesData);
		return defered.promise;
	};
	this.qCloseFile = function(fd) {
		var defered = q.defer();
		if(fd.closeFile) {
			self.closeFile(fd.num)
			.then(function() {
				defered.resolve(fd);
			}, function() {
				defered.resolve(fd);
			});
		} else {
			defered.resolve(fd);
		}
		return defered.promise;
	};
	this.qInitFile = function(fd) {
		var defered = q.defer();
		if(fd.createNewFile) {
			self.initFile(fd.num)
			.then(function() {
				defered.resolve(fd);
			}, function() {
				defered.resolve(fd);
			});
		} else {
			defered.resolve(fd);
		}
		return defered.promise;
	};
	this.qSaveData = function(fd) {
		var fileData = fd.data;
		var defered = q.defer();
		self.writeToStream(fd.num, fileData)
		.then(function() {
			defered.resolve(fd);
		}, function(err) {
			console.log('Error writing header', err);
			defered.resolve(fd);
		});
		
		return defered.promise;
	};
	this.saveDataToFile = function(fd) {
		// console.log('*** in saveDataToFile ***');
		// var keys = Object.keys(fd);
		// keys.forEach(function(key) {
		// 	if(key !== 'data') {
		// 		console.log('\t' + key, fd[key]);
		// 	} else {
		// 		console.log('\t' + 'num new rows', fd[key].split('\r\n').length);
		// 	}
		// });

		var saveToNewFile = fd.createNewFile;
		var defered = q.defer();
		// establish an execution queue, initialize a file stream if necessary
		self.qInitFile(fd)

		// Save data to the file stream
		.then(self.qSaveData)

		// Close the file stream if necessary
		.then(self.qCloseFile)

		// Resolve & return
		.then(defered.resolve, defered.reject);
		return defered.promise;
	};
	this.saveDataToFiles = function(filesData) {
		var defered = q.defer();
		async.each(
			filesData,
			function(fileData, callback) {
				self.saveDataToFile(fileData)
				.then(function() {
					callback();
				}, function(err) {
					console.log('error in SavingDataToFile', err);
					callback();
				});
			}, function(err) {
				if(err) {
					console.log('err', err);
				} else {
					defered.resolve();
				}
			});
		return defered.promise;
	};
	this.bufferAndWriteData = function() {
		var defered = q.defer();
		var activeIndex = self.activeBuffer;
		var inactiveIndex = self.inactiveBuffer;
		console.log('Processing Buffer:', self.key, activeIndex, inactiveIndex, self.curNumRows, getTimeDifference());
		if(self.dataBuffers[activeIndex].length > 0) {
			
			// Swap and save the buffer contents
			self.swapAndSaveBuffer(activeIndex, inactiveIndex)

			// convert the data into strings to be saved to files
			.then(self.transformDataToFileArrays)

			// Save buffered data to files
			.then(self.saveDataToFiles)

			// Resolve/Return
			.then(defered.resolve, defered.reject);
			
			// self.curNumRows += numNewRows;
		} else {
			defered.resolve();
		}

		return defered.promise;
	};
	this.processStep = function() {
		var defered = q.defer();
		try {
			self.manageActiveFile()
			.then(self.bufferAndWriteData)
			.then(defered.resolve, defered.reject);
		} catch(err) {
			console.log('ERR executeStep', err);
			defered.reject(err);
		}
		return defered.promise;
	};
	this.executeStep = function() {
		var defered = q.defer();
		if(self.curDelay <= 0) {
			self.processStep()
			.then(defered.resolve, defered.reject);
			self.curDelay = self.writeDelay;
		} else {
			self.curDelay -= 1;
			defered.resolve();
		}
		return defered.promise;
	};
	this.flushBuffer = function(callback) {
		console.log('Flushing Buffer');
		self.processStep()
		.then(function() {
			if(self.fileReferences.size > 1) {
				console.error('D_B.js: Something went wrong, more than 1 file open');
				self.fileReferences.forEach(function(fileStream, fileKey) {
					console.error('fileKey', fileKey);
				});
			}
			self.closeFile(self.curNumFiles - 1)
			.then(function() {
				callback();
			}, function(err) {
				console.log('Error closing file stream',err);
				callback();
			});
		}, function(err) {
			console.log('Error executing last step',err);
			callback();
		});
	};
	this.saveDataToBuffer = function(data) {
		var bufIndex = self.activeBuffer;
		self.dataBuffers[bufIndex] = self.dataBuffers[bufIndex].concat(data);
	};
	this.write = function(dataType, data) {
		// var newStr = convertDataToString(dataType, data);
		var newDataPoint = {'dataType': dataType, 'data': data};
		self.saveDataToBuffer(newDataPoint);
	};
	this.writeArray = function(dataType, data) {
		//var newStr = '';
		//data.forEach(function(dataPoint) {
		//	var tempStr = convertDataToString(dataType, dataPoint);
		//	newStr += tempStr;
		//});
		var newData = [];
		data.forEach(function(dataPoint) {
			var newDataPoint = {'dataType': dataType, 'data': dataPoint};
			newData.push(newDataPoint);
		});
		self.saveDataToBuffer(newData);
	};
	var self = this;
	init(initData);
}

/**
 * getTaskState makes it possible for the taskManager to know the status of each
 *  created task.
 * @return {string} the state of the task.  Is hopefully a standard state, but 
 *                      can be an arbitrary string if necessary.
 */
exports.getTaskState = function() {
	return task_state;
};
/**
 * includeTask is the function that the task_manager will call just after 
 * "requiring" the task in order to pass available libraries to the sub-tasks 
 * so that they don't have to require them and create new references to them.
 */
exports.includeTask = function(exposedLibs) {
	exposedLibs = exposedLibs;
	dict = exposedLibs['dict'];
	async = exposedLibs['async'];
	task_manager = exposedLibs['task_manager'];

	// Set state to 'included'
	task_state = task_manager.task_state_options[0];

	// set the interval handler to null
	updateIntervalHandler = undefined;
	isStarted = false;
	startDefered = undefined;
	dataBuffersDict = undefined;
	activeDataBuffersDict = undefined;
	bufferModifications = undefined;

	// console.log('exposedLibs', Object.keys(exposedLibs));
	// console.log('task_manager tasks', task_manager.taskList.size);
};

/**
 * initTask is called by the task_manager when this task needs to be 
 * initialized.  This function should be able to re-set the task to its starting
 * state.  
 * 
 * @return {promise} q-promise
 */
var initTask = function() {
	var defered = q.defer();

	// set the interval handler to null
	updateIntervalHandler = undefined;
	isStarted = false;
	startDefered = undefined;
	dataBuffersDict = new Map();
	activeDataBuffersDict = new Map();
	bufferModifications = [];

	// Set state to 'initialized'
	task_state = task_manager.task_state_options[1];
	defered.resolve();
	return defered.promise;
};
exports.initTask = initTask;
/**
 * isInitialized is a function used specifically for testing.  It allows the 
 * task to report whether or not it was properly initialized.  Making sure that 
 * all libraries are defined, variables initialized, etc.
 * 
 * @return {Boolean} Boolean indicating if the task was initialized properly
 */
exports.isInitialized = function() {
	var is_initialized = true;
	if(typeof(q) === 'undefined' || typeof(q) === 'null' ) {
		is_initialized = false;
	}
	if(typeof(dict) === 'undefined' || typeof(dict) === 'null' ) {
		is_initialized = false;
	}
	if(typeof(async) === 'undefined' || typeof(async) === 'null' ) {
		is_initialized = false;
	}
	// Make sure that the current state isn't invalid or included
	if(task_state === task_manager.task_state_options[0] || task_state === '' ) {
		is_initialized = false;
	}
	// make sure that the updateIntervalHandler is null
	if(typeof(updateIntervalHandler) !== 'undefined') {
		is_initialized = false;
	}
	if(typeof(startDefered) !== 'undefined') {
		is_initialized = false;
	}
	if(isStarted !== false) {
		is_initialized = false;
	}
	if(dataBuffersDict.size !== 0) {
		is_initialized = false;
	}
	if(activeDataBuffersDict.size !== 0) {
		is_initialized = false;
	}
	if(!is_initialized) {
		console.log('task_state', task_state);
		console.log('updateIntervalHandler', updateIntervalHandler);
		console.log('startDefered', startDefered);
		console.log('isStarted', isStarted);
		console.log('dataBuffersDict',dataBuffersDict.size);
		console.log('activeDataBuffersDict',activeDataBuffersDict.size);
	}
	return is_initialized;
};

exports.startTask = function() {
	var taskDefered = q.defer();
	if(task_state === task_manager.task_state_options[1]) {
		task_state = task_manager.task_state_options[2];
		isStarted = false;
		startDefered = taskDefered;
		updateIntervalHandler = setInterval(updateDataBuffers, 1000);
	} else {
		taskDefered.reject();
	}
	return taskDefered.promise;
};

exports.stopTask = function() {
	var taskDefered = q.defer();
	if(typeof(updateIntervalHandler) !== 'undefined') {
		clearInterval(updateIntervalHandler);
		updateIntervalHandler = undefined;
	}
	console.log('Stopping data_buffer.js Task',dataBuffersDict.size, activeDataBuffersDict.size);
	if((dataBuffersDict.size === 0)&&(activeDataBuffersDict.size === 0)) {
		initTask().then(taskDefered.resolve, taskDefered.reject);
	} else {
		var buffersToFlush = [];
		dataBuffersDict.forEach(function(dataBuffer, key) {
			buffersToFlush.push(key);
		});
		async.each(
			buffersToFlush,
			function(key, callback) {
				bufferModifications.push({
					'operation': 'delete',
					'key': key,
					'next': callback
				});
			}, function(err) {
				console.log('Finished Flushing all buffers');
				if(err) {
					taskDefered.reject(err);
				} else {
					taskDefered.resolve();
				}
			}
		);

		
	}
	
	return taskDefered.promise;
};
var getFinishedFlushingBuffer = function(mod) {
	return function() {
		var key = mod.key;
		dataBuffersDict.delete(key);
		activeDataBuffersDict.delete(key);
		mod.next();
	};
};
var updateActiveBuffers = function() {
	//  Perform any active buffer modifications so that operations are thread 
	//  safe.
	if(bufferModifications.length > 0) {
		while(bufferModifications.length > 0) {
			var bufferModification = bufferModifications.pop();
			var key = bufferModification.key;
			if (bufferModification.operation === 'add') {
				activeDataBuffersDict.set(key,dataBuffersDict.get(key));
				// execute the callback indicating that the buffer has been created and added
				bufferModification.next(dataBuffersDict.get(key));
			} else if (bufferModification.operation === 'delete') {
				dataBuffersDict.get(key).flushBuffer(
					getFinishedFlushingBuffer(bufferModification)
				);
			}
		}
	}
};
var updateDataBuffers = function() {
	if (!isStarted) {
		isStarted = true;
		startDefered.resolve();
	}
	if (activeDataBuffersDict.size !== 0) {
		// Set state to active, there are one or more active file buffers
		task_state = task_manager.task_state_options[3];
		var activeBuffers = [];
		activeDataBuffersDict.forEach(function(activeBuffer, key) {
			activeBuffers.push(activeBuffer);
		});
		async.each(
			activeBuffers,
			function(activeBuffer, callback) {
				var getR = function(data) {
					return function(res) {
						console.log('Buffer Update finished', data, res);
					};
				};
				try {
					activeBuffer.executeStep()
					.then(function() {
						callback();
					});
				} catch(err) {
					console.log('Error in data_buffer.js updateDataBuffers', err);
					throw new Error('Error in data_buffer.js updateDataBuffers', err);
				}
			}, function(err) {
				updateActiveBuffers();
			});
	} else {
		// Set state to idle, there are no active file buffers
		task_state = task_manager.task_state_options[2];
		updateActiveBuffers();
	}
};

exports.addOutputBuffer = function(newBufferInfo) {
	var defered = q.defer();
	var requiredKeys = ['key', 'type', 'dataKeys'];
	var localFileKeys = ['location', 'fileName', 'fileEnding'];
	// Formatting should have .csv (comma and semicolon separated) .tsb (tab separated)
	// Should be able to configure time stamp: (http://www.epochconverter.com/epoch/batch-convert.php)
	//     1. Unix/Epoc timestamp (Seconds since Jan 1 1970)
	//     2. Human-Readable %Y-%m-%d %H:%M:%S
	//     3. ISO 8601 format e.g. 2014-11-04T02:35:36+00:00
	// maxNumRows should default to 65535 with options to go larger or smaler
	var remoteFileKeys = ['service'];
	var givenKeys = Object.keys(newBufferInfo);
	var isValidInput = true;

	if (givenKeys.indexOf('type') >= 0) {
		if (newBufferInfo.type === 'localFile') {
			localFileKeys.forEach(function(localFileKey) {
				requiredKeys.push(localFileKey);
			});
		} else if (newBufferInfo.type === 'remote'){
			remoteFileKeys.forEach(function(localFileKey) {
				requiredKeys.push(localFileKey);
			});
		} else {
			isValidInput = false;
			console.error('Invalid type key', newBufferInfo.type);
		}
	}
	requiredKeys.forEach(function(requiredKey) {
		if(givenKeys.indexOf(requiredKey) < 0) {
			isValidInput = false;
			console.error('Missing Key:', requiredKey);
		}
	});
	
	if(isValidInput) {
		// create a new buffer object
		var newBuffer = new createNewBuffer(newBufferInfo);

		// Initialize data buffer
		dataBuffersDict.set(newBuffer.key, newBuffer);
		bufferModifications.push({
			'operation': 'add',
			'key': newBuffer.key,
			'next': defered.resolve
		});
	} else {
		defered.reject('Invalid Arguments');
	}
	return defered.promise;
};
exports.removeOutputBuffer = function(key) {
	var defered = q.defer();
	if(dataBuffersDict.has(key)) {
		bufferModifications.push({
			'operation': 'delete',
			'key': key,
			'next': defered.resolve
		});
		// defered.resolve();
	} else {
		console.log('Buffer does not exist', key);
		defered.reject();
	}
	return defered.promise;
};
