
var labjack_nodejs = require('labjack-nodejs');
var constants = require('../common/constants');
var q = require('q');
var io_endpoint_key = constants.driver_endpoint_key;

var ljm_special_addresses_loaded = false;
var ljm_special_addresses;
function loadLJMSpecialAddresses() {
	if(!ljm_special_addresses_loaded) {
		ljm_special_addresses = require('ljswitchboard-ljm_special_addresses');
	}
}

function createDriverManager(io_delegator) {
	var ljm_driver = null;
	var custom_functions = {
		'getFuncs': function(onError, onSuccess) {
			var functionList = Object.keys(ljm_driver);
			setImmediate(function() {
				onSuccess(functionList);
			});
		},
		'specialAddressesLoad': function(options, onError, onSuccess) {
			loadLJMSpecialAddresses();
			ljm_special_addresses.load(options)
			.then(onSuccess, onError)
			.catch(onError);
		},
		'specialAddressesParse': function(options, onError, onSuccess) {
			loadLJMSpecialAddresses();
			ljm_special_addresses.parse(options)
			.then(onSuccess, onError)
			.catch(onError);
		},
		'specialAddressesSave': function(userIPs, options, onError, onSuccess) {
			loadLJMSpecialAddresses();
			ljm_special_addresses.save(userIPs, options)
			.then(onSuccess, onError)
			.catch(onError);
		},
		'specialAddressesAddIP': function(userIP, options, onError, onSuccess) {
			loadLJMSpecialAddresses();
			ljm_special_addresses.addIP(userIP, options)
			.then(onSuccess, onError)
			.catch(onError);
		},
		'specialAddressesAddIPs': function(userIPs, options, onError, onSuccess) {
			loadLJMSpecialAddresses();
			ljm_special_addresses.addIPs(userIPs, options)
			.then(onSuccess, onError)
			.catch(onError);
		},
		'specialAddressesGetDefaultFilePath': function(onError, onSuccess) {
			loadLJMSpecialAddresses();
			ljm_special_addresses.getDefaultFilePath()
			.then(onSuccess, onError)
			.catch(onError);
		},
	};
	var customNumArgs = {
		'getFuncs': 0,
		'specialAddressesLoad': 1,
		'specialAddressesParse': 1,
		'specialAddressesSave': 2,
		'specialAddressesAddIP': 2,
		'specialAddressesAddIPs': 2,
		'specialAddressesGetDefaultFilePath': 0,
	};

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
		var numArgs;
		var args;
		if(typeof(ljm_driver[func]) === 'function') {
			numArgs = self.numArgs[func];
			args = m.args;
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
		} else if (typeof(custom_functions[func]) === 'function') {
			numArgs = customNumArgs[func];
			args = m.args;
			if (numArgs === 0) {
				custom_functions[func](error, success);
			} else if (numArgs === 1) {
				custom_functions[func](args[0], error, success);
			} else if (numArgs === 2) {
				custom_functions[func](args[0], args[1], error, success);
			} else if (numArgs === 2) {
				custom_functions[func](args[0], args[1], args[2], error, success);
			} else {
				console.error("in driver_manager.js-mR custom func argLength invalid", m, customNumArgs);
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
		'logS': 2,
		'resetLog': 0,
		'controlLog': 2,
		'enableLog': 0,
		'disableLog': 0,
		'driverVersion': 0
	};

	var self = this;
}

exports.createNewDriverManager = createDriverManager;
