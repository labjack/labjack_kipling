
var EventEmitter = require('events').EventEmitter;
var util = require('util');
var ljm_device = require('./ljm_device');

function createDevice(savedAttributes, deviceCallFunc, deviceSendFunc, closeDeviceFunc) {

	var ljmDevice = new ljm_device.createDevice(
		savedAttributes,
		deviceCallFunc,
		deviceSendFunc,
		closeDeviceFunc
	);
	var ljmDeviceKeys = Object.keys(ljmDevice);
	var i = 0;
	for(i = 0; i < ljmDeviceKeys.length; i++) {
		var key = ljmDeviceKeys[i];
		this[key] = ljmDevice[key];
	}
	
	this.testFunc = function() {

	};
	var self = this;
}
util.inherits(createDevice, EventEmitter);

exports.createDevice = createDevice;