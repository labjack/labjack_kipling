/**
 * Goals for the Lua Script Debugger module.
 * This is a Lua script intro-app that performs a minimal number of scripting
 * operations.  It is simply capable of detecting whether or not a Lua script
 * is running and then prints out the debugging log to the window.  
 *
 * @author Chris Johnson (LabJack Corp, 2013)
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
var MODULE_UPDATE_PERIOD_MS = 1000;

// Constant that can be set to disable auto-linking the module to the framework
var DISABLE_AUTOMATIC_FRAMEWORK_LINKAGE = false;

/**
 * Module object that gets automatically instantiated & linked to the appropriate framework.
 * When using the 'singleDevice' framework it is instantiated as sdModule.
 */
function module() {
    var aceEditor;
    var moduleContext = {};

    /**
     * Function is called once every time the module tab is selected, loads the module.
     * @param  {[type]} framework   The active framework instance.
     * @param  {[type]} onError     Function to be called if an error occurs.
     * @param  {[type]} onSuccess   Function to be called when complete.
    **/
    this.onModuleLoaded = function(framework, onError, onSuccess) {
        /**
         * Format for a single binding,
         * bindingClass: The string constant made available in the handlebars template. ex: {{AIN0.direction}}
         * template: The string constant that must be present as the id, 
         *     ex: <p id="AIN0">0.000</p>
         *     in the module's 'view.html' file to serve as the location to get automatically 
         *     updated by the framework.
         * binding: The string constant representing the register to be read. ex: 'AIN0'
         * direction:
         * format: 
        **/
        var moduleBindings = [
            {bindingClass: 'LUA_RUN', template: 'LUA_RUN',   binding: 'LUA_RUN',    direction: 'read',  format: '%d'},
            {bindingClass: 'LUA_DEBUG_ENABLE', template: 'LUA_DEBUG_ENABLE',   binding: 'LUA_DEBUG_ENABLE',    direction: 'read',  format: '%d'},
            {bindingClass: 'LUA_DEBUG_NUM_BYTES', template: 'LUA_DEBUG_NUM_BYTES',   binding: 'LUA_DEBUG_NUM_BYTES',    direction: 'read',  format: '%d'},
        ];

        // Save the bindings to the framework instance.
        framework.putConfigBindings(moduleBindings);
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

        // While configuring the device build a dict to be used for generating the
        // module's template.
        moduleContext['debugData'] = [];

        // save the custom context to the framework so it can be used when
        // rendering the module's template.
        framework.setCustomContext(moduleContext);
        onSuccess();
    };

    this.onTemplateLoaded = function(framework, onError, onSuccess) {
        //Initialize ace editor:
        aceEditor = ace.edit("editor");
        aceEditor.setTheme("ace/theme/monokai");
        aceEditor.getSession().setMode("ace/mode/javascript");

        onSuccess();
    };
    this.onRefreshed = function(framework, results, onError, onSuccess) {
        // console.log('in onRefreshed',results);
        results.forEach(function(key, value){
            // console.log('results['+value+']:',key)
        });
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
