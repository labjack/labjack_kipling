
var q = require('q');
var ljm = require('labjack-nodejs');

function device() {
	var ljmDevice = new ljm.device();

	var savedAttributes = {};

	var privateOpen = function(openParameters) {
		var defered = q.defer();
		ljmDevice.open(
			openParameters.deviceType,
			openParameters.connectionType,
			openParameters.identifier,
			defered.reject,
			defered.resolve
		);
		return defered.promise;
	};
	var saveAndLoadAttributes = function(openParameters) {
		return function() {
			var defered = q.defer();
			savedAttributes = {};

			self.getHandleInfo()
			.then(function(info) {
				var infoKeys = Object.keys(info);
				infoKeys.forEach(function(key) {
					savedAttributes[key] = info[key];
				});
				savedAttributes.openParameters = openParameters;
				defered.resolve(savedAttributes);
			}, defered.reject);
			return defered.promise;
		};
	};
	this.open = function(deviceType, connectionType, identifier) {
		var defered = q.defer();
		
		var openParameters = {
			'deviceType': deviceType,
			'connectionType': connectionType,
			'identifier': identifier
		};

		privateOpen(openParameters)
		.then(saveAndLoadAttributes(openParameters), defered.reject)
		.then(defered.resolve);
		return defered.promise;
	};
	this.getHandleInfo = function() {
		var defered = q.defer();
		ljmDevice.getHandleInfo(defered.reject, defered.resolve);
		return defered.promise;
	};
	this.getDeviceAttributes = function() {
		var defered = q.defer();
		defered.resolve(savedAttributes);
		return defered.promise;
	};
	this.readRaw = function(data) {
		var defered = q.defer();
		ljmDevice.getHandleInfo(
			data,
			defered.reject,
			defered.resolve
		);
		return defered.promise;
	};
	this.read = function(address) {
		var defered = q.defer();
		ljmDevice.getHandleInfo(
			address,
			defered.reject,
			defered.resolve
		);
		return defered.promise;
	};
	this.readMany = function(addresses) {
		var defered = q.defer();
		ljmDevice.getHandleInfo(
			addresses,
			defered.reject,
			defered.resolve
		);
		return defered.promise;
	};
	this.writeRaw = function(data) {
		var defered = q.defer();
		ljmDevice.getHandleInfo(
			data,
			defered.reject,
			defered.resolve
		);
		return defered.promise;
	};
	this.write = function(address, value) {
		var defered = q.defer();
		ljmDevice.getHandleInfo(
			address,
			value,
			defered.reject,
			defered.resolve
		);
		return defered.promise;
	};
	this.writeMany = function(addresses, values) {
		var defered = q.defer();
		ljmDevice.getHandleInfo(
			addresses,
			values,
			defered.reject,
			defered.resolve
		);
		return defered.promise;
	};
	this.rwMany = function(addresses, directions, numValues, values) {
		var defered = q.defer();
		ljmDevice.getHandleInfo(
			addresses,
			directions,
			numValues,
			values,
			defered.reject,
			defered.resolve
		);
		return defered.promise;
	};
	this.readUINT64 = function(type) {
		var defered = q.defer();
		ljmDevice.getHandleInfo(
			type,
			defered.reject,
			defered.resolve
		);
		return defered.promise;
	};
	this.close = function() {
		var defered = q.defer();
		ljmDevice.getHandleInfo(
			defered.reject,
			defered.resolve
		);
		return defered.promise;
	};

	var self = this;
}

exports.device = device;