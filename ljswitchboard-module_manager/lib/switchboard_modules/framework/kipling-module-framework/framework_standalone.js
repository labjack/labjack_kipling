const labjack = require('labjack-nodejs');
const framework_standalone_ui = require('./framework_standalone_ui');
const presenter_framework = require('./presenter_framework');

const package_loader = global.package_loader;
const fs_facade = package_loader.getPackage('fs_facade');

/**
 * Fire an event listener and resolve a given deferred after it returns.
 *
 * @param {String} event The name of the event to fire.
 * @param {Object} environment Environment information object. The framework for
 *      this environment will be passed to the event listener.
 * @param {func} resolve after the event listeners
 * @param {func} reject if the event listeners encounter an error.
**/
function fireAndResolve(event, environment, resolve, reject) {
    environment.framework.fire(event, environment.framework)
        .then(() => resolve(environment), (err) => reject(err));
}

/**
 * Add a presenter framework to the given environment.
 *
 * @param {Object} environment The environment to add the framework to
 * @return {Promise} Promise that resolves after the framework has been added
 *      to the presenter. Resolves to the environment.
**/
function prepareFramework (environment) {
    environment.framework = new presenter_framework.Framework();
    return Promise.resolve(environment);
}

/**
 * Add information about the selected module to the environemtn.
 *
 * @param {Object} environment The environment information object to add the
 *      module information to.
 * @return {Promise} Promise that resolves after the module information has
 *      been added to the environment.
**/
function loadModuleInfo (environment) {
    return new Promise((resolve, reject) => {
        fs_facade.getModuleInfo(
            environment.moduleName,
            reject,
            function (info) {
                environment.moduleInfo = info;
                resolve(environment);
            }
        );
    });
}

/**
 * Load the controller for a module.
 *
 * @param {Object} environment The environment information object to add the
 *      loaded module controller to.
 * @return {Promise} Promise that resolves to the modified environment after
 *      the controller has been loaded.
**/
function loadModuleLogic (environment) {
    const moduleName = environment.moduleInfo.name;
    const controllerLocalLoc = '/' + moduleName + '/controller';
    const controllerGlobalLoc = fs_facade.getExternalURI(controllerLocalLoc);
    environment.module = require(controllerGlobalLoc);

    return Promise.resolve(environment);
}

/**
 * Examine the module controller for standard event callbacks.
 *
 * Examine the loaded module's exports for standard event callbacks namely:
 *  - moduleLoad
 *  - loadTemplate
 *  - deviceSelection
 *  - configureDevice
 *  - deviceConfigured
 *  - refresh
 *  - closeDevice
 *  - unloadModule
 *  - loadError
 *  - configError
 *  - refreshError
 *
 * @param {Object} environment The environment infromation object with the
 *      module controller to examine.
 * @return {Promise} Promise that resolves after the target module controller
 *      has been examined. Resolves to the environment.
**/
function loadModuleCallbacks (environment) {
    return new Promise((resolve, reject) => {
        const module = environment.module;
        const onModuleLoad = module.moduleLoad;
        const onLoadTemplate = module.loadTemplate;
        const onDeviceSelection = module.deviceSelection;
        const onConfigureDevice = module.configureDevice;
        const onDeviceConfigured = module.deviceConfigured;
        const onRefresh = module.refresh;
        const onCloseDevice = module.closeDevice;
        const onUnloadModule = module.unloadModule;
        const onLoadError = module.loadError;
        const onConfigError = module.configError;
        const onRefreshError = module.refreshError;

        if (onModuleLoad) {
            environment.framework.on('moduleLoad', onModuleLoad);
        }

        if (onLoadTemplate) {
            environment.framework.on('loadTemplate', onLoadTemplate);
        }

        if (onDeviceSelection) {
            environment.framework.on('deviceSelection', onDeviceSelection);
        }

        if (onConfigureDevice) {
            environment.framework.on('configureDevice', onConfigureDevice);
        }

        if (onDeviceConfigured) {
            environment.framework.on('deviceConfigured', onDeviceConfigured);
        }

        if (onRefresh) {
            environment.framework.on('refresh', onRefresh);
        }

        if (onCloseDevice) {
            environment.framework.on('closeDevice', onCloseDevice);
        }

        if (onUnloadModule) {
            environment.framework.on('unloadModule', onUnloadModule);
        }

        if (onLoadError) {
            environment.framework.on('loadError', onLoadError);
        }

        if (onConfigError) {
            environment.framework.on('configError', onConfigError);
        }

        if (onRefreshError) {
            environment.framework.on('refreshError', onRefreshError);
        }

        fireAndResolve('onModuleLoad', environment, resolve, reject);
    });
}

/**
 * Open the first found device.
 *
 * @param {Object} environment The standalone framework environment information
 *      object to save the device to.
 * @return {Promise} Promise that resolves after the device is open and
 *      rejects if the device cannot be opened.
**/
function loadDevice (environment) {
    return new Promise((resolve, reject) => {
        const newDevice = labjack.device();
        newDevice.open(
            reject,
            function (newDevice) {
                environment.device = newDevice;
                fireAndResolve('onDeviceSelection', environment, resolve, reject);
            }
        );
    });
}

/**
 * Creates the standalone command line interface.
 *
 * @param {Object} environment The environment information object that the UI
 *      should be attached to.
 * @return {Promise} Promise that resolves after the target module controller
 *      has been examined. Resolves to the environment.
**/
function createInterface (environment) {
    return new Promise((resolve, reject) => {
        const newInterface = new framework_standalone_ui.CLInterface(environment);
        environment.cli = newInterface;

        const interfaceCreatePromise = newInterface.create();
        interfaceCreatePromise.then(
            reject,
            function () { fireAndResolve('onLoadTemplate', environment, resolve, reject); }
        );
    });
}

/**
 * Starts the refresh loop for the framework.
 *
 * @param {Object} environment The environment with the framework to start the
 *      refresh loop for.
 * @return {Promise} Promise that resolves after the framework loop has
 *      started.
**/
function startFrameworkLoop(environment) {
    environment.framework.startLoop();
    return Promise.resolve();
}

/**
 * Callback that should be called by the UI when the user exits the app.
 *
 * Callback that should be called by the UI when the user exists the stand alone
 * framework run utility.
 *
 * @param {Object} environment The environment that is being closed.
 * @return {Promise} Promise that resolvse after the on exit logic has
 *      finished running.
**/
function onUserExit (environment) {
    const alertDeviceClosing = function () {
        return new Promise((resolve, reject) => {
            environment.framework.fire(
                'onCloseDevice',
                environment.framework,
                reject,
                resolve
            );
        });
    };

    const alertUnload = function () {
        return new Promise((resolve, reject) => {
            environment.framework.fire(
                'onCloseDevice',
                environment.framework,
                reject,
                resolve
            );
        });
    };

    return alertDeviceClosing().then(alertUnload);
}

exports.fireAndResolve = fireAndResolve;
exports.prepareFramework = prepareFramework;
exports.loadModuleInfo = loadModuleInfo;
exports.loadModuleLogic = loadModuleLogic;
exports.loadModuleCallbacks = loadModuleCallbacks;
exports.loadDevice = loadDevice;
exports.createInterface = createInterface;
exports.startFrameworkLoop = startFrameworkLoop;
exports.onUserExit = onUserExit;
