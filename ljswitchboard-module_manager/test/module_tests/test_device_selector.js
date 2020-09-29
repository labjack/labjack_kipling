var assert = require('chai').assert;

var path = require('path');
var fs = require('fs.extra');
var module_manager = require('../../lib/ljswitchboard-module_manager');
var test_env = require('../test_env/test_env');
var module_loader = require('../test_env/mock_module_loader');
var mock_jquery = require('../test_env/mock_jquery');
var $ = mock_jquery.jquery;

var test_utils = require('../test_utils');
var checkLoadedModuleData = test_utils.checkLoadedModuleData;

var cwd = process.cwd();
var testDir = 'test_persistent_data_dir';
var testPath = path.normalize(path.join(cwd, testDir));
var testPersistentDataFilePath = testPath;

var testModuleName = 'device_selector';

var MODULE_LOADER;
var device_selector_active_module;
var device_selector_module_data;

describe('device selector', function() {
	it('enable module linting', function (done) {
		// enable module linting.
		// module_manager.disableLinting();

		// Configure the persistent data directory
		module_manager.configurePersistentDataPath(testPersistentDataFilePath);
		done();
	});
	it('getModuleNames', function (done) {
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
			assert.isOk(hasModule, 'Test Module: ' + testModuleName + ', was not found');
			done();
		});
	});
	it('Initialize Test Environment', function (done) {
		test_env.initialize(done);
	});
	it('loadModuleDataByName', function (done) {
		test_utils.clearLoadedFiles();
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
			device_selector_module_data = moduleData;
			checkLoadedModuleData(moduleData);
			done();
		});
	});
	it('check for lint errors', function (done) {
		test_utils.getCheckForLintErrors(true)(done);
	});
	it('initialize device_selector module', function (done) {
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
		done();
	});
	it('trigger module to start', function (done) {
		device_selector_active_module.on(
			device_selector_active_module.eventList.MODULE_STARTED,
			function() {
				done();
			});
		MODULE_LOADER.triggerLoadEvent()
		.then(function(res) {
		});
	});
	it('trigger module to start new scan', function (done) {
		var startedScanEventCaught = false;
		device_selector_active_module.on(
			device_selector_active_module.eventList.DEVICE_SCAN_STARTED,
			function() {
				startedScanEventCaught = true;
			});
		device_selector_active_module.on(
			device_selector_active_module.eventList.DEVICE_SCAN_COMPLETED,
			function() {
				assert.isOk(startedScanEventCaught, 'should triggered scan started event');
				done();
			});
		var viewGen = device_selector_active_module.viewGen;
		var refreshButton = viewGen.pageElements.refresh_devices_button.ref;

		// Trigger the click event for the refresh button and make sure the scan
		// happens.
		refreshButton.trigger('click');
	});
	it('get displayed device data', function (done) {
		var viewGen = device_selector_active_module.viewGen;
		var jqueryScanResults = $('#device_scan_results');
		console.log('Jquerys data', jqueryScanResults.html());
		var renderedResults = viewGen.pageElements.device_scan_results.ref;
		console.log('Stored data', renderedResults.html());
		done();
	});
	it('trigger module to stop', function (done) {
		device_selector_active_module.on(
			device_selector_active_module.eventList.MODULE_STOPPED,
			function() {
				done();
			});
		MODULE_LOADER.triggerStopEvent()
		.then(function(res) {
		});
	});
	it('Destruct Test Environment', function (done) {
		test_env.destruct(done);
	});
});
