
var EventEmitter = require('events').EventEmitter;
var util = require('util');
var q = require('q');
var async = require('async');

// Code that collects data from devices.
var data_collector = require('./data_collector');

// Code that logs data to files.
var data_logger = require('./data_logger');

// Code that collects & reports data to listeners.
var data_reporter = require('./data_reporter');

var eventList = require('./coordinator_events').eventList;

function CREATE_COORDINATOR () {
	this.state = {
		'initialized': false,
		'configured': false,
		'running': false,
	};
	this.config = undefined;
	this.devices = undefined;


	var innerInitializeCoordinator = function(bundle) {
		var defered = q.defer();

		self.state.initialized = true;
		defered.resolve(bundle);
		return defered.promise;
	};

	var innerUpdateDeviceListing = function(devices) {
		var defered = q.defer();
		self.devices = undefined;
		self.devices = devices;

		defered.resolve(devices);
		return defered.promise;
	};

	var innerConfigureCoordinator = function(bundle) {
		var defered = q.defer();
		defered.resolve(bundle);
		return defered.promise;
	};

	var innerStartCoordinator = function(bundle) {
		var defered = q.defer();
		defered.resolve(bundle);
		return defered.promise;
	};

	var innerStopCoordinator = function(bundle) {
		var defered = q.defer();
		defered.resolve(bundle);
		return defered.promise;
	};

	this.initialize = function(bundle) {
		return innerInitializeCoordinator(bundle);
	};
	this.updateDeviceListing = function(bundle) {
		return innerUpdateDeviceListing(bundle);
	};
	this.configure = function(bundle) {
		return innerConfigureCoordinator(bundle);
	};
	this.start = function(bundle) {
		return innerStartCoordinator(bundle);
	};
	this.stop = function(bundle) {
		return innerStopCoordinator(bundle);
	};
}
util.inherits(CREATE_COORDINATOR, EventEmitter);

exports.create = function() {
	return new CREATE_COORDINATOR();
};
