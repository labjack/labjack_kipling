/**
 * This file defines the public interface to the io_manager.  It provides object
 * references that allow programs to communicate with the io_manager_process
 */

var process_manager = require('process_manager');
var q = require('q');

// Include the io_managers
var driver_controller = require('./controllers/driver_controller');
var device_controller = require('./controllers/device_controller');
var logger_controller = require('./controllers/logger_controller');
var file_io_controller = require('./controllers/file_io_controller');

var ioDelegatorPath = './lib/io_delegator.js';


function createIOInterface() {
	this.mp = null;
	this.mp_event_emitter = null;

	this.driver_controller = null;
	this.device_controller = null;
	this.logger_controller = null;
	this.file_io_controller = null;
	var createDriverController = function() {
		self.driver_controller = new driver_controller.createNewDriverController(self);
	};
	var createDeviceController = function() {
		self.device_controller = new device_mcontroller.createNewDeviceController(self);
	};
	var createLoggerController = function() {
		self.logger_controller = new logger_mcontroller.createNewLoggerController(self);
	};
	var createFileIOController = function() {
		self.file_io_controller = new file_io_mcontroller.createNewFileIOController(self);
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

		// Create Controllers
		createDriverController();
		// createDeviceController();
		// createLoggerController();
		// createFileIOController();

		self.mp.qStart(ioDelegatorPath)
		.then(function(res) {
			// Initialize Controllers
			self.driver_controller.init()
			// .then(self.device_controller.init)
			// .then(self.logger_controller.init)
			// .then(self.file_io_controller.init)
			.then(defered.resolve);
			
			// defered.resolve();
		}, function(err) {
			console.log("Error :(", err);
			defered.reject();
		}, function(err) {
			console.log("BIG ERROR!", err);
			defered.reject();
		});
		return defered.promise;
	};

	this.establishLink = function(name, listener) {
		var endpoint = name;
		var createMessage = function(m) {
			var defered = q.defer();
			var message = {
				'endpoint': endpoint,
				'data': m
			};
			defered.resolve(message);
			return defered.promise;
		};
		var executeSendReceive = function(m) {
			return self.mp.sendReceive(m);
		};
		var executeSendMessage = function(m) {
			return self.mp.sendMessage(m);
		};
		var cleanMessage = function(m) {
			var defered = q.defer();
			defered.resolve(m);
			return defered.promise;
		};
		var cleanError = function(err) {
			var defered = q.defer();
			defered.reject(err);
			return defered.promise;
		};
		var sendReceive = function(m) {
			var defered = q.defer();

			// Execute sendReceive message
			createMessage(m)
			.then(executeSendReceive)
			.then(cleanMessage, cleanError)
			.then(defered.resolve, defered.reject);

			return defered.promise;
		};
		var sendMessage = function(m) {
			return createMessage(m)
			.then(executeSendMessage);
		};
		var send = function(m) {
			return self.mp.send(endpoint, m);
		};
		var callFunc = function(name, argList) {
			var funcName = '';
			var funcArgs = [];
			if(name) {
				funcName = name;
			}
			if(argList) {
				funcArgs = argList;
			}
			return sendReceive({
				'func': funcName,
				'args': funcArgs
			});
		};

		self.mp_event_emitter.on(name, listener);
		var defered = q.defer();

		var link = {
			'callFunc': callFunc,
			'sendReceive': sendReceive,
			'sendMessage': sendMessage,
			'send': send
		};
		defered.resolve(link);
		return defered.promise;
	};

	this.destroy = function() {
		var defered = q.defer();

		self.mp.qStop()
		.then(defered.resolve);

		return defered.promise;
	};

	this.getDriverController = function() {
		return self.driver_controller;
	};
	this.getDeviceController = function() {
		return self.device_controller;
	};
	this.getLoggerController = function() {
		return self.logger_controller;
	};
	this.getFileIOController = function() {
		return self.file_io_controller;
	};



	var self = this;
}

exports.createIOInterface = function() {
	return new createIOInterface();
};
