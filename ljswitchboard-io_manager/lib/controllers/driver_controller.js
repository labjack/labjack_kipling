
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
		return callFunc('errToStr', [errNum]);
	};
	this.printErrToStr = function(errNum) {
		self.errToStr(errNum)
		.then(function(str) {
			console.log('Error Number:', errNum, 'is', str);
		});
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
	this.driverVersion = function() {
		return self.readLibrary('LJM_LIBRARY_VERSION');
	};
	
	var self = this;
}

exports.createNewDriverController = createDriverController;
