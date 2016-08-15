
var constants = require('../common/constants');
var q = require('q');
var io_endpoint_key = constants.driver_endpoint_key;

function createDriverController(io_interface) {

	var callFunc = null;
	var sendReceive = null;
	var sendMessage = null;
	var send = null;

	var listener = function(m) {
		console.log('in driver_controller.js-listener', m);
	};
	var saveLink = function(link) {
		var defered = q.defer();

		callFunc = link.callFunc;
		sendReceive = link.sendReceive;
		sendMessage = link.sendMessage;
		send = link.send;
		defered.resolve();
		return defered.promise;
	};
	this.init = function() {
		var defered = q.defer();

		io_interface.establishLink(io_endpoint_key, listener)
		.then(saveLink)
		.then(defered.resolve);
		return defered.promise;
	};

	this.listAll = function(deviceType, connectionType) {
		return callFunc('listAll', [deviceType, connectionType]);
	};
	this.listAllExtended = function(deviceType, connectionType, registers) {
		return callFunc(
			'listAllExtended',
			[deviceType, connectionType, registers]
		);
	};
	this.errToStr = function(errNum) {
		var defered = q.defer();
		// errToStr is a special function that should always resolve and not 
		// reject because it is making sense of errors, not making errors out of
		// errors.
		callFunc('errToStr', [errNum])
		.then(function(res) {
			defered.resolve(res);
		}, function(err) {
			defered.resolve(err);
		});
		return defered.promise;
	};
	this.printErrToStr = function(errNum) {
		var defered = q.defer();
		self.errToStr(errNum)
		.then(function(str) {
			console.log('Error Number:', errNum, 'is', str);
			defered.resolve(str);
		});
		return defered.promise;
	};
	this.loadConstants = function() {
		return callFunc('loadConstants');
	};
	this.readLibrary = function(parameter) {
		return callFunc('readLibrary', [parameter]);
	};
	this.readLibraryS = function(parameter) {
		return callFunc('readLibraryS', [parameter]);
	};
	this.writeLibrary = function(parameter, value) {
		return callFunc('writeLibrary', [parameter, value]);
	};
	this.logS = function(level, str) {
		return callFunc('logS', [level, str]);
	};
	this.resetLog = function() {
		return callFunc('resetLog');
	};
	this.controlLog = function(mode, level) {
		return callFunc('controlLog', [mode, level]);
	};
	this.enableLog = function() {
		return callFunc('enableLog');
	};
	this.disableLog = function() {
		return callFunc('disableLog');
	};
	this.closeAll = function() {
		return callFunc('closeAll');
	};
	this.getFuncs = function() {
		return callFunc('getFuncs');
	};
	this.driverVersion = function() {
		return self.readLibrary('LJM_LIBRARY_VERSION');
	};
	this.specialAddresses = {
		load: function (options) {
			return callFunc('specialAddressesLoad', [options]);
		},
		parse: function(options) {
			return callFunc('specialAddressesParse', [options]);
		},
		save: function(userIPs, options) {
			return callFunc('specialAddressesSave', [userIPs, options]);
		},
		addIP: function(userIP, options) {
			return callFunc('specialAddressesAddIP', [userIP, options]);
		},
		addIPs: function(userIPs, options) {
			return callFunc('specialAddressesAddIPs', [userIPs, options]);
		},
		getDefaultFilePath: function() {
			return callFunc('specialAddressesGetDefaultFilePath');
		},
	};
	
	var self = this;
}

exports.createNewDriverController = createDriverController;
