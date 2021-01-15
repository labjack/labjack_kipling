
/* jshint undef: true, unused: true, undef: true */
/* global global, require, console, MODULE_LOADER, MODULE_CHROME, createDeviceSelectorViewGenerator */
/* global handlebars, process, modbus_map */
/* exported activeModule */

// console.log('in device_selector, controller.js');

var createModuleInstance = function() {
	function initializeWindowData() {
		return Promise.resolve({
			'my_data': 'test',
		});
	}

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

global.activeModule = new createModuleInstance();
