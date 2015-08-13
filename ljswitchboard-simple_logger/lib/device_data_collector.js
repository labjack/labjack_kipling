
var EventEmitter = require('events').EventEmitter;
var util = require('util');
var q = require('q');

var EVENT_LIST = {
	DATA: 'DATA',
	ERROR: 'ERROR',
};

var errorCodes = {
	/*
	This error code defines LJM's error code:
	LJME_DEVICE_NOT_OPEN: 1224, The requested handle did not refer to an
	open device.
	*/
	'DEVICE_NOT_VALID': 1224,

	/*
	This error code indicates that a read was requested while one is currently
	pending.   These errors will occur commonly when a read is taking a long
	time or if we are trying to read to quickly.

	Chose to use the same error code as LJM's error code:
	LJME_MBE6_SLAVE_DEVICE_BUSY: 1206, The device is busy and cannot respond 
	currently.
	*/
	'DEVICE_STILL_ACTIVE': 1206,
};


/*
Object creation function for the device data collector.
*/
function CREATE_DEVICE_DATA_COLLECTOR () {
	this.devices = undefined;

	this.isValidDevice = false;
	this.device = undefined;
	this.deviceSerialNumber = undefined;

	this.isActive = false;

	/*
	This function updates the device_data_collector's internal devices
	device-listing reference.  This essentially allows a device that doesn't exist
	to be logged from and properly return errors.
	*/
	this.updateDeviceListing = function(devices) {
		var defered = q.defer();
		self.devices = devices;
		defered.resolve(devices);
		return defered.promise;
	};

	/*
	This function looks through the list of available devices to see if a valid
	device is connected.  This essentially allows a device that doesn't exist
	to be logged from and properly return errors.
	*/
	this.linkToDevice = function(deviceSerialNumber) {
		var defered = q.defer();

		// Save a reference to the devices serial number
		self.deviceSerialNumber = deviceSerialNumber;

		// Loop through the devices object and try to link to the device with
		// the desired serial number.
		var isFound = self.devices.some(function(device) {
			if(device.savedAttributes.serialNumber == deviceSerialNumber) {
				self.isValidDevice = true;
				self.device = device;
				return true;
			}
		});

		defered.resolve();
		return defered.promise;
	};

	/*
	Function that reports collected via emitting a data event.
	*/
	this.reportResults = function(results, errorCode) {
		self.emit(EVENT_LIST.DATA, {
			'results': results,
			'errorCode': errorCode
		});
	};

	/*
	Function that gets default register result values.
	*/
	this.getDefaultRegisterValue = function(registerName) {
		var val = 0;

		return val;
	};

	/*
	Function that reports data when the device isn't valid.
	*/
	this.reportDeviceNotValid = function(registerList, errorCode) {
		var dummyData = [];
		registerList.forEach(function(register) {
			dummyData.push(self.getDefaultRegisterValue(register));
		});

		self.reportResults(dummyData, errorCode);
	};

	/*
	Function that gets called by the data_collector when new data should be
	collected from the managed device.
	*/
	this.startNewRead = function(registerList) {
		var defered = q.defer();

		if(self.isValidDevice) {
			// Check to see if a device IO is currently pending.
			if(self.isActive) {
				/*
				If an IO is currently pending, don't start a new read and
				return a dummy value.
				*/
				self.reportDeviceNotValid(
					registerList,
					errorCodes.DEVICE_STILL_ACTIVE
				);
				defered.resolve();
			} else {
				// If an IO is not currently pending then start a new read.
				self.device.readMany(registerList)
				.then(function(results) {
					console.log('readMany Results', registerList, results);
				}, function(err) {
					console.log('readMany Error', err);
				});
				defered.resolve();
			}
		} else {
			/*
			The device data collector isn't linked to a real device.  Return a
			dummy value.
			*/
			self.reportDeviceNotValid(
				registerList,
				errorCodes.DEVICE_NOT_VALID
			);
			defered.resolve();
		}
		return defered.promise;
	};

	var self = this;
}

// The device data collector is an event-emitter.
util.inherits(CREATE_DEVICE_DATA_COLLECTOR, EventEmitter);

// Exported function that creates a new device data collector object.
exports.createDeviceDataCollector = function() {
	return new CREATE_DEVICE_DATA_COLLECTOR();
};