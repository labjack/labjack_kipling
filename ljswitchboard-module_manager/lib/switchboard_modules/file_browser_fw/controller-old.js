
/* jshint undef: true, unused: true, undef: true */
/* global global, require, console, MODULE_LOADER, MODULE_CHROME, createDeviceSelectorViewGenerator */
/* global handlebars, process, modbus_map */
/* exported activeModule */

// console.log('in device_selector, controller.js');

const q = require('q');

var createModuleInstance = function() {
	function initializeWindowData() {
		var defered = q.defer();
		defered.resolve({
			'my_data': 'test',
		});
		return defered.promise;
	}
    // Attach a pre-load step to the Module loader
    var preLoadStep = function(newModule) {
        var defered = q.defer();

        var onSuccees = function(data) {
        	newModule.context.pageData = data;
        	defered.resolve(newModule);
        };
        var onErr = function(data) {
        	onSuccees(data);
        };

        initializeWindowData()
        .then(onSuccees, onErr);

        return defered.promise;
    };
    // MODULE_LOADER.addPreloadStep(preLoadStep);

	var startModule = function(newModule) {
		// console.log('device_selector starting', newModule.name, newModule.id);
		self.moduleData = newModule.data;

		var reportedData = {
			'name': self.moduleData.name,
		};
		MODULE_CHROME.emit('MODULE_READY', reportedData);
		MODULE_LOADER.emit('MODULE_READY', reportedData);
	};
	var stopModule = function() {
		// console.log('device_selector stopped');
		// self.emit(self.eventList.MODULE_STOPPED);
	};

	// Attach to MODULE_LOADER events that indicate to the module about what to
	// do.  (start/stop).
	var mlEvents = MODULE_LOADER.eventList;
	MODULE_LOADER.on(mlEvents.VIEW_READY, startModule);
	MODULE_LOADER.on(mlEvents.UNLOAD_MODULE, stopModule);

	var self = this;
};
// util.inherits(createModuleInstance, EventEmitter);

var activeModule = new createModuleInstance();
