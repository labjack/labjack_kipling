
/* jshint undef: true, unused: true, undef: true */
/* global global, require, console, MODULE_LOADER, MODULE_CHROME, TASK_LOADER */
/* exported activeModule */

console.log('in simple_logger_collector.js');
this.run = function() {
	console.log('Running simple_logger_collector');
};


var EventEmitter = require('events').EventEmitter;
var util = require('util');
var q = global.require('q');

var eventList = {
	'REFRESH_GRAPH_DATA': 'REFRESH_GRAPH_DATA',
};

function createSimpleLoggerCollector() {
	// var tab_notification_manager = TASK_LOADER.tasks.tab_notification_manager;

	this.version_manager = global.require('@labjack/ljswitchboard-version_manager');
	
	var self = this;
}
util.inherits(createSimpleLoggerCollector, EventEmitter);

var collector;
try {
	collector = new createSimpleLoggerCollector();
} catch(err) {
	console.error('Failed to initialize Kipling\'s simple logger collector', err);
}
this.startTask = function(bundle) {
	console.log('Starting simple_logger_collector task');
	var defered = q.defer();
	
	collector.startVersionManager();
	defered.resolve(bundle);
	return defered.promise;
};

/**
 * Create an externally accessibal "addNotification" function that adds
 * notifications to be kept track of.
 */
this.collector = collector;
this.eventList = eventList;



