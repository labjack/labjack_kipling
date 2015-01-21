var q = require('q');
var labjack_nodejs = require('labjack-nodejs');
var device_curator = require('ljswitchboard-ljm_device_curator');
var device_interface = require('../../single_device_interface');
var device_delegator_path = './lib/delegators/single_device_delegator.js';
var constants = require('../../common/constants');

function newDevice(newProcess, mockDevice) {
	this.device = null;

	this.isNewProcess = newProcess;
	this.isMockDevice = mockDevice;

	this.device_comm_key = null;

	this.open = function(deviceType, connectionType, identifier) {
		var defered = q.defer();
		
		if(self.isNewProcess) {
			defered.reject('devices in sub-processes are currently not supported');
		} else {
			self.device = new device_curator.device(self.isMockDevice);
			self.device.open(deviceType, connectionType, identifier)
			.then(function(res) {
				res.device_comm_key = self.device_comm_key;
				defered.resolve(res);
			}, function(err) {
				var intErr = {
					'err': err,
					'device_comm_key': self.device_comm_key
				};
				defered.reject(intErr);
			});
		}
		return defered.promise;
	};


	this.close = function() {
		var defered = q.defer();
		if(self.newProcess) {
			defered.reject('devices in sub-processes are currently not supported');
		} else {
			self.device.close()
			.then(function(res) {
				this.device = null;
				defered.resolve(self.device_comm_key);
			}, defered.reject);
		}
		return defered.promise;
	};

	var self = this;
}
exports.newDevice = newDevice;