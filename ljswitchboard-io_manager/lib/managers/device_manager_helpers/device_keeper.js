
var process_manager = require('process_manager');
var q = require('q');
var async = require('async');


// var device_interface = require('../../single_device_interface');
// var device_delegator_path = './lib/delegators/single_device_delegator.js';

var labjack_nodejs = require('labjack-nodejs');
var constants = require('../../common/constants');
var device_generator = require('./device_generator');

function createDeviceKeeper(io_delegator, link) {
	var send = link.send;
	var sendMessage = link.sendMessage;

	var deviceSendMessage = function(deviceKey, message) {
		send({
			'deviceKey': deviceKey,
			'message': message
		});
	};
	
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

	var self = this;
}

exports.createDeviceKeeper = createDeviceKeeper;
