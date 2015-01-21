

var util = require('util');
var ljm_device = require('./ljm_device');

function createDevice(savedAttributes, deviceCallFunc) {

	var ljmDevice = new ljm_device.createDevice(savedAttributes, deviceCallFunc);
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

exports.createDevice = createDevice;