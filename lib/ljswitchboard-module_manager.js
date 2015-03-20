exports.info = {
	'type': 'library'
};


var path = require('path');
// var fs = require('fs');
var fs = require('fs.extra');
var q;
try {
	q = global.require('q');
} catch(err) {
	q = require('q');
}

var file_linter = require('./file_linter');
exports.enableLinting = function() {
	file_linter.configure(true);
};
exports.disableLinting = function() {
	file_linter.configure(false);
};

var MODULES_DIR_NAME = 'switchboard_modules';
var cwd = path.dirname(module.filename);
var MODULES_DIR = path.join(cwd, MODULES_DIR_NAME);
var MODULES_DATA_FILE_NAME = 'modules.json';
var MODULE_DATA_FILE_NAME = 'module.json';
var MODULES_LIST_FILE = path.join(MODULES_DIR, MODULES_DATA_FILE_NAME);


// defines for persistent data management
var MODULES_PERSISTENT_DATA_PATH = MODULES_DIR;
var MODULES_PERSISTENT_DATA_FILE_NAME = 'module_data.json';
var MODULE_INIT_PERSISTENT_DATA_FILE_NAME = 'data_init.json';
var MODULE_PERSISTENT_DATA_FILE_NAME = 'data.json';
var MODULES_PERSISTENT_DATA_FILE = path.join(
	MODULES_DIR,
	MODULES_PERSISTENT_DATA_FILE_NAME
);


exports.configurePersistentDataPath = function(newPath) {
	var exists = fs.existsSync(newPath);
	if(exists) {
		MODULES_PERSISTENT_DATA_PATH = path.normalize(newPath);
		MODULES_PERSISTENT_DATA_FILE = path.normalize(path.join(
			MODULES_PERSISTENT_DATA_PATH,
			MODULES_PERSISTENT_DATA_FILE_NAME
		));
	} else {
		try {
			fs.mkdirSync(newPath);
			exists = fs.existsSync(newPath);
			if(exists) {
				MODULES_PERSISTENT_DATA_PATH = path.normalize(newPath);
				MODULES_PERSISTENT_DATA_FILE = path.normalize(path.join(
					MODULES_PERSISTENT_DATA_PATH,
					MODULES_PERSISTENT_DATA_FILE_NAME
				));
			}
		} catch(err) {
			// failed to switch default directories.
			console.log('Failed to switch default directories');
		}
	}
};




var FRAMEWORK_PATHS = {
	'singleDevice': path.join(
		MODULES_DIR,
		'framework',
		'kipling-module-framework'
	)
};

var FRAMEWORK_ADDITIONS = {
	'singleDevice': {
		'css': {
			'prepend': [
				'style.css',
			],
		},
		'js': {
			'prepend': [
				'jquery_wrapper.js',
				'error_reporter.js',
				'device_constants.js',
				'presenter_framework.js',
			],
			'append': [
				'framework_connector.js'
			],
		},
		'html': {
			'prepend': [
				'framework_view.html',
			]
		}
	}
};

var moduleManagerFileCache = {};
exports.getFileCache = function() {
	return moduleManagerFileCache;
};

var invalidateCacheFile = function(fileName) {
	if(moduleManagerFileCache[fileName]) {
		moduleManagerFileCache[fileName] = undefined;
		delete moduleManagerFileCache[fileName];
	}
};

var doesFileExist = function(filePath) {
	var defered = q.defer();
	fs.exists(filePath, function(exists) {
		defered.resolve(exists);
	});
	return defered.promise;
};

var cachedReadFile = function(fileName) {
	var defered = q.defer();
	if(moduleManagerFileCache[fileName]) {
		defered.resolve(moduleManagerFileCache[fileName].toString());
	} else {
		fs.readFile(fileName, function(err, data) {
			if(err) {
				// console.error('Error Reading File', err);
				defered.resolve('');
			} else {
				moduleManagerFileCache[fileName] = data;
				defered.resolve(moduleManagerFileCache[fileName].toString());
			}
		});
	}
	return defered.promise;
};


