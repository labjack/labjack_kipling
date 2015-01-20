

var labjack_nodejs = require('labjack-nodejs');
var q = require('q');
var constants = require('../common/constants');
var io_endpoint_key = constants.single_device_endpoint_key;


function createSingleDeviceManager(io_delegator) {

	var ljm_driver = null;
	var sendMessage = null;
	var send = null;

	var listener = function(m) {
		console.log('in single_device_manager.js-listener', m);
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
		console.log("in single_device_manager.js",m);

		success(m);
		return defered.promise;
	};

	var saveLink = function(link) {
		var defered = q.defer();
		sendMessage = link.sendMessage;
		send = link.send;

		defered.resolve();
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

exports.createSingleDeviceManager = createSingleDeviceManager;
