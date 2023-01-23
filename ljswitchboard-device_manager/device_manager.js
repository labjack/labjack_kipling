
/* Native Requirements */
var EventEmitter = require('events').EventEmitter;
var util = require('util');

var eventList = require('./device_manager_events').events;

var async = require('async');
var q = require('q');
var device_curator = require('../ljswitchboard-ljm_device_curator');
var ljm_ffi = require('../ljm-ffi');
var ljm = ljm_ffi.load();
var ljmb = require('../ljswitchboard-modbus_map');
var modbus_map = ljmb.getConstants();

function CREATE_DEVICE_MANAGER() {
	console.error("this.deviceConnected", this.device)
	this.deviceConnected = false;
	this.devices = [];

	this.connectToDevices = function(deviceInfoss) {

		console.error("connectToDevices deviceInfoss", deviceInfoss)
		var defered = q.defer();
		
		async.each(deviceInfoss,
			function(deviceInfo, cb) {
				var device = new device_curator.device();
				self.devices.push(device);
				
				device.open(deviceInfo.dt, deviceInfo.ct, deviceInfo.id)
				.then(function(res) {
					console.warn("hmm", res)
					self.deviceConnected = true;
					// console.log('in device_manager.js, openDevice', res);
					
					cb();
				}, function(err) {
					// make it so that it will check if there is a device that is conected
					// self.deviceConnected = true;
					console.error('Error opening a device1', err);
					cb();
				});
			},
			function(err) {
				console.warn("what is the error that we hav been hitting?", err);
				defered.resolve();
			});

		return defered.promise;
	}
	this.getDevices = function() {
		console.warn("self", self)
		console.warn("some", self.devicessavedAttributes)
		console.warn("self.devices", self.devices)
		return self.devices;
	}
	this.forceCloseAllDevices = function() {
		return ljm.LJM_CloseAll();
	}
	this.closeDevices = function() {
		console.error("right before shit gets real")
		var defered = q.defer();

		async.each(self.devices,
			function(device, cb) {
				device.close()
				.then(cb,cb);
			},
			function(err) {
				defered.resolve();
			});
		return defered.promise;
	}
	var self = this;
}
exports.create = function() {
	return new CREATE_DEVICE_MANAGER();
};

util.inherits(CREATE_DEVICE_MANAGER, EventEmitter);

/* feature discovery & event constant handling */
exports.eventList = eventList;



