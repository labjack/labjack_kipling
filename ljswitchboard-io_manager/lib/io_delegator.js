

var dict = require('dict');
var q = require('q');
var constants = require('./common/constants');
var io_endpoint_key = constants.io_manager_endpoint_key;
var io_error_constants = require('./io_error_constants').errors;
var process_manager = require('process_manager');
var slave_process = process_manager.slave_process();

// Include the io_managers
var driver_manager;
var device_manager;
var logger_manager;
var file_io_manager;
try {
	driver_manager = require('./managers/driver_manager');
	device_manager = require('./managers/device_manager');
	logger_manager = require('./managers/logger_manager');
	file_io_manager = require('./managers/file_io_manager');
} catch(err) {
	// console.log('Error Requiring Library:');
	// console.log(err);
	process.exit(io_error_constants.REQUIRE_REF_OR_FFI_ERROR.code);
}

var DEBUG = true;
var startupInfo = slave_process.getSlaveProcessInfo();
var print = function(argA, argB) {
    if(DEBUG) {
        var msg = '* io_d:';
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
	this.oneWayEndpoints = {};

	// Define function objects for sending internal messages 
	var sendMessage = null;
	var send = null;

	/**
	 * A helper function for the messageDelegator that checks to see if the
	 * messages endpoint is valid.
	 */
	var checkEndpoint = function(m) {
		var defered = q.defer();
		if(self.endpoints[m.endpoint]) {
			m.isValidEndpoint = true;
			defered.resolve(m);
		} else {
			print('sendReceive message sent to invalid endpoint', m.endpoint);
			print('valid endpoints', self.endpoints)
			defered.reject(m);
		}
		return defered.promise;
	};
	/**
	 * A helper function for the messageDelegator that calls the endpoint's
	 * function.
	 */
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
		var errFunc = function(err) {
			defered.reject(err);
		};
		// print('messageDelegator', m);
		var message = {
			'isValidEndpoint': false,
			'message': m.data,
			'endpoint': m.endpoint
		};
		checkEndpoint(message)
		.then(delegateMessage, errFunc)
		.then(defered.resolve, errFunc);
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

	/**
	 * The establishLink function gets called by a manager in order to connect
	 * itself/a sub-function with the io_delegator.  It links the messageReceiver and listener
	 * functions and creates/shares functions to make communicating with their
	 * counterparts in the master_process easier.
	 */
	this.establishLink = function(name, messageReceiver, listener) {
		var elDefered = q.defer();
		self.endpoints[name] = messageReceiver;
		self.oneWayEndpoints[name] = listener;
		var endpoint = name;
		var createMessage = function(m) {
			var cmDefered = q.defer();
			var message = {
				'endpoint': endpoint,
				'data': m
			};
			cmDefered.resolve(message);
			return cmDefered.promise;
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
		elDefered.resolve(link);
		return elDefered.promise;
	};

	/**
	 * The destroyLink function gets called by a manager in order to remove 
	 * itself/a sub-function from the io_delegator.
	 * @type {[type]}
	 */
	this.destroyLink = function(name) {
		self.endpoints[name] = null;
		self.endpoints[name] = undefined;
		self.oneWayEndpoints[name] = null;
		self.oneWayEndpoints[name] = undefined;
		delete self.endpoints[name];
		delete self.oneWayEndpoints[name];
		self.sp_event_emitter.removeAllListeners(name);
	};

	/**
	 * the function "delegateOneWayMessage" directs incomming one-way messages
	 * toward registered & valid endpoints.
	 */
	var delegateOneWayMessage = function(m) {
		var defered = q.defer();
		self.oneWayEndpoints[m.endpoint](m.message);
		defered.resolve();
		return defered.promise;
		// return self.endpoints[m.endpoint](m.message);
	};
	/**
	 * A helper function for the messageDelegator that checks to see if the
	 * messages endpoint is valid.
	 */
	var checkOneWayEndpoint = function(m) {
		var defered = q.defer();
		if(self.oneWayEndpoints[m.endpoint]) {
			m.isValidEndpoint = true;
			defered.resolve(m);
		} else {
			print('sendReceive message sent to invalid endpoint', m.endpoint);
			print('valid endpoints', self.oneWayEndpoints);
			defered.reject(m);
		}
		return defered.promise;
	};
	/**
	 * The listener function handles one-way slave messages transfered by the
	 * master_process.sendMessage function.
	 */
	this.listener = function(m) {
		var defered = q.defer();
		var errFunc = function(err) {
			print('listener errFunc', err);
			defered.reject(err);
		};
		var message = {
			'isValidEndpoint': false,
			'message': m.data,
			'endpoint': m.endpoint
		};

		checkOneWayEndpoint(message)
		.then(delegateOneWayMessage, errFunc)
		.then(defered.resolve, errFunc);
		return defered.promise;
		
	};

	/**
	 * The init function asynchronously initializes the io_delegator object and
	 * any necessary message managers.
	 */
	this.init = function() {
		var defered = q.defer();

		// Clear the registered endpoints
		self.endpoints = {};
		self.oneWayEndpoints = {};

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
		createDeviceManager();
		// createLoggerManager();
		// createFileIOManager();

		initInternals()
		.then(initManager(self.driver_manager, 'dm'))
		.then(initManager(self.device_manager, 'de'))
		.then(defered.resolve);
		return defered.promise;
	};
	var pError = function(defered, name) {
		return function(err) {
			console.log('io_delegator init error', name);
			defered.resolve();
		};
	};
	var initManager = function(manager, name) {
		return function() {
			var defered = q.defer();
			try {
				manager.init()
				.then(
					defered.resolve, 
					pError(defered, name + '-1'), 
					pError(defered, name + '-2')
				);
			} catch (err) {
				pError(defered, name + '-3')(err);
			}

			return defered.promise;
		};
	};

	this.getRegisteredEndpoints = function(args) {
		var defered = q.defer();
		defered.resolve(Object.keys(self.endpoints));
		return defered.promise;
	};
	var exposedFunctions = {
		'getRegisteredEndpoints': this.getRegisteredEndpoints
	};

	var internalListener = function(m) {
		console.log('* io_delegator internalListener:', m);
		send("Poke Response from io_delegator!");
	};
	var internalMessageReceiver = function(m) {
		var defered = q.defer();
		if(exposedFunctions[m.func]) {
			exposedFunctions[m.func](m.args)
			.then(defered.resolve, defered.reject);
		} else {
			defered.reject('Invalid Function Called: ' + m.func);
		}
		return defered.promise;
	};
	var saveLink = function(link) {
		var defered = q.defer();

		sendMessage = link.sendMessage;
		send = link.send;

		defered.resolve();
		return defered.promise;
	};
	var initInternals = function() {
		var defered = q.defer();

		self.establishLink(io_endpoint_key, internalMessageReceiver, internalListener)
		.then(saveLink)
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
	// print('Ready to do things....');
});