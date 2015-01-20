

var labjack_nodejs = require('labjack-nodejs');
var q = require('q');
var constants = require('../common/constants');
var io_endpoint_key = constants.device_endpoint_key;

var device_keeper = require('./device_manager_helpers/device_keeper');

function createDeviceManager(io_delegator) {

	var ljm_driver = null;
	var sendMessage = null;
	var send = null;

	var deviceKeeper = null;

	var listener = function(m) {
		console.log('in device_manager.js-listener', m);
	};

	var ipcMessageReceiver = function(m) {
		var defered = q.defer();

		// Define Error Handling Function
		var error = function(err) {
			defered.reject(err);
		};

		// Define Success Handling Function
		var success = function(res) {
			defered.resolve(res);
		};

		// Execute deviceKeeper functions:
		var route = m.func;
		var func = route.func;
		var isDeviceFunc = route.isDeviceFunc;

		var deviceKey;
		var isValidFunc = false;
		var caller;

		// Switch logic to either call a function in the device_keeper object
		// or if it it needs to be directed at a currently open device.
		if(isDeviceFunc) {
			if(route.deviceKey) {
				deviceKey = route.deviceKey;
				if(deviceKeeper.devices[deviceKey]) {
					isValidFunc = true;
					caller = deviceKeeper.devices[deviceKey];
				}
			}
		} else {
			caller = deviceKeeper;
			isValidFunc = true;
		}
		var numArgs;
		var args;
		if ((typeof(caller[func]) === 'function') && isValidFunc) {
			numArgs = m.args.length;
			args = m.args;
			if(numArgs === 0) {
				caller[func]()
				.then(success, error);
			} else if(numArgs === 1) {
				caller[func](args[0])
				.then(success, error);
			} else if(numArgs === 2) {
				caller[func](args[0], args[1])
				.then(success, error);
			} else if(numArgs === 3) {
				caller[func](args[0], args[1], args[2])
				.then(success, error);
			} else if(numArgs === 4) {
				caller[func](args[0], args[1], args[2], args[3])
				.then(success, error);
			} else {
				caller[func](args)
				.then(success, error);
			}
		} else {
			console.error('device_manager.js - function not found...');
			defered.reject('function not found in device_manager.js');
		}
		return defered.promise;
	};

	var saveLink = function(link) {
		var defered = q.defer();
		sendMessage = link.sendMessage;
		send = link.send;

		// Initialize the device keeper
		deviceKeeper = new device_keeper.createDeviceKeeper(io_delegator, link);

		deviceKeeper.init()
		.then(defered.resolve);
		return defered.promise;
	};
	this.init = function() {
		var defered = q.defer();
		
		// Link with the io_delegator to receive messages
		io_delegator.establishLink(io_endpoint_key, ipcMessageReceiver, listener)
		.then(saveLink)
		.then(defered.resolve);
		// defered.resolve();
		return defered.promise;
	};
	var self = this;
}

exports.createNewDeviceManager = createDeviceManager;
