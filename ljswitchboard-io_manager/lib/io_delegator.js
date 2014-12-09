

var dict = require('dict');
var q = require('q');
var constants = require('./common/constants');

var process_manager = require('process_manager');
var slave_process = process_manager.slave_process();

// Include the io_managers
var driver_manager = require('./managers/driver_manager');
var device_manager = require('./managers/device_manager');
var logger_manager = require('./managers/logger_manager');
var file_io_manager = require('./managers/file_io_manager');


var DEBUG = true;
var startupInfo = slave_process.getSlaveProcessInfo();
var print = function(argA, argB) {
    if(DEBUG) {
        var msg = 'io_d:';
        if(argA) {
            if(argB) {
                console.log(msg, argA, argB);
            } else {
                console.log(msg, argA);
            }
        } else {
            console.log(msg);
        }
    }
};

var receivers = [
	'driver_manager',
	'device_manager',
	'logger_manager',
	'file_io_manager'
];

function createIODelegator(slave_process) {
	this.sp = slave_process;
	this.sp_event_emitter = null;

	// Define manager objects to be created during the init process
	this.driver_manager = null;
	this.device_manager = null;
	this.logger_manager = null;
	this.file_io_manager = null;

	// Define the endpoints object to be used for routing messages by the
	// messageDelegator
	this.endpoints = {};

	var checkEndpoint = function(m) {
		var defered = q.defer();
		if(self.endpoints[m.endpoint]) {
			m.isValidEndpoint = true;
			defered.resolve(m);
		} else {
			print('sendReceive message sent to invalid endpoint', m.endpoint);
			defered.reject(m);
		}
		return defered.promise;
	};
	var delegateMessage = function(m) {
		return self.endpoints[m.endpoint](m.message);
	};

	/**
	 * The messageDelegator function handles all incomming messages sent by the
	 * master_process.sendReceive function.  These messages are checked for 
	 * valid endpoints and then delegated to the appropriate messageManager.
	 * @type {[type]}
	 */
	this.messageDelegator = function(m) {
		var defered = q.defer();
		// print('messageDelegator', m);
		var message = {
			'isValidEndpoint': false,
			'message': m.data,
			'endpoint': m.endpoint
		};
		checkEndpoint(message)
		.then(delegateMessage, defered.reject)
		.then(defered.resolve, defered.reject);
		return defered.promise;
	};

	// Define functions to initialize the manager objects
	var createDriverManager = function() {
		var key = constants.driver_endpoint_key;
		self.driver_manager = new driver_manager.createNewDriverManager(self);
	};
	var createDeviceManager = function() {
		var key = constants.device_endpoint_key;
		self.device_manager = new device_manager.createNewDeviceManager(self);
	};
	var createLoggerManager = function() {
		var key = constants.logger_endpoint_key;
		self.logger_manager = new logger_manager.createNewLoggerManager(self);
	};
	var createFileIOManager = function() {
		var key = constants.file_io_endpoint_key;
		self.file_io_manager = new file_io_manager.createNewFileIOManager(self);
	};

	this.establishLink = function(name, messageReceiver, listener) {
		var defered = q.defer();
		self.endpoints[name] = messageReceiver;
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
		var executeSendMessage = function(m) {
			return self.sp.sendMessage(m);
		};
		var sendMessage = function(m) {
			return createMessage(m)
			.then(executeSendMessage);
		};
		var send = function(m) {
			return self.sp.send(endpoint, m);
		};

		self.sp_event_emitter.on(name, listener);
		var link = {
			'sendMessage': sendMessage,
			'send': send
		};
		defered.resolve(link);
		return defered.promise;
	};

	/**
	 * The listener function handles one-way slave messages transfered by the
	 * master_process.sendMessage function.
	 */
	this.listener = function(data) {
		print('basic_test_slave.js eventMessageReceived', data);
		self.sp.send('test','Test Data');
	};

	/**
	 * The init function asynchronously initializes the io_delegator object and
	 * any necessary message managers.
	 */
	this.init = function() {
		var defered = q.defer();

		// Clear the registered endpoints
		self.endpoints = {};

		// Register the messageDelegator as a 'q' function with the slave 
		// process and save the returned event_emitter object
		self.sp_event_emitter = self.sp.init({
			'type': 'q',
			'func': self.messageDelegator
		});

		// Register a listener to the 'message' event emitter
		self.sp_event_emitter.on('message', self.listener);

		// Create Managers
		createDriverManager();
		// createDeviceManager();
		// createLoggerManager();
		// createFileIOManager();

		self.driver_manager.init()
		.then(defered.resolve);
		return defered.promise;
	};


	var self = this;
}

// Create a new io_delegator object
var io_delegator = new createIODelegator(slave_process);

// Initialize the io_delegator
io_delegator.init()
.then(function(res) {
	return slave_process.finishedInit(slave_process.getSlaveProcessInfo());
}).then(function() {
	print('Ready to do things....');
});