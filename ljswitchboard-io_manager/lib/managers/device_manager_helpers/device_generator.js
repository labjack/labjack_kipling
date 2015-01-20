var q = require('q');
var labjack_nodejs = require('labjack-nodejs');
var device_curator = require('ljswitchboard-ljm_device_curator');
var device_interface = require('../../single_device_interface');
var device_delegator_path = './lib/delegators/single_device_delegator.js';
var constants = require('../../common/constants');

function newDevice(newProcess, mockDevice) {
	this.curatedDevice = null;

	this.newProcess = newProcess;
	this.mockDevice = mockDevice;

	this.device_comm_key = null;

	this.open = function(deviceType, connectionType, identifier) {
		var defered = q.defer();
		
		if(self.newProcess) {
			defered.reject('devices in sub-processes are currently not supported');
		} else {
			curatedDevice = new device_curator.device(self.mockDevice);
			// console.log("HERE", Object.keys(curatedDevice));
			curatedDevice.open(deviceType, connectionType, identifier)
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
			curatedDevice.close()
			.then(function(res) {
				this.curatedDevice = null;
				defered.resolve(res);
			}, defered.reject);
		}
		return defered.promise;
	};

	var self = this;
}
exports.newDevice = newDevice;