
console.log("in single_device_delegator.js");

var dict = require('dict');
var q = require('q');
var constants = require('../common/constants');
var io_endpoint_key = constants.io_manager_endpoint_key;

var process_manager = require('process_manager');
var slave_process = process_manager.slave_process();

var single_device_manager = require('../managers/single_device_manager');

var DEBUG = true;
var startupInfo = slave_process.getSlaveProcessInfo();
var print = function(argA, argB) {
    if(DEBUG) {
        var msg = '* sd_d:';
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

function createSingleDeviceDelegator(slave_process) {
	this.sp = slave_process;
	this.sp_event_emitter = null;

	// Define manager objects to be created during the init process
	this.single_device_manager = null;

	// Define the endpoints object to be used for routing messages by the
	// messageDelegator
	this.endpoints = {};

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
	var createSingleDeviceManager = function() {
		var key = constants.device_endpoint_key;
		self.single_device_manager = new single_device_manager.createSingleDeviceManager(self);
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
		delete self.endpoints[name];
		self.sp_event_emitter.removeAllListeners(name);
	};

	/**
	 * The listener function handles one-way slave messages transfered by the
	 * master_process.sendMessage function.
	 */
	this.listener = function(data) {
		print('single_device_delegator.js eventMessageReceived', data);
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
		createSingleDeviceManager();

		initManager(self.single_device_manager, 'sd')()
		.then(defered.resolve);
		return defered.promise;
	};
	var pError = function(defered, debugTxt) {
		return function(err) {
			console.log('io_delegator init error', debugTxt);
			defered.resolve();
		};
	};
	var initManager = function(manager, debugTxt) {
		return function() {
			var defered = q.defer();
			try {
				manager.init()
				.then(
					defered.resolve, 
					pError(defered, debugTxt + '-1'), 
					pError(defered, debugTxt + '-2')
				);
			} catch (err) {
				pError(defered, debugTxt + '-3')(err);
			}

			return defered.promise;
		};
	};

	var self = this;
}

// Create a new io_delegator object
var single_device_delegator = new createSingleDeviceDelegator(slave_process);

// Initialize the io_delegator
single_device_delegator.init()
.then(function(res) {
	return slave_process.finishedInit(slave_process.getSlaveProcessInfo());
}).then(function() {
	print('Ready to do things....');
});