
var q = require('q');

function createDeviceObject() {

	this.getHandleInfo = function() {
		return callFunc('getHandleInfo');
	};
	this.readRaw = function(data) {
		return callFunc('readRaw', [data]);
	};
	this.read = function(address) {
		return callFunc('read', [address]);
	};
	this.readMany = function(addresses) {
		return callFunc('readMany', [addresses]);
	};
	this.writeRaw = function(data) {
		return callFunc('readRaw', [data]);
	};
	this.write = function(address, value) {
		return callFunc('write', [address, value]);
	};
	this.writeMany = function(addresses, values) {
		return callFunc('writeMany', [addresses, values]);
	};
	this.rwMany = function(addresses, directions, numValues, values) {
		return callFunc('rwMany', [addresses, directions, numValues, values]);
	};
	this.readUINT64 = function(type) {
		return callFunc('readUINT64', [type]);
	};
	
	var self = this;
}

exports.createDeviceObject = createDeviceObject;