

var q = require('q');
var constants = require('../common/constants');
var io_endpoint_key = constants.single_device_endpoint_key;

function createSingleDeviceController(single_device_interface) {
	var callFunc = null;
	var sendReceive = null;
	var sendMessage = null;
	var send = null;

	var listener = function(m) {
		console.log('in driver_controller.js-listener', m);
	};
	var saveLink = function(link) {
		var defered = q.defer();

		console.log("in sdc.js saveLink")
		callFunc = link.callFunc;
		sendReceive = link.sendReceive;
		sendMessage = link.sendMessage;
		send = link.send;
		defered.resolve();
		return defered.promise;
	};
	this.init = function() {
		var defered = q.defer();
		console.log("in sdc.js init");
		single_device_interface.establishLink(io_endpoint_key, listener)
		.then(saveLink)
		.then(defered.resolve);
		return defered.promise;
	};

	var self = this;
}

exports.createSingleDeviceController = createSingleDeviceController;