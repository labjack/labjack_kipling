// Define a placeholder for the user's module object.
var sdModule = null;
var sdFramework = null;
const package_loader = global.package_loader;
const handleBarsService = package_loader.getPackage('handleBarsService');
const path = require('path');
const EventEmitter = require('events').EventEmitter;

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

    initializeModule(moduleData) {
        if (this.DEBUG_FRAMEWORK_CONNECTOR) {
            console.info('initializing framework', moduleData.data);
        }
        try {
            // Create an instance of the sdFramework
            sdFramework = new global.Framework();

            // Configure framework with the jQueryWrapper
            sdFramework._SetJQuery(new JQueryWrapper());

            // Create an instance of the user's module.
            sdModule = new module();

            // Configure the module's name
            let createdModuleName = '';
            try {
                createdModuleName += moduleData.name;
                createdModuleName += '-';
                createdModuleName += moduleData.context.stats.numLoaded.toString();
            } catch(err) {
                createdModuleName = '';
            }
            sdFramework.numModuleReloads = 0;
            sdFramework.currentModuleName = moduleData.name;
            sdFramework.preConfiguredModuleName = createdModuleName;
            sdFramework.saveModuleName();
        } catch(err) {
            console.log('Error Initializing Module', err, err.stack);
        }
        return Promise.resolve(moduleData);
    }

    linkModule(moduleData) {
        if(this.DEBUG_FRAMEWORK_CONNECTOR) {
            console.info('linking framework to module', moduleData.data);
        }

        try {
            // Try and link the framework to the various implemented functions,
            // if they don't exist don't link them.
            if(typeof(sdModule.verifyStartupData) === "function") {
                sdFramework.on('verifyStartupData',sdModule.verifyStartupData);
            }
            if(typeof(sdModule.onModuleLoaded) === "function") {
                sdFramework.on('onModuleLoaded',sdModule.onModuleLoaded);
            }
            if(typeof(sdModule.onDevicesSelected) === "function") {
                sdFramework.on('onDevicesSelected',sdModule.onDevicesSelected);
            }
            if(typeof(sdModule.onDevicesConfigured) === "function") {
                sdFramework.on('onDevicesConfigured',sdModule.onDevicesConfigured);
            }
            if(typeof(sdModule.onDeviceSelected) === "function") {
                sdFramework.on('onDeviceSelected',sdModule.onDeviceSelected);
            }
            if(typeof(sdModule.onDeviceConfigured) === "function") {
                sdFramework.on('onDeviceConfigured',sdModule.onDeviceConfigured);
            }
            if(typeof(sdModule.onTemplateLoaded) === "function") {
                sdFramework.on('onTemplateLoaded',sdModule.onTemplateLoaded);
            }
            if(typeof(sdModule.onTemplateDisplayed) === "function") {
                sdFramework.on('onTemplateDisplayed',sdModule.onTemplateDisplayed);
            }
            if(typeof(sdModule.onRegisterWrite) === "function") {
                sdFramework.on('onRegisterWrite',sdModule.onRegisterWrite);
            }
            if(typeof(sdModule.onRegisterWritten) === "function") {
                sdFramework.on('onRegisterWritten',sdModule.onRegisterWritten);
            }
            if(typeof(sdModule.onRefresh) === "function") {
                sdFramework.on('onRefresh',sdModule.onRefresh);
            }
            if(typeof(sdModule.onRefreshed) === "function") {
                sdFramework.on('onRefreshed',sdModule.onRefreshed);
            }
            if(typeof(sdModule.onCloseDevice) === "function") {
                sdFramework.on('onCloseDevice',sdModule.onCloseDevice);
            }
            if(typeof(sdModule.onUnloadModule) === "function") {
                sdFramework.on('onUnloadModule',sdModule.onUnloadModule);
            }
            if(typeof(sdModule.onLoadError) === "function") {
                sdFramework.on('onLoadError',sdModule.onLoadError);
            }
            if(typeof(sdModule.onWriteError) === "function") {
                sdFramework.on('onWriteError',sdModule.onWriteError);
            }
            if(typeof(sdModule.onRefreshError) === "function") {
                sdFramework.on('onRefreshError',sdModule.onRefreshError);
            }
        } catch(err) {
            console.error('Error Linking sdFramework to current module', err);
        }
        return Promise.resolve(moduleData);
    }

    loadModule(moduleData) {
        if(this.DEBUG_FRAMEWORK_CONNECTOR) {
            console.info('loading framework module', moduleData.data);
        }
        return new Promise((resolve) => {
            try {
                //Configure framework's update frequency
                if(typeof(global.MODULE_UPDATE_PERIOD_MS) === "number") {
                    sdFramework.setRefreshRate(global.MODULE_UPDATE_PERIOD_MS);
                } else if(typeof(moduleData.data.refreshRate) === 'number') {
                    sdFramework.setRefreshRate(moduleData.data.refreshRate);
                } else {
                    sdFramework.setRefreshRate(1000);
                }

                const moduleViewPath = path.join(moduleData.path, 'view.html');
                const moduleDataPath = path.join(moduleData.path, 'moduleData.json');

                // Configure the framework to use the module's 'view.html' by default
                // Also configure the framework to use module's data, 'moduleData.json'
                sdFramework.configFramework(moduleViewPath);
                sdFramework.configureFrameworkData([moduleDataPath]);

                //Save loaded module data to the framework instance
                sdFramework.saveModuleInfo(
                    moduleData.data,
                    moduleData.json.moduleConstants,
                    sdModule,
                    moduleData
                );

                sdFramework.ljmDriver = new FakeDriver();

                // Start the framework
                if(this.DEBUG_FRAMEWORK_CONNECTOR) {
                    console.debug('Starting Module', moduleData.name);
                }
                sdFramework.startFramework()
                    .then(function() {
                        // console.debug('Started FW');
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

    runModule(moduleData) {
        if(this.DEBUG_FRAMEWORK_CONNECTOR) {
            console.info('running module', moduleData.data);
        }
        return new Promise((resolve) => {
            const resolveFunc = function () {
                resolve(moduleData);
            };
            try {
                sdFramework.runFramework()
                    .then(resolveFunc, resolveFunc);
            } catch (err) {
                console.error('Error Running sdFramework', err);
                resolve();
            }
        });
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

        return Promise.resolve(moduleData);
    }

    startModule(moduleData) {
        if(this.DEBUG_FRAMEWORK_CONNECTOR) {
            console.info('framework starting', moduleData.data);
        }

        // Start the framework.....
        this.initializeModule(moduleData.data)
            .then((param) => this.linkModule(param))
            .then((param) => this.loadModule(param))
            .then((param) => this.runModule(param))
            .then((param) => this.reportModuleStarted(param));
    }

    unloadStep() {
        if (sdFramework) {
            return sdFramework.qExecOnUnloadModule()
                .then(function () {
                    if (this.DEBUG_FRAMEWORK_CONNECTOR) {
                        console.info('sdFramework Stopped');
                    }
                });
        }
    }

    stopModule() {
        this.emit(this.eventList.MODULE_STOPPED);
    }

    // Attach a pre-load step to the Module loader
    async preLoadStep(newModule) {
        try {
            const flags = newModule.data.framework_flags;
            this.DEBUG_FRAMEWORK_CONNECTOR = flags.debug_framework_connector;
        } catch(err) {}

        if(this.DEBUG_FRAMEWORK_CONNECTOR) {
            console.info('In PRE-LOAD STEP', newModule);
        }
        // For each device, build a deviceErrorMessages object

        const devices = newModule.context.devices;
        for(let i = 0; i < devices.length; i++) {
            devices[i].deviceErrorMessages = [];
            for (let j = 0; j < devices[i].deviceErrors.length; j++) {
               const errorMessage = await handleBarsService.renderHtmlTemplate(newModule.htmlFiles.device_errors_template, global.extrapolateDeviceErrorData(
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
            if(device_selection) {
                framework_options.device_selection = true;
            } else if (device_selection_type === 'undefined') {
                framework_options.device_selection = true;
            } else if (device_selection_type === 'null') {
                framework_options.device_selection = true;
            } else if (device_selection === false) {
                framework_options.device_selection = false;
            } else {
                framework_options.device_selection = true;
            }
        }
        newModule.context.framework_options = framework_options;

        return Promise.resolve(newModule);
    }
}
global.activeModule = new ModuleInstance();
