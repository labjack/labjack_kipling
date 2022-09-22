/* jshint undef: true, unused: true, undef: true */
/* global console, module_manager, dict, q, showAlert, modbus_map, $ */
/* global ljmmm_parse, handlebars */

/* exported activeModule, module, MODULE_UPDATE_PERIOD_MS */

/**
 * Goals for the Simple Logger module:
**/

const { time }           = require('console');
const fs                 = require('fs')
var device_manager       = require('ljswitchboard-device_manager')
var CREATE_SIMPLE_LOGGER = require("ljswitchboard-simple_logger");
const { dirname }        = require('path');
const { underscored } = require('underscore');
var modbus_map           = require('ljswitchboard-modbus_map').getConstants();
// var device_controller = require('./device_controller');

const package_loader = global.package_loader;
const fs_facade = package_loader.getPackage('fs_facade');

var REGISTERS_DATA_SRC = 'simple_logger/ljm_constants.json';

// Constant that determines device polling rate.  Use an increased rate to aid
// in user experience.
var MODULE_UPDATE_PERIOD_MS = 1000; 

/**
 * Handles the user signaling to start the simple logger
 * from the start button press, this is the @onClick method
 */
function userStartLogger() {
	// TO-DO:
	/**
	 * This will handle the user pressing the start button.
	 * We need to create the logger object
	 * start the event loop
	 * and make sure everything is ready to begin logging to file
	 */
}


function loadConfigFile(config) {
	$("#logName").val(config.logging_config.name)
	// let deviceManager = device_manager.create();
	// deviceManager.connectToDevices([{
	// 	dt:'LJM_dtANY',
	// 	ct:'LJM_ctANY',
	// 	id:'LJM_idANY',
	// }])
	// devices = deviceManager.getDevices()
	// var validSN = devices[0].savedAttributes.serialNumber
	// $("#denSN").val(validSN)
	// }
}
/**  opens the file explorer to look for .json config files 
*  all we really need is the file path, which is passed to the logger
* but it can also be read to the view with FileReader() 
*/
function openFile(func) {
    readFile = function(e) {
        var file = e.target.files[0];
        if (!file) {
            return;
        }
        filePath = e.target.files[0]["path"]
        verifyConfigFile(filePath)
        // let json = JSON.stringify(filePath)

        // var config_data = JSON.parse(fs.readFileSync(filePath))
        // console.error("Config Data:", config_data)

        var config_data = fs.readFileSync(filePath)
        // let str = JSON.stringify(config_data, null, 4)
        let obj = JSON.parse(config_data) 
        loadConfigFile(obj)

        var reader = new FileReader();
        reader.onload = function(e) {
            var contents = e.target.result;
            // fileInput.func(contents)
            document.body.removeChild(fileInput)
        }
        reader.readAsText(file)
    }
    fileInput = document.createElement("input")
    fileInput.type='file'
    fileInput.style.display='none'
    fileInput.onchange=readFile
    fileInput.func=func
    fileInput.accept = ".json"
    document.body.appendChild(fileInput)
    fileInput.click()
}


// console.error("Starting Config Step")
// let logConfigs = simple_logger.generateBasicConfig({
//     'same_vals_all_devices': true,
//     'registers': ['AIN0','AIN1'],
//     'update_rate_ms': 100,
// },device_manager.getDevices());

var configObj = {
	"logging_config": {
		"name": "",
		"file_prefix": "",
		"write_to_file": true,
		"default_result_view": "0",
		"default_result_file": "0"
	},
	"view_config": {
		"update_rate_ms": 200
	},
	"views": [],

	"data_groups": [],
	"basic_data_group": {
		"group_name": "Basic Data Group",
		"group_period_ms": 500,
		"is_stream": false,
		// programaticaly define fill device_serial_numbers array and define device sn objects.
		"device_serial_numbers": [],
		"defined_user_values": [],
		// programatically fill the defined_user_values array and populate the user_values object.  For now, just make them the register names...
		"user_values": {},
		"logging_options": {
			"write_to_file": true,
			"file_prefix": "basic_group",
			"max_samples_per_file": 65335,
			"data_collector_config": {
				"REPORT_DEVICE_IS_ACTIVE_VALUES": true,
				"REPORT_DEFAULT_VALUES_WHEN_LATE": false
			}
		}
	},
	// "stop_trigger": {
	// 	"relation": "and",
	// 	"triggers": [{
	// 		"attr_type": "num_logged", "data_group": "basic_data_group", "val": 8
	// 	}]
	// }
};

