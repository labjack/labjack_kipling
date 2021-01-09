
/* jshint undef: true, unused: true, undef: true */
/* global require, console, moduleData */
/* exported activeModule */

console.log('in ljm_controller.js', Object.keys(moduleData));
this.run = function() {
	console.log('Running ljm_controller');
};

const EventEmitter = require('events').EventEmitter;
const util = require('util');
const q = require('q');

const io_manager = require('ljswitchboard-io_manager');

var io_interface = io_manager.io_interface();
var driver = io_interface.getDriverController();

var eventList = {
	'UPDATED_SPECIAL_ADDRESSES_DATA': 'UPDATED_SPECIAL_ADDRESSES_DATA',
};

function ljmController() {
	// var tab_notification_manager = TASK_LOADER.tasks.tab_notification_manager;
	this.cachedFileData = [];
	this.cachedSpecialAddressesData = {};

	this.isRefreshingFileData = false;
	var unresolvedDefereds = [];

	function addUnresolvedDefered(defered) {
		unresolvedDefereds.push(defered);
	}

	function resolveUnresolvedDefereds() {
		unresolvedDefereds.forEach(function(defered) {
			defered.resolve();
		});
		unresolvedDefereds = [];
	}

	function reportUpdatedSpecialAddressesData() {
		self.emit(eventList.UPDATED_SPECIAL_ADDRESSES_DATA, self.cachedSpecialAddressesData);
	}

	this.refreshSpecialAddressesFileData = function() {
		var defered = q.defer();
		if(!self.isRefreshingFileData) {
			self.isRefreshingFileData = true;

			var specialAddresses = driver.specialAddresses;
			specialAddresses.load()
			.then(function(data) {
				console.log('finished refreshing specialAddresses:', data);

				self.cachedSpecialAddressesData = data;
				self.cachedFileData = data.fileData;

				reportUpdatedSpecialAddressesData();
				resolveUnresolvedDefereds();
			}, function(errData) {
				console.log('errData (refreshing specialAddresses):', errData);
				resolveUnresolvedDefereds();
			});
		} else {
			addUnresolvedDefered(defered);
		}
		return defered.promise;
	};

	this.saveSpecialAddressesFileData = function(fileData) {
		var defered = q.defer();
		var specialAddresses = driver.specialAddresses;
		specialAddresses.save(fileData)
		.then(function(data) {
			console.log('finished saving specialAddresses:', data);

			self.cachedSpecialAddressesData = data;
			self.cachedFileData = data.fileData;

			reportUpdatedSpecialAddressesData();
			defered.resolve();
		}, function(errData) {
			console.log('errData (saving specialAddresses):', errData);
			defered.resolve();
		});
		return defered.promise;
	};
	this.startLJMController = function() {
		var defered = q.defer();
		console.log('Starting LJM Controller!!!', self.myVar);
		var specialAddresses = driver.specialAddresses;
		specialAddresses.load()
		.then(function(data) {
			console.log('finished loading specialAddresses:', data);

			self.cachedSpecialAddressesData = data;
			self.cachedFileData = data.fileData;

			reportUpdatedSpecialAddressesData();
			defered.resolve();
		}, function(errData) {
			console.log('errData (loading specialAddresses):', errData);
			defered.resolve();
		});
		return defered.promise;
	};

	var self = this;
}
util.inherits(ljmController, EventEmitter);

var ljc;
try {
	ljc = new ljmController();
} catch(err) {
	console.error('Failed to initialize Kipling\'s LJM Controller', err);
}
this.startTask = function(bundle) {
	console.log('Starting ljm_controller task', bundle);
	var defered = q.defer();

	ljc.startLJMController();
	defered.resolve(bundle);
	return defered.promise;
};

/**
 * Create an externally accessibal functions.
 */
this.ljc = ljc;
this.eventList = eventList;



