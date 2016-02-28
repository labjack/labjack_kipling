var EventEmitter = require('events').EventEmitter;
var util = require('util');

var q = require('q');
var async = require('async');
var device_curator = require('ljswitchboard-ljm_device_curator');
var device_scanner = require('ljswitchboard-device_scanner');

var eventList = {
	loaded: 'LOADED',
	deviceAdded: 'DEVICE_ADDED',
	deviceStatusChanged: 'DEVICE_STATUS_CHANGED',
	deviceRemoved: 'DEVICE_REMOVED',
	deviceListChanged: 'DEVICE_LIST_CHANGED',
	subEvent: 'SUB_EVENT',
};

var curatedDeviceEvents = {
	DEVICE_DISCONNECTED: 'DEVICE_DISCONNECTED',
	DEVICE_RECONNECTED: 'DEVICE_RECONNECTED',
	DEVICE_ERROR: 'DEVICE_ERROR',
	DEVICE_RECONNECTING: 'DEVICE_RECONNECTING',
	DEVICE_ATTRIBUTES_CHANGED: 'DEVICE_ATTRIBUTES_CHANGED',
	DEVICE_INITIALIZING: 'DEVICE_INITIALIZING',
};

var DEBUG_DEVICE_KEEPER = false;
var DEBUG_DEVICE_MANAGER = false;
var DEBUG_DEVICE_MANAGER_EVENTS = false;
var DEBUG_DEVICE_MANAGER_SCANNING = false;
function getDebugLogger(enabled) {
	return function() {
		if(enabled) {
			console.log.apply(console, arguments);
		}
	};
}
var debugLog = {
	dk: getDebugLogger(DEBUG_DEVICE_KEEPER),
	dm: getDebugLogger(DEBUG_DEVICE_MANAGER),
	dme: getDebugLogger(DEBUG_DEVICE_MANAGER_EVENTS),
	dms: getDebugLogger(DEBUG_DEVICE_MANAGER_SCANNING),
};

function DEVICE_KEEPER() {
	this.devices = {};

	function getDeviceKeyInfo(device) {
		 var dt = device.savedAttributes.deviceTypeName;
		 var ct = device.savedAttributes.connectionTypeName;
		 var sn = device.savedAttributes.serialNumber;
		 var ljmHandle = device.savedAttributes.handle;

		return {
			'dt': dt,
			'ct': ct,
			'sn': sn,
			'ljmHandle': ljmHandle,
			'key': [dt, ct, sn, ljmHandle.toString()].join('_'),
		};
	}
	function buildDeviceKey(device) {
		var info = getDeviceKeyInfo(device);
		return info.key;
	}
	function getNumDevices () {
		return Object.keys(self.devices).length;
	}
	function getInfoForConnectedDevices() {
		var info = [];
		var deviceKeys = Object.keys(self.devices);
		deviceKeys.forEach(function(deviceKey) {
			var d = self.devices[deviceKey];
			info.push(getDeviceKeyInfo(d));
		});

		return info;
	}
	this.getManagedDevicesList = getInfoForConnectedDevices;

	/*
	 * Define a function that adds a device to the device keeper.
	 */
	this.insert = function(newDevice) {
		var deviceKey = buildDeviceKey(newDevice);
		var deviceInfo = getDeviceKeyInfo(newDevice);

		debugLog.dk('Inserting Device', deviceInfo);

		self.devices[deviceKey] = newDevice;
		self.emit(eventList.deviceAdded, deviceInfo);
		self.emit(eventList.deviceListChanged, {
			'numDevices': getNumDevices(),
			'connectedDevices': getInfoForConnectedDevices(),
		});
	};

	/*
	 * Define a function that seraches the devices for the specified device.
	 */
	this.getDevice = function(options) {
		var retDevObj;
		var foundDevice = false;
		var deviceKeys = Object.keys(self.devices);
		if(options.ljmHandle) {
			// Get device object by handle.
			var ljmHandle = options.ljmHandle;
			debugLog.dk('Getting device by object handle', ljmHandle);
			foundDevice = deviceKeys.some(function(deviceKey) {
				var device = self.devices[deviceKey];
				if(device.savedAttributes.handle == ljmHandle) {
					retDevObj = device;
					return true;
				} else {
					return false;
				}
			});
		} else {
			var snToCheck = options.serialNumber;
			var dtToCheck = options.deviceType;
			var ctToCheck = options.connectionType;
			debugLog.dk('Getting device by object handle', {
				'dt': dtToCheck,
				'ct': ctToCheck,
				'sn': snToCheck,
			});
			// Get device by attributes.
			foundDevice = deviceKeys.some(function(deviceKey) {
				var correctDevice = true;
				var device = self.devices[deviceKey];
				if(device.savedAttributes.serialNumber != snToCheck) {
					return false;
				}
				if(device.savedAttributes.deviceType != dtToCheck) {
					return false;
				}
				if(device.savedAttributes.connectionType != ctToCheck) {
					return false;
				}
				retDevObj = device;
				return true;
			});
		}

		debugLog.dk('Found Device?', foundDevice);
		if(foundDevice) {
			return retDevObj;
		} else {
			return false;
		}
	};

	/*
	 * Define a function that removes a device form the device keeper.
	 */
	this.remove = function(deviceToRemove) {
		var deviceKey = buildDeviceKey(deviceToRemove);
		var deviceInfo = getDeviceKeyInfo(deviceToRemove);

		debugLog.dk('Removing Device', deviceInfo);

		self.devices[deviceKey] = undefined;
		delete self.devices[deviceKey];

		self.emit(eventList.deviceRemoved, deviceInfo);
		self.emit(eventList.deviceListChanged, {
			'numDevices': getNumDevices(),
			'connectedDevices': getInfoForConnectedDevices(),
		});
	};

	var self = this;
}
util.inherits(DEVICE_KEEPER, EventEmitter);

