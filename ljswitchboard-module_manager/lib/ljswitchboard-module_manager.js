exports.info = {
	'type': 'library'
};

var path = require('path');
// var fs = require('fs');
var fs;
try {
	fs = global.require('fs.extra');
} catch(err) {
	fs = require('fs.extra');
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

exports.getModulesDirectory = function() {
	return MODULES_DIR;
};

// defines for persistent data management
var MODULES_PERSISTENT_DATA_PATH = MODULES_DIR;
var MODULES_PERSISTENT_DATA_FILE_NAME = 'module_data.json';
var MODULE_INIT_PERSISTENT_DATA_FILE_NAME = 'data_init.json';
var MODULE_PERSISTENT_DATA_FILE_NAME = 'data.json';
var MODULES_PERSISTENT_DATA_FILE = path.join(
	MODULES_DIR,
	MODULES_PERSISTENT_DATA_FILE_NAME
);

function printTestStartupInfo(name) {
	var filePath = path.join(process.cwd(), 'test_persistent_data_dir', 'device_selector', 'data.json');
	var controlPath = path.join(process.cwd(), 'test_persistent_data_dir', 'module_data.json');
	var data = '';
	var controlData = '';
	try {
		controlData = fs.readFileSync(controlPath);
		console.log('controlData', name, controlData.toString());
		data = fs.readFileSync(filePath);
		console.log('startupData', name, data.toString());
	} catch(err) {
		console.log('Error reading startupData', name, filePath);
	}

}
exports.printTestStartupInfo = printTestStartupInfo;

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
				'device_errors_template.html',
				'printable_device_errors_template.html',
			]
		}
	}
};
// configure the multipleDevices framework to be the same as the singleDevice
// framework.
FRAMEWORK_PATHS.multipleDevices = FRAMEWORK_PATHS.singleDevice;
FRAMEWORK_ADDITIONS.multipleDevices = FRAMEWORK_ADDITIONS.singleDevice;

var moduleManagerFileCache = {};
exports.getFileCache = function() {
	return moduleManagerFileCache;
};
exports.clearFileCache = function() {
	var keys = Object.keys(moduleManagerFileCache);
	keys.forEach(function(key) {
		invalidateCacheFile(key);
	});
	moduleManagerFileCache = {};
};

var invalidateCacheFile = function(fileName) {
	if(moduleManagerFileCache[fileName]) {
		moduleManagerFileCache[fileName] = undefined;
		delete moduleManagerFileCache[fileName];
	}
};

var doesFileExist = function(filePath) {
	return new Promise((resolve, reject) => {
		fs.exists(filePath, function(exists) {
			resolve(exists);
		});
	});
};
var extraCachedReadFile = function(fileName) {
	return new Promise((resolve, reject) => {
	var finishFunc = function(data) {
		moduleManagerFileCache[fileName] = data;
		resolve(moduleManagerFileCache[fileName].toString());
	};
	console.log('in extraCachedReadFile');
	if(moduleManagerFileCache[fileName]) {
		resolve(moduleManagerFileCache[fileName].toString());
	} else {
		fs.readFile(fileName, function(err, data) {
			if(err) {
				fs.readFile(fileName, function(err, data) {
					if(err) {
						fs.readFile(fileName, function(err, data) {
							if(err) {
								console.error('Error Reading File', err, fileName);
								resolve('');
							} else {
								finishFunc(data);
							}
						});
					} else {
						finishFunc(data);
					}
				});
			} else {
				finishFunc(data);
			}
		});
	}
	});
};
var cachedReadFile = function(fileName) {
	return new Promise((resolve, reject) => {
	if(moduleManagerFileCache[fileName]) {
		resolve(moduleManagerFileCache[fileName].toString());
	} else {
		fs.readFile(fileName, function(err, data) {
			if(err) {
				var retry = true;
				// Error codes defined in... https://github.com/joyent/node/blob/master/deps/uv/include/uv.h
				if(err.code) {
					if(err.code === 'ENOENT') {
						retry = false;
					}
				}
				if(retry) {
					extraCachedReadFile(fileName)
					.then(resolve);
				} else {
					resolve('');
				}
			} else {
				moduleManagerFileCache[fileName] = data;
				resolve(moduleManagerFileCache[fileName].toString());
			}
		});
	}
	});
};


