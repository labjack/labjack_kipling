

var async = require('async');
var dict = require('dict');
var q = require('q');
var driver_const = require('labjack-nodejs').driver_const;

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

/* T4 cal data sample...
  0.0003228967252653092,
  0.0003226623230148107,
  0.0003225223335903138,
  0.0003225999535061419,
  -10.487683296203613,
  -10.49667739868164,
  -10.473978996276855,
  -10.474691390991211,
  0.0000381646714231465,
  0.0005189368384890258,
  0,
  0,
  13248.3173828125,
  -425.10382080078125,
  13245.5849609375,
  -422.54327392578125,
  1,
  0,
  0,
  NaN,
  NaN,
  NaN,
  NaN,
  NaN,
  NaN,
  NaN,
  NaN,
  NaN,
  NaN,
  NaN,
  NaN,
  NaN,
  NaN,
  NaN,
  NaN,
  NaN,
  -92.5999984741211,
  467.6000061035156,
  NaN,
  NaN,
  NaN
*/

var T4_AIN0_SLOPE =   3.235316E-04;
var T4_AIN1_SLOPE =   3.236028E-04;
var T4_AIN2_SLOPE =   3.235439E-04;
var T4_AIN3_SLOPE =   3.236133E-04;
var T4_LV_SLOPE =     3.826692E-05;
var T4_SPECV_SLOPE = -3.839420E-05;
var T4_DAC0_SLOPE =   1.310768E+04;
var T4_DAC1_SLOPE =   1.310767E+04;
var T4_TEMP_SLOPE =  -9.260000E+01;
 
var T4_AIN0_OFFSET =   -10.532965;
var T4_AIN1_OFFSET =   -10.534480;
var T4_AIN2_OFFSET =   -10.530597;
var T4_AIN3_OFFSET =   -10.530210;
var T4_LV_OFFSET =       0.002484;
var T4_SPECV_OFFSET =    2.507430;
var T4_DAC0_OFFSET =    54.091066;
var T4_DAC1_OFFSET =    54.044314;
var T4_TEMP_OFFSET =   467.600000;
 
var T4_I_BIAS = 0.000000015;
 
// Variance - 3-sigma times 10
var T4_AIN_SLOPE_VARIANCE =   0.0394;
var T4_LV_SLOPE_VARIANCE =    0.0224;
var T4_SPECV_SLOPE_VARIANCE = 0.0220;
var T4_DAC0_SLOPE_VARIANCE =  0.0430;
var T4_DAC1_SLOPE_VARIANCE =  0.0433;
var T4_TEMP_SLOPE_VARIANCE =  0.01;
 
var T4_AIN_OFFSET_VARIANCE =    0.0330;
var T4_LV_OFFSET_VARIANCE =     4.8533;
var T4_SPECV_OFFSET_VARIANCE =  0.0205;
var T4_DAC0_OFFSET_VARIANCE =  11.6813;
var T4_DAC1_OFFSET_VARIANCE =  11.8758;
var T4_TEMP_OFFSET_VARIANCE =   0.01;

var T4_I_BIAS_VARIANCE = 3; // Arbitrarily high, not sure what the 3.0, 0.05 meant... {"I Bias",      I_BIAS, 3.0,  0.05}