function DEVICE_MANAGER() {
	// this.deviceList = [];
	
	this.deviceKeeper = new DEVICE_KEEPER();

	this.deviceKeeper.on(eventList.deviceAdded, function(info) {
		self.emit(eventList.deviceAdded, info);
	});
	this.deviceKeeper.on(eventList.deviceRemoved, function(info) {
		self.emit(eventList.deviceRemoved, info);
	});
	this.deviceKeeper.on(eventList.deviceListChanged, function(info) {
		self.emit(eventList.deviceListChanged, info);
	});

	/* 
	 * Define functions that allow users to interact with the device keeper
	 * with out having direct access to it.
	 */
	this.getManagedDevicesList = function(filters) {
		var defered = q.defer();
		var list = self.deviceKeeper.getManagedDevicesList();
		defered.resolve(list);
		return defered.promise;
	};
	this.getManagedDevicesListSync = function(filters) {
		return self.deviceKeeper.getManagedDevicesList();
	};
	this.getDevices = function(filters) {
		return self.deviceKeeper.devices;
	};

	
	/*
	 * Define functions that allow users to interact with the device scanner.
	 */
	var deviceScanner = device_scanner.getDeviceScanner();
	this.cachedDeviceScanResults = undefined;
	this.getScannedDevices = function() {
		var defered = q.defer();
		if(self.cachedDeviceScanResults) {
			defered.resolve(self.cachedDeviceScanResults);
		} else {
			defered.resolve([]);
		}
		return defered.promise;
	};
	this.getScannedDevicesSync = function() {
		if(self.cachedDeviceScanResults) {
			return self.cachedDeviceScanResults;
		} else {
			return [];
		}
	};
	this.scanForDevices = function() {
		var defered = q.defer();
		var deviceObjects = self.deviceKeeper.devices;
		var deviceKeys = Object.keys(deviceObjects);
		var deviceObjectList = deviceKeys.map(function(deviceKey) {
			return deviceObjects[deviceKey];
		});

		deviceScanner.findAllDevices(deviceObjectList)
		.then(function(deviceTypes) {
			self.cachedDeviceScanResults = deviceTypes;

			if(DEBUG_DEVICE_MANAGER_SCANNING) {
				debugLog.dms('Scan Preview...');
				deviceTypes.forEach(function(deviceType) {
					var devices = deviceType.devices;
					debugLog.dms(' - ', deviceType.deviceTypeName, devices.length);
					devices.forEach(function(device) {
						debugLog.dms('Device...', Object.keys(device));
					});
				});
			}
			defered.resolve(deviceTypes);
		}, defered.reject);
		return defered.promise;
	};

	/*
	 * Define helper functions that allow users to open devices.  They are
	 * used by the externally accessable "this.open" function.
	 */
	function parseOpenOptions(options) {
		var parsedOptions = {
			'deviceType': 'LJM_dtANY',
			'connectionType': 'LJM_ctANY',
			'identifier': 'LJM_idANY',
			'mockDevice': false,
			'mockDeviceConfig': undefined,
		};

		if(options) {
			if(options.deviceType) {
				parsedOptions.deviceType = options.deviceType;
			}
			if(options.dt) {
				parsedOptions.deviceType = options.deviceType;
			}
			if(options.connectionType) {
				parsedOptions.connectionType = options.connectionType;
			}
			if(options.ct) {
				parsedOptions.connectionType = options.connectionType;
			}
			if(options.identifier) {
				parsedOptions.identifier = options.identifier;
			}
			if(options.id) {
				parsedOptions.identifier = options.identifier;
			}
			if(options.mockDevice) {
				parsedOptions.mockDevice = options.mockDevice;
			}
			if(options.mockDeviceConfig) {
				parsedOptions.mockDeviceConfig = options.mockDeviceConfig;
			}
		}
		return parsedOptions;
	}
	function createOpenBundle(options) {
		return {
			'options': options,
			'newDevice': undefined,
			'isError': false,
			'errorStep': '',
			'error': undefined,
		};
	}

	function initializeNewDevice (bundle) {
		var defered = q.defer();

		var isMockDevice = bundle.options.mockDevice;
		var mockDeviceConfig = bundle.options.mockDeviceConfig;

		var newDevice = new device_curator.device(isMockDevice);
		bundle.newDevice = newDevice;

		if(isMockDevice) {
			newDevice.configureMockDevice(mockDeviceConfig)
			.then(function() {
				

				defered.resolve(bundle);
			}, function (err) {
				bundle.isError = true;
				bundle.errorStep = 'configureMockDevice';
				bundle.error = err;
				defered.resolve(bundle);
			});
		} else {
			defered.resolve(bundle);
		}
		return defered.promise;
	}
	function performOpenDevice (bundle) {
		var defered = q.defer();

		var d = bundle.newDevice;
		var dt = bundle.options.deviceType;
		var ct = bundle.options.connectionType;
		var id = bundle.options.identifier;
		d.open(dt, ct, id)
		.then(function() {
			self.deviceKeeper.insert(d);
			defered.resolve(bundle);
		}, function(err) {
			bundle.isError = true;
			bundle.errorStep = 'performOpenDevice';
			bundle.error = err;
			defered.resolve(bundle);
		});
		return defered.promise;
	}
	function getCuratedDeviceEventListener(device, eventName) {
		return function cdEventListener(data) {
			debugLog.dme('cdEventListener - device:', {
				'eventName': eventName,
				'dt': device.savedAttributes.productType,
				'ct': device.savedAttributes.connectionTypeName,
				'sn': device.savedAttributes.serialNumber,
				'isCon': device.savedAttributes.isConnected,
				'errors': device.getLatestDeviceErrorsSync(),
				// 'savedAttributes': device.savedAttributes,
			});
			console.log('cdEventListener - not - forwarding...', eventName);
			// console.log('cdEventListener - data', data);
			// self.emit(eventList.deviceStatusChanged, data);
		};
	}

	function attachDeviceEvents(bundle) {
		var defered = q.defer();

		if(bundle.isError) {
			defered.resolve(bundle);
		} else {
			var d = bundle.newDevice;
			var cdEventKeys = Object.keys(curatedDeviceEvents);
			cdEventKeys.forEach(function(cdEventKey) {
				var eventName = curatedDeviceEvents[cdEventKey];
				d.on(eventName, getCuratedDeviceEventListener(d, eventName));
			});
			defered.resolve(bundle);
		}
		return defered.promise;
	}

	/*
	 * Define the externally accessable "open" function that allows users
	 * to open connections to LabJack devices.
	 */
	this.open = function(options) {
		var defered = q.defer();

		var parsedOptions = parseOpenOptions(options);
		var bundle = createOpenBundle(parsedOptions);
		debugLog.dm('Opening Device', parsedOptions);

		function finishFunc(finalBundle) {
			if(finalBundle.isError) {
				// There was an error opening or configuring the device.
				defered.reject(finalBundle.error);
			} else {
				// There was no error opening the device.
				defered.resolve(finalBundle.newDevice);
			}
		}

		// There was some sort of un-caught error opening a device.
		function errFunc(errBundle) {
			// reject to the open error.
			defered.reject({
				'isError': errBundle.isError,
				'errorStep': errBundle.errorStep,
				'error': errBundle.error,
			});
		}

		// Perform the chain of functions to open a device.
		initializeNewDevice(bundle)
		.then(performOpenDevice)
		.then(attachDeviceEvents)
		.then(finishFunc)
		.catch(errFunc);

		return defered.promise;
	};

	/*
	 * Define helper functions that allow users to close device connections.
	 */
	function parseCloseOptions(options) {
		var parsedOptions = {
			'ljmHandle': 0,
			'deviceType': '',
			'connectionType': '',
			'serialNumber': '',
		};

		if(options) {
			if(typeof(options) === 'object') {
				if(options.ljmHandle) {
					parsedOptions.ljmHandle = options.ljmHandle;
				}
				if(options.deviceType) {
					parsedOptions.deviceType = options.deviceType;
				}
				if(options.connectionType) {
					parsedOptions.connectionType = options.connectionType;
				}
				if(options.serialNumber) {
					parsedOptions.serialNumber = options.serialNumber;
				}
			}
		}
		return parsedOptions;
	}

	function createCloseBundle(options) {
		return {
			'options': options,
			'deviceToClose': undefined,
			'foundDevice': false,
			'isError': false,
			'errorStep': '',
			'error': undefined,
		};
	}

	function getDeviceToClose(bundle) {
		var defered = q.defer();

		var device = self.deviceKeeper.getDevice(bundle.options);
		if(device) {
			bundle.foundDevice = true;
			bundle.deviceToClose = device;
		} else {
			bundle.foundDevice = false;
			bundle.isError = true;
			bundle.errorStep = 'getDeviceToClose',
			bundle.error = new Error('Could not find the appropriate device to close.');
		}
		defered.resolve(bundle);
		return defered.promise;
	}

	function performCloseDevice(bundle) {
		var defered = q.defer();

		if(bundle.foundDevice) {
			var d = bundle.deviceToClose;
			d.close()
			.then(function() {
				self.deviceKeeper.remove(d);
				defered.resolve(bundle);
			}, function(err) {
				self.deviceKeeper.remove(d);
				bundle.isError = true;
				bundle.errorStep = 'performCloseDevice';
				bundle.error = err;
				defered.resolve(bundle);
			});
		} else {
			defered.resolve(bundle);
		}
		return defered.promise;
	}

	/*
	 * Define the externally accessable "close" function that allows users to
	 * terminate/close connections to LabJack devices. 
	 */
	this.close = function(options) {
		var defered = q.defer();

		var parsedOptions = parseCloseOptions(options);
		var bundle = createCloseBundle(parsedOptions);
		debugLog.dm('Closing Device', parsedOptions);

		function finishFunc(finishBundle) {
			if(finishBundle.isError) {
				// There was an error closing the specified device.
				defered.reject({
					isError: finishBundle.isError,
					errorStep: finishBundle.errorStep,
					error: finishBundle.error,
				});
			} else {
				// There was no error closing the device.
				defered.resolve({
					options: finishBundle.options
				});
			}
		}

		// There was some sort of un-caught error closing a device.
		function errFunc(errBundle) {
			defered.reject({
				isError: errBundle.isError,
				errorStep: errBundle.errorStep,
				error: errBundle.error,
			});
		}

		// Perform the chain of functions to close a device.
		getDeviceToClose(bundle)
		.then(performCloseDevice)
		.then(finishFunc)
		.catch(errFunc);

		return defered.promise;
	};

	/*
	 * Define a function that allows users to close all active connections to
	 * LabJack devices.
	 */
	this.closeAll = function() {
		var defered = q.defer();

		var deviceObjects = self.deviceKeeper.devices;
		var deviceKeys = Object.keys(deviceObjects);
		async.each(
			deviceKeys,
			function(deviceKey, cb) {
				var device = deviceObjects[deviceKey];
				device.close()
				.then(function(res) {
					self.deviceKeeper.remove(device);
					cb();
				}, function(err) {
					self.deviceKeeper.remove(device);
					cb();
				});
			},
			function() {
				defered.resolve();
			});
		return defered.promise;
	};

	var self = this;
}
util.inherits(DEVICE_MANAGER, EventEmitter);

var deviceManager = new DEVICE_MANAGER();

module.exports.load = function() {
	return deviceManager;
};
module.exports.eventList = eventList;