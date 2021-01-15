/* jshint undef: true, unused: true, undef: true */
/* jshint strict: false */
/* global global, require, console, handlebars, $ */
/* global showAlert, showCriticalAlert, showInfoMessage */
/* global TASK_LOADER */
/* global KEYBOARD_EVENT_HANDLER */

// Flags
/* global DISABLE_AUTO_CLEAR_CONFIG_BINDINGS */

/**
 * Event driven framework for easy module construction.
 *
 * @author: Chris Johnson (LabJack, 2014)
 * @author: Sam Pottinger (LabJack, 2014)
**/

const EventEmitter = require('events').EventEmitter;
const util = require('util');
const async = require('async');
const sprintf = require('sprintf-js').sprintf;

const package_loader = global.package_loader;
const gui = package_loader.getPackage('gui');
const io_manager = package_loader.getPackage('io_manager');
const module_manager = package_loader.getPackage('module_manager');
const modbus_map = require('ljswitchboard-modbus_map').getConstants();

const fs_facade = package_loader.getPackage('fs_facade');
const ljmmm_parse = require('ljmmm-parse');

ljmmm_parse.expandLJMMMNameSync = function (name) {
    return ljmmm_parse.expandLJMMMEntrySync(
        {name: name, address: 0, type: 'FLOAT32'}
    ).map(function (entry) { return entry.name; });
};

const FADE_DURATION = 400;
const DEFAULT_REFRESH_RATE = 1000;
const CONFIGURING_DEVICE_TARGET = '#sd-framework-configuring-device-display';
const DEVICE_VIEW_TARGET = '#device-view';
const CALLBACK_STRING_CONST = '-callback';

