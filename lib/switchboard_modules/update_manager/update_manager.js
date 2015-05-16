
/* jshint undef: true, unused: true, undef: true */
/* global global, require, console, MODULE_LOADER, MODULE_CHROME, TASK_LOADER */
/* exported activeModule */

console.log('in update_manager.js');
this.run = function() {
	console.log('Running update_manager');
};


var EventEmitter = require('events').EventEmitter;
var util = require('util');
var q = global.require('q');

var eventList = {
	'UPDATED_VERSION_DATA': 'UPDATED_VERSION_DATA',
};

function versionManager() {
	// var tab_notification_manager = TASK_LOADER.tasks.tab_notification_manager;

	this.version_manager = global.require('ljswitchboard-version_manager');
	
	// Cached Data
	this.cachedData = {};
	this.cachedT7Data = {};
	this.validData = false;

	var second = 1000;
	var min = 60;
	var numMin = 20;
	this.queryDelay = numMin * min * second;
	this.allowQueryLoopToRun = false;
	this.isQueryActive = false;

	this.debug = false;

	this.queryStartTime = undefined;
	this.queryEndTime = undefined;
	
	this.getCachedT7Versions = function() {
		return self.version_manager.lvm.getCachedT7Versions();
	};

	var cacheVersionData = function(data) {
		var defered = q.defer();
		self.isQueryActive = false;
		self.cachedData = JSON.parse(JSON.stringify(data));

		self.queryEndTime = new Date();
		if(self.debug) {
			console.log('Query Finished', self.queryEndTime - self.queryStartTime);
		}

		self.emit(eventList.UPDATED_VERSION_DATA, self.cachedData);
		defered.resolve();
		return defered.promise;
	};
	var handleInitializeError = function(err) {
		var defered = q.defer();
		console.error('Error initializing update_manager', err);
		defered.resolve();
		return defered.promise;
	};
	this.queryForData = function() {
		var defered = q.defer();
		self.queryStartTime = new Date();
		if(self.debug) {
			console.log('querying for version data, update_manager');
		}
		self.isQueryActive = true;

		// Clear the cached page data
		self.version_manager.lvm.clearPageCache();

		self.version_manager.getAllVersions()
		.then(cacheVersionData, handleInitializeError)
		.then(defered.resolve);
		return defered.promise;
	};
	this.getAllVersions = function() {
		return self.version_manager.getAllVersions();
	};

	this.timerRef = undefined;
	this.restartQueryLoop = function() {
		if(self.allowQueryLoopToRun) {
			self.timerRef = setTimeout(self.runQueryLoop, self.queryDelay);
		}
	};
	this.runQueryLoop = function() {
		self.queryForData()
		.then(self.restartQueryLoop);
	};
	this.stopVersionManager = function() {
		clearTimeout(self.timerRef);
		self.allowQueryLoopToRun = false;
	};
	this.startVersionManager = function() {
		console.log('in startVersionManager');
		if(!self.allowQueryLoopToRun) {
			self.allowQueryLoopToRun = true;
			self.runQueryLoop();
		}
	};
	this.forceUpdateVersionManager = function() {
		var initialAllowState = self.allowQueryLoopToRun;

		// Stop the query loop so that we don't get duplicate timeout events 
		// firing.
		self.stopVersionManager();

		// Check to see if a query is in progress
		if(self.isQueryActive) {
			// If a query is in progress then restore the allowQueryLoopToRun 
			// flag to its original state.
			self.allowQueryLoopToRun = initialAllowState;
		} else {
			// If a query is not in progress then one should be started.
			self.runQueryLoop();

			// Restore the allowQueryLoopToRun flag to its original state.
			self.allowQueryLoopToRun = initialAllowState;
		}
	};
	var self = this;
}
util.inherits(versionManager, EventEmitter);

var vm;
try {
	vm = new versionManager();
} catch(err) {
	console.error('Failed to initialize Kipling\'s version manager', err);
}
this.startTask = function(bundle) {
	console.log('Starting version_manager task');
	var defered = q.defer();
	
	vm.startVersionManager();
	defered.resolve(bundle);
	return defered.promise;
};

/**
 * Create an externally accessibal "addNotification" function that adds
 * notifications to be kept track of.
 */
this.vm = vm;
this.eventList = eventList;



