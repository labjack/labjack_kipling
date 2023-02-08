console.log('timing_test.js!!');
console.log('');
console.log('***************************');
console.log('This example requires there to be atleast 1 LJ device available (ANY,ANY,ANY).');
console.log('This example will run FOREVER (until killed)');
console.log('***************************');
console.log('');

// const {PackageLoader} = require('../../ljswitchboard-package_loader/lib/ljswitchboard-package_loader.js');
var simple_logger = require('../lib/ljswitchboard-simple_logger');
var device_manager = require('../../ljswitchboard-device_manager/device_manager');
var  async = require('async');
var path = require('path');
var q = require('q');

var eventMap = require('../lib/events').events;
var eventList            = require("../lib/ljswitchboard-simple_logger").eventList;
var ignoreErrorsList = [
    eventList.STOPPED_LOGGER,
    eventList.CONFIGURATION_SUCCESSFUL,
];

// const package_loader = new PackageLoader();
// const package_loader = package_loader
// const package_loader = new PackageLoader();
// global.package_loader = package_loader;
// package_loader = global.package_loader;

var ENABLE_DEBUG_LOG = true;
var ENABLE_PRINTING = false;
function print() {
    if(ENABLE_DEBUG_LOG){
        var dataToPrint = [];
        dataToPrint.push('timing_test.js');
        for(var i = 0; i< arguments.length; i++){
            dataToPrint.push(argument[i]);
        }
        console.log.apply(console, dataToPrint)
    }
}
function debugLog() {
    if(ENABLE_DEBUG_LOG){
        var dataToPrint = [];
        dataToPrint.push('timing_test.js');
        for(var i = 0; i < arguments.length; i++){
            dataToPrint.push(arguments[i]);
        }
        console.log.apply(console, dataToPrint);
    }
}
var ENABLE_NEW_DATA_REPORTING = true;
function printNewData(){
    if(ENABLE_NEW_DATA_REPORTING){
        var dataToPrint = [];
        dataToPrint.push('timing_test.js');
        for(var i = 0; i < arguments.length; i++){
            dataToPrint.push(arguments[i]);
        }
        console.log.apply(console, dataToPrint);
    }
}

var logger_config_file = 'basic_config.json';
var LOGGER_FILES_DIR = '/test/logger_config_files';
var TEMPLATE_LOGGER_CONFIG_FILE = 'D:/somethingCool/Untitled-1.json';;
var cwd = process.cwd();
var splitCWD = cwd.split(path.sep);
if(splitCWD.indexOf('examples') >= 0){
    splitCWD.splice(splitCWD.indexOf('examples'), 1);
    cwd = path.join.apply(path, splitCWD);
}

var example_path = path.normalize(path.join(
    cwd,
    'examples'
));

var logger_config_file_path = path.normalize(path.join(
    cwd,
    LOGGER_FILES_DIR,
    logger_config_file
));

var template_logger_config_file = path.normalize(path.join(
    cwd,
    TEMPLATE_LOGGER_CONFIG_FILE
));

// console.log('Application CWD:', cwd);
// console.log('logger config file path:', logger_config_file_path)

function attachListeners(loggerObject){
    var eventKeys = Object.keys(eventMap);
    eventKeys.forEach(function(eventKey){
        var key = eventMap[eventKey];
        loggerObject.on(key, function(data){
            if(ignoreErrorsList.indexOf(key) < 0){
                debugLog('captured Event!', key, data);
            }
            var handeledEvent = false;
            // !The caps might become an issue later!
            if(key === 'NEW_VIEW_DATA'){
                if(data.view_type === 'current_values'){
                    printNewData('New view Data', {
                        data: data.data_cache
                    });
                    handeledEvent = true;
				} else if(data.view_type === 'basic_graph') {
					printNewData('New Graph Data', {
						numValsLogged: data.data_cache.length,
						// vals: data.data_cache,
					});
					handeledEvent = true;
				} else {
					console.error('un-handled... data.view_type', data.view_type)
				}
            }else {
				// console.log('un-handled... key', key)
			}
            if(!handeledEvent) {
				printNewData('Captured Event', key, data);
			}
        });
    });
}