var innerCachedReadFile = function(filePath) {
	var defered = q.defer();
	cachedReadFile(filePath)
	.then(file_linter.getLinter(filePath))
	.then(function(lintData) {
		// if(lintData.lintResult) {
		// 	if(!lintData.lintResult.overallResult) {
		// 		console.log(
		// 			'Bad File Detected:',
		// 			path.basename(filePath)
		// 		);
		// 		console.log(filePath);
		// 		console.log(lintData.lintResult);
		// 	}
		// }
		defered.resolve({
			'fileName': path.basename(filePath),
			'filePath': filePath,
			'fileData': lintData.fileData,
			'lintResult': lintData.lintResult
		});
	});
	return defered.promise;
};
var cachedReadFiles = function(fileNames) {
	var defered = q.defer();
	var promises = [];
	fileNames.forEach(function(fileName) {
		promises.push(innerCachedReadFile(fileName));
	});

	// Wait for all of the operations to complete
	q.allSettled(promises)
	.then(function(results) {
		var readFiles = [];
		results.forEach(function(result) {
			readFiles.push(result.value);
		});
		defered.resolve(readFiles);
	}, defered.reject);
	return defered.promise;
};
var parseJSONFile = function(fileData) {
	var defered = q.defer();
	var parsedData;
	try {
		if(fileData !== '') {
			parsedData = JSON.parse(fileData);
		} else {
			parsedData = {};
		}
	} catch(err) {
		console.error('Error parsing .json', err);
		parsedData = {};
	}
	defered.resolve(parsedData);
	return defered.promise;
};
var internalParseJSONFile = function(cachedFile) {
	var defered = q.defer();
	parseJSONFile(cachedFile.fileData)
	.then(function(parsedData) {
		cachedFile.fileData = parsedData;
		defered.resolve(cachedFile);
	});
	return defered.promise;
};
var parseCachedJSONFiles = function(files) {
	var defered = q.defer();
	var promises = [];
	files.forEach(function(file) {
		promises.push(internalParseJSONFile(file));
	});

	// Wait for all of the operations to complete
	q.allSettled(promises)
	.then(function(results) {
		var parsedData = [];
		results.forEach(function(result) {
			parsedData.push(result.value);
		});
		defered.resolve(parsedData);
	}, defered.reject);
	return defered.promise;
};

var filterOutInactiveModules = function(modules) {
	var defered = q.defer();
	var moduleTypes = Object.keys(modules);
	var activeModules = {};
	moduleTypes.forEach(function(moduleType) {
		activeModulesByType = [];
		modules[moduleType].forEach(function(module) {
			if(module.active) {
				activeModulesByType.push(module);
			}
		});
		activeModules[moduleType] = activeModulesByType;
	});
	defered.resolve(activeModules);
	return defered.promise;
};
var filterOutTaskModules = function(modules) {
	var defered = q.defer();
	var moduleTypes = Object.keys(modules);
	var nonTaskModules = {};
	moduleTypes.forEach(function(moduleType) {
		nonTaskModulesByType = [];
		modules[moduleType].forEach(function(module) {
			if(module.isTask) {
				// Module is a task
			} else {
				nonTaskModulesByType.push(module);
			}
		});
		nonTaskModules[moduleType] = nonTaskModulesByType;
	});
	defered.resolve(nonTaskModules);
	return defered.promise;
};
var filterOutStandardModules = function(modules) {
	var defered = q.defer();
	var moduleTypes = Object.keys(modules);
	var taskModules = {};
	moduleTypes.forEach(function(moduleType) {
		taskModulesByType = [];
		modules[moduleType].forEach(function(module) {
			if(module.isTask) {
				// Module is a task
				taskModulesByType.push(module);
			} else {
				// Module is a standard module.
			}
		});
		taskModules[moduleType] = taskModulesByType;
	});
	defered.resolve(taskModules);
	return defered.promise;
};
var loadModuleAttributes = function(module, category) {
	var defered = q.defer();
	var filePath = path.join(MODULES_DIR, module.name, MODULE_DATA_FILE_NAME);
	cachedReadFile(filePath)
	.then(parseJSONFile)
	.then(function(moduleData) {
		var keys = Object.keys(moduleData);
		keys.forEach(function(key) {
			module[key] = moduleData[key];
		});
		module.data = moduleData;
		module.category = category;
		defered.resolve(module);
	}, defered.reject);
	return defered.promise;
};

var loadFoundModuleAttributes = function(modules) {
	var defered = q.defer();
	var promises = [];
	var i,j;
	var moduleKeys = Object.keys(modules);
	moduleKeys.forEach(function(moduleKey) {
		var moduleSection = modules[moduleKey];
		moduleSection.forEach(function(module) {
			promises.push(loadModuleAttributes(module, moduleKey));
		});
	});

	// Wait for all of the operations to complete
	q.allSettled(promises)
	.then(function(collectedData) {
		defered.resolve(modules);
	}, defered.reject);
	return defered.promise;
};

