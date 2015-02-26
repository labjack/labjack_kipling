
console.log('in device_selector, controller.js');

// make sure the gns namespace is available to be used.
var package_loader = require('ljswitchboard-package_loader');
var gns = package_loader.getNameSpace();
var q = global.require('q');

var createModuleInstance = function() {
	var io_manager = global[gns].io_manager;
	var io_interface = io_manager.io_interface();
	var driver_controller = io_interface.getDriverController();
	var device_controller = io_interface.getDeviceController();

	var getCachedListAllDevices = device_controller.getCachedListAllDevices;
	var listAllDevices = device_controller.listAllDevices;

	this.viewGen = new createDeviceSelectorViewGenerator();

	this.moduleData = {};

	var reportListAllResult = function(res) {
		console.log('listAll Result', res);
	};
	this.test = function() {
		listAllDevices()
		.then(reportListAllResult);
	};
	var mlEvents = MODULE_LOADER.eventList;
	var startModule = function(newModule) {
		console.log('device_selector starting', newModule.name, newModule.id);
		self.moduleData = newModule.data;
		
		getCachedListAllDevices()
		.then(self.viewGen.displayScanResults)
		.then(function(res) {
			console.log('device_selector started');
		}, function(res) {
			console.error('device_selector failed to start');
		});
	};
	var stopModule = function() {
		console.log('device_selector stopped');
	};

	MODULE_LOADER.on(mlEvents.VIEW_READY, startModule);
	MODULE_LOADER.on(mlEvents.UNLOAD_MODULE, stopModule);
	var self = this;
};
var activeModule = new createModuleInstance();