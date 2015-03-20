/**
 * Goals for the Lua Script Debugger module.
 * This is a Lua script intro-app that performs a minimal number of scripting
 * operations.  It is simply capable of detecting whether or not a Lua script
 * is running and then prints out the debugging log to the window.  
 *
 * @author Chris Johnson (LabJack Corp, 2014)
 *
 * Configuration:
 * No configuration of the device is required
 *
 * Periodic Processes:
 *     1. Read from "LUA_RUN" register to determine if a Lua script is running.
 *     2. Read from "LUA_DEBUG_NUM_BYTES" register to determine how much data is
 *         available in the debugging info buffer.
 *     3. If there is data available in the debugging buffer then get it from
 *         the device. 
**/

// Constant that determines device polling rate.  Use an increased rate to aid
// in user experience.
var MODULE_UPDATE_PERIOD_MS = 5000;

// Constant that can be set to disable auto-linking the module to the framework
var DISABLE_AUTOMATIC_FRAMEWORK_LINKAGE = false;

/**
 * Module object that gets automatically instantiated & linked to the appropriate framework.
 * When using the 'singleDevice' framework it is instantiated as sdModule.
 */
function module() {
    /**
     * Function is called once every time the module tab is selected, loads the module.
     * @param  {[type]} framework   The active framework instance.
     * @param  {[type]} onError     Function to be called if an error occurs.
     * @param  {[type]} onSuccess   Function to be called when complete.
    **/
    this.onModuleLoaded = function(framework, onError, onSuccess) {
        console.log('in onModuleLoaded');
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
        console.log('in onDeviceSelected', device);
        onSuccess();
    };

    this.onDeviceConfigured = function(framework, device, setupBindings, onError, onSuccess) {
        console.log('in onDeviceConfigured', device);
        onSuccess();
    };
    

    this.onTemplateLoaded = function(framework, onError, onSuccess) {
        console.log('in onTemplateLoaded');
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
        console.log('in onTemplateDisplayed');
        onSuccess();
    };
    this.onRegisterWrite = function(framework, binding, value, onError, onSuccess) {
        console.log('in onRegisterWrite');
        onSuccess();
    };
    this.onRegisterWritten = function(framework, registerName, value, onError, onSuccess) {
        console.log('in onRegisterWritten');
        onSuccess();
    };
    this.onRefresh = function(framework, registerNames, onError, onSuccess) {
        console.log('in onRefresh');
        onSuccess();
    };
    this.onRefreshed = function(framework, results, onError, onSuccess) {
        console.log('in onRefreshed');
        onSuccess();
    };
    this.onCloseDevice = function(framework, device, onError, onSuccess) {
        console.log('in onCloseDevice');
        onSuccess();
    };
    this.onUnloadModule = function(framework, onError, onSuccess) {
        console.log('in onUnloadModule');
        onSuccess();
    };
    this.onLoadError = function(framework, description, onHandle) {
        console.error('in onLoadError', description);
        onHandle(true);
    };
    this.onWriteError = function(framework, registerName, value, description, onHandle) {
        console.error('in onConfigError', description);
        onHandle(true);
    };
    this.onRefreshError = function(framework, registerNames, description, onHandle) {
        console.error('in onRefreshError', description);
        if(typeof(description.retError) === 'number') {
            console.error('in onRefreshError',description.retError);
        } else {
            console.error('Type of error',typeof(description.retError),description.retError);
        }
        onHandle(true);
    };

    var self = this;
}
