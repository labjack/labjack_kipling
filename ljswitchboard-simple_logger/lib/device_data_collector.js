
var EventEmitter = require('events').EventEmitter;
var util = require('util');
var q = require('q');

var EVENT_LIST = {
	DATA: 'DATA',
	ERROR: 'ERROR',
};

function CREATE_DEVICE_DATA_COLLECTOR (devices, deviceSerialNumber) {
	this.devices = undefined;

	this.isValidDevice = false;
	this.device = undefined;

	this.isActive = false;

	this.updateDeviceListing = function(devices) {
		var defered = q.defer();
		self.devices = devices;
		defered.resolve(devices);
		return defered.promise;
	};
	this.linkToDevice = function(deviceSerialNumber) {
		var defered = q.defer();
		// Loop through the devices object and try to link to the device with
		// the desired serial number.
		self.devices.some(function(device) {
			if(device.savedAttributes.serialNumber == deviceSerialNumber) {
				self.isValidDevice = true;
				self.device = device;
				return true;
			}
		});
		defered.resolve();
		return defered.promise;
	};

	this.startNewRead = function(registerList) {
		var defered = q.defer();

		// Check to see if a device IO is currently pending.
		if(self.isActive) {
			// If an IO is currently pending, don't start a new read.
		} else {
			// If an IO is not currently pending then start a new read.
			self.device.readMany(registerList)
			.then(function(results) {

			}, then(function(err) {

			}));
		}
		return defered.promise;
	};

	var self = this;
}
util.inherits(CREATE_DEVICE_DATA_COLLECTOR, EventEmitter);


exports.createDeviceDataCollector = function(curatedDevice) {
	return new CREATE_DEVICE_DATA_COLLECTOR(curatedDevice);
};