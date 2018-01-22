
/* Native Requirements */
var EventEmitter = require('events').EventEmitter;
var util = require('util');

var eventList = require('./device_manager_events').events;

var async = require('async');
var q = require('q');
var device_curator = require('ljswitchboard-ljm_device_curator');
var ljm_ffi = require('ljm-ffi');
var ljm = ljm_ffi.load();
var ljmb = require('ljswitchboard-modbus_map');
var modbus_map = ljmb.getConstants();

function CREATE_DEVICE_MANAGER() {
	this.deviceConnected = false;
	this.devices = [];

	this.connectToDevices = function(deviceInfoss) {
		var defered = q.defer();
		async.each(deviceInfoss,
			function(deviceInfo, cb) {
				var device = new device_curator.device();
				self.devices.push(device);
				
				device.open(deviceInfo.dt, deviceInfo.ct, deviceInfo.id)
				.then(function(res) {
					self.deviceConnected = true;
					// console.log('in device_manager.js, openDevice', res);
					
					cb();
				}, function(err) {
					console.error('Error opening a device', err);
					cb();
				});
			},
			function(err) {
				defered.resolve();
			});

		return defered.promise;
	};
	this.getDevices = function() {
		return self.devices;
	};
	this.forceCloseAllDevices = function() {
		return ljm.LJM_CloseAll();
	};
	this.closeDevices = function() {
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
	};
	var self = this;
}
exports.create = function() {
	return new CREATE_DEVICE_MANAGER();
};

util.inherits(CREATE_DEVICE_MANAGER, EventEmitter);

/* feature discovery & event constant handling */
exports.eventList = eventList;



