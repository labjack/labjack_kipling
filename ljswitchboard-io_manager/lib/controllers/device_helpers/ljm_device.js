
var q = require('q');

function createDevice(savedAttributes, deviceCallFunc) {
	this.savedAttributes = savedAttributes;
	this.device_comm_key = savedAttributes.device_comm_key;
	this.deviceCallFunc = deviceCallFunc;

	this.callFunc = function(func, args) {
		return self.deviceCallFunc(self.device_comm_key, func, args);
	};

	this.getHandleInfo = function() {
		return self.callFunc('getHandleInfo');
	};
	this.readRaw = function(data) {
		return self.callFunc('readRaw', [data]);
	};
	this.read = function(address) {
		var defered = q.defer();
		self.callFunc('read', [address])
		.then(function(res) {
			defered.resolve(res);
		}, function(err) {
			console.log('ljm_device read error detected', err);
			defered.reject(err);
		});
		return defered.promise;
	};
	this.readMany = function(addresses) {
		return self.callFunc('readMany', [addresses]);
	};
	this.writeRaw = function(data) {
		return self.callFunc('readRaw', [data]);
	};
	this.write = function(address, value) {
		return self.callFunc('write', [address, value]);
	};
	this.writeMany = function(addresses, values) {
		return self.callFunc('writeMany', [addresses, values]);
	};
	this.rwMany = function(addresses, directions, numValues, values) {
		return self.callFunc('rwMany', [addresses, directions, numValues, values]);
	};
	this.readUINT64 = function(type) {
		return self.callFunc('readUINT64', [type]);
	};
	
	var self = this;
}

exports.createDevice = createDevice;