/** Call to simple logger module to verify an existing config json file
*   returns a promise, when resolved it does nothing
*   if the promise resolves to an error (invalid file or something)
*   it displays an error window
*/
function verifyConfigFile(filepath) {
    CREATE_SIMPLE_LOGGER.verifyConfigFile(filepath)
    .catch(err => alert("Invalid Logger Configuration File", err))

}

function getRegisters()
{
	return new Promise((resolve) => {
		var registerInfoSrc = fs_facade.getExternalURI(REGISTERS_DATA_SRC);
		fs_facade.getJSON(registerInfoSrc, genericErrorHandler, function (info) {
			resolve(info['registers']);
		});
	});
}

/**
 * Module object that gets automatically instantiated & linked to the appropriate framework.
 * When using the 'singleDevice' framework it is instantiated as sdModule.
 */
function module() {
    this.moduleConstants = {};
	this.startupRegList = {};
	this.interpretRegisters = {};
    this.startupData = {};
    this.moduleName = '';
    this.moduleContext = {};
    this.activeDevice = undefined;
	this.deviceSN = '00000000';
	this.device_controller = undefined;
	this.driver_contoller = undefined;

    var logger_modes = {
        'active': 'dashboard_mode',
        'configure': 'configure_mode',
    };

    /**
     * Get information about the registers that can be logged / watched.
     *
     * Load register information for all devices, a complete record of registers
     * that can be logged or watched.
     *
     * @return {Promise} A promise that resolves to an Object with register
     *      information. See the registers section of the ljm_constants JSON file.
    **/
    function getRegisters()
    {
        return new Promise((resolve) => {
            var registerInfoSrc = fs_facade.getExternalURI(REGISTERS_DATA_SRC);
            fs_facade.getJSON(registerInfoSrc, genericErrorHandler, function (info) {
                resolve(info['registers']);
            });
        });
    }
    
    /**
     * Function is called once every time the module tab is selected, loads the module.
     * @param  {[type]} framework   The active framework instance.
     * @param  {[type]} onError     Function to be called if an error occurs.
     * @param  {[type]} onSuccess   Function to be called when complete.
    **/
    this.onModuleLoaded = function(framework, onError, onSuccess) {
        self.startupData = framework.moduleData.startupData;
        self.moduleName = framework.moduleData.name;
        // console.error("onModuleLoaded")
		this.moduleConstants = framework.moduleConstants;
		console.error("onModLoaded startupData", self.startupData)
        onSuccess();
    };

    /**
     * Function is called once every time a user selects a new device.  
     * @param  {[type]} framework   The active framework instance.
     * @param  {[type]} device      The active framework instance. 
     * @param  {[type]} onError     Function to be called if an error occurs.
     * @param  {[type]} onSuccess   Function to be called when complete.
    **/
    this.onDeviceSelected = function(framework, device, onError, onSuccess) {
        framework.clearConfigBindings();
        framework.setStartupMessage('Reading Device Configuration');
        // console.error("onDeviceSelected")
		console.error("line 220 on device selected", framework, "device", device)
		this.device_controller = framework.device_controller
        onSuccess();
    };


    this.onDeviceConfigured = function(framework, device, setupBindings, onError, onSuccess) {

        // Get the current mode,
        // self.moduleContext.logger_mode = logger_modes.active;
		self.activeDevice = device;
		self.deviceSN = device[0].savedAttributes.serialNumber;
		// console.error("onDeviceConfigured 230", device)
        self.moduleContext.logger_mode = logger_modes.configure;
		self.moduleContext.deviceSN = self.deviceSN;
        framework.setCustomContext(self.moduleContext);
        onSuccess();
    };

    this.onLoadError = function(framework, description, onHandle) {
        console.log('in onLoadError', description);
        onHandle(true);
    };
    this.onWriteError = function(framework, registerName, value, description, onHandle) {
        console.log('in onConfigError', description);
        onHandle(true);
    };
    this.onRefreshError = function(framework, registerNames, description, onHandle) {
        console.log('in onRefreshError', description);
        onHandle(true);
    };

    var self = this;
}