var flattenModuleList = function(modules) {
	var defered = q.defer();
	var moduleList = [];
	var moduleKeys = Object.keys(modules);
	moduleKeys.forEach(function(moduleKey) {
		var moduleSection = modules[moduleKey];
		moduleSection.forEach(function(module) {
			moduleList.push(module);
		});
	});
	defered.resolve(moduleList);
	return defered.promise;
};

var getModulesList = function() {
	var defered = q.defer();

	cachedReadFile(MODULES_LIST_FILE)
	.then(parseJSONFile)
	.then(filterOutInactiveModules)
	.then(filterOutTaskModules)
	.then(loadFoundModuleAttributes)
	.then(defered.resolve, defered.reject);
	return defered.promise;
};
exports.getModulesList = getModulesList;


var getTaskList = function() {
	var defered = q.defer();

	cachedReadFile(MODULES_LIST_FILE)
	.then(parseJSONFile)
	.then(filterOutInactiveModules)
	.then(filterOutStandardModules)
	.then(loadFoundModuleAttributes)
	.then(flattenModuleList)
	.then(defered.resolve, defered.reject);

	return defered.promise;
};
exports.getTaskList = getTaskList;

var getEnabledModulesList = function() {
	
};

var resolveToHeaderModules = function(moduleList) {
	var defered = q.defer();
	defered.resolve(moduleList.header);
	return defered.promise;
};
var resolveToBodyModules = function(moduleList) {
	var defered = q.defer();
	defered.resolve(moduleList.body);
	return defered.promise;
};
var resolveToFooterModules = function(moduleList) {
	var defered = q.defer();
	defered.resolve(moduleList.footer);
	return defered.promise;
};

var getHeaderModules = function() {
	return getModulesList()
	.then(resolveToHeaderModules);
};
exports.getHeaderModules = getHeaderModules;

var getBodyModules = function() {
	return getModulesList()
	.then(resolveToBodyModules);
};
exports.getBodyModules = getBodyModules;

var filterBodyModules = function(filters) {
	var modules = [];
	var i;
	var num = Math.floor(Math.random()*11);
	for(i = 0; i < num; i ++) {
		modules.push({
			'name': 'Test ' + i.toString(),
			'humanName': 'Test ' + i.toString(),
			'type': 'body',
		});
	}
	return modules;
};
exports.filterBodyModules = filterBodyModules;

var getFooterModules = function() {
	return getModulesList()
	.then(resolveToFooterModules);
};
exports.getFooterModules = getFooterModules;


var getModuleInfo = function(data) {
	var defered = q.defer();
	var filePath = path.join(data.path, MODULE_DATA_FILE_NAME);
	cachedReadFile(filePath)
	.then(parseJSONFile)
	.then(function(moduleData) {
		data.data = moduleData;
		defered.resolve(data);
	});
	return defered.promise;
};
var resolveModuleFilePath = function(modulePath, file) {
	return path.normalize(path.join(modulePath, file));
};
var resolveModuleFilePaths = function(modulePath, files) {
	var paths = [];
	files.forEach(function(file) {
		paths.push(resolveModuleFilePath(modulePath, file));
	});
	return paths;
};

var replaceElements = function(frameworkType, standardData, replacements) {
	var standardDataFiles = [];
	standardData.forEach(function(stdFilePath) {
		standardDataFiles.push(path.basename(stdFilePath));
	});
	replacements.forEach(function(replacement, i) {
		var index = standardDataFiles.indexOf(replacement.searchFile);
		if(index >= 0) {
			standardData[index] = path.normalize(path.join(
				FRAMEWORK_PATHS[frameworkType],
				replacement.replacementFile
			));
		}
	});
	return standardData;
};
var applyFrameworkAdditions = function(fileType, frameworkType, standardData) {
	var outputData = [];
	var isValidFramework = false;
	if(frameworkType) {
		if(FRAMEWORK_ADDITIONS[frameworkType]) {
			if(FRAMEWORK_ADDITIONS[frameworkType][fileType]) {
				if(FRAMEWORK_PATHS[frameworkType]) {
					isValidFramework = true;
					var additions = FRAMEWORK_ADDITIONS[frameworkType][fileType];
					if(additions.prepend) {
						var prependPaths = resolveModuleFilePaths(
							FRAMEWORK_PATHS[frameworkType],
							additions.prepend
						);
						outputData = outputData.concat(prependPaths);
					}
					if(additions.replace) {
						standardData = replaceElements(
							frameworkType,
							standardData,
							additions.replace
						);
					}

					outputData = outputData.concat(standardData);
					if(additions.append) {
						var appendPaths = resolveModuleFilePaths(
							FRAMEWORK_PATHS[frameworkType],
							additions.append
						);
						outputData = outputData.concat(appendPaths);
					}
				}
			}
		}
	}

	if(!isValidFramework) {
		outputData = standardData;
	}
	return outputData;
};

