
var process_manager = require('process_manager');
var q = require('q');

// Include the single_device_controller
var single_device_controller = require('./controllers/single_device_controller');
// var constants = require('./common/constants');

// Define the delegator to be used when starting the device sub-process
var device_delegator_path = './lib/delegators/single_device_delegator.js';


function createSingleDeviceInterface() {
	this.mp = null;
	this.mp_event_emitter = null;

	// Define a single device controller object reference
	this.single_device_controller = null;

	// Function to initialize the single_device_controller object
	var createSingleDeviceController = function() {
		console.log("Creating createSingleDeviceController");
		self.single_device_controller = new single_device_controller.createSingleDeviceController(self);
	};

	/**
	 * Initialize the single_device-interface will initialize a new 
	 * master_process instance (aka this/self.mp) and save it.  Will also save
	 * a reference to the created event_emitter and start a new child process.
	 * Once this is done, a single_device_controller object will be properly
	 * linked with the messaging system thus providing a "device" object.
	**/
	this.initialize = function() {
		var defered = q.defer();

		try {
			self.mp = null;
			self.mp_event_emitter = null;

			delete self.mp;
			delete self.mp_event_emitter;

			self.mp = new process_manager.master_process();
			self.mp_event_emitter = self.mp.init();

			// create the single_device_controller object:
			createSingleDeviceController();

			// Start a new child process
			self.mp.qStart(device_delegator_path)
			.then(function(res) {
				// Initialize the controller
				self.single_device_controller.init()
				.then(defered.resolve, defered.reject);
			}, function(err) {
				console.log("error starting process", err);
				defered.reject(err);
			});
		} catch(err) {
			console.log("try-catch error", err);
			defered.reject(err);
		}
		return defered.promise;
	};

	this.establishLink = function(name, listener) {
		console.log("sdi.js establishLink");
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
		var callFunc = function(name, argList, options) {
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
				'args': funcArgs,
				'options': options
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

		console.log('sdi.js end of establishLink')
		defered.resolve(link);
		return defered.promise;
	};

	this.destroy = function() {
		var defered = q.defer();

		self.mp.qStop()
		.then(defered.resolve);

		return defered.promise;
	};

	var self = this;
}

exports.createSingleDeviceInterface = function() {
	return new createSingleDeviceInterface();
};