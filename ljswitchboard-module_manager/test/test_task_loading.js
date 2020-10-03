var assert = require('chai').assert;

var path = require('path');
var module_manager = require('../lib/ljswitchboard-module_manager');

var test_utils = require('./test_utils');

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
		assert.isOk(false, 'failed to reset the persistent data dir');
	});
};

var testTaskName = 'update_manager';

describe('task loading', function() {
	it('getTaskNames', function (done) {
		module_manager.getTaskList()
		.then(function(tasks) {
			tasks.forEach(function(task) {
				var hasAttr = false;
				if(task.name) {
					hasAttr = true;
				}
				assert.isOk(hasAttr, 'Module does not define name attribute');
				moduleNames.push(task.name);
				savedModules[task.name] = task;
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

		module_manager.loadModuleDataByName(testTaskName)
		.then(function(taskData) {
			var endTime = new Date();
			console.log('  - loadModule duration', endTime - startTime);
			if(taskData.json.data_init) {
				assert.deepEqual(
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
			done();
		});
	});
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
	// 			assert.deepEqual(
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
	// 				assert.deepEqual(
	// 					finalStartupData,
	// 					originalStartupData,
	// 					'startup data did not revert');
	// 				done();
	// 			});
	// 		});
	// 	});
	// },
	// 'check cached files': function(test) {
	// 	var cachedFiles = module_manager.getFileCache();
	// 	var cachedFileKeys = Object.keys(cachedFiles);
	// 	console.log('Number of cached files', cachedFileKeys.length);
	// 	console.log(JSON.stringify(loadTimes, null, 2));
	// 	done();
	// },
	it('check for lint errors', function (done) {
		test_utils.getCheckForLintErrors(false)(done);
	});
	it('clearPersistentTestData - final', function (done) {
		clearPersistentTestData(done);
	});
});
