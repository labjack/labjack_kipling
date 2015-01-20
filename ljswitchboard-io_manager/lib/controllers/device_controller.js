
var constants = require('../common/constants');
var q = require('q');
var io_endpoint_key = constants.device_endpoint_key;
// var ljm_device_controller = require('./device_helpers/ljm_device');
// var device_keeper = require('./device_helpers/device_keeper');

function createDeviceController(io_interface) {

	var callFunc = null;
	var sendReceive = null;
	var sendMessage = null;
	var send = null;

	var deviceKeeper = null;

	var listener = function(m) {
		console.log('in driver_controller.js-listener', m);
	};
	var saveLink = function(link) {
		var defered = q.defer();

		callFunc = link.callFunc;
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

		io_interface.establishLink(io_endpoint_key, listener)
		.then(saveLink)
		.then(defered.resolve);
		return defered.promise;
	};

	this.createDeviceObject = function(sameProcess, mockDevice) {
		return callFunc('createDeviceObject', [sameProcess, mockDevice]);
	};
	this.destroyDeviceObject = function() {
		return callFunc('destroyDeviceObject');
	};

	/**
	 * Return a commonly acquired set of device attributes commonly used to
	 * generate the header-box of various modules
	 * 	   isSelected
	 *     isActive
	 *     isLocked
	 *     serialNumber
	 *     deviceType
	 *     hardwareInstalled
	 *     deviceName
	 *     firmwareVersion
	 *     handleInfo (from getHandleInfo)
	 */
	this.getDeviceAttributes = function() {
		return callFunc('getDeviceAttributes');
	};

	/**
	 * Get a list of devices currently visible by the caller.
	 * @return {Array} An array of found devices and various attributes.
	 */
	this.listAllDevices = function() {
		return callFunc('listAllDevices');
	};

	/**
	 * Get the device_manager's handle for a connected device.
	 */
	var getDeviceHandle = function(options) {
		return callFunc('getDeviceHandle', [options]);
	};

	/**
	 * Gets handles for all of the connected devices.
	 */
	var getDeviceHandles = function() {
		return callFunc('getDeviceHandles');
	};

	/**
	 * Create a device object that can be used to talk with the device manager's
	 * device.
	 */
	this.getDevice = function(options) {
		var defered = q.defer();
		getDeviceHandle()
		.then(defered.resolve, defered.reject);
		return defered.promise;
	};

	
	/**
	 * Create several device objects that can be used to talk with the device 
	 * manager.
	 */
	this.getDevices = function() {
		var defered = q.defer();
		getDeviceHandles()
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
	 * Open a connection to a device, pass an options object containing:
	 * @options {object} 
	 *          'deviceType': 'LJM_dtANY', 
	 *          'connectionType': 'LJM_ctANY', 
	 *          'identifier': 'LJM_idANY'
	 */
	this.openDevice = function(options) {
		var defered = q.defer();
		callFunc('openDevice', [options])
		// .then(createDeviceObject, defered.reject)
		.then(defered.resolve, defered.reject);
		return defered.promise;
	};

	/**
	 * Close a connection to a device, pass an options object containing:
	 * @options {object} 
	 *          'deviceType': 'LJM_dtANY', 
	 *          'connectionType': 'LJM_ctANY', 
	 *          'identifier': 'LJM_idANY'
	 */
	this.closeDevice = function(options) {
		callFunc('openDevice', [options])
		.then(defered.resolve, defered.reject);
		return;
	};

	/**
	 * Closes all connected devices.
	 */
	this.closeAllDevices = function() {
		return callFunc('closeAllDevices');
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

exports.createNewDeviceController = createDeviceController;