var checkDataManagerStatus = function(dataManager) {
	var defered = q.defer();
	cachedReadFile(MODULES_PERSISTENT_DATA_FILE)
	.then(parseJSONFile)
	.then(function(globalData) {
		dataManager.dataManagerData = globalData;
		if(globalData.version) {
			var currentVersion = require('../package.json').startupDataVersion;
			if(globalData.version === currentVersion) {
				dataManager.isDataManagerInitialized = true;
			}
		}
		if(globalData[dataManager.moduleName]) {
			dataManager.isDataManagerValid = true;
		}
		defered.resolve(dataManager);
	});
	return defered.promise;
};

var writeAndValidateDataManagerFile = function(dataManager) {
	var defered = q.defer();
	// Invalidate the cache for this file.
	invalidateCacheFile(MODULES_PERSISTENT_DATA_FILE);

	// Convert the object into a readable string.
	var data = JSON.stringify(dataManager.dataManagerData, null, 2);

	// Write the data to the file.
	fs.outputFile(MODULES_PERSISTENT_DATA_FILE,data, function(err) {
		if(err) {
			fs.outputFile(MODULES_PERSISTENT_DATA_FILE, data, function(errB) {
				if(errB) {
					defered.reject(errB);
				} else {
					dataManager.isDataManagerInitialized = true;
					dataManager.isDataManagerValid = true;
					defered.resolve(dataManager);
				}
			});
		} else {
			dataManager.isDataManagerInitialized = true;
			dataManager.isDataManagerValid = true;
			defered.resolve(dataManager);
		}
	});
	return defered.promise;
};

var initializeDataManager = function(dataManager) {
	var defered = q.defer();
	if(!dataManager.isDataManagerInitialized) {
		var currentVersion = require('../package.json').version;
		var writeDataObj = {
			'version':currentVersion
		};
		writeDataObj[dataManager.moduleName] = {
			'isValid': false
		};
		// Because we are re-initializing the file, just save its contents so
		// they don't have to be re-read later.
		dataManager.dataManagerData = writeDataObj;

		writeAndValidateDataManagerFile(dataManager)
		.then(defered.resolve, defered.reject);
	} else {
		defered.resolve(dataManager);
	}
	return defered.promise;
};
var validateDataManager = function(dataManager) {
	var defered = q.defer();
	if(!dataManager.isDataManagerValid) {
		// If the data in the file needs to be updated to include the current
		// module then initialize the data & save it to the file.
		dataManager.dataManagerData[dataManager.moduleName] = {
			'isValid': false
		};
		writeAndValidateDataManagerFile(dataManager)
		.then(defered.resolve, defered.reject);
	} else {
		defered.resolve(dataManager);
	}
	return defered.promise;
};
var checkManagedModuleDataStatus = function(dataManager) {
	var defered = q.defer();
	var moduleDataDir = path.normalize(path.join(
		MODULES_PERSISTENT_DATA_PATH,
		dataManager.moduleName
	));
	doesFileExist(moduleDataDir)
	.then(function(folderExists) {
		if(folderExists) {
			dataManager.isModuleDataInitialized = true;
			var moduleName = dataManager.moduleName;
			var isValid = dataManager.dataManagerData[moduleName].isValid;
			if(isValid) {
				var moduleDataFilePath = resolveModuleFilePath(
					moduleDataDir,
					MODULE_PERSISTENT_DATA_FILE_NAME
				);
				doesFileExist(moduleDataFilePath)
				.then(function(fileExists) {
					if(fileExists) {
						// If the file exists try to read & parse it.
						cachedReadFile(moduleDataFilePath)
						.then(function(fileData) {
							try {
								dataManager.moduleData = JSON.parse(fileData);
								dataManager.isModuleDataValid = true;
							} catch(err) {
								// If there is an error parsing the data then
								// the file needs to get re-initialized.
								dataManager.isModuleDataValid = false;
							}
							defered.resolve(dataManager);
						});
					} else {
						defered.resolve(dataManager);
					}
				});
			} else {
				defered.resolve(dataManager);
			}
		} else {
			defered.resolve(dataManager);
		}
	});
	return defered.promise;
};
var initializeManagedModuleData = function(dataManager) {
	var defered = q.defer();
	var moduleDataDir = path.normalize(path.join(
		MODULES_PERSISTENT_DATA_PATH,
		dataManager.moduleName
	));
	if(!dataManager.isModuleDataInitialized) {
		fs.mkdir(moduleDataDir, function(err) {
			if(err) {
				fs.mkdir(moduleDataDir, function(err) {
					if(err) {
						defered.reject(err);
					} else {
						dataManager.isModuleDataInitialized = true;
						defered.resolve(dataManager);
					}
				});
			} else {
				dataManager.isModuleDataInitialized = true;
				defered.resolve(dataManager);
			}
		});
	} else {
		defered.resolve(dataManager);
	}
	
	return defered.promise;
};
var writeAndValidateModuleDataFile = function(dataManager) {
	var defered = q.defer();

	var moduleDataDir = path.normalize(path.join(
		MODULES_PERSISTENT_DATA_PATH,
		dataManager.moduleName
	));
	var moduleDataFilePath = resolveModuleFilePath(
		moduleDataDir,
		MODULE_PERSISTENT_DATA_FILE_NAME
	);
	
	// Invalidate the cache for this file.
	invalidateCacheFile(moduleDataFilePath);

	// Convert the object into a readable string.
	var data = JSON.stringify(dataManager.moduleData, null, 2);


	// Write the data to the file.
	fs.outputFile(moduleDataFilePath,data, function(err) {
		if(err) {
			fs.outputFile(moduleDataFilePath, data, function(errB) {
				if(errB) {
					// because the file will just get re-initialized next time
					// just resolve & don't show any errors.
					defered.resolve(dataManager);
				} else {
					dataManager.isModuleDataInitialized = true;
					dataManager.isModuleDataValid = true;
					defered.resolve(dataManager);
				}
			});
		} else {
			dataManager.isModuleDataInitialized = true;
			dataManager.isModuleDataValid = true;
			defered.resolve(dataManager);
		}
	});
	return defered.promise;
};

