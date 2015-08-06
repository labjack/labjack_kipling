var q = require('q');
var async = require('async');
var device_curator = require('ljswitchboard-ljm_device_curator');

function CREATE_DEVICE_MANAGER() {
	this.devices = [];
	this.devicesToOpen = [];

	this.configure = function(requiredDevices) {
		self.devices = [];
		self.devicesToOpen = requiredDevices;
	};

	this.openDevices = function(test) {
		async.eachSeries(
		self.devicesToOpen,
		function(devicesToOpen, cb) {
			var device = new device_curator.device(true);
			
			// Save device reference
			self.devices.push(device);

			device.open(
				devicesToOpen.deviceType,
				devicesToOpen.serialNumber,
				devicesToOpen.connectionType
			).then(function(res) {
				test.ok(true, 'Opened Device');
				cb();
			}, function(err) {
				console.log('Failed to open device', device);
				console.log('Error', err);
				test.ok(false, 'Failed to open device');
				cb();
			});
		},
		function(err) {
			test.done();
		});
	};

	this.getDevices = function() {
		return [];
	};

	this.closeDevices = function(test) {
		async.eachSeries(
		self.devices,
		function(device, cb) {
			device.close()
			.then(function(res) {
				test.ok(true, 'Closed Device');
				cb();
			}, function(err) {
				console.log('Failed to Closed Device');
				console.log('Error', err);
				test.ok(false, 'Failed to close device');
				cb();
			});
		},
		function(err) {
			test.done();
		});
	};
	var self = this;
}


exports.createDeviceManager = function() {
	return new CREATE_DEVICE_MANAGER();
};