var T4_NominalCalValues = [
    {"name": "Ch0 HV Slope", "nominal": T4_AIN0_SLOPE, "variance": T4_AIN_SLOPE_VARIANCE},    // 0
    {"name": "Ch0 HV Offset", "nominal": T4_AIN0_OFFSET, "variance": T4_AIN_OFFSET_VARIANCE}, // 4
    {"name": "Ch1 HV Slope", "nominal": T4_AIN1_SLOPE, "variance": T4_AIN_SLOPE_VARIANCE},    // 8
    {"name": "Ch1 HV Offset", "nominal": T4_AIN1_OFFSET, "variance": T4_AIN_OFFSET_VARIANCE}, // 12
    {"name": "Ch2 HV Slope", "nominal": T4_AIN2_SLOPE, "variance": T4_AIN_SLOPE_VARIANCE},    // 16
    {"name": "Ch2 HV Offset", "nominal": T4_AIN2_OFFSET, "variance": T4_AIN_OFFSET_VARIANCE}, // 20
    {"name": "Ch3 HV Slope", "nominal": T4_AIN3_SLOPE, "variance": T4_AIN_SLOPE_VARIANCE},    // 24
    {"name": "Ch3 HV Offset", "nominal": T4_AIN3_OFFSET, "variance": T4_AIN_OFFSET_VARIANCE}, // 28
    {"name": "LV Slope", "nominal": T4_LV_SLOPE, "variance": T4_LV_SLOPE_VARIANCE},      // 32
    {"name": "LV Offset", "nominal": T4_LV_OFFSET, "variance": T4_LV_OFFSET_VARIANCE},     // 36
    {"name": "SpecV Slope", "nominal": T4_SPECV_SLOPE, "variance": T4_SPECV_SLOPE_VARIANCE},                // 40
    {"name": "SpecV Offset", "nominal": T4_SPECV_OFFSET, "variance": T4_SPECV_OFFSET_VARIANCE},               // 44
    {"name": "DAC0 Slope", "nominal": T4_DAC0_SLOPE, "variance": T4_DAC0_SLOPE_VARIANCE},    // 48
    {"name": "DAC0 Offset", "nominal": T4_DAC0_OFFSET_VARIANCE, "variance": T4_DAC0_OFFSET_VARIANCE},   // 52
    {"name": "DAC1 Slope", "nominal": T4_DAC1_SLOPE, "variance": T4_DAC1_SLOPE_VARIANCE},    // 56
    {"name": "DAC1 Offset", "nominal": T4_DAC1_OFFSET_VARIANCE, "variance": T4_DAC1_OFFSET_VARIANCE},   // 60
    {"name": "Temp Slope", "nominal": T4_TEMP_SLOPE, "variance": T4_TEMP_SLOPE_VARIANCE}, // 64
    {"name": "Temp Offset", "nominal": T4_TEMP_OFFSET, "variance": T4_TEMP_OFFSET_VARIANCE}, // 68
    {"name": "I Bias", "nominal": T4_I_BIAS, "variance": 3, "varianceConstant": 0.05}, // 72
    {"name": "N/A"}, // 76
    {"name": "N/A"}, // 80
    {"name": "N/A"}, // 84
    {"name": "N/A"}, // 88
    {"name": "N/A"}, // 92
    {"name": "N/A"}, // 96
    {"name": "N/A"}, // 100
    {"name": "N/A"}, // 104
    {"name": "N/A"}, // 108
    {"name": "N/A"}, // 112
    {"name": "N/A"}, // 116
    {"name": "N/A"}, // 120
    {"name": "N/A"}, // 124
    {"name": "N/A"}, // 128
    {"name": "N/A"}, // 132
    {"name": "N/A"}, // 136
    {"name": "N/A"}, // 140
    {"name": "N/A"}, // 144
    {"name": "N/A"}, // 148
    {"name": "N/A"}, // 152
    {"name": "N/A"}, // 156
    {"name": "N/A"}, // 160
];

var NOMINAL_CALIBRATION_VALUES = {
    'T7': T7_NominalCalValues,
    'T4': T4_NominalCalValues,
};

var T7_HIGH_RESOLUTION_START_INDEX = 16;
var T7_HIGH_RESOLUTION_END_INDEX = 31;


