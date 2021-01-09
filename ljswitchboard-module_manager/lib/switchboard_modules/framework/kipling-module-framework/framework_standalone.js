var labjack = require('labjack-nodejs');
var q = require('q');

var framework_standalone_ui = require('./framework_standalone_ui');
const package_loader = global.package_loader;
const fs_facade = package_loader.getPackage('fs_facade');
var presenter_framework = require('./presenter_framework');

/**
 * Fire an event listener and resolve a given deferred after it returns.
 *
 * @param {String} event The name of the event to fire.
 * @param {Object} environment Environment information object. The framework for
 *      this environment will be passed to the event listener.
 * @param {q.defer} deferred Deferred to resolve after the event listeners
 *      finish or to reject if the event listeners encounter an error.
**/
function fireAndResolve (event, environment, deferred) {
    environment.framework.fire(event, environment.framework).then(
        function () { deferred.resolve(environment); },
        deferred.reject
    );
}


/**
 * Add a presenter framework to the given environment.
 *
 * @param {Object} environment The environemnt to add the framework to
 * @return {q.promise} Promise that resolves after the framework has been added
 *      to the presenter. Resolves to the environment.
**/
function prepareFramework (environment) {
    var deferred = q.defer();
    environment.framework = new presenter_framework.Framework();
    deferred.resolve(environment);
    return deferred.promise;
}


/**
 * Add information about the selected module to the environemtn.
 *
 * @param {Object} environment The environment information object to add the
 *      module information to.
 * @return {q.promise} Promise that resolves after the module information has
 *      been added to the environment.
**/
function loadModuleInfo (environment) {
    var deferred = q.defer();

    fs_facade.getModuleInfo(
        environment.moduleName,
        deferred.reject,
        function (info) {
            environment.moduleInfo = info;
            deferred.resolve(environment);
        }
    );

    return deferred.promise;
}


/**
 * Load the controller for a module.
 *
 * @param {Object} environment The environment information object to add the
 *      loaded module controller to.
 * @return {q.promise} Promise that resolves to the modified environment after
 *      the controller has been loaded.
**/
function loadModuleLogic (environment) {
    var deferred = q.defer();

    var moduleName = environment.moduleInfo.name;
    var controllerLocalLoc = '/' + moduleName + '/controller';
    var controllerGlobalLoc = fs_facade.getExternalURI(controllerLocalLoc);
    var controller = require(controllerGlobalLoc);

    environment.module = controller;
    deferred.resolve(environment);

    return deferred.promise;
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
 * @return {q.promise} Promise that resolves after the target module controller
 *      has been examined. Resolves to the environment.
**/
function loadModuleCallbacks (environment) {
    var deferred = q.defer();
    var module = environment.module;
    var onModuleLoad = module.moduleLoad;
    var onLoadTemplate = module.loadTemplate;
    var onDeviceSelection = module.deviceSelection;
    var onConfigureDevice = module.configureDevice;
    var onDeviceConfigured = module.deviceConfigured;
    var onRefresh = module.refresh;
    var onCloseDevice = module.closeDevice;
    var onUnloadModule = module.unloadModule;
    var onLoadError = module.loadError;
    var onConfigError = module.configError;
    var onRefreshError = module.refreshError;

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

    fireAndResolve('onModuleLoad', environment, deferred);
    return deferred.promise;
}


/**
 * Open the first found device.
 *
 * @param {Object} environment The standalone framework environment information
 *      object to save the device to.
 * @return {q.promise} Promise that resolves after the device is open and
 *      rejects if the device cannot be opened.
**/
function loadDevice (environment) {
    var deferred = q.defer();

    var newDevice = labjack.device();
    newDevice.open(
        deferred.reject,
        function (newDevice) {
            environment.device = newDevice;
            fireAndResolve('onDeviceSelection', environment, deferred);
        }
    );

    return deferred.promise;
}


/**
 * Creates the standalone command line interface.
 *
 * @param {Object} environment The environment infromation object that the UI
 *      should be attached to.
 * @return {q.promise} Promise that resolves after the target module controller
 *      has been examined. Resolves to the environment.
**/
function createInterface (environment) {
    var deferred = q.defer();
    var newInterface = new framework_standalone_ui.CLInterface(environment);
    environment.cli = newInterface;

    var interfaceCreatePromise = newInterface.create();
    interfaceCreatePromise.then(
        deferred.reject,
        function () { fireAndResolve('onLoadTemplate', environment, deferred); }
    );

    return deferred.promise;
}


/**
 * Starts the refresh loop for the framework.
 *
 * @param {Object} environment The environment with the framework to start the
 *      refresh loop for.
 * @return {q.promise} Promise that resolves after the framework loop has
 *      started.
**/
function startFrameworkLoop (environment) {
    var deferred = q.defer();
    environment.framework.startLoop();
    return deferred.promise;
}


/**
 * Callback that should be called by the UI when the user exits the app.
 *
 * Callback that should be called by the UI when the user exists the stand alone
 * framework run utility.
 *
 * @param {Object} environment The environment that is being closed.
 * @return {q.promise} Promise that resolvse after the on exit logic has
 *      finished running.
**/
function onUserExit (environment) {
    var deferred = q.defer;

    var alertDeviceClosing = function () {
        var innerDeferred = q.defer();

        environment.framework.fire(
            'onCloseDevice',
            environment.framework,
            innerDeferred.reject,
            innerDeferred.resolve
        );

        return innerDeferred.promise;
    };

    var stopFrameworkLoop = function () {
        var innerDeferred = q.defer();
        environment.framework.stopLoop();
        innerDeferred.resolve();
        return innerDeferred.promise;
    };

    var alertUnload = function () {
        var innerDeferred = q.defer();

        environment.framework.fire(
            'onCloseDevice',
            environment.framework,
            innerDeferred.reject,
            innerDeferred.resolve
        );

        return innerDeferred.promise;
    };

    alertDeviceClosing()
    .then(alertUnload, deferred.reject)
    .then(deferred.resolve, deferred.reject);

    return deferred.promise;
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
