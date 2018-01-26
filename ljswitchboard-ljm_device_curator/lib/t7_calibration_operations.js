

var async = require('async');
var dict = require('dict');
var q = require('q');
var driver_const = require('labjack-nodejs').driver_const;
var stats = require('stats-lite');

var DEBUG_HW_TESTS = false;
var ENABLE_ERROR_OUTPUT = false;
function getLogger(bool) {
    return function logger() {
        if(bool) {
            console.log.apply(console, arguments);
        }
    };
}
var dbgHWTest = getLogger(DEBUG_HW_TESTS);
var printErrorInfo = getLogger(ENABLE_ERROR_OUTPUT);


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


function configureAndGetValue(device, ainNum, ainRange, ainResolution, ainSettling, getRaw) {
    var defered = q.defer();
    var result = 0;
    var isError = false;

    var ainNumStr = ainNum.toString();
    var configRegisters = [
        'AIN' + ainNumStr + '_RANGE',
        'AIN' + ainNumStr + '_RESOLUTION_INDEX',
        'AIN' + ainNumStr + '_SETTLING_US',
    ];
    var configVals = [ainRange, ainResolution, ainSettling];
    var ainReg = 'AIN' + ainNumStr;
    if(getRaw) {
        ainReg += '_BINARY';
    }
    var retInfo = {
        name: ainReg,
        value: 0,
        isError: false,
    };
    function onSuccess() {
        defered.resolve(retInfo);
    }
    function onError() {
        defered.reject(retInfo);
    }
    function configDevice() {
        var innerDefered = q.defer();
        if(device.savedAttributes.FIRMWARE_VERSION > driver_const.T7_LIMITED_FW_VERSION) {
            device.iWriteMany(configRegisters,configVals)
            .then(function(res) {
                innerDefered.resolve();
            }, function(err) {
                retInfo.isError = true;
                innerDefered.reject();
            });
        } else {
            device.iWriteMultiple(configRegisters, configVals)
            .then(function(results) {
                var isError = false;
                results.forEach(function(result) {
                    if(result.isErr) {
                        retInfo.isError = true;
                    }
                });
                if(retInfo.isError) {
                    innerDefered.reject();
                } else {
                    innerDefered.resolve();
                }
            }, function(err) {
                retInfo.isError = true;
                innerDefered.reject();
            });
        }
        return innerDefered.promise;
    }
    function getValue() {
        device.iRead(ainReg)
        .then(function(res) {
            retInfo.value = res.val;
            onSuccess();
        }, function(err) {
            retInfo.isError = true;
            onError();
        });
    }

    configDevice()
    .then(getValue, onError);

    return defered.promise;
}
function configureAndGetValues(device, ainNum, ainRange, ainResolution, ainSettling, getRaw, numValues) {
    var defered = q.defer();
    var result = 0;
    var isError = false;

    var ainNumStr = ainNum.toString();
    var configRegisters = [
        'AIN' + ainNumStr + '_RANGE',
        'AIN' + ainNumStr + '_RESOLUTION_INDEX',
        'AIN' + ainNumStr + '_SETTLING_US',
    ];
    var configVals = [ainRange, ainResolution, ainSettling];
    var ainReg = 'AIN' + ainNumStr;
    if(getRaw) {
        ainReg += '_BINARY';
    }
    var ainRegs = [];
    var ainValues = [];
    for(var i = 0; i < numValues; i++) {
        ainRegs.push(ainReg);
    }

    var retInfo = {
        name: ainReg,
        values: [],
        mean: 0,
        variance: 0,
        isError: false,
    };
    function onSuccess() {
        retInfo.mean = stats.mean(retInfo.values);
        // retInfo.variance = stats.variance(retInfo.values);
        // console.log('Calculating variance:', retInfo.values);
        // console.log('Max:', Math.max.apply(null, retInfo.values));
        // console.log('Min:', Math.min.apply(null, retInfo.values));
        retInfo.variance = Math.max.apply(null, retInfo.values) - Math.min.apply(null, retInfo.values);
        defered.resolve(retInfo);
    }
    function onError() {
        defered.reject(retInfo);
    }
    function configDevice() {
        var innerDefered = q.defer();
        if(device.savedAttributes.FIRMWARE_VERSION > driver_const.T7_LIMITED_FW_VERSION) {
            device.iWriteMany(configRegisters,configVals)
            .then(function(res) {
                innerDefered.resolve();
            }, function(err) {
                retInfo.isError = true;
                innerDefered.reject();
            });
        } else {
            device.iWriteMultiple(configRegisters, configVals)
            .then(function(results) {
                var isError = false;
                results.forEach(function(result) {
                    if(result.isErr) {
                        retInfo.isError = true;
                    }
                });
                if(retInfo.isError) {
                    innerDefered.reject();
                } else {
                    innerDefered.resolve();
                }
            }, function(err) {
                retInfo.isError = true;
                innerDefered.reject();
            });
        }
        return innerDefered.promise;
    }
    function getValues() {
        if(device.savedAttributes.FIRMWARE_VERSION > driver_const.T7_LIMITED_FW_VERSION) {
            device.readMany(ainRegs)
            .then(function(results) {
                results.forEach(function(result) {
                    retInfo.values.push(result);
                });
                onSuccess();
            }, function(err) {
                retInfo.isError = true;
                onError();
            });
        } else {
            device.readMultiple(ainRegs)
            .then(function(results) {
                retInfo.isError = results.some(function(result) {
                    return result.isErr;
                });

                if(!retInfo.isError) {
                    results.forEach(function(result) {
                        retInfo.values.push(result.data);
                    });
                }
                onSuccess();
            }, function(err) {
                retInfo.isError = true;
                onError();
            });
        }
    }

    configDevice()
    .then(getValues, onError);

    return defered.promise;
}



