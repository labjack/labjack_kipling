

var EventEmitter = require('events').EventEmitter;
var util = require('util');
var constants = require('../common/constants');

// Save event emitter variables for easy access.
var DEVICE_CONTROLLER_DEVICE_OPENED = constants.DEVICE_CONTROLLER_DEVICE_OPENED;
var DEVICE_CONTROLLER_DEVICE_CLOSED = constants.DEVICE_CONTROLLER_DEVICE_CLOSED;

var q = require('q');

var labjack_nodejs = require('labjack-nodejs');
var driver_constants = labjack_nodejs.driver_const;
var ljmConstants = labjack_nodejs.modbusMap.getConstants();

var io_endpoint_key = constants.device_endpoint_key;

// device creators:
var ljm_device_creator = require('./device_helpers/ljm_device');
var t7_device_creator = require('./device_helpers/t7_device');
var digit_device_creator = require('./device_helpers/digit_device');

// var ljm_device_controller = require('./device_helpers/ljm_device');
// var device_keeper = require('./device_helpers/device_keeper');

function createDeviceController(io_interface) {

	var innerCallFunc = null;
	var sendReceive = null;
	var sendMessage = null;
	var send = null;

	this.devices = null;

	this.eventList = constants.deviceControllerEvents;

	var callFunc = function(func, args) {
		return innerCallFunc({
			'func': func,
			'isDeviceFunc': false
		}, args);
	};
	var deviceCallFunc = function(deviceKey, func, args) {
		var defered = q.defer();
		return innerCallFunc({
			'func': func,
			'isDeviceFunc': true,
			'deviceKey': deviceKey
		}, args);
	};
	var deviceSendFunc = function(deviceKey, message) {
		send({
			'deviceKey': deviceKey,
			'message': message
		});
	};
	var listener = function(m) {
		if(typeof(m.deviceKey) !== 'undefined'){
			if(self.devices[m.deviceKey]) {
				self.devices[m.deviceKey].oneWayListener(m.message);
			}
		} else if(typeof(m.eventName) !== 'undefined') {
			// console.log('Emitting device_controller event', m.eventName);
			self.emit(m.eventName, m.data);
		} else {
			// self.emit(DEVICE_CONTROLLER_DEVICE_OPENED, newDevice.savedAttributes);
			console.log('- device_controller in listener, message:', m);
		}
	};
	var saveLink = function(link) {
		var defered = q.defer();

		innerCallFunc = link.callFunc;
		sendReceive = link.sendReceive;
		sendMessage = link.sendMessage;
		send = link.send;
		defered.resolve();
		return defered.promise;
	};

	this.init = function() {
		var defered = q.defer();

		// Initialize the device keeper
		// deviceKeeper = new device_keeper.createDeviceKeeper();
		self.devices = {};

		io_interface.establishLink(io_endpoint_key, listener)
		.then(saveLink)
		.then(defered.resolve);
		return defered.promise;
	};

	this.testSendMessage = function() {
		console.log('- device_controller in testSendMessage');
		return sendMessage('device_controller sending test message via testSendMessage');
	};
	this.testSend = function() {
		console.log('- device_controller in testSend');
		return send('device_controller sending test message via testSend');
	};


	/**
	 * Return a commonly acquired set of device attributes commonly used to
	 * generate the header-box of various modules
	 *     isSelected
	 *     isActive
	 *     isLocked
	 *     serialNumber
	 *     deviceType
	 *     hardwareInstalled
	 *     deviceName
	 *     firmwareVersion
	 *     handleInfo (from getHandleInfo)
	 */
	this.getDeviceListing = function(reqFilters, requestdAttributes) {
		// var defered = q.defer();
		return callFunc('getDeviceListing', [reqFilters, requestdAttributes]);
		// .then(function(res) {
		//  defered.resolve(res);
		// }, defered.reject);
		// return defered.promise;
	};

	/**
	 * Get a list of devices currently visible by the caller.
	 * @return {Array} An array of found devices and various attributes.
	 */
	this.listAllDevices = function() {
		return callFunc('listAllDevices');
	};
	this.getCachedListAllDevices = function() {
		return callFunc('getCachedListAllDevices');
	};
	this.enableMockDeviceScanning = function() {
		return callFunc('enableMockDeviceScanning');
	};
	this.disableMockDeviceScanning = function() {
		return callFunc('disableMockDeviceScanning');
	};
	this.addMockDevices = function(deviceInfoArray) {
		return callFunc('addMockDevices', [deviceInfoArray]);
	};
	this.addMockDevice = function(deviceInfo) {
		return callFunc('addMockDevice', [deviceInfo]);
	};

	var getCachedDeviceObject = function(key) {
		var defered = q.defer();
		defered.resolve(self.devices[key]);
		return defered.promise;
	};
	var getDeviceObject = function(deviceAttributes) {
		var defered = q.defer();
		if(deviceAttributes.length > 0) {
			var key = deviceAttributes[0].device_comm_key;

			// Return the first found device;
			if(self.devices[key]) {
				return getCachedDeviceObject(key);
			} else {
				return createDeviceObject(key);
			}
		} else {
			defered.resolve();
			return defered.promise;
		}
	};
	var getDeviceObjects = function(deviceAttributes) {
		var defered = q.defer();
		var keys = Object.keys(deviceAttributes);

		// Construct an array of devices
		var promises = deviceAttributes.map(function(device) {
			var key = device.device_comm_key;
			if(self.devices[key]) {
				return getCachedDeviceObject(key);
			} else {
				return createDeviceObject(deviceAttributes[keys[0]]);
			}
		});
		q.allSettled(promises)
		.then(function(results) {
			var devices = [];
			results.forEach(function(result) {
				if(result.value) {
					devices.push(result.value);
				}
			});
			defered.resolve(devices);
		});
		return defered.promise;
	};

	this.selectDevice = function(deviceSerialNumber) {
		// var selectedType = {
		//  'radio': 'Radio',
		//  'Radio': 'Radio',
		//  'RADIO': 'Radio',
		// }[type];
		// if(selectedType) {

		// } else {
		//  selectedType = 'Radio';
		// }
		// var selectType = 'isSelected-' + selectedType;
		var selectType = 'isSelected-Radio';
		var deviceKeys = Object.keys(self.devices);
		var foundDeviceKey;
		var retData = {};

		deviceKeys.forEach(function(deviceKey) {
			var attributes = self.devices[deviceKey].savedAttributes;
			var serialNumber = attributes.serialNumber;
			var newVal;
			if(serialNumber == deviceSerialNumber) {
				newVal = true;
			} else {
				newVal = false;
			}
			self.devices[deviceKey].savedAttributes[selectType] = newVal;
		});
		return callFunc('selectDevice', [deviceSerialNumber]);
	};

	/**
	 * Get first found active device.
	 */
	this.getSelectedDevice = function(options) {
		var defered = q.defer();

		var filters = {};
		if(options) {
			filters = options;
		}
		filters['isSelected-Radio'] = true;
		self.getDeviceListing([filters])
		.then(getDeviceObject)
		.then(function(res) {
			if(res) {
				defered.resolve(res);
			} else {
				self.getDeviceListing()
				.then(getDeviceObjects)
				.then(function(res) {
					if(res.length > 0) {
						// Mark first device as current/active
						var firstSN = res[0].savedAttributes.serialNumber;
						self.selectDevice(firstSN)
						.then(function() {
							self.getDeviceListing([filters])
							.then(getDeviceObject)
							.then(defered.resolve);
						});
					} else {
						// No connected devices
						defered.resolve([]);
					}
				});
			}
		}, defered.reject);
		return defered.promise;
	};
	this.getSelectedDevices = function(options) {
		var defered = q.defer();

		var filters = {};
		if(options) {
			filters = options;
		}
		filters['isSelected-CheckBox'] = true;
		self.getDeviceListing([filters])
		.then(getDeviceObject)
		.then(function(res) {
			if(res.length > 0) {
				defered.resolve(res);
			} else {
				self.getDeviceListing()
				.then(getDeviceObjects)
				.then(function(res) {
					if(res.length > 0) {
						// Mark first device as current/active
					} else {
						// No connected devices
						defered.resolve([]);
					}
				});
			}
		}, defered.reject);
		return defered.promise;
	};

	/**
	 * Gets the first found device that meets the filters.
	 */
	this.getDevice = function(options) {
		var defered = q.defer();
		self.getDeviceListing(options)
		.then(getDeviceObject)
		.then(defered.resolve, defered.reject);
		return defered.promise;
	};

	
	/**
	 * Create several device objects that can be used to talk with the device 
	 * manager.
	 */
	this.getDevices = function(options) {
		var defered = q.defer();
		self.getDeviceListing(options)
		.then(getDeviceObjects)
		.then(defered.resolve, defered.reject);
		return defered.promise;
	};

	/**
	 * Figure out how many devices are currently open
	 */
	this.getNumDevices = function() {
		return callFunc('getNumDevices');
	};

	/**
	 * This function creates a new device object (T7/Digit) and adds it to the
	 * device_controller device management system.
	**/
	var createDeviceObject = function(deviceInfo) {
		var defered = q.defer();

		var comKey = deviceInfo.device_comm_key;

		var newDevice;
		var deviceCreator;

		// Create device object based on what type of device we just opened
		if(deviceInfo.deviceType == driver_constants.deviceTypes.t7) {
			deviceCreator = t7_device_creator;
		} else if (deviceInfo.deviceType == driver_constants.deviceTypes.digit) {
			deviceCreator = digit_device_creator;
		} else {
			console.warn('Creating a non-standard ljm device object', deviceInfo);
			deviceCreator = ljm_device_creator;
		}

		newDevice = new deviceCreator.createDevice(
			deviceInfo,
			deviceCallFunc,
			deviceSendFunc,
			self.closeDevice
		);

		self.devices[comKey] = newDevice;

		defered.resolve(newDevice);
		return defered.promise;
	};
	/**
	 * Open a connection to a device, pass an options object containing:
	 * @options {object} 
	 *          'deviceType': 'LJM_dtANY', 
	 *          'connectionType': 'LJM_ctANY', 
	 *          'identifier': 'LJM_idANY'
	 */
	this.openDevice = function(options) {
		var defered = q.defer();

		var handleError = function(err) {
			var innerDefered = q.defer();
			innerDefered.reject(err);
			return innerDefered.promise;
		};

		callFunc('openDevice', [options])
		.then(createDeviceObject, handleError)
		.then(defered.resolve, defered.reject);
		return defered.promise;
	};

	/**
	 * Close a connection to a device. Uses deleteDeviceReference helper 
	 * function to do the actual deleting of the device reference.
	 */
	var deleteDeviceReference = function(closeResult) {
		var defered = q.defer();
		var device_comm_key = closeResult.comKey;
		if(self.devices[device_comm_key]) {
			// Delete the device reference from the local devices listing.
			self.devices[device_comm_key] = null;
			self.devices[device_comm_key] = undefined;
			delete self.devices[device_comm_key];
			defered.resolve(closeResult);
		} else {
			defered.reject('invalid device_comm_key dev_con dDR');
		}
		return defered.promise;
	};
	this.closeDeviceRef = function(device) {
		var defered = q.defer();
		var comKey = device.savedAttributes.device_comm_key;
		self.closeDevice(comKey)
		.then(defered.resolve, defered.reject);
		return defered.promise;
	};
	this.closeDevice = function(device_comm_key) {
		var defered = q.defer();

		// Make sure that the device being closed is actually a device.
		if(self.devices[device_comm_key]) {
			// Send the close command to the sub-process.
			deviceCallFunc(device_comm_key, 'close')
			.then(deleteDeviceReference, deleteDeviceReference)
			.then(defered.resolve, defered.reject);
		} else {
			defered.reject('invalid device_comm_key dev_con cD');
		}
		return defered.promise;
	};

	/**
	 * Closes all connected devices.
	 */
	this.closeAllDevices = function() {
		var defered = q.defer();
		callFunc('closeAllDevices')
		.then(function(res) {
			var keys = Object.keys(self.devices);
			keys.forEach(deleteDeviceReference);
			defered.resolve(res);
		});
		
		return defered.promise;
	};

	
	/**
	 * Functions listed below are defined in the device object
	 */
	// this.open = function(deviceType, connectionType, identifier) {
	// 	return callFunc('open', [deviceType, connectionType, identifier]);
	// };
	// this.getHandleInfo = function() {
	// 	return callFunc('getHandleInfo');
	// };
	// this.readRaw = function(data) {
	// 	return callFunc('readRaw', [data]);
	// };
	// this.read = function(address) {
	// 	return callFunc('read', [address]);
	// };
	// this.readMany = function(addresses) {
	// 	return callFunc('readMany', [addresses]);
	// };
	// this.writeRaw = function(data) {
	// 	return callFunc('readRaw', [data]);
	// };
	// this.write = function(address, value) {
	// 	return callFunc('write', [address, value]);
	// };
	// this.writeMany = function(addresses, values) {
	// 	return callFunc('writeMany', [addresses, values]);
	// };
	// this.rwMany = function(addresses, directions, numValues, values) {
	// 	return callFunc('rwMany', [addresses, directions, numValues, values]);
	// };
	// this.readUINT64 = function(type) {
	// 	return callFunc('readUINT64', [type]);
	// };
	// this.close = function() {
	// 	return callFunc('close');
	// };

	var self = this;
}
util.inherits(createDeviceController, EventEmitter);

exports.createNewDeviceController = createDeviceController;
