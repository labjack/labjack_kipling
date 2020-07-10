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
// module_manager.disableLinting();

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



var testTaskName = 'update_manager';

var tests = {
	'getTaskNames': function(test) {
		module_manager.getTaskList()
		.then(function(tasks) {
			tasks.forEach(function(task) {
				var hasAttr = false;
				if(task.name) {
					hasAttr = true;
				}
				test.ok(hasAttr, 'Module does not define name attribute');
				moduleNames.push(task.name);
				savedModules[task.name] = task;
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

		module_manager.loadModuleDataByName(testTaskName)
		.then(function(taskData) {
			var endTime = new Date();
			console.log('  - loadModule duration', endTime - startTime);
			if(taskData.json.data_init) {
				test.deepEqual(
					taskData.startupData,
					taskData.json.data_init,
					'startup data data did not load'
				);
			}
			console.log('Loaded task', Object.keys(taskData));
			console.log('Task Data', taskData.data);
			console.log('Task Startup Data', taskData.startupData);

			var checkLengthsOf = [
				'css', 'js', 'html', 'jsonFiles'
			];
			checkLengthsOf.forEach(function(checkKey) {
				console.log('Length of', checkKey, ':', taskData[checkKey].length);
			});
			taskData.js.forEach(function(jsFile){
				console.log('jsFile', Object.keys(jsFile));
			});
			// checkLoadedModuleData(test, taskData);
			test.done();
		});
	},
	// 'readWriteReadModuleStartupData': function(test) {
	// 	var originalStartupData = {};
	// 	module_manager.getModuleStartupData(testModuleName)
	// 	.then(function(startupData) {
	// 		// Save the startup data to a different object
	// 		Object.keys(startupData).forEach(function(key) {
	// 			originalStartupData[key] = startupData[key];
	// 		});
	// 		// Add data to the object & save/re-read it.
	// 		startupData.myNewAttr = 'abab';
	// 		module_manager.saveModuleStartupData(testModuleName, startupData)
	// 		.then(module_manager.getModuleStartupData)
	// 		.then(function(newStartupData) {
	// 			// Make sure the file has changed appropriately
	// 			test.deepEqual(
	// 				startupData,
	// 				newStartupData,
	// 				'startup data did not change'
	// 			);
	// 			startupData.myNewAttr = 'abab';

	// 			// Return it back to its original state
	// 			module_manager.revertModuleStartupData(testModuleName)
	// 			.then(module_manager.getModuleStartupData)
	// 			.then(function(finalStartupData) {
	// 				// Make sure that the file has changed back to its original 
	// 				// state.
	// 				test.deepEqual(
	// 					finalStartupData,
	// 					originalStartupData,
	// 					'startup data did not revert');
	// 				test.done();
	// 			});
	// 		});
	// 	});
	// },
	// 'check cached files': function(test) {
	// 	var cachedFiles = module_manager.getFileCache();
	// 	var cachedFileKeys = Object.keys(cachedFiles);
	// 	console.log('Number of cached files', cachedFileKeys.length);
	// 	console.log(JSON.stringify(loadTimes, null, 2));
	// 	test.done();
	// },
	'check for lint errors': test_utils.getCheckForLintErrors(false),
	'clearPersistentTestData - final': clearPersistentTestData,
};

exports.tests = tests;