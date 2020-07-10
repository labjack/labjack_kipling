

var constants = require('../common/constants');
var q = require('q');
var io_endpoint_key = constants.driver_endpoint_key;

function createLoggerController(io_interface) {
	this.io_interface = io_interface;
	console.log('io_interface...', io_interface);

	var callFunc = null;
	var sendReceive = null;
	var sendMessage = null;
	var send = null;

	// Listener/Log function
	var listener = function(m) {
		console.log('in logger_controller.js-listener', m);
	};

	// Function that saves links....?
	var saveLink = function(link) {
		var defered = q.defer();

		callFunc = link.callFunc;
		sendReceive = link.sendReceive;
		sendMessage = link.sendMessage;
		send = link.send;
		defered.resolve();
		return defered.promise;
	};


	// Initialize the logger & save links...
	this.init = function() {
		var defered = q.defer();
		console.log('Initializing logger_controller');
		io_interface.establishLink(io_endpoint_key, listener)
		.then(saveLink)
		.then(defered.resolve);
		return defered.promise;
	};
	var self = this;
}

exports.createNewLoggerController = createLoggerController;
