
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
	var deviceScanner = new device_scanner.deviceScanner();


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
				deviceSendMessage
			);
		} catch (err) {
			defered.reject({
				'message': 'Failed to create device obj, device_keeper.js',
				'info': JSON.stringify(err)
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
				'info': JSON.stringify(err)
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
	 * Accessory function for getDeviceListing that filters out devices from the
	 * listing.
	 */
	var supportedDeviceFilters = {
		'type': function (param, attrs) {
			var res = false;
			if(driver_const.deviceTypes[param] == attrs.deviceType) {
				res = true;
			}
			return res;
		},
		'minFW': function (param, attrs) {
			var res = false;
			if(parseFloat(param) >= attrs.FIRMWARE_VERSION) {
				res = true;
			}
			return res;
		},
		'subClass': function (params, attrs) {
			var res = false;
			if(Array.isArray(params)) {
				params.forEach(function(param) {
					if(attrs.subclass.indexOf(param) >= 0) {
						res = true;
					}
				});
			}
			return res;
		},
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
			var res = false;
			if(attrs.isMockDevice == param) {
				res = true;
			}
			return res;
		}
	};
	var supportedDeviceFilterKeys = Object.keys(supportedDeviceFilters);
	var passesDeviceFilters = function(filters, attrs) {
		var passes = true;
		if(typeof(filters) !== 'undefined') {
			var keys = Object.keys(filters);
			keys.forEach(function(key) {
				if(supportedDeviceFilterKeys.indexOf(key) >= 0) {
					if(!supportedDeviceFilters[key](filters[key], attrs)) {
						passes = false;
					}
				}
			});
		}
		return passes;
	};

	/**
	 * Get various attributes about the currently open devices.  Should be used
	 * when each tab in kipling starts to retrieve easy to parse & display data
	 * about each connected device.
	 */
	this.getDeviceListing = function(reqFilters, requestdAttributes) {
		var defered = q.defer();
		var filters = {'enableMockDevices': true};
		if(reqFilters) {
			if(Array.isArray(reqFilters)) {
				reqFilters.forEach(function(reqFilter) {
					var filterKeys = Object.keys(reqFilter);
					filterKeys.forEach(function(key) {
						filters[key] = reqFilter[key];
					});
				});
			} else {
				var filterKeys = Object.keys(reqFilter);
				filterKeys.forEach(function(key) {
					filters[key] = reqFilter[key];
				});
			}
		}
		var attributes = [
			'serialNumber',
			'FIRMWARE_VERSION',
			'WIFI_VERSION',
			'productType',
			'BOOTLOADER_VERSION',
			'connectionTypeName',
			'ip',
			'DEVICE_NAME_DEFAULT',
			'isSelected-Radio',
			'isSelected-CheckBox',
			'device_comm_key'
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

		var listing = [];
		var deviceKeys = Object.keys(self.devices);
		deviceKeys.forEach(function(deviceKey) {
			var dev = self.devices[deviceKey].device.savedAttributes;
			if(passesDeviceFilters(filters, dev)) {
				var devListing = {};
				attributes.forEach(function(attribute) {
					if(typeof(dev[attribute]) !== 'undefined') {
						devListing[attribute] = dev[attribute];
					} else {
						devListing[attribute] = 'N/A';
					}
				});
				listing.push(devListing);
			}
		});
		defered.resolve(listing);
		return defered.promise;
	};
	
	this.listAllDevices = function() {
		var defered = q.defer();

		deviceScanner.findAllDevices(self.devices)
		.then(defered.resolve, defered.reject);
		return defered.promise;
	};

	var self = this;
}

exports.createDeviceKeeper = createDeviceKeeper;
