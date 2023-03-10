var EventEmitter = require('events').EventEmitter;
var unit = require('util');
var q = require('q');

var EVENT_LIST = {
    DATA: 'DATA',
    ERROR: 'ERROR',
};

var errorCodes = require('./error_codes').errorCodes;

// object creation function for device_data_collector
function CREATE_DATA_COLLECTOR(){
    this.device = undefined;
    this.devices = undefined;
    this.deviceSerialNumber = undefined;

    this.isValidDevice = false;
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
    }

    // This function allows the device_data_collector's options to be configured.
    // Zander - this function may not need to be here
    this.configureDataCollector = function(newOptions) {
        var keys = Object.keys(newOptions);
        keys.forEach(function(key) {
            this.options[key] = newOptions[key];
        });
    };

    /*
	This function updates the device_data_collector's internal devices
	device-listing reference.  This essentially allows a device that doesn't exist
	to be logged from and properly return errors.
	*/
    this.updateDeviceListing = function(devices) {
        var defered = q.defer();
        this.devices = devices;
        defered.resolve(devices);
        return defered.promise
    }

    /*
	This function looks through the list of available devices to see if a valid
	device is connected.  This essentially allows a device that doesn't exist
	to be logged from and properly return errors.
	*/
    this.linkToDevice = function(deviceSerialNumber) {
        var defered = q.defer();
        var serialNum = parseInt(deviceSerialNumber);

        // save a refrence to the device serial number
        this.deviceSerialNumber = serialNum;

        // this should liik to make sure that the device that is conected it the one that is being used
        // Zander - make sure this is working when everything is in place
        if(device.savedAttributes.serialNumber == serialNum) {
            this.isValidDevice = true;
            this.device = device;
            return true;
        }

        defered.resolve();
        return defered.promise;
    }

    // Function that reports collected via emitting a data event
    this.reportResults = function(results){
        self.emit(EVENT_LIST.DATA, {
            'serialNumber': self.deviceSerialNumber,
            'results': results,
        });
    }

    this.getDefaultRegisterValue = function(registerName) {
        var val = 0;
        return val;
    }

    // ZANDER - MAKE SURE THAT WE USE HR TIME WHEN THIS IS CALLED
    this.getCurrentTime = function() {
        return process.hrtime();
    }

    this.getDefaultRegisterValueS = function(registerList) {
        var dummyData = []; 
        registerList.forEach(function(register){
            dummyData.push(this.getDefaultRegisterValue(register));
        });
        return dummyData;
    }

    // Function that reports data when the data isn't valid.
    this.reportDefaultRegisterData = function(registerList, errorCode, intervalTimerKey, timerKey, index) {
        var retData = {
            'registers': registerList,
            'results': this.getDefaultRegisterValue(registerList),
            'errorCode': errorCode,
            'time': this.getCurrentTime,
            'duration': this.stopTimer(timerKey),
            'interval': this.getIntervalTimer(intervalTimerKey),
            'index': index,
        };

        this.reportResults(retData);
    };

    // Function that reports data when the data is valid.
    this.reportCollectedData = function(registerList, results, errorCode, intervalTimerKey, timerKey, index){
        var retData = {
            'registers':registerList,
            'results': results,
            'errorCode': errorCode,
            'time': self.getCurrentTime(),
            'duration': this.stopTimer(),
            'interval': this.getIntervalTimer(intervalTimerKey),
            'index': index,
        };

        if(errorCode === errorCodes.VALUE_WAS_DELAYED) {
            var reportDefaultVal = self.options.REPORT_DEFAULT_VALUES_WHEN_LATE;
            if(reportDefaultVal) {
                retData.results = self.getDefaultRegisterValue(registerList);
            }
        }
        self.reportResults(retData);
    };

    this.startTimes = {};
    this.startTimer = function(timerKey) {
        if(self.startTimes[timerKey]){
            for(var i = 0; i < 1000; i++){
                var newKey = timerKey + '-' + i.toString();
                if(typeof(self.startTimes[nowKey]) === 'undefined') {
                    timerKey = newKey;
                    break;
                }
            }
        }
        self.startTimes[timerKey] = process.hrtime;

        return timerKey;
    }

    this.stopTimer = function(timerKey) {
        var diff = [0,0];

        if(self.startTimes[timerKey]){
            diff = process.hrtime(self.startTimes[timerKey]);
            self.startTimes[timerKey] = undefined;
        }

        // this will convert hrtime to millaseconds
        var duration = diff[0] * 1000 + diff[1]/1000000;
        return duration;
    }

    this.callIntervals = {};
    this.getIntervalTimer = function(timerKey) {
        var diff = [0,0];

        if(self.callIntervals[timerKey]) {
            diff = process.hrtime(self.callIntervals[timerKey]);
        }
        self.callIntervals[timerKey] = process.hrtime();

        // this will convert hrtime to millaseconds
        var duration = diff[0] * 1000 + diff[1]/1000000;
        return duration;
    }

    // this function will be called in "data_collector" when new data should be collected from the device
    this.startNewRead = function(registerList, index) {
        var defered = q.defer();

        var intervalTimerKey = 'readMany';
        var timerKey = self.startTimer(intervalTimerKey);

        if(this.isValidDevice) {
            // check to see if a device IO is currently pending
            if(this.isActive){
                // if an IO is pending don't start new read and return a dummy value & report
                // that the next value is a late value.
                self.isActive = true
                // check to see if theys calues should be reported of if the data should wait for new data
                if(this.options.REPORT_DEFAULT_VALUES_WHEN_LATE) {
                    // this is when the device is still active somewhere else.
                    self.reportDefaultRegisterData(
                        registerList,
                        errorCodes.DEVICE_STILL_ACTIVE,
                        intervalTimerKey,
                        timerKey,
                        index,
                    );
                }
                defered.resolve();
            }
            else {
                self.isActive = true;

                this.device.readMany(registerList)
                .then(function(results) {
                    if(self.isValueLate) {
                        self.reportCollectedData(
                            registerList,
                            results,
                            errorCodes.VALUE_WAS_DELAYED,
                            intervalTimerKey,
                            timerKey,
                            index,
                        );
                    } else {
                        self.reportCollectedData(
                            registerList,
                            results,
                            errorCodes.NO_ERROR,
                            intervalTimerKey,
                            timerKey,
                            index,
                        );
                    }

                    // make sure that when this part of the code is done that it resets it back to
                    // not active so we can start a new log next
                    self.isActive = false;
                }, function(err) {
                    console.error('readMany Error', err);
                    self.reportDefaultRegisterData(
                        registerList,
                        err,
                        intervalTimerKey,
                        timerKey,
                        index,
                    );

                    // declare the device as inactive
                    self.isActive = false;
                });
                defered.resolve();
            }
        } else {
            // The device data collector isn't linked to a real device. retun a dummy value.
            self.reportDefaultRegisterData(
                registerList,
                errorCodes.DEVICE_NOT_VALID,
                intervalTimerKey,
                timerKey,
                index,
            )
            defered.resolve();
        }
        return defered.promise;
    };
}

util.inherits(CREATE_DATA_COLLECTOR, EventEmitter);

exports.createDeviceDataCollector = function() {
    return new CREATE_DATA_COLLECTOR();
}

exports.EVENT_LIST = EVENT_LIST;
exports.errorCodes = errorCodes;