// console.error("Starting Config Step")
// let logConfigs = simple_logger.generateBasicConfig({
//     'same_vals_all_devices': true,
//     'registers': ['AIN0','AIN1'],
//     'update_rate_ms': 100,
// },deviceManager.getDevices());

// console.log("Done Creating Config")
function loggerApp() {
	this.simpleLogger;
	this.deviceManager;
	this.logConfigs;

	this.initializeLogger = function(){
		debugLog('--- In Func: initializeLogger');
		var defered = q.defer();

		self.simpleLogger = simple_logger.create();
		attachListeners(self.simpleLogger);

		// Intentionally delay to allow user to read start-up message.
		setTimeout(function() {
			self.simpleLogger.initialize()
			.then(function(res) {
				debugLog('--- App Initialized',res);
				defered.resolve();
			}, function(err) {
				console.error('Failed to initialize the logger',err);
				defered.resolve();
			});
		}, 5000);
		
		return defered.promise;
	};
	this.initializeDeviceManager = function() {
		debugLog('--- In Func: initializeDeviceManager');
		var defered = q.defer();
		self.deviceManager = device_manager.create();

		self.deviceManager.connectToDevices([{
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
		return defered.promise;
	};
	this.updateDeviceListing = function() {
		debugLog('--- In Func: updateDeviceListing');
		debugLog('Connected Devices', self.deviceManager.getDevices());
		var defered = q.defer();
		self.simpleLogger.updateDeviceListing(self.deviceManager.getDevices())
		.then(function(res) {
			debugLog('Device listing has been passwd to the logger',res);
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
		self.logConfigs = simple_logger.generateBasicConfig({
			'same_vals_all_devices': true,
			'registers': ['AIN0','AIN1'],
			'update_rate_ms': 100,
		},self.deviceManager.getDevices());

		var fs = require('fs');
		fs.writeFile(template_logger_config_file,JSON.stringify(self.logConfigs,null,2),function(err) {
			if(err) {
				console.error('Error saving generated configs');
			} else {
				debugLog('Data was appended to the config file.');
			}
			self.simpleLogger.configureLogger({
				'configType': 'filePath',
				'filePath': template_logger_config_file
			})
			// self.simpleLogger.configureLogger({
			// 	configType: 'object',
			// 	configData: self.logConfigs,
			// 	filePath: cwd
			// })
			.then(function(res) {
				debugLog('Logger has been configured.',res)
				defered.resolve();
			}, function(err) {
				console.error('Logger failed to be configured.',err)
				defered.resolve();
			});
		});
		return defered.promise;
	}
	this.startLogger = function() {
		debugLog('--- In Func: startLogger');
		var defered = q.defer();
		self.simpleLogger.once(eventMap.STOPPED_LOGGER, function(stopData) {
			debugLog('Logger Stopped');
			// console.log('(hello_world.js) Logger has stopped!!')
			defered.resolve();
		});
		self.simpleLogger.startLogger()
		.then(function succ() {
			
			debugLog('Logger Started');
		}, function err() {
			
			debugLog('Logger Started');
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
		self.deviceManager.closeDevices()
		.then(defered.resolve, defered.reject);
		return defered.promise;
	}
	this.finish = function() {
		debugLog('--- In Func: finish');
		var defered = q.defer();
		// setTimeout(defered.resolve, 1000);
		defered.resolve();
		return defered.promise;
	}
	var self = this;

}

var loggerApp = new loggerApp()