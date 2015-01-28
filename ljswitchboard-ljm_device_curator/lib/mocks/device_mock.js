
// This is a mock device to use when no actual devices are present.
var q = require('q');
var ljm = require('labjack-nodejs');
var constants = ljm.driver_const;
var modbusMap = ljm.modbusMap.getConstants();

var NUM_OPEN_DEVICES = 0;
var FAKE_IP_ADDRESS = '192.168.1.12';
var NO_IP_ADDRESS = '0.0.0.0';
var TEST_SERIAL_NUMBER = 0123456789;

function device() {
	this.handle = null;
	this.deviceType = null;
	this.connectionType = null;
	this.identifier = null;

	// Device Attributes:
	this.devAttr = {};

	this.responses = {
		'HARDWARE_INSTALLED': 7,
		'DEVICE_NAME_DEFAULT': 'TEST_DEVICE',
		'WIFI_VERSION': 3.12,
		'BOOTLOADER_VERSION': 0.9400,
		'FIRMWARE_VERSION': 1.0144
	};

	/**
	 * Analog input generation code:
	**/
	var randomAnalogReading = function(min, max) {
		return Math.random() * (max - min) + min;
	};
	var analogInputRanges = {};
	this.getAINReading = function(channelNum) {
		var resultRange = 10;
		if(analogInputRanges[channelNum]) {
			resultRange = analogInputRanges[channelNum];
		}

		return randomAnalogReading(resultRange, resultRange * -1);
	};

	this.calledFunctions = [];
	var saveCall = function(name, args) {
		self.calledFunctions.push({'name': name, 'args': args});
	};
	this.getCalledFunctions = function() {
		return self.calledFunctions;
	};
	this.clearCalledFunctions = function() {
		self.calledFunctions = [];
	};

	this.savedResults = {};
	this.pushResult = function(name, isError, data) {
		var newData = {
			'name': name,
			'isError': isError,
			'data': data
		};
		if(self.savedResults[name]) {
			if(!Array.isArray(self.savedResults[name])) {
				self.savedResults[name] = [];
			}
		} else {
			self.savedResults[name] = [];
		}
		self.savedResults[name].push(newData);
	};

	var finishCall = function(name, data) {
		var defered = q.defer();
		if(self.savedResults[name]) {
			if(Array.isArray(self.savedResults[name])) {
				if(self.savedResults[name].length > 0) {
					// Pull and remove the first item from the array
					var tResult = self.savedResults[name][0];
					self.savedResults[name] = self.savedResults[name].slice(1);
					
					// Resolve to the result
					if(tResult.isError) {
						defered.reject(tResult.data);
					} else {
						defered.resolve(tResult.data);
					}
				}
			}
		}
		defered.resolve(data);
		return defered.promise;
	};

	this.open = function(deviceType, connectionType, identifier, onErr, onSucc) {
		saveCall('open', arguments);

		identifier = identifier.toString();

		self.handle = NUM_OPEN_DEVICES;
		NUM_OPEN_DEVICES += 1;

		self.deviceType = deviceType;
		self.connectionType = connectionType;
		self.identifier = identifier;

		// Get LJM numerics
		var devTNum = constants.deviceTypes[deviceType];
		if(devTNum === constants.deviceTypes.any) {
			devTNum = constants.deviceTypes.t7;
		}
		var conTNum = constants.connectionTypes[connectionType];
		if(conTNum === constants.connectionTypes.any) {
			conTNum = constants.connectionTypes.usb;
		}

		// Assign an IP?
		var ipAddr;
		var port = 0;
		var isIP = identifier.split('.').length === 3;
		if((conTNum === 3) || (conTNum === 4)) {
			port = 502;
			if(isIP) {
				ipAddr = identifier;
			} else {
				ipAddr = FAKE_IP_ADDRESS;
			}
		} else {
			ipAddr = NO_IP_ADDRESS;
		}

		// Assign a serial number?
		var serialNum;
		if(!isIP) {
			if(!isNaN(identifier)) {
				serialNum = parseInt(identifier);
			} else {
				serialNum = TEST_SERIAL_NUMBER;
			}
		} else {
			serialNum = TEST_SERIAL_NUMBER;
		}

		self.devAttr.deviceType = devTNum;
		self.devAttr.connectionType = conTNum;
		self.devAttr.serialNumber = serialNum;
		self.devAttr.ip = ipAddr;
		self.devAttr.port = port;
		self.devAttr.maxBytesPerMB = 32;

		// Finish:
		finishCall('open').then(onSucc, onErr);
	};

	this.getHandleInfo = function(onErr, onSucc) {
		saveCall('getHandleInfo', arguments);
		finishCall('getHandleInfo', self.devAttr).then(onSucc, onErr);
	};
	
	this.readRaw = function(data, onErr, onSucc) {
		saveCall('readRaw', arguments);
		var aData = new Buffer(data.length);
		aData.fill(0);
		finishCall('readRaw', aData).then(onSucc, onErr);
	};

	var getChannelNum = new RegExp("[0-9]{1,}");
	var isAnalogInput = new RegExp("^AIN[0-9]{1,}$");
	this.getResult = function(address) {
		var result = 0;
		if(self.responses[address]) {
			if(typeof(self.responses[address]) === 'function') {
				result = self.responses[address](address);
			} else {
				result = self.responses[address];
			}
		} else {
			var channelNum;
			if(isAnalogInput.test(address)) {
				channelNum = getChannelNum.exec(address)[0];
				result = self.getAINReading(channelNum);
			}
		}
		return result;
	};
	this.read = function(address, onErr, onSucc) {
		saveCall('read', arguments);
		var result = self.getResult(address);
		finishCall('read', result).then(onSucc, onErr);
	};

	this.readMany = function(addresses, onErr, onSucc) {
		saveCall('readMany', arguments);
		var result = 0;
		finishCall('readMany', result).then(onSucc, onErr);
	};

	this.writeRaw = function(data, onErr, onSucc) {
		saveCall('writeRaw', arguments);
		var result = 0;
		finishCall('writeRaw', result).then(onSucc, onErr);
	};

	this.write = function(address, value, onErr, onSucc) {
		saveCall('write', arguments);
		var result = 0;
		finishCall('write', result).then(onSucc, onErr);
	};

	this.writeMany = function(addresses, values, onErr, onSucc) {
		saveCall('writeMany', arguments);
		var result = 0;
		finishCall('writeMany', result).then(onSucc, onErr);
	};

	this.rwMany = function(addresses, directions, numValues, values, onErr, onSucc) {
		saveCall('rwMany', arguments);
		var result = 0;
		finishCall('rwMany', result).then(onSucc, onErr);
	};

	this.readUINT64 = function(type, onErr, onSucc) {
		saveCall('readUINT64', arguments);
		var result = 0;
		finishCall('readUINT64', result).then(onSucc, onErr);
	};

	this.streamStart = function(scansPerRead, scanList, scanRate, onErr, onSucc) {
		saveCall('streamStart', arguments);
		var result = 0;
		finishCall('streamStart', result).then(onSucc, onErr);
	};

	this.streamRead = function(onErr, onSucc) {
		saveCall('streamRead', arguments);
		var result = 0;
		finishCall('streamRead', result).then(onSucc, onErr);
	};

	this.streamStop = function(onErr, onSucc) {
		saveCall('streamStop', arguments);
		var result = 0;
		finishCall('streamStop', result).then(onSucc, onErr);
	};

	this.close = function(onErr, onSucc) {
		saveCall('close', arguments);
		var result = 0;
		finishCall('close', result).then(onSucc, onErr);
	};


	var self = this;
}

exports.device = device;