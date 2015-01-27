

var async = require('async');
var dict = require('dict');
var q = require('q');


var T7_NominalCalValues = [
    {"name": "HS 10.0V PSlope", "nominal": 0.000315805780, "variance": 0.05},
    {"name": "HS 10.0V NSlope", "nominal": -0.000315805800, "variance": 0.05},
    {"name": "HS 10.0V Center", "nominal": 33523.0, "variance": 0.05},
    {"name": "HS 10.0V Offset", "nominal": -10.586956522, "variance": 0.05},
    {"name": "HS 1.00V PSlope", "nominal": 0.000031580578, "variance": 0.05},
    {"name": "HS 1.00V NSlope", "nominal": -0.000031580600, "variance": 0.05},
    {"name": "HS 1.00V Center", "nominal": 33523.0, "variance": 0.05},
    {"name": "HS 1.00V Offset", "nominal": -1.0586956522, "variance": 0.05},
    {"name": "HS 0.10V PSlope", "nominal": 0.000003158058, "variance": 0.05},
    {"name": "HS 0.10V NSlope", "nominal": -0.000003158100, "variance": 0.05},
    {"name": "HS 0.10V Center", "nominal": 33523.0, "variance": 0.05},
    {"name": "HS 0.10V Offset", "nominal": -0.1058695652, "variance": 0.05},
    {"name": "HS 0.01V PSlope", "nominal": 0.000000315806, "variance": 0.05},
    {"name": "HS 0.01V NSlope", "nominal": -0.000000315800, "variance": 0.05},
    {"name": "HS 0.01V Center", "nominal": 33523.0, "variance": 0.05},
    {"name": "HS 0.01V Offset", "nominal": -0.0105869565, "variance": 0.05},
    {"name": "HR 10.0V PSlope", "nominal": 0.000315805780, "variance": 0.5},
    {"name": "HR 10.0V NSlope", "nominal": -0.000315805800, "variance": 0.5},
    {"name": "HR 10.0V Center", "nominal": 33523.0, "variance": 0.5},
    {"name": "HR 10.0V Offset", "nominal": -10.586956522, "variance": 0.5},
    {"name": "HR 1.00V PSlope", "nominal": 0.000031580578, "variance": 0.5},
    {"name": "HR 1.00V NSlope", "nominal": -0.000031580600, "variance": 0.5},
    {"name": "HR 1.00V Center", "nominal": 33523.0, "variance": 0.5},
    {"name": "HR 1.00V Offset", "nominal": -1.0586956522, "variance": 0.5},
    {"name": "HR 0.10V PSlope", "nominal": 0.000003158058, "variance": 0.5},
    {"name": "HR 0.10V NSlope", "nominal": -0.000003158100, "variance": 0.5},
    {"name": "HR 0.10V Center", "nominal": 33523.0, "variance": 0.5},
    {"name": "HR 0.10V Offset", "nominal": -0.1058695652, "variance": 0.5},
    {"name": "HR 0.01V PSlope", "nominal": 0.000000315806, "variance": 0.5},
    {"name": "HR 0.01V NSlope", "nominal": -0.000000315800, "variance": 0.5},
    {"name": "HR 0.01V Center", "nominal": 33523.0, "variance": 0.5},
    {"name": "HR 0.01V Offset", "nominal": -0.0105869565, "variance": 0.5},
    {"name": "DAC0 Slope", "nominal": 13200.0, "variance": 0.05},
    {"name": "DAC0 Offset", "nominal": 100, "variance": 2.00},
    {"name": "DAC1 Slope", "nominal": 13200.0, "variance": 0.05},
    {"name": "DAC1 Offset", "nominal": 100, "variance": 2.00},
    {"name": "Temp Slope", "nominal": -92.379, "variance": 0.01},
    {"name": "Temp Offset", "nominal": 465.129215, "variance": 0.01},
    {"name": "IS 10uA", "nominal": 0.000010, "variance": 0.05},
    {"name": "IS 200uA", "nominal": 0.000200, "variance": 0.05},
    {"name": "I Bias", "nominal": 0.000000015, "variance": 3.0}
];

var T7_HIGH_RESOLUTION_START_INDEX = 16;


var getInvalidCalibrationValues = function (subclass, calValues) {
    var withinRange = function(calValue, min, max) {
        if (isNaN(calValue)) {
            return false;
        }
        if (calValue <= min) {
            return false;
        }
        if (calValue >= max) {
            return false;
        }
        return true;
    };
    var badCals = [];
    T7_NominalCalValues.forEach(function(nominalVal, index) {
        var min, max, absPlusMinus;
        var isPro = (subclass === 'Pro');
        if (!isPro && (index >= T7_HIGH_RESOLUTION_START_INDEX)) {
            return badCals;
        }

        absPlusMinus = Math.abs(nominalVal.nominal * nominalVal.variance);
        min = nominalVal.nominal - absPlusMinus;
        max = nominalVal.nominal + absPlusMinus;

        if (!withinRange(calValues[index], min, max)) {
            badCals.push(nominalVal.name);
        }
    });

    return badCals;
};