// logger app that was in the controller
function loggerApp() {
	this.simpleLogger;
	this.deviceManager;
	this.logConfigs;

	// const io_manager 		 = package_loader.getPackage('io_manager');
	// const io_interface		 = io_manager.io_interface();
	// const driver_controller  = io_interface.getDriverController();
	// const device_controller  = io_interface.getDeviceController();
	// this.getListAllDevicesErrors = device_controller.getListAllDevicesErrors;
	// this.getCachedListAllDevices = device_controller.getCachedListAllDevices;
	// this.listAllDevices = device_controller.listAllDevices;
	// this.device_controller = device_controller;
	// this.driver_controller = driver_controller;
	// console.error("this.device_controller", this.device_controller)
	

	// console.error("this.device_controller", this.device_controller)
	
	// const result = this.initializeLogger();


	this.initializeLogger = function(){
		debugLog('--- In Func: initializeLogger1');
		console.log("wot")
		this.placeToSaveFile = 'D:/irellydontcare'
		// self.device_selector = device_selector.create();
		// console.warn("device_selector", device_selector)
		
		var defered = q.defer();

		this.simpleLogger = simple_logger.create();
		console.log("this", this.simpleLogger)
		// console.warn("self.simplelogger", self.simpleLogger)
		
		// console.error("placeToSaveFile", placeToSaveFile)
		this.simpleLogger.setFilePath(this.placeToSaveFile)
		// this.simpleLogger.initialize()
		// this.simpleLogger.stopRunning(false)
		// Zander - should be able to assign the value 
		// console.warn("self.simplelogger", self.simpleLogger.stopRunning(false))
		attachListeners(this.simpleLogger);
		this.simpleLogger.initialize()
		// Intentionally delay to allow user to read start-up message.
		setTimeout(function() {
			defered.resolve();
			// console.log("this", this.simpleLogger)
			
			// .then(function(res) {
			// 	debugLog('--- App Initialized');
			// 	defered.resolve();
			// }, function(err) {
			// 	console.error('Failed to initialize the logger',err);
			// 	defered.resolve();
			// });
		}, 5000);
		
		return defered.promise;
	};
	// getting the conection - newname
	this.initializeDeviceManager = function() {
		debugLog('--- In Func: initializeDeviceManager');
		var defered = q.defer();

		this.deviceManager = device_manager.create();

		this.deviceManager.connectToDevices([{
			dt:'LJM_dtANY',
			ct:'LJM_ctANY',
			id:'LJM_idANY',
		}])
		.then(function(res) {
			debugLog('--- Connected to devices!',res);
			defered.resolve();
		}, function(err) {
			console.error('Failed to connect to devices',err);
			defered.resolve();
		});
		console.warn("sdfsfsfsfsF")
		return defered.promise;
	};

	this.updateDeviceListing = function() {
		debugLog('--- In Func: updateDeviceListing');
		// debugLog('Connected Devices', this.deviceManager.getDevices());
		var defered = q.defer();
		this.simpleLogger.updateDeviceListing(this.deviceManager.getDevices())
		.then(function(res) {
			// debugLog('Device listing has been passwd to the logger',res);
			defered.resolve();
		}, function(err) {
			console.error('Failed to save the device listing to the logger',err);
			defered.resolve();
		}); 
		return defered.promise;
	};
	this.configureLogger = function() {
		debugLog('--- In Func: configureLogger');
		var defered = q.defer();

		/*
		Old config:
		{
			'configType': 'filePath',
			'filePath': logger_config_file_path
		}
		*/
		// this.updateDeviceListing();
		var timeToLog = 5 ;
		// if(timeToLog <= 0){}
		// registersToRead = [];
		// for (i = 0; i < 8; i++){
		// 	var zipElement = document.getElementById("validationCustom0" + i).value;
		// 	if (zipElement == ''){}
		// 	else{
		// 		registersToRead.push(zipElement)
		// }
		// }
		
		// // This is the bace case If this is ever used at all(It should not)
		// if(registersToRead.length <= 0){
		// 	registersToRead.push('AIN0')
		// }

		// same_vals_all_devices': true,
		// 	'registers': registersToRead,
		// 	'update_rate_ms': 100,
		// 	'logTime': timeToLog,
		var some = this.deviceManager.getDevices();

		console.warn("this.device manager", some)
		this.logConfigs = simple_logger.generateBasicConfig({
			'same_vals_all_devices': true,
			'registers': ['AIN0','AIN1'],
			'update_rate_ms': 100,
			'logTime': timeToLog,
		},this.deviceManager.getDevices());
		// 470015117
		// self.deviceManager.getDevices()


		var template_logger_config_file = 'D:/somethingCool/Untitled-1.json';

		this.simpleLogger.configureLogger({
			'configType': 'filePath',
			'filePath': template_logger_config_file,
			isValid: true
		})

		var fs = require('fs');
		fs.writeFile(template_logger_config_file,JSON.stringify(this.logConfigs,null,2),function(err) {
			if(err) {
				console.error('Error saving generated configs');
			} else {
				debugLog('Data was appended to the config file.');
			}
			console.error("self.simplelogger", this)
			// this.simpleLogger.configureLogger({
			// 	'configType': 'filePath',
			// 	'filePath': template_logger_config_file
			// })
			// self.simpleLogger.configureLogger({
			// 	configType: 'object',
			// 	configData: self.logConfigs,
			// 	filePath: cwd
			defered.resolve();
			// })
			// .then(function(res) {
			// 	debugLog('Logger has been configured.',res)
			// 	defered.resolve();
			// }, function(err) {
			// 	console.error('Logger failed to be configured.',err)
			// 	defered.resolve();
			// });
		});

		


		
		return defered.promise;
	}
	this.startLogger = function() {
		debugLog('--- In Func: startLogger');
		var defered = q.defer();
		this.simpleLogger.once(eventMap.STOPPED_LOGGER, function(stopData) {
			debugLog('Logger Stopped');
			// console.log('(hello_world.js) Logger has stopped!!')
			defered.resolve();
		});
		this.simpleLogger.startLogger()
		.then(function succ() {
			
			debugLog('Logger Started');
			return defered.promise;
		}, function err(err) {
			debugLog('Logger Started with error', err);
		});
		return defered.promise;
	}
	this.waitForLoggerToRun = function() {
		debugLog('--- In Func: waitForLoggerToRun');
		var defered = q.defer();
		defered.resolve();
		return defered.promise;
	}
	this.closeDevices = function() {
		var defered = q.defer();
		// self.deviceManager.closeDevices()
		this.deviceManager.closeDevices()
		.then(defered.resolve, defered.reject);
		return defered.promise;
	}
	// this.reOpenDevices = function() {
	// 	var defered = q.defer();
	// 	this.deviceManager.reOpenDevices()
	// 	.then(defered.resolve, defered.reject);
	// 	return defered.promise;
	// }
	this.finish = function() {
		debugLog('--- In Func: finish1');
		var defered = q.defer();
		// setTimeout(defered.resolve, 1000);
		defered.resolve();
		// Zander - should there be information when the logger has finished?
		alert("Logging as completed.")
		$('.module-chrome-tab').each(function(){
			$(this).css("background-color", "#E0E0E0;");
			$(this).css("color", "black")
		  })
		console.log("Finished Logging")
		MODULE_CHROME.enableModuleLoading();
		return defered.promise;
	}
	// Zander - what is the point of this?
	// var self = this;
}
var app = new loggerApp();

var loggerAppSteps = [
    'initializeLogger',				// Performed at start-up
    'initializeDeviceManager',		// Performed at start-up
    'updateDeviceListing',			// Performed when configuring logger
    'configureLogger',				// Performed when configuring logger
    'startLogger',					// Performed when starting logger
    'waitForLoggerToRun',			// Allowing the logger to run...
    // 'closeDevices',					
    'finish',
];

loggerAppSteps.forEach(function(step) {
	if(typeof(app[step]) != 'function') {
		console.error('App Step', step, 'is not defined!');
		process.exit();
	}
});

var isTerminated = false;
async.eachSeries(
	loggerAppSteps,
	function(step, cb) {
		function onErr(err) {
			isTerminated = true;
			cb(err);
		}
		try {
			app[step]().then(cb, onErr);
            // process.exit();
		} catch(err) {
			console.error('Error executing app step', step, err);
		}
	},
	function(err) {
		// console.log('This was the error...', err);
	});
