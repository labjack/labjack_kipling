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
var MODULE_UPDATE_PERIOD_MS = 150;
var SECONDARY_UPDATE_RATE = 1000;
// Constant that can be set to disable auto-linking the module to the framework
var DISABLE_AUTOMATIC_FRAMEWORK_LINKAGE = false;


/**
 * Module object that gets automatically instantiated & linked to the appropriate framework.
 * When using the 'singleDevice' framework it is instantiated as sdModule.
 */
function module() {
    var _ = global.require('underscore-min');
    this.framework = undefined;
    var frameworkElement;
    this.frameworkElement = frameworkElement;
    var luaEditor = null;
    this.luaEditor = luaEditor;
    var debuggingLog = null;
    this.debuggingLog = debuggingLog;

    try{
        var luaController = new luaDeviceController();
        this.luaController = luaController;
    } catch(err) {
        console.error('Caught Another Error!!',err);
        alert('Here Too!');
    }

    var moduleContext = {};
    this.moduleContext = moduleContext;

    var constants = {};
    this.constants = constants;
    var preBuiltScripts = {};
    this.preBuiltScripts = preBuiltScripts;
    var scriptOptions = {};
    this.scriptOptions = scriptOptions;
    var luaVariables = {};
    this.luaVariables = luaVariables;
    var viewConstants = {};
    this.viewConstants = viewConstants;

    var isScriptRunning = 0;
    this.isScriptRunning = isScriptRunning;
    var isConfiguredForStartup = 0;
    this.isConfiguredForStartup = isConfiguredForStartup;
    var isDebugEnabled = 0;
    this.isDebugEnabled = isDebugEnabled;
    var numDebugBytes = 0;
    this.numDebugBytes = numDebugBytes;

    var isDeviceStatusBarHidden = false;
    this.isDeviceStatusBarHidden = isDeviceStatusBarHidden;
    var isLuaEditorHidden = false;
    this.isLuaEditorHidden = isLuaEditorHidden;
    var isLuaDebuggerHidden = false;
    this.isLuaDebuggerHidden = isLuaDebuggerHidden;
    var areTableDescriptionsHidden = false;
    this.areTableDescriptionsHidden = areTableDescriptionsHidden;

    var ENABLE_PRINTING_USER_DEBUG_INFO = true;
    this.ENABLE_PRINTING_USER_DEBUG_INFO = ENABLE_PRINTING_USER_DEBUG_INFO;

    var handleIOSuccess = function(onSuccess, debugData) {
        return function() {
            if(debugData !== null) {
                self.printUserDebugInfo(debugData);
            }
            onSuccess();
        };
    };
    this.handleIOSuccess = handleIOSuccess;

    var handleIOError = function(onSuccess, debugData) {
        return function(err) {
            console.log('LSD Error',err);
            if (typeof(err) === "number") {
                // Show Alert!
                var errStr = "LS-Err-";
                errStr += device_controller.ljm_driver.errToStrSync(err);
                showAlert(errStr);
            }
            if (debugData !== null) {
                console.log(debugData);
            }
            onSuccess();
        };
    };
    this.handleIOError = handleIOError;

    this.printUserDebugInfo = function(data, A, B, C, D) {
        if(self.ENABLE_PRINTING_USER_DEBUG_INFO) {
            if(typeof(A) !== 'undefined') {
                if(typeof(B) !== 'undefined') {
                    if(typeof(C) !== 'undefined') {
                        if(typeof(D) !== 'undefined') {
                            console.log(data, A, B, C, D);
                        } else {
                            console.log(data, A, B, C);
                        }
                    } else {
                        console.log(data, A, B);
                    }
                } else {
                    console.log(data, A);
                }
            } else {
                console.log(data);
            }
        }
    };
    this.getModuleHeight = function() {
        var moduleChromeContentsEl = $('#module-chrome-contents');
        var moduleHeight = moduleChromeContentsEl.height();
        var topPadding = moduleChromeContentsEl.css('padding-top');
        var bottomPadding = moduleChromeContentsEl.css('padding-bottom');

        moduleHeight += parseInt(topPadding.slice(0,topPadding.search('px')));
        moduleHeight += parseInt(bottomPadding.slice(0,bottomPadding.search('px')));

        return moduleHeight;
    };

    this.moduleWindowResizeListener = function (moduleHeight) {
        // console.log('Module Height:', moduleHeight);

        // if only the LuaEditor is visible:
        var adjustEditor = self.isLuaDebuggerHidden && (!self.isLuaEditorHidden);
        var adjustDebugger = (!self.isLuaDebuggerHidden) && self.isLuaEditorHidden;

        // Adjust inner-module div height for scrollbar prevention
        var deviceSelectorHeight = $('#device-selector').height();
        var moduleHeightEl = $('#lua-script-window-views');
        var controlsHeight = $('#lua-script-device-and-file-io-controls').height();
        controlsHeight += 11;       // Add 20px for the margin-bottom.
        var windowHeight = $(window).height();
        var scriptInfoHeight = $('#lua-script-active-script-info').height();
        var debuggerButtonsHeight = $('#lua-script-device-debugger-buttons').height();

        var newModuleHeight = moduleHeight - controlsHeight - deviceSelectorHeight;

        var moduleHeightExtra = 8;
        moduleHeightEl.height((newModuleHeight + moduleHeightExtra).toString()+'px');

        var magicHeightVal = 193; 
        var heightAdjust = magicHeightVal;
        if(self.areTableDescriptionsHidden) {
            heightAdjust -= 49;
        }

        var newHeight = newModuleHeight;
        if (adjustEditor) {
            // console.log('adjustingHeight of editor');\
            self.luaController.codeEditor.setHeight(newHeight);
        } else if(adjustDebugger) {
            // console.log('adjustingHeight of debugger');
            newHeight -= debuggerButtonsHeight;
            newHeight -= 10; // for the padding on the lua-script-device-debugger-box;
            self.luaController.debuggingLog.setHeight(newHeight);
        } else {
            // console.log('Setting to default height');
            try {
                self.luaController.codeEditor.setHeight(500);
                self.luaController.debuggingLog.setHeight(300);
            } catch(err) {
                // console.error('luaDebugger controller.js err',err);
            }
        }
    };
    this.refreshEditorHeights = function() {
        var moduleHeight = self.getModuleHeight();
        self.moduleWindowResizeListener(moduleHeight);
    };

    this.getLuaScriptInfo = function(propertyValue, property) {
        var scriptInfo;

        var getScriptInfo = function(scripts) {
            var retData = {
                'isFound': false,
                'scriptInfo': null
            };
            scripts.some(function(script) {
                if(script.subScripts) {
                    var subRetData = getScriptInfo(script.subScripts);
                    if(subRetData.isFound) {
                        retData = subRetData;
                        return true;
                    }
                }
                if(script[property]) {
                    if(script[property] === propertyValue) {
                        retData.isFound = true;
                        retData.scriptInfo = script;
                        return true;
                    }
                }
            });
            return retData;
        };
        scriptInfo = getScriptInfo(self.preBuiltScripts);
        return scriptInfo;
    };
    this.registerSaveButtonHandler = function(func) {
        var listenerName = self.framework.moduleData.name;
        KEYBOARD_EVENT_HANDLER.addListener(
            'save',
            listenerName,
            func
        );
    };
    this.removeSaveButtonhandler = function() {
        var listenerName = self.framework.moduleData.name;
        KEYBOARD_EVENT_HANDLER.deleteListener(
            'save',
            listenerName
        );
    };

    /**
     * Function is called once every time the module tab is selected, loads the module.
     * @param  {[type]} framework   The active framework instance.
     * @param  {[type]} onError     Function to be called if an error occurs.
     * @param  {[type]} onSuccess   Function to be called when complete.
    **/
    this.onModuleLoaded = function(framework, onError, onSuccess) {
        //Save data from loaded moduleConstants.json file
        self.constants = framework.moduleConstants.constants;
        self.preBuiltScripts = framework.moduleConstants.preBuiltScripts;
        self.scriptOptions = framework.moduleConstants.scriptOptions;
        self.luaVariables = framework.moduleConstants.luaVariables;
        self.viewConstants = framework.moduleConstants.viewData;

        self.isDeviceStatusBarHidden = !self.constants.deviceStatusShownAtStartup;
        self.isLuaEditorHidden = !self.constants.luaEditorShownAtStartup;
        self.isLuaDebuggerHidden = !self.constants.luaDebuggerShownAtStartup;
        self.areTableDescriptionsHidden = !self.constants.tableDescriptionsShownAtStartup;
        
        // Save framework object reference
        self.framework = framework;
        // Initialize Device module context obj
        moduleContext.device = {};

        // Initialize moduleWindowResizeListner
        // addModuleWindowResizeListner(
        //     framework.moduleName,
        //     self.moduleWindowResizeListener
        // );

        var setDeviceData = function(classStr, result) {
            // Initialize variables
            var statusTitle = "";
            var statusIcon = "";
            var buttonTitle = "";
            var buttonIcon = "";
            var index = 0;

            var val = result.result;

            if(val > 1) {
                val = 1;
            }

            statusTitle = self.luaVariables[classStr].statusTitle[val];
            statusIcon = self.luaVariables[classStr].statusIcon[val];
            buttonTitle = self.luaVariables[classStr].buttonTitle[val];
            buttonIcon = self.luaVariables[classStr].buttonIcon[val];

            moduleContext.device[classStr] = {};
            moduleContext.device[classStr].statusTitle = statusTitle;
            moduleContext.device[classStr].statusIcon = statusIcon;
            moduleContext.device[classStr].buttonTitle = buttonTitle;
            moduleContext.device[classStr].buttonIcon = buttonIcon;
        };
        var saveConfigRunStatus = function(data, onSuccess) {
            setDeviceData('runStatus',data.result);
            onSuccess();
        };
        var saveConfigBootScriptStatus = function(data, onSuccess) {
            setDeviceData('startupStatus',data.result);
            onSuccess();
        };
        var genericConfigCallback = function(data, onSuccess) {
            // console.log('Binding: ',data.binding.bindingClass, data.result);
            onSuccess();
        };
        var genericPeriodicCallback = function(data, onSuccess) {
            onSuccess();
        };
        var genericButtonPress = function(data, onSuccess) {
            // console.log('Pressed: ',data.binding.bindingClass, data.eventData);
            onSuccess();
        };
        var conditionalExecution = function(constants, trueFunc, falseFunc, onSuccess) {
            var button = $('#'+constants.buttonID);
            var trueTitle = constants.buttonTitle[0];
            var falseTitle = constants.buttonTitle[1];
            var icon = button.children();
            var trueIcon = constants.buttonIcon[0];
            var falseIcon = constants.buttonIcon[1];

            var execTrue = icon.hasClass(trueIcon);
            if(execTrue) {
                trueFunc()
                .then(function(){
                    // Change icon & title
                    icon.removeClass(trueIcon);
                    icon.addClass(falseIcon);
                    button.attr('title',falseTitle);
                    onSuccess();
                },self.handleIOError(onSuccess));
            } else {
                falseFunc()
                .then(function(){
                    // Change icon & title
                    icon.removeClass(falseIcon);
                    icon.addClass(trueIcon);
                    button.attr('title',trueTitle);
                    onSuccess();
                },self.handleIOError(onSuccess));
            }
        };
        var runPauseLuaScript = function(data, onSuccess) {
            self.printUserDebugInfo('runPause button pressed');

            var constants = self.luaVariables.runStatus;
            conditionalExecution(
                constants,
                self.luaController.loadAndStartScript,
                self.luaController.stopScript,
                self.handleIOSuccess(setActiveScriptInfo(onSuccess),'Configured LUA_RUN')
            );
        };
        var saveScriptToFlash = function(data, onSuccess) {
            self.printUserDebugInfo('saveScriptToFlash button pressed');
            self.luaController.saveScriptToFlash()
            .then(
                self.handleIOSuccess(setActiveScriptInfo(onSuccess),'Script Saved to Flash'),
                self.handleIOError(onSuccess,'Err: Script Not Saved to Flash')
            );
        };
        var uploadLuaScript = function(data, onSuccess) {
            self.printUserDebugInfo('uploadLuaScript button pressed');
            self.luaController.loadLuaScript()
            .then(
                self.handleIOSuccess(onSuccess,'Script Loaded'),
                self.handleIOError(onSuccess,'Err: Script Not Loaded')
            );
        };
        var enableStartupScript = function(data, onSuccess) {
            self.printUserDebugInfo('enableStartupScript button pressed');

            var constants = self.luaVariables.startupStatus;
            conditionalExecution(
                constants,
                self.luaController.enableStartupLuaScript,
                self.luaController.disableStartupLuaScript,
                self.handleIOSuccess(onSuccess,'Configured LUA_RUN_DEFAULT')
            );
        };
        var createNewLuaScript = function(data, onSuccess) {
            self.printUserDebugInfo('Creating new Lua Script');
            self.luaController.createNewScript()
            .then(
                self.handleIOSuccess(
                    setActiveScriptInfo(onSuccess),
                    'New Lua Script Created'
                ),
                self.handleIOError(
                    setActiveScriptInfo(onSuccess),
                    'Err: New Lua Script Not Created'
                )
            );
        };
        var loadLuaFile = function(data, onSuccess) {
            self.printUserDebugInfo('Loading file....');

            $(fs_facade.getFileLoadID()).val('');
            var chooser = $(fs_facade.getFileLoadID());
            var onChangedFile = function(event) {
                var fileLoc = $(fs_facade.getFileLoadID()).val();
                self.luaController.loadScriptFromFile(fileLoc)
                .then(
                    self.handleIOSuccess(
                        setActiveScriptInfo(onSuccess),
                        'Script File Loaded'
                    ),
                    self.handleIOError(
                        setActiveScriptInfo(onSuccess),
                        'Err: Script File Not Loaded'
                    )
                );
            };
            chooser.unbind('change');
            chooser.bind('change', onChangedFile);
            chooser.trigger('click');
        };
        var loadLuaExample = function(data, onSuccess) {
            self.printUserDebugInfo('loadLuaExample button pressed');
            var scriptName = data.eventData.target.id;
            var classList = data.eventData.target.classList;
            var classListLength = classList.length;
            var isExample = false;
            for(var i = 0; i < classListLength; i++) {
                if(classList.item(i) === 'example-script') {
                    isExample = true;
                }
            }
            // var buttonGroup = $(data.binding.bindingClass);
            // console.log(buttonGroup);
            self.clickData = data;
            // console.log('in loadLuaExample', scriptName, classList);
            if(isExample) {
                if(scriptName !== "") {
                    self.printUserDebugInfo("Loading Script: ",scriptName);
                    var fileLocation = "";
                    // var scripts = self.preBuiltScripts;
                    // scripts.some(function(script,index){
                    //     if(script.name === scriptName){
                    //         fileLocation = script.location;
                    //         return true;
                    //     }
                    // });
                    var scriptInfo = self.getLuaScriptInfo(scriptName, 'name');
                    self.printUserDebugInfo("Getting Script Info, loadLuaExample: ", scriptInfo);
                    fileLocation = scriptInfo.scriptInfo.location;
                    
                    self.luaController.loadExampleScript(fileLocation)
                    .then(
                        self.handleIOSuccess(
                            setActiveScriptInfo(onSuccess),
                            'Script Example Loaded'
                        ),
                        self.handleIOError(
                            setActiveScriptInfo(onSuccess),
                            'Err: Script Example Not Loaded'
                        )
                    );
                } else {
                    onSuccess();
                }
            } else {
                // console.log('in loadLuaExample, not an example', scriptName, classList);
                onSuccess();
            }
        };
        var setActiveScriptInfo = function(onSuccess) {
            return function() {
                var scriptTypeKey = self.luaController.curScriptType;
                var scriptType = self.scriptOptions[scriptTypeKey].windowMessage;
                var scriptLocation = self.luaController.curScriptFilePath;
                var scriptName = "";

                self.luaController.printLoadedScriptInfo('in setActiveScriptInfo');
                if(scriptTypeKey === self.scriptOptions.types[0]) {
                    // var scripts = self.preBuiltScripts;
                    // scripts.some(function(script,index){
                    //     if(script.location === scriptLocation){
                    //         scriptName = script.name;
                    //         return true;
                    //     }
                    // });
                    var scriptInfo = self.getLuaScriptInfo(scriptLocation, 'location');
                    if(scriptInfo.isFound) {
                        scriptName = scriptInfo.scriptInfo.name;
                    }
                } else {
                    scriptName = scriptLocation;
                }
                self.printUserDebugInfo(
                    'Active Script Options:',
                    self.luaController.curScriptOptions
                );
                self.printUserDebugInfo(
                    'Active Script Type:',
                    self.luaController.curScriptType
                );
                self.printUserDebugInfo(
                    'Active Script FilePath:',
                    self.luaController.curScriptFilePath
                );
                $('#'+sdModule.scriptOptions.scriptTypeID).text(scriptType);
                $('#'+sdModule.scriptOptions.scriptNameID).text(scriptName);
                onSuccess();
            };
        };
        var saveCurrentLuaScript = function(onSuccess) {
            self.luaController.saveLoadedScript()
            .then(
                self.handleIOSuccess(
                    setActiveScriptInfo(onSuccess),
                    'Script Saved to File (save)'
                ),
                self.handleIOError(
                    setActiveScriptInfo(onSuccess),
                    'Err: Script Not Saved to File (save)'
                )
            );
        };
        var saveButtonHandler = function(eventData) {
            console.log('in saveButtonHandler HERE!', eventData);
            saveCurrentLuaScript(onSuccess);
        };
        var saveLoadedScriptToFile = function(data, onSuccess) {
            self.printUserDebugInfo('saveLoadedScriptToFile button pressed');
            var buttonType = data.eventData.toElement.id;

            if (buttonType === "save-button") {
                saveCurrentLuaScript(onSuccess);
            } else if (buttonType === "saveAs-button") {
                self.luaController.saveLoadedScriptAs()
                .then(
                    self.handleIOSuccess(
                        setActiveScriptInfo(onSuccess),
                        'Script Saved to File (saveAs)'
                    ),
                    self.handleIOError(
                        setActiveScriptInfo(onSuccess),
                        'Err: Script Not Saved to File (saveAs)'
                    )
                );
            } else {
                onSuccess();
            }
        };
        var setButtonIcon = function(constants, val) {
            var button = $('#' + constants.buttonID);
            var icon = button.children();
            icon.attr('class', constants.buttonIcon[val]);
            button.attr('title', constants.buttonTitle[val]);
        };
        var setStatusIcon = function(constants, val) {
            var icon = $('#' + constants.statusID);
            icon.attr('class', constants.statusIcon[val]);
            icon.attr('title', constants.statusTitle[val]);
        };
        var isLuaRunning = function(data, onSuccess) {
            setStatusIcon(self.luaVariables.runStatus, data.value);
            setButtonIcon(self.luaVariables.runStatus, data.value);
            onSuccess();
        };
        var isConfiguredForStartup = function(data, onSuccess) {
            setStatusIcon(self.luaVariables.startupStatus, data.value);
            setButtonIcon(self.luaVariables.startupStatus, data.value);
            onSuccess();
        };
        var numDebugBytes = function(data, onSuccess) {
            var val = data.value;
            if(val > 0) {
                self.luaController.getAndAddDebugData(val)
                .then(function() {
                    // onSuccess
                    onSuccess();
                }, function() {
                    // onError
                    onSuccess();
                });
            } else {
                onSuccess();
            }
        };
        var manageDeviceStatusBarVisibility = function(data, onSuccess) {
            self.printUserDebugInfo(
                'manageDeviceStatusBarVisibility button pressed'
            );
            var luaBodyBarEl = $('#'+ self.constants.luaBodyBarID);
            var deviceStatusEl = $('#'+ self.constants.deviceStatusID);
            if(self.isDeviceStatusBarHidden) {
                // Show the DeviceStatusBar
                luaBodyBarEl.addClass('deviceStatusBarVisible');
                luaBodyBarEl.removeClass('deviceStatusBarHidden');
                deviceStatusEl.show();

                setButtonIcon(self.viewConstants.deviceStatus, 1);
                self.isDeviceStatusBarHidden ^= true;
                self.refreshEditorHeights();
                onSuccess();
            } else {
                // Hide the DeviceStatusBar
                deviceStatusEl.hide();
                luaBodyBarEl.addClass('deviceStatusBarHidden');
                luaBodyBarEl.removeClass('deviceStatusBarVisible');
                
                setButtonIcon(self.viewConstants.deviceStatus, 0);
                self.isDeviceStatusBarHidden ^= true;
                self.refreshEditorHeights();
                onSuccess();
            }

            
        };
        var manageLuaEditorVisibility = function(data, onSuccess) {
            self.printUserDebugInfo(
                'manageLuaEditorVisibility button pressed'
            );
            // Get Window Element
            var luaEditorEl = $('#'+self.constants.luaEditorID);

            if(self.isLuaEditorHidden) {
                // if element is hidden then show it:
                luaEditorEl.show();

                // Set button Icon & title
                setButtonIcon(self.viewConstants.luaEditor, 1);

                // Toggle visibility status                
                self.isLuaEditorHidden ^= true;
                self.refreshEditorHeights();
                onSuccess();
            } else {
                // if element is shown then hide it:
                luaEditorEl.hide();

                // Set button Icon & title
                setButtonIcon(self.viewConstants.luaEditor, 0);

                // Toggle visibility status
                self.isLuaEditorHidden ^= true;
                self.refreshEditorHeights();
                onSuccess();
            }
        };
        var manageLuaDebuggerVisibility = function(data, onSuccess) {
            self.printUserDebugInfo(
                'manageLuaDebuggerVisibility button pressed'
            );
            // Get Window Element
            var luaDebuggerEl = $('#'+self.constants.luaDebuggerID);
            var luaDebuggerButtonsEl = $('#'+self.constants.luaDebuggerButtonsID);

            if(self.isLuaDebuggerHidden) {
                // if element is hidden then show it:
                luaDebuggerEl.show();
                luaDebuggerButtonsEl.show();

                // Set button Icon & title
                setButtonIcon(self.viewConstants.luaDebugger, 1);

                // Toggle visibility status                
                self.isLuaDebuggerHidden ^= true;
                self.refreshEditorHeights();
                onSuccess();
            } else {
                // if element is shown then hide it:
                luaDebuggerEl.hide();
                luaDebuggerButtonsEl.hide();

                // Set button Icon & title
                setButtonIcon(self.viewConstants.luaDebugger, 0);

                // Toggle visibility status
                self.isLuaDebuggerHidden ^= true;
                self.refreshEditorHeights();
                onSuccess();
            }
        };
        var manageTableDescriptionsVisibility = function(data, onSuccess) {
            self.printUserDebugInfo(
                'manageButtonInfoVisibility button pressed'
            );
            // Get Window Element
            var luaTableDescriptionsEl = $('#'+self.constants.tableDescriptionsID);

            if(self.areTableDescriptionsHidden) {
                // if element is hidden then show it:
                luaTableDescriptionsEl.show();

                // Set button Icon & title
                setButtonIcon(self.viewConstants.tableDescriptions, 1);

                // Toggle visibility status                
                self.areTableDescriptionsHidden ^= true;
                self.refreshEditorHeights();
                onSuccess();
            } else {
                // if element is shown then hide it:
                luaTableDescriptionsEl.hide();

                // Set button Icon & title
                setButtonIcon(self.viewConstants.tableDescriptions, 0);

                // Toggle visibility status
                self.areTableDescriptionsHidden ^= true;
                self.refreshEditorHeights();
                onSuccess();
            }
        };
        var moveCursorToBottomOfConsole = function(data, onSuccess) {
            self.luaController.moveDebuggingCursorToEnd()
            .then(
                self.handleIOSuccess(onSuccess,'Cursor locked to bottom'),
                self.handleIOError(onSuccess,'Err: Cursor not moved')
            );
        };

        // Register the SaveButtonhandler function to capture 'save' keypresses
        self.registerSaveButtonHandler(saveButtonHandler);
        var SecondaryRate = Math.round(SECONDARY_UPDATE_RATE/MODULE_UPDATE_PERIOD_MS);
        var smartBindings = [
            {
                bindingName: 'LUA_RUN',
                smartName: 'readRegister',
                iterationDelay: SecondaryRate,
                configCallback: saveConfigRunStatus,
                periodicCallback: isLuaRunning
            }, {
                bindingName: 'LUA_RUN_DEFAULT',
                smartName: 'readRegister',
                iterationDelay: SecondaryRate,
                configCallback: saveConfigBootScriptStatus,
                periodicCallback: isConfiguredForStartup
            }, {
                bindingName: 'LUA_DEBUG_ENABLE',
                smartName: 'readRegister',
                iterationDelay: SecondaryRate,
                configCallback: genericConfigCallback,
            }, {
                bindingName: 'LUA_DEBUG_NUM_BYTES',
                smartName: 'readRegister',
                configCallback: genericConfigCallback,
                periodicCallback: numDebugBytes
            }, {
                // Define binding to handle run/pause button presses.
                bindingName: 'run-lua-script-button',
                smartName: 'clickHandler',
                callback: runPauseLuaScript
            }, {
                // Define binding to handle save-script-to-flash button presses.
                bindingName: 'save-script-to-flash-button',
                smartName: 'clickHandler',
                callback: saveScriptToFlash
            }, {
                // Define binding to handle enable at startup button presses.
                bindingName: 'enable-script-at-startup-button',
                smartName: 'clickHandler',
                callback: enableStartupScript
            }, {
                // Define binding to handle saving the active lua script button presses.
                bindingName: 'save-lua-script-button',
                smartName: 'clickHandler',
                callback: saveLoadedScriptToFile
            }, {
                // Define binding to handle user create new lua script button presses.
                bindingName: 'create-new-lua-script-button',
                smartName: 'clickHandler',
                callback: createNewLuaScript
            }, {
                // Define binding to handle loading user luaFile button presses.
                bindingName: 'load-lua-script-button',
                smartName: 'clickHandler',
                callback: loadLuaFile
            }, {
                // Define binding to handle loading luaExample button presses.
                bindingName: 'load-example-lua-script-button',
                smartName: 'clickHandler',
                callback: loadLuaExample
            }, {
                // Define binding to handle show/hide deviceStatus button presses.
                bindingName: 'manage-view-device-status-button',
                smartName: 'clickHandler',
                callback: manageDeviceStatusBarVisibility
            }, {
                // Define binding to handle  show/hide luaEditor button presses.
                bindingName: 'manage-view-lua-editor-button',
                smartName: 'clickHandler',
                callback: manageLuaEditorVisibility
            }, {
                // Define binding to handle  show/hide luaDebugger button presses.
                bindingName: 'manage-view-lua-debugger-button',
                smartName: 'clickHandler',
                callback: manageLuaDebuggerVisibility
            }, {
                // Define binding to handle  show/hide tableDescriptions button presses.
                bindingName: 'manage-view-table-descriptions-button',
                smartName: 'clickHandler',
                callback: manageTableDescriptionsVisibility
            },
             {
                // Define binding to let users lock the cursor to the bottom of the console output.
                bindingName: 'lua-script-move-cursor-to-bottom-button',
                smartName: 'clickHandler',
                callback: moveCursorToBottomOfConsole
            },
        ];
        

        // Save the smartBindings to the framework instance.
        framework.putSmartBindings(smartBindings);
        
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
        // Save the currently selected device
        self.activeDevice = device;

        // // While configuring the device build a dict to be used for generating the
        // // module's template.
        // moduleContext.debugData = [];

        // Save device to the luaController object
        self.luaController.setDevice(device);

        framework.clearConfigBindings();
        onSuccess();
    };
    this.onDeviceConfigured = function(framework, device, setupBindings, onError, onSuccess) {
        // Load configuration data & customize view
        var setViewData = function(classStr, isVisible) {
            // Initialize variables
            var title = "";
            var icon = "";
            var id = "";
            var visibility = "";
            var index = 0;

            // Determine the appropriate state, visible == 1, invisible == 0
            if(isVisible) {
                index = 1;
            } else {
                index = 0;
                visibility = "display:none;";
            }

            // Get data from constants
            title = self.viewConstants[classStr].buttonTitle[index];
            icon = self.viewConstants[classStr].buttonIcon[index];
            id = self.viewConstants[classStr].buttonID;

            //Save data to module's context
            self.moduleContext.views[classStr] = {};

            self.moduleContext.views[classStr].title = title;
            self.moduleContext.views[classStr].icon = icon;
            self.moduleContext.views[classStr].id = id;
            self.moduleContext.views[classStr].isVisible = isVisible;
            self.moduleContext.views[classStr].visibility = visibility;
        };
        // Clear any view data
        self.moduleContext.views = {};

        // Set View Data
        setViewData('deviceStatus', self.constants.deviceStatusShownAtStartup);
        setViewData('luaEditor', self.constants.luaEditorShownAtStartup);
        setViewData('luaDebugger', self.constants.luaDebuggerShownAtStartup);
        setViewData('tableDescriptions', self.constants.tableDescriptionsShownAtStartup);
        
        // Load default startup script & complete function
        var fileName = self.constants.editor.defaultScript;
        var fileLocation;
        var scripts = self.preBuiltScripts;
        var scriptInfo;
        scriptInfo = self.getLuaScriptInfo(fileName, 'name');
        fileLocation = scriptInfo.scriptInfo.location;
        // scripts.some(function(script,index){
        //     if(script.name == fileName){
        //         fileLocation = script.location;
        //         return true;
        //     }
        // });

        // Consigure moduleContext to have the list of scripts
        self.moduleContext.exampleScripts = scripts;

        var scriptType = self.scriptOptions.types[0];
        var scriptOptions = self.scriptOptions[scriptType];
        self.luaController.setScriptConstants(self.scriptOptions);
        self.luaController.setScriptType(
            scriptType,
            scriptOptions,
            fileLocation
        );
        self.moduleContext.scriptConstants = self.scriptOptions;
        self.moduleContext.constants =self.constants;
        // Load Script File
        fs_facade.readModuleFile(
            fileLocation,
            function(err) {
                console.log('Error loading script',err);
                self.moduleContext.luaScript = {
                    "name": "Failed to load file: " +fileName,
                    "code": "Failed to load file: " +fileName,
                    "windowMessage": self.scriptOptions.example.windowMessage
                };
                framework.setCustomContext(self.moduleContext);
                onSuccess();
            },
            function(data) {
                scriptData = data;

                // Load a file & save to the module's context
                self.moduleContext.luaScript = {
                    "name": fileName,
                    "code": scriptData,
                    "windowMessage": self.scriptOptions.example.windowMessage
                };

                // save the custom context to the framework so it can be used when
                // rendering the module's template.
                framework.setCustomContext(self.moduleContext);
                onSuccess();
            }
        );
    };

    this.windowResizedListener = function() {
        try {
            self.refreshEditorHeights();
        } catch(err) {
            // catch the error...
        }
    };
    this.attachResizedListener = function() {
        var throttledWindowResizedListener = _.throttle(
            self.windowResizedListener,
            100);
        $(window).on('resize', throttledWindowResizedListener);
    };
    this.removeResizedListener = function() {
        $(window).off('resize', self.windowResizedListener);
    };
    this.onTemplateLoaded = function(framework, onError, onSuccess) {
        $('#browse-link').click(function () {
            var chooser = $('#file-dialog-hidden');
            chooser.change(function(evt) {
                var fileLoc = $(this).val();
                console.log('FiileLoc',fileLoc);
            });

            chooser.trigger('click');
            return false;
        });

        self.attachResizedListener();
        // Initialize ace editor obj for luaEditor & debuggingLog:
        try {
            self.luaEditor = new textEditor();
            self.debuggingLog = new textEditor();
            self.luaEditor.setupEditor(
                "lua-code-editor",
                "ace/theme/monokai",
                "ace/mode/lua",
                'luaEditor'
            );
            self.debuggingLog.setupEditor(
                "lua-debugging-log-editor",
                "ace/theme/monokai",
                "ace/mode/text",
                'console'
            );

            // Save luaEditor & debuggingLog objects to the luaController object
            self.luaController.setCodeEditor(self.luaEditor);
            self.luaController.setDebuggingLog(self.debuggingLog);

            onSuccess();
        } catch(err) {
            console.error('Caught Exception!!',err);
            onError();
        }
    };
    this.onRegisterWrite = function(framework, binding, value, onError, onSuccess) {
        // console.log('in onRegisterWrite',binding);
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
        self.removeResizedListener();
        onSuccess();
    };
    this.onUnloadModule = function(framework, onError, onSuccess) {
        self.removeResizedListener();
        // Remove 'save' button listener
        self.removeSaveButtonhandler();

        // Remove moduleWindowResizeListner
        // removeModuleWindowResizeListner(
        //     framework.moduleName
        // );
        try {
            self.luaEditor.destroy();
            self.debuggingLog.destroy();
        } catch(err) {
            console.error('Failed to destroy editors',err);
        }
        aceEditor = undefined;
        self.aceEditor = undefined;
        luaEditor = undefined;
        self.luaEditor = undefined;
        debuggingLog = undefined;
        self.debuggingLog = undefined;
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

var getFile = function(d,readType) {
    var isFirstRead = readType === 'first';
    var isFile;
    if (isFirstRead){
        isFile = d.read('FILE_IO_DIR_FIRST') === 0;
    } else {
        isFile = d.read('FILE_IO_DIR_NEXT') === 0;
    }
    if(isFile) {
        console.log('FILE_IO_ATTRIBUTES',d.read('FILE_IO_ATTRIBUTES'));
        console.log('FILE_IO_SIZE',d.read('FILE_IO_SIZE'));
        d.readArray('FILE_IO_NAME_READ',d.read('FILE_IO_NAME_READ_LEN'))
        .then(
            function(data){
                console.log('Data:',data);
                data.forEach(function(value){
                    console.log(String.fromCharCode(value));
                });
            },
            function(err){
                console.log('err:',err);
            });
    } else {
        if(isFirstRead){
            console.log('No Files');
        } else {
            console.log('No More Files');
        }
    }
};
var readRomId = function(d, eioNum) {
    function dec2hex(i)
    {
      var result = "0000";
      if      (i >= 0    && i <= 15)    { result = "000" + i.toString(16); }
      else if (i >= 16   && i <= 255)   { result = "00"  + i.toString(16); }
      else if (i >= 256  && i <= 4095)  { result = "0"   + i.toString(16); }
      else if (i >= 4096 && i <= 65535) { result =         i.toString(16); }
      return '0x'+result.toUpperCase();
    }
    // Functions:
    // Search,  0xF0,   240
    // Skip,    0xCC,   204
    // Match,   0x55,   85
    // Read,    0x33,   51
    var oneWireFunctions = {
        search: 0xF0,
        skip: 0xCC,
        match: 0x55,
        read: 0x33
    };
    var txData = [];
    var oneWireConfig = {
        dq:eioNum+8,
        dpu:0,
        options:0,
        func:oneWireFunctions.search,
        numTx: txData.length,
        numRx:0,
        romH:0,
        romL:0,
        pathH:0,
        pathL:0,
        dataTx:txData,
    };
    var highResProbeTxData = [0x4E,0xFF,0x00,0x7F];
    var highResProbeConfig = {
        dq:eioNum+8,
        dpu:0,
        options:0,
        func:oneWireFunctions.match,
        numTx: highResProbeTxData.length,
        numRx:0,
        romH:0,
        romL:0,
        pathH:0,
        pathL:0,
        dataTx:highResProbeTxData,
    };
    var configOneWire = function(info) {
        return function() {
            var ioDeferred = q.defer();
            var addresses = [
                'ONEWIRE_DQ_DIONUM',
                'ONEWIRE_DPU_DIONUM',
                'ONEWIRE_OPTIONS',
                'ONEWIRE_FUNCTION',
                'ONEWIRE_NUM_BYTES_TX',
                'ONEWIRE_NUM_BYTES_RX',
                'ONEWIRE_ROM_MATCH_H',
                'ONEWIRE_ROM_MATCH_L',
                'ONEWIRE_PATH_H',
                'ONEWIRE_PATH_L'
            ];
            var values = [
                info.dq,
                info.dpu,
                info.options,
                info.func,
                info.numTx,
                info.numRx,
                info.romH,
                info.romL,
                info.pathH,
                info.pathL
            ];
            console.log('romH',info.romH,'romL',info.romL);

            // perform IO
            d.writeMany(addresses,values)
            .then(function(data){
                ioDeferred.resolve();
            },function(err){
                console.log('Error on config',err);
                ioDeferred.reject();
            });
            return ioDeferred.promise;
        };
    };
    var oneWireGo = function() {
        var ioDeferred = q.defer();
        d.qWrite('ONEWIRE_GO',1)
        .then(ioDeferred.resolve,ioDeferred.reject);
        return ioDeferred.promise;
    };
    var getWriteDataFunc = function(info) {
        return function() {
            var ioDeferred = q.defer();
            if(info.numTx > 0) {
                d.qWriteArray('ONEWIRE_DATA_TX',info.dataTx)
                .then(ioDeferred.resolve,ioDeferred.reject);
            } else {
                ioDeferred.resolve();
            }
            return ioDeferred.promise;
        };
    };
    var readInfoFunc = function() {
        var ioDeferred = q.defer();
        var addresses = [
            'ONEWIRE_ROM_BRANCHS_FOUND_H',
            'ONEWIRE_ROM_BRANCHS_FOUND_L',
            'ONEWIRE_SEARCH_RESULT_H',
            'ONEWIRE_SEARCH_RESULT_L'
        ];
        d.readMany(addresses)
        .then(
            function(data){
                ioDeferred.resolve(data);
            },
            function(err){
                console.log('Error',err);
                ioDeferred.reject();
            }
        );
        return ioDeferred.promise;
    };

    var configFunc = configOneWire(oneWireConfig);
    var writeDataFunc = getWriteDataFunc(oneWireConfig);
    var configHighResProbeFunc = configOneWire(highResProbeConfig);
    var writeHighResProbeDataFunc = getWriteDataFunc(highResProbeConfig);

    var dispErrors = function(err) {
        var errDeferred = q.defer();
        console.log('Error in 1-wire config',err);
        if(typeof(err) === 'number') {
            console.log(device_controller.ljm_driver.errToStrSync(err));
        } else {
            console.log('Typeof Err',typeof(err));
        }
        errDeferred.reject();
        return errDeferred.promise;
    };
    configFunc()
    .then(writeDataFunc,dispErrors)
    .then(oneWireGo,dispErrors)
    .then(readInfoFunc,dispErrors)
    .then(
        function(data) {
            var ioDeferred = q.defer();
            console.log('Success!',data);
            var ramId = []
            ramId[0] = dec2hex((data[2]>>16)&0xFFFF);
            ramId[1] = dec2hex(data[2]&0xFFFF);
            ramId[2] = dec2hex((data[3]>>16)&0xFFFF);
            ramId[3] = dec2hex(data[3]&0xFFFF);
            highResProbeConfig.romH = data[2];
            highResProbeConfig.romL = data[3];
            console.log('Ram Id:',ramId);
            ioDeferred.resolve();
            return ioDeferred.promise;
        },
        function(err) {
            var ioDeferred = q.defer();
            if(typeof(err) === 'number') {
                console.log(device_controller.ljm_driver.errToStrSync(err));
            } else {
                console.log('Typeof Err',typeof(err));
            }
            console.log('Failed',err);
            ioDeferred.resolve();
            return ioDeferred.promise;
        }
    )
    .then(configHighResProbeFunc,dispErrors)
    .then(writeHighResProbeDataFunc,dispErrors)
    .then(oneWireGo,dispErrors)
};