function getCheckForHardwareIssuesBundle(curatedDevice) {
    var bundle = {
        device: curatedDevice,
        calibrationInfo: null,
        calibrationInfoValid: false,

        // currentDeviceConfig: {
        //     0: {range:null, settling:null, res: null},
        //     14: {range:null, settling:null, res: null},
        //     15: {range:null, settling:null, res: null},
        // },
        currentDeviceConfigs: {},  // Gets filled with Register->result pairs.  Ex: AIN0_RANGE:<data>
        infoToCache: [
            'AIN0_RANGE', 'AIN0_SETTLING_US', 'AIN0_RESOLUTION_INDEX', 
            'AIN14_RANGE', 'AIN14_SETTLING_US', 'AIN14_RESOLUTION_INDEX', 
            'AIN15_RANGE', 'AIN15_SETTLING_US', 'AIN15_RESOLUTION_INDEX', 
        ],
        overallResult: false,
        overallMessage: 'Device is not working correctly.',
        shortMessage: 'Bad',

        hardwareTests: {
            flashVerification: {
                name: 'Check Cal Constants',
                description: 'Make sure saved device calibration constants are somewhat reasonable and not blank.',
                productTypes: ['T4', 'T7', 'T7-Pro'],
                testFunctions: [verifyCalibrationConstants],
                status: false, executed: false, testMessage: 'Not Executed.', shortMessage: '',
                passMessage: 'Cal Constants OK',
                failMessage: 'Cal Constants BAD',
            },
            ain15NoiseCheck: {
                name: 'AIN15 Noise Check',
                description: 'Verify that AIN15 readings at resolutions 1 and 9 aren\'t static and are close to zero.',
                productTypes: ['T7', 'T7-Pro'],
                testFunctions: [performHSBasicNoiseCheck, performHRBasicNoiseCheck],
                status: false, executed: false, testMessage: 'Not Executed.', shortMessage: '',
                passMessage: 'GND Readings OK',
                failMessage: 'GND Readings BAD',
            },
            'temperatureBoundsCheck': {
                name: 'Check Temperature Sensor',
                description: 'Verify that device is reporting a temperature within the device\'s operating range (-40C to +85C).',
                productTypes: ['T4', 'T7', 'T7-Pro'],
                testFunctions: [performDeviceTemperatureCheck],
                status: false, executed: false, testMessage: 'Not Executed.', shortMessage: '',
                passMessage: 'Temp Readings OK',
                failMessage: 'Temp Readings BAD',
            },
            'rawTemperatureNoiseCheck': {
                name: 'AIN14 Noise Check',
                description: 'Verify that AIN14 readings at resolution 1 and 9 aren\'t static.',
                productTypes: ['T7', 'T7-Pro'],
                testFunctions: [performHSTempNoiseCheck, performHRTempNoiseCheck],
                status: false, executed: false, testMessage: 'Not Executed.', shortMessage: '',
                passMessage: 'No AIN14 Issues Detected',
                failMessage: 'AIN14 Issues Detected',
            },
            proOnlyHSHRComparisonCheck: {
                name: 'HS/HR Comparison Test',
                description: 'Compare HS and HR converter results.',
                productTypes: ['T7-Pro'],
                testFunctions: [performHSHRGNDComparisonCheck, performHSHRTempComparisonCheck],
                status: false, executed: false, testMessage: 'Not Executed.', shortMessage: '',
                passMessage: 'HS Converter is OK',
                failMessage: 'HS Converter issues detected',
            },
            // proOnlyGndCheck: {
            //     name: 'Internal GND Comparison Check',
            //     description: 'Compare HS and HR converters results when reading internal GND.',
            //     productTypes: ['T7-Pro'],
            //     testFunction: getInterpretFlashResults,
            //     status: false, executed: false, testMessage: 'Not Executed.',
            // },
            // proOnlyTempCheck: {
            //     name: 'Device Temperature Comparison Check',
            //     description: 'Compare HS and HR converter results when reading device temperature.',
            //     productTypes: ['T7-Pro'],
            //     testFunction: getInterpretFlashResults,
            //     status: false, executed: false, testMessage: 'Not Executed.',
            // },
            
            // 'rawGroundValCheck': {
            //     name: 'Verify Ground Measurements',
            //     description: 'Using raw ADC results, check that HS and HR converters (w/ range settings) are reporting reasonable results using cal constants.',
            //     productTypes: ['T4', 'T7', 'T7-Pro'],
            //     testFunctions: [verifyInputAmplifierFunctionality],
            //     status: false, executed: false, testMessage: 'Not Executed.',
            // },
        },

        testsToRun: [],// Fill array with tests to be run.
    };

    // Populate the "testsToRun" array with the list of tests that need to be run.
    var productType = curatedDevice.savedAttributes.productType;
    var testKeys = Object.keys(bundle.hardwareTests);
    testKeys.forEach(function(testKey) {
        test = bundle.hardwareTests[testKey];
        supportedProductTypes = test.productTypes;
        if(supportedProductTypes.indexOf(productType) >= 0) {
            bundle.testsToRun.push(testKey);
        }
    });
    return bundle;
}


