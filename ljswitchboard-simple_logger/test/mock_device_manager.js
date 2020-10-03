var async = require('async');
var device_curator = require('ljswitchboard-ljm_device_curator');

function CREATE_DEVICE_MANAGER() {
	this.devices = [];
	this.devicesToOpen = [];

	this.configure = function(requiredDevices) {
		self.devices = [];
		self.devicesToOpen = requiredDevices;
	};

	var getConfigurableDeviceAttributes = function(allAttributes) {
		var configAttributes = {};

		var attrsToIgnore = [
			'deviceType',
			'connectionType',
		];

		var keys = Object.keys(allAttributes);
		keys.forEach(function(key) {
			configAttributes[key] = allAttributes[key];
		});

		return configAttributes;
	};
	this.openDevices = function(test) {
		async.eachSeries(
		self.devicesToOpen,
		function(deviceToOpen, cb) {
			var device = new device_curator.device(true);

			// Save device reference
			self.devices.push(device);

			device.configureMockDevice(
				getConfigurableDeviceAttributes(deviceToOpen)
			)
			.then(function(res) {
				assert.isOk(true, 'Opened Device');
				device.open(
					deviceToOpen.deviceType,
					deviceToOpen.serialNumber,
					deviceToOpen.connectionType
				).then(function(res) {
					cb();
				}, function(err) {
					console.log('Failed to open device', device);
					console.log('Error', err);
					assert.isOk(false, 'Failed to open device');
					cb();
				});
			});
		},
		function(err) {
			//Need to verify opened devices...
			done();
		});
	};
	this.getDevicesInfo = function(test) {
		// console.log('Num Devices', self.devices.length);
		self.devices.forEach(function(device) {
			var deviceInfo = device.savedAttributes;
			var keys = Object.keys(deviceInfo);

			var devData = {};
			var importantKeys = [
				'serialNumber',
				'ip',
				'deviceTypeName',
				'productType'
			];
			importantKeys.forEach(function(key) {
				devData[key] = deviceInfo[key];
			});
			// console.log('Device Info', devData);
		});
		done();
	};
	this.getDevices = function() {
		return self.devices;
	};

	this.closeDevices = function(test) {
		async.eachSeries(
		self.devices,
		function(device, cb) {
			device.close()
			.then(function(res) {
				assert.isOk(true, 'Closed Device');
				cb();
			}, function(err) {
				console.log('Failed to Closed Device');
				console.log('Error', err);
				assert.isOk(false, 'Failed to close device');
				cb();
			});
		},
		function(err) {
			done();
		});
	};
	var self = this;
}


exports.createDeviceManager = function() {
	return new CREATE_DEVICE_MANAGER();
};