/**
 * Creates a new binding info object with the metadata copied from another.
 *
 * Creates a new binding info object, a structure with all of the information
 * necessary to bind a piece of the module GUI to a register / registers on
 * a LabJack device. This will copy the "metadata" from an existing binding
 * into a new one. Namely, it will re-use original's class, direction, and
 * event attributes but add in new binding and template values.
 *
 * @param {Object} original The object with the original binding information.
 * @param {String} binding The register name to bind the GUI element(s) to.
 *      If given an LJMMM string, will be expanded and all registers named after
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
    const expandedBindingClasses = ljmmm_parse.expandLJMMMName(bindingInfo.bindingClass);
    const expandedBindings = ljmmm_parse.expandLJMMMName(bindingInfo.binding);
    const expandedTemplates = ljmmm_parse.expandLJMMMName(bindingInfo.template);

    if (expandedBindings.length !== expandedTemplates.length) {
        throw 'Unexpected ljmmm expansion mismatch.';
    }

    var newBindingsInfo = [];
    var numBindings = expandedBindings.length;
    for (let i = 0; i < numBindings; i++) {
        const clone = cloneBindingInfo(
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

    if (expandedBindingClasses.length !== expandedBindings.length) {
        throw 'Unexpected ljmmm expansion mismatch.';
    }

    var newBindingsInfo = [];
    var numBindings = expandedBindings.length;

    for (let i = 0; i < numBindings; i++) {
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
    runRedraw();
    return Promise.resolve();
}

/**
 * Function to render device error data
*/
function extrapolateDeviceErrorData(data) {
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

    // List of events that the framework handles
    const defaultEntries = {
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
        onRefreshError: null
    };
    const eventListener = new Map();
    for (const k in defaultEntries) {
        eventListener.set(k, defaultEntries[k]);
    }

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

    var bindings = new Map();
    var readBindings = new Map();
    var writeBindings = new Map();
    var smartBindings = new Map();

    var setupBindings = new Map();
    var readSetupBindings = new Map();
    var writeSetupBindings = new Map();

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
    this.frameworkActive = true;

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
    const moduleStartTimeObj = new Date();
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
    const self = this;
    this.reportSyntaxError = function(location, err) {
        console.error('Error in:', location);
        console.error('Error obj', err);
        showCriticalAlert(err.toString());
    };
    this.enableLoopTimingAnalysis = function() {
        self.sdFrameworkDebugTiming = true;
    };
    this.enableLoopMonitorAnalysis = function() {
        self.sdFrameworkDebugDAQLoopMonitor = true;
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
        let selector = getConnectedDeviceInfoJquerySelector(
            serialNumber,
            '.device-selector-table-status'
        );

        if (extra) {
            if(Array.isArray(extra)) {
                const extraData = extra.join(' ');
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

        elements.badge = $(getDeviceErrorJquerySelector(
            serialNumber,
            ['.module-chrome-tab-badge', '.badge']
        ));
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
    function deviceDisconnectedEventListener(data) {
        // console.warn('Device Disconnected', data);
        self.emit('FRAMEWORK_HANDLED_DEVICE_DISCONNECTED', data);
        if(data.serialNumber) {
            var sn = data.serialNumber;
            if(self.deviceErrorControls[sn]) {
                // Indicate that the device is no longer connected
                self.deviceErrorControls[sn].updateConnectionStatus(false);
            }
        }
    }

    function deviceReconnectedEventListener(data) {
        // console.warn('Device Reconnected', data);
        self.emit('FRAMEWORK_HANDLED_DEVICE_RECONNECTED', data);
        if(data.serialNumber) {
            var sn = data.serialNumber;
            if(self.deviceErrorControls[sn]) {
                // Indicate that the device is connected
                self.deviceErrorControls[sn].updateConnectionStatus(true);
            }
        }
    }

    function deviceErrorEventListener(data) {
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
    }

    function deviceReconnectingEventListener(data) {
        console.warn('Device Reconnecting', data);
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
    }
    function deviceAttributesChangedEventListener(data) {
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
        console.log('detachDeviceStatusListeners');
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

            buildDeviceErrorControls(sn);
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

    this.getActiveDevices = function() {
        return self.activeDevices;
    };

    this._SetActiveDevice = function(newActiveDevice) {
        activeDevice = newActiveDevice;
        self.activeDevice = newActiveDevice;
    };

    this.getActiveDevice = function() {
        return self.activeDevice;
    };
    var getActiveDevice = this.getActiveDevice;

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
                    // 'moduleData: ', self.moduleData,
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

    /**
     * Function deletes various 'window.' objects that need to be removed in
     * order for module to behave properly when switching tabs.
     * @param  {Array} moduleLibraries Array of string "window.xxx" calls that
     *      need to be deleted, (delete window.xxx) when a module gets unloaded.
     */
    this.unloadModuleLibraries = function(moduleLibraries) {
        if(moduleLibraries !== undefined) {
            moduleLibraries.forEach(function(element){
                var delStr = 'delete ' + element;
                try{
                    eval(delStr);
                } catch(err) {
                    console.error('presenter_framework Error Deleting Element',element);
                }
            });
        }
    };

    this.getExitFuncs = async function(curState) {
        if(curState === 'onModuleLoaded') {
            return self.qExecOnUnloadModule();
        } else if(curState === 'onDeviceSelected') {
            return self.qExecOnCloseDevice()
                .then(self.qExecOnUnloadModule, self.qExecOnUnloadModule);
        } else if(curState === 'onLoadError') {
            return Promise.reject();
        } else {
            return self.qExecOnCloseDevice()
                .then(self.qExecOnUnloadModule, self.qExecOnUnloadModule);
        }
    };

    this.convertBindingsToDict = function() {
        return self.moduleTemplateBindings;
    };

    this.qHideUserTemplate = function() {
        return new Promise((resolve) => {
            self.jquery.fadeOut(
                DEVICE_VIEW_TARGET,
                FADE_DURATION,
                function() {
                    self.jquery.fadeIn(
                        CONFIGURING_DEVICE_TARGET,
                        FADE_DURATION,
                        resolve
                    );
                }
            );
        });
    };

    this.qShowUserTemplate = function() {
        return new Promise((resolve) => {
            self.jquery.fadeOut(
                CONFIGURING_DEVICE_TARGET,
                FADE_DURATION,
                function(){
                    self.jquery.fadeIn(
                        DEVICE_VIEW_TARGET,
                        FADE_DURATION,
                        resolve
                    );
                }
            );
        });
    };

    this.saveModuleStartupDataReference = function(newStartupData) {
        self.saveStartupDataReference(newStartupData);
        return Promise.resolve();
    };
    this.resetModuleStartupData = function() {
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
        return module_manager.revertModuleStartupData(moduleName)
            .then(module_manager.getModuleStartupData)
            .then(self.saveModuleStartupDataReference);
    };
    this.saveModuleStartupData = function(callerInfo) {
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
                return Promise.resolve();
            };

            return self.qExecVerifyStartupData('saveStartupData')
            .then(innerSaveStartupData)
            .then(reportSavedStartupData);
        } else {
            if(self.DEBUG_STARTUP_DATA) {
                console.info(
                    'presenter_framework: not saving startupData',
                    callerInfo,
                    moduleName,
                    saveReasons
                );
            }
            return Promise.resolve();
        }
    };
    this.qExecVerifyStartupData = function(callerData) {
        return new Promise((resolve, reject) => {
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
                    .then(resolve, reject);
            };
            var finishSuccessfully = function() {
                resolve();
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
                    .then(reject, reject);
            }
        });
    };
    this.initializeStartupData = function() {
        var moduleName = self.currentModuleName;
        var executeVerifyStartupData = function() {
            return self.qExecVerifyStartupData('initializeStartupData');
        };

        return module_manager.getModuleStartupData(moduleName)
            .then(self.saveModuleStartupDataReference)
            .then(executeVerifyStartupData);
    };
    this.qExecOnModuleLoaded = function() {
        return new Promise((resolve, reject) => {
            if (self.allowModuleExecution) {
                self.fire(
                    'onModuleLoaded',
                    [],
                    (err) => reject(err),
                    function () {
                        self.isModuleLoaded = true;
                        resolve();
                    }
                );
            } else {
                return self.getExitFuncs('onModuleLoaded');
            }
        });
    };

    this.qExecOnDeviceSelected = function() {
        return new Promise((resolve, reject) => {
            if (self.allowModuleExecution) {
                self.fire(
                    'onDeviceSelected',
                    [self.smartGetSelectedDevices()],
                    (err) => reject(err),
                    function () {
                        self.isDeviceOpen = true;
                        resolve();
                    }
                );
            } else {
                return self.getExitFuncs('onDeviceSelected');
            }
        });
    };

    this.qExecOnDeviceConfigured = function(data) {
        return new Promise((resolve, reject) => {
            if (self.allowModuleExecution) {
                self.fire(
                    'onDeviceConfigured',
                    [self.smartGetSelectedDevices(), data],
                    (err) => reject(err),
                    (res) => resolve(res)
                );
            } else {
                return self.getExitFuncs('onDeviceConfigured');
            }
        });
    };

    this.qExecOnTemplateDisplayed = function() {
        return new Promise((resolve, reject) => {
            if (self.allowModuleExecution) {
                var rejectFunc = function (data) {
                    reject(data);
                };
                var resolveFunc = function (data) {
                    KEYBOARD_EVENT_HANDLER.initInputListeners();
                    resolve(data);
                };
                try {
                    self.fire(
                        'onTemplateDisplayed',
                        [],
                        rejectFunc,
                        resolveFunc
                    );
                } catch (err) {
                    if (err.name === 'SyntaxError') {
                        console.error('Syntax Error captured');
                    }
                    console.error('Error caught in qExecOnTemplateDisplayed', err);
                }
            } else {
                return self.getExitFuncs('onTemplateDisplayed');
            }
        });
    };

    this.qExecOnTemplateLoaded = function() {
        return new Promise((resolve, reject) => {
            if (self.allowModuleExecution) {
                var rejectFunc = function (data) {
                    reject(data);
                };
                var resolveFunc = function (data) {
                    resolve(data);
                };
                try {
                    self.fire(
                        'onTemplateLoaded',
                        [],
                        rejectFunc,
                        resolveFunc
                    );
                } catch (err) {
                    if (err.name === 'SyntaxError') {
                        console.error('Syntax Error captured');
                    }
                    console.error('Error caught in qExecOnTemplateLoaded', err);
                }
            } else {
                return self.getExitFuncs('onTemplateLoaded');
            }
        });
    };

    this.qExecOnCloseDevice = function() {
        var device = self.smartGetSelectedDevices();
        // Detach device event emitters
        detachDeviceStatusListeners();
        return new Promise((resolve, reject) => {
            var finishSuccess = function (data) {
                var continueExec = function () {
                    resolve(data);
                };

                self.saveModuleStartupData('qExecOnCloseDevice-suc')
                    .then(continueExec, continueExec);
            };
            var finishError = function (data) {
                var continueExec = function () {
                    reject(data);
                };

                self.saveModuleStartupData('qExecOnCloseDevice-err')
                    .then(continueExec, continueExec);
            };
            if (self.isDeviceOpen) {
                if (self.allowModuleExecution) {
                    self.fire(
                        'onCloseDevice',
                        [device],
                        finishError,
                        finishSuccess
                    );
                } else {
                    var finishExecution = function () {
                        self.isDeviceOpen = false;
                        self.qExecOnUnloadModule()
                            .then(finishError, finishError);
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
                reject();
            }
        });
    };

    this.qExecOnLoadError = function(err) {
        return new Promise((resolve) => {

            if (self.allowModuleExecution) {
                self.fire(
                    'onLoadError',
                    [
                        [err],
                        function (shouldContinue) {
                            self.runLoop = shouldContinue;
                            resolve();
                        }
                    ]
                );
            } else {
                return self.getExitFuncs('onLoadError');
            }
        });
    };

    this.qExecOnUnloadModule = function() {
        return new Promise((resolve, reject) => {
            if (self.isModuleLoaded) {
                var finishError = function (data) {
                    var continueExec = function () {
                        reject(data);
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
                if (self.ljmDriverLogEnabled) {
                    console.info('disabling LJM-log');
                    console.info('File:', self.ljmDriver.readLibrarySync('LJM_DEBUG_LOG_FILE'));
                    self.ljmDriver.writeLibrarySync('LJM_DEBUG_LOG_MODE', 1);
                    self.ljmDriver.writeLibrarySync('LJM_DEBUG_LOG_LEVEL', 10);
                    self.ljmDriverLogEnabled = false;
                }

                //Inform the module that it has been unloaded.
                self.fire(
                    'onUnloadModule',
                    [],
                    finishError,
                    function () {
                        // Detach Device Listeners
                        detachDeviceStatusListeners();

                        self.isModuleLoaded = false;
                        self.saveModuleStartupData('qExecOnUnloadModule-suc')
                            .then(resolve, resolve);
                    }
                );
            } else {
                resolve();
            }
        });
    };

    this.qRenderModuleTemplate = function() {
        return self.setDeviceView(
            self.userViewFile,
            self.moduleJsonFiles,
            self.convertBindingsToDict()
        );
    };

    var innerUpdateActiveDevice = function(data) {
        return device_controller.getSelectedDevice()
            .then(function(activeDevice) {
                data.activeDevice = activeDevice;
                return Promise.resolve(data);
            });
    };
    var innerGetDeviceListing = function(data) {
        var filters;
        if(self.moduleData.data.supportedDevices) {
            filters = self.moduleData.data.supportedDevices;
        }
        return device_controller.getDeviceListing(filters)
            .then(function(deviceListing) {
                data.deviceListing = deviceListing;
                return Promise.resolve(data);
            });
    };
    var innerGetDeviceObjects = function(data) {
        var filters;
        if(self.moduleData.data.supportedDevices) {
            filters = self.moduleData.data.supportedDevices;
        }

        return device_controller.getDevices(filters)
            .then(function(devices) {
                data.activeDevices = devices;
                return Promise.resolve(data);
            });
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
        return new Promise((resolve) => {
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
                if (!activeDev.savedAttributes) return;
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
                resolve();
            }
            function repeatCallOnSuccess() {
                console.log('Repeating Execution of getting active device info...');
                self.qUpdateActiveDevice().then(finishFunc, finishFunc);
            }
            // End of sloppy code warning...
            if(!foundActiveDevice) {
                // Did not find an active device
                if(self.frameworkType === 'multipleDevices') {
                    console.warn('Not sure what to do... presenter_framework.js - updateSelectedDeviceList');
                    finishFunc();
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
                    getSmartSaveSelectedDevices(activeDevSN)().then(repeatCallOnSuccess, finishFunc());
                }

            } else {
                finishFunc();
            }

        });
    };
    this.qUpdateActiveDevice = function() {
        var data = {
            'activeDevice': undefined,      // is populated by func "innerUpdateActiveDevice".
            'deviceListing': undefined,     // is populated by func "innerGetDeviceListing".
            'activeDevices': undefined,     // is populated by func "innerGetDeviceObjects".
        };
        return innerUpdateActiveDevice(data)
            .then(innerGetDeviceListing)
            .then(innerGetDeviceObjects)
            .then(updateSelectedDeviceList);
    };

    /**
     * Set how frequently the framework should read from the device.
     *
     * @param {int} newRefreshRate The number of milliseconds between updates.
    **/
    this.setRefreshRate = function (newRefreshRate) {
        self.refreshRate = newRefreshRate;
    };

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

    this.qEstablishWriteBindings = function() {
        self.establishWriteBindings(self.writeBindings);
        return Promise.resolve();
    };

    this.establishWriteBindings = function(bindings) {
        bindings.forEach(function(binding){
            self.establishWriteBinding(binding);
        });
    };

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

    this.putSmartBindings = function(newSmartBindings) {
        newSmartBindings.forEach(function(newSmartBinding) {
            self.putSmartBinding(newSmartBinding);
        });
    };

    this.qUpdateSmartBindings = function() {
        self.smartBindings.forEach(function(smartBinding) {
            self.putSmartBinding(smartBinding);
        });
        return Promise.resolve();
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
        self.smartBindings.forEach(function(smartBinding) {
            names[names.length] = smartBinding.smartName;
        });
        self.deleteSmartBindings(names);
        self.smartBindings = new Map();
        self.setupBindings = new Map();
    };
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
        // Function for executing user-callback
        function executeCallback (binding, result) {
            return new Promise((resolve) => {
                if (binding.execCallback) {
                    binding.callback(
                        {
                            framework: self,
                            module: self.module,
                            device: self.getSelectedDevice(),
                            binding: binding,
                            value: result.result,
                            result: result
                        },
                        function () {
                            resolve();
                        }
                    );
                } else {
                    resolve();
                }
            });
        }
        // Function for saving successful write i/o attempts
        function createSuccessfulWriteFunc (resolve, reject, binding, results) {
            return function () {
                var result = {
                    status: 'success',
                    result: -1,
                    formattedResult: '-1',
                    address: binding.binding
                };
                results.set(binding.bindingClass, result);
                executeCallback(binding,result)
                .then(resolve, resolve);
            };
        }

        // Function for saving failed write i/o attempts
        function createFailedWriteFunc(resolve, reject, binding, results) {
            return function (error) {
                var result = {
                    status: 'error',
                    result: error,
                    formattedResult: null,
                    address: binding.binding
                };
                results.set(binding.bindingClass, result);
                executeCallback(binding,result)
                .then(resolve, reject);
            };
        }

        // Function for saving successful read i/o attempts
        function createSuccessfulReadFunc(resolve, reject, binding, results) {
            return function (value) {
                value = value.val;
                var formattedValue = '';
                var curFormat = binding.format;
                if(typeof(value) === 'number') {
                    if(curFormat !== 'customFormat') {
                        if(isNaN(value)) {
                            formattedValue = value;
                        } else {
                            formattedValue = sprintf(curFormat, value);
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
                .then(resolve, reject);
            };
        }

        // Function for saving failed read i/o attempts
        function createFailedReadFunc(resolve, reject, binding, results) {
            return function (error) {
                // console.log('Error on Read',error);
                var result = {
                    status: 'error',
                    result: error,
                    formattedResult: null,
                    address: binding.binding
                };
                results.set(binding.bindingClass, result);
                executeCallback(binding,result).then(resolve, reject);
            };
        }

        // Function that creates future device I/O operations to be executed
        function createFutureDeviceIOOperation (binding, results) {
            return function() {
                //Create execution queue
                return new Promise((resolve, reject) => {
                    var device = self.getSelectedDevice();

                    //Create various read/write functions
                    var successfulWriteFunc = createSuccessfulWriteFunc(
                        resolve,
                        reject,
                        binding,
                        results
                    );
                    var failedWriteFunc = createFailedWriteFunc(
                        resolve,
                        reject,
                        binding,
                        results
                    );
                    var successfulReadFunc = createSuccessfulReadFunc(
                        resolve,
                        reject,
                        binding,
                        results
                    );
                    var failedReadFunc = createFailedReadFunc(
                        resolve,
                        reject,
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
                });
            };
        }

        // Function that creates the IO execution queue
        function createDeviceIOExecutionQueue (bindings, results) {
            // Execution queue
            var bindingList = [];

            // Populating the execution queue
            bindings.forEach(function (binding) {
                bindingList.push(createFutureDeviceIOOperation(
                    binding,
                    results
                ));
            });
            return bindingList;
        }

        // Function that executes the device setup commands
        function executeDeviceSetupQueue (bindings) {
            return new Promise((resolve) => {
                var results = new Map();

                var executionQueue = createDeviceIOExecutionQueue(
                    bindings,
                    results
                );

                //Execute the created execution queue of device IO commands
                async.eachSeries(
                    executionQueue,
                    function (request, callback) {
                        var successFunc = function () {
                            // console.log('eachSeries Success')
                            callback();
                        };
                        var errorFunc = function (err) {
                            // console.log('eachSeries Err',err);
                            callback(err);
                        };

                        request().then(successFunc, errorFunc);
                    },
                    function () {
                        // console.log('eachSeries Callback',err);
                       resolve(results);
                    });
            });
        }

        return executeDeviceSetupQueue(self.setupBindings);
    };

    this._writeToDevice = function (bindingInfo, eventData) {
        var jquerySelector = '#' + bindingInfo.template;
        var newVal = self.jquery.val(jquerySelector);

        var alertRegisterWrite = function () {
            return new Promise((resolve, reject) => {
                self.fire(
                    'onRegisterWrite',
                    [
                        bindingInfo,
                        newVal
                    ],
                    reject,
                    resolve
                );
            });
        };

        var performCallbacks = function(skipWrite) {
            return new Promise((resolve) => {
                var callbackString = CALLBACK_STRING_CONST;
                var baseStr = bindingInfo.binding;
                var searchIndex = baseStr.search(callbackString);
                if (searchIndex >= 0) {
                    if ((baseStr.length - searchIndex - callbackString.length) === 0) {
                        if (bindingInfo.execCallback) {
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
                                    function () {
                                        resolve(skipWrite, true);
                                    });
                            } catch (e) {
                                self.reportSyntaxError(
                                    {
                                        'location': '_writeToDevice.performCallbacks',
                                        data: {binding: bindingInfo, eventData: eventData}
                                    }, e);
                                resolve(skipWrite, true);
                            }
                        } else {
                            resolve(skipWrite, false);
                        }
                    }
                } else {
                    if (bindingInfo.execCallback) {
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
                                function () {
                                    resolve(skipWrite, false);
                                });
                        } catch (e) {
                            self.reportSyntaxError(
                                {
                                    'location': '_writeToDevice.performCallbacks(2)',
                                    data: {binding: bindingInfo, eventData: eventData}
                                }, e);
                            resolve(skipWrite, false);
                        }
                    } else {
                        resolve(skipWrite, false);
                    }
                }
            });
        };

        var writeToDevice = function (skipWrite, skip) {
            if(skip) {
                var device = self.getSelectedDevice();
                var invalidString = '-invalid';
                var baseStr = bindingInfo.binding;
                var searchIndex = baseStr.search(invalidString);
                if( searchIndex >= 0) {
                    if((baseStr.length - searchIndex - invalidString.length) === 0) {
                        return Promise.resolve(false);
                    }
                }
                if(typeof(skipWrite) === undefined) {
                    device.write(bindingInfo.binding, newVal);
                    return Promise.resolve(true);
                } else if(typeof(skipWrite) === "boolean") {
                    if(skipWrite === false) {
                        device.write(bindingInfo.binding, newVal);
                        return Promise.resolve(true);
                    }
                    else {
                        return Promise.resolve(false);
                    }
                } else {
                    return Promise.resolve(false);
                }
            } else {
                return Promise.resolve(false);
            }
        };

        var alertRegisterWritten = function (wasNotHandledExternally) {
            if(wasNotHandledExternally) {
                return new Promise((resolve, reject) => {
                    self.fire(
                        'onRegisterWritten',
                        [
                            bindingInfo.binding,
                            newVal
                        ],
                        reject,
                        resolve
                    );
                });
            }
        };

        // Alert to module that a write is about to happen
        return alertRegisterWrite()
            // Perform callback if necessary
            .then(performCallbacks)
            // Perform un-handled device IO
            .then(writeToDevice)
            // Notify module that the write has finished
            .then(alertRegisterWritten)
            // Re-draw the window to prevent crazy-window issues
            .then(qRunRedraw);
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
        bindings = new Map();
        readBindings = new Map();
        writeBindings = new Map();
        moduleTemplateBindings = {};

        self.bindings = bindings;
        self.readBindings = readBindings;
        self.writeBindings = writeBindings;
        self.moduleTemplateBindings = moduleTemplateBindings;
    };
    this.qClearConfigBindings = function() {
        var clearBindings = true;
        if(typeof(DISABLE_AUTO_CLEAR_CONFIG_BINDINGS) === 'boolean') {
            if(DISABLE_AUTO_CLEAR_CONFIG_BINDINGS) {
                clearBindings = false;
            }
        }
        if(clearBindings) {
            self.clearConfigBindings();
        }
        return Promise.resolve();
    };

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
            jsonTemplateVals = self.moduleData.json;
            return Promise.resolve();
        };

        // Load the HTML view template and render
        var prepareHTMLTemplate = function () {
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
            return fs_facade.renderCachedTemplateData(
                cacheKey,
                self.moduleData.htmlFiles.view,
                context
            );
        };

        var injectHTMLTemplate = function (htmlContents) {
            htmlContents = '<div class="framework-template">' + htmlContents + '</div>';
            self.jquery.html(DEVICE_VIEW_TARGET, htmlContents);
            $('.framework-template').ready(runRedraw);

            return Promise.resolve();
        };

        var attachListeners = function () {
            if(self.deviceSelectionListenersAttached === false) {
                self.jquery.on(
                    self.getDeviceSelectorClass(),
                    'click',
                    self._changeSelectedDeviceUI
                );
                self.deviceSelectionListenersAttached = true;
                deviceSelectionListenersAttached = true;
            }
            return Promise.resolve();
        };

        return loadJSONFiles()
            .then(prepareHTMLTemplate, reportLoadError)
            .then(injectHTMLTemplate, reportLoadError)
            .then(attachListeners, reportLoadError);
    };

    var getSaveSelectedDevice = function(serialNumber) {
        var saveSelectedDevice = function() {
            return device_controller.selectDevice(serialNumber);
        };
        return saveSelectedDevice;
    };
    var getSaveSelectedDevices = function(serialNumbers) {
        var saveSelectedDevices = function() {
            return device_controller.selectDevices(serialNumbers);
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

    this._changeSelectedDeviceUI = function() {
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

    /**
     * Stop the module's refresh loop.
    **/
    this.stopLoop = function () {
        self.runLoop = false;
    };

    this.qStopLoop = function() {
        return new Promise((resolve) => {
            self.runLoop = false;
            if (self.frameworkLoopProcessing) {
                // console.log('framework loop is currently processing (qStopLoop)...');
                clearTimeout(self.frameworkLoopReference);
                var num = 0;
                var checkDAQLoop = function () {
                    // console.log('Delaying (qStopLoop)....', num);
                    num += 1;
                    if (self.isDAQLoopActive) {
                        setTimeout(checkDAQLoop, 100);
                    } else {
                        resolve();
                    }
                };
                setTimeout(checkDAQLoop, 100);
            } else {
                resolve();
            }
        });
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
    self.qStartLoop = function() {
        self.startLoop();
        return Promise.resolve();
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
        if(!self.frameworkActive) {
            return Promise.reject();
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
        return Promise.resolve();
    };

    this.unpauseFramework = function() {
        self.isDAQLoopPaused = false;
    };
    this.pauseFramework = function(pauseNotification) {
        self.pauseDAQLoop = true;
        self.isPausedListenerFunc = pauseNotification;
        return function() {
            self.isDAQLoopPaused = false;
        };
    };
    this.testPauseFramework = function() {
        self.pauseFramework(
            function() {
                console.info('Framework is paused!');
                self.unpauseFramework();
            }
        );
    };

    var reportStartingDaqLoop = function() {
        self.daqLoopFinished = false;
        self.daqLoopStatus = 'startingLoop';
        return Promise.resolve();
    };
    var reportFinishedDaqLoop = function(data) {
        return new Promise((resolve) => {
            var finishedFunc = function () {
                self.daqLoopFinished = true;
                self.daqLoopStatus = 'finishedDaqLoop';
                resolve();
            };
            var executeFinishedFunc = true;
            if (data) {
                // console.log('DAQ Loop Finished', data);
                if (data === 'delay') {
                    executeFinishedFunc = false;
                    try {
                        triggerModuleOnRefreshed([])
                            .then(finishedFunc, finishedFunc);
                    } catch (err) {
                        console.error('Error in reportFinishedDaqLoop', err);
                        finishedFunc();
                    }
                } else {
                    // console.log('DAQ Loop Finished', data);
                }
            }

            if (executeFinishedFunc) {
                finishedFunc();
            }
        });
    };
    var getNeededAddresses = function () {
        return new Promise((resolve, reject) => {
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
                if (value.currentDelay <= 0) {
                    // Search bindings for custom bindings
                    var callbackString = CALLBACK_STRING_CONST;
                    var baseStr = value.binding;
                    var searchIndex = baseStr.search(callbackString);
                    if (searchIndex < 0) {
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
            if (addresses.length > 0) {
                resolve({
                    addresses: addresses,
                    formats: formats,
                    customFormatFuncs: customFormatFuncs,
                    bindings: bindings
                });
            } else {
                reject('delay');
            }
        });
    };
    var triggerModuleOnRefresh = function (bindingsInfo) {
        return new Promise((resolve, reject) => {
            self.daqLoopStatus = 'triggerModuleOnRefresh';
            self.fire(
                'onRefresh',
                [bindingsInfo],
                function () {
                    reject();
                },
                function () {
                    resolve(bindingsInfo);
                }
            );
        });
    };
    var requestDeviceValues = function (bindingsInfo) {
        return new Promise((resolve, reject) => {
            self.daqLoopStatus = 'requestDeviceValues';
            var device = self.getSelectedDevice();

            var addresses = bindingsInfo.addresses;
            var formats = bindingsInfo.formats;
            var customFormatFuncs = bindingsInfo.customFormatFuncs;
            var bindings = bindingsInfo.bindings;

            if (addresses.length === 0) {
                resolve({
                    values: [],
                    addresses: [],
                    formats: [],
                    customFormatFuncs: []
                });
            }
            device.sReadMany(addresses)
                .then(
                    function (values) {
                        resolve({
                            values: values,
                            addresses: addresses,
                            formats: formats,
                            customFormatFuncs: customFormatFuncs,
                            bindings: bindings
                        });
                    },
                    reject
                );

        });
    };

    var processDeviceValues = function (valuesInfo) {
        return new Promise((resolve) => {
            self.daqLoopStatus = 'processDeviceValues';
            var values = valuesInfo.values;
            var addresses = valuesInfo.addresses;
            var formats = valuesInfo.formats;
            var customFormatFuncs = valuesInfo.customFormatFuncs;
            var bindings = valuesInfo.bindings;
            var retDict = new Map();

            // Iterate through the bindings executed using the async library
            var curDeviceIOIndex = 0;

            const innerProcessSingleDeviceValue = function (binding, nextStep) {
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
                if (curResult) {
                    if (dataKey === '') {
                        curValue = curResult;
                    } else {
                        if (typeof (curResult[dataKey] !== 'undefined')) {
                            curValue = curResult[dataKey];
                        } else {
                            curValue = curResult.val;
                        }
                    }
                    curVal = curResult.res;
                }

                if (searchIndex < 0) {
                    //If the tag was not found then perform auto-formatting
                    var curFormat = formats[index];
                    var curCustomFormatFunc = customFormatFuncs[index];

                    if (curFormat !== 'customFormat') {
                        if (isNaN(curVal)) {
                            stringVal = curVal;
                        } else {
                            if (typeof (curVal) === 'number') {
                                stringVal = sprintf(curFormat, curVal);
                            } else {
                                if (curResult.str === '-Infinity') {
                                    stringVal = (NaN).toString();
                                } else if ((curResult.str === '+Infinity') || (curResult.str === 'Infinity')) {
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
                    if (binding.execCallback === false) {
                        console.warn('Warning, PeriodicFunction Found but not executing', binding);
                    }
                }
                // If the current binding has a defined binding that
                // needs to be executed execute it now
                if (binding.execCallback) {
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
                                'location': 'loopIteration.processDeviceValues',
                                data: {binding: binding, value: curValue, stringVal: stringVal}
                            }, e);
                        nextStep();
                    }
                } else {
                    //Instruct async to perform the next step
                    nextStep();
                }
            };

            async.eachSeries(
                bindings,
                function processSingleDeviceValue(binding, nextStep) {
                    try {
                        innerProcessSingleDeviceValue(binding, nextStep);
                    } catch (err) {
                        console.warn('Caught error while in processSingleDeviceValue', err);
                        nextStep();
                    }
                },
                function () {
                    //Executed when all bindings have been executed
                    resolve(retDict);
                });
        });
    };
    var displayDeviceValues = function (valuesDict) {
        self.daqLoopStatus = 'displayDeviceValues';
        self._OnRead(valuesDict);
        return Promise.resolve(valuesDict);
    };
    var triggerModuleOnRefreshed = function (valuesDict) {
        return new Promise((resolve, reject) => {
            self.daqLoopStatus = 'triggerModuleOnRefreshed';
            self.fire(
                'onRefreshed',
                [valuesDict],
                reject,
                function () {
                    resolve();
                }
            );
        });
    };
    function verifyFrameworkIsActive(bundle) {
        // Make sure that this framework instance is active.
        if(!self.frameworkActive) {
            self.isDAQLoopActive = false;
            return Promise.reject('stoppingLoop');
        }

        // Make sure that the loop should be executing.
        if (!self.runLoop) {
            self.isDAQLoopActive = false;
            return Promise.reject('stoppingLoop');
        }

        return Promise.resolve(bundle);
    }
    function reportLoopError(details) {
        return new Promise((resolve, reject) => {
            if(details !== 'delay') {
                if(details === 'stoppingLoop') {
                    return Promise.reject(details);
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
                                reject('delay');
                            } else {
                                reject('stoppingLoop');
                            }
                        }
                    );
                }
            } else {
                reject(details);
            }
        });
    }

    function innerRunDAQLoop(deviceAttributes) {
        // Only run the DAQ loop if the active device is connected.
        // if(deviceAttributes.isConnected) {
        if(deviceAttributes.isConnected) {
            return reportStartingDaqLoop()

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
            .then(reportFinishedDaqLoop, reportFinishedDaqLoop);
        } else {
            // Resolve & wait for the next iteration.
            return triggerModuleOnRefreshed([]);
        }
    }
    function configureLoopTimer() {
        self.frameworkLoopProcessing = false;
        self.frameworkLoopReference = setTimeout(
            self.runLoopIteration,
            self.refreshRate
        );
    }
    function configurePausedLoopTimer() {
        self.frameworkLoopProcessing = false;
        self.frameworkLoopReference = setTimeout(
            self.runLoopIteration,
            self.pausedRefreshRate
        );
        return Promise.resolve();
    }
    this.frameworkLoopProcessing = false;
    this.frameworkLoopReference = undefined;
    this.runLoopIteration = function() {
        self.frameworkLoopProcessing = true;
        // Make sure that this framework instance is active.
        if(!self.frameworkActive) {
            self.isDAQLoopActive = false;
        }

        // Make sure that the loop should be executing.
        if (!self.runLoop) {
            self.isDAQLoopActive = false;
        }

        if(self.isDAQLoopPaused) {
            // If the framework is paused then don't execute any of the update
            // code and configure a shorter timer.
            return verifyFrameworkIsActive().then(configurePausedLoopTimer)
                .catch(() => Promise.resolve());
        } else {
            const promises = [];
            promises.push(() => {
                return innerRunDAQLoop(self.activeDevice.savedAttributes);
            });

            return Promise.allSettled(promises)
                .then(() => {
                    return verifyFrameworkIsActive().then(configureLoopTimer)
                        .catch(() => Promise.resolve());
                });
        }
    };
    /**
     * Function to run a single iteration of the module's refresh loop.
     *
     * @return {Promise} Promise that resolves after the iteration of the
     *      refresh loop finishes running. Rejects if an error was encountered
     *      during the loop iteration.
    **/
    this.loopIteration = function () {
        // !!! DEPRECATED !!! Now uses "this.runLoopIteration" !!!!
        if(!self.frameworkActive) {
            return Promise.reject();
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
            return new Promise((resolve) => {
                if (self.pauseDAQLoop) {
                    // DAQ loop is paused
                    self.isDAQLoopPaused = true;
                    self.daqLoopStatus = 'loopPaused';
                    setTimeout(getIsPausedChecker(resolve),100);
                } else {
                    resolve();
                }
            });
        };
        var initLoopTimer = function() {
            self.daqLoopStatus = 'startingLoopMonitorTimer';
            clearTimeout(self.daqLoopMonitorTimer);
            self.daqLoopMonitorTimer = setTimeout(self.daqMonitor, 1000);
            return Promise.resolve();
        };
        if (!self.runLoop) {
            return Promise.reject('Loop not running.');
        }
        var checkModuleStatus = function(bindingsInfo) {
            self.daqLoopStatus = 'checkModuleStatus';
            self.daqLoopFinished = true;
            clearTimeout(self.daqLoopMonitorTimer);
            if (self.moduleName === self.getActiveTabID()) {
                return Promise.resolve(bindingsInfo);
            } else {
                return Promise.reject(bindingsInfo);
            }
        };
        var handleDelayErr = function (details) {
            self.daqLoopStatus = 'handleDelayErr';
            if(details === 'delay') {
                return Promise.resolve();
            } else {
                return Promise.resolve();
            }
        };
        var reportError = function(bundle) {
            console.error('in reportError (presenter_framework.js)');
            return Promise.reject(bundle);
        };
        var alertRefresh = function(bundle) {
            console.log('in alertRefresh (presenter_framework.js)');
            return Promise.resolve(bundle);
        };
        var alertRefreshed = function(bundle) {
            console.log('in alertRefreshed (presenter_framework.js)');
            return Promise.resolve(bundle);
        };
        var alertOn = function(bundle) {
            console.log('in alertOn (presenter_framework.js)');
            return Promise.resolve(bundle);
        };
        var handleIOError = function(bundle) {
            console.error('in handleIOError (presenter_framework.js)');
            return Promise.reject(bundle);
        };

        return pauseLoop()
            .then(initLoopTimer, reportError)
            .then(getNeededAddresses, reportError)
            .then(alertRefresh, reportError)
            .then(requestDeviceValues, handleIOError)
            .then(processDeviceValues, reportError)
            .then(alertOn, reportError)
            .then(alertRefreshed, reportError)
            .then(checkModuleStatus, handleDelayErr)
            .then(self.qConfigureTimer, self.qExecOnUnloadModule);
    };

    /**
     * Determine how many bindings have been registered for the module.
     *
     * @return {int} The number of bindings registered for this module.
    **/
    this.numBindings = function () {
        return self.bindings.size();
    };

    this._OnRead = function (valueReadFromDevice) {
        var jquery = self.jquery;
        if(valueReadFromDevice !== undefined) {
            self.readBindings.forEach(function updateEachValue(bindingInfo) {
                const bindingName = bindingInfo.binding;
                    try {
                    var valRead = valueReadFromDevice.get(bindingName.toString());
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
    this._OnConfigControlEvent = function (event) {
        self.fire('onRegisterWrite', [event]);
        self.fire('onRegisterWritten', [event]);
    };

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

    this.incrementNumberOfModuleReloads = function() {
        self.numModuleReloads += 1;
    };
    this.saveModuleName = function() {
        self.moduleName = self.getActiveTabID();
    };

    function fixElectron(data) {
        for (let k in data) {
            let v = data[k];
            if (v instanceof Map) { // Electron fix
                const obj = {};
                v.forEach((value, name) => {
                    obj[name] = fixElectron(value);
                });
                data[k] = obj;
            } else if (typeof v === 'object') {
                data[k] = fixElectron(v);
            }
        }
        return data;
    }

    this.setCustomContext = function(data) {
        moduleTemplateBindings.custom = data;
        self.moduleTemplateBindings.custom = fixElectron(data);
    };

    this.tabClickHandler = function() {
        const visibleTabs = self.jquery.get('.module-tab');
        visibleTabs.off('click.sdFramework'+self.moduleName);

        visibleTabs.off('click.sdFramework'+self.moduleName);
        self.qExecOnUnloadModule();
    };

    this.startFramework = function() {
        if(self.flags.debug_startup) {
            console.info('executing qExecOnModuleLoaded');
        }

        return self.initializeStartupData()
            .then(self.qExecOnModuleLoaded);
    };

    const exitProgramListenerName = 'presenter-framework-notifier';
    function programExitListener() {
        return new Promise((resolve) => {
            function onSucc() {
                console.log('Finished saving successfully');
                resolve();
            }
            function onErr(err) {
                console.log('Got an error saving',err);
                resolve();
            }
            // Save module startup data & always finish successfully.
            self.saveModuleStartupData('programExitListener')
                .then(onSucc, onErr);
        });
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
            global.DELETE_K3_EXIT_LISTENER(exitProgramListenerName);
        } catch(err) {
            console.log('presenter_framework.js removeProgramExitListener err', err);
        }
    }

    this.runFramework = function() {
        var checkFirstDevice = function() {
            return Promise.resolve();
        };
        var setModuleName = function() {
            self.incrementNumberOfModuleReloads();
            self.saveModuleName();
            return Promise.resolve();
        };

        // Add exit listener.
        addProgramExitListener();

        return checkFirstDevice()

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
            .then(qRunRedraw, self.qExecOnLoadError);
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

    this.manageError = function(err) {
        showAlert('Error: '+err.toString());
    };

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
}

util.inherits(Framework, EventEmitter);
global.Framework = Framework;
