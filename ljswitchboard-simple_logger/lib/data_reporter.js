/*
 * This file is in charge of aggregating collected data so that it doesn't
 * cause view refreshes to happen super frequently.
 */

var EventEmitter = require('events').EventEmitter;
var util = require('util');
var q = require('q');
var async = require('async');


var events = {};
exports.events = events;

function CREATE_DATA_REPORTER() {
	

	function innerConfigureDataReporter(bundle) {
		var defered = q.defer();
		defered.resolve(bundle);
		return defered.promise;
	}

	function innerStartDataReporter(bundle) {
		var defered = q.defer();
		defered.resolve(bundle);
		return defered.promise;
	}

	function innerStopDataReporter(bundle) {
		var defered = q.defer();
		defered.resolve(bundle);
		return defered.promise;
	}


	/* Externally Accessable functions */
	this.onNewData = function(data) {

	};
	this.configure = function(bundle) {
		return innerConfigureDataReporter(bundle);
	};
	this.unconfigure = function(bundle) {
		return innerUnconfigureDataReporter(bundle);
	};
	this.start = function(bundle) {
		return innerStartDataReporter(bundle);
	};
	this.stop = function(bundle) {
		return innerStopDataReporter(bundle);
	};
	var self = this;
}

util.inherits(CREATE_DATA_REPORTER, EventEmitter);

exports.create = function() {
	return new CREATE_DATA_REPORTER();
};