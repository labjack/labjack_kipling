/* jshint undef: true, unused: true, undef: true */
/* global console, module_manager, dict, q, showAlert, modbus_map, $ */
/* global ljmmm_parse, handlebars */

/* exported activeModule, module, MODULE_UPDATE_PERIOD_MS */

/**
 * Goals for the Simple Logger module:
**/

const { time } = require('console');
const fs = require('fs')

const device_manager = require('ljswitchboard-device_manager')



// Constant that determines device polling rate.  Use an increased rate to aid
// in user experience.
var MODULE_UPDATE_PERIOD_MS = 1000; 

var logger = require("ljswitchboard-simple_logger");
const { dirname } = require('path');

function dispFile(contents) {
    $("#configView").click()
    // $("#configForm").load("./templates/view_current_configuration.html");
    document.getElementById('currentConfig').textContent=JSON.stringify(contents, undefined, 2)
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
        dispFile(obj)
        

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

/** Call to simple logger module to verify an existing config json file
*   returns a promise, when resolved it does nothing
*   if the promise resolves to an error (invalid file or something)
*   it displays an error window
*/
function verifyConfigFile(filepath) {
    logger.verifyConfigFile(filepath)
    .catch(err => alert("Invalid Logger Configuration File", err))

}

$("#configView").on("click",function(){
    $("#configForm").load("./templates/create_configuration.html");
});

// console.error("Starting Config Step")
// let logConfigs = simple_logger.generateBasicConfig({
//     'same_vals_all_devices': true,
//     'registers': ['AIN0','AIN1'],
//     'update_rate_ms': 100,
// },device_manager.getDevices());

// console.log("Done Creating Config")

function loadConfigForm() {
    // document.getElementById("configForm").innerHTML='<object type="text/html" data="./templates/create_configuration.html"></object>';
    
}

/**
 * Module object that gets automatically instantiated & linked to the appropriate framework.
 * When using the 'singleDevice' framework it is instantiated as sdModule.
 */
function module() {
    this.moduleConstants = {};

    this.startupData = {};
    this.moduleName = '';
    this.moduleContext = {};
    this.activeDevice = undefined;

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
        self.activeDevices = device;
        framework.clearConfigBindings();
        framework.setStartupMessage('Reading Device Configuration');
        // console.error("onDeviceSelected")
        onSuccess();
    };


    this.onDeviceConfigured = function(framework, device, setupBindings, onError, onSuccess) {

        // self.getRegistersToDisplay()
        // .then(self.getRegistersModbusInfo)
        // .then(self.cachedRegistersToDisplay)
        // .then(self.getInitialDeviceData)
        // .then(function(registers) {
        //     console.log('Registers to display:', registers);
        //     self.moduleContext = {
        //         'activeRegisters': self.getActiveRegistersData(registers)
        //     };
        //     framework.setCustomContext(self.moduleContext);
        //     onSuccess();
        // });

        // Get the current mode,
        // self.moduleContext.logger_mode = logger_modes.active;
        self.moduleContext.logger_mode = logger_modes.configure;
        
        framework.setCustomContext(self.moduleContext);
        // console.error("onDeviceConfigured")
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