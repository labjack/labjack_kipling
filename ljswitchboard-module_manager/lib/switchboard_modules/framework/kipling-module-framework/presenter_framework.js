
/* jshint undef: true, unused: true, undef: true */
/* jshint strict: false */
/* global global, require, console, handlebars, $ */
/* global showAlert, showCriticalAlert, showInfoMessage */
/* global MODULE_LOADER, MODULE_CHROME, TASK_LOADER */
/* global KEYBOARD_EVENT_HANDLER, module_manager */

// Flags
/* global DISABLE_AUTO_CLEAR_CONFIG_BINDINGS */

/**
 * Event driven framework for easy module construction.
 *
 * @author: Chris Johnson (LabJack, 2014)
 * @author: Sam Pottinger (LabJack, 2014)
**/

var EventEmitter = require('events').EventEmitter;
var util = require('util');
var async = require('async');
var dict = require('dict');
var q = require('q');
var sprintf = require('sprintf-js').sprintf;

const gui = global.lj_di_injector.get('gui');
const io_manager = global.io_manager;
const modbus_map = require('ljswitchboard-modbus_map').getConstants();

const fs_facade = require('fs_facade');
const ljmmm_parse = require('ljmmm-parse');

ljmmm_parse.expandLJMMMNameSync = function (name) {
    return ljmmm_parse.expandLJMMMEntrySync(
        {name: name, address: 0, type: 'FLOAT32'}
    ).map(function (entry) { return entry.name; });
};


var FADE_DURATION = 400;
var DEFAULT_REFRESH_RATE = 1000;
var CONFIGURING_DEVICE_TARGET = '#sd-ramework-configuring-device-display';
var DEVICE_VIEW_TARGET = '#device-view';
var CALLBACK_STRING_CONST = '-callback';

/**
 * Creates a new binding info object with the metadata copied from another.
 *
 * Creates a new binding info object, a structure with all of the information
 * necessary to bind a piece of the module GUI to a register / registers on
 * a LabJack device. This will copy the "metadata" from an existing binding
 * into a new one. Namely, it will re-use original's class, direction, and
 * event attributes but add in new binding and template values.
 *
 * @param {Object} orginal The object with the original binding information.
 * @param {String} binding The register name to bind the GUI element(s) to.
 *      If given an LJMMM string, will be exapnded and all registers named after
 *      the expansion will be bound to the GUI. Note that this expansion
 *      is executed later in the framework and only a single binding will be
 *      returned from this function.
 * @param {String} template The template for the GUI element ID to bind. This
 *      should coorespond to a HTML element IDs. May contain LJMMM and, if
 *      given an LJMMM string, will be expanded and matched to the registers
 *      listed in binding parameter. Note that this expansion
 *      is executed later in the framework and only a single binding will be
 *      returned from this function.
 * @return {Object} New binding.
**/
function cloneBindingInfo (original, bindingClass, binding, template) {
    var retVar = {};
    try{
        retVar = {
            bindingClass: bindingClass,
            template: template,
            binding: binding,
            direction: original.direction,
            event: original.event,
            format: original.format,
            customFormatFunc: original.customFormatFunc,
            currentDelay: original.currentDelay,
            iterationDelay: original.iterationDelay,
            execCallback: original.execCallback,
            callback: original.callback
        };
    } catch (err) {
        console.error('ERROR: ',err);
        retVar = {};
    }
    return retVar;
}


/**
 * Expands the LJMMM in the bindingClass, binding, and template names.
 *
 * Each binding info object has a binding attribute with the name of the
 * register on the device to bind from as well as a template attribute that
 * specifies the ID of the HTML element to bind to. So, binding AIN0 and
 * template analog-input-0 would bind the device register for AIN0 to
 * the HTML element with the id analog-input-0. This function will exapnd
 * LJMMM names found in either the template or binding attributes. Binding
 * AIN#(0:1) will exapnd to [AIN0, AIN1] and analog-input-#(0:1) will expand
 * to [analog-input-0, analog-input-1].
 *
 * @param {Object} bindingInfo The object with info about the binding to
 *      expand.
 * @return {Array} Array containing all of the bindings info objects that
 *      resulted from expanding the LJMMM found in original binding info
 *      object's binding and template attributes. If no LJMMM was in the
 *      original binding info object's binding or template attributes, an Array
 *      with a single binding info object will be returned.
**/
function expandBindingInfo (bindingInfo) {
    var expandedBindingClasses = ljmmm_parse.expandLJMMMName(bindingInfo.bindingClass);
    var expandedBindings = ljmmm_parse.expandLJMMMName(bindingInfo.binding);
    var expandedTemplates = ljmmm_parse.expandLJMMMName(bindingInfo.template);

    if (expandedBindings.length != expandedTemplates.length) {
        throw 'Unexpected ljmmm expansion mismatch.';
    }

    var newBindingsInfo = [];
    var numBindings = expandedBindings.length;
    for (var i=0; i<numBindings; i++) {
        var clone = cloneBindingInfo(
            bindingInfo,
            expandedBindingClasses[i],
            expandedBindings[i],
            expandedTemplates[i]
        );
        newBindingsInfo.push(clone);
    }

    return newBindingsInfo;
}

function cloneSetupBindingInfo (original, bindingClass, binding) {
    var retVar = {};
    try{
        retVar = {
            bindingClass: bindingClass,
            binding: binding,
            direction: original.direction,
            defaultVal: original.defaultVal,
            execCallback: original.execCallback,
            callback: original.callback
        };
    } catch (err) {
        console.error('ERROR: ',err);
        retVar = {};
    }
    return retVar;
}

function expandSetupBindingInfo (bindingInfo) {
    var expandedBindingClasses = ljmmm_parse.expandLJMMMName(bindingInfo.bindingClass);
    var expandedBindings = ljmmm_parse.expandLJMMMName(bindingInfo.binding);

    if (expandedBindingClasses.length != expandedBindings.length) {
        throw 'Unexpected ljmmm expansion mismatch.';
    }

    var newBindingsInfo = [];
    var numBindings = expandedBindings.length;

    for (var i=0; i<numBindings; i++) {
        var clone = cloneSetupBindingInfo(
            bindingInfo,
            expandedBindingClasses[i],
            expandedBindings[i]
        );
        newBindingsInfo.push(clone);
    }

    return newBindingsInfo;
}
/**
 * Force a redraw on the rendering engine.
**/
function runRedraw()
{
    document.body.style.display='none';
    var h = document.body.offsetHeight; // no need to store this anywhere, the reference is enough
    document.body.style.display='block';
}
function qRunRedraw() {
    var innerDeferred = q.defer();
    runRedraw();
    innerDeferred.resolve();
    return innerDeferred.promise;
}

/**
 * Function to render device error data
*/
function extrapolateDeviceErrorData(data) {
    var compiledMessage = '';

    // Get the error description (if it exists);
    var description = modbus_map.getErrorInfo(data.code).description;
    data.description = description;

    // Format the "caller" information
    var callInfo = [];
    var callKeys = Object.keys(data.data);
    callKeys.forEach(function(callKey) {
        callInfo.push(
            // '"' + callKey + '": ' + data.data[callKey].toString()
            callKey + ': ' + JSON.stringify(data.data[callKey])
        );
    });
    callInfo = callInfo.join(', ');
    data.callInfo = callInfo;
    return data;
}


