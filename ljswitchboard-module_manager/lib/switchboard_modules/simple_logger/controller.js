/* jshint undef: true, unused: true, undef: true */
/* global console, module_manager, dict, q, showAlert, modbus_map, $ */
/* global ljmmm_parse, handlebars */

/* exported activeModule, module, MODULE_UPDATE_PERIOD_MS */

/**
 * Goals for the Simple Logger module:
**/
var q = require('q');

const { time }           = require('console');
const fs                 = require('fs')
var device_manager       = require('ljswitchboard-device_manager')
var simple_logger        = require("ljswitchboard-simple_logger"); //.create();
// var device_selector		 = require("ljswitchboard-module_manager");
var eventList            = require("ljswitchboard-simple_logger").eventList;
var eventMap             = require("ljswitchboard-simple_logger").eventsMap;
const { dirname }        = require('path');
var modbus_map           = require('ljswitchboard-modbus_map');

const package_loader = global.package_loader;
const fs_facade = package_loader.getPackage('fs_facade');

var async = require('async');

var REGISTERS_DATA_SRC = 'simple_logger/ljm_constants.json';

// The max number of registers to be used in the logger
// This prevents importing too many selected registers from the RM module.
const MAX_REGISTERS = 8;

// Constant that determines device polling rate.  Use an increased rate to aid
// in user experience.
var MODULE_UPDATE_PERIOD_MS = 1000; 
// i belive to get the device
const io_manager 		 = package_loader.getPackage('io_manager');
const io_interface		 = io_manager.io_interface();
const driver_controller  = io_interface.getDriverController();
const device_controller  = io_interface.getDeviceController();
this.getListAllDevicesErrors = device_controller.getListAllDevicesErrors;
this.getCachedListAllDevices = device_controller.getCachedListAllDevices;
this.listAllDevices = device_controller.listAllDevices;
this.device_controller = device_controller;
this.driver_controller = driver_controller;
console.error("this.device_controller", this.device_controller)
// console.error("device_manager", device_manager.create())

var ignoreErrorsList = [
	eventList.STOPPED_LOGGER,
	eventList.CONFIGURATION_SUCCESSFUL
	// eventMap.STOPPED_LOGGER,
	// eventMap.CONFIGURATION_SUCCESSFUL,
];

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
	 var loggerAppSteps = [
		'initializeLogger',				// Performed at start-up
		// 'initializeDeviceManager',		// Performed at start-up
		'updateDeviceListing',			// Performed when configuring logger
		'configureLogger',				// Performed when configuring logger
		'startLogger',					// Performed when starting logger
		'waitForLoggerToRun',			// Allowing the logger to run...
		// 'closeDevices',					
		'finish',
	];
	// loggerAppSteps.forEach(function(step) {
	// 	console.error('App Step', step);
	// 	if(typeof(loggerApp[step]) != 'function') {
	// 		console.error('App Step', step, 'is not defined!');
	// 		process.exit();
	// 	}
	// });
	
	var isTerminated = false;
	async.eachSeries(
		loggerAppSteps,
		function(step, cb) {
			function onErr(err) {
				isTerminated = true;
				cb(err);
			}
			try {
				console.log("Trying", step)
				loggerApp[step]().then(cb, onErr);
				// console.warn("what exactly is this?", loggerApp[step])
			} catch(err) {
				console.error('Error executing app step', step, err);
			}
		},
		function(err) {
			// console.log('This was the error...', err);
		});

}
// 'initializeLogger',				// Performed at start-up
// 	'initializeDeviceManager',		// Performed at start-up
// 	'updateDeviceListing',			// Performed when configuring logger
// 	'configureLogger',				// Performed when configuring logger
// 	'startLogger',					// Performed when starting logger
// 	'waitForLoggerToRun',			// Allowing the logger to run...
// 	'closeDevices',					
// 	'finish',