/****************** BEGIN DEFINING HARDWARE TESTS ***************/
/**
 * This test performs a basic check of the calibration constants.
**/
function verifyCalibrationConstants(bundle, testName) {
    var defered = q.defer();
    var msg = '';
    if(bundle.calibrationInfoValid) {
        var checkHighRes = false;
        try {
            checkHighRes = bundle.device.savedAttributes.HARDWARE_INSTALLED.highResADC;
        } catch(err) {
            checkHighRes = false;
        }
        var deviceTypeName = bundle.device.savedAttributes.deviceTypeName;
        // console.log('Checking values', deviceTypeName, checkHighRes, bundle.calibrationInfo);
        var calCheckResult = getInvalidCalibrationValues(deviceTypeName, checkHighRes, bundle.calibrationInfo);
        // console.log('Result:',calCheckResult)

        
        if(calCheckResult.length > 0) {
            msg = calCheckResult.length.toString();
            msg += ' calibration constants are out of range.';
            bundle.hardwareTests[testName].status = false;
            bundle.hardwareTests[testName].executed = true;
            bundle.hardwareTests[testName].testMessage = msg;
        } else {
            msg = 'Device calibration constants are in range.';
            bundle.hardwareTests[testName].status = true;
            bundle.hardwareTests[testName].executed = true;
            bundle.hardwareTests[testName].testMessage = msg;
        }
    } else {
        msg = 'Skipped due to invalid calibration info';
        bundle.hardwareTests[testName].status = false;
        bundle.hardwareTests[testName].executed = true;
        bundle.hardwareTests[testName].testMessage = msg;
    }
    defered.resolve(bundle);
    return defered.promise;
}
/**
 * This test reads AIN15 (internal GND) to make sure it is not stuck at zero (HS Converter).
**/
function performHSBasicNoiseCheck(bundle, testName) {
    var defered = q.defer();
    var productType = bundle.device.savedAttributes.productType;
    var device = bundle.device;
    var ainNum = 15;
    var ainRange = 10;
    var ainResolution = 1;
    var ainSettling = 0;
    var getRaw = false;
    var numValues = 10;
    configureAndGetValues(device, ainNum, ainRange, ainResolution, ainSettling, getRaw, numValues)
    .then(function(res) {
        var mean = res.mean;
        var absMean = Math.abs(mean);
        var variance = res.variance;
        var msg = '';
        if((absMean < 0.004) && (variance > 0.00001)) {
            msg = 'HS Converter AIN15 values are OK';
            bundle.hardwareTests[testName].status = true;
        } else {
            msg = 'HS Converter AIN15 values are BAD, (10 vals) mean: ';
            msg += absMean.toFixed(5) + ', variance: ' + variance.toFixed(5);
            bundle.hardwareTests[testName].status = false;
        }
        if(productType === 'T7') {
            // Only conclude test if we are testing a T7.  -Pros need 2nd test.
            bundle.hardwareTests[testName].executed = true;
        }
        bundle.hardwareTests[testName].testMessage = msg;
        defered.resolve(bundle);
    }, function(err) {
        var msg = 'Error getting AIN values.';
        bundle.hardwareTests[testName].status = false;
        bundle.hardwareTests[testName].executed = true;
        bundle.hardwareTests[testName].testMessage = msg;
        defered.resolve(bundle);
    });
    return defered.promise;
}
function performHRBasicNoiseCheck(bundle, testName) {
    var defered = q.defer();
    var productType = bundle.device.savedAttributes.productType;
    var device = bundle.device;
    var ainNum = 15;
    var ainRange = 10;
    var ainResolution = 9;
    var ainSettling = 0;
    var getRaw = false;
    var numValues = 10;
    var runTest = false;
    if(productType === 'T7-Pro') {
        // Only run test if HS converter passed.
        if(bundle.hardwareTests[testName].status) {
            runTest = true;
        }
    }
    
    if(runTest) {
        configureAndGetValues(device, ainNum, ainRange, ainResolution, ainSettling, getRaw, numValues)
        .then(function(res) {
            var mean = res.mean;
            var absMean = Math.abs(mean);
            var variance = res.variance;
            var msg = '';
            if((absMean < 0.004) && (variance > 0.00001)) {
                msg = 'HS & HR Converter AIN15 values are OK';
                bundle.hardwareTests[testName].status = true;
            } else {
                msg = 'HR Converter AIN15 values are BAD';
                bundle.hardwareTests[testName].status = false;
            }
            bundle.hardwareTests[testName].executed = true;
            bundle.hardwareTests[testName].testMessage = msg;
            defered.resolve(bundle);
        }, function(err) {
            var msg = 'Error getting AIN values.';
            bundle.hardwareTests[testName].status = false;
            bundle.hardwareTests[testName].executed = true;
            bundle.hardwareTests[testName].testMessage = msg;
            defered.resolve(bundle);
        });
    } else {
        defered.resolve(bundle);
    }
    return defered.promise;
}
function performHSHRGNDComparisonCheck(bundle, testName) {
    var defered = q.defer();
    var productType = bundle.device.savedAttributes.productType;
    var device = bundle.device;
    var ainNum = 15;
    var ainRange = 10;
    var ainResolution = 0;
    var ainSettling = 0;
    var getRaw = false;
    var runTest = false;

    var isError = false;
    var msg = '';
    var hsVal = 0;
    var hrVal = 0;
    function getHSVal(cb) {
        ainResolution = 7;
        configureAndGetValue(device, ainNum, ainRange, ainResolution, ainSettling, getRaw)
        .then(function(res) {
            hsVal = res.value;
            cb();
        }, function(err) {
            isError = true;
            msg = 'Failed to get HS AIN15 Val';
            cb(true);
        });
    }
    function getHRVal(cb) {
        ainResolution = 11;
        configureAndGetValue(device, ainNum, ainRange, ainResolution, ainSettling, getRaw)
        .then(function(res) {
            hrVal = res.value;
            cb();
        }, function(err) {
            isError = true;
            msg = 'Failed to get HR AIN15 Val';
            cb(true);
        });
    }
    function performTest(cb) {
        var testRes = Math.abs(hsVal - hrVal);
        if(testRes > 0.004) {
            // Test Fails
            isError = true;
            msg = 'HS/HR Ground Comparison Check Failed, diff: ' + testRes.toFixed(5);
            cb(true);
        } else {
            // Test Passes
            msg = 'HS/HR Ground Comparison Check Passes';
            cb();
        }
    }
    var steps = [getHSVal, getHRVal, performTest];
    async.eachSeries(
        steps,
        function(step, cb) {
            step(cb);
        },
        function(err) {
            bundle.hardwareTests[testName].status = !isError;
            bundle.hardwareTests[testName].executed = true;
            bundle.hardwareTests[testName].testMessage = msg;
            defered.resolve(bundle);
        });
    return defered.promise;
}
function performHSHRTempComparisonCheck(bundle, testName) {
    var defered = q.defer();

    var productType = bundle.device.savedAttributes.productType;
    var device = bundle.device;
    var ainNum = 14;
    var ainRange = 10;
    var ainResolution = 0;
    var ainSettling = 0;
    var getRaw = false;
    var runTest = false;

    var isError = false;
    var msg = '';
    var hsVal = 0;
    var hrVal = 0;
    function getHSVal(cb) {
        ainResolution = 7;
        configureAndGetValue(device, ainNum, ainRange, ainResolution, ainSettling, getRaw)
        .then(function(res) {
            hsVal = res.value;
            cb();
        }, function(err) {
            isError = true;
            msg = 'Failed to get HS AIN14 Val';
            cb(true);
        });
    }
    function getHRVal(cb) {
        ainResolution = 11;
        configureAndGetValue(device, ainNum, ainRange, ainResolution, ainSettling, getRaw)
        .then(function(res) {
            hrVal = res.value;
            cb();
        }, function(err) {
            isError = true;
            msg = 'Failed to get HR AIN14 Val';
            cb(true);
        });
    }
    function performTest(cb) {
        var testRes = Math.abs(hsVal - hrVal);
        if(testRes > 0.004) {
            // Test Fails
            isError = true;
            msg = 'Internal Temp Comparison Check Failed, diff: ' + testRes.toFixed(5);
            cb(true);
        } else {
            // Test Passes
            msg = 'HS/HR Ground Comparison Check Passes';
            cb();
        }
    }
    // Only run test if HS/HR GND Test passed.
    if(bundle.hardwareTests[testName].status) {
        runTest = true;
    }
    if(runTest) {
        var steps = [getHSVal, getHRVal, performTest];
        async.eachSeries(
            steps,
            function(step, cb) {
                step(cb);
            },
            function(err) {
                bundle.hardwareTests[testName].status = !isError;
                bundle.hardwareTests[testName].executed = true;
                bundle.hardwareTests[testName].testMessage = msg;
                defered.resolve(bundle);
            });
    } else {
        defered.resolve(bundle);
    }
    return defered.promise;
}
function performDeviceTemperatureCheck(bundle, testName) {
    var defered = q.defer();
    bundle.device.iRead('TEMPERATURE_DEVICE_K')
    .then(function(res) {
        var tempK = res.val;
        var tempC = tempK - 273.15;
        var msg = '';
        if((tempC > -40) && (tempC < 85)) {
            msg = 'Device calibration constants are in range.';
            bundle.hardwareTests[testName].status = true;
            bundle.hardwareTests[testName].executed = true;
            bundle.hardwareTests[testName].testMessage = msg;
        } else {
            msg = 'Device Temperature out of range: ' + tempC.toFixed(2) + 'C';
            bundle.hardwareTests[testName].status = false;
            bundle.hardwareTests[testName].executed = true;
            bundle.hardwareTests[testName].testMessage = msg;
        }
        defered.resolve(bundle);
    }, function(err) {
        defered.resolve(bundle);
    });
    return defered.promise;
}
function performHSTempNoiseCheck(bundle, testName) {
    var defered = q.defer();
    var productType = bundle.device.savedAttributes.productType;
    var device = bundle.device;
    var ainNum = 14;
    var ainRange = 10;
    var ainResolution = 1;
    var ainSettling = 50;
    var getRaw = false;
    var numValues = 10;
    configureAndGetValues(device, ainNum, ainRange, ainResolution, ainSettling, getRaw, numValues)
    .then(function(res) {
        var mean = res.mean;
        var absMean = Math.abs(mean);
        var variance = res.variance;
        var msg = '';
        if((0 < mean) && (mean < 5) && (variance > 0.00001)) {
            console.log("OK");
            msg = 'HS Converter AIN14 values are OK';
            bundle.hardwareTests[testName].status = true;
        } else {
            console.log("BAD");
            msg = 'HS Converter AIN14 values are BAD, (10 vals)';
            msg += ' mean: ';
            msg +=mean.toFixed(2);
            msg += ', variance: ';
            msg +=variance.toFixed(4);
            bundle.hardwareTests[testName].status = false;
        }
        if(productType === 'T7') {
            // Only conclude test if we are testing a T7.  -Pros need 2nd test.
            bundle.hardwareTests[testName].executed = true;
        }
        bundle.hardwareTests[testName].testMessage = msg;
        defered.resolve(bundle);
    }, function(err) {
        var msg = 'Error getting AIN values.';
        bundle.hardwareTests[testName].status = false;
        bundle.hardwareTests[testName].executed = true;
        bundle.hardwareTests[testName].testMessage = msg;
        defered.resolve(bundle);
    });
    return defered.promise;
}
function performHRTempNoiseCheck(bundle, testName) {
    var defered = q.defer();
    var productType = bundle.device.savedAttributes.productType;
    var device = bundle.device;
    var ainNum = 14;
    var ainRange = 10;
    var ainResolution = 9;
    var ainSettling = 0;
    var getRaw = false;
    var numValues = 10;
    var runTest = false;
    if(productType === 'T7-Pro') {
        // Only run test if HS converter passed.
        if(bundle.hardwareTests[testName].status) {
            runTest = true;
        }
    }
    
    if(runTest) {
        configureAndGetValues(device, ainNum, ainRange, ainResolution, ainSettling, getRaw, numValues)
        .then(function(res) {
            var mean = res.mean;
            var absMean = Math.abs(mean);
            var variance = res.variance;
            var msg = '';
            if((0 < mean) && (mean < 5) && (variance > 0.00001)) {
                if(bundle.hardwareTests[testName].status) {
                    msg = 'HS & HR Converter AIN14 values are OK';
                    bundle.hardwareTests[testName].status = true;
                }
            } else {
                msg = 'HR Converter AIN14 values are BAD, (10 vals)';
                msg += ' mean: ';
                msg +=mean.toFixed(2);
                msg += ', variance: ';
                msg +=variance.toFixed(4);
                bundle.hardwareTests[testName].status = false;
            }
            bundle.hardwareTests[testName].executed = true;
            bundle.hardwareTests[testName].testMessage = msg;
            defered.resolve(bundle);
        }, function(err) {
            var msg = 'Error getting AIN values.';
            bundle.hardwareTests[testName].status = false;
            bundle.hardwareTests[testName].executed = true;
            bundle.hardwareTests[testName].testMessage = msg;
            defered.resolve(bundle);
        });
    } else {
        defered.resolve(bundle);
    }
    return defered.promise;
}
function verifyInputAmplifierFunctionality(bundle, testName) {
    var defered = q.defer();
    defered.resolve(bundle);
    return defered.promise;
}
/****************** END DEFINING HARDWARE TESTS ***************/

