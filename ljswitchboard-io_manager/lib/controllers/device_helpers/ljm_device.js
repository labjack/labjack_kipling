
var q = require('q');

function createDevice(savedAttributes, deviceCallFunc, closeDeviceFunc) {
	this.savedAttributes = savedAttributes;
	this.device_comm_key = savedAttributes.device_comm_key;
	this.deviceCallFunc = deviceCallFunc;
	this.closeDeviceFunc = closeDeviceFunc;

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
		return self.callFunc('read', [address]);
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

	/**
	 *	The close function calls the previously passed in close function of the
	 *	device_controller object to instruct the sub-process to delete the 
	 *	close & delete the device and remove it from the device_controller's 
	 *	local listing of devices.
	 */
	this.close = function() {
		var defered = q.defer();

		// Inform sub-process that the device should be closed
		self.closeDeviceFunc(self.device_comm_key)
		.then(defered.resolve, defered.reject);
		return defered.promise;
	};
	
	var self = this;
}

exports.createDevice = createDevice;