function loggerStop() {
	console.log("logger has stoped")
	self.simpleLogger = simple_logger.create();
	self.simpleLogger.initialize()
	self.simpleLogger.stopRunning(true)
	// this.stopTheLogger = true;
	// loggerApp.closeDevices();
	// loggerApp.finish();
	// return;
}


function loadConfigFile(config) {
	$("#logName").val(config.logging_config.name)
	try {
		console.error(config)
		let dev_sn = config.device_serial_numbers[0]
		let data_group = config.data_groups[0]
		let reg_list = config.dat_group.dev_sn.registers
		let registers = []
		for (const r of reg_list) {
			registers.push(r.name)
		}
		// why are we using alerts?
		alert("HERES WHAT WE GOT", dev_sn, data_group, registers);
	}
	catch(e) {
		alert(e)
		console.error(e)
	}
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

const constants = modbus_map.getConstants().constantsByName;
const registers = Object.getOwnPropertyNames(constants)
function isValidRegister(reg) {
	try {
		return registers.includes(reg)
	}
	catch(e){
		console.error("INVALID REGISTER", reg, e)
	}
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
		this.startupRegList = global.globalActiveRegisters;
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
		this.device_controller = framework.device_controller
        onSuccess();
    };

	


    this.onDeviceConfigured = function(framework, device1, setupBindings, onError, onSuccess) {

        // Get the current mode,
        // self.moduleContext.logger_mode = logger_modes.active;
		self.activeDevice = device1;
		self.deviceSN = device1[0].savedAttributes.serialNumber;
		// console.error("onDeviceConfigured 230", device)
        self.moduleContext.logger_mode = logger_modes.configure;
		self.moduleContext.deviceSN = self.deviceSN;	
		var rm_registers = global.globalActiveRegisters;
        console.error("Rm_registers", rm_registers)
		if(rm_registers !== undefined) {
            console.warn("this is within the on device confugureed")
			self.moduleContext.startupRegisters = Object.values(rm_registers).slice(0, MAX_REGISTERS);
		}
        console.error("Rm_registers", self.moduleContext)
		self.moduleContext.MAX_REGISTERS = MAX_REGISTERS;
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

var template_logger_config_file = 'loggerScript.json'
// var logger_config_file = 'basic_config.json';
// var cwd = process.cwd();

// var template_logger_config_file = path.normalize(path.join(
// 	cwd,
// 	TEMPLATE_LOGGER_CONFIG_FILE
// ));

// console.error("Starting Config Step")
// let logConfigs = simple_logger.generateBasicConfig({
//     'same_vals_all_devices': true,
//     'registers': ['AIN0','AIN1'],
//     'update_rate_ms': 100,
// },deviceManager.getDevices());

// console.log("Done Creating Config")
function loggerApp() {
	this.simpleLogger;
	// this.deviceManager;
	this.logConfigs;

	const io_manager 		 = package_loader.getPackage('io_manager');
	const io_interface		 = io_manager.io_interface();
	const driver_controller  = io_interface.getDriverController();
	const device_controller  = io_interface.getDeviceController();
	this.getListAllDevicesErrors = device_controller.getListAllDevicesErrors;
	this.getCachedListAllDevices = device_controller.getCachedListAllDevices;
	this.listAllDevices = device_controller.listAllDevices;
	this.device_controller = device_controller;
	this.driver_controller = driver_controller;
	console.error("this.device_controller", this.device_controller)
	

	console.error("this.device_controller", this.device_controller)
	
	// const result = this.initializeLogger();


	this.initializeLogger = function(){
		
		debugLog('--- In Func: initializeLogger1');
		// self.device_selector = device_selector.create();
		// console.warn("device_selector", device_selector)
		
		var defered = q.defer();

		self.simpleLogger = simple_logger.create();
		// console.warn("self.simplelogger", self.simpleLogger)
		var placeToSaveFile = document.getElementById("actual-file").value;
		// console.error("placeToSaveFile", placeToSaveFile)
		self.simpleLogger.setFilePath(placeToSaveFile)
		self.simpleLogger.initialize()
		self.simpleLogger.stopRunning(false)
		// Zander - should be able to assign the value 
		// console.warn("self.simplelogger", self.simpleLogger.stopRunning(false))
		attachListeners(self.simpleLogger);

		// Intentionally delay to allow user to read start-up message.
		setTimeout(function() {
			self.simpleLogger.initialize()
			.then(function(res) {
				debugLog('--- App Initialized');
				defered.resolve();
			}, function(err) {
				console.error('Failed to initialize the logger',err);
				defered.resolve();
			});
		}, 5000);
		
		return defered.promise;
	};
	// getting the conection - newname
	this.initializeDeviceManager = function() {
		debugLog('--- In Func: initializeDeviceManager');
		var defered = q.defer();

		// self.deviceManager = device_manager.create();
		// self.deviceManager.devices[0].savedAttributes = global.device[0].savedAttributes;
		// if(self.deviceManager.deviceConnected != true){
		// 	// self.deviceManager.deviceConnected = true;		// }

		// self.deviceManager.connectToDevices([{
		// 	dt:'LJM_dtANY',
		// 	ct:'LJM_ctANY',
		// 	id:'LJM_idANY'
		// }])
		// or this.device_controller.savedAttributes.openParameters
		// [{
		// 	dt: this.device_controller.devices[0].savedAttributes.deviceTypeString,
		// 	ct: this.device_controller.devices[0].savedAttributes.connectionTypeString,
		// 	id: this.device_controller.devices[0].savedAttributes.serialNumber
		// }]
		// his.device_controller.devices[0].savedAttributes.openParameters()
		defered.resolve();
		// .then(function(res) {
		// 	debugLog('--- Connected to devices!',res);
		// 	console.error("res", res)
		// 	defered.resolve();
		// }, function(err) {
		// 	console.error('Failed to connect to devices',err);
		// 	defered.resolve();
		// });
		return defered.promise;
	};

	this.updateDeviceListing = function() {
		debugLog('--- In Func: updateDeviceListing');
		// debugLog('Connected Devices', self.deviceManager.getDevices());
		var defered = q.defer();
		self.simpleLogger.updateDeviceListing(this.device_controller.devices[0])
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
		this.updateDeviceListing();
		var timeToLog = document.getElementById("runtimeSec").value;
		if(timeToLog <= 0){}
		registersToRead = [];
		for (i = 0; i < MAX_REGISTERS; i++){
			var zipElement = document.getElementById("validationCustom0" + i).value;
			if (zipElement == ''){}
			else{
				registersToRead.push(zipElement)
		}
		}
		
		// This is the bace case If this is ever used at all(It should not)
		if(registersToRead.length <= 0){
			registersToRead.push('AIN0')
		}

		self.logConfigs = simple_logger.generateBasicConfig({
			'same_vals_all_devices': true,
			'registers': registersToRead,
			'update_rate_ms': 100,
			'logTime': timeToLog,
		}, this.device_controller.devices);
		// self.deviceManager.getDevices()

		var fs = require('fs');
		fs.writeFile(template_logger_config_file,JSON.stringify(self.logConfigs),function(err) {
			if(err) {
				console.error('Error saving generated configs', err);
			} else {
				debugLog('Data was appended to the config file.');
			}
			self.simpleLogger.configureLogger({
				'configType': 'filePath',
				'filePath': template_logger_config_file,
				'configData': self.logConfigs
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
		this.device_controller.closeDevice()
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

		// gets the tabs be re enabled both visualy and functonaly
		$('.module-chrome-tab').each(function(){
			$(this).prop("disabled", false)
			$(this).removeClass('disbaledTabs');
		})

		// reenables the form data so changes can be made befor the next logging session
		$('.form-control').each(function(){
			$(this).prop("disabled", false)
		})

		// $('.configure-log-controls').prop("disabled", false);
        // $('.configure-log-controls').removeClass('disbaledTabs');
		
		// enables the checking of configuration and selecting file path
		$(".btnUpdate").prop("disabled", false);
		$("#select-file").prop("disabled", false);

		// disables all the things that need to be disabled (start btn, device serial number, file location)
		$("#devSN").prop("disabled", true);
		$("#startBtn").prop("disabled", true);
		$("#actual-file").prop("disabled", true);

		console.log("Finished Logging")
		MODULE_CHROME.enableModuleLoading();
		return defered.promise;
	}
	// Zander - what is the point of this?
	// var self = this;

}

function attachListeners(loggerObject) {
	var eventKeys = Object.keys(eventMap);
	if(this.stopTheLogger){
		return;
	}
	eventKeys.forEach(function(eventKey) {
		var key = eventMap[eventKey];
		loggerObject.on(key, function(data) {
			if(ignoreErrorsList.indexOf(key) < 0) {
				// debugLog('Captured Event!!', key, data);
			}
			var handeledEvent = false;
			// print('Captured Event', key, data, Object.keys(data));
			if(key === 'NEW_VIEW_DATA') {
				if(data.view_type === 'current_values') {
					// console.warn("data", data)
					// printNewData('New View Data', {
					// 	data: data.data_cache
					// 	// vals: data.data_cache,
					// });
					handeledEvent = true;
				} else if(data.view_type === 'basic_graph') {
					// printNewData('New Graph Data112', {
					// 	numValsLogged: data.data_cache.length,
					// 	// vals: data.data_cache,
					// });
					handeledEvent = true;
				} else {
					console.error('un-handled... data.view_type', data.view_type)
				}
			} else {
				// console.log('un-handled... key', key)
			}
			if(!handeledEvent) {
				// printNewData('Captured Event', key, data);
			}

		});
	});
}

var loggerApp = new loggerApp()

var ENABLE_DEBUG_LOG = true;
var ENABLE_PRINTING = true;
function print() {
	if(ENABLE_DEBUG_LOG) {
		var dataToPrint = [];
		dataToPrint.push('(constroler.js)');
		for(var i = 0; i < arguments.length; i++) {
			dataToPrint.push(arguments[i]);
		}
		console.log.apply(console, dataToPrint);
	}
}
function debugLog() {
	if(ENABLE_DEBUG_LOG) {
		var dataToPrint = [];
		dataToPrint.push('(constroler.js)');
		for(var i = 0; i < arguments.length; i++) {
			dataToPrint.push(arguments[i]);
		}
		console.log.apply(console, dataToPrint);
	}
}
var ENABLE_NEW_DATA_REPORTING = true;
function printNewData() {
	if(ENABLE_NEW_DATA_REPORTING) {
		var dataToPrint = [];
		dataToPrint.push('(constroler.js)');
		for(var i = 0; i < arguments.length; i++) {
			dataToPrint.push(arguments[i]);
		}
		console.log.apply(console, dataToPrint);
	}
}
function saveTheArray(){
	var array = [];
    $('.register-input').each(function(){
    	array.push($(this).val());
    })
}

function saveArraysInScope(){
	for (var i = 0; i < 8; i++){
		// This line is broken, array is undefined here, I stopped it from being called, please fix
		document.getElementById("validationCustom0" + i).value = array[i];
	}
	$('.register-input').each(function(){
		let val = $.trim($(this).val());
		if(val.length > 0){
		  $(".register-input").trigger("change");
		}
	  })
}

function saveRegisterMatrix(){
	var emptyInputs = $(".register-input").filter(function() { return this.value === ""; });
	emptyInputs.each(function(i){
		//base case for reaching end of imported registers
		if(arr[i] === undefined) { return false; }
		$(this).val(arr[i]);
	});
}