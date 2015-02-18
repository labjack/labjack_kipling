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
var MODULE_UPDATE_PERIOD_MS = 100;

// Constant that can be set to disable auto-linking the module to the framework
var DISABLE_AUTOMATIC_FRAMEWORK_LINKAGE = false;

function textEditor() {
    var editor;
    var htmlID = '';
    var editorTheme = '';
    var editorMode = '';

    this.setupEditor = function(id, theme, mode) {
        self.htmlID = id;
        self.editorTheme = theme;
        self.editorMode = mode;

        // Initialize the aceEditor instance
        self.editor = ace.edit(id);
        self.editor.setTheme(theme);
        self.editor.getSession().setMode(mode);
    };

    var self = this;
}

/**
 * Module object that gets automatically instantiated & linked to the appropriate framework.
 * When using the 'singleDevice' framework it is instantiated as sdModule.
 */
function module() {
    var luaEditor = new textEditor();
    this.luaEditor = luaEditor;
    var debuggingLog = new textEditor();
    this.debuggingLog = debuggingLog;

    var moduleContext = {};

    var constants = {};
    var preBuiltScripts = {};
    var luaVariables = {};
    var viewConstants = {};

    /**
     * Function is called once every time the module tab is selected, loads the module.
     * @param  {[type]} framework   The active framework instance.
     * @param  {[type]} onError     Function to be called if an error occurs.
     * @param  {[type]} onSuccess   Function to be called when complete.
    **/
    this.onModuleLoaded = function(framework, onError, onSuccess) {
        //Save data from loaded moduleConstants.json file
        constants = framework.moduleConstants.constants;
        preBuiltScripts = framework.moduleConstants.preBuiltScripts;
        luaVariables = framework.moduleConstants.luaVariables;
        viewConstants = framework.moduleConstants.viewData;

        var setupBindings = [
            {bindingClass: 'LUA_RUN', binding: 'LUA_RUN', direction: 'read'},
            {bindingClass: 'LUA_DEBUG_ENABLE', binding: 'LUA_DEBUG_ENABLE', direction: 'read'},
            {bindingClass: 'LUA_DEBUG_NUM_BYTES', binding: 'LUA_DEBUG_NUM_BYTES', direction: 'read'},
            {bindingClass: 'LUA_STARTUP_CONFIG', binding: 'LUA_STARTUP_CONFIG', direction: 'read'},
        ];

        // Save the setupBindings to the framework instance.
        framework.putSetupBindings(setupBindings);
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

        // // While configuring the device build a dict to be used for generating the
        // // module's template.
        // moduleContext.debugData = [];

        framework.clearConfigBindings();
        onSuccess();
    };
    this.onDeviceConfigured = function(framework, device, setupBindings, onError, onSuccess) {
        //Register various device bindings
        var deviceBindings = [
            {
                bindingClass: 'LUA_RUN', 
                template: 'LUA_RUN',   
                binding: 'LUA_RUN',    
                direction: 'read',  
                format: '%d', 
                iterationDelay: 9,
                initialDelay: 0,
                execCallback: true,
                callback: function(data, onSuccess) {
                    var val = data.value;
                    var icon = $('#script-running-status');
                    icon.attr('class',luaVariables.runStatus.icon[val]);
                    icon.attr('title',luaVariables.runStatus.title[val]);
                    onSuccess();
                }
            },
            {
                bindingClass: 'LUA_STARTUP_CONFIG', 
                template: 'LUA_STARTUP_CONFIG',   
                binding: 'LUA_STARTUP_CONFIG',    
                direction: 'read',  
                format: '%d', 
                iterationDelay: 9,
                initialDelay: 0,
                execCallback: true,
                callback: function(data, onSuccess) {
                    var val = data.value;
                    var icon = $('#startup-script-running-status');
                    icon.attr('class',luaVariables.startupStatus.icon[val]);
                    icon.attr('title',luaVariables.startupStatus.title[val]);
                    onSuccess();
                }
            },
            {
                bindingClass: 'LUA_DEBUG_ENABLE', 
                template: 'LUA_DEBUG_ENABLE',   
                binding: 'LUA_DEBUG_ENABLE',    
                direction: 'read',  
                format: '%d', 
                iterationDelay: 9,
                initialDelay: 0
            },
            {
                bindingClass: 'LUA_DEBUG_NUM_BYTES', 
                template: 'LUA_DEBUG_NUM_BYTES',
                binding: 'LUA_DEBUG_NUM_BYTES',    
                direction: 'read',  
                format: '%d', 
                iterationDelay: 0,
                execCallback: true,
                callback: function(data, onSuccess) {
                    // console.log(data.binding.binding, data.value)
                    onSuccess();
                }
            },
            {
                // Define binding to handle run/pause button presses.
                bindingClass: 'run-lua-script-button',  
                template: 'run-lua-script-button', 
                binding: 'run-lua-script-button-callback',  
                direction: 'write', 
                event: 'click',
                execCallback: true,
                callback: function(data, onSuccess) {
                    console.log('run-pressed');
                    onSuccess();
                }
            },
            {
                // Define binding to handle script-upload button presses.
                bindingClass: 'upload-lua-script-to-device-button',  
                template: 'upload-lua-script-to-device-button', 
                binding: 'upload-lua-script-to-device-button-callback',  
                direction: 'write', 
                event: 'click',
                execCallback: true,
                callback: function(data, onSuccess) {
                    console.log('upload-pressed');
                    onSuccess();
                }
            },
            {
                // Define binding to handle enable at startup button presses.
                bindingClass: 'enable-script-at-startup-button',  
                template: 'enable-script-at-startup-button', 
                binding: 'enable-script-at-startup-button-callback',  
                direction: 'write', 
                event: 'click',
                execCallback: true,
                callback: function(data, onSuccess) {
                    console.log('enable-at-startup-pressed');
                    onSuccess();
                }
            },
        ];

        // Save the bindings to the framework instance.
        framework.putConfigBindings(deviceBindings);

        // Load configuration data & customize view
        
        // Load default startup script & complete function
        var fileName = constants.editor.defaultScript;
        var fileLocation;
        var scripts = preBuiltScripts;
        var scriptData;
        scripts.some(function(script,index){
            if(script.name == fileName){
                fileLocation = script.location;
                return true;
            }
        });
        fs_facade.readModuleFile(
            fileLocation,
            function(err) {
                console.log('Error loading script',err);
                moduleContext.luaScript = {
                    "name": "Failed to load file: " +fileName,
                    "code": "Failed to load file: " +fileName
                };
                framework.setCustomContext(moduleContext);
                onSuccess();
            },
            function(data) {
                scriptData = data;
                // console.log('Successfully loaded script',data);
                // Load a file & save to the module's context
                moduleContext.luaScript = {
                    "name": fileName,
                    "code": scriptData
                };
                // save the custom context to the framework so it can be used when
                // rendering the module's template.
                framework.setCustomContext(moduleContext);
                onSuccess();
            }
        );
    };

    this.onTemplateLoaded = function(framework, onError, onSuccess) {
        //Initialize ace editor:
        luaEditor.setupEditor(
            "lua-code-editor", 
            "ace/theme/monokai", 
            "ace/mode/lua"
        );
        debuggingLog.setupEditor(
            "lua-console-log-editor", 
            "ace/theme/monokai", 
            "ace/mode/text"
        );

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
        // console.log('in onRefreshed',results);
        results.forEach(function(key, value){
            // console.log('results['+value+']:',key)
        });
        onSuccess();
    };
    this.onCloseDevice = function(framework, device, onError, onSuccess) {
        onSuccess();
    };
    this.onUnloadModule = function(framework, onError, onSuccess) {
        aceEditor = undefined;
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

    this.getEditor = function() {
        return aceEditor;
    };
    var self = this;
}
/*
Code Notes:

Notes about ace-editor:
set read-only:
editor.setReadOnly(true)

read num-lines visible:
editor.session.getLength()

focus on the last-visible line:
editor.gotoLine(editor.session.getLength())

focus on line #5
editor.gotoLine(5)

set text-mode:
editor.getSession().setMode("ace/mode/text")

make user-cursor look greyed out:
editor.blur()

get last row of actual text:
editor.getLastVisibleRow()

getting document object:
var cDoc = editor.getSession().getDocument()

removing lines from document:
cDoc.removeLines(6,7)

remove line #5 from editor
cDoc.removeLines(4,4)

insert text to lines 21->23:
str="abcd\r\n\r\nefg"
cDoc.insert({row:20,column:0},str)

insert text to end of document:
cDoc.insert({row:editor.session.getLength(),column:0},str)

insert text to begining of document:
cDoc.insert({row:0,column:0},str)

remove first two lines from document
cDoc.removeLines(0,1)
 */