var innerCachedReadFile = function(filePath) {
	return new Promise((resolve, reject) => {
		cachedReadFile(filePath)
			.then(file_linter.getLinter(filePath))
			.then(function(lintData) {
				var fileData = lintData.fileData;

				if (filePath.endsWith('.js')) {
					fileData += "\n//# sourceURL=" + filePath;
				}

				resolve({
					'fileName': path.basename(filePath),
					'filePath': filePath,
					'fileData': fileData,
					'lintResult': lintData.lintResult
				});
			});
	});
};
var cachedReadFiles = function(fileNames) {
	return new Promise((resolve, reject) => {
	var promises = [];
	fileNames.forEach(function(fileName) {
		promises.push(innerCachedReadFile(fileName));
	});

	// Wait for all of the operations to complete
	Promise.allSettled(promises)
	.then(function(results) {
		var readFiles = [];
		results.forEach(function(result) {
			readFiles.push(result.value);
		});
		resolve(readFiles);
	}, reject);
	});
};
var parseJSONFile = function(fileData) {
	return new Promise((resolve, reject) => {
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
	resolve(parsedData);
	});
};
var internalParseJSONFile = function(cachedFile) {
	return new Promise((resolve, reject) => {
	parseJSONFile(cachedFile.fileData)
	.then(function(parsedData) {
		cachedFile.fileData = parsedData;
		resolve(cachedFile);
	});
	});
};
var parseCachedJSONFiles = function(files) {
	return new Promise((resolve, reject) => {
	var promises = [];
	files.forEach(function(file) {
		promises.push(internalParseJSONFile(file));
	});

	// Wait for all of the operations to complete
	Promise.allSettled(promises)
	.then(function(results) {
		var parsedData = [];
		results.forEach(function(result) {
			parsedData.push(result.value);
		});
		resolve(parsedData);
	}, reject);
	});
};

var filterOutInactiveModules = function(modules) {
	return new Promise((resolve, reject) => {
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
	resolve(activeModules);
	});
};
var filterOutTaskModules = function(modules) {
	return new Promise((resolve, reject) => {
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
	resolve(nonTaskModules);
	});
};
var filterOutStandardModules = function(modules) {
	return new Promise((resolve, reject) => {
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
	resolve(taskModules);
	});
};
var loadModuleAttributes = function(module, category) {
	return new Promise((resolve, reject) => {
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
		resolve(module);
	}, reject);
	});
};

var loadFoundModuleAttributes = function(modules) {
	return new Promise((resolve, reject) => {
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
	Promise.allSettled(promises)
	.then(function(collectedData) {
		resolve(modules);
	}, reject);
	});
};

var flattenModuleList = function(modules) {
	return new Promise((resolve, reject) => {
	var moduleList = [];
	var moduleKeys = Object.keys(modules);
	moduleKeys.forEach(function(moduleKey) {
		var moduleSection = modules[moduleKey];
		moduleSection.forEach(function(module) {
			moduleList.push(module);
		});
	});
	resolve(moduleList);
	});
};

var getModulesList = function() {
	return new Promise((resolve, reject) => {

	cachedReadFile(MODULES_LIST_FILE)
	.then(parseJSONFile)
	.then(filterOutInactiveModules)
	.then(filterOutTaskModules)
	.then(loadFoundModuleAttributes)
	.then(resolve, reject);
	});
};
exports.getModulesList = getModulesList;


var getTaskList = function() {
	return new Promise((resolve, reject) => {

	cachedReadFile(MODULES_LIST_FILE)
	.then(parseJSONFile)
	.then(filterOutInactiveModules)
	.then(filterOutStandardModules)
	.then(loadFoundModuleAttributes)
	.then(flattenModuleList)
	.then(resolve, reject);

	});
};
exports.getTaskList = getTaskList;

var getEnabledModulesList = function() {

};

var resolveToHeaderModules = function(moduleList) {
	return new Promise((resolve, reject) => {
	resolve(moduleList.header);
	});
};
var resolveToBodyModules = function(moduleList) {
	return new Promise((resolve, reject) => {
	resolve(moduleList.body);
	});
};
var resolveToFooterModules = function(moduleList) {
	return new Promise((resolve, reject) => {
	resolve(moduleList.footer);
	});
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
	return new Promise((resolve, reject) => {
	var filePath = path.join(data.path, MODULE_DATA_FILE_NAME);
	cachedReadFile(filePath)
	.then(parseJSONFile)
	.then(function(moduleData) {
		data.data = moduleData;
		resolve(data);
	});
	});
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
	return new Promise((resolve, reject) => {
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
		resolve(dataManager);
	});
	});
};

