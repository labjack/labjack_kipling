// Define a placeholder for the user's module object.
var sdModule = null;
var sdFramework = null;
const package_loader = global.package_loader;
const handleBarsService = package_loader.getPackage('handleBarsService');
const path = require('path');
const util = require('util');
const EventEmitter = require('events').EventEmitter;

var createModuleInstance = function() {
    this.DEBUG_FRAMEWORK_CONNECTOR = true;

    this.moduleData = {};
    this.eventList = {
        'MODULE_STARTED': 'MODULE_STARTED',
        'MODULE_STOPPED': 'MODULE_STOPPED',
    };

    var initializeModule = function(moduleData) {
        if(self.DEBUG_FRAMEWORK_CONNECTOR) {
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
            var createdModuleName = '';
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
    };

    var linkModule = function(moduleData) {
        if(self.DEBUG_FRAMEWORK_CONNECTOR) {
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
    };

    var loadModule = function(moduleData) {
        if(self.DEBUG_FRAMEWORK_CONNECTOR) {
            console.info('loading framework module', moduleData.data);
        }
        return new Promise((resolve, reject) => {
            try {
                //Configure framework's update frequency
                if(typeof(MODULE_UPDATE_PERIOD_MS) === "number") {
                    sdFramework.setRefreshRate(MODULE_UPDATE_PERIOD_MS);
                } else if(typeof(moduleData.data.refreshRate) === 'number') {
                    sdFramework.setRefreshRate(moduleData.data.refreshRate);
                } else {
                    sdFramework.setRefreshRate(1000);
                }

                var numLoaded = moduleData.context.stats.numLoaded;
                var uniqueTabName = moduleData.name + '-' + numLoaded.toString();

                var moduleViewPath = path.join(moduleData.path, 'view.html');
                var moduleDataPath = path.join(moduleData.path, 'moduleData.json');

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

                var createFakeDriver = function() {
                    this.logSSync = function(level, str) {
                        console.log('in fake driver logSSync');
                    };
                    this.writeLibrarySync = function(str, val) {
                        console.log('in fake driver writeLibrarySync');
                    };
                    this.readLibrarySync = function(str) {
                        console.log('in fake driver readLibrarySync');
                    };
                };
                sdFramework.ljmDriver = new createFakeDriver();

                // Start the framework
                if(self.DEBUG_FRAMEWORK_CONNECTOR) {
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
    };
    var runModule = function(moduleData) {
        if(self.DEBUG_FRAMEWORK_CONNECTOR) {
            console.info('running module', moduleData.data);
        }
        return new Promise((resolve, reject) => {
            var resolveFunc = function () {
                resolve(moduleData);
            };
            try {
                // console.debug('Running FW');
                sdFramework.runFramework()
                    .then(resolveFunc, resolveFunc);
            } catch (err) {
                console.error('Error Running sdFramework', err);
                resolve();
            }
        });
    };
    var reportModuleStarted = function(moduleData) {
        if(self.DEBUG_FRAMEWORK_CONNECTOR) {
            console.info('Reporting Module Started');
        }

        self.emit(self.eventList.MODULE_STARTED);
        var data = {
            'name': moduleData.name,
        };
        global.MODULE_CHROME.emit('MODULE_READY', data);
        global.MODULE_LOADER.emit('MODULE_READY', data);

        return Promise.resolve(moduleData);
    };

    var startModule = function(moduleData) {
        if(self.DEBUG_FRAMEWORK_CONNECTOR) {
            console.info('framework starting', moduleData.data);
        }
        // self.moduleData = newModule.data;

        /*
        ex:
        moduleData.id = "#module-chrome-current-module-2",
        moduleData.name = "device_info_fw"
        moduleData.data = {
            'baseData',
            'context',
            'css': [],
            'data': {},
            'html': [],
            'htmlFiles': {},
            'js': [],
            'json': {},
            'jsonFiles': [],
        }
        */

        // Start the framework.....
        initializeModule(moduleData.data)
        .then(linkModule)
        .then(loadModule)
        .then(runModule)
        .then(reportModuleStarted);
    };
    var unloadStep = function() {
        return new Promise((resolve, reject) => {
            if (sdFramework) {
                sdFramework.qExecOnUnloadModule()
                    .then(function () {
                        if (self.DEBUG_FRAMEWORK_CONNECTOR) {
                            console.info('sdFramework Stopped');
                        }
                        resolve();
                    });
            }
        });
    };
    var stopModule = function() {
        // console.log('device_selector stopped');
        self.emit(self.eventList.MODULE_STOPPED);
    };

    // Attach a pre-load step to the Module loader
    var preLoadStep = async function(newModule) {
        try {
            var flags = newModule.data.framework_flags;
            self.DEBUG_FRAMEWORK_CONNECTOR = flags.debug_framework_connector;
        } catch(err) {}

        if(self.DEBUG_FRAMEWORK_CONNECTOR) {
            console.info('In PRE-LOAD STEP', newModule);
        }
        // For each device, build a deviceErrorMessages object
        var i, j;
        var devices = newModule.context.devices;
        for(i = 0; i < devices.length; i++) {

            devices[i].deviceErrorMessages = [];
            for (j = 0; j < devices[i].deviceErrors.length; j++) {
                var errorMessage = '';
                errorMessage = await handleBarsService.renderHtmlTemplate(newModule.htmlFiles.device_errors_template, extrapolateDeviceErrorData(
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
        var framework_options = {
            device_selection: true,
        };
        if(newModule.data.framework_options) {
            var device_selection = newModule.data.framework_options.device_selection;
            var device_selection_type = typeof(device_selection);
            if(device_selection) {
                framework_options.device_selection = true;
            } else if(device_selection_type === 'undefined') {
                framework_options.device_selection = true;
            } else if(device_selection_type === 'null') {
                framework_options.device_selection = true;
            } else if(device_selection === false) {
                framework_options.device_selection = false;
            } else {
                framework_options.device_selection = true;
            }
        }
        newModule.context.framework_options = framework_options;

        return Promise.resolve(newModule);
    };
    global.MODULE_LOADER.addPreloadStep(preLoadStep);
    global.MODULE_LOADER.addUnloadStep(unloadStep);

    // Attach to MODULE_LOADER events that indicate to the module about what to
    // do.  (start/stop).
    var mlEvents = global.MODULE_LOADER.eventList;
    global.MODULE_LOADER.on(mlEvents.VIEW_READY, startModule);
    global.MODULE_LOADER.on(mlEvents.UNLOAD_MODULE, stopModule);
    var self = this;
};
util.inherits(createModuleInstance, EventEmitter);

global.activeModule = new createModuleInstance();