/**
 * Object that manages the modules using the Kipling Module Framework.
**/
function Framework() {

    // List of events that the framework handels
    var eventListener = dict({
        verifyStartupData: null,
        onModuleLoaded: null,
        onDevicesSelected: null,
        onDeviceSelected: null,
        onDevicesConfigured: null,
        onDeviceConfigured: null,
        onTemplateLoaded: null,
        onTemplateDisplayed: null,
        onRegisterWrite: null,
        onRegisterWritten: null,
        onRefresh: null,
        onRefreshed: null,
        onCloseDevice: null,
        onUnloadModule: null,
        onLoadError: null,
        onWriteError: null,
        onRefreshError: null,
        onExecutionError: function (params) { throw params; }
    });
    this.eventListener = eventListener;

    // io_manager object references.
    var io_interface = io_manager.io_interface();
    var driver_controller = io_interface.getDriverController();
    var device_controller = io_interface.getDeviceController();

    this.driver_controller = driver_controller;
    this.device_controller = device_controller;

    var frameworkType = 'singleDevice';
    this.frameworkType = frameworkType;

    var deviceSelectionListenersAttached = false;
    var jquery = null;
    var refreshRate = DEFAULT_REFRESH_RATE;
    var pausedRefreshRate = 100;
    var errorRefreshRate = 1000; // Default to 1sec
    var connectedDevicesRefreshRate = 1000;
    var configControls = [];

    var bindings = dict({});
    var readBindings = dict({});
    var writeBindings = dict({});
    var smartBindings = dict({});

    var setupBindings = dict({});
    var readSetupBindings = dict({});
    var writeSetupBindings = dict({});

    var activeDevices = [];
    var selectedDevices = [];
    var activeDevice;
    var deviceErrorLog = {};
    var userViewFile = '';
    var moduleTemplateBindings = {};
    var moduleTemplateSetupBindings = {};
    var moduleJsonFiles = [];
    var moduleInfoObj;
    var moduleConstants;
    var module;
    var moduleData;
    var deviceErrorCompiledTemplate;
    var printableDeviceErrorCompiledTemplate;

    //Constants for auto-debugging on slow DAQ loops
    var iterationTime;
    var ljmDriverLogEnabled = false;

    // Framework Deletion constant
    var frameworkActive = true;
    this.frameworkActive = frameworkActive;

    this.deviceSelectionListenersAttached = deviceSelectionListenersAttached;
    this.jquery = jquery;
    this.refreshRate = refreshRate;
    this.pausedRefreshRate = pausedRefreshRate;
    this.errorRefreshRate = errorRefreshRate;
    this.connectedDevicesRefreshRate = connectedDevicesRefreshRate;
    this.configControls = configControls;

    this.bindings = bindings;
    this.readBindings = readBindings;
    this.writeBindings = writeBindings;
    this.smartBindings = smartBindings;

    this.setupBindings = setupBindings;
    this.readSetupBindings = readSetupBindings;
    this.writeSetupBindings = writeSetupBindings;

    this.activeDevices = activeDevices;
    this.activeDevice = activeDevice;
    this.selectedDevices = selectedDevices;
    this.deviceErrorLog = deviceErrorLog;
    this.runLoop = false;
    this.userViewFile = userViewFile;
    this.moduleTemplateBindings = moduleTemplateBindings;
    this.moduleTemplateSetupBindings = moduleTemplateSetupBindings;
    this.moduleName = '';
    this.moduleJsonFiles = moduleJsonFiles;
    this.moduleInfoObj = moduleInfoObj;
    this.moduleConstants = moduleConstants;
    this.module = module;
    this.moduleData = moduleData;
    this.flags = {
        'debug_startup': false,
    };
    this.deviceErrorCompiledTemplate = deviceErrorCompiledTemplate;
    this.printableDeviceErrorCompiledTemplate = printableDeviceErrorCompiledTemplate;
    this.uniqueTabID = '';

    //Constants for auto-debugging on slow DAQ loops
    var moduleStartTimeObj = new Date();
    this.iterationTime = iterationTime;
    this.iterationTime = moduleStartTimeObj.valueOf();
    this.ljmDriverLogEnabled = ljmDriverLogEnabled;
    this.sdFrameworkDebug = true;
    this.sdFrameworkDebugLoopErrors = true;
    this.sdFrameworkDebugTiming = true;
    this.sdFrameworkDebugDAQLoopMonitor = true;
    this.sdFrameworkDebugDAQLoopMonitorInfo = true;
    this.numContinuousRegLoopIterations = 0;
    this.loopErrorEncountered = false;
    this.loopErrors = [];
    this.daqLoopFinished = false;
    this.daqLoopMonitorTimer = null;
    this.daqLoopStatus = 'un-initialized';

    this.pauseDAQLoop = false;
    this.isDAQLoopPaused = false;
    this.hasNotifiedUserOfPause = false;

    this.allowModuleExecution = true;
    this.isModuleLoaded = false;
    this.isDeviceOpen = false;

    this.startupData = undefined;
    this.isStartupDataValid = false;

    this.DEBUG_STARTUP_DATA = false;
    var self = this;
    this.reportSyntaxError = function(location, err) {
        console.error('Error in:',location);
        console.error('Error obj',err,err.message);
        console.error('Error Str',err.toString());
        var stackSplit = err.stack.split('\n');
        var caller_line = err.stack.split('\n')[4];
        var index = caller_line.indexOf('at ');
        var clean = caller_line.slice(index+2, caller_line.length);
        // console.error('other output:',err.stack);
        console.error('stackSplit',stackSplit);
        // console.error('Stack Dump');
        // stackSplit.forEach(function(stackStr,i){
        //     var str = "";
        //     str += stackStr
        //     console.error(i.toString()+'.',str);
        // });
        // console.error('line:',err.line);
        // console.error('caller',caller_line);
        // console.error('index',index);
        // console.error('clean',clean);
        showCriticalAlert(err.toString());
    };
    this.enableLoopTimingAnalysis = function() {
        self.sdFrameworkDebugTiming = true;
    };
    this.disableLoopTimingAnalysis = function() {
        self.sdFrameworkDebugTiming = true;
    };
    this.enableLoopErrorAnalysis = function() {
        self.sdFrameworkDebugTiming = true;
    };
    this.disableLoopErrorAnalysis = function() {
        self.sdFrameworkDebugTiming = false;
    };
    this.enableLoopMonitorAnalysis = function() {
        self.sdFrameworkDebugDAQLoopMonitor = true;
    };
    this.disableLoopMonitorAnalysis = function() {
        self.sdFrameworkDebugDAQLoopMonitor = false;
    };
    this.print = function(functionName,info,errName) {
        if(typeof(errName) === 'undefined') {
            errName = 'sdFrameworkDebug';
        }
        if(self.sdFrameworkDebug) {
            var fnDefined = (typeof(functionName) !== 'undefined');
            var infoDefined = (typeof(info) !== 'undefined');
            if(fnDefined && infoDefined) {
                console.log(errName,self.moduleName,functionName,info);
            } else if (!fnDefined && infoDefined) {
                console.log(errName,self.moduleName,info);
            } else if (fnDefined && !infoDefined) {
                console.log(errName,self.moduleName,functionName);
            } else {
                console.log(errName,self.moduleName);
            }

        }
    };
    this.printDAQLoopInfo = function(functionName,info) {
        if(self.sdFrameworkDebugDAQLoopMonitor) {
            self.print(functionName,info,'sdFrameworkDebugDAQLoopInfo');
        }
    };
    this.printDAQLoopMonitorInfo = function(functionName,info) {
        if(self.sdFrameworkDebugDAQLoopMonitorInfo) {
            self.print(functionName,info,'sdFrameworkDebugDAQLoopMonitorInfo');
        }
    };
    this.printTimingInfo = function(functionName,info) {
        if(self.sdFrameworkDebugTiming) {
            self.print(functionName,info,'sdFrameworkDebugTiming');
        }
    };
    this.printLoopErrors = function(functionName,info) {
        if(self.sdFrameworkDebugLoopErrors) {
            self.print(functionName,info,'sdFrameworkDebugLoopErrors');
        }
    };
    this.setStartupMessage = function(message) {
        var idString = '#single-device-framework-loading-message';
        $(idString).text(message);
    };
    this._SetJQuery = function(newJQuery) {
        jquery = newJQuery;
        this.jquery = newJQuery;
    };

    this._SetSelectedDevices = function(newSelectedDevices) {
        // Initialize the selectedDevices arra
        selectedDevices = [];
        newSelectedDevices.forEach(function(device) {
            var savedAttributes = device.savedAttributes;
            if(savedAttributes['isSelected-CheckBox']) {
                selectedDevices.push(device);
            }
        });

        self.selectedDevices = selectedDevices;
    };
    var _SetSelectedDevices = this._SetSelectedDevices;

    var getConnectedDeviceInfoJquerySelector = function(serialNumber, extra) {
        var selector = [
            '.SERIAL_NUMBER_' + serialNumber.toString(),
        ].join(' ');
        if(extra) {
            if(Array.isArray(extra)) {
                var extraData = extra.join(' ');
                selector += ' '+ extraData;
            } else {
                selector += ' '+ extra;
            }
        }
        return selector;
    };
    var getDeviceErrorJquerySelector = function(serialNumber, extra) {
        var selector = getConnectedDeviceInfoJquerySelector(
            serialNumber,
            '.device-selector-table-status'
        );

        if(extra) {
            if(Array.isArray(extra)) {
                var extraData = extra.join(' ');
                selector += ' '+ extraData;
            } else {
                selector += ' '+ extra;
            }
        }
        return selector;
    };
    this.getDeviceErrorElements = function(serialNumber) {
        var elements = {};
        elements.statusIcon = undefined;

        var deviceInfoSelector = getConnectedDeviceInfoJquerySelector(
            serialNumber
        );
        var statusIconSelector = getConnectedDeviceInfoJquerySelector(
            serialNumber,
            ['.connection-status-icon']
        );
        var badgeSelector = getDeviceErrorJquerySelector(
            serialNumber,
            ['.module-chrome-tab-badge', '.badge']
        );
        var messagesSelector = getDeviceErrorJquerySelector(
            serialNumber,
            ['.dropdown-menu-errors']
        );
        var clearMessagesButtonSelector = getDeviceErrorJquerySelector(
            serialNumber,
            ['.clear-error-messages']
        );
        var copyMessagesButtonSelector = getDeviceErrorJquerySelector(
            serialNumber,
            ['.copy-to-clipboard']
        );
        var deviceVersionNumberSelector = getConnectedDeviceInfoJquerySelector(
            serialNumber,
            ['.device-firmware-version-holder']
        );
        var deviceNameSelector = getConnectedDeviceInfoJquerySelector(
            serialNumber,
            ['.device-name-holder']
        );


        elements.deviceInfo = $(deviceInfoSelector);
        elements.statusIcon = $(statusIconSelector);
        elements.badge = $(badgeSelector);
        elements.messagesSelector = $(messagesSelector);
        elements.clearErrorsButton = $(clearMessagesButtonSelector);
        elements.copyMessagesButtonSelector = $(copyMessagesButtonSelector);
        elements.firmwareVersion = $(deviceVersionNumberSelector);
        elements.deviceName = $(deviceNameSelector);

        return elements;
    };

    this.deviceErrorControls = {};
    var buildDeviceErrorControls = function(serialNumber) {
        var elements = self.getDeviceErrorElements(serialNumber);

        var isFlashing = false;
        var flashBadge = function() {
            if(!isFlashing) {
                isFlashing = true;
                elements.badge.addClass('badge-important');
                setTimeout(function() {
                    elements.badge.removeClass('badge-important');
                    isFlashing = false;
                }, 500);
            }
        };
        var saveMessage = function(message) {
            var currentMessages = elements.messagesSelector.find('.error-message');
            var numMessages = currentMessages.length;
            var numErrors = 0;
            var badgeText = elements.badge.text();
            if(isNaN(badgeText)) {
                numErrors = 0;
            } else {
                numErrors = parseInt(badgeText);
            }
            if(numErrors === 0) {
                // If there were n
                elements.messagesSelector.find('.error-message').remove();
                currentMessages = elements.messagesSelector.find('.error-message');
                numMessages = currentMessages.length;
            }

            var newItem = '<li class="error-message">' + message.toString() + '</li>';
            // if(numMessages < 2) {
            //     elements.messagesSelector.css('height','inherit');
            // } else {
            //     elements.messagesSelector.css('height','200px');
            // }
            if(numMessages < 5) {
                // Simply add the message to the top of the list
                elements.messagesSelector.prepend(newItem);
                numMessages += 1;
            } else {
                // Remove the bottom messages (fixes any previous over-5 limits)
                for(var i = 4; i < numMessages; i++) {
                    currentMessages.eq(i).remove();
                }
                // Add the new message
                elements.messagesSelector.prepend(newItem);
            }

            // Update the num-messages badge.
            numErrors += 1;
            var numText = numErrors.toString();
            elements.badge.text(numText);
            flashBadge();
        };
        var saveMessages = function(messages) {
            messages.forEach(saveMessage);
        };
        var clearMessages = function() {
            elements.messagesSelector.find('.error-message').remove();
            var newItem = '<li class="error-message">No Errors</li>';
            // elements.messagesSelector.css('height','inherit');
            elements.messagesSelector.prepend(newItem);
            elements.badge.text('0');
            self.device_controller.getDevice({'serialNumber': serialNumber})
            .then(function(device) {
                device.clearDeviceErrors();
            });
        };
        var copyErrorDataToClipboard = function(errorData) {
            try {
                var errorsArray = [];
                errorData.errors.forEach(function(err, i) {
                    var extrapolatedData = extrapolateDeviceErrorData(err);
                    extrapolatedData.errNum = i + 1;
                    errorsArray.push(extrapolatedData);
                });
                errorData.errors = errorsArray;
                var outputText = self.printableDeviceErrorCompiledTemplate(
                    errorData
                );
                var clipboard = gui.Clipboard.get();
                clipboard.set(outputText, 'text');
            } catch(err) {
                console.error('Error Copying data to clipboard', err);
            }
        };
        var controls = {
            'saveMessage': saveMessage,
            'saveMessages': saveMessages,
            'clearMessages': clearMessages,
            'setMessages': function(messages) {
                 // Empty the current list of messages
                clearMessages();

                // Set the number of events displayed on the badge
                var num = messages.length;
                var numText = num.toString();
                elements.badge.text(numText);

                var items = [];
                messages.forEach(function(message) {
                    items.push('<li class="error-message">' + message.toString() + '</li>');
                });

                items.forEach(function(item) {
                    elements.messagesSelector.prepend(item);
                });

                flashBadge();
            },
            'flashBadge': flashBadge,
            'updateConnectionStatus': function(isConnected) {
                if(isConnected) {
                    elements.deviceInfo.removeClass('text-error');
                    elements.statusIcon.hide();
                } else {
                    elements.deviceInfo.addClass('text-error');
                    elements.statusIcon.show();
                }
            },
            'updateSharingStatus': function(isShared, data) {
                console.log('in presenter_framework updateSharingStatus', isShared, data);
                var pt = data.attrs.productType;
                var sn = data.attrs.serialNumber.toString();
                var appName = data.attrs.sharedAppName;
                var isConnected = data.attrs.isConnected;
                var msg = '';
                if(isShared) {
                    msg = 'The ' + pt + ' with the SN: ' + sn;
                    msg += ' has been opened in ' + appName +'.';
                    // if(isConnected) {
                    msg += '  Please exit ' + appName + ' to continue using the device.';
                    // }
                } else {
                    msg += appName + ' has been closed and the ' + pt;
                    msg += ' with the SN: ' + sn + ' has been re-opened in Kipling';
                }
                showInfoMessage(msg);
            },
            'copyErrors': function() {
                self.device_controller.getDevice({'serialNumber': serialNumber})
                .then(function(device) {
                    device.getLatestDeviceErrors()
                    .then(copyErrorDataToClipboard);
                });
            },
            'setDeviceFirmwareVersion': function(newVersion) {
                elements.firmwareVersion.text(newVersion);
                elements.firmwareVersion.attr(
                    'title',
                    'Device Name (' + newVersion + ')'
                );
            },
            'setDeviceName': function(newName) {
                elements.deviceName.text(newName);
                elements.deviceName.attr(
                    'title',
                    'Device Name (' + newName + ')'
                );
            },
            'elements': elements
        };
        self.deviceErrorControls[serialNumber] = controls;
    };

    function deviceReleasedEventListener(data) {
        // Device has been shared to an external application.
        console.warn('in deviceReleasedEventListener', data);
        self.emit('FRAMEWORK_HANDLED_DEVICE_RELEASED', data);
        if(data.attrs.serialNumber) {
            var sn = data.attrs.serialNumber;
            if(self.deviceErrorControls[sn]) {
                // Indicate that the device is no longer connected
                self.deviceErrorControls[sn].updateSharingStatus(true, data);
            }
        }
    }
    function deviceAcquiredEventListener(data) {
        // Device released from the external application.
        console.warn('in deviceAcquiredEventListener', data);
        self.emit('FRAMEWORK_HANDLED_DEVICE_ACQUIRED', data);
        if(data.attrs.serialNumber) {
            var sn = data.attrs.serialNumber;
            if(self.deviceErrorControls[sn]) {
                // Indicate that the device is no longer connected
                self.deviceErrorControls[sn].updateSharingStatus(false, data);
            }
        }
    }
    var deviceDisconnectedEventListener = function(data) {
        // console.warn('Device Disconnected', data);
        self.emit('FRAMEWORK_HANDLED_DEVICE_DISCONNECTED', data);
        if(data.serialNumber) {
            var sn = data.serialNumber;
            if(self.deviceErrorControls[sn]) {
                // Indicate that the device is no longer connected
                self.deviceErrorControls[sn].updateConnectionStatus(false);
            }
        }
    };
    var deviceReconnectedEventListener = function(data) {
        // console.warn('Device Reconnected', data);
        self.emit('FRAMEWORK_HANDLED_DEVICE_RECONNECTED', data);
        if(data.serialNumber) {
            var sn = data.serialNumber;
            if(self.deviceErrorControls[sn]) {
                // Indicate that the device is connected
                self.deviceErrorControls[sn].updateConnectionStatus(true);
            }
        }
    };

    var deviceErrorEventListener = function(data) {
        // console.warn('Device Error', data);
        try {
            self.emit('FRAMEWORK_HANDLED_DEVICE_ERROR', data);
            if(data.deviceInfo) {
                var sn = data.deviceInfo.serialNumber;
                if(self.deviceErrorControls[sn]) {
                    // Expand on & compile the error message data
                    var compiledMessage = self.deviceErrorCompiledTemplate(
                        extrapolateDeviceErrorData(data)
                    );
                    // Display the error message
                    self.deviceErrorControls[sn].saveMessage(compiledMessage);
                }
            }
        } catch(err) {
            console.error('Error Handling Error', err);
        }
    };
    var deviceReconnectingEventListener = function(data) {
        // console.warn('Device Reconnecting', data);
        try {
            if(data.serialNumber) {
                var sn = data.serialNumber;
                if(self.deviceErrorControls[sn]) {
                    // Flash the device error badge
                    // console.log('Flashing badge');
                    self.deviceErrorControls[sn].flashBadge();
                }
            }
        } catch(err) {
            console.error('Error Handling Reconnecting message', err);
        }
    };
    var deviceAttributesChangedEventListener = function(data) {
        try {
            console.log('in DEVICE_ATTRIBUTES_CHANGED event', data);
            if(data.serialNumber) {
                var sn = data.serialNumber;
                if(self.deviceErrorControls[sn]) {
                    // Update the displayed device name
                    var newName = data.DEVICE_NAME_DEFAULT;
                    self.deviceErrorControls[sn].setDeviceName(newName);

                    // Update the displayed firmware version
                    var newFirmwareVersion = data.FIRMWARE_VERSION;
                    self.deviceErrorControls[sn].setDeviceFirmwareVersion(
                        newFirmwareVersion
                    );
                }
            }

            // Relay-information to the device_updater_service
            var device_updater_service = TASK_LOADER.tasks.device_updater_service;
            var deviceUpdaterService = device_updater_service.deviceUpdaterService;
            var newData = self.activeDevices.map(function(dev) {
                return dev.savedAttributes;
            });
            deviceUpdaterService.updatedDeviceList(newData);
        } catch(err) {
            console.error('Error Handling Device Attributes changed message', err);
        }
    };
    var attachDeviceStatusListeners = function() {
        self.activeDevices.forEach(function(device) {
            device.on('DEVICE_DISCONNECTED', deviceDisconnectedEventListener);
            device.on('DEVICE_RECONNECTED', deviceReconnectedEventListener);
            device.on('DEVICE_ERROR', deviceErrorEventListener);
            device.on('DEVICE_RECONNECTING', deviceReconnectingEventListener);
            device.on('DEVICE_ATTRIBUTES_CHANGED', deviceAttributesChangedEventListener);
            device.on('DEVICE_RELEASED', deviceReleasedEventListener);
            device.on('DEVICE_ACQUIRED', deviceAcquiredEventListener);

            // Attach to the "clear errors" button handlers
            var sn = device.savedAttributes.serialNumber;
            self.deviceErrorControls[sn].elements.clearErrorsButton.on(
                'click',
                self.deviceErrorControls[sn].clearMessages
            );

            // Attach to the "copy errors" button handlers
            self.deviceErrorControls[sn].elements.copyMessagesButtonSelector.on(
                'click',
                self.deviceErrorControls[sn].copyErrors
            );
        });
    };
    var detachDeviceStatusListeners = function() {
        self.activeDevices.forEach(function(device) {
            device.removeListener('DEVICE_DISCONNECTED', deviceDisconnectedEventListener);
            device.removeListener('DEVICE_RECONNECTED', deviceReconnectedEventListener);
            device.removeListener('DEVICE_ERROR', deviceErrorEventListener);
            device.removeListener('DEVICE_RECONNECTING', deviceReconnectingEventListener);
            device.removeListener('DEVICE_ATTRIBUTES_CHANGED', deviceAttributesChangedEventListener);
            device.removeListener('DEVICE_RELEASED', deviceReleasedEventListener);
            device.removeListener('DEVICE_ACQUIRED', deviceAcquiredEventListener);

            // Turn off "clear errors" button click handlers
            var sn = device.savedAttributes.serialNumber;
            self.deviceErrorControls[sn].elements.copyMessagesButtonSelector.off(
                'click'
            );
            self.deviceErrorControls[sn].elements.clearErrorsButton.off(
                'click'
            );
        });
    };
    this._SetActiveDevices = function(newActiveDevices) {
        activeDevices = newActiveDevices;
        self.activeDevices = newActiveDevices;


        // Initialize a new error-log
        self.deviceErrorLog = {};
        newActiveDevices.forEach(function(device) {
            var sn = device.savedAttributes.serialNumber;

            var controls = buildDeviceErrorControls(sn);
            // Initialize the error log
            var messages = [];
            if(!device.savedAttributes.isConnected) {
                messages.push('Device Not Connected');
            }
            self.deviceErrorLog[sn] = {
                'messages': messages,
                'isConnected': device.savedAttributes.isConnected,
            };
        });

        // Attach Device Listeners
        attachDeviceStatusListeners();
    };
    var _SetActiveDevices = this._SetActiveDevices;

    this.getActiveDevices = function() {
        return self.activeDevices;
    };
    var getActiveDevices = this.getActiveDevices;

    this._SetActiveDevice = function(newActiveDevice) {
        activeDevice = newActiveDevice;
        self.activeDevice = newActiveDevice;
    };
    var _SetActiveDevice = this._SetActiveDevice;

    this.getActiveDevice = function() {
        return self.activeDevice;
    };
    var getActiveDevice = this.getActiveDevice;



    var updateDisplayedDeviceErrors = function() {
        var serialNumbers = Object.keys(self.deviceErrorLog);
        serialNumbers.forEach(function(serialNumber) {

        });
    };
    this.reportDeviceError = function(message, serialNumber) {
        if(typeof(serialNumber) === 'undefined') {
            var activeDevice = getActiveDevice();
            serialNumber = activeDevice.savedAttributes.serialNumber;
        }

        if(self.deviceErrorLog[serialNumber]) {
            self.deviceErrorLog[serialNumber].push(message);
        } else {
            var errStr = [
                '<h3>Reporting Device Error:</h3>',
                '<ul>',
                '<li>Serial Number: ' + JSON.stringify(serialNumber) + '</li>',
                '<li>Message: ' + JSON.stringify(message) + '</li>',
                '</ul>',
            ].join('');
            console.warn(
                'Showing Error (device sn not valid)',
                message,
                serialNumber
            );
            showAlert(errStr);
        }
    };
    this.reportError = function(data) {
        try {
            // determine where the error should be displayed
            if(data.message) {
                // If the data object has a serial number then it is a device error
                if(data.serialNumber) {
                    self.reportDeviceError(data.message, data.serialNumber);
                } else {
                    console.warn('Showing Error', data, data.message);
                    showAlert(data.message);
                }
            } else {
                console.warn('Showing Error', data);
                var errorStr = '<h3>Program Error:</h3><pre>';
                errorStr += JSON.stringify(data, null, '2');
                errorStr += '</pre>';
                showAlert(errorStr);
            }
        } catch(err) {
            console.error('Error reporting error', err, err.stack);
            showCriticalAlert('Error reporting error (presenter_framework.js)');
        }
    };
    /**
     * Set the callback that should be called for an event.
     *
     * Indicate which function (callback) should be called when the framework
     * encounters each event. Note that previous event listeners for that event
     * will be cleared by calling this.
     *
     * @param {String} name The name of the event to register a callback for.
     * @param {function} listener The function to call when that event is
     *      encountered. Should take a single argument: an object whose
     *      attributes are parameters supplied to the event.
    **/
    this.on = function (name, listener) {
        if (!eventListener.has(name)) {
            self.fire(
                'onLoadError',
                [ 'Config binding missing direction' ],
                function (shouldContinue) { self.runLoop = shouldContinue; }
            );
            return;
        }
        eventListener.set(name, listener);
    };
    var on = this.on;

    /**
     * Force-cause an event to occur through the framework.
     *
     * @param {String} name The name of the event to fire.
     * @param {Object} params Object whose attributes should be used as
     *      parameters for the event.
     * @param {function} onErr Function to call if an error was encountered
     *      while running event listeneres. Optional.
     * @param {function} onSuccess Function to call after the event listeners
     *      finish running. Optional.
    **/
    this.fire = function (name, params, onErr, onSuccess) {
        var noop = function () {};

        if (!params)
            params = [];

        if (!onSuccess)
            onSuccess = noop;

        if (!onErr)
            onErr = noop;

        if (!eventListener.has(name)) {
            onSuccess();
            return;
        }
        var isValidCall = true;
        if (self.moduleName !== self.getActiveTabID()) {
            console.error('Should Skip Call',name, self.moduleName, self.getActiveTabID());
            self.allowModuleExecution = false;
        }
        var listener = eventListener.get(name);
        var isValidListener = false;
        if(listener !== null) {
            isValidListener = true;
        }

        if (isValidCall && isValidListener) {
            var passParams = [];
            passParams.push(self);
            passParams.push.apply(passParams, params);
            passParams.push(onErr);
            passParams.push(onSuccess);
            try{
                if(self.flags.debug_runtime) {
                    // console.info('executing module function', name);
                }
                listener.apply(null, passParams);
            } catch (err) {
                if(self.flags.debug_startup) {
                    console.error('error executing module function', name);
                }
                console.error(
                    'Error firing: '+name,
                    'moduleData: ', self.moduleData,
                    'typeof sdModule: ', typeof(sdModule),
                    'typeof sdFramework: ', typeof(sdFramework),
                    'frameworkActive', self.frameworkActive,
                    ' Error caught is: ',err.name,
                    'message: ',err.message,err.stack);
                try{
                    var isHandled = false;
                    if (err.name === 'Driver Operation Error') {
                        isHandled = self.manageLJMError(err.message);
                    }
                    onErr(err);
                } catch (newError) {
                    // Not an LJM error...
                    showCriticalAlert(
                        'Error Firing: '+name+
                        '<br>--Error Type: '+err.name+
                        '<br>--Error Message: '+err.message);
                    onErr(err);
                }
            }
        } else {
            onSuccess();
        }
    };
    var fire = this.fire;

    /**
     * Function deletes various 'window.' objects that need to be removed in
     * order for module to behave properly when switching tabs.
     * @param  {Array} moduleLibraries Array of string "window.xxx" calls that
     *      need to be deleted, (delete window.xxx) when a module gets unloaded.
     */
    this.unloadModuleLibraries = function(moduleLibraries) {
        if(moduleLibraries !== undefined) {
            moduleLibraries.forEach(function(element, index, array){
                var delStr = 'delete ' + element;
                try{
                    eval(delStr);
                } catch(err) {
                    console.error('presenter_framework Error Deleting Element',element);
                }
            });
        } else {
            // console.warn('presenter_framework, "third_party_code_unload" undefined');
        }
    };
    var unloadModuleLibraries = this.unloadModuleLibraries;

    this.getExitFuncs = function(curState) {
        var exitPath = q.defer();
        var exitErrHandle = function() {
            var exitDeferred = q.defer();
            exitDeferred.resolve();
            return exitDeferred.promise;
        };
        if(curState === 'onModuleLoaded') {
            self.qExecOnUnloadModule()
            .then(exitPath.resolve,exitPath.reject);
        } else if(curState === 'onDeviceSelected') {
            self.qExecOnCloseDevice()
            .then(self.qExecOnUnloadModule,self.qExecOnUnloadModule)
            .then(exitPath.resolve,exitPath.reject);
        } else if(curState === 'onLoadError') {
            exitPath.reject();
        } else {
            self.qExecOnCloseDevice()
            .then(self.qExecOnUnloadModule,self.qExecOnUnloadModule)
            .then(exitPath.resolve,exitPath.reject);
        }

        return exitPath.promise;
    };
    var getExitFuncs = this.getExitFuncs;

    this.convertBindingsToDict = function() {
        return self.moduleTemplateBindings;
    };
    var convertBindingsToDict = this.convertBindingsToDict;

    this.qHideUserTemplate = function() {
        var innerDeferred = q.defer();
        self.jquery.fadeOut(
            DEVICE_VIEW_TARGET,
            FADE_DURATION,
            function(){
                self.jquery.fadeIn(
                    CONFIGURING_DEVICE_TARGET,
                    FADE_DURATION,
                    innerDeferred.resolve
                );
            }
        );
        return innerDeferred.promise;
    };
    var qHideUserTemplate = this.qHideUserTemplate;

    this.qShowUserTemplate = function() {
        var innerDeferred = q.defer();
        self.jquery.fadeOut(
            CONFIGURING_DEVICE_TARGET,
            FADE_DURATION,
            function(){
                self.jquery.fadeIn(
                    DEVICE_VIEW_TARGET,
                    FADE_DURATION,
                    innerDeferred.resolve
                );
            }
        );
        return innerDeferred.promise;
    };
    var qShowUserTemplate = this.qShowUserTemplate;

    this.saveModuleStartupDataReference = function(newStartupData) {
        var defered = q.defer();

        self.saveStartupDataReference(newStartupData);

        defered.resolve();
        return defered.promise;
    };
    this.resetModuleStartupData = function() {
        var defered = q.defer();
        var moduleName = self.currentModuleName;

        if(self.DEBUG_STARTUP_DATA) {
            console.info('presenter_framework: resetModuleStartupData');
        }
        module_manager.getModulesList()
        .then(function(moduleSections) {
            var humanName = '';
            var i,j;
            var moduleSectionKeys = Object.keys(moduleSections);
            for(i = 0; i < moduleSectionKeys.length; i++) {
                var moduleSectionKey = moduleSectionKeys[i];
                var moduleSection = moduleSections[moduleSectionKey];
                for(j = 0; j < moduleSection.length; j++) {
                    var moduleInfo = moduleSection[j];
                    if(moduleInfo.name === moduleName) {
                        humanName = moduleInfo.humanName;
                        break;
                    }
                }
            }
            if(humanName) {
                showInfoMessage('Resetting persistent data for: ' + humanName);
            } else {
                showAlert('Resetting persistent data for: ' + moduleName);
            }
        });
        module_manager.revertModuleStartupData(moduleName)
        .then(module_manager.getModuleStartupData)
        .then(self.saveModuleStartupDataReference)
        .then(defered.resolve, defered.reject);

        return defered.promise;
    };
    this.saveModuleStartupData = function(callerInfo) {
        var defered = q.defer();
        var moduleName = self.currentModuleName;
        var dataToSave;
        var isDataValid = self.isStartupDataValid;
        var saveReasons = [];

        var saveData = false;
        try {
            if(isDataValid) {
                dataToSave = JSON.parse(JSON.stringify(self.startupData));
                saveData = true;
                saveReasons.push('Data is valid');
            }
        } catch(err) {
            console.error('presenter_framework: Failed to save moduleStartupData');
            saveReasons.push('Error while parsing data');
        }

        try {
            if(saveData) {
                var keys = Object.keys(dataToSave);
                if(keys.length > 0) {
                    saveReasons.push('Data has keys');
                    saveData = true;
                } else {
                    saveReasons.push('Data does not have any keys');
                    saveData = false;
                }
            }
        } catch(err) {
            saveData = false;
        }

        if(saveData) {
            if(self.DEBUG_STARTUP_DATA) {
                console.info(
                    'presenter_framework: saving startupData:',
                    callerInfo,
                    moduleName,
                    saveReasons
                );
            }
            var innerSaveStartupData = function() {
                return module_manager.saveModuleStartupData(
                    moduleName,
                    dataToSave
                );
            };

            var reportSavedStartupData = function() {
                var defered = q.defer();
                defered.resolve();
                return defered.promise;
            };

            self.qExecVerifyStartupData('saveStartupData')
            .then(innerSaveStartupData)
            .then(reportSavedStartupData)
            .then(defered.resolve, defered.reject);
        } else {
            if(self.DEBUG_STARTUP_DATA) {
                console.info(
                    'presenter_framework: not saving startupData',
                    callerInfo,
                    moduleName,
                    saveReasons
                );
            }
            defered.resolve();
        }

        return defered.promise;
    };
    this.qExecVerifyStartupData = function(callerData) {
        var innerDeferred = q.defer();
        if(self.DEBUG_STARTUP_DATA) {
            console.info(
                'presenter_framework: in verifyStartupData',
                callerData,
                self.currentModuleName
            );
        }

        var finishWithError = function(errData) {
            console.warn('presenter_framework: verifyStartupData, finishWithError', errData);
            self.resetModuleStartupData()
            .then(innerDeferred.resolve, innerDeferred.reject);
        };
        var finishSuccessfully = function() {
            innerDeferred.resolve();
        };

        if(self.allowModuleExecution) {
            self.fire(
                'verifyStartupData',
                [self.startupData],
                finishWithError,
                finishSuccessfully
            );
        } else {
            console.log('allowModuleExecution == false', self.allowModuleExecution);
            self.getExitFuncs('onModuleLoaded')
            .then(innerDeferred.reject,innerDeferred.reject);
        }
        return innerDeferred.promise;
    };
    this.initializeStartupData = function() {
        var defered = q.defer();
        var moduleName = self.currentModuleName;
        var executeVerifyStartupData = function() {
            return self.qExecVerifyStartupData('initializeStartupData');
        };

        module_manager.getModuleStartupData(moduleName)
        .then(self.saveModuleStartupDataReference)
        .then(executeVerifyStartupData)
        .then(defered.resolve, defered.reject);
        return defered.promise;
    };
    this.qExecOnModuleLoaded = function() {
        var innerDeferred = q.defer();
        if(self.allowModuleExecution) {
            //Save module info if not already defined
            // if(self.moduleInfoObj === undefined) {
            //     self.moduleInfoObj = LOADED_MODULE_INFO_OBJECT;
            //     moduleInfoObj = LOADED_MODULE_INFO_OBJECT;
            // }
            //Fire onModuleLoaded function
            self.fire(
                'onModuleLoaded',
                [],
                innerDeferred.reject,
                function() {
                    self.isModuleLoaded = true;
                    innerDeferred.resolve();
                }
            );
        } else {
            self.getExitFuncs('onModuleLoaded')
            .then(innerDeferred.reject,innerDeferred.reject);
        }
        return innerDeferred.promise;
    };
    var qExecOnModuleLoaded = this.qExecOnModuleLoaded;

    this.qExecOnDeviceSelected = function() {
        var innerDeferred = q.defer();

        if(self.allowModuleExecution) {
            self.fire(
                'onDeviceSelected',
                [self.smartGetSelectedDevices()],
                innerDeferred.reject,
                function() {
                    self.isDeviceOpen = true;
                    innerDeferred.resolve();
                }
            );
        } else {
            self.getExitFuncs('onDeviceSelected')
            .then(innerDeferred.reject,innerDeferred.reject);
        }
        return innerDeferred.promise;
    };
    var qExecOnDeviceSelected = this.qExecOnDeviceSelected;

    this.qExecOnDeviceConfigured = function(data) {
        var innerDeferred = q.defer();

        if(self.allowModuleExecution) {
            self.fire(
                'onDeviceConfigured',
                [self.smartGetSelectedDevices(), data],
                innerDeferred.reject,
                innerDeferred.resolve
            );
        } else {
            self.getExitFuncs('onDeviceConfigured')
            .then(innerDeferred.reject,innerDeferred.reject);
        }
        return innerDeferred.promise;
    };
    var qExecOnDeviceConfigured = this.qExecOnDeviceConfigured;

    this.qExecOnTemplateDisplayed = function() {
        var innerDeferred = q.defer();

        if(self.allowModuleExecution) {
            var rejectFunc = function(data) {
                innerDeferred.reject(data);
            };
            var resolveFunc = function(data) {
                KEYBOARD_EVENT_HANDLER.initInputListeners();
                innerDeferred.resolve(data);
            };
            try{
                self.fire(
                    'onTemplateDisplayed',
                    [],
                    rejectFunc,
                    resolveFunc
                );
            } catch (err) {
                if(err.name === 'SyntaxError') {
                    console.error('Syntax Error captured');
                }
                console.error('Error caught in qExecOnTemplateDisplayed',err);
            }
        } else {
            self.getExitFuncs('onTemplateDisplayed')
            .then(innerDeferred.reject,innerDeferred.reject);
        }
        return innerDeferred.promise;
    };
    var qExecOnTemplateDisplayed = this.qExecOnTemplateDisplayed;

    this.qExecOnTemplateLoaded = function() {
        var innerDeferred = q.defer();

        if(self.allowModuleExecution) {
            var rejectFunc = function(data) {
                innerDeferred.reject(data);
            };
            var resolveFunc = function(data) {
                innerDeferred.resolve(data);
            };
            try{
                self.fire(
                    'onTemplateLoaded',
                    [],
                    rejectFunc,
                    resolveFunc
                );
            } catch (err) {
                if(err.name === 'SyntaxError') {
                    console.error('Syntax Error captured');
                }
                console.error('Error caught in qExecOnTemplateLoaded',err);
            }
        } else {
             self.getExitFuncs('onTemplateLoaded')
            .then(innerDeferred.reject,innerDeferred.reject);
        }
        return innerDeferred.promise;
    };
    var qExecOnTemplateLoaded = this.qExecOnTemplateLoaded;

    this.qExecOnCloseDevice = function() {
        var device = self.smartGetSelectedDevices();
        // Detach device event emitters
        detachDeviceStatusListeners();
        var innerDeferred = q.defer();

        var finishSuccess = function(data) {
            var continueExec = function() {
                innerDeferred.resolve(data);
            };

            self.saveModuleStartupData('qExecOnCloseDevice-suc')
            .then(continueExec, continueExec);
        };
        var finishError = function(data) {
            var continueExec = function() {
                innerDeferred.reject(data);
            };

            self.saveModuleStartupData('qExecOnCloseDevice-err')
            .then(continueExec, continueExec);
        };
        if(self.isDeviceOpen) {
            if(self.allowModuleExecution) {
                self.fire(
                    'onCloseDevice',
                    [device],
                    finishError,
                    finishSuccess
                );
            } else {
                var finishExecution = function() {
                    self.isDeviceOpen = false;
                    self.qExecOnUnloadModule()
                    .then(finishError,finishError);
                };
                self.fire(
                    'onCloseDevice',
                    [device],
                    finishExecution,
                    finishExecution
                );
            }
        } else {
            console.error('in qExecOnCloseDevice, device is not open');
            innerDeferred.reject();
        }
        return innerDeferred.promise;
    };
    var qExecOnCloseDevice = this.qExecOnCloseDevice;

    this.qExecOnLoadError = function(err) {
        var innerDeferred = q.defer();

        if(self.allowModuleExecution) {
            self.fire(
                'onLoadError',
                [
                    [ err ],
                    function (shouldContinue) {
                        self.runLoop = shouldContinue;
                        innerDeferred.resolve();
                    }
                ]
            );
        } else {
             self.getExitFuncs('onLoadError')
            .then(innerDeferred.reject,innerDeferred.reject);
        }
        return innerDeferred.promise;
    };
    var qExecOnLoadError = this.qExecOnLoadError;

    this.qExecOnUnloadModule = function() {
        var innerDeferred = q.defer();

        if(self.isModuleLoaded) {
            var finishError = function(data) {
                var continueExec = function() {
                    innerDeferred.reject(data);
                };

                self.saveModuleStartupData('qExecOnUnloadModule-err')
                .then(continueExec, continueExec);
            };

            //Halt the daq loop
            self.stopLoop();

            //clean up module's third party libraries
            self.unloadModuleLibraries(self.moduleInfoObj.third_party_code_unload);

            // Ensure the pgm exit listener has been removed.
            removeProgramExitListener();

            // clear any "ModuleWindowResizeListeners" window resize listeners
            // clearModuleWindowResizeListners();

            //If LJM's debug log was enabled, disable it
            if(self.ljmDriverLogEnabled) {
                console.info('disabling LJM-log');
                console.info('File:',self.ljmDriver.readLibrarySync('LJM_DEBUG_LOG_FILE'));
                self.ljmDriver.writeLibrarySync('LJM_DEBUG_LOG_MODE',1);
                self.ljmDriver.writeLibrarySync('LJM_DEBUG_LOG_LEVEL',10);
                self.ljmDriverLogEnabled = false;
            }

            //Inform the module that it has been unloaded.
            self.fire(
                'onUnloadModule',
                [],
                finishError,
                function() {
                    // Detach Device Listeners
                    detachDeviceStatusListeners();

                    self.isModuleLoaded = false;
                    self.saveModuleStartupData('qExecOnUnloadModule-suc')
                    .then(innerDeferred.resolve, innerDeferred.resolve);
                }
            );
        } else {
            innerDeferred.resolve();
        }
        return innerDeferred.promise;
    };
    var qExecOnUnloadModule = this.qExecOnUnloadModule;

    this.qRenderModuleTemplate = function() {
        var innerDeferred = q.defer();
        self.setDeviceView(
            self.userViewFile,
            self.moduleJsonFiles,
            self.convertBindingsToDict()
        )
        .then(innerDeferred.resolve, innerDeferred.reject);
        return innerDeferred.promise;
    };
    var qRenderModuleTemplate = this.qRenderModuleTemplate;

    var innerUpdateActiveDevice = function(data) {
        var defered = q.defer();
        device_controller.getSelectedDevice()
        .then(function(activeDevice) {
            data.activeDevice = activeDevice;
            defered.resolve(data);
        });
        return defered.promise;
    };
    var innerGetDeviceListing = function(data) {
        var defered = q.defer();
        var filters;
        if(self.moduleData.data.supportedDevices) {
            filters = self.moduleData.data.supportedDevices;
        }
        device_controller.getDeviceListing(filters)
        .then(function(deviceListing) {
            data.deviceListing = deviceListing;
            defered.resolve(data);
        });
        return defered.promise;
    };
    var innerGetDeviceObjects = function(data) {
        var defered = q.defer();
        var filters;
        if(self.moduleData.data.supportedDevices) {
            filters = self.moduleData.data.supportedDevices;
        }

        device_controller.getDevices(filters)
        .then(function(devices) {
            data.activeDevices = devices;
            defered.resolve(data);
        });
        return defered.promise;
    };
    this.getDeviceSelectorClass = function() {
        var key = '.device-selection-radio';
        if(self.frameworkType === 'singleDevice') {
            key = '.device-selection-radio';
        } else if(self.frameworkType === 'multipleDevices') {
            key = '.device-selection-checkbox';
        }
        return key;
    };
    var updateSelectedDeviceList = function(data) {
        var defered = q.defer();

        // Save device references
        self._SetActiveDevices(data.activeDevices);
        self._SetActiveDevice(data.activeDevice);
        self._SetSelectedDevices(data.activeDevices);

        var devs = self.jquery.get(self.getDeviceSelectorClass());
        // console.log('What things are chedked?');
        // for(var i = 0; i < devs.length; i++) {
        //     console.log('sn',devs.eq(i).prop('value'),devs.eq(i).prop('checked'));
        // }

        var foundActiveDevice = false;
        var activeDevices = self.getSelectedDevices();
        activeDevices.forEach(function(activeDev) {
            var activeSN = activeDev.savedAttributes.serialNumber;
            for(var i = 0; i < devs.length; i++) {
                if (activeSN == devs.eq(i).val()) {
                    devs.eq(i).prop('checked', true);
                    foundActiveDevice = true;
                }
            }
        });

        // Sloppy code warning...
        function finishFunc() {
            var selectorKey = '.device-selector-table-device-selector .radio';
            if(self.frameworkType === 'multipleDevices') {
                selectorKey = '.device-selector-table-device-selector .checkbox';
            }
            var selectors = self.jquery.get(selectorKey);
            selectors.show();

            defered.resolve();
        }
        function repeatCallOnSuccess(data) {
            console.log('Repeating Execution of getting active device info...');
            self.qUpdateActiveDevice()
            .then(finishFunc,finishFunc);
        }
        function onSuccess(data) {
            finishFunc();
        }
        function onError(err) {
            finishFunc();
        }
        // End of sloppy code warning...
        if(!foundActiveDevice) {
            // Did not find an active device
            if(self.frameworkType === 'multipleDevices') {
                console.warn('Not sure what to do... presenter_framework.js - updateSelectedDeviceList');
                onSuccess();
            } else {
                var activeDev = devs.eq(0);
                // Marking first found device
                var activeDevSN = 0;
                try {
                    activeDevSN = activeDev.prop('value');
                } catch(err) {
                    activeDevSN = 0;
                    console.error('ERROR converting SN string to a number', err);
                }
                // console.log('SN:', activeDevSN, 'snType', typeof(activeDevSN));

                // Populate radio box with buble.
                activeDev.prop('checked', true);

                // Communicate with device_manager...?
                // device_controller.selectDevice(activeDevSN);
                getSmartSaveSelectedDevices(activeDevSN)().then(repeatCallOnSuccess,onError);
            }

        } else {
            onSuccess();
        }


        return defered.promise;
    };
    this.qUpdateActiveDevice = function() {
        var defered = q.defer();

        var data = {
            'activeDevice': undefined,      // is populated by func "innerUpdateActiveDevice".
            'deviceListing': undefined,     // is populated by func "innerGetDeviceListing".
            'activeDevices': undefined,     // is populated by func "innerGetDeviceObjects".
        };
        innerUpdateActiveDevice(data)
        .then(innerGetDeviceListing)
        .then(innerGetDeviceObjects)
        .then(updateSelectedDeviceList)     // Computes based on queried for objects.
        .then(defered.resolve, defered.reject);
        return defered.promise;
    };
    var qUpdateActiveDevice = this.qUpdateActiveDevice;

    /**
     * Set how frequently the framework should read from the device.
     *
     * @param {int} newRefreshRate The number of milliseconds between updates.
    **/
    this.setRefreshRate = function (newRefreshRate) {
        self.refreshRate = newRefreshRate;
    };
    var setRefreshRate = this.setRefreshRate;

    /**
     * Indicate which HTML controls should cause device configured to fire.
     *
     * Indicate which HTML controls (not bound through putConfigBinding) that
     * should cause a device configured event to be fired when they have an
     * event within the HTML view. This could, for example, be a button to
     * write values to a device.
     *
     * @param {Array} newConfigControls An array of Object where each element
     *      has an event attribute with the name of the event to listen for
     *      on the HTML element and a selector attribute which should be a
     *      jQuery selector for the HTML elements to bind the event listener
     *      to.
    **/
    this.setConfigControls = function (newConfigControls) {
        self.configControls = newConfigControls;
    };
    var setConfigControls = this.setConfigControls;

    this.qEstablishWriteBindings = function() {
        var innerDeferred = q.defer();
        self.establishWriteBindings(self.writeBindings);
        innerDeferred.resolve();
        return innerDeferred.promise;
    };
    var qEstablishWriteBindings = this.qEstablishWriteBindings;

    this.establishWriteBindings = function(bindings) {
        bindings.forEach(function(binding){
            self.establishWriteBinding(binding);
        });
    };
    var establishWriteBindings = this.establishWriteBindings;

    this.establishWriteBinding = function(binding) {
        // writeBindings.set(newBinding.template, newBinding);
        var jquerySelector = '#' + binding.template;
        jquery.unbind(jquerySelector,binding.event);
        jquery.bind(
            jquerySelector,
            binding.event,
            function (eventData) {
                self._writeToDevice(binding, eventData);
            }
        );
    };
    var establishWriteBinding = this.establishWriteBinding;
    /**
     * Register a new configuration binding.
     *
     * Register a new configuration binding that either cuases an HTML element
     * to act as a (frequently updated) display for the value of a register
     * or as an HTML element that allows the user to write the value of
     * a device register. This device binding info object should have
     * attributes:
     *
     * <ul>
     *   <li>{string} class: Description of what type of binding this is. Not
     *          used in this first release of this framework.</li>
     *   <li>{string} template: The ID of the HTML element to bind to. For
     *          example: ain-0-display or ain-#(0:1)-display.</li>
     *   <li>{string} binding: The name of the device register to bind to. For
     *          exmaple: AIN0 or AIN#(0:1).</li>
     *   <li>{string} direction: Either "read" for displaying a the value of a
     *          device register or "write" for having an HTML element set the
     *          value of a device register. May also be "hybrid" which will
     *          first read the current value of a register, display that, and
     *          then update the value of that register on subsequent updates
     *          from within the view.</li>
     *   <li>{string} event: The name of the event to bind to. Only required if
     *          write or hybrid. For example, "change" would cause the value to
     *          be written to the device each time an input box value is
     *          changed.</li>
     * </ul>
     *
     * Note that template and binding can contain LJMMM strings. If they do,
     * they will automagically be expanded and bound individually. So, template
     * of analog-#(0:1)-display and binding of AIN#(0:1) will bind
     * analog-0-display to AIN0 and analog-1-display to AIN1.
     *
     * @param {Object} newBinding The binding information object (as described
     *      above) that should be registered.
    **/
    this.putConfigBinding = function (newBinding) {
        var onErrorHandle = function (shouldContinue) {
            self.runLoop = shouldContinue;
        };

        // ------------------------------------
        // Begin checking for potential binding object related errors

        // if bindingClass isn't defined execute onLoadError
        if (newBinding.bindingClass === undefined) {
            self.fire(
                'onLoadError',
                [ 'Config binding missing bindingClass' ],
                onErrorHandle
            );
            return;
        }

        // if template isn't defined execute onLoadError
        if (newBinding.template === undefined) {
            self.fire(
                'onLoadError',
                [ 'Config binding missing template' ],
                onErrorHandle
            );
            return;
        }

        // if binding isn't defined execute onLoadError
        if (newBinding.binding === undefined) {
            self.fire(
                'onLoadError',
                [ 'Config binding missing binding' ],
                onErrorHandle
            );
            return;
        }

        // if direction isn't defined execute onLoadError
        if (newBinding.direction === undefined) {
            self.fire(
                'onLoadError',
                [ 'Config binding missing direction' ],
                onErrorHandle
            );
            return;
        }

        // if the displayType isn't defined then use the standard one.
        if (newBinding.displayType === undefined) {
            newBinding.displayType = 'standard';
        }

        // if iterationDelay isn't defined define it as 0
        if (newBinding.iterationDelay === undefined) {
            newBinding.iterationDelay = 0;
        }

        // initially define the currentDelay as the desired iterationDelay
        if (newBinding.initialDelay === undefined) {
            newBinding.currentDelay = newBinding.iterationDelay;
        } else {
            newBinding.currentDelay = newBinding.initialDelay;
        }

        // if an output format isn't defined define the default
        if (newBinding.format === undefined) {
            newBinding.format = '%.4f';
        }

        // if a customFormatFunc isn't defined define a dummy function
        // just incase
        if (newBinding.customFormatFunc === undefined) {
            newBinding.customFormatFunc = function(rawReading){
                console.info('Here, val:',rawReading);
                var retStr = "'customFormatFunc' NotDefined";
                return retStr;
            };
        }

        if (newBinding.execCallback === undefined) {
            newBinding.execCallback = false;
        }

        // if there is supposed to be a callback but it isn't defined define one
        var isCallback = newBinding.execCallback === true;
        if(isCallback && (newBinding.callback === undefined)) {
            newBinding.callback = function(binding, data, onSuccess){
                console.info('callback, binding:',binding,', data: ', data);
                onSuccess();
            };
        }

        // if adding a write binding and the desired event is undefined execute
        // onLoadError
        var isWrite = newBinding.direction === 'write';
        if (isWrite && newBinding.event === undefined) {
            self.fire(
                'onLoadError',
                [ 'Config binding missing direction' ],
                onErrorHandle
            );
            return;
        }

        if(newBinding.dataKey === undefined) {
            newBinding.dataKey = 'res';
        }
        // Finished checking for potential binding object related errors
        // ------------------------------------

        // BEGIN:
        // Code for recursively adding configBindings:
        var expandedBindings = expandBindingInfo(newBinding);
        var numBindings = expandedBindings.length;
        if (numBindings > 1) {
            for (var i=0; i<numBindings; i++)
                putConfigBinding(expandedBindings[i]);
            return;
        }
        // END:

        // Code for adding individual bindings to the moduleTemplateBindings,
        // readBindings, writeBindings, and bindings objects
        try{
            if(self.moduleTemplateBindings[newBinding.bindingClass] === undefined) {
                self.moduleTemplateBindings[newBinding.bindingClass] = [];
            }
            self.moduleTemplateBindings[newBinding.bindingClass].push(newBinding);
        } catch (err) {
            console.error('Error in presenter_framework.js, putConfigBinding',err);
        }
        bindings.set(newBinding.template, newBinding);


        var jquerySelector = '#' + newBinding.template;
        if (newBinding.direction === 'read') {
            readBindings.set(newBinding.template, newBinding);
        } else if (newBinding.direction === 'write') {
            writeBindings.set(newBinding.template, newBinding);
            self.establishWriteBinding(newBinding);
        } else {
            self.fire(
                'onLoadError',
                [ 'Config binding has invalid direction' ],
                onErrorHandle
            );
        }
    };
    var putConfigBinding = this.putConfigBinding;

    this.putConfigBindings = function(bindings) {
        var numBindings = bindings.length;
        for(var i = 0; i < numBindings; i++) {
            self.putConfigBinding(bindings[i]);
        }
    };
    var putConfigBindings = this.putConfigBindings;


    this.putSmartBinding = function(newSmartBinding) {
        var onErrorHandle = function(bundle) {
            console.error('in this.putSmartBinding, onErrorHandle', bundle);
        };
        // if bindingName isn't defined execute onLoadError
        if (newSmartBinding.bindingName === undefined) {
            self.fire(
                'onLoadError',
                [ 'SmartBinding binding missing bindingName' ],
                onErrorHandle
            );
            return;
        }
        // if smartName isn't defined execute onLoadError
        if (newSmartBinding.smartName === undefined) {
            self.fire(
                'onLoadError',
                [ 'SmartBinding binding missing smartName' ],
                onErrorHandle
            );
            return;
        }

        // if dataKey isn't defined, define it as 'res'
        if(newSmartBinding.dataKey === undefined) {
            newSmartBinding.dataKey = 'res';
        }

        var bindingName = newSmartBinding.bindingName;
        var smartName = newSmartBinding.smartName;
        var binding = {};
        var setupBinding = {};
        var isValid = false;

        // Add generic info to binding
        binding.bindingClass = bindingName;
        binding.template = bindingName;

        // Add generic info to setupBinding
        setupBinding.bindingClass = bindingName;

        if(smartName === 'clickHandler') {
            // Add information to binding object
            binding.binding = bindingName+CALLBACK_STRING_CONST;
            binding.direction = 'write';
            binding.event = 'click';
            binding.execCallback = true;
            binding.callback = newSmartBinding.callback;

            // Save binding to framework
            self.putConfigBinding(binding);
            isValid = true;
        } else if (smartName === 'readRegister') {
            // Add information to binding object
            binding.binding = bindingName;
            binding.direction = 'read';
            binding.format = newSmartBinding.format;
            binding.customFormatFunc = newSmartBinding.customFormatFunc;
            binding.iterationDelay = newSmartBinding.iterationDelay;
            binding.initialDelay = newSmartBinding.initialDelay;
            binding.displayType = newSmartBinding.displayType;
            binding.dataKey = newSmartBinding.dataKey;

            if(typeof(newSmartBinding.periodicCallback) === 'function') {
                binding.execCallback = true;
            }
            binding.callback = newSmartBinding.periodicCallback;

            // Add information to setupBinding object
            setupBinding.binding = bindingName;
            setupBinding.direction = 'read';
            setupBinding.callback = newSmartBinding.configCallback;
            setupBinding.format = newSmartBinding.format;
            setupBinding.formatFunc = newSmartBinding.customFormatFunc;
            setupBinding.dataKey = newSmartBinding.dataKey;

            if(typeof(newSmartBinding.configCallback) === 'function') {
                setupBinding.execCallback = true;
            }
            setupBinding.callback = newSmartBinding.configCallback;

            // Save binding to framework
            self.putConfigBinding(binding);
            self.putSetupBinding(setupBinding);
            isValid = true;
        } else if (smartName === 'setupOnlyRegister') {
            // Add information to setupBinding object
            setupBinding.binding = bindingName;
            setupBinding.direction = 'read';
            setupBinding.callback = newSmartBinding.configCallback;
            setupBinding.format = newSmartBinding.format;
            setupBinding.formatFunc = newSmartBinding.customFormatFunc;
            setupBinding.dataKey = newSmartBinding.dataKey;

            if(typeof(newSmartBinding.configCallback) === 'function') {
                setupBinding.execCallback = true;
            }
            setupBinding.callback = newSmartBinding.configCallback;

            // Save binding to framework
            self.putSetupBinding(setupBinding);
            isValid = true;
        } else if (smartName === 'periodicFunction') {
            // Add information to binding object
            binding.binding = bindingName+CALLBACK_STRING_CONST;
            binding.direction = 'read';
            binding.format = newSmartBinding.format;
            binding.customFormatFunc = newSmartBinding.customFormatFunc;
            binding.iterationDelay = newSmartBinding.iterationDelay;
            binding.initialDelay = newSmartBinding.initialDelay;

            if(typeof(newSmartBinding.periodicCallback) === 'function') {
                binding.execCallback = true;
            }
            binding.callback = newSmartBinding.periodicCallback;

            // Save binding to framework
            self.putConfigBinding(binding);
            isValid = true;
        }

        if(isValid) {
            self.smartBindings.set(newSmartBinding.bindingName, newSmartBinding);
        }

    };
    var putSmartBinding = this.putSmartBinding;

    this.putSmartBindings = function(newSmartBindings) {
        newSmartBindings.forEach(function(newSmartBinding) {
            self.putSmartBinding(newSmartBinding);
        });
    };
    var putSmartBindings = this.putSmartBindings;

    this.qUpdateSmartBindings = function() {
        var deferred = q.defer();
        self.smartBindings.forEach(function(smartBinding, key) {
            self.putSmartBinding(smartBinding);
        });
        deferred.resolve();
        return deferred.promise;
    };
    this.printSmartBindings = function() {
        self.smartBindings.forEach(function(smartBinding, key) {
            console.log('Smart Binding Keys: ',key);
        });
    };

    this.deleteSmartBinding = function(bindingName) {
        if(self.smartBindings.has(bindingName)) {
            var info = self.smartBindings.get(bindingName);
            var deleteBinding = {
                'direction': 'read',
                'bindingClass': bindingName,
                'template': bindingName,
            };
            if(info.smartName === 'clickHandler') {
                deleteBinding.direction = 'write';
                deleteBinding.event = 'click';
            }
            self.deleteConfigBinding(deleteBinding);
            self.deleteSetupBinding(deleteBinding);
            self.smartBindings.delete(bindingName);
        }
    };
    this.deleteSmartBindings = function(bindingNames) {
        bindingNames.forEach(self.deleteSmartBinding);
    };
    this.deleteAllSmartBindings = function() {
        var names = [];
        self.smartBindings.forEach(function(smartBinding, key) {
            names[names.length] = smartBinding.smartName;
        });
        self.deleteSmartBindings(names);
        self.smartBindings = dict({});
        self.setupBindings = dict({});
    }
    /**
     * Function to add a single binding that gets read once upon device
     * selection.
     * @param  {[type]} binding [description]
     * @return {[type]}         [description]
     */
    this.putSetupBinding = function(newBinding) {
        var onErrorHandle = function (shouldContinue) {
            self.runLoop = shouldContinue;
        };

        // Check for various required binding attributes & report onLoadErrors
        // if they dont exist
        if (newBinding.bindingClass === undefined) {
            self.fire(
                'onLoadError',
                [ 'Config binding missing bindingClass' ],
                onErrorHandle
            );
            return;
        }

        if (newBinding.binding === undefined) {
            self.fire(
                'onLoadError',
                [ 'Config binding missing binding' ],
                onErrorHandle
            );
            return;
        }

        if (newBinding.direction === undefined) {
            self.fire(
                'onLoadError',
                [ 'Config binding missing direction' ],
                onErrorHandle
            );
            return;
        }
        // if an output format isn't defined define the default
        if (newBinding.format === undefined) {
            newBinding.format = '%.4f';
        }

        // if a customFormatFunc isn't defined define a dummy function
        if (newBinding.formatFunc === undefined) {
            newBinding.formatFunc = function(rawReading){
                console.info('Here, val:',rawReading);
                var retStr = "'customFormatFunc' NotDefined";
                return retStr;
            };
        }

        if(newBinding.dataKey === undefined) {
            newBinding.dataKey = 'res';
        }

        var isWrite = newBinding.direction === 'write';
        if ( (isWrite) && (newBinding.defaultVal === undefined) ) {
            self.fire(
                'onLoadError',
                [ 'Config binding missing defaultVal' ],
                onErrorHandle
            );
            return;
        }

        if(newBinding.execCallback === undefined) {
            newBinding.execCallback = false;
        }
        if(newBinding.callback === undefined) {
            newBinding.callback = function(data, onSuccess) {
                console.info('SetupBinding requested a callback but is not defined');
                onSuccess();
            };
        }


        var expandedBindings = expandSetupBindingInfo(newBinding);
        var numBindings = expandedBindings.length;
        if (numBindings > 1) {
            for (var i=0; i<numBindings; i++)
                putSetupBinding(expandedBindings[i]);
            return;
        }

        try{
            if(self.moduleTemplateSetupBindings[newBinding.bindingClass] === undefined) {
                self.moduleTemplateSetupBindings[newBinding.bindingClass] = [];
            }
            self.moduleTemplateSetupBindings[newBinding.bindingClass].push(newBinding);
        } catch (err) {
            console.error('Error in presenter_framework.js, putSetupBinding', err);
        }
        self.setupBindings.set(newBinding.bindingClass, newBinding);

        if (newBinding.direction === 'read') {
            self.readSetupBindings.set(newBinding.bindingClass, newBinding);
        } else if (newBinding.direction === 'write') {
            self.writeSetupBindings.set(newBinding.bindingClass, newBinding);
        } else {
            self.fire(
                'onLoadError',
                [ 'Config binding has invalid direction' ],
                onErrorHandle
            );
        }
    };
    var putSetupBinding = this.putSetupBinding;

    /**
     * Function to add multiple bindings that get read once upon device
     * selection.
     * @param  {[type]} binding [description]
     * @return {[type]}         [description]
     */
    this.putSetupBindings = function(bindings) {
        bindings.forEach(function(binding){
            self.putSetupBinding(binding);
        });
    };
    var putSetupBindings = this.putSetupBindings;

    this.deleteSetupBinding = function(setupBinding) {
        var name = setupBinding.bindingClass;
        if(self.setupBindings.has(name)) {
            var info = self.setupBindings.get(name);
            if(info.direction === 'read') {
                if(self.readSetupBindings.has(name)) {
                    self.readSetupBindings.delete(name);
                }
            } else if(info.direction === 'write') {
                if(self.writeSetupBindings.has(name)) {
                    self.writeSetupBindings.delete(name);
                }
            }
            self.setupBindings.delete(name);
        }
    };
    this.deleteSetupBindings = function(setupBindings) {
        setupBindings.forEach(self.deleteSetupBinding);
    };

    this.executeSetupBindings = function() {
        var deferred = q.defer();

        var addresses = [];
        var directions = [];
        var numValues = [];
        var values = [];
        var bindingClasses = [];

        var rwManyData = {
            bindingClasses: bindingClasses,
            addresses: addresses,
            directions: directions,
            numValues: numValues,
            values: values
        };

        // return this.rwMany(addresses, directions, numValues, values);

        var saveSetupBindings = function(setupInfo) {
            var innerDeferred = q.defer();
            self.setupBindings.forEach(function(binding, index){
                setupInfo.formats.push(binding.format);
                setupInfo.formatFuncs.push(binding.formatFunc);
                setupInfo.bindingClasses.push(binding.bindingClass);
                setupInfo.addresses.push(binding.binding);
                setupInfo.numValues.push(1);
                if ( binding.direction === 'read' ) {
                    setupInfo.directions.push(0);
                    setupInfo.values.push(-1);
                } else if ( binding.direction === 'write' ) {
                    setupInfo.directions.push(1);
                    setupInfo.values.push(setupInfo.defaultVal);
                }
            });
            innerDeferred.resolve(setupInfo);
            return innerDeferred.promise;
        };

        // Function for executing user-callback
        function executeCallback (binding, result) {
            var callbackDeferred = q.defer();
            if(binding.execCallback) {
                binding.callback(
                    {
                        framework: self,
                        module: self.module,
                        device: self.getSelectedDevice(),
                        binding: binding,
                        value: result.result,
                        result: result
                    },
                    function() {
                        callbackDeferred.resolve();
                    }
                );
            } else {
                callbackDeferred.resolve();
            }
            return callbackDeferred.promise;

        }
        // Function for saving successful write i/o attempts
        function createSuccessfulWriteFunc (ioDeferred, binding, results) {
            return function (value) {
                var result = {
                    status: 'success',
                    result: -1,
                    formattedResult: '-1',
                    address: binding.binding
                };
                results.set(binding.bindingClass, result);
                executeCallback(binding,result)
                .then(ioDeferred.resolve,ioDeferred.resolve);
            };
        }

        // Function for saving failed write i/o attempts
        function createFailedWriteFunc (ioDeferred, binding, results) {
            return function (error) {
                var result = {
                    status: 'error',
                    result: error,
                    formattedResult: null,
                    address: binding.binding
                };
                results.set(binding.bindingClass, result);
                executeCallback(binding,result)
                .then(ioDeferred.resolve,ioDeferred.resolve);
                // ioDeferred.resolve();
            };
        }

        // Function for saving successful read i/o attempts
        function createSuccessfulReadFunc (ioDeferred, binding, results) {
            return function (value) {
                // console.log('Successful Read',value);
                value = value.val;
                var formattedValue = '';
                var curFormat = binding.format;
                if(typeof(value) === 'number') {
                    if(curFormat !== 'customFormat') {
                        if(isNaN(value)) {
                            formattedValue = value;
                        } else {
                            if(typeof(value) === 'number') {
                                formattedValue = sprintf(curFormat, value);
                            } else {
                                console.warn('Replacing a non-value in createSuccessfulReadFunc', value, curFormat);
                                formattedValue = 0;
                            }
                        }
                    } else {
                        formattedValue = binding.formatFunc({
                            value: value,
                            address: binding.binding,
                            binding: binding
                        });
                    }
                } else {
                    formattedValue = value;
                }
                var result = {
                    status: 'success',
                    result: value,
                    formattedResult: formattedValue,
                    address: binding.binding
                };
                results.set(binding.bindingClass, result);
                executeCallback(binding,result)
                .then(ioDeferred.resolve,ioDeferred.resolve);
                // ioDeferred.resolve();
            };
        }

        // Function for saving failed read i/o attempts
        function createFailedReadFunc (ioDeferred, binding, results) {
            return function (error) {
                // console.log('Error on Read',error);
                var result = {
                    status: 'error',
                    result: error,
                    formattedResult: null,
                    address: binding.binding
                };
                results.set(binding.bindingClass, result);
                executeCallback(binding,result)
                .then(ioDeferred.resolve,ioDeferred.resolve);
                // ioDeferred.resolve();
            };
        }

        // Function that creates future device I/O operations to be executed
        function createFutureDeviceIOOperation (binding, results) {
            return function() {
                //Create execution queue
                var innerDeferred = q.defer();
                var device = self.getSelectedDevice();

                //Create various read/write functions
                var successfulWriteFunc = createSuccessfulWriteFunc(
                    innerDeferred,
                    binding,
                    results
                );
                var failedWriteFunc = createFailedWriteFunc(
                    innerDeferred,
                    binding,
                    results
                );
                var successfulReadFunc = createSuccessfulReadFunc(
                    innerDeferred,
                    binding,
                    results
                );
                var failedReadFunc = createFailedReadFunc(
                    innerDeferred,
                    binding,
                    results
                );
                // console.log('Executing IO Operation', binding.binding);
                //Link various function calls based off read/write property
                if(binding.direction === 'write') {
                    //Define write I/O procedure
                    device.qWrite(binding.binding, binding.defaultVal)
                    .then(successfulWriteFunc, failedWriteFunc);
                } else if (binding.direction === 'read') {
                    //Define read I/O procedure
                    device.sRead(binding.binding)
                    .then(successfulReadFunc, failedReadFunc);
                } else {
                    console.warn('invalid binding.direction', binding.direction);
                }

                //Return execution queue reference
                return innerDeferred.promise;
            };
        }

        // Function that creates the IO execution queue
        function createDeviceIOExecutionQueue (bindings, results) {
            // Execution queue
            var bindingList = [];

            // Populating the execution queue
            bindings.forEach(function (binding, key) {
                bindingList.push(createFutureDeviceIOOperation(
                    binding,
                    results
                ));
            });
            return bindingList;
        }

        // Function that executes the device setup commands
        function executeDeviceSetupQueue (bindings) {
            var deferred = q.defer();
            var results = dict({});

            var executionQueue = createDeviceIOExecutionQueue(
                bindings,
                results
            );

            //Execute the created execution queue of device IO commands
            async.eachSeries(
                executionQueue,
                function (request, callback) {
                    var successFunc = function() {
                        // console.log('eachSeries Success')
                        callback();
                    };
                    var errorFunc = function(err) {
                        // console.log('eachSeries Err',err);
                        callback(err);
                    };

                    request().then(successFunc,errorFunc);
                },
                function (err) {
                    // console.log('eachSeries Callback',err);
                    deferred.resolve(results);
                });
            return deferred.promise;
        }

        var performDeviceWrites = function(setupInfo) {
            var innerDeferred = q.defer();

            var device;
            var addresses = [];
            var directions = [];
            var numValues = [];
            var values = [];

            device = self.getSelectedDevice();
            addresses = setupInfo.addresses;
            directions = setupInfo.directions;
            numValues = setupInfo.numValues;
            values = setupInfo.values;

            try{
                device.rwMany(
                    addresses,
                    directions,
                    numValues,
                    values
                    ).then(
                    function(results) {
                        var configResults = dict({});
                        if(results.length != self.setupBindings.size) {
                            console.error('presenter_framework setupBindings ERROR!!');
                            console.error('resultsLength',results.length);
                            console.error('setupBindings length', self.setupBindings.size);
                        } else {
                            var i = 0;
                            self.setupBindings.forEach(function(binding, key){
                                configResults.set(
                                    key,
                                    {
                                        binding: binding,
                                        address: addresses[i],
                                        result: results[i]
                                    });
                                i += 1;
                            });
                        }
                        innerDeferred.resolve(configResults);
                    },
                    function(err) {
                        innerDeferred.reject(err);
                    });
            }
            catch(err) {
                console.error('performDeviceWrites err',err);
                innerDeferred.reject(err);
            }
            return innerDeferred.promise;
        };

        // Save the setup information

    // Code for executing requests in a single rwMany request:
        // saveSetupBindings(rwManyData)
        // .then(performDeviceWrites,self.qExecOnLoadError)

    // Code for executing requests one at a time
        executeDeviceSetupQueue(self.setupBindings)
        .then(deferred.resolve,deferred.reject);
        return deferred.promise;
    };

    this._writeToDevice = function (bindingInfo, eventData) {
        var jquerySelector = '#' + bindingInfo.template;
        var newVal = self.jquery.val(jquerySelector);

        var alertRegisterWrite = function () {
            var innerDeferred = q.defer();
            self.fire(
                'onRegisterWrite',
                [
                    bindingInfo,
                    newVal
                ],
                innerDeferred.reject,
                innerDeferred.resolve
            );
            return innerDeferred.promise;
        };

        var performCallbacks = function(skipWrite) {
            var innerDeferred = q.defer();
            var callbackString = CALLBACK_STRING_CONST;
            var baseStr = bindingInfo.binding;
            var searchIndex = baseStr.search(callbackString);
            if( searchIndex >= 0) {
                if((baseStr.length - searchIndex - callbackString.length) === 0) {
                    if(bindingInfo.execCallback) {
                        try {
                            bindingInfo.callback(
                                {
                                    framework: self,
                                    module: self.module,
                                    device: self.getSelectedDevice(),
                                    binding: bindingInfo,
                                    eventData: eventData,
                                    value: newVal,
                                },
                                function(err) {
                                    innerDeferred.resolve(skipWrite, true);
                                });
                        } catch (e) {
                            self.reportSyntaxError(
                                {
                                    'location':'_writeToDevice.performCallbacks',
                                    data: {binding: bindingInfo, eventData: eventData}
                                },e);
                            innerDeferred.resolve(skipWrite, true);
                        }
                        return innerDeferred.promise;
                    } else {
                        innerDeferred.resolve(skipWrite, false);
                    }
                }
            } else {
                if(bindingInfo.execCallback) {
                        try {
                            bindingInfo.callback(
                                {
                                    framework: self,
                                    module: self.module,
                                    device: self.getSelectedDevice(),
                                    binding: bindingInfo,
                                    eventData: eventData,
                                    value: newVal,
                                },
                                function() {
                                    innerDeferred.resolve(skipWrite, false);
                                });
                        } catch (e) {
                            self.reportSyntaxError(
                                {
                                    'location':'_writeToDevice.performCallbacks(2)',
                                    data: {binding: bindingInfo, eventData: eventData}
                                },e);
                            innerDeferred.resolve(skipWrite, false);
                        }
                        return innerDeferred.promise;
                    } else {
                        innerDeferred.resolve(skipWrite, false);
                    }
            }
            return innerDeferred.promise;
        };

        var writeToDevice = function (skipWrite, skip) {
            var innerDeferred = q.defer();
            if(skip) {
                var device = self.getSelectedDevice();
                var invalidString = '-invalid';
                var baseStr = bindingInfo.binding;
                var searchIndex = baseStr.search(invalidString);
                if( searchIndex >= 0) {
                    if((baseStr.length - searchIndex - invalidString.length) === 0) {
                        innerDeferred.resolve(false);
                        return innerDeferred.promise;
                    }
                }
                if(typeof(skipWrite) === undefined) {
                    device.write(bindingInfo.binding, newVal);
                    innerDeferred.resolve(true);
                } else if(typeof(skipWrite) === "boolean") {
                    if(skipWrite === false) {
                        device.write(bindingInfo.binding, newVal);
                        innerDeferred.resolve(true);
                    }
                    else {
                        innerDeferred.resolve(false);
                    }
                } else {
                    innerDeferred.resolve(false);
                }
            } else {
                innerDeferred.resolve(false);
            }
            return innerDeferred.promise;
        };

        var alertRegisterWritten = function (wasNotHandledExternally) {
            if(wasNotHandledExternally) {
                var innerDeferred = q.defer();
                self.fire(
                    'onRegisterWritten',
                    [
                        bindingInfo.binding,
                        newVal
                    ],
                    innerDeferred.reject,
                    innerDeferred.resolve
                );
                return innerDeferred.promise;
            }
        };

        var deferred = q.defer();

        // Alert to module that a write is about to happen
        alertRegisterWrite()

        // Perform callback if necessary
        .then(performCallbacks, deferred.reject)

        // Perform un-handled device IO
        .then(writeToDevice, deferred.reject)

        // Notify module that the write has finished
        .then(alertRegisterWritten, deferred.reject)

        // Re-draw the window to prevent crazy-window issues
        .then(qRunRedraw, deferred.reject)

        .then(deferred.resolve, deferred.reject);
        return deferred.promise;
    };

    /**
     * Delete a previously added configuration binding.
     *
     * @param {String} bindingName The name of the binding (the binding info
     *      object's original "template" attribute) to delete.
    **/
    this.deleteConfigBinding = function (binding) {
        var bindingName = binding.bindingClass;
        var expandedBindings = ljmmm_parse.expandLJMMMName(bindingName);
        var numBindings = expandedBindings.length;
        if (numBindings > 1) {
            for (var i=0; i<numBindings; i++) {
                deleteConfigBinding(expandedBindings[i]);
            }
            return;
        }

        if (!self.bindings.has(bindingName)) {
            self.fire(
                'onLoadError',
                [ 'No binding for ' + bindingName ],
                function (shouldContinue) { self.runLoop = shouldContinue; }
            );
            return;
        }

        var bindingInfo = self.bindings.get(bindingName);

        self.bindings.delete(bindingName);

        if (bindingInfo.direction === 'read') {
            self.readBindings.delete(bindingName);
        } else if (bindingInfo.direction === 'write') {
            self.writeBindings.delete(bindingName);
            var jquerySelector = '#' + bindingInfo.template;
            jquery.off(jquerySelector, bindingInfo.event);
        } else {
            self.fire(
                'onLoadError',
                [ 'Config binding has invalid direction' ],
                function (shouldContinue) { self.runLoop = shouldContinue; }
            );
        }
    };
    var deleteConfigBinding = this.deleteConfigBinding;

    this.deleteConfigBindings = function(bindings) {
        bindings.forEach(function(binding){
            self.deleteConfigBinding(binding);
        });
    };

    this.clearConfigBindings = function() {
        bindings = dict({});
        readBindings = dict({});
        writeBindings = dict({});
        moduleTemplateBindings = {};

        self.bindings = bindings;
        self.readBindings = readBindings;
        self.writeBindings = writeBindings;
        self.moduleTemplateBindings = moduleTemplateBindings;
    };
    this.qClearConfigBindings = function() {
        var deferred = q.defer();
        var clearBindings = true;
        if(typeof(DISABLE_AUTO_CLEAR_CONFIG_BINDINGS) === 'boolean') {
            if(DISABLE_AUTO_CLEAR_CONFIG_BINDINGS) {
                clearBindings = false;
            }
        }
        if(clearBindings) {
            self.clearConfigBindings();
        }
        deferred.resolve();
        return deferred.promise;
    };
    var qClearConfigBindings = this.qClearConfigBindings;

    var deleteConfigBindings = this.deleteConfigBindings;

    /**
     * Render the HTML view to use for the current module.
     *
     * @param {str} templateLoc Path to the HTML template to use to render this
     *      module's view. Will be rendered as a handlebars template.
     * @param {Array} jsonFiles String paths to the JSON files to use when
     *      rendering this view. Will be provided to the template as an
     *      attribute "json" on the rendering context. Namely, context.json will
     *      be set to an object where the attribute is the name of the JSON file
     *      and the value is the JSON loaded from that file.
    **/
    this.setDeviceView = function (loc, jsonFiles, context) {
        var defered = q.defer();

        if (jsonFiles === undefined)
            jsonFiles = [];

        if (context === undefined)
            context = {};

        // Append the selected devices array to the context to allow templates
        // to adjust their displayed content based on what devices are available.

        context.devices = self.getSelectedDevices();

        var onErr = function(data) {
            console.error('in this.setDeviceView, onErr', data);
        };
        // console.log('context (analogInputs)', context);
        // console.log('moduleTemplateBindings:', self.moduleTemplateBindings);

        // Create an error handler
        var reportLoadError = function (details) {
            console.error('reporting load error', details);
            onErr({'msg': details});
            self.fire(
                'onLoadError',
                [ details ],
                function (shouldContinue) { self.runLoop = shouldContinue; }
            );
        };

        // Load the supporting JSON files for use in the template
        var jsonTemplateVals = {};
        var loadJSONFiles = function () {
            var innerDefered = q.defer();
            // Set the jsonTemplateVals object equal to the already loaded .json
            // lodata object.
            jsonTemplateVals = self.moduleData.json;

            innerDefered.resolve();
            return innerDefered.promise;
        };

        // Load the HTML view template and render
        var prepareHTMLTemplate = function () {
            var innerDefered = q.defer();

            var cacheKey = '';
            var i;
            for(i = 0; i < self.moduleData.html.length; i++) {
                if(self.moduleData.html[i].fileName === 'view.html') {
                    cacheKey = self.moduleData.html[i].filePath;
                    break;
                }
            }

            context.json = jsonTemplateVals;
            // console.log('in prepareHTMLTemplate', self.getSelectedDevices());
            fs_facade.renderCachedTemplateData(
                cacheKey,
                self.moduleData.htmlFiles.view,
                context
            )
            .then(innerDefered.resolve, innerDefered.reject);
            return innerDefered.promise;
        };

        var introduceDelay = function() {
            var innerDefered = q.defer();
            setTimeout(innerDefered.resolve, 200);
            return innerDefered.promise;
        };
        var forceRefresh = function() {
            var innerDefered = q.defer();
            runRedraw();
            innerDefered.resolve();
            return innerDefered.promise;
        };

        var injectHTMLTemplate = function (htmlContents) {
            var innerDefered = q.defer();
            // var moduleDiv = $(DEVICE_VIEW_TARGET);
            // moduleDiv.html(htmlContents);

            htmlContents = '<div class="framework-template">' + htmlContents + '</div>';
            self.jquery.html(DEVICE_VIEW_TARGET, htmlContents);
            $('.framework-template').ready(runRedraw);

            innerDefered.resolve();
            return innerDefered.promise;
        };

        var attachListeners = function () {
            var innerDefered = q.defer();

            if(self.deviceSelectionListenersAttached === false) {
                self.jquery.on(
                    self.getDeviceSelectorClass(),
                    'click',
                    self._changeSelectedDeviceUI
                );
                self.deviceSelectionListenersAttached = true;
                deviceSelectionListenersAttached = true;
            }

            innerDefered.resolve();
            return innerDefered.promise;
        };

        loadJSONFiles()
        .then(prepareHTMLTemplate, reportLoadError)
        .then(injectHTMLTemplate, reportLoadError)
        //.then(introduceDelay, reportLoadError)
        //.then(forceRefresh, reportLoadError)
        .then(attachListeners, reportLoadError)
        .then(defered.resolve, defered.reject);
        return defered.promise;
    };
    var setDeviceView = self.setDeviceView;

    var getSaveSelectedDevice = function(serialNumber) {
        var saveSelectedDevice = function() {
            var defered = q.defer();
            device_controller.selectDevice(serialNumber)
            .then(defered.resolve, defered.reject);
            return defered.promise;
        };
        return saveSelectedDevice;
    };
    var getSaveSelectedDevices = function(serialNumbers) {
        var saveSelectedDevices = function() {
            var defered = q.defer();
            device_controller.selectDevices(serialNumbers)
            .then(defered.resolve, defered.reject);
            return defered.promise;
        };
        return saveSelectedDevices;
    };

    var getSmartSaveSelectedDevices = function(serialNumberData) {
        // If the data is an array, call and return the saveDevices function
        if(Array.isArray(serialNumberData)) {
            return getSaveSelectedDevices(serialNumberData);
        } else {
            return getSaveSelectedDevice(serialNumberData);
        }
    };

    this._changeSelectedDeviceUI = function (data) {
        // var serialNumber = self.jquery.get(
        //     '.device-selection-radio:checked'
        // );
        var serialNumber;
        var serialNumbers = [];
        var selectDevicesData;


        try {
            var elements = self.jquery.get(
                self.getDeviceSelectorClass() + ':checked'
            );
            if(self.frameworkType === 'singleDevice') {
                serialNumber = elements.val();
                selectDevicesData = serialNumber;
            } else if(self.frameworkType === 'multipleDevices') {
                var numEle = elements.length;
                for(var i = 0; i < numEle; i++) {
                    serialNumbers.push(elements.eq(i).val());
                }
                selectDevicesData = serialNumbers;
            } else {
                console.warn('Wrong frameworkType', self.frameworkType);
                serialNumber = elements.val();
                selectDevicesData = serialNumber;
            }
        } catch(err) {
            console.error('error in _changeSelectedDeviceUI', err);
        }

        // console.log('in _changeSelectedDeviceUI', selectDevicesData);
        //Perform necessary actions:
        setTimeout(function() {
            // Stop the DAQ loop
            self.qStopLoop()

            // Report that the device has been closed
            .then(self.qExecOnCloseDevice, self.qExecOnLoadError)

            // Hide the module's template
            .then(self.qHideUserTemplate, self.qExecOnLoadError)

            // Save the selected device (to allow for device switching w/o module re-loading)
            .then(getSmartSaveSelectedDevices(selectDevicesData), self.qExecOnLoadError)

            // Update the currently-active device (This will force a valid device to be selected).
            .then(self.qUpdateActiveDevice, self.qExecOnLoadError)

            // Report that a new device has been selected
            .then(self.qExecOnDeviceSelected, self.qExecOnLoadError)

            // Clear all config-bindings (if not disabled)
            .then(self.qClearConfigBindings, self.qExecOnLoadError)

            // Re-configure any smartBindings
            .then(self.qUpdateSmartBindings, self.qExecOnLoadError)

            // Configure the device
            .then(self.executeSetupBindings, self.qExecOnLoadError)

            // Report that the device has been configured
            .then(self.qExecOnDeviceConfigured, self.qExecOnLoadError)

            // Render the module's template
            .then(self.qRenderModuleTemplate, self.qExecOnLoadError)

            // Connect connect any established writeBindings to jquery events
            .then(self.qEstablishWriteBindings, self.qExecOnLoadError)

            // Report that the module's template has been loaded
            .then(self.qExecOnTemplateLoaded, self.qExecOnLoadError)

            // Start the DAQ loop
            .then(self.qStartLoop, self.qExecOnLoadError)

            // Display the module's template
            .then(self.qShowUserTemplate, self.qExecOnLoadError)

            // Report that the module's template has been displayed
            .then(self.qExecOnTemplateDisplayed, self.qExecOnLoadError)

            // Re-draw the window to prevent window-disapearing issues
            .then(qRunRedraw, self.qExecOnLoadError)
            .done();
        },5);
    };

    /**
     * Get the currently selected device.
     *
     * @return {presenter.Device} The device selected as the "active" device.
    **/
    this.getSelectedDevice = function () {
        return self.activeDevice;
    };
    var getSelectedDevice = this.getSelectedDevice;

    this.getSelectedDevices = function() {
        if(self.frameworkType === 'singleDevice') {
            return [self.activeDevice];
        } else if(self.frameworkType === 'multipleDevices') {
            return self.selectedDevices;
        } else {
            return [self.activeDevice];
        }
    };

    this.smartGetSelectedDevices = function() {
        if(self.frameworkType === 'singleDevice') {
            return self.getSelectedDevice();
        } else if(self.frameworkType === 'multipleDevices') {
            return self.getSelectedDevices();
        } else {
            return self.getSelectedDevice();
        }
    };

    /**
     * Function that should be called after all of the bindings have been added.
     *
     * Function that should be called after all of the config bindings have been
     * added and all of the config controls have been set.
    **/
    this.establishConfigControlBindings = function () {
        var listener = self._OnConfigControlEvent;
        var jquery = self.jquery;
        self.configControls.forEach(function (value) {
            jquery.on(value.selector, value.event, listener);
        });
    };
    var establishConfigControlBindings = this.establishConfigControlBindings;

    /**
     * Stop the module's refresh loop.
    **/
    this.stopLoop = function () {
        self.runLoop = false;
    };
    var stopLoop = this.stopLoop;

    this.qStopLoop = function() {
        var defered = q.defer();
        self.runLoop = false;
        if(self.frameworkLoopProcessing) {
            // console.log('framework loop is currently processing (qStopLoop)...');
            clearTimeout(self.frameworkLoopReference);
            var num = 0;
            var checkDAQLoop = function() {
                // console.log('Delaying (qStopLoop)....', num);
                num += 1;
                if(self.isDAQLoopActive) {
                    setTimeout(checkDAQLoop, 100);
                } else {
                    defered.resolve();
                }
            };
            var daqLoopChecker = setTimeout(checkDAQLoop, 100);
        } else {
            defered.resolve();
        }
        return defered.promise;
    };

    /**
     * Start the module's refresh loop.
    **/
    this.isDAQLoopActive = false;
    this.startLoop = function () {
        self.runLoop = true;
        self.isDAQLoopActive = true;
        // self.loopIteration();
        self.runLoopIteration();
    };
    var startLoop = this.startLoop;
    self.qStartLoop = function() {
        var defered = q.defer();
        self.startLoop();
        defered.resolve();
        return defered.promise;
    };
    this.printCurTime = function(message) {
        var d = new Date();
        console.log(message,d.valueOf() - self.iterationTime - self.refreshRate);
    };
    this.daqMonitor = function() {
        if(!self.daqLoopFinished) {
            self.printDAQLoopMonitorInfo('DAQ-Loop-Lock-Detected',self.daqLoopStatus);
        }
    };
    this.qConfigureTimer = function() {
        var innerDeferred = q.defer();
        if(!self.frameworkActive) {
            innerDeferred.reject();
            return innerDeferred.promise;
        }
        var d = new Date();
        var curTime = d.valueOf();
        var elapsedTime = curTime - self.iterationTime - self.refreshRate;
        self.printTimingInfo('elapsedTime',elapsedTime);
        var delayTime = self.refreshRate;

        if ((errorRefreshRate - elapsedTime) < 0) {
            if(self.loopErrorEncountered) {
                self.printDAQLoopInfo('sdFramework DAQ Loop is slow (Due to error)...',elapsedTime);
            } else {
                self.printDAQLoopInfo('sdFramework DAQ Loop is slow (Not due to error)...',elapsedTime);
            }
            device_controller.ljm_driver.readLibrarySync('LJM_DEBUG_LOG_MODE');
            if(!self.ljmDriverLogEnabled) {
                console.info('enabling LJM-log', elapsedTime);
                self.ljmDriver.writeLibrarySync('LJM_DEBUG_LOG_MODE',2);
                self.ljmDriver.writeLibrarySync('LJM_DEBUG_LOG_LEVEL',2);
                var confTimeout = self.ljmDriver.readLibrarySync('LJM_SEND_RECEIVE_TIMEOUT_MS');
                self.ljmDriver.logSSync(2,'initDebug: Slow DAQ Loop: '+elapsedTime.toString());
                self.ljmDriver.logSSync(2,self.moduleName);
                self.ljmDriver.logSSync(2,'TCP_SEND_RECEIVE_TIMEOUT: '+confTimeout.toString());

                self.ljmDriverLogEnabled = true;
                self.numContinuousRegLoopIterations = 0;
            } else {
                self.ljmDriver.logSSync(2,'Slow DAQ Loop: '+elapsedTime.toString());
                self.numContinuousRegLoopIterations = 0;
            }
            delayTime = 10;
        } else {
            if(self.ljmDriverLogEnabled) {
                console.info('sdFramework DAQ Loop is running normally...',elapsedTime);
                if(self.numContinuousRegLoopIterations > 5) {
                    var numIt = self.numContinuousRegLoopIterations;
                    console.info('disabling LJM-log,  loop is running smoothly again');
                    self.ljmDriver.logSSync(2,'Slow DAQ Loop (RESOLVED) after: '+numIt.toString());
                    self.ljmDriver.writeLibrarySync('LJM_DEBUG_LOG_MODE',1);
                    self.numContinuousRegLoopIterations = 0;
                    self.ljmDriverLogEnabled = false;
                } else {
                    self.numContinuousRegLoopIterations += 1;
                }
            }
        }
        self.iterationTime = curTime;

        if(self.loopErrorEncountered) {
            self.loopErrors.forEach(function(error){
                self.printLoopErrors('Loop Errors',error);
            });
        }
        // Clear loop errors
        self.loopErrorEncountered = false;
        self.loopErrors = [];
        self.daqLoopStatus = 'timerConfigured';
        if((typeof(sdModule) !== 'undefined') && (typeof(sdFramework) !== 'undefined')) {
            setTimeout(self.runLoopIteration, self.refreshRate);
        } else {
            console.info('sdModule or sdFramework not defined!!');
        }
        innerDeferred.resolve();
        return innerDeferred.promise;
    };
    var qConfigureTimer = this.qConfigureTimer;

    this.unpauseFramework = function() {
        self.isDAQLoopPaused = false;
    };
    var unpauseFramework = this.unpauseFramework;
    this.pauseFramework = function(pauseNotification) {
        self.pauseDAQLoop = true;
        self.isPausedListenerFunc = pauseNotification;
        return function() {
            self.isDAQLoopPaused = false;
        };
    };
    var pauseFramework = this.pauseFramework;
    this.testPauseFramework = function() {
        self.pauseFramework(
            function() {
                console.info('Framework is paused!');
                self.unpauseFramework();
            }
        );
    };

    var reportStartingDaqLoop = function() {
        var defered = q.defer();
        self.daqLoopFinished = false;
        self.daqLoopStatus = 'startingLoop';
        defered.resolve();
        return defered.promise;
    };
    var reportFinishedDaqLoop = function(data) {
        var defered = q.defer();
        var finishedFunc = function() {
            self.daqLoopFinished = true;
            self.daqLoopStatus = 'finishedDaqLoop';
            defered.resolve();
        };
        var executeFinishedFunc = true;
        if(data) {
            // console.log('DAQ Loop Finished', data);
            if(data === 'delay') {
                executeFinishedFunc = false;
                try {
                    triggerModuleOnRefreshed([])
                    .then(finishedFunc, finishedFunc);
                } catch(err) {
                    console.error('Error in reportFinishedDaqLoop', err);
                    finishedFunc();
                }
            } else {
                // console.log('DAQ Loop Finished', data);
            }
        }

        if(executeFinishedFunc) {
            finishedFunc();
        }

        return defered.promise;
    };
    var getNeededAddresses = function () {
        var defered = q.defer();
        self.daqLoopStatus = 'getNeededAddresses';
        var addresses = [];
        var formats = [];
        var customFormatFuncs = [];
        var bindings = [];

        // Loop through all registered bindings and determine what should be
        // done.
        self.readBindings.forEach(function (value, key) {
            // For each binding check to see if it should be executed by
            // checking its currentDelay.  If it equals zero than it needs
            // to be executed.
            if(value.currentDelay <= 0) {
                // Search bindings for custom bindings
                var callbackString = CALLBACK_STRING_CONST;
                var baseStr = value.binding;
                var searchIndex = baseStr.search(callbackString);
                if( searchIndex < 0) {
                    // if the CALLBACK_STRING_CONST tag wasn't found then
                    // add the binding to the list of registers that needs
                    // to be queried from the device.
                    addresses.push(value.binding);
                    formats.push(value.format);
                    customFormatFuncs.push(value.customFormatFunc);
                } else {

                }
                bindings.push(value);

                // Re-set the binding's delay with the new delay
                value.currentDelay = value.iterationDelay;
                self.readBindings.set(key, value);
            } else {
                // Decrement the binding's delay
                value.currentDelay = value.currentDelay - 1;
                self.readBindings.set(key, value);
            }
        });
        if(addresses.length > 0) {
            defered.resolve({
                addresses: addresses,
                formats: formats,
                customFormatFuncs: customFormatFuncs,
                bindings: bindings
            });
        } else {
            defered.reject('delay');
        }
        return defered.promise;
    };
    var triggerModuleOnRefresh = function (bindingsInfo) {
        var innerDeferred = q.defer();
        self.daqLoopStatus = 'triggerModuleOnRefresh';
        self.fire(
            'onRefresh',
            [ bindingsInfo ],
            function() {
                innerDeferred.reject();
            },
            function () {
                innerDeferred.resolve(bindingsInfo);
            }
        );
        return innerDeferred.promise;
    };
    var requestDeviceValues = function (bindingsInfo) {
        var innerDeferred = q.defer();
        self.daqLoopStatus = 'requestDeviceValues';
        var device = self.getSelectedDevice();

        var addresses = bindingsInfo.addresses;
        var formats = bindingsInfo.formats;
        var customFormatFuncs = bindingsInfo.customFormatFuncs;
        var bindings = bindingsInfo.bindings;

        if (addresses.length === 0) {
            innerDeferred.resolve({
                values: [],
                addresses: [],
                formats: [],
                customFormatFuncs: []
            });
            return innerDeferred.promise;
        }
        device.sReadMany(addresses)
        .then(
            function (values) {
                innerDeferred.resolve({
                    values: values,
                    addresses: addresses,
                    formats: formats,
                    customFormatFuncs: customFormatFuncs,
                    bindings: bindings
                });
            },
            innerDeferred.reject
        );

        return innerDeferred.promise;
    };


    var processDeviceValues = function (valuesInfo) {
        var innerDeferred = q.defer();
        self.daqLoopStatus = 'processDeviceValues';
        var values = valuesInfo.values;
        var addresses = valuesInfo.addresses;
        var formats = valuesInfo.formats;
        var customFormatFuncs = valuesInfo.customFormatFuncs;
        var numAddresses = addresses.length;
        var bindings = valuesInfo.bindings;
        var retDict = dict({});

        // Iterate through the bindings executed using the async library
        var curDeviceIOIndex = 0;

        var innerProcessSingleDeviceValue = function(binding, nextStep) {

            //Executed for each binding
            // Search binding string for callback bindings tag
            var callbackString = CALLBACK_STRING_CONST;
            var baseStr = binding.binding;
            var searchIndex = baseStr.search(callbackString);
            var dataKey = binding.dataKey;
            var index = curDeviceIOIndex;
            var curResult = values[index];
            var curAddress = addresses[index];
            var stringVal;
            var curValue;
            var curVal;

            // Periodic bindings (ones that don't perform any device IO
            // will have a "undefined" curResult value.
            if(curResult) {
                if(dataKey === '') {
                    curValue = curResult;
                } else {
                    if(typeof(curResult[dataKey] !== 'undefined')) {
                        curValue = curResult[dataKey];
                    } else {
                        curValue = curResult.val;
                    }
                }
                curVal = curResult.res;
             }

            if( searchIndex < 0) {
                //If the tag was not found then perform auto-formatting
                var curFormat = formats[index];
                var curCustomFormatFunc = customFormatFuncs[index];

                if(curFormat !== 'customFormat') {
                    if(isNaN(curVal)){
                        stringVal = curVal;
                    } else {
                        if(typeof(curVal) === 'number') {
                            stringVal = sprintf(curFormat, curVal);
                        } else {
                            if(curResult.str === '-Infinity') {
                                stringVal = (NaN).toString();
                            } else if((curResult.str === '+Infinity') || (curResult.str === 'Infinity')) {
                                stringVal = (NaN).toString();
                            } else {
                                console.warn('Replacing a non-value in processDeviceValues', curVal, curFormat, baseStr, curResult);
                                stringVal = (0).toString();
                            }
                        }
                        // stringVal = curVal.toString();
                    }
                } else {
                    stringVal = curCustomFormatFunc({
                        value: curVal,
                        address: curAddress,
                        binding: binding
                        });
                }
                retDict.set(
                    curAddress.toString(),
                    stringVal
                );

                //Increment current index
                curDeviceIOIndex += 1;
            } else {
                if(binding.execCallback === false) {
                    console.warn('Warning, PeriodicFunction Found but not executing',binding);
                }
            }
            // If the current binding has a defined binding that
            // needs to be executed execute it now
            if(binding.execCallback) {
                // Execute read-binding function callback
                try {
                    binding.callback(
                        {   //Data to be passed to callback function
                            framework: self,
                            module: self.module,
                            device: self.getSelectedDevice(),
                            binding: binding,
                            value: curValue,
                            stringVal: stringVal
                        },
                        function executeNextStep() {
                            //Instruct async to perform the next step
                            nextStep();
                        });
                } catch (e) {
                    self.reportSyntaxError(
                        {
                            'location':'loopIteration.processDeviceValues',
                            data: {binding: binding,value:curValue,stringVal:stringVal}
                        },e);
                    nextStep();
                }
            } else {
                //Instruct async to perform the next step
                nextStep();
            }
        };

        async.eachSeries(
            bindings,
            function processSingleDeviceValue (binding, nextStep) {
                try {
                    innerProcessSingleDeviceValue(binding, nextStep);
                } catch(err) {
                    console.warn('Caught error while in processSingleDeviceValue', err);
                    nextStep();
                }
            },
            function(err) {
                //Executed when all bindings have been executed
                innerDeferred.resolve(retDict);
            });
        return innerDeferred.promise;
    };
    var displayDeviceValues = function (valuesDict) {
        var innerDeferred = q.defer();
        self.daqLoopStatus = 'displayDeviceValues';
        self._OnRead(valuesDict);
        innerDeferred.resolve(valuesDict);
        return innerDeferred.promise;
    };
    var triggerModuleOnRefreshed = function (valuesDict) {
        var innerDeferred = q.defer();
        self.daqLoopStatus = 'triggerModuleOnRefreshed';
        self.fire(
            'onRefreshed',
            [ valuesDict ],
            innerDeferred.reject,
            function () { innerDeferred.resolve(); }
        );
        return innerDeferred.promise;
    };
    var verifyFrameworkIsActive = function(bundle) {
        var defered = q.defer();

        // Make sure that this framework instance is active.
        if(!self.frameworkActive) {
            self.isDAQLoopActive = false;
            defered.reject('stoppingLoop');
            return defered.promise;
        }

        // Make sure that the loop should be executing.
        if (!self.runLoop) {
            self.isDAQLoopActive = false;
            defered.reject('stoppingLoop');
            return defered.promise;
        }

        defered.resolve(bundle);
        return defered.promise;
    };
    var reportLoopError = function (details) {
        var defered = q.defer();
        if(details !== 'delay') {
            if(details === 'stoppingLoop') {
                defered.reject(details);
                return;
            } else {
                self.daqLoopStatus = 'reportError';
                // TODO: Get register names from readBindings.
                self.fire(
                    'onRefreshError',
                    [ self.readBindings , details ],
                    function (shouldContinue) {
                        self.loopErrorEncountered = true;
                        self.loopErrors.push({details:details,func:'reportError'});
                        self.runLoop = shouldContinue;
                        if(shouldContinue) {
                            self.printLoopErrors(
                                'onRefreshError b/c loopIteration.reportError',
                                details
                            );
                            defered.reject('delay');
                        } else {
                            defered.reject('stoppingLoop');
                        }
                    }
                );
            }
        } else {
            defered.reject(details);
        }
        return defered.promise;
    };

    var innerRunDAQLoop = function(deviceAttributes) {
        var defered = q.defer();
        // Only run the DAQ loop if the active device is connected.
        // if(deviceAttributes.isConnected) {
        if(deviceAttributes.isConnected) {
            reportStartingDaqLoop()

            // Get the current list of bindings
            .then(getNeededAddresses, reportLoopError)
            .then(verifyFrameworkIsActive, reportLoopError)

            // Inform the active module that data is being refreshed
            .then(triggerModuleOnRefresh, reportLoopError)
            .then(verifyFrameworkIsActive, reportLoopError)

            // Collect data from the active device
            .then(requestDeviceValues, reportLoopError)
            .then(verifyFrameworkIsActive, reportLoopError)

            // Process the collected device data
            .then(processDeviceValues, reportLoopError)
            .then(verifyFrameworkIsActive, reportLoopError)

            // Render collected data/perform DOM manipulations
            .then(displayDeviceValues, reportLoopError)
            .then(verifyFrameworkIsActive, reportLoopError)

            // Inform the active module that data was refreshed
            .then(triggerModuleOnRefreshed, reportLoopError)
            .then(verifyFrameworkIsActive, reportLoopError)

            // Report that the DAQ loop has finished executing
            .then(reportFinishedDaqLoop, reportFinishedDaqLoop)
            .then(defered.resolve, defered.reject);
        } else {
            // Resolve & wait for the next iteration.
            triggerModuleOnRefreshed([])
            .then(defered.resolve, defered.reject);
        }

        return defered.promise;
    };
    this.qRunDAQLoop = function() {
        var defered = q.defer();
        innerRunDAQLoop(self.activeDevice.savedAttributes)
        .then(defered.resolve, defered.reject);

        return defered.promise;
    };
    this.runDAQLoop = function(onSuccess) {
        innerRunDAQLoop(self.activeDevice.savedAttributes)
        .then(onSuccess);
    };
    this.runDAQMonitor = function() {
        var defered = q.defer();
        defered.resolve();
        return defered.promise;
    };
    var configureLoopTimer = function() {
        // var defered = q.defer();
        self.frameworkLoopProcessing = false;
        self.frameworkLoopReference = setTimeout(
            self.runLoopIteration,
            self.refreshRate
        );
        // defered.resolve();
        // return defered.promise;
    };
    var configurePausedLoopTimer = function() {
        var defered = q.defer();
        self.frameworkLoopProcessing = false;
        self.frameworkLoopReference = setTimeout(
            self.runLoopIteration,
            self.pausedRefreshRate
        );
        defered.resolve();
        return defered.promise;
    };
    this.frameworkLoopProcessing = false;
    this.frameworkLoopReference = undefined;
    this.runLoopIteration = function() {
        // var defered = q.defer();
        self.frameworkLoopProcessing = true;
        // Make sure that this framework instance is active.
        if(!self.frameworkActive) {
            self.isDAQLoopActive = false;
            // defered.reject();
            // return defered.promise;
        }

        // Make sure that the loop should be executing.
        if (!self.runLoop) {
            self.isDAQLoopActive = false;
            // defered.reject('Loop not running.');
            // return defered.promise;
        }

        if(self.isDAQLoopPaused) {
            // If the framework is paused then don't execute any of the update
            // code and configure a shorter timer.
            verifyFrameworkIsActive()
            .then(configurePausedLoopTimer)
            // .then(configurePausedLoopTimer, defered.reject)
            // .then(defered.resolve, defered.reject);
        } else {
            if(true) {
                var promises = [];
                promises.push(self.qRunDAQLoop());
                // promises.push(self.runDAQMonitor());

                q.allSettled(promises)
                .then(function(){
                    verifyFrameworkIsActive()
                    .then(configureLoopTimer)
                    // .then(configureLoopTimer, defered.reject)
                    // .then(defered.resolve, defered.reject);
                });
            } else {
                self.runDAQLoop(configureLoopTimer);
            }
        }
        // return defered.promise;
    };
    /**
     * Function to run a single iteration of the module's refresh loop.
     *
     * @return {q.promise} Promise that resolves after the iteration of the
     *      refresh loop finishes running. Rejects if an error was encountered
     *      during the loop iteration.
    **/
    this.loopIteration = function () {
        // !!! DEPRECATED !!! Now uses "this.runLoopIteration" !!!!
        var deferred = q.defer();
        if(!self.frameworkActive) {
            deferred.reject();
            return deferred.promise;
        }
        self.daqLoopFinished = false;
        self.daqLoopStatus = 'startingLoop';
        var getIsPausedChecker = function(unPauseLoop) {
            var isPausedChecker = function() {
                if(self.isDAQLoopPaused) {
                    if(!self.hasNotifiedUserOfPause) {
                        self.isPausedListenerFunc();
                        self.hasNotifiedUserOfPause = true;
                    }
                    console.info('DAQ Loop is still paused');
                    setTimeout(isPausedChecker,100);
                } else {
                    self.pauseDAQLoop = false;
                    self.hasNotifiedUserOfPause = false;
                    console.info('Resuming DAQ Loop');
                    self.daqLoopStatus = 'loopResuming';
                    unPauseLoop();
                }
            };
            return isPausedChecker;
        };

        var pauseLoop = function() {
            var innerDeferred = q.defer();
            if (self.pauseDAQLoop) {
                // DAQ loop is paused
                self.isDAQLoopPaused = true;
                self.daqLoopStatus = 'loopPaused';
                setTimeout(getIsPausedChecker(innerDeferred.resolve),100);
            } else {
                innerDeferred.resolve();
            }
            return innerDeferred.promise;
        };
        var initLoopTimer = function() {
            var innerDeferred = q.defer();
            self.daqLoopStatus = 'startingLoopMonitorTimer';
            clearTimeout(self.daqLoopMonitorTimer);
            self.daqLoopMonitorTimer = setTimeout(self.daqMonitor, 1000);
            innerDeferred.resolve();
            return innerDeferred.promise;
        };
        if (!self.runLoop) {
            deferred.reject('Loop not running.');
            return deferred.promise;
        }
        var checkModuleStatus = function(bindingsInfo) {
            var innerDeferred = q.defer();
            self.daqLoopStatus = 'checkModuleStatus';
            self.daqLoopFinished = true;
            clearTimeout(self.daqLoopMonitorTimer);
            if(self.moduleName === getActiveTabID()) {
                innerDeferred.resolve(bindingsInfo);
            } else {
                innerDeferred.reject(bindingsInfo);
            }
            return innerDeferred.promise;
        };
        var handleDelayErr = function (details) {
            var innerDeferred = q.defer();
            self.daqLoopStatus = 'handleDelayErr';
            if(details === 'delay') {
                innerDeferred.resolve();
            } else {
                innerDeferred.resolve();
            }
            return innerDeferred.promise;
        };
        var reportError = function(bundle) {
            var innerDefered = q.defer();
            console.error('in reportError (presenter_framework.js)');
            innerDefered.reject(bundle);
            return innerDefered.promise;
        };
        var alertRefresh = function(bundle) {
            var innerDefered = q.defer();
            console.log('in alertRefresh (presenter_framework.js)');
            innerDefered.resolve(bundle);
            return innerDefered.promise;
        };
        var alertRefreshed = function(bundle) {
            var innerDefered = q.defer();
            console.log('in alertRefreshed (presenter_framework.js)');
            innerDefered.resolve(bundle);
            return innerDefered.promise;
        };
        var alertOn = function(bundle) {
            var innerDefered = q.defer();
            console.log('in alertOn (presenter_framework.js)');
            innerDefered.resolve(bundle);
            return innerDefered.promise;
        };
        var handleIOError = function(bundle) {
            var innerDefered = q.defer();
            console.error('in handleIOError (presenter_framework.js)');
            innerDefered.reject(bundle);
            return innerDefered.promise;
        }

        // var setTimeout = function () {

        // };
        //checkModuleStatus()
        pauseLoop()
        .then(initLoopTimer, reportError)
        .then(getNeededAddresses, reportError)
        .then(alertRefresh, reportError)
        .then(requestDeviceValues, handleIOError)
        .then(processDeviceValues, reportError)
        .then(alertOn, reportError)
        .then(alertRefreshed, reportError)
        .then(checkModuleStatus, handleDelayErr)
        .then(self.qConfigureTimer, self.qExecOnUnloadModule)
        .then(deferred.resolve, deferred.reject);

        return deferred.promise;
    };
    var loopIteration = this.loopIteration;

    /**
     * Determine how many bindings have been registered for the module.
     *
     * @return {int} The number of bindings registered for this module.
    **/
    this.numBindings = function () {
        return self.bindings.size();
    };
    var numBindings = this.numBindings;

    this._OnRead = function (valueReadFromDevice) {
        var jquery = self.jquery;
        if(valueReadFromDevice !== undefined) {
            self.readBindings.forEach(function updateEachValue(bindingInfo, template) {
                try {
                var bindingName = bindingInfo.binding;
                var valRead = valueReadFromDevice.get(bindingName.toString())
                if (valRead !== undefined) {
                    var jquerySelector = '#' + bindingInfo.template;
                    if (bindingInfo.displayType === 'standard') {
                        var vals = jquery.html(jquerySelector, valRead.replace(' ','&nbsp;'));
                        if (vals.length === 0) {
                            jquerySelector = '.' + bindingInfo.template;
                            jquery.html(jquerySelector, valRead.replace(' ','&nbsp;'));
                        }
                    } else if (bindingInfo.displayType === 'input') {
                        if (!jquery.is(jquerySelector, ':focus')) {
                            jquery.val(jquerySelector, valRead.toString());
                        }
                    } else {

                    }
                }
            } catch(err) {
                console.warn('Error in FW updateEachValue', bindingName, err);
            }
            });
        }
    };
    var _OnRead = this._OnRead;

    this._OnConfigControlEvent = function (event) {
        self.fire('onRegisterWrite', [event]);
        self.fire('onRegisterWritten', [event]);
    };
    var _OnConfigControlEvent = this._OnConfigControlEvent;

    this.numModuleReloads = 0;
    this.currentModuleName = '';
    this.preConfiguredModuleName = '';
    this.getActiveTabID = function() {
        var integerModuleName = '';
        integerModuleName += self.currentModuleName;
        integerModuleName += '-';
        integerModuleName += self.numModuleReloads.toString();
        return integerModuleName;
    };
    this.configureActiveTabID = function(tabID) {
        self.uniqueTabID = tabID;
    };
    this.configFramework = function(viewLoc) {
        userViewFile = viewLoc;
        self.userViewFile = viewLoc; // [moduleName]/view.html
        //self.fire('onModuleLoaded')
    };
    this.configureFrameworkData = function(jsonDataFiles) {
        moduleJsonFiles = jsonDataFiles;
        self.moduleJsonFiles = jsonDataFiles;
    };
    var configureFrameworkData = this.configureFrameworkData;

    this.incrementNumberOfModuleReloads = function() {
        self.numModuleReloads += 1;
    };
    this.saveModuleName = function() {
        self.moduleName = self.getActiveTabID();
    };
    var saveModuleName = this.saveModuleName;

    this.setCustomContext = function(data) {
        moduleTemplateBindings.custom = data;
        self.moduleTemplateBindings.custom = data;
    };
    var setCustomContext = this.setCustomContext;

    this.tabClickHandler = function() {
        var visibleTabs = self.jquery.get('.module-tab');
        visibleTabs.off('click.sdFramework'+self.moduleName);

        var manageDevicesLink = self.jquery.get('#manage-link');
        visibleTabs.off('click.sdFramework'+self.moduleName);
        self.qExecOnUnloadModule();
    };
    var tabClickHandler = this.tabClickHandler;

    this.attachNavListeners = function() {
        var visibleTabs = self.jquery.get('.module-tab');
        visibleTabs.on('click.sdFramework'+self.getActiveTabID(),self.tabClickHandler);

        var manageDevicesLink = self.jquery.get('#manage-link');
        manageDevicesLink.on('click.sdFramework'+self.getActiveTabID(),self.tabClickHandler);
    };
    var attachNavListeners = this.attachNavListeners;

    this.startFramework = function() {
        var deferred = q.defer();
        if(self.flags.debug_startup) {
            console.info('executing qExecOnModuleLoaded');
        }

        self.initializeStartupData()
        .then(self.qExecOnModuleLoaded)
        // self.qExecOnModuleLoaded()
        // .then(self.attachNavListeners, self.qExecOnLoadError)
        .then(deferred.resolve, deferred.reject);
        return deferred.promise;
    };

    var exitProgramListenerName = 'presenter-framework-notifier';
    function programExitListener() {
        var defered = q.defer();

        function onSucc() {
            console.log('Finished saving successfully');
            defered.resolve();
        }
        function onErr(err) {
            console.log('Got an error saving',err);
            defered.resolve();
        }
        // Save module startup data & always finish successfully.
        self.saveModuleStartupData('programExitListener')
        .then(onSucc, onErr);

        return defered.promise;
    }
    function addProgramExitListener() {
        try {
            global.ADD_K3_EXIT_LISTENER(exitProgramListenerName, programExitListener);
        } catch(err) {
            console.log('presenter_framework.js addProgramExitListener err', err);
        }
    }
    function removeProgramExitListener() {
        try {
            DELETE_K3_EXIT_LISTENER(exitProgramListenerName);
        } catch(err) {
            console.log('presenter_framework.js removeProgramExitListener err', err);
        }
    }

    this.runFramework = function() {
        var deferred = q.defer();
        var handleError = function(details) {
            var innerDeferred = q.defer();
            console.error('Presenter_Framework, runFramework Error:', details);
            deferred.reject(details);
            innerDeferred.resolve();
            return innerDeferred.promise;
        };
        var checkFirstDevice = function() {
            var innerDeferred = q.defer();
            // self.jquery.checkFirstDeviceRadioButton();
            innerDeferred.resolve();
            return innerDeferred.promise;
        };
        var setModuleName = function() {
            var innerDeferred = q.defer();
            self.incrementNumberOfModuleReloads();
            self.saveModuleName();
            innerDeferred.resolve();
            return innerDeferred.promise;
        };

        // Add exit listener.
        addProgramExitListener();

        checkFirstDevice()

        // Save the module's current instance name
        .then(setModuleName, self.qExecOnLoadError)

        // Update the currently-active device (This will force a valid device to be selected).
        .then(self.qUpdateActiveDevice, self.qExecOnLoadError)

        // Report that a new device has been selected
        .then(self.qExecOnDeviceSelected, self.qExecOnLoadError)

        // Clear all config-bindings (if not disabled)
        .then(self.qClearConfigBindings, self.qExecOnLoadError)

        // Re-configure any smartBindings
        .then(self.qUpdateSmartBindings, self.qExecOnLoadError)

        // Configure the device
        .then(self.executeSetupBindings, self.qExecOnLoadError)

        // Report that the device has been configured
        .then(self.qExecOnDeviceConfigured, self.qExecOnLoadError)

        // Render the module's template
        .then(self.qRenderModuleTemplate, self.qExecOnLoadError)

        // Connect connect any established writeBindings to jquery events
        .then(self.qEstablishWriteBindings, self.qExecOnLoadError)

        // Report that the module's template has been loaded
        .then(self.qExecOnTemplateLoaded, self.qExecOnLoadError)

        // Start the DAQ loop
        .then(self.qStartLoop, self.qExecOnLoadError)

        // Display the module's template
        .then(self.qShowUserTemplate, self.qExecOnLoadError)

        // Report that the module's template has been displayed
        .then(self.qExecOnTemplateDisplayed, self.qExecOnLoadError)

        // Re-draw the window to prevent window-disapearing issues
        .then(qRunRedraw, self.qExecOnLoadError)

        .then(deferred.resolve, deferred.reject);
        return deferred.promise;


    };
    this.manageLJMError = function(errNum) {
        var isHandled = false;
        // Error for old firmware version...
        if (errNum === 1307) {
            showAlert('Current Device Firmware Version Not Supported By This Module');
            isHandled = true;
        }
        return isHandled;
    };
    var manageLJMError = this.manageLJMError;

    this.manageError = function(err) {
        showAlert('Error: '+err.toString());
    };
    var manageError = this.manageError;

    this.saveStartupDataReference = function(newStartupData) {
        self.startupData = undefined;
        self.isStartupDataValid = false;
        if(newStartupData) {
            try {
                self.startupData = JSON.parse(JSON.stringify(newStartupData));
                self.isStartupDataValid = true;
            } catch(err) {
                console.error(
                    'presenter_framework: Error Copying startupData object',
                    err
                );
                self.startupData = {};
                self.isStartupDataValid = false;
            }
        }
    };
    this.saveModuleInfo = function (infoObj, constantsObj, moduleObj, moduleDataObj) {
        self.moduleData = moduleDataObj;
        moduleData = moduleDataObj;
        self.saveModuleName();
        self.moduleInfoObj = infoObj; // The module.json file obj
        moduleInfoObj = infoObj;
        self.moduleConstants = constantsObj; // The moduleConstants.json file obj
        moduleConstants = constantsObj;
        self.module = moduleObj;  // A reference to the created module
        module = moduleObj;


        self.startupData = undefined;
        self.isStartupDataValid = false;


        self.frameworkType = infoObj.framework;
        frameworkType = infoObj.framework;

        if(infoObj.framework_flags) {
            if(infoObj.framework_flags.debug_framework) {
                self.flags.debug_startup = true;
            }
        }

        try {
            self.deviceErrorCompiledTemplate = handlebars.compile(
                moduleDataObj.htmlFiles.device_errors_template
            );
            self.printableDeviceErrorCompiledTemplate = handlebars.compile(
                moduleDataObj.htmlFiles.printable_device_errors_template
            );
        } catch(err) {
            console.error('Error compiling deviceErrors template', err);
        }
    };
    this.killInstance = function () {
        self.frameworkActive = false;
    };
    var killInstance = this.killInstance;
}

util.inherits(Framework, EventEmitter);