// Read device calibration constants & save it to the bundle.
function getCalValues(bundle) {
    dbgHWTest('getCalValues');
    var defered = q.defer();
    var numUint32sToRead = 41;  // See basecamp somewhere...
    bundle.device.readFlash(0x3C4000, numUint32sToRead)
    .then(function(data) {
        // Convert the read calibration data to floating point values
        var floatingPointData = [];
        data.results.forEach(function(result){
            var buf = new Buffer(4);
            buf.writeUInt32BE(result,0);
            var floatVal = buf.readFloatBE(0);
            floatingPointData.push(floatVal);
        });
        bundle.calibrationInfo = floatingPointData;
        bundle.calibrationInfoValid = true;
        defered.resolve(bundle);
    }, function(err) {
        bundle.calibrationInfo = [];
        var i = 0;
        for(i = 0; i < numUint32sToRead; i++) {
            bundle.calibrationInfo.push(0);
        }
        bundle.calibrationInfoValid = false;
        bundle.overallResult = false;
        bundle.overallMessage = 'Failed to read device cal info.';
        bundle.shortMessage = 'Failed';
        defered.resolve(bundle);
    });
    return defered.promise;
}
// Read current device configuration & save it to the bundle.
function getCurrentConfigs(bundle) {
    dbgHWTest('getCurrentConfigs', bundle.calibrationInfoValid);
    var defered = q.defer();

    bundle.device.sReadMany(bundle.infoToCache)
    .then(function(results) {
        // bundle.currentDeviceConfigs
        results.forEach(function(result) {
            bundle.currentDeviceConfigs[result.name] = result;
        });
        defered.resolve(bundle);
    }, function(err) {
        bundle.overallResult = false;
        bundle.overallMessage = 'Failed to read current device configs.';
        bundle.shortMessage = 'Failed';
        defered.resolve(bundle);
    });
    return defered.promise;
}
function runTest(bundle, testName) {
    var defered = q.defer();

    async.eachSeries(
        bundle.hardwareTests[testName].testFunctions,
        function(testFunction, cb) {
            try {
                dbgHWTest('Running Test', testName);
                testFunction(bundle, testName)
                .then(function(bundle) {
                    cb();
                }, function(bundle) {
                    cb(true);
                });
            } catch(err) {
                console.error('Error Running Test', testName, err);
                cb(true);
            }
        }, function(err) {
            defered.resolve(bundle);
        });
    return defered.promise;
}
function performHardwareTests(bundle) {
    dbgHWTest('performHardwareTests');
    var defered = q.defer();

    async.eachSeries(
        bundle.testsToRun,
        function(testKey, cb) {
            dbgHWTest('Running Test', testKey);
            runTest(bundle, testKey)
            .then(function(bundle) {
                dbgHWTest('Finished running test', bundle.hardwareTests[testKey]);
                // Check to see if the test failed, then report failure.
                if(!bundle.hardwareTests[testKey].status) {
                    // Update test's short message
                    bundle.hardwareTests[testKey].shortMessage = bundle.hardwareTests[testKey].failMessage;

                    // Update overall HW test result
                    bundle.overallResult = false;
                    bundle.overallMessage = bundle.hardwareTests[testKey].testMessage;
                    bundle.shortMessage = bundle.hardwareTests[testKey].failMessage;
                    cb();
                } else {
                    bundle.hardwareTests[testKey].shortMessage = bundle.hardwareTests[testKey].passMessage;
                    cb();
                }
            }, function(bundle) {
                cb(true);
            });
        }, function(err) {
            var allTestsPass = true;
            bundle.testsToRun.forEach(function(key) {
                if(!bundle.hardwareTests[key].status) {
                    allTestsPass = false;
                }
            });
            if(allTestsPass) {
                bundle.overallResult = true;
                bundle.overallMessage = 'No HW issues detected';
                bundle.shortMessage = 'OK';
            }
            defered.resolve(bundle);
        });
    return defered.promise;
}
function restoreCurrentConfigs(bundle) {
    dbgHWTest('Restoring Configs');
    var defered = q.defer();
    var registersToWrite = [];
    var valuesToWrite = [];
    var configRegKeys = Object.keys(bundle.currentDeviceConfigs);
    configRegKeys.forEach(function(key) {
        registersToWrite.push(bundle.currentDeviceConfigs[key].name);
        valuesToWrite.push(bundle.currentDeviceConfigs[key].val);
    });
    bundle.device.iWriteMany(registersToWrite, valuesToWrite)
    .then(function(result) {
        defered.resolve(bundle);
    }, function(err) {
        bundle.overallResult = false;
        bundle.overallMessage = 'Failed to restore device configs.';
        bundle.shortMessage = 'Failed';
        defered.resolve(bundle);
    });
    return defered.promise;
}
function finalizeResults(bundle) {
    dbgHWTest('Finalizing results');
    
    var defered = q.defer();
    var results = {
        overallResult: bundle.overallResult,
        overallMessage: bundle.overallMessage,
        shortMessage: bundle.shortMessage,

        // calibrationInfo: bundle.calibrationInfo,
        calibrationInfoValid: bundle.calibrationInfoValid,
        testResults: {},
    };

    bundle.testsToRun.forEach(function(testKey) {
        results.testResults[testKey] = {
            name: bundle.hardwareTests[testKey].name,
            description: bundle.hardwareTests[testKey].description,
            status: bundle.hardwareTests[testKey].status,
            executed: bundle.hardwareTests[testKey].executed,
            testMessage: bundle.hardwareTests[testKey].testMessage,
            shortMessage: bundle.hardwareTests[testKey].shortMessage,
        };
    });

    dbgHWTest('Final resolve');
    defered.resolve(results);
    return defered.promise;
}

/**
 * ONLY RUN ON T7-Pro.  Performs a check to determine if the T7 & T7-Pro's analog
 * front end is still working correctly.
**/
exports.checkForHardwareIssues = function(curatedDevice) {
    var defered = q.defer();
    // console.log('in t7_calibration_operations.js getDeviceCalibrationStatus');
    var getErrFunc = function(msg) {
        var errFunc = function(err) {
            console.log('in getDeviceCalibrationStatus, error', err, msg);
            defered.reject(err);
        };
        return errFunc;
    };

    var bundle = getCheckForHardwareIssuesBundle(curatedDevice);

    getCalValues(bundle)
    .then(getCurrentConfigs)
    .then(performHardwareTests)
    .then(restoreCurrentConfigs)
    .then(finalizeResults)
    .then(defered.resolve);
    return defered.promise;
};