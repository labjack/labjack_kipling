
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

	/*
	This error code indicates that a read was returned later than expected.
	*/
	'VALUE_WAS_DELAYED': 90001,

	/*
	No Error case
	*/
	'NO_ERROR': 0
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
	this.isValueLate = false;

	this.options = {
		/*
		If enabled the data collector will report values indicating that the
		device has an outstanding read to fill-space in spreadsheet files.  This
		also allows the logger to show users & allow users to log how long a 
		device is inactive for over the course of a logging session.
		*/
		REPORT_DEVICE_IS_ACTIVE_VALUES: true,

		/*
		If enabled the data colelctor will report register default values 
		instead of the actually collected value for values that get returned 
		later than they were supposed to.
		*/
		REPORT_DEFAULT_VALUES_WHEN_LATE: false,
	};

	/*
	This function allows the device_data_collector's options to be configured.
	*/
	this.configureDataCollector = function(newOptions) {
		var keys = Object.keys(newOptions);
		keys.forEach(function(key) {
			self.options[key] = newOptions[key];
		});
	};

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
	this.reportResults = function(results) {
		self.emit(EVENT_LIST.DATA, {
			'serialNumber': self.deviceSerialNumber,
			'results': results,
		});
	};

	/*
	Function that gets default register result values.
	*/
	this.getDefaultRegisterValue = function(registerName) {
		var val = 0;

		return val;
	};

	this.getCurrentTime = function() {
		return new Date();
	};

	this.getDefaultRegisterValues = function(registerList) {
		var dummyData = [];
		registerList.forEach(function(register, i) {
			dummyData.push(self.getDefaultRegisterValue(register));
		});
		return dummyData;
	};
	/*
	Function that reports data when the data isn't valid.
	*/
	this.reportDefaultRegisterData = function(registerList, errorCode, intervalTimerKey, timerKey, index) {
		
	
		var retData = {
			'registers': registerList,
			'results': self.getDefaultRegisterValues(registerList),
			'errorCode': errorCode,
			'time': self.getCurrentTime(),
			'duration': self.stopTimer(timerKey),
			'interval': self.getIntervalTimer(intervalTimerKey),
			'index': index,
		};

		self.reportResults(retData);
	};

	/*
	Function that reports data when the data is valid.
	*/
	this.reportCollectedData = function(registerList, results, errorCode, intervalTimerKey, timerKey, index) {
		var retData = {
			'registers': registerList,
			'results': results,
			'errorCode': errorCode,
			'time': self.getCurrentTime(),
			'duration': self.stopTimer(timerKey),
			'interval': self.getIntervalTimer(intervalTimerKey),
			'index': index,
		};

		if(errorCode === errorCodes.VALUE_WAS_DELAYED) {
			var reportDefaultVal = self.options.REPORT_DEFAULT_VALUES_WHEN_LATE;
			if(reportDefaultVal) {
				retData.results = self.getDefaultRegisterValues(registerList);
			}
		}
		self.reportResults(retData);
	};

	this.startTimes = {};
	this.startTimer = function(timerKey) {
		if(self.startTimes[timerKey]) {
			var i = 0;
			for(i = 0; i < 1000; i ++) {
				var newKey = timerKey + '-' + i.toString();
				if(typeof(self.startTimes[newKey]) === 'undefined') {
					timerKey = newKey;
					break;
				}
			}
		}
		self.startTimes[timerKey] = process.hrtime();

		return timerKey;
	};

	this.stopTimer = function(timerKey) {
		var diff = [0,0];

		if(self.startTimes[timerKey]) {
			diff = process.hrtime(self.startTimes[timerKey]);
			self.startTimes[timerKey] = undefined;
		}

		// Convert to Milliseconds
		var duration = diff[0] * 1000 + diff[1]/1000000;
		return duration;
	};

	this.callIntervals = {};
	this.getIntervalTimer = function(timerKey) {
		var diff = [0,0];

		if(self.callIntervals[timerKey]) {
			diff = process.hrtime(self.callIntervals[timerKey]);
		}
		self.callIntervals[timerKey] = process.hrtime();

		// Convert to Milliseconds
		var duration = diff[0] * 1000 + diff[1]/1000000;
		return duration;
	};
	/*
	Function that gets called by the data_collector when new data should be
	collected from the managed device.
	*/
	this.startNewRead = function(registerList, index) {
		// console.log('Starting New Read', self.isActive, index);
		var defered = q.defer();

		var intervalTimerKey = 'readMany';
		var timerKey = intervalTimerKey;
		timerKey = self.startTimer(timerKey);

		if(self.isValidDevice) {
			// Check to see if a device IO is currently pending.
			if(self.isActive) {
				/*
				If an IO is currently pending, don't start a new read and
				return a dummy value.
				*/
				// Report that the next value is a late-value.
				self.isValueLate = true;

				// Check to see if these values should be reported or if the
				// data collector should simply wait for new data.
				if(self.options.REPORT_DEVICE_IS_ACTIVE_VALUES) {
					// Report the device-still-active result.
					self.reportDefaultRegisterData(
						registerList,
						errorCodes.DEVICE_STILL_ACTIVE,
						intervalTimerKey,
						timerKey,
						index
					);
				}
				defered.resolve();
			} else {
				// Declare device to be actively reading data
				self.isActive = true;


				// errorCodes.VALUE_WAS_DELAYED
				// self.options.REPORT_DEFAULT_VALUES_WHEN_LATE

				// If an IO is not currently pending then start a new read.
				self.device.readMany(registerList)
				.then(function(results) {
					// console.log('readMany Results', registerList, results);

					if(self.isValueLate) {
						self.reportCollectedData(
							registerList,
							results,
							errorCodes.VALUE_WAS_DELAYED,
							intervalTimerKey,
							timerKey,
							index
						);
					} else {
						self.reportCollectedData(
							registerList,
							results,
							errorCodes.NO_ERROR,
							intervalTimerKey,
							timerKey,
							index
						);
					}

					// Declare device to be inactive.
					self.isActive = false;
				}, function(err) {
					console.log('readMany Error', err);
					self.reportDefaultRegisterData(
						registerList,
						err,
						intervalTimerKey,
						timerKey,
						index
					);

					// Declare device to be inactive.
					self.isActive = false;
				});
				defered.resolve();
			}
		} else {
			/*
			The device data collector isn't linked to a real device.  Return a
			dummy value.
			*/
			self.reportDefaultRegisterData(
				registerList,
				errorCodes.DEVICE_NOT_VALID,
				intervalTimerKey,
				timerKey,
				index
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

exports.EVENT_LIST = EVENT_LIST;
exports.errorCodes = errorCodes;