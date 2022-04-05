/* jshint undef: true, unused: true, undef: true */
/* global console, module_manager, dict, q, showAlert, modbus_map, $ */
/* global ljmmm_parse, handlebars */

/* global dataTableCreator */
/* exported activeModule, module, MODULE_UPDATE_PERIOD_MS */

// Constant that determines device polling rate.  Use an increased rate to aid
// in user experience.
//var MODULE_UPDATE_PERIOD_MS = 1000;

/**
 * Module object that gets automatically instantiated & linked to the appropriate framework.
 * When using the 'singleDevice' framework it is instantiated as sdModule.
 */

// Dave note to help get started:
// Refer to ljswitchboard-module_manager\lib\switchboard_modules\framework\kipling-module-framework\framework_connector.js
// and its linkModule function for needed methods.

//var myCode = require("code");

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

    var myChart = undefined;

    /**
     * Function is called once every time the module tab is selected, loads the module.
     * @param  {[type]} framework   The active framework instance.
     * @param  {[type]} onError     Function to be called if an error occurs.
     * @param  {[type]} onSuccess   Function to be called when complete.
    **/
    this.onModuleLoaded = function(framework, onError, onSuccess) {
        console.log("In onModuleLoaded")
        self.startupData = framework.moduleData.startupData;
        self.moduleName = framework.moduleData.name;

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
        console.log("In onDeviceSelected")
        self.activeDevices = device;
        framework.clearConfigBindings();
        framework.setStartupMessage('Reading Device Configuration');

        var customSmartBindings = [
            {
                // Define binding to handle Ethernet Power button presses.
                bindingName: 'startCharting',
                smartName: 'clickHandler',
                callback: self.startCharting
            },{
                // Define binding to handle Ethernet DHCP-select button presses.
                bindingName: 'stopCharting',
                smartName: 'clickHandler',
                callback: self.stopCharting
            }
        ];

        myChart = new XloggerProto();

        // Save the smartBindings to the framework instance.
        framework.putSmartBindings(customSmartBindings);

        // Clear current config bindings to prevent from double-event listeners.
        framework.clearConfigBindings();

        onSuccess();
    };

    this.startCharting = function(data, onSuccess) {
        console.log("Chart start");
        myChart.start();
    };

    this.stopCharting = function(data, onSuccess) {
        console.log("Chart stop");
        myChart.stop();
    };

    this.onDeviceConfigured = function(framework, device, setupBindings, onError, onSuccess) {
        console.log("In onDeviceConfigured")

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
        self.moduleContext.logger_mode = logger_modes.active;

        framework.setCustomContext(self.moduleContext);
        onSuccess();
    };

    this.onTemplateLoaded = function(framework, onError, onSuccess) {
        console.log("In onTemplateLoaded")
        onSuccess();
    };

    /**
     * Function that gets executed after the module's template is displayed.
     * @param  {object} framework framework object.
     * @param  {function} onError   function to be called on error.
     * @param  {function} onSuccess function to be called on success
     * @return {[type]}           [description]
     */
    this.onTemplateDisplayed = function(framework, onError, onSuccess) {
        console.log("In onTemplateDisplayed")
        onSuccess();
    };
    this.onRegisterWrite = function(framework, binding, value, onError, onSuccess) {
        console.log("In onRegisterWrite")
        onSuccess();
    };
    this.onRegisterWritten = function(framework, registerName, value, onError, onSuccess) {
        console.log("In onRegisterWritten")
        onSuccess();
    };
    this.onRefresh = function(framework, registerNames, onError, onSuccess) {
        console.log("In onRefresh")
        onSuccess();
    };
    this.onRefreshed = function(framework, results, onError, onSuccess) {
        console.log("In onRefreshed")
        onSuccess();
    };
    this.onCloseDevice = function(framework, device, onError, onSuccess) {
        console.log("In onCloseDevice", device)
        onSuccess();
    };
    this.onUnloadModule = function(framework, onError, onSuccess) {
        console.log("In onUnloadModule")
        onSuccess();
    };
    this.onLoadError = function(framework, description, onHandle) {
        console.log("In onLoadError", description)
        onHandle(true);
    };
    this.onWriteError = function(framework, registerName, value, description, onHandle) {
        console.log("In onWriteError", description)
        onHandle(true);
    };
    this.onRefreshError = function(framework, registerNames, description, onHandle) {
        console.log("In onRefreshError", description)
        onHandle(true);
    };

    var self = this;
}