var interpretFlashResults = function(data) {
    var defered = q.defer();
    // Convert the read calibration data to floating point values
    var floatingPointData = [];
    data.results.forEach(function(result){
        var buf = new Buffer(4);
        buf.writeUInt32BE(result,0);
        var floatVal = buf.readFloatBE(0);
        floatingPointData.push(floatVal);
    });

    // Check the values to see if they are valid
    var deviceSubClass = 'Pro';
    var calCheckResult = getInvalidCalibrationValues(deviceSubClass, floatingPointData);
    var calibrationStatus;
    // If there are any invalid values set calibration validity to be false
    if(calCheckResult.length > 0) {
        calibrationStatus = {
            'overall': false,
            'flashVerification': false,
            'ainVerification': false
        };
    } else {
        calibrationStatus = {
            'overall': true,
            'flashVerification': true,
            'ainVerification': false
        };
    }
    // return the device object
    defered.resolve(calibrationStatus);
    return defered.promise;
};




var getAndInterpretAINResults = function(curatedDevice) {
    var currentAINConfig = {
        'AIN0_RANGE': 10,
        'AIN0_RESOLUTION_INDEX': 0,
        'AIN0_SETTLING_US': 0
    };
    var ainList = [];
    for(var i = 0; i < 5; i++) {
        ainList.push('AIN0');
    }
    var highSpeedStatus = false;
    var highResStatus = false;
    var saveCurrentConfig = function() {
        var defered = q.defer();
        curatedDevice.qReadMany(
            ['AIN0_RANGE', 'AIN0_RESOLUTION_INDEX', 'AIN0_SETTLING_US']
        ).then(function(res) {
            currentAINConfig.AIN0_RANGE = res[0];
            currentAINConfig.AIN0_RESOLUTION_INDEX = res[1];
            currentAINConfig.AIN0_SETTLING_US = res[2];
            defered.resolve();
        }, defered.reject);
        return defered.promise;
    };
    var configInitial = function() {
        return curatedDevice.qWriteMany(
            ['AIN0_RANGE', 'AIN0_RESOLUTION_INDEX', 'AIN0_SETTLING_US'],
            [10, 1, 0]
        );
    };
    var getInitial = function() {
        var defered = q.defer();
        curatedDevice.readMultiple(ainList)
        .then(function(res) {

            res.forEach(function(reading) {
                if(!reading.isErr) {
                    if(reading.data !== 0) {
                        highSpeedStatus = true;
                    }
                }
            });
            defered.resolve();
        }, defered.reject);
        return defered.promise;
    };
    var configSecondary = function() {
        if(curatedDevice.savedAttributes.isPro) {
            return curatedDevice.qWriteMany(
                ['AIN0_RANGE', 'AIN0_RESOLUTION_INDEX', 'AIN0_SETTLING_US'],
                [10, 9, 0]
            );
        } else {
            var defered = q.defer();
            defered.resolve();
            return defered.promise;
        }
        
    };
    var getSecondary = function() {
        var defered = q.defer();

        if(curatedDevice.savedAttributes.isPro) {
            curatedDevice.readMultiple(ainList)
            .then(function(res) {
                res.forEach(function(reading) {
                    if(!reading.isErr) {
                        if(reading.data !== 0) {
                            highResStatus = true;
                        }
                    }
                });
                defered.resolve();
            }, defered.reject);
        } else {
            defered.resolve();
        }
        return defered.promise;

    };
    var restoreConfig = function() {
        return curatedDevice.qWriteMany(
            ['AIN0_RANGE', 'AIN0_RESOLUTION_INDEX', 'AIN0_SETTLING_US'],
            [
                currentAINConfig.AIN0_RANGE,
                currentAINConfig.AIN0_RESOLUTION_INDEX,
                currentAINConfig.AIN0_SETTLING_US
            ]
        );
    };

    var getAndInterpret = function(calibrationStatus) {
       var defered = q.defer();

       saveCurrentConfig()
       .then(configInitial)
       .then(getInitial)
       .then(configSecondary)
       .then(getSecondary)
       .then(restoreConfig)
       .then(function() {
            var isValid = true;
            if(!highSpeedStatus) {
                isValid = false;
            }
            if(curatedDevice.savedAttributes.isPro) {
                if(!highResStatus) {
                    isValid = false;
                }
            }
            if(isValid) {
                calibrationStatus.overall = true;
            }
            calibrationStatus.ainVerification = isValid;

            defered.resolve(calibrationStatus);
       });
        return defered.promise; 
    };
    return getAndInterpret;
};

/**
 * Determines if the calibration on a connected device is valid or not.
 *
 * @param {Device} device The object that represents a LJ device.
 * @param {function} onSuccess The function callback used to report data.
**/
exports.getDeviceCalibrationStatus = function(curatedDevice) {
    var defered = q.defer();

    var getErrFunc = function(msg) {
        var errFunc = function(err) {
            console.log('in getDeviceCalibrationStatus, error', err, msg);
            defered.reject(err);
        };
        return errFunc;
    };
    // Read the calibration of a device, starting at memory address 0x3C4000 hex 
    // and reading 41*4 bytes of data.  Aka read 41 integers (4 bytes each) 
    // worth of data.
    curatedDevice.readFlash(0x3C4000, 41)
    .then( interpretFlashResults, getErrFunc('readingFlash'))
    .then(getAndInterpretAINResults(curatedDevice), getErrFunc('interpretingFlashResults'))
    .then(defered.resolve, defered.reject);
    return defered.promise;
};


