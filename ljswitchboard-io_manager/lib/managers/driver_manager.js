
var labjack_nodejs = require('labjack-nodejs');
var constants = require('../common/constants');
var q = require('q');
var io_endpoint_key = constants.driver_endpoint_key;

function createDriverManager(io_delegator) {
	var ljm_driver = null;
	var sendMessage = null;
	var send = null;

	var listener = function(m) {
		console.log('in driver_manager.js-listener', m);
	};
	var messageReceiver = function(m) {
		var defered = q.defer();

		// Define Error Handling Function
		var error = function(err) {
			defered.reject(err);
		};

		// Define Success Handling Function
		var success = function(res) {
			defered.resolve(res);
		};

		var func = m.func;
		if(typeof(ljm_driver[func]) !== 'undefined') {
			var numArgs = self.numArgs[func];
			var args = m.args;
			if (numArgs === 0) {
				ljm_driver[func](error, success);
			} else if (numArgs === 1) {
				ljm_driver[func](args[0], error, success);
			} else if (numArgs === 2) {
				ljm_driver[func](args[0], args[1], error, success);
			} else if (numArgs === 3) {
				ljm_driver[func](args[0], args[1], args[2], error, success);
			} else {
				console.error("in driver_manager.js-mR func argLength invalid", m, self.numArgs);
				error(m);
			}
		} else {
			console.error("in driver_manager.js-mR func not defined", m);
			error(m);
		}
		// defered.resolve('d_m.js test-response');
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

		// Initialize the ljm_driver
		ljm_driver = new labjack_nodejs.driver();
		
		// Link with the io_delegator to receive messages
		io_delegator.establishLink(io_endpoint_key, messageReceiver, listener)
		.then(saveLink)
		.then(defered.resolve);
		return defered.promise;
	};
	this.numArgs = {
		'listAll': 2,
		'listAllExtended': 3,
		'errToStr': 1,
		'printErrToStr': 1,
		'loadConstants': 0,
		'readLibrary': 1,
		'readLibraryS': 1,
		'writeLibrary': 2,
		'logS': 1,
		'resetLog': 0,
		'driverVersion': 0
	};

	var self = this;
}

exports.createNewDriverManager = createDriverManager;
