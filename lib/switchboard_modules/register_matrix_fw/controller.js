/* jshint undef: true, unused: true, undef: true */
/* global console, module_manager, dict, q */
/* exported activeModule, module, MODULE_UPDATE_PERIOD_MS */

/**
 * Goals for the Register Matrix module:
**/

// Constant that determines device polling rate.  Use an increased rate to aid
// in user experience.
var MODULE_UPDATE_PERIOD_MS = 1000;

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

    this.currentValues = dict();
    this.bufferedValues = dict();
    this.newBufferedValues = dict();
    this.bufferedOutputValues = dict();


    /**
     * This function is called to save the data in the "this.startupData" object
     * as the module's startupData.
    **/
    this.test = function() {
        var defered = q.defer();
        self.startupData.test_data = 'tester';
        self.saveModuleStartupData()
        .then(self.readModuleStartupData)
        .then(pr,pe);
    };
    this.readModuleStartupData = function() {
        return module_manager.getModuleStartupData(self.moduleName);
    };
    this.saveModuleStartupData = function() {
        return module_manager.saveModuleStartupData(
            self.moduleName,
            self.startupData
        );
    };

    this.refreshModuleStartupData = function() {
        var defered = q.defer();
        module_manager.getModuleStartupData(self.moduleName)
        .then(function(newStartupData) {
            self.startupData = newStartupData;
            defered.resolve();
        });
        return defered.promise;
    };

    var requiredStartupDataAttributes = [
        'display_method',
        'registers_by_sn',
        'registers_by_product_type',
        'registers_by_product_class',
    ];

    /**
     * Function is called once every time the module tab is selected, loads the module.
     * @param  {[type]} framework   The active framework instance.
     * @param  {[type]} onError     Function to be called if an error occurs.
     * @param  {[type]} onSuccess   Function to be called when complete.
    **/
    this.onModuleLoaded = function(framework, onError, onSuccess) {
        self.startupData = framework.moduleData.startupData;
        self.moduleName = framework.moduleData.name;

        var isStartupDataValid = true;
        requiredStartupDataAttributes.forEach(function(requiredAttr) {
            if(typeof(self.startupData[requiredAttr]) === 'undefined') {
                isStartupDataValid = false;
            }
        });

        // device_controller.ljm_driver.writeLibrarySync('LJM_SEND_RECEIVE_TIMEOUT_MS',5000);
        // Save Module Constant objects
        // self.moduleConstants = framework.moduleConstants;
        // Save the smartBindings to the framework instance.
        // framework.putSmartBindings(smartBindings);
        // Save the customSmartBindings to the framework instance.
        // framework.putSmartBindings(customSmartBindings);

        if(isStartupDataValid) {
            onSuccess();
        } else {
            console.warn('Reverting module startup data');
            module_manager.revertModuleStartupData()
            .then(onSuccess);
        }
    };

    
    /**
     * Function is called once every time a user selects a new device.  
     * @param  {[type]} framework   The active framework instance.
     * @param  {[type]} device      The active framework instance.
     * @param  {[type]} onError     Function to be called if an error occurs.
     * @param  {[type]} onSuccess   Function to be called when complete.
    **/
    this.onDeviceSelected = function(framework, device, onError, onSuccess) {
        self.activeDevice = device;
        framework.clearConfigBindings();
        framework.setStartupMessage('Reading Device Configuration');
        
        // Re-load the module's startupData
        self.refreshModuleStartupData()
        .then(onSuccess);
    };

    this.onDeviceConfigured = function(framework, device, setupBindings, onError, onSuccess) {
        // framework.setCustomContext(self.moduleContext);
        onSuccess();
    };

    this.onTemplateLoaded = function(framework, onError, onSuccess) {
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
        onSuccess();
    };
    this.onRegisterWrite = function(framework, binding, value, onError, onSuccess) {
        onSuccess();
    };
    this.onRegisterWritten = function(framework, registerName, value, onError, onSuccess) {
        onSuccess();
    };
    this.onRefresh = function(framework, registerNames, onError, onSuccess) {
        onSuccess();
    };
    this.onRefreshed = function(framework, results, onError, onSuccess) {
        onSuccess();
    };
    this.onCloseDevice = function(framework, device, onError, onSuccess) {
        // self.saveModuleStartupData()
        // .then(onSuccess);
        onSuccess();
    };
    this.onUnloadModule = function(framework, onError, onSuccess) {
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
