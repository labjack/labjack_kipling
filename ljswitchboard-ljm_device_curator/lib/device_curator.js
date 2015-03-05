
var EventEmitter = require('events').EventEmitter;
var util = require('util');
var q = require('q');
var async = require('async');

var data_parser = require('ljswitchboard-data_parser');

// Requires & definitions involving the labjack-nodejs library
var ljm = require('labjack-nodejs');
var ljmDeviceReference = ljm.getDevice();
var modbusMap = ljm.modbusMap.getConstants();
var driver_const = ljm.driver_const;

var lj_t7_upgrader = require('./labjack_t7_upgrade');
var lj_t7_flash_operations = require('./t7_flash_operations');
lj_t7_flash_operations.setDriverConst(ljm.driver_const);
var lj_t7_get_recovery_fw_version = require('./t7_get_recovery_fw_version');

var lj_t7_cal_operations = require('./t7_calibration_operations');

var device_events = driver_const.device_curator_constants;

var DEVICE_DISCONNECTED = device_events.DEVICE_DISCONNECTED;
var DEVICE_RECONNECTED = device_events.DEVICE_RECONNECTED;



// Break out various buffer constants to make them easier to use
// for buffer manipulation.
var ARCH_INT_NUM_BYTES = driver_const.ARCH_INT_NUM_BYTES;
var ARCH_DOUBLE_NUM_BYTES = driver_const.ARCH_DOUBLE_NUM_BYTES;
var ARCH_POINTER_SIZE = driver_const.ARCH_POINTER_SIZE;

var ljmMockDevice;
var use_mock_device = true;

