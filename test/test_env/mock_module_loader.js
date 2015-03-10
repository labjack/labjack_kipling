
var EventEmitter = require('events').EventEmitter;
var util = require('util');
var q = require('q');
var package_loader = require.main.require('ljswitchboard-package_loader');

var createFakeModuleLoader = function(moduleData) {
	this.eventList = {
		VIEW_READY: 'VIEW_READY',
		UNLOAD_MODULE: 'UNLOAD_MODULE',
	};

	this.triggerLoadEvent = function() {
		var defered = q.defer();
		var startData = {
			'name': moduleData.name,
			'id': '#' + moduleData.name,
			'data': moduleData
		};
		self.emit(self.eventList.VIEW_READY, startData);
		defered.resolve();
		return defered.promise;
	};
	this.triggerStopEvent = function() {
		var defered = q.defer();
		self.emit(self.eventList.UNLOAD_MODULE);
		defered.resolve();
		return defered.promise;
	};
	var self = this;
};
util.inherits(createFakeModuleLoader, EventEmitter);
exports.createFakeModuleLoader = createFakeModuleLoader;