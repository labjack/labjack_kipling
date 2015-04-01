// Define a placeholder for the user's module object.
var sdModule = null;
var sdFramework = null;

var createModuleInstance = function() {

    var io_interface = io_manager.io_interface();
    var device_controller = io_interface.getDeviceController();

    this.moduleData = {};
    this.eventList = {
        'MODULE_STARTED': 'MODULE_STARTED',
        'MODULE_STOPPED': 'MODULE_STOPPED',
    };

    var initializeModule = function(moduleData) {
        var defered = q.defer();
        try {
            // Create an instance of the sdFramework
            sdFramework = new Framework();

            // Configure framework with the jQueryWrapper
            sdFramework._SetJQuery(new JQueryWrapper());

            // Create an instance of the user's module.
            sdModule = new module();
        } catch(err) {
            console.log('Error Initializing Module', err, err.stack);
        }
        defered.resolve(moduleData);
        return defered.promise;
    };

    var linkModule = function(moduleData) {
        var defered = q.defer();

        try {
            // Try and link the framework to the various implemented functions, 
            // if they don't exist don't link them.
            if(typeof(sdModule.onModuleLoaded) === "function") {
                sdFramework.on('onModuleLoaded',sdModule.onModuleLoaded);
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
        defered.resolve(moduleData);
        return defered.promise;
    };

    var loadModule = function(moduleData) {
        var defered = q.defer();

        try {
            //Configure framework's update frequency
            if(typeof(MODULE_UPDATE_PERIOD_MS) === "number") {
                sdFramework.setRefreshRate(MODULE_UPDATE_PERIOD_MS);
            } else if(typeof(moduleData.data.refreshRate) === 'number') {
                sdFramework.setRefreshRate(MODULE_UPDATE_PERIOD_MS);
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
            // console.debug('Starting Module', moduleData.name);
            sdFramework.startFramework()
            .then(function() {
                // console.debug('Started FW');
                defered.resolve(moduleData);
            },function() {
                console.log('Failed Starting FW');
                defered.resolve(moduleData);
            });
        } catch(err) {
            console.error('Error Loading sdFramework', err);
        }
        return defered.promise;
    };
    var runModule = function(moduleData) {
        var defered = q.defer();
        var resolveFunc = function() {
            defered.resolve(moduleData);
        };
        try {
            // console.debug('Running FW');
            sdFramework.runFramework()
            .then(resolveFunc, resolveFunc);
        } catch(err) {
            console.error('Error Running sdFramework', err);
            defered.resolve();
        }
        return defered.promise;
    };
    var reportModuleStarted = function(moduleData) {
        console.info('Reporting Module Started');
        var defered = q.defer();

        self.emit(self.eventList.MODULE_STARTED);
        var data = {
            'name': moduleData.name,
        };
        MODULE_CHROME.emit('MODULE_READY', data);
        MODULE_LOADER.emit('MODULE_READY', data);

        defered.resolve(moduleData);
        return defered.promise;
    };

    var startModule = function(moduleData) {
        console.info('framework starting', moduleData.data);
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
    var stopModule = function() {
        // console.log('device_selector stopped');
        if(sdFramework) {
            sdFramework.qExecOnUnloadModule()
            .then(function() {
                console.info('sdFramework Stopped');
            });
        }
        self.emit(self.eventList.MODULE_STOPPED);
    };

    // Attach to MODULE_LOADER events that indicate to the module about what to
    // do.  (start/stop).
    var mlEvents = MODULE_LOADER.eventList;
    MODULE_LOADER.on(mlEvents.VIEW_READY, startModule);
    MODULE_LOADER.on(mlEvents.UNLOAD_MODULE, stopModule);
    var self = this;
};
util.inherits(createModuleInstance, EventEmitter);

var activeModule = new createModuleInstance();