var writeAndValidateDataManagerFile = function(dataManager) {
	return new Promise((resolve, reject) => {
	// Invalidate the cache for this file.
	invalidateCacheFile(MODULES_PERSISTENT_DATA_FILE);

	// Convert the object into a readable string.
	var data = JSON.stringify(dataManager.dataManagerData, null, 2);

	// Write the data to the file.
	fs.outputFile(MODULES_PERSISTENT_DATA_FILE,data, function(err) {
		if(err) {
			fs.outputFile(MODULES_PERSISTENT_DATA_FILE, data, function(errB) {
				if(errB) {
					reject(errB);
				} else {
					dataManager.isDataManagerInitialized = true;
					dataManager.isDataManagerValid = true;
					resolve(dataManager);
				}
			});
		} else {
			dataManager.isDataManagerInitialized = true;
			dataManager.isDataManagerValid = true;
			resolve(dataManager);
		}
	});
	});
};


var initializeDataManager = function(dataManager) {
	return new Promise((resolve, reject) => {
	if(!dataManager.isDataManagerInitialized) {
		var currentVersion = require('../package.json').startupDataVersion;
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
		.then(resolve, reject);
	} else {
		resolve(dataManager);
	}
	});
};
var validateDataManager = function(dataManager) {
	return new Promise((resolve, reject) => {
	if(!dataManager.isDataManagerValid) {
		// If the data in the file needs to be updated to include the current
		// module then initialize the data & save it to the file.
		dataManager.dataManagerData[dataManager.moduleName] = {
			'isValid': false
		};
		writeAndValidateDataManagerFile(dataManager)
		.then(resolve, reject);
	} else {
		resolve(dataManager);
	}
	});
};
var checkManagedModuleDataStatus = function(dataManager) {
	return new Promise((resolve, reject) => {
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
							resolve(dataManager);
						});
					} else {
						resolve(dataManager);
					}
				});
			} else {
				resolve(dataManager);
			}
		} else {
			resolve(dataManager);
		}
	});
	});
};
var initializeManagedModuleData = function(dataManager) {
	return new Promise((resolve, reject) => {
	var moduleDataDir = path.normalize(path.join(
		MODULES_PERSISTENT_DATA_PATH,
		dataManager.moduleName
	));
	if(!dataManager.isModuleDataInitialized) {
		fs.mkdir(moduleDataDir, function(err) {
			if(err) {
				fs.mkdir(moduleDataDir, function(err) {
					if(err) {
						reject(err);
					} else {
						dataManager.isModuleDataInitialized = true;
						resolve(dataManager);
					}
				});
			} else {
				dataManager.isModuleDataInitialized = true;
				resolve(dataManager);
			}
		});
	} else {
		resolve(dataManager);
	}

	});
};
var writeAndValidateModuleDataFile = function(dataManager) {
	return new Promise((resolve, reject) => {

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
					console.log('in errB');
					// because the file will just get re-initialized next time
					// just resolve & don't show any errors.
					resolve(dataManager);
				} else {
					dataManager.isModuleDataInitialized = true;
					dataManager.isModuleDataValid = true;
					resolve(dataManager);
				}
			});
		} else {
			dataManager.isModuleDataInitialized = true;
			dataManager.isModuleDataValid = true;
			resolve(dataManager);
		}
	});
	});
};

var internalSaveModuleDataFile = function(dataManager) {
	return new Promise((resolve, reject) => {
	// declare the current module's data to be invalid in the primary module_data file
	dataManager.dataManagerData[dataManager.moduleName].isValid = false;
	writeAndValidateDataManagerFile(dataManager)
	.then(writeAndValidateModuleDataFile)
	.then(function(dataManager) {
		dataManager.dataManagerData[dataManager.moduleName].isValid = true;
		writeAndValidateDataManagerFile(dataManager)
		.then(resolve, resolve);
	});
	});
};
var validateManagedModuleData = function(dataManager) {
	return new Promise((resolve, reject) => {
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
			.then(resolve);
		});
	} else {
		resolve(dataManager);
	}
	});
};
var returnModuleData = function(dataManager) {
	return new Promise((resolve, reject) => {
	resolve(dataManager.moduleData);
	});
};

var loadBaseData = function(data) {
	return new Promise((resolve, reject) => {
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
		resolve(data);
	});
	});
};

var innerLoadModuleStartupData = function(data) {
	return new Promise((resolve, reject) => {
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
			resolve({});
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
	.then(resolve, getHandleError('returnModuleData'));
	});
};

var loadModuleStartupData = function(data) {
	return new Promise((resolve, reject) => {

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
					resolve(data);
				});
			} else {
				console.warn('persistent data manager not configured');
				cachedReadFile(startupDataFilePath)
				.then(parseJSONFile)
				.then(function(initialModuleData) {
					data.startupData = initialModuleData;
					resolve(data);
				});
			}
		} else {
			resolve(data);
		}
	});

	// cachedReadFiles(jsonFiles)
	// .then(parseCachedJSONFiles)
	});
};

