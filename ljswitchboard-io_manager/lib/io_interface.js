/**
 * This file defines the public interface to the io_manager.  It provides object
 * references that allow programs to communicate with the io_manager_process
 */

var process_manager = require('process_manager');
var q = require('q');

// Include the io_managers
var driver_manager = require('./managers/driver_manager');
var device_manager = require('./managers/device_manager');
var logger_manager = require('./managers/logger_manager');
var file_io_manager = require('./managers/file_io_manager');

var ioDelegatorPath = './lib/io_delegator.js';


function createIOInterface() {
	this.mp = null;
	this.mp_event_emitter = null;

	this.driver_manager = null;
	this.device_manager = null;
	this.logger_manager = null;
	this.file_io_manager = null;

	var createDriverManager = function() {
		self.driver_manager = new driver_manager.createNewDriverManager();
	};

	var createDeviceManager = function() {
		self.device_manager = new device_manager.createNewDeviceManager();
	};

	var createLoggerManager = function() {
		self.logger_manager = new logger_manager.createNewLoggerManager();
	};

	var createFileIOManager = function() {
		self.file_io_manager = new file_io_manager.createNewFileIOManager();
	};
	
	/**
	 * Initializing the io_interface will initialize a new master_process
	 * instance (as mp), save it as well as its event_emitter and start a new
	 * child process.  Once this is done it will create and initialize the
	 * various manager processes that make up the io_interface.
	**/
	this.initialize = function() {
		var defered = q.defer();

		self.mp = null;
		self.mp_event_emitter = null;

		delete self.mp;
		delete self.mp_event_emitter;

		self.mp = new process_manager.master_process();
		self.mp_event_emitter = self.mp.init();

		self.mp.qStart(ioDelegatorPath)
		.then(function(res) {
			console.log("Success!", res);
			defered.resolve();
		}, function(err) {
			console.log("Error :(", err);
			defered.reject();
		}, function(err) {
			console.log("BIG ERROR!", err);
			defered.reject();
		});
		// defered.resolve();
		return defered.promise;
	};

	this.destroy = function() {
		var defered = q.defer();

		self.mp.qStop()
		.then(defered.resolve);

		return defered.promise;
	};

	this.getDriverManager = function() {
		return self.driver_manager;
	};
	this.getDeviceManager = function() {
		return self.device_manager;
	};
	this.getLoggerManager = function() {
		return self.logger_manager;
	};
	this.getFileIOManager = function() {
		return self.file_io_manager;
	};



	var self = this;
}

exports.createIOInterface = function() {
	return new createIOInterface();
};