function device(useMockDevice) {
	var ljmDevice;
	this.isMockDevice = false;
	this.allowReconnectManager = false;

	if(useMockDevice) {
		ljmMockDevice = require('./mocks/device_mock');
		ljmDevice = new ljmMockDevice.device();
		this.isMockDevice = true;
	} else {
		ljmDevice = new ljmDeviceReference();
	}

	this.configureMockDevice = function(deviceInfo) {
		var defered = q.defer();
		if(self.isMockDevice) {
			ljmDevice.configureMockDevice(deviceInfo)
			.then(defered.resolve);
		} else {
			defered.resolve();
		}
		return defered.promise;
	};
	this.getDevice = function() {
		return ljmDevice;
	};

	var allowExecution = function() {
		var res = true;
		if(self.allowReconnectManager) {
			if(self.savedAttributes) {
				if(!self.savedAttributes.isConnected) {
					res = false;
				}
			}
		}
		return res;
	};

	var refreshDeviceConnectionStatus = function() {
		var refreshDefered = q.defer();
		ljmDevice.read(
			'PRODUCT_ID',
			function(err) {
				captureDeviceError('read', err);
				refreshDefered.reject(err);
			},
			refreshDefered.resolve
		);
		return refreshDefered.promise;
	};
	var reconnectManager = function() {
		if(self.allowReconnectManager) {
			if(!self.savedAttributes.isConnected) {
				refreshDeviceConnectionStatus()
				.then(
					function() {
						self.savedAttributes.isConnected = true;
						self.emit(DEVICE_RECONNECTED, self.savedAttributes);
					}, function() {
						setTimeout(reconnectManager, 1000);
					});
			}
		}
	};

	var captureDeviceError = function(funcName, err) {
		// console.log('device_curator error detected', funcName, err);
		var errCode;
		if(isNaN(err)) {
			errCode = err.retError;
		} else {
			errCode = err;
		}

		if(errCode === 1239) {
			if(self.savedAttributes.isConnected) {
				console.log('  - device_curator: Device Disconnected');
				self.savedAttributes.isConnected = false;
				self.emit(DEVICE_DISCONNECTED, self.savedAttributes);
				setImmediate(reconnectManager);
			}
		}
	};

	this.savedAttributes = {};

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
	var getVersionNumberParser = function(reg) {
		var parser = function(res, isErr, errData) {
			var dt = self.savedAttributes.deviceType;
			return data_parser.parseResult(reg, res, dt).val;
		};
		return parser;
	};

	var customAttributes = {
		'BOOTLOADER_VERSION': getVersionNumberParser('BOOTLOADER_VERSION'),
		'DEVICE_NAME_DEFAULT': null,
		'FIRMWARE_VERSION': getVersionNumberParser('FIRMWARE_VERSION'),
	};
	var deviceCustomAttributes = {
		'7': {
			'WIFI_VERSION': getVersionNumberParser('WIFI_VERSION'),
			'HARDWARE_INSTALLED': function(res, isErr, errData) {
				var retResult = {};
				var dt = self.savedAttributes.deviceType;
				var parsedResult = data_parser.parseResult('HARDWARE_INSTALLED', res, dt);

				// Save results
				var parsedResultKeys = Object.keys(parsedResult);
				parsedResultKeys.forEach(function(key) {
					retResult[key] = parsedResult[key];
				});
				// Save results
				// retResult.highResADC = parsedResult.highResADC;
				// retResult.wifi = parsedResult.wifi;
				// retResult.rtc = parsedResult.rtc;
				// retResult.sdCard = parsedResult.sdCard;

				self.savedAttributes.subclass = parsedResult.subclass;
				self.savedAttributes.isPro = parsedResult.isPro;
				self.savedAttributes.productType = parsedResult.productType;

				return retResult;
			},
		},
		'200': {
			'DGT_INSTALLED_OPTIONS': function(res, isErr, errData) {
				self.savedAttributes.subclass = '';
				if(res === 2) {
					self.savedAttributes.subclass = '-TL';
					
				} else if (res === 3) {
					self.savedAttributes.subclass = '-TLH';
				}
				var dc = self.savedAttributes.deviceClass;
				var sc = self.savedAttributes.subclass;
				self.savedAttributes.productType = dc + sc;
			},
			'DGT_BATTERY_INSTALL_DATE':null
		}
	};
	var saveCustomAttributes = function(addresses, dt, formatters) {
		var defered = q.defer();

		self.readMultiple(addresses)
		.then(function(results) {
			results.forEach(function(res) {
				var hasFormatter = false;
				if(formatters[res.address]) {
					hasFormatter = true;
				}
				var info = modbusMap.getAddressInfo(res.address);
				// to get IF-STRING, info.typeString
				if(hasFormatter) {
					var output;
					if(res.isErr) {
						var argA;
						if(info.typeString === 'STRING') {
							argA = '';
						} else {
							argA = 0;
						}
						output = formatters[res.address](argA, res.isErr, res.data);
					} else {
						output = formatters[res.address](res.data, res.isErr);
					}
					self.savedAttributes[res.address] = output;
				} else {
					if(res.isErr) {
						if(info.typeString === 'STRING') {
							self.savedAttributes[res.address] = '';
						} else {
							self.savedAttributes[res.address] = 0;
						}
					} else {
						self.savedAttributes[res.address] = res.data;
					}
				}
			});
			defered.resolve(self.savedAttributes);
		}, function(err) {
			defered.resolve(self.savedAttributes);
		});
		return defered.promise;
	};
	var saveAndLoadAttributes = function(openParameters) {
		var saveAndLoad = function() {
			var defered = q.defer();
			self.savedAttributes = {};
			self.savedAttributes.isMockDevice = self.isMockDevice;
			self.savedAttributes.isConnected = true;
			this.allowReconnectManager = false;

			self.getHandleInfo()
			.then(function(info) {
				var infoKeys = Object.keys(info);
				infoKeys.forEach(function(key) {
					self.savedAttributes[key] = info[key];
				});
				self.savedAttributes.openParameters = openParameters;

				var dt = self.savedAttributes.deviceType;
				var ct = self.savedAttributes.connectionType;
				var dts = driver_const.DRIVER_DEVICE_TYPE_NAMES[dt];
				var deviceClass = driver_const.DEVICE_TYPE_NAMES[dt];
				var cts = driver_const.DRIVER_CONNECTION_TYPE_NAMES[ct];
				var connectionTypeName = driver_const.CONNECTION_TYPE_NAMES[ct];
				self.savedAttributes.deviceTypeString = dts;
				self.savedAttributes.deviceClass = deviceClass;
				self.savedAttributes.connectionTypeString = cts;
				self.savedAttributes.connectionTypeName = connectionTypeName;


				var ids = null;
				if(cts === 'LJM_ctUSB') {
					ids = self.savedAttributes.serialNumber.toString();
				} else {
					ids = self.savedAttributes.ipAddress;
				}
				self.savedAttributes.identifierString = ids;

				// Get and save device specific attributes
				var otherAttributeKeys = [];
				var customAttributeKeys = Object.keys(customAttributes);
				var devCustKeys;
				var formatters = {};
				customAttributeKeys.forEach(function(key) {
					formatters[key] = customAttributes[key];
				});
				if(deviceCustomAttributes[dt]) {
					devCustKeys = Object.keys(deviceCustomAttributes[dt]);
					otherAttributeKeys = customAttributeKeys.concat(devCustKeys);
					devCustKeys.forEach(function(key) {
						formatters[key] = deviceCustomAttributes[dt][key];
					});
				}
				saveCustomAttributes(otherAttributeKeys, dt, formatters)
				.then(defered.resolve);
			}, defered.reject);
			return defered.promise;
		};
		return saveAndLoad;
	};
	var getAndSaveCalibration = function(bundle) {
		var defered = q.defer();

		self.getCalibrationStatus()
		.then(function(res) {
			self.savedAttributes.calibrationStatus = res;
			defered.resolve(self.savedAttributes);
		}, function(err) {
			console.error('failed to get Calibration', res);
			self.savedAttributes.calibrationStatus = err;
			defered.resolve(self.savedAttributes);
		});
		return defered.promise;
	};
	var finalizeOpenProcedure = function(bundle) {
		var defered = q.defer();
		self.allowReconnectManager = true;
		defered.resolve(bundle);
		return defered.promise;
	};
	this.open = function(deviceType, connectionType, identifier) {
		var defered = q.defer();
		var getOnError = function(msg) {
			return function(err) {
				var innerDefered = q.defer();
				// console.log("device_curator.js - Open Failed", err);
				innerDefered.reject(err);
				return innerDefered.promise;
			};
		};
		var openParameters = {
			'deviceType': deviceType,
			'connectionType': connectionType,
			'identifier': identifier
		};

		privateOpen(openParameters)
		.then(saveAndLoadAttributes(openParameters), getOnError('openStep'))
		.then(getAndSaveCalibration, getOnError('saveAndLoadAttrs'))
		.then(finalizeOpenProcedure, getOnError('getAndSaveCalibration'))
		.then(defered.resolve, defered.reject);
		return defered.promise;
	};
	this.simpleOpen = function(deviceType, connectionType, identifier) {
		var defered = q.defer();
		var getOnError = function(msg) {
			return function(err) {
				var innerDefered = q.defer();
				// console.log("device_curator.js - Open Failed", err);
				innerDefered.reject(err);
				return innerDefered.promise;
			};
		};
		var openParameters = {
			'deviceType': deviceType,
			'connectionType': connectionType,
			'identifier': identifier
		};

		privateOpen(openParameters)
		.then(saveAndLoadAttributes(openParameters), getOnError('openStep'))
		.then(finalizeOpenProcedure, getOnError('saveAndLoadAttrs'))
		.then(defered.resolve, defered.reject);
		return defered.promise;
	};
	this.getHandleInfo = function() {
		var defered = q.defer();
		if(allowExecution()) {
			ljmDevice.getHandleInfo(
			function(err) {
				captureDeviceError('getHandleInfo', err);
				defered.reject(err);
			}, defered.resolve);
		} else {
			setImmediate(function() {
				defered.reject(driver_const.LJN_DEVICE_NOT_CONNECTED);
			});
		}
		
		return defered.promise;
	};
	this.getDeviceAttributes = function() {
		var defered = q.defer();
		defered.resolve(self.savedAttributes);
		return defered.promise;
	};
	this.readRaw = function(data) {
		var defered = q.defer();
		if(allowExecution()) {
			ljmDevice.readRaw(
				data,
				function(err) {
					captureDeviceError('readRaw', err);
					defered.reject(err);
				},
				defered.resolve
			);
		} else {
			setImmediate(function() {
				defered.reject(driver_const.LJN_DEVICE_NOT_CONNECTED);
			});
		}
		return defered.promise;
	};
	this.read = function(address) {
		var defered = q.defer();
		if(allowExecution()) {
			ljmDevice.read(
				address,
				function(err) {
					captureDeviceError('read', err);
					defered.reject(err);
				},
				defered.resolve
			);
		} else {
			setImmediate(function() {
				defered.reject(driver_const.LJN_DEVICE_NOT_CONNECTED);
			});
		}
		return defered.promise;
	};
	/**
	 * Performs several single reads to get individual error codes.
	**/
	this.readMultiple = function(addresses) {
		var defered = q.defer();
		var results = [];
		var performRead = function(address, callback) {
			self.qRead(address)
			.then(function(res) {
				results.push({'address': address, 'isErr': false, 'data': res});
				callback();
			}, function(err) {
				results.push({'address': address, 'isErr': true, 'data': err});
				callback();
			});
		};
		var finishRead = function(err) {
			defered.resolve(results);
		};
		async.each(
			addresses,
			performRead,
			finishRead
		);
		return defered.promise;
	};

	/**
	 * Performs several reads in a single packet.
	**/
	this.readMany = function(addresses) {
		var defered = q.defer();
		if(allowExecution()) {
			ljmDevice.readMany(
				addresses,
				function(err) {
					captureDeviceError('readMany', err);
					defered.reject(err);
				},
				defered.resolve
			);
		} else {
			setImmediate(function() {
				defered.reject({
					retError:driver_const.LJN_DEVICE_NOT_CONNECTED,
					errFrame:0}
				);
			});
		}
		return defered.promise;
	};
	this.writeRaw = function(data) {
		var defered = q.defer();
		if(allowExecution()) {
			ljmDevice.writeRaw(
				data,
				function(err) {
					captureDeviceError('writeRaw', err);
					defered.reject(err);
				},
				defered.resolve
			);
		} else {
			setImmediate(function() {
				defered.reject(driver_const.LJN_DEVICE_NOT_CONNECTED);
			});
		}
		return defered.promise;
	};
	this.write = function(address, value) {
		var defered = q.defer();
		if(allowExecution()) {
			ljmDevice.write(
				address,
				value,
				function(err) {
					captureDeviceError('write', err);
					defered.reject(err);
				},
				defered.resolve
			);
		} else {
			setImmediate(function() {
				defered.reject(driver_const.LJN_DEVICE_NOT_CONNECTED);
			});
		}
		return defered.promise;
	};
	this.writeMany = function(addresses, values) {
		var defered = q.defer();
		if(allowExecution()) {
		ljmDevice.writeMany(
			addresses,
			values,
			function(err) {
				captureDeviceError('writeMany', err);
				defered.reject(err);
			},
			defered.resolve
		);
		} else {
			setImmediate(function() {
				defered.reject({
					retError:driver_const.LJN_DEVICE_NOT_CONNECTED,
					errFrame:0}
				);
			});
		}
		return defered.promise;
	};
	/**
	 * Performs several single reads to get individual error codes.
	**/
	this.writeMultiple = function(addresses, values) {
		var defered = q.defer();
		var write = [];
		var i;
		for(i = 0; i < addresses.length; i ++) {
			write.push({'address': addresses[i],'val':values[i]});
		}
		var results = [];
		var performWrite = function(writeData, callback) {
			self.qWrite(writeData.address,writeData.val)
			.then(function(res) {
				results.push({'address': writeData.address, 'isErr': false, 'data': res});
				callback();
			}, function(err) {
				results.push({'address': writeData.address, 'isErr': true, 'data': err});
				callback();
			});
		};
		var finishWrite = function(err) {
			defered.resolve(results);
		};
		async.each(
			write,
			performWrite,
			finishWrite
		);
		return defered.promise;
	};
	this.rwMany = function(addresses, directions, numValues, values) {
		var defered = q.defer();
		ljmDevice.rwMany(
			addresses,
			directions,
			numValues,
			values,
			function(err) {
				captureDeviceError('rwMany', err);
				defered.reject(err);
			},
			defered.resolve
		);
		return defered.promise;
	};
	this.readUINT64 = function(type) {
		var defered = q.defer();
		if(allowExecution()) {
			ljmDevice.readUINT64(
				type,
				function(err) {
					captureDeviceError('readUINT64', err);
					defered.reject(err);
				},
				defered.resolve
			);
		} else {
			setImmediate(function() {
				defered.reject(driver_const.LJN_DEVICE_NOT_CONNECTED);
			});
		}
		return defered.promise;
	};
	this.streamStart = function(scansPerRead, scanList, scanRate) {
		var defered = q.defer();
		if(allowExecution()) {
			ljmDevice.streamStart(
				scansPerRead,
				scanList,
				scanRate,
				function(err) {
					captureDeviceError('streamStart', err);
					defered.reject(err);
				},
				defered.resolve
			);
		} else {
			setImmediate(function() {
				defered.reject(driver_const.LJN_DEVICE_NOT_CONNECTED);
			});
		}
		return defered.promise;
	};
	/**
	 * The goal of this function is to transpose & pull out information, and 
	 * calculate a timestamp for each stream data point given that the buffer
	 * object that gets populated by the streamRead function as "rawData"
	 * in the format:
	 *     [x1, y1, x2, y2, ... ]
	 * to:
	 *     [[timeStamp, x1, y1], [timeStamp, x2, y2], ... ]
	 * and save that new javascript object to the data object as "data".
	 * 
	 * This format was chosen because the created "data_buffer.js" file in 
	 * Kipling and the "flot" graphing program prefer data to be organized in
	 * similar ways to this.  It also cut down on the number of loops required
	 * to parse the data into one full pass-through of the data.
	**/
	var parseStreamData = function(data) {
		var defered = q.defer();
		
		var numValues = data.numVals;
		var numAddresses = data.numAddresses;
		var numResults = data.scansPerRead;

		data.data = [];
		data.autoRecoveryDetected = false;
		var i, j = 0;

		// Initialize variables to build a timestamp.
		var time = data.time;
		var timeIncrement = data.timeIncrement;

		// Initialize variables to control a data pointer.
		var pointerIncrement = ARCH_DOUBLE_NUM_BYTES;
		var pointer = 0;

		// Read and save data from the strea data (dta.rawData) buffer object.
		for (i = 0; i < numResults; i++) {
			var dataStore = [];
			dataStore.push(time);
			time += timeIncrement;
			for (j = 0; j < numAddresses; j++) {
				var val = data.rawData.readDoubleLE(pointer);
				if(val == -9999) {
					data.autoRecoveryDetected = true;
				}
				dataStore.push(val);
				pointer += pointerIncrement;
			}
			data.data.push(dataStore);
		}
		data.rawData = null;
		delete data.rawData;

		defered.resolve(data);
		return defered.promise;
	};
	this.streamRead = function() {
		var defered = q.defer();
		if(allowExecution()) {
			ljmDevice.streamRead(
				function(err) {
					captureDeviceError('streamRead', err);
					defered.reject(err);
				},
				function(data) {
					try {
						parseStreamData(data)
						.then(defered.resolve, defered.reject);
					} catch(err) {
						defered.reject('Error parsing stream data');
					}
				}
			);
		} else {
			setImmediate(function() {
				defered.reject(driver_const.LJN_DEVICE_NOT_CONNECTED);
			});
		}
		return defered.promise;
	};
	this.streamReadRaw = function() {
		var defered = q.defer();
		if(allowExecution()) {
			ljmDevice.streamRead(
				function(err) {
					captureDeviceError('streamReadRaw', err);
					defered.reject(err);
				},
				defered.resolve
			);
		} else {
			setImmediate(function() {
				defered.reject(driver_const.LJN_DEVICE_NOT_CONNECTED);
			});
		}
		return defered.promise;
	};
	this.streamStop = function() {
		var defered = q.defer();
		if(allowExecution()) {
			ljmDevice.streamStop(
				function(err) {
					captureDeviceError('streamStop', err);
					defered.reject(err);
				},
				defered.resolve
			);
		} else {
			setImmediate(function() {
				defered.reject(driver_const.LJN_DEVICE_NOT_CONNECTED);
			});
		}
		return defered.promise;
	};
	this.close = function() {
		var defered = q.defer();
		ljmDevice.close(
			function(err) {
				self.allowReconnectManager = false;
				defered.reject(err);
			}, function(res) {
				self.allowReconnectManager = false;
				defered.resolve(res);
			}
		);
		return defered.promise;
	};

	/**
	 * Begin _DEFAULT safe and _DEFAULT status-saving functions
	**/
	var unsavedDefaults = {};

	this.getUnsavedDefaults = function() {
		var defered = q.defer();
		defered.resolve(unsavedDefaults);
		return defered.promise;
	};
	
	this.clearUnsavedDefaults = function() {
		var defered = q.defer();
		unsavedDefaults = {};
		defered.resolve();
		return defered.promise;
	};

	var checkSingleAddressForDefaults = function(address, val) {
		try {
			var addr = modbusMap.getAddressInfo(address).data.name;
			if(addr.indexOf('_DEFAULT') >= 0) {
				unsavedDefaults[addr] = val;
			}
		} catch(err) {
			console.error('Dev_curator checkSingleAddressForDefaults', err);
		}
	};

	var checkManyAddressesForDefaults = function(addresses, values) {
		try {
			var i;
			var numAddresses = addresses.length;
			var addr;
			var searchTerm = '_DEFAULT';
			for(i = 0; i < numAddresses; i ++) {
				addr = modbusMap.getAddressInfo(addresses[i]).data.name;
				if(addr.indexOf(searchTerm) >= 0) {
					unsavedDefaults[addr] = values[i];
				}
			}
		} catch(err) {
			console.error('Dev_curator checkMultipleAddressesForDefaults', err);
		}
	};
	var checkRWManyForDefaults = function(addresses, directions, numValues, values) {
		try {
			var i;
			var numAddresses = addresses.length;
			var addr;
			var searchTerm = '_DEFAULT';
			var valOffset = 0;
			for(i = 0; i < numAddresses; i ++) {
				if(directions[i] == driver_const.LJM_WRITE) {
					addr = modbusMap.getAddressInfo(addresses[i]).data.name;
					if(addr.indexOf(searchTerm) >= 0) {
						unsavedDefaults[addr] = values[valOffset];
					}
				}
				valOffset += numValues[i];
			}
		} catch(err) {
			console.error('Dev_curator checkRWManyForDefaults', err);
		}
	};

	/*
	Intelligent Read/Write Functions.  These functions have automatic parsing/
	encoding/caching additions and all use the q functions for stability & 
	reliability.
	*/
	this.iRead = function(address) {
		var defered = q.defer();
		self.qRead(address)
		.then(function(res) {
			defered.resolve(data_parser.parseResult(address, res));
		}, function(err) {
			defered.reject(err);
		});
		return defered.promise;
	};
	this.iReadMany = function(addresses) {
		var defered = q.defer();
		self.qReadMany(addresses)
		.then(function(res) {
			// defered.resolve(data_parser.parseResult(address, res));
			var results = data_parser.parseResults(
				addresses,
				res,
				self.savedAttributes.deviceType
			);
			defered.resolve(results);
		}, function(err) {
			defered.reject(err);
		});
		return defered.promise;
	};
	this.iReadMultiple = function(addresses) {
		var defered = q.defer();
		self.readMultiple(addresses)
		.then(function(results) {
			// defered.resolve(data_parser.parseResult(address, res));
			var i;
			for(i = 0; i < results.length; i ++) {
				if(!results[i].isErr) {
					results[i].data = data_parser.parseResult(
						results[i].address,
						results[i].data,
						self.savedAttributes.deviceType
					);
				}
			}
			defered.resolve(results);
		}, function(err) {
			defered.reject(err);
		});
		return defered.promise;
	};

	this.qRead = function(address) {
		return self.retryFlashError('qRead', address);
	};
	this.qReadMany = function(addresses) {
		return self.retryFlashError('qReadMany', addresses);
	};
	this.qWrite = function(address, value) {
		checkSingleAddressForDefaults(address, value);
		return self.retryFlashError('qWrite', address, value);
	};
	this.qWriteMany = function(addresses, values) {
		checkManyAddressesForDefaults(addresses, values);
		return self.retryFlashError('qWriteMany', addresses, values);
	};
	this.qrwMany = function(addresses, directions, numValues, values) {
		checkRWManyForDefaults(addresses, directions, numValues, values);
		return self.retryFlashError('qrwMany', addresses, directions, numValues, values);
	};
	this.qReadUINT64 = function(type) {
		return self.retryFlashError('qReadUINT64', type);
	};
	this.retryFlashError = function(cmdType, arg0, arg1, arg2, arg3, arg4) {
		var rqControlDeferred = q.defer();
		var device = self;
		var numRetries = 0;
		var ioNumRetry = 50;
		var ioDelay = 100;

		// Associate functions to the functions that should be re-tried
		// on flash error.
		var type={
			'qRead':'read',
			'qReadMany':'readMany',
			'qWrite':'write',
			'qWriteMany':'writeMany',
			'qrwMany':'rwMany',
			'qReadUINT64':'readUINT64',
			'readFlash':'internalReadFlash',
			// 'updateFirmware': 'internalUpdateFirmware'
		}[cmdType];
		var errType = {
			'qRead': 'value',
			'qReadMany': 'object',
			'qWrite':'value',
			'qWriteMany':'object',
			'qrwMany':'object',
			'qReadUINT64':'value',
			'readFlash':'value',
			// 'updateFirmware': 'value'
		}[cmdType];
		var supportedFunctions = [
			'qRead',
			'qReadMany',
			'qWrite',
			'qWriteMany',
			'qrwMany',
			'qReadUINT64',
			'readFlash',
			// 'updateFirmware'
		];
		var control = function() {
			// console.log('in dRead.read');
			var ioDeferred = q.defer();
			device[type](arg0,arg1,arg2,arg3)
			.then(function(result){
				// console.log('Read Succeded',result);
				ioDeferred.resolve({isErr: false, val:result});
			}, function(err) {
				// console.log('Read Failed',err);
				ioDeferred.reject({isErr: true, val:err});
			});
			return ioDeferred.promise;
		};
		var delayAndRead = function() {
			var iotimerDeferred = q.defer();
			var innerControl = function() {
				// console.log('in dRead.read');
				var innerIODeferred = q.defer();
				device[type](arg0,arg1,arg2,arg3)
				.then(function(result){
					// console.log('Read Succeded',result);
					innerIODeferred.resolve({isErr: false, val:result});
				}, function(err) {
					// console.log('Read Failed',err);
					innerIODeferred.reject({isErr: true, val:err});
				});
				return innerIODeferred.promise;
			};
			var qDelayErr = function() {
				var eTimerDeferred = q.defer();
				eTimerDeferred.resolve('read-timeout occured');
				return eTimerDeferred.promise;
			};
			var qDelay = function() {
				// console.log('in dRead.qDelay');
				var timerDeferred = q.defer();
				if(numRetries < ioNumRetry) {
					// console.log('Re-trying');
					setTimeout(timerDeferred.resolve,1000);
				} else {
					timerDeferred.reject();
				}
				return timerDeferred.promise;
			};
			// console.log('in delayAndRead');
			if(arg4) {
				console.log('Attempting to Recover from 2358 Error');
				console.log('Function Arguments',type,arg0,arg1,arg2,arg3);
			}
			qDelay()
			.then(innerControl,qDelayErr)
			.then(function(res){
				if(!res.isErr) {
					iotimerDeferred.resolve(res.val);
				} else {
					iotimerDeferred.reject(res.val);
				}
			},delayAndRead)
			.then(iotimerDeferred.resolve,iotimerDeferred.reject);
			return iotimerDeferred.promise;
		};


		if(supportedFunctions.indexOf(cmdType) >= 0) {
			control()
			.then(function(res) {
				// success case for calling function
				rqControlDeferred.resolve(res.val);
			},function(res) {
				// console.log('in retryFlashError', errType, res, cmdType, arg0, arg1)
				// error case for calling function
				var innerDeferred = q.defer();
				if(errType === 'value') {
					if(res.val == 2358) {
						delayAndRead()
						.then(innerDeferred.resolve,innerDeferred.reject);
					} else {
						innerDeferred.reject(res.val);
					}
				} else if(errType === 'object') {
					if(res.val.retError == 2358) {
						delayAndRead()
						.then(innerDeferred.resolve,innerDeferred.reject);
					} else {
						innerDeferred.reject(res.val);
					}
				}
				return innerDeferred.promise;
			})
			.then(function(res) {
				// console.log('Read-Really-Finished',arg0,res);
				rqControlDeferred.resolve(res);
			},function(err) {
				// console.error('DC rqControl',err);
				rqControlDeferred.reject(err);
			});
		} else {
			console.log(cmdType,type,supportedFunctions.indexOf(type));
			throw 'device_controller.rqControl Error!';
		}
		return rqControlDeferred.promise;
	};

	/**
	 * Begin T7 specific functions:
	**/
	var UpgradeProgressListener = function (percentListener, stepListener) {
		this.previousPercent = 0;
		// Function gets updated and has a percentage value.
		this.updatePercentage = function (value, callback) {
			var newVal = Math.floor(parseFloat(value.toFixed(1)));
			if(newVal !== upgradeProgressListener.previousPercent) {
				if (callback !== undefined) {
					percentListener(newVal)
					.then(callback);
				}
				upgradeProgressListener.previousPercent = newVal;
			}
		};

		// Function gets updated during various steps of the update procedure.
		// Text: 1. "", "", ""
		this.updateStepName = function (value, callback) {
			if (callback !== undefined) {
				stepListener(value)
				.then(callback);
			}
		};
		var upgradeProgressListener = this;
	};
	var getDeviceTypeMessage = function(dt) {
		return "Function not supported for deviceType: " + dt.toString();
	};
	this.updateFirmware = function(firmwareFileLocation, percentListener, stepListener) {
		// TODO: Not using retryFlashError for updater atm.  Need to handle errors better.
		// return self.retryFlashError('updateFirmware', firmwareFileLocation, percentListener, stepListener);
		return self.internalUpdateFirmware(firmwareFileLocation, percentListener, stepListener);
	};
	this.internalUpdateFirmware = function(firmwareFileLocation, percentListener, stepListener) {
		var dt = self.savedAttributes.deviceType;
		var percentListenerObj;
		var stepListenerObj;
		var defaultListener = function(value) {
			var defered = q.defer();
			defered.resolve();
			return defered.promise;
		};
		if(percentListener) {
			percentListenerObj = percentListener;
		} else {
			percentListenerObj = defaultListener;
		}
		if(stepListener) {
			stepListenerObj = stepListener;
		} else {
			stepListenerObj = defaultListener;
		}
		var defered = q.defer();
		if(dt === 7) {
			var progressListener = new UpgradeProgressListener(
				percentListenerObj,
				stepListenerObj
			);
			lj_t7_upgrader.updateFirmware(
				self,
				ljmDevice,
				firmwareFileLocation,
				self.savedAttributes.connectionTypeString,
				progressListener
			).then(function(results){
				var resultDevice = results.getDevice();
				ljmDevice.handle = resultDevice.handle;
				ljmDevice.deviceType = resultDevice.deviceType;
				ljmDevice.isHandleValid = resultDevice.isHandleValid;
				defered.resolve(results);
			}, function(err) {
				defered.reject(err);
			});
		} else {
			defered.reject(getDeviceTypeMessage(dt));
		}
		return defered.promise;
	};
	this.readFlash = function(startAddress, length) {
		return self.retryFlashError('readFlash', startAddress, length);
	};
	this.internalReadFlash = function(startAddress, length) {
		var dt = self.savedAttributes.deviceType;
		if(dt === driver_const.LJM_DT_T7) {
			return lj_t7_flash_operations.readFlash(ljmDevice, startAddress, length);
		} else if(dt === driver_const.LJM_DT_DIGIT) {
			var digitDefered = q.defer();
			digitDefered.resolve();
			return digitDefered.promise;
		} else {
			var defered = q.defer();
			defered.resolve();
			return defered.promise;
		}
	};

	this.getRecoveryFirmwareVersion = function() {
		return lj_t7_get_recovery_fw_version.getVersion(self);
	};
	this.getCalibrationStatus = function() {
		var dt = self.savedAttributes.deviceType;
		var defered = q.defer();
		if(self.isMockDevice) {
			defered.resolve({
				'overall': true,
				'flashVerification': true,
				'ainVerification': false
			});
			return defered.promise;
		} else {
			if(dt === 7) {
				return lj_t7_cal_operations.getDeviceCalibrationStatus(self);
			} else {
				defered.resolve({'overall': false});
				return defered.promise;
			}
		}

	};

	/**
	 * Digit Specific functions:
	**/
	this.digitRead = function(address) {
		var dt = self.savedAttributes.deviceType;
		var defered = q.defer();
		if(dt === 200) {
			var calibrateVal = function(res) {
				defered.resolve(res);
			};
			self.read(address)
			.then(calibrateVal, defered.reject);
		} else {
			defered.reject(getDeviceTypeMessage(dt));
		}
		return defered.promise;
	};
	this.readHumidity = function() {
		return self.digitRead('DGT_HUMIDITY_RAW');
	};

	var self = this;
}
util.inherits(device, EventEmitter);

exports.device = device;