var internalSaveModuleDataFile = function(dataManager) {
	var defered = q.defer();
	// declare the current module's data to be invalid in the primary module_data file
	dataManager.dataManagerData[dataManager.moduleName].isValid = false;
	writeAndValidateDataManagerFile(dataManager)
	.then(writeAndValidateModuleDataFile)
	.then(function(dataManager) {
		dataManager.dataManagerData[dataManager.moduleName].isValid = true;
		writeAndValidateDataManagerFile(dataManager)
		.then(defered.resolve, defered.resolve);
	});
	return defered.promise;
};
var validateManagedModuleData = function(dataManager) {
	var defered = q.defer();
	if(!dataManager.isModuleDataValid) {
		var moduleDataInitFilePath = resolveModuleFilePath(
			dataManager.modulePath,
			MODULE_INIT_PERSISTENT_DATA_FILE_NAME
		);

		// If the module data file isn't valid then read the initialization file
		// and initialize the persistent data file.
		cachedReadFile(moduleDataInitFilePath)
		.then(parseJSONFile)
		.then(function(initialModuleData) {
			dataManager.moduleData = initialModuleData;
			internalSaveModuleDataFile(dataManager)
			.then(defered.resolve);
		});
	} else {
		defered.resolve(dataManager);
	}
	return defered.promise;
};
var returnModuleData = function(dataManager) {
	var defered = q.defer();
	defered.resolve(dataManager.moduleData);
	return defered.promise;
};

var loadBaseData = function(data) {
	var defered = q.defer();
	cachedReadFile(MODULES_LIST_FILE)
	.then(parseJSONFile)
	.then(flattenModuleList)
	.then(function(baseDataArray) {
		var newBaseData = {};
		baseDataArray.some(function(baseData) {
			var isFound = false;
			if(baseData.name === data.name) {
				isFound = true;
				newBaseData = baseData;
			}
			return isFound;
		});
		data.baseData = newBaseData;
		defered.resolve(data);
	});
	return defered.promise;
};

var innerLoadModuleStartupData = function(data) {
	var defered = q.defer();
	var moduleDataPath = path.join(MODULES_PERSISTENT_DATA_PATH, data.name);
	var dataManager = {
		'isDataManagerInitialized': false,
		'isDataManagerValid': false,
		'isModuleDataInitialized': false,	// Checks to make sure the folder for the data.json exists
		'isModuleDataValid': false,			// Checks to make sure the data.json file exists & that its isValid flag in the
											// dataManagerData obj is true.
		'modulePath': data.path,
		'moduleDataPath': moduleDataPath,
		'moduleName': data.name,
		'moduleData': {},
		'dataManagerData': {},
	};
	var getHandleError = function(step) {
		var handleError = function(err) {
			console.error('Error in innerLoadModuleStartupData', err, step);
			defered.resolve({});
		};
		return handleError;
	};

	checkDataManagerStatus(dataManager)
	.then(initializeDataManager, getHandleError('checkDataManagerStatus'))
	.then(validateDataManager, getHandleError('initializeDataManager'))
	.then(checkManagedModuleDataStatus, getHandleError('validateDataManager'))
	.then(initializeManagedModuleData, getHandleError('checkManagedModuleDataStatus'))
	.then(validateManagedModuleData, getHandleError('initializeManagedModuleData'))
	.then(returnModuleData, getHandleError('validateManagedModuleData'))
	.then(defered.resolve, getHandleError('returnModuleData'));
	return defered.promise;
};

