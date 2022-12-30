'use strict';

// Define a placeholder for the user's module object.
var sdModule;
const package_loader = global.package_loader;
const handleBarsService = package_loader.getPackage('handleBarsService');
const path = require('path');
const EventEmitter = require('events').EventEmitter;
const modbus_map = require('ljswitchboard-modbus_map').getConstants();

class FakeDriver {
    logSSync() {
        console.log('in fake driver logSSync');
    }
    writeLibrarySync() {
        console.log('in fake driver writeLibrarySync');
    }
    readLibrarySync() {
        console.log('in fake driver readLibrarySync');
    }
}

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

class ModuleInstance extends EventEmitter {
    constructor() {
        super();
        this.DEBUG_FRAMEWORK_CONNECTOR = true;

        this.moduleData = {};
        this.eventList = {
            'MODULE_STARTED': 'MODULE_STARTED',
            'MODULE_STOPPED': 'MODULE_STOPPED',
        };

        global.MODULE_LOADER.addPreloadStep((param) => this.preLoadStep(param));
        global.MODULE_LOADER.addUnloadStep(() => this.unloadStep());

        // Attach to MODULE_LOADER events that indicate to the module about what to
        // do.  (start/stop).
        const mlEvents = global.MODULE_LOADER.eventList;
        global.MODULE_LOADER.on(mlEvents.VIEW_READY, (param) => this.startModule(param));
        global.MODULE_LOADER.on(mlEvents.UNLOAD_MODULE, () => this.stopModule());
    }

    async initializeModule(moduleData) {
        if (this.DEBUG_FRAMEWORK_CONNECTOR) {
            console.info('initializing framework', moduleData.data);
        }
        try {
            // Configure the module's name
            let createdModuleName = '';
            try {
                createdModuleName += moduleData.name;
                createdModuleName += '-';
                createdModuleName += moduleData.context.stats.numLoaded.toString();
            } catch(err) {
                createdModuleName = '';
            }
            console.log('initializeModule', createdModuleName);

            // Create an instance of the sdFramework
            this.sdFramework = new global.PresenterFramework();

            // Configure framework with the jQueryWrapper
            this.sdFramework._SetJQuery(new JQueryWrapper());

            // if (global.sdModule) {
            //     await new Promise((resolve, reject) => global.sdModule.onUnloadModule(this, () => reject(), () => resolve()));
            // }

            // Create an instance of the user's module.
            console.log('1111', module);
            sdModule = new module();
            console.log('11112');
            global.sdModule = sdModule;
            console.warn(this.sdFramework)

            this.sdFramework.numModuleReloads = 0;
            this.sdFramework.currentModuleName = moduleData.name;
            this.sdFramework.saveModuleName();
        } catch(err) {
            console.log('Error Initializing Module', err, err.stack);
        }
    }

    linkModule(moduleData) {
        if (this.DEBUG_FRAMEWORK_CONNECTOR) {
            console.info('linking framework to module', moduleData.data);
        }

        try {
            // Try and link the framework to the various implemented functions,
            // if they don't exist don't link them.
            if(typeof(sdModule.verifyStartupData) === "function") {
                this.sdFramework.on('verifyStartupData', (...params) => sdModule.verifyStartupData(...params));
            }
            if(typeof(sdModule.onModuleLoaded) === "function") {
                this.sdFramework.on('onModuleLoaded', (...params) => sdModule.onModuleLoaded(...params));
            }
            if(typeof(sdModule.onDevicesSelected) === "function") {
                this.sdFramework.on('onDevicesSelected', (...params) => sdModule.onDevicesSelected(...params));
            }
            if(typeof(sdModule.onDevicesConfigured) === "function") {
                this.sdFramework.on('onDevicesConfigured', (...params) => sdModule.onDevicesConfigured(...params));
            }
            if(typeof(sdModule.onDeviceSelected) === "function") {
                this.sdFramework.on('onDeviceSelected', (...params) => sdModule.onDeviceSelected(...params));
            }
            if(typeof(sdModule.onDeviceConfigured) === "function") {
                this.sdFramework.on('onDeviceConfigured', (...params) => sdModule.onDeviceConfigured(...params));
            }
            if(typeof(sdModule.onTemplateLoaded) === "function") {
                this.sdFramework.on('onTemplateLoaded', (...params) => sdModule.onTemplateLoaded(...params));
            }
            if(typeof(sdModule.onTemplateDisplayed) === "function") {
                this.sdFramework.on('onTemplateDisplayed', (...params) => sdModule.onTemplateDisplayed(...params));
            }
            if(typeof(sdModule.onRegisterWrite) === "function") {
                this.sdFramework.on('onRegisterWrite', (...params) => sdModule.onRegisterWrite(...params));
            }
            if(typeof(sdModule.onRegisterWritten) === "function") {
                this.sdFramework.on('onRegisterWritten', (...params) => sdModule.onRegisterWritten(...params));
            }
            if(typeof(sdModule.onRefresh) === "function") {
                this.sdFramework.on('onRefresh', (...params) => sdModule.onRefresh(...params));
            }
            if(typeof(sdModule.onRefreshed) === "function") {
                this.sdFramework.on('onRefreshed', (...params) => sdModule.onRefreshed(...params));
            }
            if(typeof(sdModule.onCloseDevice) === "function") {
                this.sdFramework.on('onCloseDevice', (...params) => sdModule.onCloseDevice(...params));
            }
            if(typeof(sdModule.onUnloadModule) === "function") {
                this.sdFramework.on('onUnloadModule', (...params) => sdModule.onUnloadModule(...params));
            }
            if(typeof(sdModule.onLoadError) === "function") {
                this.sdFramework.on('onLoadError', (...params) => sdModule.onLoadError(...params));
            }
            if(typeof(sdModule.onWriteError) === "function") {
                this.sdFramework.on('onWriteError', (...params) => sdModule.onWriteError(...params));
            }
            if(typeof(sdModule.onRefreshError) === "function") {
                this.sdFramework.on('onRefreshError', (...params) => sdModule.onRefreshError(...params));
            }
        } catch(err) {
            console.error('Error Linking sdFramework to current module', err);
        }
    }

