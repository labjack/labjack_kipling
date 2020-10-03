/**
 * Logic for a module that manages the installation / removal of other modules.
 *
 * @author A. Samuel Pottinger (LabJack Corp, 2013)
**/


var q = require('q');

var module_manager = require('./module_manager');

var MODULE_TEMPLATE_SRC = 'module_manager/module_list.html';


/**
 * Render the list of available modules (both installed and not).
 *
 * @param {Array} moduleInfo Array of Object with information about available
 *      modules.
 * @return {q.promise} Promise that resolves to undefined.
**/
function renderModuleList(moduleInfo)
{
    var deferred = q.defer();

    var location = fs_facade.getExternalURI(MODULE_TEMPLATE_SRC);
    fs_facade.renderTemplate(
        location,
        {'modules': moduleInfo},
        genericErrorHandler,
        function(renderedHTML)
        {
            $('#module-manager').fadeOut(function(){
                $('#module-manager').html(renderedHTML);
                deferred.resolve();
                $('#module-manager').fadeIn();
            });
        }
    );

    return deferred.promise;
}


/**
 * Add information about whether or not modules are installed / loaded.
 *
 * @param {Array} allModules An Array of Object with module information.
 * @return {q.promise} A promise that resovles to an Array of Object with the
 *      same module information plus a Boolean loaded field indicating if the
 *      module is installed.
**/
function decorateLoadedModules(allModules)
{
    var deferred = q.defer();

    var onGetActiveModules = function(activeModules)
    {
        var activeNames = activeModules.map(function(m){return m.name;});

        var decoratedModules = allModules.map(function(module){
            var decoratedEntry = jQuery.extend({}, module);
            decoratedEntry.loaded = activeNames.indexOf(module.name) != -1;
            return decoratedEntry;
        });

        deferred.resolve(decoratedModules);
    }

    module_manager.getActiveModules(genericErrorHandler, onGetActiveModules);

    return deferred.promise;
}


/**
 * Get a list of available modules.
 *
 * @return {q.promise} A promise that resovles to an Array of Object with module
 *      information.
**/
function getModuleList()
{
    var deferred = q.defer();

    var data = [
        {
            "name": "test_module",
            "humanName": "Test Module",
            "version": "0.0.1"
        },
        {
            "name": "device_info_inspector",
            "humanName": "Device Info Inspector",
            "version": "0.0.1"
        },
        {
            "name": "logging_and_dashboard",
            "humanName": "Logging and Dashboard",
            "version": "0.0.1"
        },
        {
            "name": "digital_io_config",
            "humanName": "Digital I/O Config",
            "version": "0.0.1"
        },
        {
            "name": "analog_inputs",
            "humanName": "Analog Inputs",
            "version": "0.0.1"
        },
        {
            "name": "analog_outputs",
            "humanName": "Analog Outputs",
            "version": "0.0.1"
        },
        {
            "name": "network_configuration",
            "humanName": "Network Configuration",
            "version": "0.0.1"
        },
        {
            "name": "power_up_defaults",
            "humanName": "Power Up Defaults",
            "version": "0.0.1"
        },
        {
            "name": "module_manager",
            "humanName": "Module Manager",
            "version": "0.0.1"
        }
    ];

    setTimeout(function(){
        deferred.resolve(data);
    }, 2000);

    return deferred.promise;
}


$('#module-manager').ready(function(){
    getModuleList().then(decorateLoadedModules).then(renderModuleList).done();
});