var loadModuleStartupData = function(data) {
	var defered = q.defer();

	var startupDataFilePath = resolveModuleFilePath(
		data.path,
		MODULE_INIT_PERSISTENT_DATA_FILE_NAME
	);

	// If the startupDataFile exists then trigger the manager to run.  Otherwise
	// don't run the data manager and continue loading process.
	doesFileExist(startupDataFilePath)
	.then(function(exists) {
		if(exists) {
			if(MODULES_PERSISTENT_DATA_PATH !== MODULES_DIR) {
				innerLoadModuleStartupData({
					'name': data.name,
					'path': data.path
				})
				.then(function(loadedData) {
					data.startupData = loadedData;
					defered.resolve(data);
				});
			} else {
				console.warn('persistent data manager not configured');
				cachedReadFile(startupDataFilePath)
				.then(parseJSONFile)
				.then(function(initialModuleData) {
					data.startupData = initialModuleData;
					defered.resolve(data);
				});
			}
		} else {
			defered.resolve(data);
		}
	});

	// cachedReadFiles(jsonFiles)
	// .then(parseCachedJSONFiles)
	return defered.promise;
};

var resetModuleStartupData = function(key) {
	var defered = q.defer();
	// console.log('data to delete', MODULES_PERSISTENT_DATA_PATH);
	if(MODULES_PERSISTENT_DATA_PATH !== MODULES_DIR) {
		if(key === 'I am self aware and will be deleting a LOT of things') {
			doesFileExist(MODULES_PERSISTENT_DATA_PATH)
			.then(function(exists) {
				if(exists) {
					fs.rmrf(MODULES_PERSISTENT_DATA_PATH, function(err) {
						if(err) {
							fs.rmrf(MODULES_PERSISTENT_DATA_PATH, function(errB) {
								if(errB) {
									defered.reject(errB);
								}
								defered.resolve();
							});
						}
						defered.resolve();
					});
				} else {
					defered.resolve();
				}
			});
		} else {
			console.log('!!! Persistent data key is invalid !!!');
			defered.resolve();
		}
	} else {
		console.warn('!!! Prevented Deletion of all kipling modules !!!');
		defered.resolve();
	}
	
	return defered.promise;
};
exports.resetModuleStartupData = resetModuleStartupData;

var revertModuleStartupData = function(moduleName) {
	var defered = q.defer();
	var moduleDataInitFilePath = path.normalize(path.join(
		MODULES_DIR,
		moduleName,
		MODULE_INIT_PERSISTENT_DATA_FILE_NAME
	));

	cachedReadFile(moduleDataInitFilePath)
	.then(parseJSONFile)
	.then(function(initialData) {
		saveModuleStartupData(moduleName, initialData)
		.then(defered.resolve);
	});
	return defered.promise;
};
exports.revertModuleStartupData = revertModuleStartupData;

var getModuleStartupData = function(moduleName) {
	var defered = q.defer();
	var moduleDataDir = path.normalize(path.join(
		MODULES_PERSISTENT_DATA_PATH,
		moduleName
	));
	var moduleDataFilePath = resolveModuleFilePath(
		moduleDataDir,
		MODULE_PERSISTENT_DATA_FILE_NAME
	);

	// Perform a cachedRead request for the file & parse it.
	cachedReadFile(moduleDataFilePath)
	.then(parseJSONFile)
	.then(defered.resolve);

	return defered.promise;
};
exports.getModuleStartupData = getModuleStartupData;

