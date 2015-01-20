

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
		var func = m.func;
		var numArgs;
		var args;

		// console.log('in dev_man.js args', m.args);
		if(typeof(deviceKeeper[func]) === 'function') {
			numArgs = m.args.length;
			args = m.args;
			if(numArgs === 0) {
				deviceKeeper[func]()
				.then(success, error);
			} else if(numArgs === 1) {
				deviceKeeper[func](args[0])
				.then(success, error);
			} else if(numArgs === 2) {
				deviceKeeper[func](args[0], args[1])
				.then(success, error);
			} else if(numArgs === 3) {
				deviceKeeper[func](args[0], args[1], args[2])
				.then(success, error);
			} else if(numArgs === 4) {
				deviceKeeper[func](args[0], args[1], args[2], args[3])
				.then(success, error);
			} else {
				deviceKeeper[func](args)
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
