var assert = require('chai').assert;

var path = require('path');
var module_manager = require('../lib/ljswitchboard-module_manager');

var test_utils = require('./test_utils');
var checkLoadedModuleData = test_utils.checkLoadedModuleData;

var moduleNames = [];
var savedModules = {};

var cwd = process.cwd();
var testDir = 'test_persistent_data_dir';
var testPath = path.normalize(path.join(cwd, testDir));
var testPersistentDataFilePath = testPath;
// disable module linting.
// module_manager.disableLinting();

// Configure the persistent data directory
module_manager.configurePersistentDataPath(testPersistentDataFilePath);
var clearPersistentTestData = function(done) {
	module_manager.resetModuleStartupData(
		'I am self aware and will be deleting a LOT of things'
	)
	.then(function(res) {
		done();
	}, function(err) {
		assert.ok(false, 'failed to reset the persistent data dir');
	});
};



var testModuleName = 'device_selector';

describe('module loading', function() {
	it('getModuleNames', function (done) {
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
					assert.isOk(hasAttr, 'Module does not define name attribute');
					moduleNames.push(module.name);
					savedModules[module.name] = module;
				});
			});

			// Make sure there aren't any naming conflicts
			var numNames = moduleNames.length;
			var numObjs = Object.keys(savedModules).length;
			assert.isOk((numNames == numObjs), 'Naming conflicts...');
			done();
		});
	});
	it('clearPersistentTestData', function (done) {
		clearPersistentTestData(done);
	});
	it('loadModuleDataByName', function (done) {
		// console.log('Modules...', moduleNames);
		var startTime = new Date();

		module_manager.loadModuleDataByName(testModuleName)
		.then(function(moduleData) {
			var endTime = new Date();
			console.log('  - loadModule duration', endTime - startTime);
			if(moduleData.json.data_init) {
				assert.deepEqual(
					moduleData.startupData,
					moduleData.json.data_init,
					'startup data data did not load'
				);
			}
			checkLoadedModuleData(moduleData);
			done();
		});
	});
	it('readWriteReadModuleStartupData', function (done) {
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
				assert.deepEqual(
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
					assert.deepEqual(
						finalStartupData,
						originalStartupData,
						'startup data did not revert');
					done();
				});
			});
		});
	});
	it('readWrite startupData AndLoadModule', function (done) {
		var originalStartupData = {};
		module_manager.getModuleStartupData(testModuleName)
		.then(function(startupData) {
			// console.log('currentData', startupData);
			// Save the startup data to a different object
			Object.keys(startupData).forEach(function(key) {
				originalStartupData[key] = startupData[key];
			});
			// Add data to the object & save/re-read it.
			startupData.myNewAttr = 'abab';
			module_manager.saveModuleStartupData(testModuleName, startupData)
			.then(module_manager.getModuleStartupData)
			.then(function(newStartupData) {
				// console.log('currentData', newStartupData);
				// Make sure the file has changed appropriately
				assert.deepEqual(
					startupData,
					newStartupData,
					'startup data did not change'
				);
				// console.log('modules startup data', newStartupData);
				module_manager.loadModuleDataByName(testModuleName)
				.then(function(moduleData) {
					// console.log('currentData', moduleData.startupData);
					// Make sure that the module's startupData is what was
					// written
					assert.deepEqual(
						moduleData.startupData,
						startupData,
						'startup data was re-set'
					);
					module_manager.revertModuleStartupData(testModuleName)
					.then(module_manager.getModuleStartupData)
					.then(function(finalStartupData) {
						// console.log('currentData', finalStartupData);
						// Make sure that the file has changed back to its
						// original state.
						assert.deepEqual(
							finalStartupData,
							originalStartupData,
							'startup data did not revert'
						);
						module_manager.loadModuleDataByName(testModuleName)
						.then(function(moduleDataB) {
							// console.log('finalData', moduleDataB.startupData);
							// Make sure the module's startupData was reverted
							// back to its original state.
							assert.deepEqual(
								moduleDataB.startupData,
								originalStartupData,
								'startup data did not revert B'
							);
							done();
						});
					});
				});
			});
		});
	});
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
	// 		assert.isOk(true, 'test finished');
	// 		loadTimes.byName.end = new Date();
	// 		loadTimes.byName.duration = loadTimes.byName.end - loadTimes.byName.start;
	// 		done();
	// 	}, function(err) {
	// 		assert.isOk(false, 'test failed');
	// 		done();
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
	// 		assert.isOk(true, 'test finished');
	// 		loadTimes.byObject.end = new Date();
	// 		loadTimes.byObject.duration = loadTimes.byObject.end - loadTimes.byObject.start;
	// 		done();
	// 	}, function(err) {
	// 		assert.isOk(false, 'test failed');
	// 		done();
	// 	});
	// },
	// 'check cached files': function(test) {
	// 	var cachedFiles = module_manager.getFileCache();
	// 	var cachedFileKeys = Object.keys(cachedFiles);
	// 	console.log('Number of cached files', cachedFileKeys.length);
	// 	console.log(JSON.stringify(loadTimes, null, 2));
	// 	done();
	// },
	// 'check for lint errors': test_utils.getCheckForLintErrors(false),
	// 'clearPersistentTestData - final': clearPersistentTestData,
});