var saveModuleStartupData = function(moduleName, data) {
	var defered = q.defer();

	var dataManager = {
		'dataManagerData': {},
		'moduleName': moduleName,
		'moduleData': data,
	};
	// Location of module_data.json
	// MODULES_PERSISTENT_DATA_FILE;
	var moduleDataDir = path.normalize(path.join(
		MODULES_PERSISTENT_DATA_PATH,
		moduleName
	));
	var moduleDataFilePath = resolveModuleFilePath(
		moduleDataDir,
		MODULE_PERSISTENT_DATA_FILE_NAME
	);
	var invalidateDesiredModule = function(readGlobalData) {
		var innerDefered = q.defer();
		readGlobalData[moduleName].isValid = false;
		dataManager.dataManagerData = readGlobalData;
		innerDefered.resolve(dataManager);
		return innerDefered.promise;
	};
	var validateDesiredModule = function(resDataManager) {
		var innerDefered = q.defer();
		resDataManager.dataManagerData[moduleName].isValid = true;
		innerDefered.resolve(resDataManager);
		return innerDefered.promise;
	};
	var returnModuleName = function(resDataManager) {
		var innerDefered = q.defer();
		innerDefered.resolve(resDataManager.moduleName);
		return innerDefered.promise;
	};

	cachedReadFile(MODULES_PERSISTENT_DATA_FILE)
	.then(parseJSONFile)
	.then(invalidateDesiredModule)
	.then(writeAndValidateDataManagerFile)
	.then(writeAndValidateModuleDataFile)
	.then(validateDesiredModule)
	.then(returnModuleName, returnModuleName)
	.then(defered.resolve);

	return defered.promise;
};
exports.saveModuleStartupData = saveModuleStartupData;

var loadModuleCSS = function(data) {
	var defered = q.defer();

	var cssFiles;
	if(data.baseData.isTask) {
		cssFiles = [];
	} else {
		cssFiles = ['style.css'];
	}
	cssFiles = resolveModuleFilePaths(data.path, cssFiles);
	
	// Perform logic for modules loading a framework
	if(data.data.framework) {
		cssFiles = applyFrameworkAdditions(
			'css',
			data.data.framework,
			cssFiles
		);
	}

	var extCSSFiles = [];
	if(data.data.cssFiles) {
		if(Array.isArray(data.data.cssFiles)) {
			extCSSFiles = data.data.cssFiles;
			extCSSFiles = resolveModuleFilePaths(data.path, extCSSFiles);
		}
	}

	var i;
	for(i = 0; i < extCSSFiles.length; i++) {
		cssFiles.push(extCSSFiles[i]);
	}

	cachedReadFiles(cssFiles)
	.then(function(loadedFiles) {
		data.css = loadedFiles;
		defered.resolve(data);
	});
	return defered.promise;
};


