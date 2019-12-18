
// This is a mock device to use when no actual devices are present.
var q = require('q');
var ljm = require('labjack-nodejs');
var constants = require('ljswitchboard-ljm_driver_constants');
var modbus_map = require('ljswitchboard-modbus_map');
var modbusMap = modbus_map.getConstants();
var data_parser = require('ljswitchboard-data_parser');
var semver = require('semver');

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
		'HARDWARE_INSTALLED': function() {
			var dtn = constants.deviceTypes[self.devAttr.deviceType];
			if(dtn == 7) {
				return 15;// Force recognized T7 to be a -Pro
			} else {
				return 0;
			}
		},
		'DEVICE_NAME_DEFAULT': 'TEST_DEVICE',
		'WIFI_VERSION': function() {
			var dtn = constants.deviceTypes[self.devAttr.deviceType];
			if(dtn == 7) {
				return 3.12;
			} else {
				return 0;
			}
		},
		'ETHERNET_IP': function() {
			// return 192.168.1.96
			return 0xC0A80160
		},
		'WIFI_IP': function() {
			// return 192.168.1.97
			var dtn = constants.deviceTypes[self.devAttr.deviceType];
			if(dtn == 7) {
				return 0xC0A80161
			} else {
				return 0;
			}
		},
		'BOOTLOADER_VERSION': 0.9400,
		'FIRMWARE_VERSION': 1.0144,
		'DGT_INSTALLED_OPTIONS': 3,// Force recognized Digit to be a -TLH
		'SERIAL_NUMBER': function() {
			if(self.devAttr.serialNumber) {
				return self.devAttr.serialNumber;
			} else {
				return TEST_SERIAL_NUMBER;
			}
			
		},
		'DAC0': 0,
		'DAC1': 0,
	};

	var innerConfigureMockDevice = function(deviceInfo) {
		// device attribute key mapping
		var devAttrKeys = {
			'serialNumber': 'serialNumber',
			'ip': 'ip',
			'ipAddress': 'ip',
			'port': 'port',
			'deviceType': 'deviceType',
			'connectionType': 'connectionType',
			'maxBytesPerMB': 'maxBytesPerMB',
		};
		var keys = Object.keys(deviceInfo);
		keys.forEach(function(key) {
			// Check to see if the deviceInfo data should be saved as a device
			// attribute.
			var info = modbusMap.getAddressInfo(key);
			var newData;
			var dt = constants.LJM_DT_ANY;
			if(self.devAttr.deviceType) {
				dt = self.devAttr.deviceType;
			}
			if(devAttrKeys[key]) {
				self.devAttr[devAttrKeys[key]] = deviceInfo[key];
			} else if(info.type !== -1) {
				if(typeof(deviceInfo[key]) !== 'undefined') {
					if(typeof(deviceInfo[key].res) !== 'undefined') {
						newData = data_parser.encodeValue(
							key,
							deviceInfo[key].res,
							dt
						);
						self.responses[key] = newData;
					} else {
						newData = data_parser.encodeValue(
							key,
							deviceInfo[key],
							dt
						);
						self.responses[key] = newData;
					}
				} else {
					// console.log('in innerConfigureMockDevice, key:', key, deviceInfo[key]);
				}
			}
		});
		var i = 0;
		// Add various analog input register defaults:
		var ainRegistersToAdd = [
			{'header': 'AIN', 'footer':'_RANGE', 'val': 10},
			{'header': 'AIN', 'footer':'_NEGATIVE_CH', 'val': 199},
		];
		self.responses.AIN_ALL_RANGE = 10;
		self.responses.AIN_ALL_NEGATIVE_CH = 199;
		// Add AIN#(0:254)_RANGE & AIN#(0:254)_NEGATIVE_CH
		var addAinRegister = function(reg) {
			var key = reg.header;
			key += (i*2).toString();
			key += reg.footer;
			self.responses[key] = reg.val;
		};
		for(i = 0; i < 254/2; i++) {
			ainRegistersToAdd.forEach(addAinRegister);
		}
	};
	this.configureMockDeviceSync = function(deviceInfo) {
		try {
			innerConfigureMockDevice(deviceInfo);
		} catch(err) {
			console.error('error configuring mock device', err);
		}
	};
	this.configureMockDevice = function(deviceInfo) {
		var defered = q.defer();
		try {
			innerConfigureMockDevice(deviceInfo);
		} catch(err) {
			console.error('error configuring mock device', err);
		}
		defered.resolve();
		return defered.promise;
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
		if(self.calledFunctions.length > 100) {
			self.calledFunctions.shift();
		}
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

		setImmediate(function() {
			defered.resolve(data);
		});
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
		var ipAddr = NO_IP_ADDRESS;
		var port = 0;
		var isIP;

		if(self.devAttr.ip) {
			// Do stuff...
			if((conTNum == 3) || (conTNum == 4)) {
				port = 502;
				ipAddr = self.devAttr.ip;
			} else {
				ipAddr = NO_IP_ADDRESS;
			}
		} else {
			isIP = identifier.split('.').length === 3;
			if((conTNum == 3) || (conTNum == 4)) {
				port = 502;
				if(isIP) {
					ipAddr = identifier;
				} else {
					ipAddr = FAKE_IP_ADDRESS;
				}
			} else {
				ipAddr = NO_IP_ADDRESS;
			}
		}
		
		var maxBytesPerMB = 64;
		if(conTNum == 3) { // Ethernet
			maxBytesPerMB = 1040;
		} else if(conTNum == 4) { // WiFi
			maxBytesPerMB = 500;
		}
		// Assign a serial number?
		var serialNum = TEST_SERIAL_NUMBER;
		if(self.devAttr.serialNumber) {
			serialNum = self.devAttr.serialNumber;
		} else {
			if(!isIP) {
				if(!isNaN(identifier)) {
					serialNum = parseInt(identifier, 10);
				} else {
					serialNum = TEST_SERIAL_NUMBER;
				}
			} else {
				serialNum = TEST_SERIAL_NUMBER;
			}
		}
		
		self.devAttr.deviceType = devTNum;
		self.devAttr.connectionType = conTNum;
		self.devAttr.serialNumber = serialNum;
		self.devAttr.ip = ipAddr;
		self.devAttr.ipAddress = ipAddr;
		self.devAttr.port = port;
		self.devAttr.maxBytesPerMB = maxBytesPerMB;

		// Finish:
		finishCall('open').then(onSucc, onErr);
	};

	this.getHandleInfo = function(onErr, onSucc) {
		saveCall('getHandleInfo', arguments);
		finishCall('getHandleInfo', self.devAttr).then(onSucc, onErr);
	};
	
	this.readRaw = function(data, onErr, onSucc) {
		saveCall('readRaw', arguments);
		var aData;
		if(semver.gt(process.version, '8.0.0')) {
            aData = Buffer.alloc(data.length);
        } else {
            aData = new Buffer(data.length);
        }
		aData.fill(0);
		finishCall('readRaw', aData).then(onSucc, onErr);
	};

	var getChannelNum = new RegExp("[0-9]{1,}");
	var isAnalogInput = new RegExp("^AIN[0-9]{1,}$");
	this.getResult = function(address) {
		var result = 0;
		// get the default value for the requested address
		var errorData = data_parser.parseError(address, 1);
		result = errorData.defaultValue.res;

		if(typeof(self.responses[address]) !== 'undefined') {
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
	this.saveWrite = function(address, value) {
		var result = 0;
		if(self.responses[address]) {
			if(typeof(self.responses[address]) === 'function') {
				// self.responses[address](address);
			} else {
				self.responses[address] = value;
			}
		} else {
			self.responses[address] = value;
		}
		return value;
	};
	this.read = function(address, onErr, onSucc) {
		saveCall('read', arguments);
		var result = self.getResult(address);
		finishCall('read', result).then(onSucc, onErr);
	};
	this.readArray = function(address, numReads, onErr, onSucc) {
		saveCall('readArray', arguments);
		var retArray = [];
		for(var i = 0; i < numReads; i++) {
			retArray.push(0);
		}
		finishCall('readArray', retArray).then(onSucc, onErr);
	};

	this.readMany = function(addresses, onErr, onSucc) {
		saveCall('readMany', arguments);
		var results = [];
		addresses.forEach(function(address) {
			results.push(self.getResult(address));
		});
		finishCall('readMany', results).then(onSucc, onErr);
	};

	this.writeRaw = function(data, onErr, onSucc) {
		saveCall('writeRaw', arguments);
		var result = 0;
		finishCall('writeRaw', result).then(onSucc, onErr);
	};

	this.write = function(address, value, onErr, onSucc) {
		saveCall('write', arguments);
		var result = self.saveWrite(address, value);
		finishCall('write', result).then(onSucc, onErr);
	};

	this.writeArray = function(address, writeData, onErr, onSucc) {
		saveCall('writeArray', arguments);
		var result = 0;
		finishCall('writeArray', result).then(onSucc, onErr);
	};

	this.writeMany = function(addresses, values, onErr, onSucc) {
		saveCall('writeMany', arguments);
		addresses.forEach(function(address, i) {
			self.saveWrite(address, values[i]);
		});
		var result = 0;
		finishCall('writeMany', result).then(onSucc, onErr);
	};

	this.rwMany = function(addresses, directions, numValues, values, onErr, onSucc) {
		// saveCall('rwMany', arguments);
		var result = 0;
		// finishCall('rwMany', result).then(onSucc, onErr);
		if(typeof(setImmediate) !== 'undefined') {
			setImmediate(onSucc);
			// setTimeout(onSucc);
		} else {
			setTimeout(onSucc);
		}
	};

	this.readUINT64 = function(type, onErr, onSucc) {
		saveCall('readUINT64', arguments);
		var result = '00:00:00:00:00:00';
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
		self.devAttr = {};
		var result = 0;
		finishCall('close', result).then(onSucc, onErr);
	};


	var self = this;
}

exports.device = device;