var resetModuleStartupData = function(key) {
	return new Promise((resolve, reject) => {
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
									reject(errB);
								}
								resolve();
							});
						}
						resolve();
					});
				} else {
					resolve();
				}
			});
		} else {
			console.log('!!! Persistent data key is invalid !!!');
			resolve();
		}
	} else {
		console.warn('!!! Prevented Deletion of all kipling modules !!!');
		resolve();
	}

	});
};
exports.resetModuleStartupData = resetModuleStartupData;

var revertModuleStartupData = function(moduleName) {
	var moduleDataInitFilePath = path.normalize(path.join(
		MODULES_DIR,
		moduleName,
		MODULE_INIT_PERSISTENT_DATA_FILE_NAME
	));

	return cachedReadFile(moduleDataInitFilePath)
		.then(parseJSONFile)
		.then((initialData) => {
			return saveModuleStartupData(moduleName, initialData);
		});
};
exports.revertModuleStartupData = revertModuleStartupData;

var clearCachedModuleStartupData = function(moduleName) {
	var moduleDataDir = path.normalize(path.join(
		MODULES_PERSISTENT_DATA_PATH,
		moduleName
	));
	var moduleDataFilePath = resolveModuleFilePath(
		moduleDataDir,
		MODULE_PERSISTENT_DATA_FILE_NAME
	);
	return invalidateCacheFile(moduleDataFilePath);
};
exports.clearCachedModuleStartupData = clearCachedModuleStartupData;

var getModuleStartupData = function(moduleName) {
	var moduleDataDir = path.normalize(path.join(
		MODULES_PERSISTENT_DATA_PATH,
		moduleName
	));
	var moduleDataFilePath = resolveModuleFilePath(
		moduleDataDir,
		MODULE_PERSISTENT_DATA_FILE_NAME
	);

	// Perform a cachedRead request for the file & parse it.
	return cachedReadFile(moduleDataFilePath)
		.then(parseJSONFile);
};
exports.getModuleStartupData = getModuleStartupData;

var saveModuleStartupData = function(moduleName, data) {
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
		readGlobalData[moduleName].isValid = false;
		dataManager.dataManagerData = readGlobalData;
		return Promise.resolve(dataManager);
	};
	var validateDesiredModule = function(resDataManager) {
		resDataManager.dataManagerData[moduleName].isValid = true;
		return Promise.resolve(resDataManager);
	};
	var returnModuleName = function(resDataManager) {
		return Promise.resolve(resDataManager.moduleName);
	};

	var executeCachedReadFile = function() {
		return cachedReadFile(MODULES_PERSISTENT_DATA_FILE);
	};

	return executeCachedReadFile()
		.then(parseJSONFile)
		.then(invalidateDesiredModule)
		.then(writeAndValidateDataManagerFile)
		.then(writeAndValidateModuleDataFile)
		.then(validateDesiredModule)
		.then(writeAndValidateDataManagerFile)
		.then(returnModuleName, returnModuleName)
};
exports.saveModuleStartupData = saveModuleStartupData;

var loadModuleCSS = function(data) {
	return new Promise((resolve, reject) => {

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
		resolve(data);
	});
	});
};


var loadModuleJS = function(data) {
	return new Promise((resolve, reject) => {

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
		resolve(data);
	});
	});
};
var loadModuleHTML = function(data) {
	return new Promise((resolve, reject) => {

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
		resolve(data);
	});
	});
};
var loadModuleJSON = function(data) {
	return new Promise((resolve, reject) => {
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
		resolve(data);
	});
	});
};

var innerLoadModuleData = function(data) {
	return new Promise((resolve, reject) => {
	var promises = [
		loadModuleStartupData(data),
		loadModuleCSS(data),
		loadModuleJS(data),
		loadModuleHTML(data),
		loadModuleJSON(data)
	];
	// Wait for all of the operations to complete
	Promise.allSettled(promises)
	.then(function(collectedData) {
		resolve(data);
	}, reject);
	});
};


/*
The loadModuleDataByName function allows module data to be completely fetched
by the module manager for any given module.  It uses the getModuleInfo function
to get the module's module.json file contents.  If this file has already been
obtained (like in the tab-click handlers) then the loadModuleData function
can be used.
*/
var loadModuleDataByName = function(moduleName) {
	return new Promise((resolve, reject) => {
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
	.then(resolve, reject);
	});
};
exports.loadModuleDataByName = loadModuleDataByName;


/*
The loadModuleData function is an in-point to fetching a module's data one step
further along than the loadModuleDataByName function requiring that a module's
.json file has already been loaded.
*/
var loadModuleData = function(moduleData) {
	return new Promise((resolve, reject) => {
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
	.then(resolve, reject);
	});
};
exports.loadModuleData = loadModuleData;