var getInvalidCalibrationValues = function (deviceTypeName, checkHighRes, calValues) {
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
    var nomCalValues = NOMINAL_CALIBRATION_VALUES[deviceTypeName];
    // console.log('Loaded nomCalValues', nomCalValues);
    // console.log('Loaded calValues', calValues);

    nomCalValues.forEach(function(nominalVal, index) {
        var min, max, absPlusMinus, name, nominal, variance, varianceConstant;
        name = nominalVal.name;
        nominal = nominalVal.nominal;
        variance = nominalVal.variance;

        if(typeof(nominalVal.varianceConstant) === 'undefined') {
            varianceConstant = 0;
        } else {
            varianceConstant = nominalVal.varianceConstant;
        }
        
        if(name !== 'N/A') {
            // console.log('Testing Cal Val', name, nominal, calValues[index]);
            if(deviceTypeName === 'T7') {
                if (!checkHighRes && (index >= T7_HIGH_RESOLUTION_START_INDEX) && (index <= T7_HIGH_RESOLUTION_END_INDEX)) {
                    // console.log('Skipping', isPro, index, nominalVal.name);
                } else {
                    // console.log('Checking', isPro, index, nominalVal.name);
                    absPlusMinus = Math.abs(nominal * variance);
                    min = nominal - absPlusMinus;
                    max = nominal + absPlusMinus;

                    if (!withinRange(calValues[index], min, max)) {
                        // console.log('Val not w/in range.', calValues[index], min, max)
                        badCals.push(name);
                    }
                }
            } else if(deviceTypeName === 'T4') {
                absPlusMinus = Math.abs(nominal * variance + varianceConstant);
                min = nominal - absPlusMinus;
                max = nominal + absPlusMinus;
                // console.log('Testing Cal Val', name, nominal, calValues[index]);
                // console.log('min',min);
                // console.log('max',max);
                if (!withinRange(calValues[index], min, max)) {
                    // console.log('Testing Cal Val', name, nominal, calValues[index]);
                    // console.log(name, 'Val not w/in range.', calValues[index], min, max);
                    badCals.push(name);
                }
            }
        }
    });

    return badCals;
};
var getInterpretFlashResults = function(curatedDevice) {
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

        // console.log('Calibration Flash Results:', data, floatingPointData);

        // Check the values to see if they are valid
        var checkHighRes = false;
        try {
            checkHighRes = curatedDevice.savedAttributes.HARDWARE_INSTALLED.highResADC;
        } catch(err) {
            checkHighRes = false;
        }
        var deviceTypeName = curatedDevice.savedAttributes.deviceTypeName;
        // console.log('Checking values', deviceTypeName, checkHighRes, floatingPointData);
        var calCheckResult = getInvalidCalibrationValues(deviceTypeName, checkHighRes, floatingPointData);
        // console.log('Result:',calCheckResult)
        var calibrationStatus;
        // If there are any invalid values set calibration validity to be false
        if(calCheckResult.length > 0) {
            calibrationStatus = {
                'overall': false,
                'flashVerification': false,
                'ainVerification': false,
                'message': 'Device Calibration is Bad',
                'shortMessage': 'Bad',
            };
        } else {
            calibrationStatus = {
                'overall': true,
                'flashVerification': true,
                'ainVerification': false,
                'message': 'Device Calibration is Good',
                'shortMessage': 'Good',
            };
        }
        // return the device object
        defered.resolve(calibrationStatus);
        return defered.promise;
    };
    return interpretFlashResults;
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
        if(curatedDevice.savedAttributes.FIRMWARE_VERSION > driver_const.T7_LIMITED_FW_VERSION) {
            return curatedDevice.qWriteMany(
                ['AIN0_RANGE', 'AIN0_RESOLUTION_INDEX', 'AIN0_SETTLING_US'],
                [10, 1, 0]
                );
        } else {
            return curatedDevice.writeMultiple(
                ['AIN0_RANGE', 'AIN0_RESOLUTION_INDEX', 'AIN0_SETTLING_US'],
                [10,1, 0]
                );
        }
    };
    var getInitial = function() {
        var defered = q.defer();
        if(curatedDevice.savedAttributes.FIRMWARE_VERSION > driver_const.T7_LIMITED_FW_VERSION) {
            curatedDevice.readMany(ainList)
            .then(function(res) {
                res.forEach(function(reading) {
                    if(reading !== 0) {
                        highSpeedStatus = true;
                    }
                });
                defered.resolve();
            }, defered.reject);
        } else {
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
        }
        return defered.promise;
    };
    var configSecondary = function() {
        if(curatedDevice.savedAttributes.isPro) {
            if(curatedDevice.savedAttributes.FIRMWARE_VERSION > driver_const.T7_LIMITED_FW_VERSION) {
                return curatedDevice.qWriteMany(
                    ['AIN0_RANGE', 'AIN0_RESOLUTION_INDEX', 'AIN0_SETTLING_US'],
                    [10, 9, 0]
                    );
            } else {
                return curatedDevice.writeMultiple(
                    ['AIN0_RANGE', 'AIN0_RESOLUTION_INDEX', 'AIN0_SETTLING_US'],
                    [10, 9, 0]
                    );
            }
        } else {
            var defered = q.defer();
            defered.resolve();
            return defered.promise;
        }
        
    };
    var getSecondary = function() {
        var defered = q.defer();
        if(curatedDevice.savedAttributes.isPro) {
            if(curatedDevice.savedAttributes.FIRMWARE_VERSION > driver_const.T7_LIMITED_FW_VERSION) {
                curatedDevice.readMany(ainList)
                .then(function(res) {
                    res.forEach(function(reading) {
                        if(reading !== 0) {
                            highResStatus = true;
                        }
                    });
                    defered.resolve();
                }, defered.reject);
            } else {
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
            }
        } else {
            defered.resolve();
        }
        return defered.promise;

    };
    var restoreConfig = function() {
        if(curatedDevice.savedAttributes.FIRMWARE_VERSION > driver_const.T7_LIMITED_FW_VERSION) {
            return curatedDevice.qWriteMany(
                ['AIN0_RANGE', 'AIN0_RESOLUTION_INDEX', 'AIN0_SETTLING_US'],
                [
                    currentAINConfig.AIN0_RANGE,
                    currentAINConfig.AIN0_RESOLUTION_INDEX,
                    currentAINConfig.AIN0_SETTLING_US
                ]
            );
        } else {
            return curatedDevice.writeMultiple(
                ['AIN0_RANGE', 'AIN0_RESOLUTION_INDEX', 'AIN0_SETTLING_US'],
                [
                    currentAINConfig.AIN0_RANGE,
                    currentAINConfig.AIN0_RESOLUTION_INDEX,
                    currentAINConfig.AIN0_SETTLING_US
                ]
            );
        }
    };

    var getAndInterpret = function(calibrationStatus) {
        var defered = q.defer();
        if(curatedDevice.savedAttributes.FIRMWARE_VERSION > driver_const.T7_LIMITED_FW_VERSION) {
            
            var getErr = function(msg) {
                return function(err) {
                    console.log('AIN Cal Check Error', msg, err);
                    defered.reject(calibrationStatus);
                };
            };
            saveCurrentConfig()
            .then(configInitial, getErr('saveCurrentConfig'))
            .then(getInitial, getErr('configInitial'))
            .then(configSecondary, getErr('getInitial'))
            .then(getSecondary, getErr('configSecondary'))
            .then(restoreConfig, getErr('getSecondary'))
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
                    calibrationStatus.message = 'Device Calibration is Good';
                    calibrationStatus.shortMessage = 'Good';
                }
                calibrationStatus.ainVerification = isValid;

                defered.resolve(calibrationStatus);
            }, getErr('restoreConfig'));
        } else {
            defered.resolve(calibrationStatus);
        }
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
    // console.log('in t7_calibration_operations.js getDeviceCalibrationStatus');
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
    // console.log('In get cal status', T7_NominalCalValues.length);
    curatedDevice.readFlash(0x3C4000, 41)
    .then(getInterpretFlashResults(curatedDevice), getErrFunc('readingFlash'))
    .then(getAndInterpretAINResults(curatedDevice), getErrFunc('interpretingFlashResults'))
    .then(defered.resolve, defered.reject);
    return defered.promise;
};


