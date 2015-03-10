
var q = require('q');
var path = require('path');
var fs = require('fs.extra');
var module_manager = require('../../lib/ljswitchboard-module_manager');
var test_env = require('../test_env/test_env');
var module_loader = require('../test_env/mock_module_loader');
var mock_jquery = require('../test_env/mock_jquery');
var $ = mock_jquery.jquery;

var test_utils = require('../test_utils');
var addFrameworkFiles = test_utils.addFrameworkFiles;
var checkLoadedModuleData = test_utils.checkLoadedModuleData;
var printLintError = test_utils.printLintError;
var checkLoadedFiles = test_utils.checkLoadedFiles;
var getLoadedFiles = test_utils.getLoadedFiles;

var cwd = process.cwd();
var testDir = 'test_persistent_data_dir';
var testPath = path.normalize(path.join(cwd, testDir));
var testPersistentDataFilePath = testPath;

var testModuleName = 'device_selector';

var MODULE_LOADER;
var device_selector_active_module;
var device_selector_module_data;
var tests = {
	'enable module linting': function(test) {
		// enable module linting.
		// module_manager.disableLinting();

		// Configure the persistent data directory
		module_manager.configurePersistentDataPath(testPersistentDataFilePath);
		test.done();
	},
	'getModuleNames': function(test) {
		module_manager.getModulesList()
		.then(function(categories) {
			var categoryKeys = Object.keys(categories);
			var hasModule = false;
			categoryKeys.forEach(function(categoryKey) {
				var modules = categories[categoryKey];
				modules.forEach(function(module) {
					if(module.name) {
						if(module.name === testModuleName) {
							hasModule = true;
						}
					}
					
				});
			});
			test.ok(hasModule, 'Test Module: ' + testModuleName + ', was not found');
			test.done();
		});
	},
	'Initialize Test Environment': test_env.initialize,
	'loadModuleDataByName': function(test) {
		test_utils.clearLoadedFiles();
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
			device_selector_module_data = moduleData;
			checkLoadedModuleData(test, moduleData);
			test.done();
		});
	},
	'check for lint errors': test_utils.getCheckForLintErrors(true),
	'initialize device_selector module': function(test) {
		// Setup a fake test environment
		MODULE_LOADER = new module_loader.createFakeModuleLoader(
			device_selector_module_data
		);
		
		// Execute the module
		var jsFiles = device_selector_module_data.js;
		// console.log('  - Num JS files', jsFiles.length);
		var i;
		for(i = 0; i < jsFiles.length; i++) {
			var jsFile = jsFiles[i];
			// console.log(
			// '    - Name: ',
			// jsFile.fileName,
			// Object.keys(jsFile)
			// );
			
			// Execute module .js file
			try {
				eval(jsFile.fileData); // jshint ignore:line
			} catch(err) {
				console.log(
					'!!! Error executing file: ',
					jsFile.fileName,
					err
				);
			}
		}
		device_selector_active_module = activeModule;
		test.done();
	},
	'trigger module to start': function(test) {
		device_selector_active_module.on(
			device_selector_active_module.eventList.MODULE_STARTED,
			function() {
				test.done();
			});
		MODULE_LOADER.triggerLoadEvent()
		.then(function(res) {
		});
	},
	'trigger module to start new scan': function(test) {
		var startedScanEventCaught = false;
		device_selector_active_module.on(
			device_selector_active_module.eventList.DEVICE_SCAN_STARTED,
			function() {
				startedScanEventCaught = true;
			});
		device_selector_active_module.on(
			device_selector_active_module.eventList.DEVICE_SCAN_COMPLETED,
			function() {
				test.ok(startedScanEventCaught, 'should triggered scan started event');
				test.done();
			});
		var viewGen = device_selector_active_module.viewGen;
		var refreshButton = viewGen.pageElements.refresh_devices_button.ref;
		
		// Trigger the click event for the refresh button and make sure the scan
		// happens.
		refreshButton.trigger('click');
	},
	'get displayed device data': function(test) {
		var viewGen = device_selector_active_module.viewGen;
		var jqueryScanResults = $('#device_scan_results');
		console.log('Jquerys data', jqueryScanResults.html());
		var renderedResults = viewGen.pageElements.device_scan_results.ref;
		console.log('Stored data', renderedResults.html());
		test.done();
	},
	'trigger module to stop': function(test) {
		device_selector_active_module.on(
			device_selector_active_module.eventList.MODULE_STOPPED,
			function() {
				test.done();
			});
		MODULE_LOADER.triggerStopEvent()
		.then(function(res) {
		});
	},
	'Destruct Test Environment': test_env.destruct,
};

exports.tests = tests;