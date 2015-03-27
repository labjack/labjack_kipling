
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
	
	var getLJMDeviceEventListener = function(eventKey) {
		var ljmDeviceEventListener = function(eventData) {
			self.emit(eventKey, eventData);
		};
		return ljmDeviceEventListener;
	};
	var ljmDeviceEvents = ljmDevice.eventList;
	var ljmDeviceEventKeys = Object.keys(ljmDeviceEvents);
	ljmDeviceEventKeys.forEach(function(key) {
		ljmDevice.on(key, getLJMDeviceEventListener(key));
	});
	
	this.testFunc = function() {

	};
	var self = this;
}
util.inherits(createDevice, EventEmitter);

exports.createDevice = createDevice;