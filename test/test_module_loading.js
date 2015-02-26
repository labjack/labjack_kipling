var q = require('q');
var path = require('path');
var fs = require('fs.extra');
var module_manager = require('../lib/ljswitchboard-module_manager');

var test_utils = require('./test_utils');
var addFrameworkFiles = test_utils.addFrameworkFiles;
var checkLoadedModuleData = test_utils.checkLoadedModuleData;
var printLintError = test_utils.printLintError;
var checkLoadedFiles = test_utils.checkLoadedFiles;


var moduleNames = [];
var savedModules = {};
var loadTimes = {};



var cwd = process.cwd();
var testDir = 'test_persistent_data_dir';
var testPath = path.normalize(path.join(cwd, testDir));
var testPersistentDataFilePath = testPath;
// disable module linting.
module_manager.disableLinting();

// Configure the persistent data directory
module_manager.configurePersistentDataPath(testPersistentDataFilePath);
var clearPersistentTestData = function(test) {
	module_manager.resetModuleStartupData(
		'I am self aware and will be deleting a LOT of things'
	)
	.then(function(res) {
		test.done();
	}, function(err) {
		test.ok(false, 'failed to reset the persistent data dir');
	});
};



var testModuleName = 'device_selector';

var tests = {
	'getModuleNames': function(test) {
		module_manager.getModulesList()
		.then(function(categories) {
			var categoryKeys = Object.keys(categories);
			categoryKeys.forEach(function(categoryKey) {
				var modules = categories[categoryKey];
				modules.forEach(function(module) {
					var hasAttr = false;
					if(module.name) {
						hasAttr = true;
					}
					test.ok(hasAttr, 'Module does not define name attribute');
					moduleNames.push(module.name);
					savedModules[module.name] = module;
				});
			});

			// Make sure there aren't any naming conflicts
			var numNames = moduleNames.length;
			var numObjs = Object.keys(savedModules).length;
			test.ok((numNames == numObjs), 'Naming conflicts...');
			test.done();
		});
	},
	'clearPersistentTestData - initial': clearPersistentTestData,
	'loadModuleDataByName': function(test) {
		// console.log('Modules...', moduleNames);
		var startTime = new Date();

		module_manager.loadModuleDataByName(testModuleName)
		.then(function(moduleData) {
			var endTime = new Date();
			console.log('  - loadModule duration', endTime - startTime);
			if(moduleData.json.data_init) {
				test.deepEqual(
					moduleData.startupData,
					moduleData.json.data_init,
					'startup data data did not load'
				);
			}
			checkLoadedModuleData(test, moduleData);
			test.done();
		});
	},
	'readWriteReadModuleStartupData': function(test) {
		var originalStartupData = {};
		module_manager.getModuleStartupData(testModuleName)
		.then(function(startupData) {
			// Save the startup data to a different object
			Object.keys(startupData).forEach(function(key) {
				originalStartupData[key] = startupData[key];
			});
			// Add data to the object & save/re-read it.
			startupData.myNewAttr = 'abab';
			module_manager.saveModuleStartupData(testModuleName, startupData)
			.then(module_manager.getModuleStartupData)
			.then(function(newStartupData) {
				// Make sure the file has changed appropriately
				test.deepEqual(
					startupData,
					newStartupData,
					'startup data did not change'
				);
				startupData.myNewAttr = 'abab';

				// Return it back to its original state
				module_manager.revertModuleStartupData(testModuleName)
				.then(module_manager.getModuleStartupData)
				.then(function(finalStartupData) {
					// Make sure that the file has changed back to its original 
					// state.
					test.deepEqual(
						finalStartupData,
						originalStartupData,
						'startup data did not revert');
					test.done();
				});
			});
		});
	},
	// 'loadAllModulesByName': function(test) {
	// 	loadTimes.byName = {
	// 		'start': new Date(),
	// 		'end': null,
	// 		'duration': null
	// 	};
	// 	var promises = [];
	// 	var loadModule = function(moduleName) {
	// 		var defered = q.defer();
	// 		module_manager.loadModuleDataByName(moduleName)
	// 		.then(function(moduleData) {
	// 			checkLoadedModuleData(test, moduleData);
	// 			defered.resolve();
	// 		});
	// 		return defered.promise;
	// 	};
	// 	moduleNames.forEach(function(moduleName) {
	// 		promises.push(loadModule(moduleName));
	// 	});

	// 	q.allSettled(promises)
	// 	.then(function(collectedData) {
	// 		test.ok(true, 'test finished');
	// 		loadTimes.byName.end = new Date();
	// 		loadTimes.byName.duration = loadTimes.byName.end - loadTimes.byName.start;
	// 		test.done();
	// 	}, function(err) {
	// 		test.ok(false, 'test failed');
	// 		test.done();
	// 	});
	// },
	// 'loadAllModulesByObject': function(test) {
	// 	loadTimes.byObject = {
	// 		'start': new Date(),
	// 		'end': null,
	// 		'duration': null
	// 	};
	// 	var promises = [];
	// 	var loadModule = function(moduleObj) {
	// 		var defered = q.defer();
	// 		module_manager.loadModuleData(moduleObj)
	// 		.then(function(moduleData) {
	// 			checkLoadedModuleData(test, moduleData);
	// 			defered.resolve();
	// 		});
	// 		return defered.promise;
	// 	};
	// 	var moduleKeys = Object.keys(savedModules);
	// 	moduleKeys.forEach(function(moduleKey) {
	// 		promises.push(loadModule(savedModules[moduleKey]));
	// 	});

	// 	q.allSettled(promises)
	// 	.then(function(collectedData) {
	// 		test.ok(true, 'test finished');
	// 		loadTimes.byObject.end = new Date();
	// 		loadTimes.byObject.duration = loadTimes.byObject.end - loadTimes.byObject.start;
	// 		test.done();
	// 	}, function(err) {
	// 		test.ok(false, 'test failed');
	// 		test.done();
	// 	});
	// },
	// 'check cached files': function(test) {
	// 	var cachedFiles = module_manager.getFileCache();
	// 	var cachedFileKeys = Object.keys(cachedFiles);
	// 	console.log('Number of cached files', cachedFileKeys.length);
	// 	console.log(JSON.stringify(loadTimes, null, 2));
	// 	test.done();
	// },
	// 'check for lint errors': function(test) {
	// 	var loadedFileKeys = Object.keys(loadedFiles);
	// 	console.log('');
	// 	console.log('Num Checked Files', loadedFileKeys.length);
	// 	console.log('');
	// 	var numLintedFiles = 0;
	// 	var warnings = [];
	// 	var errors = [];
	// 	loadedFileKeys.forEach(function(loadedFileKey) {
	// 		var loadedFile = loadedFiles[loadedFileKey];
	// 		if(loadedFile.lintResult) {
	// 			numLintedFiles += 1;
	// 			if(loadedFile.lintResult.isWarning) {
	// 				warnings.push(loadedFile);
	// 			}
	// 			if(loadedFile.lintResult.isError) {
	// 				errors.push(loadedFile);
	// 			}

	// 			if(!loadedFile.lintResult.overallResult) {
	// 				console.log(
	// 					'-------------------',
	// 					'Lint Error Detected: ' + loadedFile.fileName,
	// 					'-------------------'
	// 				);
	// 				console.log(loadedFile.fileName);
	// 				console.log(loadedFile.filePath);
	// 				printLintError(loadedFile.lintResult);
	// 				console.log('');
	// 			}
	// 		}
	// 	});

	// 	console.log('Number of linted files', numLintedFiles);
	// 	console.log('Number of warnings', warnings.length);
	// 	console.log('Number of errors', errors.length);

	// 	test.done();
	// },
	'clearPersistentTestData - final': clearPersistentTestData,
};

exports.tests = tests;