var loadModuleJS = function(data) {
	var defered = q.defer();
	
	var requiredJSFiles;
	if(data.baseData.isTask) {
		requiredJSFiles = [];
	} else {
		requiredJSFiles = ['controller.js'];
	}

	requiredJSFiles = resolveModuleFilePaths(data.path, requiredJSFiles);

	var thirdPartyJSFiles = [];
	if(data.data.third_party_code) {
		if(Array.isArray(data.data.third_party_code)) {
			var thirdPartyJSFilesPath = path.join(
				MODULES_DIR, 'third_party_code'
			);
			thirdPartyJSFiles = data.data.third_party_code;
			thirdPartyJSFiles = resolveModuleFilePaths(
				thirdPartyJSFilesPath,
				thirdPartyJSFiles
			);
		}
	}

	var jsLibFiles = [];
	if(data.data.jsFiles) {
		if(Array.isArray(data.data.jsFiles)) {
			jsLibFiles = data.data.jsFiles;
			jsLibFiles = resolveModuleFilePaths(data.path, jsLibFiles);
		}
	}
	
	// Perform logic for modules loading a framework
	if(data.data.framework) {
		requiredJSFiles = applyFrameworkAdditions(
			'js',
			data.data.framework,
			requiredJSFiles
		);
	}
			
	var jsFiles = [];

	var i;
	for(i = 0; i < thirdPartyJSFiles.length; i++) {
		jsFiles.push(thirdPartyJSFiles[i]);
	}
	for(i = 0; i < jsLibFiles.length; i++) {
		jsFiles.push(jsLibFiles[i]);
	}
	for(i = 0; i < requiredJSFiles.length; i++) {
		jsFiles.push(requiredJSFiles[i]);
	}

	cachedReadFiles(jsFiles)
	.then(function(loadedFiles) {
		data.js = loadedFiles;
		defered.resolve(data);
	});
	return defered.promise;
};
var loadModuleHTML = function(data) {
	var defered = q.defer();

	var htmlFiles;
	if(data.baseData.isTask) {
		htmlFiles = [];
	} else {
		htmlFiles = ['view.html'];
	}

	htmlFiles = resolveModuleFilePaths(data.path, htmlFiles);


	// Perform logic for modules loading a framework
	if(data.data.framework) {
		htmlFiles = applyFrameworkAdditions(
			'html',
			data.data.framework,
			htmlFiles
		);
	}

	var extHTMLFiles = [];
	if(data.data.htmlFiles) {
		if(Array.isArray(data.data.htmlFiles)) {
			extHTMLFiles = data.data.htmlFiles;
			extHTMLFiles = resolveModuleFilePaths(data.path, extHTMLFiles);
		}
	}

	var i;
	for(i = 0; i < extHTMLFiles.length; i++) {
		htmlFiles.push(extHTMLFiles[i]);
	}

	cachedReadFiles(htmlFiles)
	.then(function(loadedFiles) {
		data.html = loadedFiles;
		
		var i;
		for(i = 0; i < loadedFiles.length; i++) {
			
			var fullFileName = loadedFiles[i].fileName;
			var fileEnding = path.extname(fullFileName);
			var fileName = fullFileName.split(fileEnding).join('');
			data.htmlFiles[fileName] = loadedFiles[i].fileData;
		}
		defered.resolve(data);
	});
	return defered.promise;
};
var loadModuleJSON = function(data) {
	var defered = q.defer();
	var jsonFiles = [
		'moduleData.json',
		'moduleConstants.json',
		MODULE_INIT_PERSISTENT_DATA_FILE_NAME
	];
	jsonFiles = resolveModuleFilePaths(data.path, jsonFiles);

	var extJSONFiles = [];
	if(data.data.jsonFiles) {
		if(Array.isArray(data.data.jsonFiles)) {
			extJSONFiles = data.data.jsonFiles;
			extJSONFiles = resolveModuleFilePaths(data.path, extJSONFiles);
		}
	}
	
	var i;
	for(i = 0; i < extJSONFiles.length; i++) {
		jsonFiles.push(extJSONFiles[i]);
	}

	cachedReadFiles(jsonFiles)
	.then(parseCachedJSONFiles)
	.then(function(loadedFiles) {
		// console.log('JSON Data', loadedFiles);
		loadedFiles.forEach(function(loadedFile) {
			var baseName = path.basename(loadedFile.fileName);
			var extName = path.extname(loadedFile.fileName);
			var loadedFileName = baseName.split(extName).join('');
			data.json[loadedFileName] = loadedFile.fileData;

			data.jsonFiles.push({
				'fileName': loadedFile.fileName,
				'filePath': loadedFile.filePath
			});
		});
		defered.resolve(data);
	});
	return defered.promise;
};

var innerLoadModuleData = function(data) {
	var defered = q.defer();
	var promises = [
		loadModuleStartupData(data),
		loadModuleCSS(data),
		loadModuleJS(data),
		loadModuleHTML(data),
		loadModuleJSON(data)
	];

	// Wait for all of the operations to complete
	q.allSettled(promises)
	.then(function(collectedData) {
		defered.resolve(data);
	}, defered.reject);
	return defered.promise;
};


/*
The loadModuleDataByName function allows module data to be completely fetched
by the module manager for any given module.  It uses the getModuleInfo function
to get the module's module.json file contents.  If this file has already been
obtained (like in the tab-click handlers) then the loadModuleData function
can be used.
*/
var loadModuleDataByName = function(moduleName) {
	var defered = q.defer();
	var collectedModuleData = {
		'name': moduleName,
		'path': path.join(MODULES_DIR, moduleName),
		'css': [],
		'js': [],
		'html': [],
		'htmlFiles': {},
		'json': {},
		'jsonFiles': [],
		'data': {},
		'baseData': {},
		'startupData': {},
	};
	getModuleInfo(collectedModuleData)
	.then(loadBaseData)
	.then(innerLoadModuleData)
	.then(defered.resolve, defered.reject);
	return defered.promise;
};
exports.loadModuleDataByName = loadModuleDataByName;


/*
The loadModuleData function is an in-point to fetching a module's data one step
further along than the loadModuleDataByName function requiring that a module's
.json file has already been loaded.
*/
var loadModuleData = function(moduleData) {
	var defered = q.defer();
	var collectedModuleData = {
		'name': moduleData.name,
		'path': path.join(MODULES_DIR, moduleData.name),
		'css': [],
		'js': [],
		'html': [],
		'htmlFiles': {},
		'json': {},
		'jsonFiles': [],
		'data': moduleData,
		'baseData': {},
		'startupData': {},
	};
	loadBaseData(collectedModuleData)
	.then(innerLoadModuleData)
	.then(defered.resolve, defered.reject);
	return defered.promise;
};
exports.loadModuleData = loadModuleData;

