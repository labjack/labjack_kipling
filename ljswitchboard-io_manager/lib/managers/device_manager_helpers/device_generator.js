var q = require('q');
var labjack_nodejs = require('labjack-nodejs');
var device_curator = require('ljswitchboard-ljm_device_curator');
var device_interface = require('../../single_device_interface');
var device_delegator_path = './lib/delegators/single_device_delegator.js';
var constants = require('../../common/constants');

function newDevice(newProcess, mockDevice, sendFunc) {
	this.device = null;

	this.isNewProcess = newProcess;
	this.isMockDevice = mockDevice;
	
	var send = function(message) {
		return sendFunc(self.device_comm_key, message);
	};

	this.device_comm_key = null;

	this.oneWayListener = function(m) {
		console.log('device_generator oneWayListener', self.device_comm_key, m);
	};

	this.open = function(deviceType, connectionType, identifier) {
		var defered = q.defer();
		
		if(self.isNewProcess) {
			defered.reject('devices in sub-processes are currently not supported');
		} else {
			self.device = new device_curator.device(self.isMockDevice);
			self.device.open(deviceType, connectionType, identifier)
			.then(function(res) {
				self.device.savedAttributes['isSelected-Radio'] = false;
				self.device.savedAttributes['isSelected-CheckBox'] = true;
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

	this.updateFirmware = function(firmwareFileLocation) {

		var percentListener = function(percent) {
			var percentDefered = q.defer();
			send({
				'func': 'updateFirmware',
				'data': {
					'type': 'percent',
					'data': percent
				}
			});
			percentDefered.resolve();
			return percentDefered.promise;
		};
		var stepListener = function(step) {
			var stepDefered = q.defer();
			send({
				'func': 'updateFirmware',
				'data': {
					'type': 'step',
					'data': step
				}
			});
			stepDefered.resolve();
			return stepDefered.promise;
		};
		var defered = q.defer();

		if(self.isMockDevice) {
			percentListener(100);
			stepListener('finished');
			setTimeout(function() {
				defered.resolve('Yay');
			}, 1000);
		} else {
			self.device.updateFirmware(
				firmwareFileLocation,
				percentListener,
				stepListener
			).then(defered.resolve, defered.reject);
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