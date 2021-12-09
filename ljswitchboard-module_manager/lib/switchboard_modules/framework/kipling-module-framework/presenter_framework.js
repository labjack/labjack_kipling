'use strict';

/* jshint undef: true, unused: true, undef: true */
/* jshint strict: false */
/* global global, require, console, handlebars, $ */
/* global showAlert, showCriticalAlert, showInfoMessage */
/* global TASK_LOADER */
/* global KEYBOARD_EVENT_HANDLER */

/**
 * Event driven framework for easy module construction.
 *
 * @author: Chris Johnson (LabJack, 2014)
 * @author: Sam Pottinger (LabJack, 2014)
**/

const EventEmitter = require('events').EventEmitter;
const async = require('async');
const sprintf = require('sprintf-js').sprintf;

const package_loader = global.package_loader;
const gui = package_loader.getPackage('gui');
const io_manager = package_loader.getPackage('io_manager');
const module_manager = package_loader.getPackage('module_manager');
const modbus_map = require('ljswitchboard-modbus_map').getConstants();

const fs_facade = package_loader.getPackage('fs_facade');
const ljmmm_parse = require('ljmmm-parse');

const FADE_DURATION = 400;
const DEFAULT_REFRESH_RATE = 1000;
const CONFIGURING_DEVICE_TARGET = '#sd-framework-configuring-device-display';
const DEVICE_VIEW_TARGET = '#device-view';
const CALLBACK_STRING_CONST = '-callback';

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
function cloneBindingInfo(original, bindingClass, binding, template) {
    try {
        return {
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
        return {};
    }
}

/**
 * Expands the LJMMM in the bindingClass, binding, and template names.
 *
 * Each binding info object has a binding attribute with the name of the
 * register on the device to bind from as well as a template attribute that
 * specifies the ID of the HTML element to bind to. So, binding AIN0 and
 * template analog-input-0 would bind the device register for AIN0 to
 * the HTML element with the id analog-input-0. This function will expand
 * LJMMM names found in either the template or binding attributes. Binding
 * AIN#(0:1) will expand to [AIN0, AIN1] and analog-input-#(0:1) will expand
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

    const newBindingsInfo = [];
    const numBindings = expandedBindings.length;
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
    try {
        return {
            bindingClass: bindingClass,
            binding: binding,
            direction: original.direction,
            defaultVal: original.defaultVal,
            execCallback: original.execCallback,
            callback: original.callback
        };
    } catch (err) {
        console.error('ERROR: ',err);
        return {};
    }
}

function expandSetupBindingInfo (bindingInfo) {
    const expandedBindingClasses = ljmmm_parse.expandLJMMMName(bindingInfo.bindingClass);
    const expandedBindings = ljmmm_parse.expandLJMMMName(bindingInfo.binding);

    if (expandedBindingClasses.length !== expandedBindings.length) {
        throw 'Unexpected ljmmm expansion mismatch.';
    }

    const newBindingsInfo = [];
    const numBindings = expandedBindings.length;

    for (let i = 0; i < numBindings; i++) {
        const clone = cloneSetupBindingInfo(
            bindingInfo,
            expandedBindingClasses[i],
            expandedBindings[i]
        );
        newBindingsInfo.push(clone);
    }

    return newBindingsInfo;
}

/**
 * Function to render device error data
*/
function extrapolateDeviceErrorData(err) {
    // Get the error description (if it exists);
    if (err.code === -1 && err.rawError) {
        err.code = err.rawError.code;
        err.description = err.rawError.description;
        err.name = err.rawError.name;
    } else {
        err.description = modbus_map.getErrorInfo(err.code).description;
    }

    // Format the "caller" information
    const callKeys = Object.keys(err.data);
    const callInfo = callKeys.map((callKey) => {
        return callKey + ': ' + JSON.stringify(err.data[callKey]);
    });
    err.callInfo = callInfo.join(', ');
    return err;
}

/**
 * Object that manages the modules using the Kipling Module Framework.
**/
class PresenterFramework extends EventEmitter {
    constructor() {
        super();

        // List of events that the framework handles
        this.eventListener = new Map();
        this.eventListener.set('verifyStartupData', null);
        this.eventListener.set('onModuleLoaded', null);
        this.eventListener.set('onDevicesSelected', null);
        this.eventListener.set('onDeviceSelected', null);
        this.eventListener.set('onDevicesConfigured', null);
        this.eventListener.set('onDeviceConfigured', null);
        this.eventListener.set('onTemplateLoaded', null);
        this.eventListener.set('onTemplateDisplayed', null);
        this.eventListener.set('onRegisterWrite', null);
        this.eventListener.set('onRegisterWritten', null);
        this.eventListener.set('onRefresh', null);
        this.eventListener.set('onRefreshed', null);
        this.eventListener.set('onCloseDevice', null);
        this.eventListener.set('onUnloadModule', null);
        this.eventListener.set('onLoadError', null);
        this.eventListener.set('onWriteError', null);
        this.eventListener.set('onRefreshError', null);

        // io_manager object references.
        const io_interface = io_manager.io_interface();

        this.driver_controller = io_interface.getDriverController();
        this.device_controller = io_interface.getDeviceController();

        this.frameworkType = 'singleDevice';

        // Framework Deletion constant
        this.frameworkActive = true;

        this.deviceSelectionListenersAttached = false;
        this.jquery = null;
        this.refreshRate = DEFAULT_REFRESH_RATE;
        this.pausedRefreshRate = 100;
        this.errorRefreshRate = 1000;
        this.configControls = [];

        this.bindings = new Map();
        this.readBindings = new Map();
        this.writeBindings = new Map();
        this.smartBindings = new Map();

        this.setupBindings = new Map();
        this.readSetupBindings = new Map();
        this.writeSetupBindings = new Map();

        this.activeDevices = [];
        this.activeDevice = undefined;
        this.selectedDevices = [];
        this.deviceErrorLog = {};
        this.runLoop = false;
        this.userViewFile = '';
        this.moduleTemplateBindings = new Map();
        this.moduleTemplateSetupBindings = {};
        this.moduleName = '';
        this.moduleJsonFiles = [];
        this.moduleInfoObj = undefined;
        this.moduleConstants = undefined;
        this.module = module;
        this.moduleData = undefined;
        this.deviceErrorCompiledTemplate = undefined;
        this.printableDeviceErrorCompiledTemplate = undefined;
        this.uniqueTabID = '';

        //Constants for auto-debugging on slow DAQ loops
        const moduleStartTimeObj = new Date();
        this.iterationTime = moduleStartTimeObj.valueOf();
        this.ljmDriverLogEnabled = false;
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

        this.allowModuleExecution = true;
        this.isModuleLoaded = false;
        this.isDeviceOpen = false;

        this.startupData = undefined;
        this.isStartupDataValid = false;

        this.DEBUG_STARTUP_DATA = false;
        this.deviceErrorControls = {};
        this.isDAQLoopActive = false;
        this.frameworkLoopProcessing = false;
        this.frameworkLoopReference = undefined;
        this.numModuleReloads = 0;
        this.currentModuleName = '';
    }

    reportSyntaxError(location, err) {
        console.error('Error in:', location);
        console.error('Error obj', err);
        showCriticalAlert(err.toString());
    }

    print(functionName,info,errName) {
        if (typeof(errName) === 'undefined') {
            errName = 'sdFrameworkDebug';
        }
        if (this.sdFrameworkDebug) {
            const fnDefined = (typeof(functionName) !== 'undefined');
            const infoDefined = (typeof(info) !== 'undefined');
            if (fnDefined && infoDefined) {
                console.log(errName,this.moduleName,functionName,info);
            } else if (!fnDefined && infoDefined) {
                console.log(errName,this.moduleName,info);
            } else if (fnDefined && !infoDefined) {
                console.log(errName,this.moduleName,functionName);
            } else {
                console.log(errName,this.moduleName);
            }

        }
    }

    printDAQLoopInfo(functionName,info) {
        if (this.sdFrameworkDebugDAQLoopMonitor) {
            this.print(functionName,info,'sdFrameworkDebugDAQLoopInfo');
        }
    }

    printDAQLoopMonitorInfo(functionName,info) {
        if (this.sdFrameworkDebugDAQLoopMonitorInfo) {
            this.print(functionName,info,'sdFrameworkDebugDAQLoopMonitorInfo');
        }
    }

    printTimingInfo(functionName,info) {
        if (this.sdFrameworkDebugTiming) {
            this.print(functionName,info,'sdFrameworkDebugTiming');
        }
    }

    printLoopErrors(functionName,info) {
        if (this.sdFrameworkDebugLoopErrors) {
            this.print(functionName,info,'sdFrameworkDebugLoopErrors');
        }
    }

    setStartupMessage(message) {
        $('#single-device-framework-loading-message').text(message);
    }

    _SetJQuery(newJQuery) {
        this.jquery = newJQuery;
    }

    _SetSelectedDevices(newSelectedDevices) {
        // Initialize the selectedDevices array
        this.selectedDevices = [];
        newSelectedDevices.forEach((device) => {
            const savedAttributes = device.savedAttributes;
            if (savedAttributes['isSelected-CheckBox']) {
                this.selectedDevices.push(device);
            }
        });
    }

    getConnectedDeviceInfoJquerySelector(serialNumber, extra) {
        let selector = '.SERIAL_NUMBER_' + serialNumber.toString();
        if (extra) {
            selector += ' '+ extra;
        }
        return selector;
    }

    getDeviceErrorJquerySelector(serialNumber, extra) {
        let selector = this.getConnectedDeviceInfoJquerySelector(
            serialNumber,
            '.device-selector-table-status'
        );

        if (extra) {
            selector += ' '+ extra;
        }
        return selector;
    }

    buildDeviceErrorControls(serialNumber) {
        const elements = {};
        elements.statusIcon = undefined;

        const deviceInfoSelector = this.getConnectedDeviceInfoJquerySelector(
            serialNumber
        );
        const statusIconSelector = this.getConnectedDeviceInfoJquerySelector(
            serialNumber,
            '.connection-status-icon'
        );
        const messagesSelector = this.getDeviceErrorJquerySelector(
            serialNumber,
            '.dropdown-menu-errors'
        );
        const clearMessagesButtonSelector = this.getDeviceErrorJquerySelector(
            serialNumber,
            '.clear-error-messages'
        );
        const copyMessagesButtonSelector = this.getDeviceErrorJquerySelector(
            serialNumber,
            '.copy-to-clipboard'
        );
        const deviceVersionNumberSelector = this.getConnectedDeviceInfoJquerySelector(
            serialNumber,
            '.device-firmware-version-holder'
        );
        const deviceNameSelector = this.getConnectedDeviceInfoJquerySelector(
            serialNumber,
            '.device-name-holder'
        );

        elements.deviceInfo = $(deviceInfoSelector);
        elements.statusIcon = $(statusIconSelector);

        elements.badge = $(this.getDeviceErrorJquerySelector(
            serialNumber,
            '.module-chrome-tab-badge .badge'
        ));
        elements.messagesSelector = $(messagesSelector);
        elements.clearErrorsButton = $(clearMessagesButtonSelector);
        elements.copyMessagesButtonSelector = $(copyMessagesButtonSelector);
        elements.firmwareVersion = $(deviceVersionNumberSelector);
        elements.deviceName = $(deviceNameSelector);

        let isFlashing = false;
        const flashBadge = () => {
            if (!isFlashing) {
                isFlashing = true;
                elements.badge.addClass('badge-important');
                setTimeout(() => {
                    elements.badge.removeClass('badge-important');
                    isFlashing = false;
                }, 500);
            }
        };
        const saveMessage = (message) => {
            let currentMessages = elements.messagesSelector.find('.error-message');
            let numMessages = currentMessages.length;
            let numErrors = 0;
            const badgeText = elements.badge.text();
            if (!isNaN(badgeText)) {
                numErrors = parseInt(badgeText);
            }
            if (numErrors === 0) {
                // If there were no errors
                elements.messagesSelector.find('.error-message').remove();
                currentMessages = elements.messagesSelector.find('.error-message');
                numMessages = currentMessages.length;
            }

            const newItem = '<li class="error-message">' + message.toString() + '</li>';
            // if (numMessages < 2) {
            //     elements.messagesSelector.css('height','inherit');
            // } else {
            //     elements.messagesSelector.css('height','200px');
            // }
            if (numMessages < 5) {
                // Simply add the message to the top of the list
                elements.messagesSelector.prepend(newItem);
            } else {
                // Remove the bottom messages (fixes any previous over-5 limits)
                for (let i = 4; i < numMessages; i++) {
                    currentMessages.eq(i).remove();
                }
                // Add the new message
                elements.messagesSelector.prepend(newItem);
            }

            // Update the num-messages badge.
            numErrors += 1;
            elements.badge.text(numErrors.toString());
            flashBadge();
        };
        const saveMessages = (messages) => {
            messages.forEach(saveMessage);
        };
        const clearMessages = () => {
            elements.messagesSelector.find('.error-message').remove();
            const newItem = '<li class="error-message">No Errors</li>';
            // elements.messagesSelector.css('height','inherit');
            elements.messagesSelector.prepend(newItem);
            elements.badge.text('0');
            this.device_controller.getDevice({'serialNumber': serialNumber})
            .then((device) => {
                device.clearDeviceErrors();
            });
        };
        const copyErrorDataToClipboard = (errorData) => {
            try {
                const errorsArray = [];
                errorData.errors.forEach((err, i) => {
                    const extrapolatedData = extrapolateDeviceErrorData(err);
                    extrapolatedData.errNum = i + 1;
                    errorsArray.push(extrapolatedData);
                });
                errorData.errors = errorsArray;
                const outputText = this.printableDeviceErrorCompiledTemplate(
                    errorData
                );
                gui.clipboard.writeText(outputText);
            } catch(err) {
                console.error('Error Copying data to clipboard', err);
            }
        };
        this.deviceErrorControls[serialNumber] = {
            'saveMessage': saveMessage,
            'saveMessages': saveMessages,
            'clearMessages': clearMessages,
            'setMessages': (messages) => {
                // Empty the current list of messages
                clearMessages();

                // Set the number of events displayed on the badge
                const num = messages.length;
                const numText = num.toString();
                elements.badge.text(numText);

                const items = [];
                messages.forEach((message) => {
                    items.push('<li class="error-message">' + message.toString() + '</li>');
                });

                items.forEach((item) => {
                    elements.messagesSelector.prepend(item);
                });

                flashBadge();
            },
            'flashBadge': flashBadge,
            'updateConnectionStatus': (isConnected) => {
                if (isConnected) {
                    elements.deviceInfo.removeClass('text-error');
                    elements.statusIcon.hide();
                } else {
                    elements.deviceInfo.addClass('text-error');
                    elements.statusIcon.show();
                }
            },
            'updateSharingStatus': (isShared, data) => {
                console.log('in presenter_framework updateSharingStatus', isShared, data);
                const pt = data.attrs.productType;
                const sn = data.attrs.serialNumber.toString();
                const appName = data.attrs.sharedAppName;
                let msg = '';
                if (isShared) {
                    msg = 'The ' + pt + ' with the SN: ' + sn;
                    msg += ' has been opened in ' + appName + '.';
                    // if (isConnected) {
                    msg += '  Please exit ' + appName + ' to continue using the device.';
                    // }
                } else {
                    msg += appName + ' has been closed and the ' + pt;
                    msg += ' with the SN: ' + sn + ' has been re-opened in Kipling';
                }
                showInfoMessage(msg);
            },
            'copyErrors': () => {
                this.device_controller.getDevice({'serialNumber': serialNumber})
                    .then((device) => {
                        device.getLatestDeviceErrors()
                            .then(copyErrorDataToClipboard);
                    });
            },
            'setDeviceFirmwareVersion': (newVersion) => {
                elements.firmwareVersion.text(newVersion);
                elements.firmwareVersion.attr(
                    'title',
                    'Device Name (' + newVersion + ')'
                );
            },
            'setDeviceName': (newName) => {
                elements.deviceName.text(newName);
                elements.deviceName.attr(
                    'title',
                    'Device Name (' + newName + ')'
                );
            },
            'elements': elements
        };
    }

    deviceReleasedEventListener(data) {
        // Device has been shared to an external application.
        console.warn('in deviceReleasedEventListener', data);
        this.emit('FRAMEWORK_HANDLED_DEVICE_RELEASED', data);
        if (data.attrs.serialNumber) {
            const sn = data.attrs.serialNumber;
            if (this.deviceErrorControls[sn]) {
                // Indicate that the device is no longer connected
                this.deviceErrorControls[sn].updateSharingStatus(true, data);
            }
        }
    }

    deviceAcquiredEventListener(data) {
        // Device released from the external application.
        console.warn('in deviceAcquiredEventListener', data);
        this.emit('FRAMEWORK_HANDLED_DEVICE_ACQUIRED', data);
        if (data.attrs.serialNumber) {
            const sn = data.attrs.serialNumber;
            if (this.deviceErrorControls[sn]) {
                // Indicate that the device is no longer connected
                this.deviceErrorControls[sn].updateSharingStatus(false, data);
            }
        }
    }
    deviceDisconnectedEventListener(data) {
        // console.warn('Device Disconnected', data);
        this.emit('FRAMEWORK_HANDLED_DEVICE_DISCONNECTED', data);
        if (data.serialNumber) {
            const sn = data.serialNumber;
            if (this.deviceErrorControls[sn]) {
                // Indicate that the device is no longer connected
                this.deviceErrorControls[sn].updateConnectionStatus(false);
            }
        }
    }

    deviceReconnectedEventListener(data) {
        // console.warn('Device Reconnected', data);
        this.emit('FRAMEWORK_HANDLED_DEVICE_RECONNECTED', data);
        if (data.serialNumber) {
            const sn = data.serialNumber;
            if (this.deviceErrorControls[sn]) {
                // Indicate that the device is connected
                this.deviceErrorControls[sn].updateConnectionStatus(true);
            }
        }
    }

    deviceErrorEventListener(data) {
        try {
            this.emit('FRAMEWORK_HANDLED_DEVICE_ERROR', data);
            if (data.deviceInfo) {
                const sn = data.deviceInfo.serialNumber;
                if (this.deviceErrorControls[sn]) {
                    // Expand on & compile the error message data
                    const compiledMessage = this.deviceErrorCompiledTemplate(
                        extrapolateDeviceErrorData(data)
                    );
                    // Display the error message
                    this.deviceErrorControls[sn].saveMessage(compiledMessage);
                }
            }
        } catch(err) {
            console.error('Error Handling Error', err);
        }
    }

    deviceReconnectingEventListener(data) {
        console.warn('Device Reconnecting', data);
        try {
            if (data.serialNumber) {
                const sn = data.serialNumber;
                if (this.deviceErrorControls[sn]) {
                    // Flash the device error badge
                    // console.log('Flashing badge');
                    this.deviceErrorControls[sn].flashBadge();
                }
            }
        } catch(err) {
            console.error('Error Handling Reconnecting message', err);
        }
    }

    deviceAttributesChangedEventListener(data) {
        try {
            console.log('in DEVICE_ATTRIBUTES_CHANGED event', data);
            if (data.serialNumber) {
                const sn = data.serialNumber;
                if (this.deviceErrorControls[sn]) {
                    // Update the displayed device name
                    const newName = data.DEVICE_NAME_DEFAULT;
                    this.deviceErrorControls[sn].setDeviceName(newName);

                    // Update the displayed firmware version
                    const newFirmwareVersion = data.FIRMWARE_VERSION;
                    this.deviceErrorControls[sn].setDeviceFirmwareVersion(
                        newFirmwareVersion
                    );
                }
            }

            // Relay-information to the device_updater_service
            const device_updater_service = TASK_LOADER.tasks.device_updater_service;
            const deviceUpdaterService = device_updater_service.deviceUpdaterService;
            const newData = this.activeDevices.map((dev) => {
                return dev.savedAttributes;
            });
            deviceUpdaterService.updatedDeviceList(newData);
        } catch(err) {
            console.error('Error Handling Device Attributes changed message', err);
        }
    }

    attachDeviceStatusListeners() {
        for (const device of this.activeDevices) {
            device.on('DEVICE_DISCONNECTED', data => this.deviceDisconnectedEventListener(data));
            device.on('DEVICE_RECONNECTED', data => this.deviceReconnectedEventListener(data));
            device.on('DEVICE_ERROR', data => this.deviceErrorEventListener(data));
            device.on('DEVICE_RECONNECTING', data => this.deviceReconnectingEventListener(data));
            device.on('DEVICE_ATTRIBUTES_CHANGED', data => this.deviceAttributesChangedEventListener(data));
            device.on('DEVICE_RELEASED', data => this.deviceReleasedEventListener(data));
            device.on('DEVICE_ACQUIRED', data => this.deviceAcquiredEventListener(data));

            // Attach to the "clear errors" button handlers
            const sn = device.savedAttributes.serialNumber;
            this.deviceErrorControls[sn].elements.clearErrorsButton.on(
                'click',
                this.deviceErrorControls[sn].clearMessages
            );

            // Attach to the "copy errors" button handlers
            this.deviceErrorControls[sn].elements.copyMessagesButtonSelector.on(
                'click',
                this.deviceErrorControls[sn].copyErrors
            );
        }
    }
    
    detachDeviceStatusListeners() {
        for (const device of this.activeDevices) {
            device.removeListener('DEVICE_DISCONNECTED', data => this.deviceDisconnectedEventListener(data));
            device.removeListener('DEVICE_RECONNECTED', data => this.deviceReconnectedEventListener(data));
            device.removeListener('DEVICE_ERROR', data => this.deviceErrorEventListener(data));
            device.removeListener('DEVICE_RECONNECTING', data => this.deviceReconnectingEventListener(data));
            device.removeListener('DEVICE_ATTRIBUTES_CHANGED', data => this.deviceAttributesChangedEventListener(data));
            device.removeListener('DEVICE_RELEASED', data => this.deviceReleasedEventListener(data));
            device.removeListener('DEVICE_ACQUIRED', data => this.deviceAcquiredEventListener(data));

            // Turn off "clear errors" button click handlers
            const sn = device.savedAttributes.serialNumber;
            this.deviceErrorControls[sn].elements.copyMessagesButtonSelector.off(
                'click'
            );
            this.deviceErrorControls[sn].elements.clearErrorsButton.off(
                'click'
            );
        }
    }

    _SetActiveDevices(newActiveDevices) {
        this.activeDevices = newActiveDevices;

        // Initialize a new error-log
        this.deviceErrorLog = {};
        for (const device of this.activeDevices) {
            const sn = device.savedAttributes.serialNumber;

            this.buildDeviceErrorControls(sn);
            // Initialize the error log
            const messages = [];
            if (!device.savedAttributes.isConnected) {
                messages.push('Device Not Connected');
            }
            this.deviceErrorLog[sn] = {
                'messages': messages,
                'isConnected': device.savedAttributes.isConnected,
            };
        }

        // Attach Device Listeners
        this.attachDeviceStatusListeners();
    }

    getActiveDevices() {
        return this.activeDevices;
    }

    _SetActiveDevice(newActiveDevice) {
        this.activeDevice = newActiveDevice;
    }

    getActiveDevice() {
        return this.activeDevice;
    }

    reportDeviceError(message, serialNumber) {
        if (typeof(serialNumber) === 'undefined') {
            const activeDevice = this.getActiveDevice();
            serialNumber = activeDevice.savedAttributes.serialNumber;
        }

        if (this.deviceErrorLog[serialNumber]) {
            this.deviceErrorLog[serialNumber].push(message);
        } else {
            const errStr = [
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
    }

    reportError(data) {
        try {
            // determine where the error should be displayed
            if (data.message) {
                // If the data object has a serial number then it is a device error
                if (data.serialNumber) {
                    this.reportDeviceError(data.message, data.serialNumber);
                } else {
                    console.warn('Showing Error', data, data.message);
                    showAlert(data.message);
                }
            } else {
                console.warn('Showing Error', data);
                showAlert('<h3>Program Error:</h3><pre>' +JSON.stringify(data, null, '2') + '</pre>');
            }
        } catch(err) {
            console.error('Error reporting error', err, err.stack);
            showCriticalAlert('Error reporting error (presenter_framework.js)');
        }
    }

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
    on(name, listener) {
        if (!this.eventListener.has(name)) {
            this.fire(
                'onLoadError',
                [ 'Config binding missing direction' ],
                (shouldContinue) => { this.runLoop = shouldContinue; }
            );
            return;
        }
        this.eventListener.set(name, listener);
    }

    /**
     * Force-cause an event to occur through the framework.
     *
     * @param {String} name The name of the event to fire.
     * @param {Object} params Object whose attributes should be used as
     *      parameters for the event.
     * @param {function} onErr Function to call if an error was encountered
     *      while running event listeners. Optional.
     * @param {function} onSuccess Function to call after the event listeners
     *      finish running. Optional.
    **/
    fire(name, params, onErr = () => {}, onSuccess = () => {}) {
        if (!this.eventListener.has(name)) {
            onSuccess();
            return;
        }

        const listener = this.eventListener.get(name);
        if (!listener) {
            onSuccess();
            return;
        }

        if (!params) {
            params = [];
        }

        if (this.moduleName !== this.getActiveTabID()) {
            console.error('Should Skip Call', name, this.moduleName, this.getActiveTabID());
            this.allowModuleExecution = false;
        }

        try {
            const passParams = [];
            passParams.push(this);
            passParams.push.apply(passParams, params);
            passParams.push(onErr);
            passParams.push(onSuccess);
            const retVal = listener.apply(null, passParams);
            if (retVal && retVal instanceof Promise) {
                retVal.then(() => onSuccess());
            }
        } catch (err) {
            console.error(err);
            console.error('Error firing: ' + name, {
                // 'moduleData: ', this.moduleData,
                'typeof sdModule': typeof(sdModule),
                'typeof sdFramework': typeof(sdFramework),
                'frameworkActive': this.frameworkActive
            });
            try {
                if (err.name === 'Driver Operation Error') {
                    // Error for old firmware version...
                    if (err.message === 1307) {
                        showAlert('Current Device Firmware Version Not Supported By This Module');
                    }
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
    }

    /**
     * Function deletes various 'window.' objects that need to be removed in
     * order for module to behave properly when switching tabs.
     * @param  {Array} moduleLibraries Array of string "window.xxx" calls that
     *      need to be deleted, (delete window.xxx) when a module gets unloaded.
     */
    unloadModuleLibraries(moduleLibraries) {
        if (moduleLibraries !== undefined) {
            moduleLibraries.forEach((element) => {
                const delStr = 'delete ' + element;
                try{
                    eval(delStr);
                } catch(err) {
                    console.error('presenter_framework Error Deleting Element',element);
                }
            });
        }
    }

    convertBindingsToDict() {
        return this.moduleTemplateBindings;
    }

    qHideUserTemplate() {
        return new Promise((resolve) => {
            this.jquery.fadeOut(
                DEVICE_VIEW_TARGET,
                FADE_DURATION,
                () => {
                    this.jquery.fadeIn(
                        CONFIGURING_DEVICE_TARGET,
                        FADE_DURATION,
                        resolve
                    );
                }
            );
        });
    }

    qShowUserTemplate() {
        return new Promise((resolve) => {
            this.jquery.fadeOut(
                CONFIGURING_DEVICE_TARGET,
                FADE_DURATION,
                () => {
                    this.jquery.fadeIn(
                        DEVICE_VIEW_TARGET,
                        FADE_DURATION,
                        resolve
                    );
                }
            );
        });
    }

    saveModuleStartupDataReference(newStartupData) {
        this.saveStartupDataReference(newStartupData);
        return Promise.resolve();
    }
    
    async resetModuleStartupData() {
        if (this.DEBUG_STARTUP_DATA) {
            console.info('presenter_framework: resetModuleStartupData');
        }
        await module_manager.getModulesList()
            .then((moduleSections) => {
                let humanName = '';
                const moduleSectionKeys = Object.keys(moduleSections);
                for (let i = 0; i < moduleSectionKeys.length; i++) {
                    const moduleSectionKey = moduleSectionKeys[i];
                    const moduleSection = moduleSections[moduleSectionKey];
                    for (let j = 0; j < moduleSection.length; j++) {
                        const moduleInfo = moduleSection[j];
                        if (moduleInfo.name === this.currentModuleName) {
                            humanName = moduleInfo.humanName;
                            break;
                        }
                    }
                }
                if (humanName) {
                    showInfoMessage('Resetting persistent data for: ' + humanName);
                } else {
                    showAlert('Resetting persistent data for: ' + this.currentModuleName);
                }
            });
        await module_manager.revertModuleStartupData(this.currentModuleName);
        const newStartupData = await module_manager.getModuleStartupData(this.currentModuleName);
        await this.saveModuleStartupDataReference(newStartupData);
    }

    saveModuleStartupData(callerInfo) {
        const moduleName = this.currentModuleName;
        let dataToSave;
        const isDataValid = this.isStartupDataValid;
        const saveReasons = [];

        let saveData = false;
        try {
            if (isDataValid) {
                dataToSave = JSON.parse(JSON.stringify(this.startupData));
                saveData = true;
                saveReasons.push('Data is valid');
            }
        } catch(err) {
            console.error('presenter_framework: Failed to save moduleStartupData');
            saveReasons.push('Error while parsing data');
        }

        try {
            if (saveData) {
                const keys = Object.keys(dataToSave);
                if (keys.length > 0) {
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

        if (saveData) {
            if (this.DEBUG_STARTUP_DATA) {
                console.info(
                    'presenter_framework: saving startupData:',
                    callerInfo,
                    moduleName,
                    saveReasons
                );
            }

            return this.qExecVerifyStartupData('saveStartupData')
                .then(() => {
                    return module_manager.saveModuleStartupData(
                        moduleName,
                        dataToSave
                    );
                });
        } else {
            if (this.DEBUG_STARTUP_DATA) {
                console.info(
                    'presenter_framework: not saving startupData',
                    callerInfo,
                    moduleName,
                    saveReasons
                );
            }
            return Promise.resolve();
        }
    }

    qExecVerifyStartupData(callerData) {
        if (this.DEBUG_STARTUP_DATA) {
            console.info(
                'presenter_framework: in verifyStartupData',
                callerData,
                this.currentModuleName
            );
        }

        if (this.allowModuleExecution) {
            return new Promise((resolve, reject) => {
                this.fire(
                    'verifyStartupData',
                    [this.startupData],
                    (errData) => {
                        console.warn('presenter_framework: verifyStartupData, finishWithError', errData);
                        this.resetModuleStartupData()
                            .then(resolve, reject);
                    },
                    () => {
                        resolve();
                    }
                );
            });
        } else {
            console.log('allowModuleExecution == false', this.allowModuleExecution);
            return this.qExecOnUnloadModule();
        }
    }

    qExecOnDeviceSelected() {
        if (this.allowModuleExecution) {
            return new Promise((resolve, reject) => {
                this.fire(
                    'onDeviceSelected',
                    [this.smartGetSelectedDevices()],
                    (err) => reject(err),
                    () => {
                        this.isDeviceOpen = true;
                        resolve();
                    }
                );
            });
        } else {
            return this.qExecOnCloseDevice()
                .then(() => this.qExecOnUnloadModule(), () => this.qExecOnUnloadModule());
        }
    }

    qExecOnDeviceConfigured(data) {
        return new Promise((resolve, reject) => {
            if (this.allowModuleExecution) {
                this.fire(
                    'onDeviceConfigured',
                    [this.smartGetSelectedDevices(), data],
                    (err) => reject(err),
                    (res) => resolve(res)
                );
            } else {
                return this.qExecOnCloseDevice()
                    .then(() => this.qExecOnUnloadModule(), () => this.qExecOnUnloadModule());
            }
        });
    }

    qExecOnTemplateDisplayed() {
        if (this.allowModuleExecution) {
            return new Promise((resolve, reject) => {
                try {
                    this.fire(
                        'onTemplateDisplayed',
                        [],
                        (err) => reject(err),
                        (data) => {
                            KEYBOARD_EVENT_HANDLER.initInputListeners();
                            resolve(data);
                        }
                    );
                } catch (err) {
                    if (err.name === 'SyntaxError') {
                        console.error('Syntax Error captured');
                    }
                    console.error('Error caught in qExecOnTemplateDisplayed', err);
                }
            });
        } else {
            return this.qExecOnCloseDevice()
                .then(() => this.qExecOnUnloadModule(), () => this.qExecOnUnloadModule());
        }
    }

    qExecOnTemplateLoaded() {
        return new Promise((resolve, reject) => {
            if (this.allowModuleExecution) {
                try {
                    this.fire(
                        'onTemplateLoaded',
                        [],
                        (data) => {
                            reject(data);
                        },
                        (data) => {
                            resolve(data);
                        }
                    );
                } catch (err) {
                    if (err.name === 'SyntaxError') {
                        console.error('Syntax Error captured');
                    }
                    console.error('Error caught in qExecOnTemplateLoaded', err);
                }
            } else {
                return this.qExecOnCloseDevice()
                    .then(() => this.qExecOnUnloadModule(), () => this.qExecOnUnloadModule());
            }
        });
    }

    qExecOnCloseDevice() {
        const device = this.smartGetSelectedDevices();
        // Detach device event emitters
        this.detachDeviceStatusListeners();
        if (this.isDeviceOpen) {
            return new Promise((resolve, reject) => {
                if (this.allowModuleExecution) {
                    this.fire(
                        'onCloseDevice',
                        [device],
                        (data) => {
                            this.saveModuleStartupData('qExecOnCloseDevice-err')
                                .then(() => {
                                    reject(data);
                                }, () => {
                                    reject(data);
                                });
                        },
                        (data) => {
                            this.saveModuleStartupData('qExecOnCloseDevice-suc')
                                .then(() => {
                                    resolve(data);
                                }, () => {
                                    resolve(data);
                                });
                        }
                    );
                } else {
                    this.fire(
                        'onCloseDevice',
                        [device],
                        async () => {
                            this.isDeviceOpen = false;
                            await this.qExecOnUnloadModule();
                            this.saveModuleStartupData('qExecOnCloseDevice-err');
                            reject();
                        },
                        async () => {
                            this.isDeviceOpen = false;
                            await this.qExecOnUnloadModule();
                            this.saveModuleStartupData('qExecOnCloseDevice-err');
                            reject();
                        }
                    );
                }
            });
        } else {
            console.error('in qExecOnCloseDevice, device is not open');
            return Promise.reject();
        }
    }

    qExecOnLoadError(err) {
        if (this.allowModuleExecution) {
            return new Promise((resolve) => {
                this.fire(
                    'onLoadError',
                    [
                        [err],
                        (shouldContinue) => {
                            this.runLoop = shouldContinue;
                            resolve();
                        }
                    ]
                );
            });
        } else {
            return Promise.reject();
        }
    }

    async qExecOnUnloadModule() {
        if (this.isModuleLoaded) {
            //Halt the daq loop
            this.stopLoop();

            //clean up module's third party libraries
            this.unloadModuleLibraries(this.moduleInfoObj.third_party_code_unload);

            // Ensure the pgm exit listener has been removed.
            try {
                global.DELETE_K3_EXIT_LISTENER('presenter-framework-notifier');
            } catch(err) {
                console.log('presenter_framework.js removeProgramExitListener err', err);
            }

            // clear any "ModuleWindowResizeListeners" window resize listeners
            // clearModuleWindowResizeListeners();

            //If LJM's debug log was enabled, disable it
            if (this.ljmDriverLogEnabled) {
                console.info('disabling LJM-log');
                console.info('File:', this.ljmDriver.readLibrarySync('LJM_DEBUG_LOG_FILE'));
                this.ljmDriver.writeLibrarySync('LJM_DEBUG_LOG_MODE', 1);
                this.ljmDriver.writeLibrarySync('LJM_DEBUG_LOG_LEVEL', 10);
                this.ljmDriverLogEnabled = false;
            }

            await new Promise((resolve, reject) => {
                //Inform the module that it has been unloaded.
                this.fire(
                    'onUnloadModule',
                    [],
                    (data) => {
                        this.saveModuleStartupData('qExecOnUnloadModule-err')
                            .then(() => {
                                reject(data);
                            }, () => {
                                reject(data);
                            });
                    },
                    () => {
                        // Detach Device Listeners
                        this.detachDeviceStatusListeners();

                        this.isModuleLoaded = false;
                        this.saveModuleStartupData('qExecOnUnloadModule-suc')
                            .then(resolve, resolve);
                    }
                );
            });
        }
    }

    qRenderModuleTemplate() {
        return this.setDeviceView(
            this.userViewFile,
            this.moduleJsonFiles,
            this.convertBindingsToDict()
        );
    }

    getDeviceSelectorClass() {
        if (this.frameworkType === 'singleDevice') {
            return '.device-selection-radio';
        } else if (this.frameworkType === 'multipleDevices') {
            return '.device-selection-checkbox';
        }
        return '.device-selection-radio';
    }

    async qUpdateActiveDevice() {
        const data = {
            'activeDevice': await this.device_controller.getSelectedDevice(),
            'deviceListing': await this.device_controller.getDeviceListing(this.moduleData.data.supportedDevices),
            'activeDevices': await this.device_controller.getDevices(this.moduleData.data.supportedDevices),
        };

        // Save device references
        this._SetActiveDevices(data.activeDevices);
        this._SetActiveDevice(data.activeDevice);
        this._SetSelectedDevices(data.activeDevices);

        let devs = this.jquery.get('.device-selection-radio');
        if (devs.length === 0) {
            devs = this.jquery.get('.device-selection-checkbox');
        }

        let foundActiveDevice = false;
        const activeDevices = this.getSelectedDevices();
        activeDevices.forEach((activeDev) => {
            if (!activeDev.savedAttributes) return;
            const activeSN = String(activeDev.savedAttributes.serialNumber);
            for (let i = 0; i < devs.length; i++) {
                if (activeSN === devs.eq(i).val()) {
                    devs.eq(i).prop('checked', true);
                    foundActiveDevice = true;
                }
            }
        });

        // End of sloppy code warning...
        if (!foundActiveDevice) {
            // Did not find an active device
            if (this.frameworkType !== 'multipleDevices') {
                const activeDev = devs.eq(0);
                // Marking first found device
                let activeDevSN = 0;
                try {
                    activeDevSN = activeDev.prop('value');
                } catch (err) {
                    console.error('ERROR converting SN string to a number', err);
                }
                // console.log('SN:', activeDevSN, 'snType', typeof(activeDevSN));

                // Populate radio box with bubble.
                activeDev.prop('checked', true);

                // Communicate with device_manager...?
                // device_controller.selectDevice(activeDevSN);
                try {
                    await this.smartSaveSelectedDevices(activeDevSN);
                    console.log('Repeating Execution of getting active device info...');
                    await this.qUpdateActiveDevice();
                } catch (err) {
                    console.error(err);
                }
            } else {
                console.warn('Not sure what to do... presenter_framework.js - updateSelectedDeviceList');
            }
        }

        let selectorKey = '.device-selector-table-device-selector .radio';
        if (this.frameworkType === 'multipleDevices') {
            selectorKey = '.device-selector-table-device-selector .checkbox';
        }
        const selectors = this.jquery.get(selectorKey);
        selectors.show();
    }

    /**
     * Set how frequently the framework should read from the device.
     *
     * @param {int} newRefreshRate The number of milliseconds between updates.
    **/
    setRefreshRate(newRefreshRate) {
        this.refreshRate = newRefreshRate;
    }

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
    setConfigControls(newConfigControls) {
        this.configControls = newConfigControls;
    }

    establishWriteBindings(bindings) {
        bindings.forEach((binding) => {
            this.establishWriteBinding(binding);
        });
    }

    establishWriteBinding(binding) {
        this.jquery.unbind('#' + binding.template, binding.event);
        this.jquery.bind('#' + binding.template, binding.event, async (eventData) => {
            await this._writeToDevice(binding, eventData);
        });
    }

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
    putConfigBinding(newBinding) {
        // ------------------------------------
        // Begin checking for potential binding object related errors

        // if bindingClass isn't defined execute onLoadError
        if (newBinding.bindingClass === undefined) {
            this.fire(
                'onLoadError',
                [ 'Config binding missing bindingClass' ],
                (shouldContinue) => {
                    this.runLoop = shouldContinue;
                }
            );
            return;
        }

        // if template isn't defined execute onLoadError
        if (newBinding.template === undefined) {
            this.fire(
                'onLoadError',
                [ 'Config binding missing template' ],
                (shouldContinue) => {
                    this.runLoop = shouldContinue;
                }
            );
            return;
        }

        // if binding isn't defined execute onLoadError
        if (newBinding.binding === undefined) {
            this.fire(
                'onLoadError',
                [ 'Config binding missing binding' ],
                (shouldContinue) => {
                    this.runLoop = shouldContinue;
                }
            );
            return;
        }

        // if direction isn't defined execute onLoadError
        if (newBinding.direction === undefined) {
            this.fire(
                'onLoadError',
                [ 'Config binding missing direction' ],
                (shouldContinue) => {
                    this.runLoop = shouldContinue;
                }
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
            newBinding.customFormatFunc = (rawReading) => {
                console.info('Here, val:',rawReading);
                return "'customFormatFunc' NotDefined";
            };
        }

        if (newBinding.execCallback === undefined) {
            newBinding.execCallback = false;
        }

        // if there is supposed to be a callback but it isn't defined define one
        const isCallback = newBinding.execCallback === true;
        if (isCallback && (newBinding.callback === undefined)) {
            newBinding.callback = (binding, data, onSuccess) => {
                console.info('callback, binding:',binding,', data: ', data);
                onSuccess();
            };
        }

        // if adding a write binding and the desired event is undefined execute
        // onLoadError
        const isWrite = newBinding.direction === 'write';
        if (isWrite && newBinding.event === undefined) {
            this.fire(
                'onLoadError',
                [ 'Config binding missing direction' ],
                (shouldContinue) => {
                    this.runLoop = shouldContinue;
                }
            );
            return;
        }

        if (newBinding.dataKey === undefined) {
            newBinding.dataKey = 'res';
        }
        // Finished checking for potential binding object related errors
        // ------------------------------------

        // BEGIN:
        // Code for recursively adding configBindings:
        const expandedBindings = expandBindingInfo(newBinding);
        const numBindings = expandedBindings.length;
        if (numBindings > 1) {
            for (let i = 0; i < numBindings; i++) {
                this.putConfigBinding(expandedBindings[i]);
            }
            return;
        }
        // END:

        // Code for adding individual bindings to the moduleTemplateBindings,
        // readBindings, writeBindings, and bindings objects
        try {
            const arr = this.moduleTemplateBindings.get(newBinding.bindingClass) || [];
/*
            if (this.moduleTemplateBindings[newBinding.bindingClass] === undefined) {
                this.moduleTemplateBindings[newBinding.bindingClass] = [];
            }
            this.moduleTemplateBindings.get()
                [newBinding.bindingClass].push(newBinding);
*/
            arr.push(newBinding);
            this.moduleTemplateBindings.set(newBinding.bindingClass, arr);
        } catch (err) {
            console.error('Error in presenter_framework.js, putConfigBinding',err);
        }
        this.bindings.set(newBinding.template, newBinding);

        if (newBinding.direction === 'read') {
            this.readBindings.set(newBinding.template, newBinding);
        } else if (newBinding.direction === 'write') {
            this.writeBindings.set(newBinding.template, newBinding);
            this.establishWriteBinding(newBinding);
        } else {
            this.fire(
                'onLoadError',
                [ 'Config binding has invalid direction' ],
                (shouldContinue) => {
                    this.runLoop = shouldContinue;
                }
            );
        }
    }

    putConfigBindings(bindings) {
        const numBindings = bindings.length;
        for (let i = 0; i < numBindings; i++) {
            this.putConfigBinding(bindings[i]);
        }
    }

    putSmartBinding(newSmartBinding) {
        // if bindingName isn't defined execute onLoadError
        if (newSmartBinding.bindingName === undefined) {
            this.fire(
                'onLoadError',
                [ 'SmartBinding binding missing bindingName' ],
                (bundle) => {
                    console.error('in this.putSmartBinding, onErrorHandle', bundle);
                }
            );
            return;
        }
        // if smartName isn't defined execute onLoadError
        if (newSmartBinding.smartName === undefined) {
            this.fire(
                'onLoadError',
                [ 'SmartBinding binding missing smartName' ],
                (bundle) => {
                    console.error('in this.putSmartBinding, onErrorHandle', bundle);
                }
            );
            return;
        }

        // if dataKey isn't defined, define it as 'res'
        if (newSmartBinding.dataKey === undefined) {
            newSmartBinding.dataKey = 'res';
        }

        const bindingName = newSmartBinding.bindingName;
        const smartName = newSmartBinding.smartName;
        const binding = {};
        const setupBinding = {};
        let isValid = false;

        // Add generic info to binding
        binding.bindingClass = bindingName;
        binding.template = bindingName;

        // Add generic info to setupBinding
        setupBinding.bindingClass = bindingName;

        if (smartName === 'clickHandler') {
            // Add information to binding object
            binding.binding = bindingName+CALLBACK_STRING_CONST;
            binding.direction = 'write';
            binding.event = 'click';
            binding.execCallback = true;
            binding.callback = newSmartBinding.callback;

            // Save binding to framework
            this.putConfigBinding(binding);
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

            if (typeof(newSmartBinding.periodicCallback) === 'function') {
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

            if (typeof(newSmartBinding.configCallback) === 'function') {
                setupBinding.execCallback = true;
            }
            setupBinding.callback = newSmartBinding.configCallback;

            // Save binding to framework
            this.putConfigBinding(binding);
            this.putSetupBinding(setupBinding);
            isValid = true;
        } else if (smartName === 'setupOnlyRegister') {
            // Add information to setupBinding object
            setupBinding.binding = bindingName;
            setupBinding.direction = 'read';
            setupBinding.callback = newSmartBinding.configCallback;
            setupBinding.format = newSmartBinding.format;
            setupBinding.formatFunc = newSmartBinding.customFormatFunc;
            setupBinding.dataKey = newSmartBinding.dataKey;

            if (typeof(newSmartBinding.configCallback) === 'function') {
                setupBinding.execCallback = true;
            }
            setupBinding.callback = newSmartBinding.configCallback;

            // Save binding to framework
            this.putSetupBinding(setupBinding);
            isValid = true;
        } else if (smartName === 'periodicFunction') {
            // Add information to binding object
            binding.binding = bindingName+CALLBACK_STRING_CONST;
            binding.direction = 'read';
            binding.format = newSmartBinding.format;
            binding.customFormatFunc = newSmartBinding.customFormatFunc;
            binding.iterationDelay = newSmartBinding.iterationDelay;
            binding.initialDelay = newSmartBinding.initialDelay;

            if (typeof(newSmartBinding.periodicCallback) === 'function') {
                binding.execCallback = true;
            }
            binding.callback = newSmartBinding.periodicCallback;

            // Save binding to framework
            this.putConfigBinding(binding);
            isValid = true;
        }

        if (isValid) {
            this.smartBindings.set(newSmartBinding.bindingName, newSmartBinding);
        }

    }

    putSmartBindings(newSmartBindings) {
        newSmartBindings.forEach((newSmartBinding) => {
            this.putSmartBinding(newSmartBinding);
        });
    }

    deleteSmartBinding(bindingName) {
        if (this.smartBindings.has(bindingName)) {
            const info = this.smartBindings.get(bindingName);
            const deleteBinding = {
                'direction': 'read',
                'bindingClass': bindingName,
                'template': bindingName,
            };
            if (info.smartName === 'clickHandler') {
                deleteBinding.direction = 'write';
                deleteBinding.event = 'click';
            }
            this.deleteConfigBinding(deleteBinding);
            this.deleteSetupBinding(deleteBinding);
            this.smartBindings.delete(bindingName);
        }
    }

    deleteSmartBindings(bindingNames) {
        bindingNames.forEach(this.deleteSmartBinding);
    }

    deleteAllSmartBindings() {
        const names = [];
        this.smartBindings.forEach((smartBinding) => {
            names[names.length] = smartBinding.smartName;
        });
        this.deleteSmartBindings(names);
        this.smartBindings = new Map();
        this.setupBindings = new Map();
    }

    /**
     * Function to add a single binding that gets read once upon device
     * selection.
     * @param  {[type]} newBinding [description]
     */
    putSetupBinding(newBinding) {
        // Check for various required binding attributes & report onLoadErrors
        // if they dont exist
        if (newBinding.bindingClass === undefined) {
            this.fire(
                'onLoadError',
                [ 'Config binding missing bindingClass' ],
                (shouldContinue) => {
                    this.runLoop = shouldContinue;
                }
            );
            return;
        }

        if (newBinding.binding === undefined) {
            this.fire(
                'onLoadError',
                [ 'Config binding missing binding' ],
                (shouldContinue) => {
                    this.runLoop = shouldContinue;
                }
            );
            return;
        }

        if (newBinding.direction === undefined) {
            this.fire(
                'onLoadError',
                [ 'Config binding missing direction' ],
                (shouldContinue) => {
                    this.runLoop = shouldContinue;
                }
            );
            return;
        }
        // if an output format isn't defined define the default
        if (newBinding.format === undefined) {
            newBinding.format = '%.4f';
        }

        // if a customFormatFunc isn't defined define a dummy function
        if (newBinding.formatFunc === undefined) {
            newBinding.formatFunc = (rawReading) => {
                console.info('Here, val:',rawReading);
                return "'customFormatFunc' NotDefined";
            };
        }

        if (newBinding.dataKey === undefined) {
            newBinding.dataKey = 'res';
        }

        const isWrite = newBinding.direction === 'write';
        if ( (isWrite) && (newBinding.defaultVal === undefined) ) {
            this.fire(
                'onLoadError',
                [ 'Config binding missing defaultVal' ],
                (shouldContinue) => {
                    this.runLoop = shouldContinue;
                }
            );
            return;
        }

        if (newBinding.execCallback === undefined) {
            newBinding.execCallback = false;
        }
        if (newBinding.callback === undefined) {
            newBinding.callback = (data, onSuccess) => {
                console.info('SetupBinding requested a callback but is not defined');
                onSuccess();
            };
        }

        const expandedBindings = expandSetupBindingInfo(newBinding);
        const numBindings = expandedBindings.length;
        if (numBindings > 1) {
            for (let i = 0; i < numBindings; i++) {
                this.putSetupBinding(expandedBindings[i]);
            }
            return;
        }

        try{
            if (this.moduleTemplateSetupBindings[newBinding.bindingClass] === undefined) {
                this.moduleTemplateSetupBindings[newBinding.bindingClass] = [];
            }
            this.moduleTemplateSetupBindings[newBinding.bindingClass].push(newBinding);
        } catch (err) {
            console.error('Error in presenter_framework.js, putSetupBinding', err);
        }
        this.setupBindings.set(newBinding.bindingClass, newBinding);

        if (newBinding.direction === 'read') {
            this.readSetupBindings.set(newBinding.bindingClass, newBinding);
        } else if (newBinding.direction === 'write') {
            this.writeSetupBindings.set(newBinding.bindingClass, newBinding);
        } else {
            this.fire(
                'onLoadError',
                [ 'Config binding has invalid direction' ],
                (shouldContinue) => {
                    this.runLoop = shouldContinue;
                }
            );
        }
    }

    /**
     * Function to add multiple bindings that get read once upon device
     * selection.
     * @param  {[type]} bindings [description]
     * @return {[type]}         [description]
     */
    putSetupBindings(bindings) {
        bindings.forEach((binding) => {
            this.putSetupBinding(binding);
        });
    }

    deleteSetupBinding(setupBinding) {
        const name = setupBinding.bindingClass;
        if (this.setupBindings.has(name)) {
            const info = this.setupBindings.get(name);
            if (info.direction === 'read') {
                if (this.readSetupBindings.has(name)) {
                    this.readSetupBindings.delete(name);
                }
            } else if (info.direction === 'write') {
                if (this.writeSetupBindings.has(name)) {
                    this.writeSetupBindings.delete(name);
                }
            }
            this.setupBindings.delete(name);
        }
    }

    executeCallback(binding, result) {
        if (binding.execCallback) {
            return new Promise((resolve) => {
                binding.callback(
                    {
                        framework: this,
                        module: this.module,
                        device: this.getSelectedDevice(),
                        binding: binding,
                        value: result.result,
                        result: result
                    },
                    () => {
                        resolve();
                    }
                );
            });
        } else {
            return Promise.resolve();
        }
    }

    executeSetupBindings() {
        const results = new Map();

        // Function that executes the device setup commands
        const executionQueue = [];

        // Populating the execution queue
        this.setupBindings.forEach((binding) => {
            executionQueue.push(async () => {
                //Create execution queue
                const device = this.getSelectedDevice();
                // console.log('Executing IO Operation', binding.binding);
                //Link various function calls based off read/write property
                try {
                    if (binding.direction === 'write') {
                    //Define write I/O procedure
                        await device.qWrite(binding.binding, binding.defaultVal);

                        const result = {
                            status: 'success',
                            result: -1,
                            formattedResult: '-1',
                            address: binding.binding
                        };
                        results.set(binding.bindingClass, result);
                        await this.executeCallback(binding, result);
                    } else if (binding.direction === 'read') {
                    //Define read I/O procedure
                        const readValue = await device.sRead(binding.binding);
                        const value = readValue.val;
                        let formattedValue = '';
                        const curFormat = binding.format;
                        if (typeof(value) === 'number') {
                            if (curFormat !== 'customFormat') {
                                if (isNaN(value)) {
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
                        const result = {
                            status: 'success',
                            result: value,
                            formattedResult: formattedValue,
                            address: binding.binding
                        };
                        results.set(binding.bindingClass, result);
                        await this.executeCallback(binding, result);
                    } else {
                        console.warn('invalid binding.direction', binding.direction);
                    }
                } catch (error) {
                    const result = {
                        status: 'error',
                        result: error,
                        formattedResult: null,
                        address: binding.binding
                    };
                    results.set(binding.bindingClass, result);
                    await this.executeCallback(binding, result);
                }
            });
        });

        return new Promise((resolve) => {
            //Execute the created execution queue of device IO commands
            async.eachSeries(
                executionQueue,
                (request, callback) => {
                    request().then(() => {
                        // console.log('eachSeries Success')
                        callback();
                    }, (err) => {
                        // console.log('eachSeries Err',err);
                        callback(err);
                    });
                },
                () => {
                    // console.log('eachSeries Callback',err);
                    resolve(results);
                });
        });
    }

    async _writeToDevice(bindingInfo, eventData) {
        const jquerySelector = '#' + bindingInfo.template;
        const newVal = this.jquery.val(jquerySelector);

        // Alert to module that a write is about to happen
        const skipWrite = await new Promise((resolve, reject) => {
            this.fire(
                'onRegisterWrite',
                [
                    bindingInfo,
                    newVal
                ],
                reject,
                resolve
            );
        });

        const skip = await new Promise((resolve) => {
            const callbackString = CALLBACK_STRING_CONST;
            const baseStr = bindingInfo.binding;
            const searchIndex = baseStr.search(callbackString);
            if (searchIndex >= 0) {
                if ((baseStr.length - searchIndex - callbackString.length) === 0) {
                    if (bindingInfo.execCallback) {
                        try {
                            bindingInfo.callback(
                                {
                                    framework: this,
                                    module: this.module,
                                    device: this.getSelectedDevice(),
                                    binding: bindingInfo,
                                    eventData: eventData,
                                    value: newVal,
                                },
                                () => {
                                    resolve(true);
                                });
                        } catch (e) {
                            this.reportSyntaxError(
                                {
                                    'location': '_writeToDevice.performCallbacks',
                                    data: {binding: bindingInfo, eventData: eventData}
                                }, e);
                            resolve(true);
                        }
                    } else {
                        resolve(false);
                    }
                }
            } else {
                if (bindingInfo.execCallback) {
                    try {
                        bindingInfo.callback(
                            {
                                framework: this,
                                module: this.module,
                                device: this.getSelectedDevice(),
                                binding: bindingInfo,
                                eventData: eventData,
                                value: newVal,
                            },
                            () => {
                                resolve(false);
                            });
                    } catch (e) {
                        this.reportSyntaxError(
                            {
                                'location': '_writeToDevice.performCallbacks(2)',
                                data: {binding: bindingInfo, eventData: eventData}
                            }, e);
                        resolve(false);
                    }
                } else {
                    resolve(false);
                }
            }
        });

        if (skip) {
            const device = this.getSelectedDevice();
            const invalidString = '-invalid';
            const baseStr = bindingInfo.binding;
            const searchIndex = baseStr.search(invalidString);
            if ( searchIndex >= 0) {
                if ((baseStr.length - searchIndex - invalidString.length) === 0) {
                    return;
                }
            }
            if (typeof(skipWrite) === undefined) {
                device.write(bindingInfo.binding, newVal);
            } else if (typeof(skipWrite) === "boolean" && (skipWrite === false)) {
                device.write(bindingInfo.binding, newVal);
            }

            await new Promise((resolve, reject) => {
                this.fire(
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
    }

    /**
     * Delete a previously added configuration binding.
     *
     * @param {String} binding The name of the binding (the binding info
     *      object's original "template" attribute) to delete.
    **/
    deleteConfigBinding(binding) {
        const bindingName = binding.bindingClass;
        const expandedBindings = ljmmm_parse.expandLJMMMName(bindingName);
        const numBindings = expandedBindings.length;
        if (numBindings > 1) {
            for (let i = 0; i < numBindings; i++) {
                this.deleteConfigBinding(expandedBindings[i]);
            }
            return;
        }

        if (!this.bindings.has(bindingName)) {
            this.fire(
                'onLoadError',
                [ 'No binding for ' + bindingName ],
                (shouldContinue) => { this.runLoop = shouldContinue; }
            );
            return;
        }

        const bindingInfo = this.bindings.get(bindingName);

        this.bindings.delete(bindingName);

        if (bindingInfo.direction === 'read') {
            this.readBindings.delete(bindingName);
        } else if (bindingInfo.direction === 'write') {
            this.writeBindings.delete(bindingName);
            const jquerySelector = '#' + bindingInfo.template;
            this.jquery.off(jquerySelector, bindingInfo.event);
        } else {
            this.fire(
                'onLoadError',
                [ 'Config binding has invalid direction' ],
                (shouldContinue) => { this.runLoop = shouldContinue; }
            );
        }
    }

    deleteConfigBindings(bindings) {
        bindings.forEach((binding) => {
            this.deleteConfigBinding(binding);
        });
    }

    clearConfigBindings() {
        this.bindings.clear();
        this.readBindings.clear();
        this.writeBindings.clear();
        this.moduleTemplateBindings.clear();
    }

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
    async setDeviceView(templateLoc, jsonFiles = [], map = new Map()) {
        // Append the selected devices array to the context to allow templates
        // to adjust their displayed content based on what devices are available.

        const context = {};
        for (const entry of map.entries()) {
            context[entry[0]] = entry[1];
        }

        context.devices = this.getSelectedDevices();

        // Create an error handler
        // Load the supporting JSON files for use in the template
        const jsonTemplateVals = this.moduleData.json;

        let cacheKey = '';
        for (let i = 0; i < this.moduleData.html.length; i++) {
            if (this.moduleData.html[i].fileName === 'view.html') {
                cacheKey = this.moduleData.html[i].filePath;
                break;
            }
        }

        context.json = jsonTemplateVals;

        try {
            const htmlContents = await fs_facade.renderCachedTemplateData(
                cacheKey,
                this.moduleData.htmlFiles.view,
                context
            );

            const htmlContents2 = '<div class="framework-template">' + htmlContents + '</div>';
            this.jquery.html(DEVICE_VIEW_TARGET, htmlContents2);

            if (this.deviceSelectionListenersAttached === false) {
                this.jquery.on(
                    this.getDeviceSelectorClass(),
                    'click',
                    () => this._changeSelectedDeviceUI()
                );
                this.deviceSelectionListenersAttached = true;
            }
        } catch (err) {
            console.error('reporting load error', err);
            console.error('in this.setDeviceView, onErr', {'msg': err});
            this.fire(
                'onLoadError',
                [ err ],
                (shouldContinue) => { this.runLoop = shouldContinue; }
            );
        }
    }

    smartSaveSelectedDevices(serialNumberData) {
        // If the data is an array, call and return the saveDevices function
        if (Array.isArray(serialNumberData)) {
            return this.device_controller.selectDevices(serialNumberData);
        } else {
            return this.device_controller.selectDevice(serialNumberData);
        }
    }

    _changeSelectedDeviceUI() {
        let selectDevicesData;

        try {
            const elements = this.jquery.get(
                this.getDeviceSelectorClass() + ':checked'
            );
            if (this.frameworkType === 'singleDevice') {
                selectDevicesData = elements.val();
            } else if (this.frameworkType === 'multipleDevices') {
                const numEle = elements.length;
                const serialNumbers = [];
                for (let i = 0; i < numEle; i++) {
                    serialNumbers.push(elements.eq(i).val());
                }

                selectDevicesData = serialNumbers;
            } else {
                console.warn('Wrong frameworkType', this.frameworkType);
                selectDevicesData = elements.val();
            }
        } catch(err) {
            console.error('error in _changeSelectedDeviceUI', err);
        }

        //Perform necessary actions:
        setTimeout(async () => {
            // Stop the DAQ loop
            try {
                await this.qStopLoop();

                // Report that the device has been closed
                await this.qExecOnCloseDevice();

                // Hide the module's template
                await this.qHideUserTemplate();

                // Save the selected device (to allow for device switching w/o module re-loading)
                await this.smartSaveSelectedDevices(selectDevicesData);

                // Update the currently-active device (This will force a valid device to be selected).
                await this.qUpdateActiveDevice();

                // Report that a new device has been selected
                await this.qExecOnDeviceSelected();

                // Clear all config-bindings (if not disabled)
                this.clearConfigBindings();

                // Re-configure any smartBindings
                this.smartBindings.forEach((smartBinding) => {
                    this.putSmartBinding(smartBinding);
                });

                // Configure the device
                const results = await this.executeSetupBindings();

                // Report that the device has been configured
                await this.qExecOnDeviceConfigured(results);

                // Render the module's template
                await this.qRenderModuleTemplate();

                // Connect connect any established writeBindings to jquery events
                this.establishWriteBindings(this.writeBindings);

                // Report that the module's template has been loaded
                await this.qExecOnTemplateLoaded();

                // Start the DAQ loop
                await this.startLoop();

                // Display the module's template
                await this.qShowUserTemplate();

                // Report that the module's template has been displayed
                await this.qExecOnTemplateDisplayed();
            } catch (err) {
                await this.qExecOnLoadError(err);
            }
        },5);
    }

    /**
     * Get the currently selected device.
     *
     * @return {presenter.Device} The device selected as the "active" device.
    **/
    getSelectedDevice() {
        return this.activeDevice;
    }

    getSelectedDevices() {
        if (this.frameworkType === 'singleDevice') {
            return [this.activeDevice];
        } else if (this.frameworkType === 'multipleDevices') {
            return this.selectedDevices;
        } else {
            return [this.activeDevice];
        }
    }

    smartGetSelectedDevices() {
        if (this.frameworkType === 'singleDevice') {
            return this.getSelectedDevice();
        } else if (this.frameworkType === 'multipleDevices') {
            return this.getSelectedDevices();
        } else {
            return this.getSelectedDevice();
        }
    }

    /**
     * Function that should be called after all of the bindings have been added.
     *
     * Function that should be called after all of the config bindings have been
     * added and all of the config controls have been set.
    **/
    establishConfigControlBindings() {
        const jquery = this.jquery;
        this.configControls.forEach((value) => {
            jquery.on(value.selector, value.event, (event) => this._OnConfigControlEvent(event));
        });
    }

    /**
     * Stop the module's refresh loop.
    **/
    stopLoop() {
        this.runLoop = false;
    }

    async qStopLoop() {
        this.runLoop = false;
        if (this.frameworkLoopProcessing) {
            // console.log('framework loop is currently processing (qStopLoop)...');
            clearTimeout(this.frameworkLoopReference);
            let num = 0;

            while (this.isDAQLoopActive) {
                num++;
                await new Promise(resolve => setTimeout(resolve, 100));
            }
        }
    }

    /**
     * Start the module's refresh loop.
    **/
    async startLoop() {
        this.runLoop = true;
        this.isDAQLoopActive = true;
        // this.loopIteration();
        await this.runLoopIteration();
    }

    printCurTime(message) {
        const d = new Date();
        console.log(message, d.valueOf() - this.iterationTime - this.refreshRate);
    }

    async getNeededAddresses() {
        this.daqLoopStatus = 'getNeededAddresses';
        const addresses = [];
        const formats = [];
        const customFormatFuncs = [];
        const bindings = [];

        // Loop through all registered bindings and determine what should be
        // done.
        this.readBindings.forEach((value, key) => {
            // For each binding check to see if it should be executed by
            // checking its currentDelay.  If it equals zero than it needs
            // to be executed.
            if (value.currentDelay <= 0) {
                // Search bindings for custom bindings
                const callbackString = CALLBACK_STRING_CONST;
                const baseStr = value.binding;
                const searchIndex = baseStr.search(callbackString);
                if (searchIndex < 0) {
                    // if the CALLBACK_STRING_CONST tag wasn't found then
                    // add the binding to the list of registers that needs
                    // to be queried from the device.
                    addresses.push(value.binding);
                    formats.push(value.format);
                    customFormatFuncs.push(value.customFormatFunc);
                }
                bindings.push(value);

                // Re-set the binding's delay with the new delay
                value.currentDelay = value.iterationDelay;
                this.readBindings.set(key, value);
            } else {
                // Decrement the binding's delay
                value.currentDelay = value.currentDelay - 1;
                this.readBindings.set(key, value);
            }
        });
        if (addresses.length > 0) {
            return {
                addresses: addresses,
                formats: formats,
                customFormatFuncs: customFormatFuncs,
                bindings: bindings
            };
        } else {
            throw 'delay1';
        }
    }

    triggerModuleOnRefresh(bindingsInfo) {
        return new Promise((resolve, reject) => {
            this.daqLoopStatus = 'triggerModuleOnRefresh';
            this.fire(
                'onRefresh',
                [bindingsInfo],
                () => {
                    reject();
                },
                () => {
                    resolve(bindingsInfo);
                }
            );
        });
    }

    requestDeviceValues(bindingsInfo) {
        this.daqLoopStatus = 'requestDeviceValues';

        if (bindingsInfo.addresses.length === 0) {
            return Promise.resolve({
                values: [],
                addresses: [],
                formats: [],
                customFormatFuncs: []
            });
        }

        const device = this.getSelectedDevice();
        return device.sReadMany(bindingsInfo.addresses)
            .then((values) => {
                    return {
                        values: values,
                        addresses: bindingsInfo.addresses,
                        formats: bindingsInfo.formats,
                        customFormatFuncs: bindingsInfo.customFormatFuncs,
                        bindings: bindingsInfo.bindings
                    };
                }
            );
    }

    processDeviceValues(valuesInfo) {
        this.daqLoopStatus = 'processDeviceValues';
        const values = valuesInfo.values;
        const addresses = valuesInfo.addresses;
        const formats = valuesInfo.formats;
        const customFormatFuncs = valuesInfo.customFormatFuncs;
        const bindings = valuesInfo.bindings;
        const retDict = new Map();

        // Iterate through the bindings executed using the async library
        let curDeviceIOIndex = 0;

        const innerProcessSingleDeviceValue = (binding, nextStep) => {
            // Executed for each binding
            // Search binding string for callback bindings tag
            const baseStr = binding.binding;
            const searchIndex = binding.binding.search(CALLBACK_STRING_CONST);
            const dataKey = binding.dataKey;
            const index = curDeviceIOIndex;
            const curResult = values[index];
            const curAddress = addresses[index];
            let stringVal;
            let curValue;
            let curVal;

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
                const curFormat = formats[index];
                const curCustomFormatFunc = customFormatFuncs[index];

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
                            framework: this,
                            module: this.module,
                            device: this.getSelectedDevice(),
                            binding: binding,
                            value: curValue,
                            stringVal: stringVal
                        },
                        function executeNextStep() {
                            //Instruct async to perform the next step
                            nextStep();
                        });
                } catch (e) {
                    this.reportSyntaxError(
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

        return new Promise((resolve) => {
            async.eachSeries(
                bindings,
                (binding, nextStep) => {
                    try {
                        innerProcessSingleDeviceValue(binding, nextStep);
                    } catch (err) {
                        console.warn('Caught error while in processSingleDeviceValue', err);
                        nextStep();
                    }
                },
                () => {
                    //Executed when all bindings have been executed
                    resolve(retDict);
                });
        });
    }

    triggerModuleOnRefreshed(valuesDict) { // Probably not user anywhere
        return new Promise((resolve, reject) => {
            this.daqLoopStatus = 'triggerModuleOnRefreshed';
            this.fire(
                'onRefreshed',
                [valuesDict],
                reject,
                () => {
                    resolve();
                }
            );
        });
    }

    async verifyFrameworkIsActive() {
        // Make sure that this framework instance is active.
        if (!this.frameworkActive) {
            this.isDAQLoopActive = false;
            throw 'stoppingLoop0';
        }

        // Make sure that the loop should be executing.
        if (!this.runLoop) {
            this.isDAQLoopActive = false;
            throw 'stoppingLoop1';
        }
    }

    async innerRunDAQLoop(deviceAttributes) {
        // Only run the DAQ loop if the active device is connected.
        // if (deviceAttributes.isConnected) {
        if (deviceAttributes.isConnected) {

            this.daqLoopFinished = false;
            this.daqLoopStatus = 'startingLoop';

            // Get the current list of bindings
            try {
                const bindingsInfo = await this.getNeededAddresses(); // throws 'delay'
                await this.verifyFrameworkIsActive(); // throws stoppingLoop

                // Inform the active module that data is being refreshed
                // await this.triggerModuleOnRefresh(bindingsInfo); // NOT USED?
                // await this.verifyFrameworkIsActive();

                // Collect data from the active device
                const valuesInfo = await this.requestDeviceValues(bindingsInfo);
                await this.verifyFrameworkIsActive();

                // Process the collected device data
                const valuesDict = await this.processDeviceValues(valuesInfo);
                await this.verifyFrameworkIsActive();

                // Render collected data/perform DOM manipulations
                this.daqLoopStatus = 'displayDeviceValues';
                this._OnRead(valuesDict);

                await this.verifyFrameworkIsActive();

                // Inform the active module that data was refreshed
                await this.triggerModuleOnRefreshed(valuesDict);
                await this.verifyFrameworkIsActive();

             } catch (err) {
                if (err !== 'delay') {
                    if (err === 'stoppingLoop') {
                        return Promise.reject(err);
                    } else {
                        this.daqLoopStatus = 'reportError';
                        return new Promise((resolve, reject) => {
                            // TODO: Get register names from readBindings.
                            this.fire(
                                'onRefreshError',
                                [ this.readBindings , err ],
                                (shouldContinue) => {
                                    this.loopErrorEncountered = true;
                                    this.loopErrors.push({details:err,func:'reportError'});
                                    this.runLoop = shouldContinue;
                                    if (shouldContinue) {
                                        this.printLoopErrors(
                                            'onRefreshError b/c loopIteration.reportError',
                                            err
                                        );
                                        reject(new Error('delay2'));
                                    } else {
                                        reject(new Error('stoppingLoop2'));
                                    }
                                }
                            );
                        });
                    }
                } else {
                    // Report that the DAQ loop has finished executing
                    // console.log('DAQ Loop Finished', data);
                    try {
                        await this.triggerModuleOnRefreshed([]);
                    } catch (err) {
                        console.error('Error in reportFinishedDaqLoop', err);
                    }
                }
                this.daqLoopFinished = true;
                this.daqLoopStatus = 'finishedDaqLoop';
            }
        } else {
            // Resolve & wait for the next iteration.
            return this.triggerModuleOnRefreshed([]);
        }
    }

    configureLoopTimer() {
        this.frameworkLoopProcessing = false;
        this.frameworkLoopReference = setTimeout(
            () => this.runLoopIteration(),
            this.refreshRate
        );
    }

    async runLoopIteration() {
        this.frameworkLoopProcessing = true;
        // Make sure that this framework instance is active.
        if (!this.frameworkActive) {
            this.isDAQLoopActive = false;
        }

        // Make sure that the loop should be executing.
        if (!this.runLoop) {
            this.isDAQLoopActive = false;
        }

        try {
            if (this.isDAQLoopPaused) {
                // If the framework is paused then don't execute any of the update
                // code and configure a shorter timer.
                await this.verifyFrameworkIsActive();

                this.frameworkLoopProcessing = false;
                this.frameworkLoopReference = setTimeout(
                    () => this.runLoopIteration(),
                    this.pausedRefreshRate
                );
            } else {
                const promises = [];
                promises.push(new Promise(async (resolve, reject) => {
                    try {
                        const result = await this.innerRunDAQLoop(this.activeDevice.savedAttributes)
                        resolve(result);
                    } catch (err) {
                        reject(err);
                    }
                }));

                await Promise.allSettled(promises);
                await this.verifyFrameworkIsActive();
                await this.configureLoopTimer();
            }
        } catch (err) {
            console.error(err);
        }
    }

    _OnRead(valueReadFromDevice) {
        const jquery = this.jquery;
        if (valueReadFromDevice !== undefined) {
            this.readBindings.forEach((bindingInfo) => {
                const bindingName = bindingInfo.binding;
                    try {
                    const valRead = valueReadFromDevice.get(bindingName.toString());
                    if (valRead !== undefined) {
                        const jquerySelector = '#' + bindingInfo.template;
                        if (bindingInfo.displayType === 'standard') {
                            const vals = jquery.html(jquerySelector, valRead.replace(' ','&nbsp;'));
                            if (vals.length === 0) {
                                jquery.html('.' + bindingInfo.template, valRead.replace(' ','&nbsp;'));
                            }
                        } else if (bindingInfo.displayType === 'input') {
                            if (!jquery.is(jquerySelector, ':focus')) {
                                jquery.val(jquerySelector, valRead.toString());
                            }
                        } else {

                        }
                    }
                } catch (err) {
                    console.warn('Error in FW updateEachValue', bindingName, err);
                }
            });
        }
    }

    _OnConfigControlEvent(event) {
        this.fire('onRegisterWrite', [event]);
        this.fire('onRegisterWritten', [event]);
    }

    getActiveTabID() {
        return this.currentModuleName + '-' + this.numModuleReloads.toString();
    }

    configureActiveTabID(tabID) {
        this.uniqueTabID = tabID;
    }

    configFramework(viewLoc) {
        this.userViewFile = viewLoc; // [moduleName]/view.html
    }

    configureFrameworkData(jsonDataFiles) {
        this.moduleJsonFiles = jsonDataFiles;
    }

    saveModuleName() {
        this.moduleName = this.getActiveTabID();
    }

    setCustomContext(data) {
        this.moduleTemplateBindings.set('custom', fixElectron(data));
    }

    async startFramework() {
        const newStartupData = await module_manager.getModuleStartupData(this.currentModuleName);
        await this.saveModuleStartupDataReference(newStartupData);
        await this.qExecVerifyStartupData('initializeStartupData');

        if (this.allowModuleExecution) {
            await new Promise((resolve, reject) => {
                this.fire(
                    'onModuleLoaded',
                    [],
                    (err) => reject(err),
                    () => {
                        this.isModuleLoaded = true;
                        resolve();
                    }
                );
            });
        } else {
            await this.qExecOnUnloadModule();
        }
    }

    programExitListener() {
        // Save module startup data & always finish successfully.
        return this.saveModuleStartupData('programExitListener')
            .then(() => {
                console.log('Finished saving successfully');
            }, (err) => {
                console.error('Got an error saving', err);
            });
    }

    async runFramework() {
        // Add exit listener.
        try {
            if (global.ADD_K3_EXIT_LISTENER) {
                global.ADD_K3_EXIT_LISTENER('presenter-framework-notifier', () => this.programExitListener());
            }
        } catch(err) {
            console.log('presenter_framework.js addProgramExitListener err', err);
        }

        this.numModuleReloads += 1;
        this.saveModuleName();

        try {
            // Update the currently-active device (This will force a valid device to be selected).
            await this.qUpdateActiveDevice();

            // Report that a new device has been selected
            await this.qExecOnDeviceSelected();

            // Clear all config-bindings (if not disabled)
            this.clearConfigBindings();

            // Re-configure any smartBindings
            this.smartBindings.forEach((smartBinding) => {
                this.putSmartBinding(smartBinding);
            });

            // Configure the device
            const results = await this.executeSetupBindings();

            // Report that the device has been configured
            await this.qExecOnDeviceConfigured(results);

            // Render the module's template
            await this.qRenderModuleTemplate();

            // Connect connect any established writeBindings to jquery events
            this.establishWriteBindings(this.writeBindings);

            // Report that the module's template has been loaded
            await this.qExecOnTemplateLoaded();

            // Start the DAQ loop
            this.startLoop();

            // Display the module's template
            await this.qShowUserTemplate();

            // Report that the module's template has been displayed
            await this.qExecOnTemplateDisplayed();
        } catch (err) {
            await this.qExecOnLoadError(err);
        }
    }

    saveStartupDataReference(newStartupData) {
        this.startupData = undefined;
        this.isStartupDataValid = false;
        if (newStartupData) {
            try {
                this.startupData = JSON.parse(JSON.stringify(newStartupData));
                this.isStartupDataValid = true;
            } catch(err) {
                console.error(
                    'presenter_framework: Error Copying startupData object',
                    err
                );
                this.startupData = {};
                this.isStartupDataValid = false;
            }
        }
    }

    saveModuleInfo(infoObj, constantsObj, moduleObj, moduleDataObj) {
        this.moduleData = moduleDataObj.data;
        this.saveModuleName();
        this.moduleInfoObj = infoObj; // The module.json file obj
        this.moduleConstants = constantsObj; // The moduleConstants.json file obj
        this.module = moduleObj;  // A reference to the created module

        this.startupData = undefined;
        this.isStartupDataValid = false;

        this.frameworkType = infoObj.data.framework;

        try {
            this.deviceErrorCompiledTemplate = handlebars.compile(
                moduleDataObj.data.htmlFiles.device_errors_template
            );
            this.printableDeviceErrorCompiledTemplate = handlebars.compile(
                moduleDataObj.data.htmlFiles.printable_device_errors_template
            );
        } catch(err) {
            console.error('Error compiling deviceErrors template', err);
        }
    }
}

global.PresenterFramework = PresenterFramework;