    saveFormData(moduleData) {
        this.sdFramework.saveModuleInfo(
            moduleData.data,
            moduleData.data.json.moduleConstants,
            sdModule,
            moduleData
        );
    }

    loadModule(moduleData) {
        if(this.DEBUG_FRAMEWORK_CONNECTOR) {
            console.info('loading framework module', moduleData.data);
        }
        console.warn("moduleData", moduleData)
        return new Promise((resolve) => {
            try {
                //Configure framework's update frequency
                if(typeof(global.MODULE_UPDATE_PERIOD_MS) === "number") {
                    this.sdFramework.setRefreshRate(global.MODULE_UPDATE_PERIOD_MS);
                } else if(typeof(moduleData.data.refreshRate) === 'number') {
                    this.sdFramework.setRefreshRate(moduleData.data.refreshRate);
                } else {
                    this.sdFramework.setRefreshRate(1000);
                }

                const moduleViewPath = path.join(moduleData.data.path, 'view.html');
                const moduleDataPath = path.join(moduleData.data.path, 'moduleData.json');

                // Configure the framework to use the module's 'view.html' by default
                // Also configure the framework to use module's data, 'moduleData.json'
                this.sdFramework.configFramework(moduleViewPath);
                this.sdFramework.configureFrameworkData([moduleDataPath]);

                // saves the module data into data.json
                this.saveFormData(moduleData);

                this.sdFramework.ljmDriver = new FakeDriver();

                // Start the framework
                if(this.DEBUG_FRAMEWORK_CONNECTOR) {
                    console.debug('Starting Module', moduleData.name);
                }
                this.sdFramework.startFramework()
                    .then(function() {
                        console.debug('Started FW');
                        resolve(moduleData);
                    },function() {
                        console.error('Failed Starting FW');
                        resolve(moduleData);
                    });
            } catch(err) {
                console.error('Error Loading sdFramework', err);
            }
        });
    }

    async runModule(moduleData) {
        if(this.DEBUG_FRAMEWORK_CONNECTOR) {
            console.info('running module', moduleData.data);
        }
        try {
            await this.sdFramework.runFramework();
        } catch (err) {
            console.error('Error Running sdFramework', err);
        }
    }

    reportModuleStarted(moduleData) {
        if (this.DEBUG_FRAMEWORK_CONNECTOR) {
            console.info('Reporting Module Started');
        }

        this.emit(this.eventList.MODULE_STARTED);
        const data = {
            'name': moduleData.name,
        };
        global.MODULE_CHROME.emit('MODULE_READY', data);
        global.MODULE_LOADER.emit('MODULE_READY', data);
    }

    async startModule(moduleData) {
        if(this.DEBUG_FRAMEWORK_CONNECTOR) {
            console.info('framework starting', moduleData.data);
        }

        // Start the framework.....
        await this.initializeModule(moduleData.data);
        await this.linkModule(moduleData);
        await this.loadModule(moduleData);
        await this.runModule(moduleData);
        await this.reportModuleStarted(moduleData);
    }

    async unloadStep() {
        if (this.sdFramework) {
            await this.sdFramework.qExecOnUnloadModule();
            if (this.DEBUG_FRAMEWORK_CONNECTOR) {
                console.info('sdFramework Stopped');
            }
        }
    }

    stopModule() {
        this.emit(this.eventList.MODULE_STOPPED);
    }

    // Attach a pre-load step to the Module loader
    async preLoadStep(newModule) {
        if(this.DEBUG_FRAMEWORK_CONNECTOR) {
            console.info('In PRE-LOAD STEP', newModule);
        }
        // For each device, build a deviceErrorMessages object

        const devices = newModule.context.devices;
        for(let i = 0; i < devices.length; i++) {
            devices[i].deviceErrorMessages = [];
            for (let j = 0; j < devices[i].deviceErrors.length; j++) {
               const errorMessage = await handleBarsService.renderHtmlTemplate(newModule.htmlFiles.device_errors_template, extrapolateDeviceErrorData(
                    devices[i].deviceErrors[j]
                ));
                devices[i].deviceErrorMessages.push(errorMessage);
            }
        }

        newModule.context.frameworkType = {};
        if(newModule.data.framework === 'singleDevice') {
            newModule.context.frameworkType.singleDevice = true;
        } else if(newModule.data.framework === 'multipleDevices') {
            newModule.context.frameworkType.multipleDevices = true;
        }

        // Determine if device selection is disabled
        const framework_options = {
            device_selection: true,
        };
        if (newModule.data.framework_options) {
            const device_selection = newModule.data.framework_options.device_selection;
            const device_selection_type = typeof(device_selection);
            if (device_selection || device_selection_type === 'undefined' || device_selection_type === 'null') {
                framework_options.device_selection = true;
            } else {
                framework_options.device_selection = device_selection !== false;
            }
        }
        newModule.context.framework_options = framework_options;

        return newModule;
    }
}
global.activeModule = new ModuleInstance();
