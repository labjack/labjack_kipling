
console.log('in device_selector, controller.js');

var createModuleInstance = function() {
	var mlEvents = MODULE_LOADER.eventList;
	var startModule = function() {
		console.log('device_selector started');
	};
	var stopModule = function() {
		console.log('device_selector stopped');
	};

	MODULE_LOADER.on(mlEvents.VIEW_READY, startModule);
	MODULE_LOADER.on(mlEvents.UNLOAD_MODULE, stopModule);
	var self = this;
};
var activeModule = new createModuleInstance();