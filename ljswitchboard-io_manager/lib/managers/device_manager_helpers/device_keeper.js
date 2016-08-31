
var process_manager = require('process_manager');
var q = require('q');
var async = require('async');

var constants = require('../../common/constants');

// Save event emitter variables for easy access.
var DEVICE_CONTROLLER_DEVICE_OPENED = constants.DEVICE_CONTROLLER_DEVICE_OPENED;
var DEVICE_CONTROLLER_DEVICE_CLOSED = constants.DEVICE_CONTROLLER_DEVICE_CLOSED;


// var device_interface = require('../../single_device_interface');
// var device_delegator_path = './lib/delegators/single_device_delegator.js';

var labjack_nodejs = require('labjack-nodejs');
var driver_const = labjack_nodejs.driver_const;
var device_generator = require('./device_generator');
var device_scanner_obj = require('ljswitchboard-device_scanner');
var device_scanner = device_scanner_obj.getDeviceScanner();
var device_scanner_events = device_scanner_obj.eventList;
var data_parser = require('ljswitchboard-data_parser');
var modbus_map = require('ljswitchboard-modbus_map');
var ljmConstants = modbus_map.getConstants();


function createDeviceKeeper(io_delegator, link) {
	var send = link.send;
	var sendMessage = link.sendMessage;
	// var deviceScanner = new device_scanner.deviceScanner();
	var deviceScanner = device_scanner;


	var deviceSendMessage = function(deviceKey, message) {
		send({
			'deviceKey': deviceKey,
			'message': message
		});
	};
	var sendEvent = function(eventName, data) {
		send({
			'eventName': eventName,
			'data': data
		});
	};

	// Attach to deviceScanner events
	var getDeviceScannerEventListener = function(eventKey) {
		var deviceScannerEventListener = function(data) {
			// console.log('Device Keeper, deviceScanner event', eventKey);
			sendEvent(eventKey, data);
		};
		return deviceScannerEventListener;
	};

	var eventKeys = Object.keys(device_scanner_events);
	eventKeys.forEach(function(eventKey) {
		deviceScanner.on(eventKey, getDeviceScannerEventListener(eventKey));
	});

	this.devices = {};

	var currentDeviceKey;

	var getDeviceKey = function() {
		var key = currentDeviceKey;
		if(currentDeviceKey < 65536) {
			currentDeviceKey += 1;
		} else {
			currentDeviceKey = 0;
		}
		return key;
	};

	this.init = function() {
		var defered = q.defer();

		self.devices = {};
		currentDeviceKey = 0;

		defered.resolve();
		return defered.promise;
	};


	/********************* Exposed Functions **********************************/

	/**
	 *	Function that gets called to open a new device.  It uses the 
	 *	accessory device_generator.js file to create device objects and abstract
	 *	the differences between devices opened in the same process vs opening
	 *	them in a subprocess.
	 */
	this.openDevice = function(options) {
		var deviceType;
		var connectionType;
		var identifier;
		var newProcess;
		var mockDevice;
		var mockDeviceConfig;

		if(options.deviceType) {
			deviceType = options.deviceType;
		} else {
			deviceType = 'LJM_dtANY';
		}
		if(options.connectionType) {
			connectionType = options.connectionType;
		} else {
			connectionType = 'LJM_ctANY';
		}
		if(options.identifier) {
			identifier = options.identifier;
		} else {
			identifier = 'LJM_idANY';
		}
		if(options.newProcess) {
			newProcess = options.newProcess;
		} else {
			newProcess = false;
		}
		if(options.mockDevice) {
			mockDevice = options.mockDevice;
		} else {
			mockDevice = false;
		}
		if(options.mockDeviceConfig) {
			mockDeviceConfig = options.mockDeviceConfig;
		}

		var defered = q.defer();
		
		// Determine if we should be starting a sub-process
		var spinupProcess = false;
		if(newProcess) {
			spinupProcess = true;
		}

		// Define onSuccess and onError functions
		var successFunc = function(res) {
			sendEvent(DEVICE_CONTROLLER_DEVICE_OPENED, res);
			defered.resolve(res);
		};
		var errorFunc = function(err) {
			// The device failed to open, therefore remove it from the list of
			// open devices.
			self.devices[err.device_comm_key] = null;
			self.devices[err.device_comm_key] = undefined;
			delete self.devices[err.device_comm_key];
			defered.reject(err.err);
		};

		// create new device object:
		var newDevice;
		try {
			newDevice = new device_generator.newDevice(
				spinupProcess,
				mockDevice,
				mockDeviceConfig,
				deviceSendMessage
			);
		} catch (err) {
			defered.reject({
				'message': 'Failed to create device obj, device_keeper.js',
				'info': JSON.stringify(err),
				'stack': JSON.stringify(err.stack),
			});
		}

		// get the devices comm. key
		var newKey = getDeviceKey();
		
		// Make sure that the new key is unique
		while(self.devices[newKey]) {
			console.log('Making another unique key');
			newKey = getDeviceKey();
		}

		// Set the device object's key
		newDevice.device_comm_key = newKey;

		// Save the new device to the device list
		self.devices[newKey] = newDevice;

		// Call the LJM open command to open the desired device
		try {
			self.devices[newKey].open(deviceType, connectionType, identifier)
			.then(successFunc, errorFunc);
		} catch(err) {
			defered.reject({
				'message': 'Failed to initialize device obj, device_keeper.js',
				'info': JSON.stringify(err),
				'stack': JSON.stringify(err.stack),
			});
		}
		return defered.promise;
	};

	/**
	 *	The close command in combination with the removeDeviceReference 
	 * 	functions properly close devices and remove them from the local listing
	 *	of devices.
	 */
	var removeDeviceReference = function(comKey) {
		self.devices[comKey] = null;
		self.devices[comKey] = undefined;
		delete self.devices[comKey];
	};
	this.close = function(comKey) {
		var defered = q.defer();

		if(self.devices[comKey]) {
			// If the device is in the local listing of devices close it.
			self.devices[comKey].close()
			.then(function(res) {
				sendEvent(
					DEVICE_CONTROLLER_DEVICE_CLOSED,
					self.devices[comKey].device.savedAttributes
				);
				var newInfo = {};
				newInfo.isError = false;
				newInfo.comKey = comKey;

				// if the device closed successfully, delete all references.
				removeDeviceReference(comKey);
				defered.resolve(newInfo);
			}, function(err) {
				var newInfo = {};
				newInfo.isError = true;
				newInfo.comKey = comKey;
				newInfo.err = err;

				// if there is an error still delete all data
				removeDeviceReference(comKey);
				defered.resolve(newInfo);
			});
		} else {
			defered.reject('in dev_keeper close func, invalid comKey', comKey);
		}
		return defered.promise;
	};

	/**
	 * 	Close all devices that are in the self.devices object.  The 
	 *	closeAllDevices function makes an array of closeOps that get called
	 *	in parallel hence the necessity of the secondary createCloseOp function.
	 */
	var createCloseOp = function(comKey) {
		var closeOp = function() {
			var innerDefered = q.defer();
			self.devices[comKey].close()
			.then(function(res) {
				var newInfo = {};
				newInfo.isError = false;
				newInfo.comKey = comKey;

				// if the device closed successfully, delete all references.
				removeDeviceReference(comKey);
				innerDefered.resolve(newInfo);
			}, function(err) {
				// Save the error information
				var newInfo = {};
				newInfo.isError = true;
				newInfo.err = err;
				newInfo.comKey = comKey;

				// if there is an error still delete all data
				removeDeviceReference(comKey);
				innerDefered.resolve(newInfo);
			});
			return innerDefered.promise;
		};
		return closeOp;
	};
	this.closeAllDevices = function() {
		var defered = q.defer();
		var numDevicesClosed = 0;

		var comKeys = Object.keys(self.devices);

		var closeOps = [];
		for(var i = 0; i < comKeys.length; i++) {
			closeOps.push(createCloseOp(comKeys[i]));
		}

		var bundle = [];
		async.each(
			closeOps,
			function(closeOp, callback) {
				closeOp()
				.then(function(res) {
					bundle.push(res);
					callback();
				}, function(err) {
					bundle.push(err);
					callback();
				});
			}, function(err) {
				if(err) {
					defered.reject(err);
				} else {
					// console.log("All Closed!", bundle);
					var retData = {
						'numClosed': bundle.length,
						'data': bundle
					};
					defered.resolve(retData);
				}
			});
		
		return defered.promise;
	};

	/**
	 *	Return the number of devices that the device_keeper is currently
	 *	managing.
	 */
	this.getNumDevices = function() {
		var defered = q.defer();
		var numDevices = Object.keys(self.devices).length;
		defered.resolve(numDevices);
		return defered.promise;
	};


	/**
	 * Accessory functions for getDeviceListing that filters out devices from the
	 * listing.
	 */
	 var deviceTypeFilterFunc = function (param, attrs) {
		var res = false;
		if(driver_const.deviceTypes[param] == attrs.deviceType) {
			res = true;
		}
		return res;
	};
	var connectionTypeFilterFunc = function(param, attrs) {
		var res = false;
		if(driver_const.connectionTypes[param] == attrs.connectionType) {
			res = true;
		}
		return res;
	};
	var subClassFilterFunc = function (params, attrs) {
		var res = false;
		var augmentParam = function(origParam) {
			origParam = origParam.split('-').join('');
			if(origParam !== '') {
				origParam = '-' + origParam;
			}
			return origParam;
		};
		if(Array.isArray(params)) {
			params.forEach(function(param) {
				if(attrs.subclass === augmentParam(param)) {
					res = true;
				}
			});
		} else {
			if(attrs.subclass === augmentParam(param)) {
				res = true;
			}
		}
		return res;
	};
	var specialDeviceFilters = {
		// TODO: Should combine this filter code with the filter code in the
		// kipling module_chrome.js file.
		'type': deviceTypeFilterFunc,
		'deviceType': deviceTypeFilterFunc,
		'deviceTypeString': deviceTypeFilterFunc,
		'deviceTypeName': deviceTypeFilterFunc,
		'deviceClass': deviceTypeFilterFunc,
		'connectionType': connectionTypeFilterFunc,
		'connectionTypeName': connectionTypeFilterFunc,
		'connectionTypeString': connectionTypeFilterFunc,
		'minFW': function (param, attrs) {
			var res = false;
			if(attrs.FIRMWARE_VERSION >= parseFloat(param)) {
				res = true;
			}
			return res;
		},
		'subClass': subClassFilterFunc,
		'subclass': subClassFilterFunc,
		'hasSDCard': function (param, attrs) {
			var res = false;
			if(attrs.HARDWARE_INSTALLED) {
				if(attrs.HARDWARE_INSTALLED.sdCard == param) {
					res = true;
				}
			}
			return res;
		},
		'hasWiFi': function (param, attrs) {
			var res = false;
			if(attrs.HARDWARE_INSTALLED) {
				if(attrs.HARDWARE_INSTALLED.wifi == param) {
					res = true;
				}
			}
			return res;
		},
		'enableMockDevices': function(param, attrs) {
			var res = true;
			if(param) {
				if(attrs.isMockDevice === true) {
					res = true;
				}
			} else {
				if(attrs.isMockDevice === true) {
					res = false;
				}
			}
			return res;
		}
	};
	var specialDeviceFilterKeys = Object.keys(specialDeviceFilters);
	var passesDeviceFilters = function(filters, attrs) {
		var passes = false;
		if(typeof(filters) !== 'undefined') {
			filters.forEach(function(filter) {
				var innerPasses = true;
				var keys = Object.keys(filter);
				keys.forEach(function(key) {
					if(specialDeviceFilterKeys.indexOf(key) >= 0) {
						if(!specialDeviceFilters[key](filter[key], attrs)) {
							innerPasses = false;
						}
					} else if(filter[key] !== attrs[key]) {
						innerPasses = false;
					}
				});
				if(innerPasses) {
					passes = true;
				}
			});
			if(filters.length === 0) {
				passes = true;
			}
		}
		return passes;
	};

	/**
	 * Get various attributes about the currently open devices.  Should be used
	 * when each tab in kipling starts to retrieve easy to parse & display data
	 * about each connected device.
	 */
	var createDefaultFilter = function(userOptions) {
		var newFilter = {'enableMockDevices': true};
		try {
			var filterKeys = Object.keys(userOptions);
			filterKeys.forEach(function(key) {
				newFilter[key] = userOptions[key];
			});
		} catch(err) {
			// userOptions is likely not an object, just don't use it & return
			// an object with only the default filter option.
		}
		return newFilter;
	};
	this.getDeviceListing = function(reqFilters, requestdAttributes) {
		var defered = q.defer();
		var listing = [];
		try {
			var filters = [];
			if(reqFilters) {
				if(Array.isArray(reqFilters)) {
					filters = reqFilters.map(createDefaultFilter);
				} else {
					filters.push(createDefaultFilter(reqFilters));
				}
			}
			var attributes = [
				'serialNumber',
				'FIRMWARE_VERSION',
				'WIFI_VERSION',
				'productType',
				'BOOTLOADER_VERSION',
				'connectionTypeName',
				'ipAddress',
				'DEVICE_NAME_DEFAULT',
				'isConnected',
				'isSelected-Radio',
				'isSelected-CheckBox',
				'device_comm_key',
				'deviceErrors',
				'deviceType',
				'deviceTypeName'
			];
			if(requestdAttributes) {
				if(Array.isArray(requestdAttributes)) {
					requestdAttributes.forEach(function(requestedAttribute) {
						if(attributes.indexOf(requestedAttribute) < 0) {
							attributes.push(requestedAttribute);
						}
					});
				}
			}

			
			var deviceKeys = Object.keys(self.devices);
			deviceKeys.forEach(function(deviceKey) {
				var added = false;
				var curDevice = self.devices[deviceKey].device;
				var dev = curDevice.savedAttributes;
				if(passesDeviceFilters(filters, dev)) {
					added = true;
					var devListing = {};
					attributes.forEach(function(attribute) {
						if(typeof(dev[attribute]) !== 'undefined') {
							devListing[attribute] = dev[attribute];
						} else if(typeof(curDevice[attribute]) !== 'undefined') {
							devListing[attribute] = curDevice[attribute];
							if(attribute === 'deviceErrors') {
								
							}
						} else {
							devListing[attribute] = 'N/A';
						}
					});
					listing.push(devListing);
				} else {
				}
			});
			defered.resolve(listing);
		} catch(err) {
			console.log('Error in getDeviceListing', err, err.stack);
		}
		
		return defered.promise;
	};

	this.selectDevice = function(deviceSerialNumber, type) {
		var defered = q.defer();

		var selectedType = {
			'radio': 'Radio',
			'Radio': 'Radio',
			'RADIO': 'Radio',
			'CheckBox': 'CheckBox',
			'checkbox': 'CheckBox',
			'CHECKBOX': 'CheckBox'
		}[type];
		if(selectedType) {

		} else {
			selectedType = 'Radio';
		}

		var selectType = 'isSelected-' + selectedType;
		var deviceKeys = Object.keys(self.devices);
		var foundDeviceKey;
		var retData = {};

		deviceKeys.forEach(function(deviceKey) {
			var attributes = self.devices[deviceKey].device.savedAttributes;
			var serialNumber = attributes.serialNumber;
			var newVal;
			if(serialNumber == deviceSerialNumber) {
				newVal = true;
			} else {
				newVal = false;
			}
			self.devices[deviceKey].device.savedAttributes[selectType] = newVal;
		});

		defered.resolve();
		return defered.promise;
	};

	this.selectDevices = function(deviceSerialNumbers) {
		var defered = q.defer();

		var promises = deviceSerialNumbers.map(function(serialNumber) {
			return self.selectDevice(serialNumber, 'CheckBox');
		});

		q.allSettled(promises)
		.then(function() {
			defered.resolve();
		});
		return defered.promise;
	};
	
	this.listAllDevices = function(options) {
		var defered = q.defer();

		// Build array of currently connected devices.
		var currentDevices = [];
		var keys = Object.keys(self.devices);
		keys.forEach(function(key) {
			var dev = self.devices[key].device;
			currentDevices.push(dev);
		});

		// Start device scan
		deviceScanner.findAllDevices(currentDevices, options)
		.then(function(data) {
			defered.resolve(data);
		}, defered.reject);
		return defered.promise;
	};

	this.getListAllDevicesErrors = function() {
		var defered = q.defer();
		deviceScanner.getLastFoundErroniusDevices()
		.then(defered.resolve, defered.reject);
		return defered.promise;
	}

	this.getCachedListAllDevices = function() {
		var defered = q.defer();

		// Build array of currently connected devices.
		var currentDevices = [];
		var keys = Object.keys(self.devices);
		keys.forEach(function(key) {
			var dev = self.devices[key].device;
			currentDevices.push(dev);
		});
		
		deviceScanner.getLastFoundDevices(currentDevices)
		.then(defered.resolve, defered.reject);
		return defered.promise;
	};
	this.enableMockDeviceScanning = function() {
		var defered = q.defer();
		deviceScanner.disableDeviceScanning()
		.then(defered.resolve, defered.reject);
		return defered.promise;
	};
	this.disableMockDeviceScanning = function() {
		var defered = q.defer();
		deviceScanner.enableDeviceScanning()
		.then(defered.resolve, defered.reject);
		return defered.promise;
	};
	this.addMockDevices = function(deviceInfoArray) {
		var defered = q.defer();
		deviceScanner.addMockDevices(deviceInfoArray)
		.then(defered.resolve, defered.reject);
		return defered.promise;
	};
	this.addMockDevice = function(deviceInfo) {
		var defered = q.defer();
		deviceScanner.addMockDevice(deviceInfo)
		.then(defered.resolve, defered.reject);
		return defered.promise;
	};

	var self = this;
}

exports.createDeviceKeeper = createDeviceKeeper;
