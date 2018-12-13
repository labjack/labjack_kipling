var ljs_modbus_map = require('ljswitchboard-modbus_map');
var modbus_map = ljs_modbus_map.getConstants();

var globalDeviceConstantsSwitch = {
    "T7":"t7DeviceConstants",
    "T7Pro":"t7ProDeviceConstants",
    "T7-Pro":"t7ProDeviceConstants"
};
var globalDoubleRegExStringPattern = "(^\-?[0-9]{1,}$)|(^\-?[0-9]{1,}\\.$)|(^\-?[0-9]{1,}\\.[0-9]{1,}$)|(^\-?\\.[0-9]{1,}$)";
var globalIntegerRegExStringPattern = "(^[0-9]{1,}$)";
var globalModbusRegExStringPattern = "(^.*$)";

var localSprintf = function(format, value) {
    var retVal = '0';
    try {
        retVal = sprintf(format, value);
    } catch(err) {
        console.warn('Error calling sprintf', err);
    }
    return retVal;
};
var globalDeviceConstants = {
    "t7DeviceConstants": {
        hasEFSystem: true,
        ainBitsPrecision: 6,
        ainChannelNames: "AIN#(0:13)",
        allConfigRegisters: [
            {"name":"Range",                    "cssClass":"range",             "register":"AIN_ALL_RANGE",                 "options":"ainRangeOptions",                    "manual":false},
            {"name":"Resolution Index",         "cssClass":"resolution",        "register":"AIN_ALL_RESOLUTION_INDEX",      "options":"ainResolutionOptions",               "manual":false},
            {"name":"Settling (us)",            "cssClass":"settling",          "register":"AIN_ALL_SETTLING_US",           "options":"func","func":"ainSettlingOptions",   "manual":false},
            {"name":"Negative Channel",         "cssClass":"negativeChannel",   "register":"AIN_ALL_NEGATIVE_CH",           "options":"func","func":"ainNegativeCHOptions", "manual":false},
            {"name":"Extended Features (EF)",   "cssClass":"efSystem",          "register":"{{ainChannelNames}}_EF_INDEX",  "options":"ainEFTypeOptions",                   "manual":true}
        ],
        configRegisters: [
            {"name":"Range",                    "cssClass":"range",             "register":"{{ainChannelNames}}_RANGE",            "options":"ainRangeOptions"},
            {"name":"Resolution Index",         "cssClass":"resolution",        "register":"{{ainChannelNames}}_RESOLUTION_INDEX", "options":"ainResolutionOptions"},
            {"name":"Settling (us)",            "cssClass":"settling",          "register":"{{ainChannelNames}}_SETTLING_US",      "options":"func","func":"ainSettlingOptions"},
            {"name":"Negative Channel",         "cssClass":"negativeChannel",   "register":"{{ainChannelNames}}_NEGATIVE_CH",      "options":"func","func":"ainNegativeCHOptions"},
            {"name":"Extended Feature (EF)",    "cssClass":"efSystem",          "register":"{{ainChannelNames}}_EF_INDEX",         "options":"ainEFTypeOptions"}
        ],
        extraAllAinOptions: [
            {"name": "Select","value": -9999},
            {"name": "Select","value": 65535}
        ],
        ainNegativeCHOptions: {
            "numbers":[0,2,4,6,8,10,12,199],
            func: function(val) {
                if((val > -1)&&(val < 14)) {
                    return {value: val,name: 'AIN'+val.toString()};
                } else if (val === 199) {
                    return {value: 199,name: "GND"};
                } else {
                    return {value: 65535, name: "Select"};
                }
            },
            filter: function(val) {
                if((typeof(val)==='undefined')||(val === null)) {
                    return [{"value": 199,"name": "GND"}];
                }
                if(val%2 === 0) {
                    return [
                        {value: (val+1),name: 'AIN'+(val+1).toString()},
                        {value: 199,name: "GND"}
                    ];
                } else {
                    return [
                        {value: 199,name: "GND"}
                    ];
                }
            }
        },
        parsers: [
            "ainRangeOptions",
            "ainResolutionOptions",
            "ainSettlingOptions",
            "ainNegativeCHOptions",
            "ainEFTypeOptions"
        ],
        ainRangeOptions: [
            {"name": "-10 to 10V","value": 10,"timeMultiplier":1},
            {"name": "-1 to 1V","value": 1,"timeMultiplier":1.25},
            {"name": "-0.1 to 0.1V","value": 0.1,"timeMultiplier":1.5},
            {"name": "-0.01 to 0.01V","value": 0.01,"timeMultiplier":3}
        ],
        ainResolutionOptions: [
            {"name": "Auto","value": 0,"acquisitionTime": 50},
            {"name": "1","value": 1, "acquisitionTime": 50},
            {"name": "2","value": 2, "acquisitionTime": 50},
            {"name": "3","value": 3, "acquisitionTime": 50},
            {"name": "4","value": 4, "acquisitionTime": 50},
            {"name": "5","value": 5, "acquisitionTime": 50},
            {"name": "6","value": 6, "acquisitionTime": 50},
            {"name": "7","value": 7, "acquisitionTime": 50},
            {"name": "8","value": 8, "acquisitionTime": 50}
        ],
        ainSettlingOptions_RAW: [
            {"name": "Auto",    "value": 0},
            {"name": "10us",    "value": 10},
            {"name": "25us",    "value": 25},
            {"name": "50us",    "value": 50},
            {"name": "100us",   "value": 100},
            {"name": "250us",   "value": 250},
            {"name": "500us",   "value": 500},
            {"name": "1ms",     "value": 1000},
            {"name": "2.5ms",   "value": 2500},
            {"name": "5ms",     "value": 5000},
            {"name": "10ms",    "value": 10000},
            {"name": "25ms",    "value": 25000},
            {"name": "50ms",    "value": 50000}
        ],
        ainSettlingOptions: {
            "numbers": [0,10,25,50,100,250,1000,2500,5000,10000,25000,50000],
            func: function(val) {
                if(val === 0) {
                    return {value: val,name: 'Auto'};
                } else if ((val < 1000)&&(val > -1)) {
                    return {value: val,name: val.toString()+"us"};
                } else if ((val > -1)&&(val < 1000000)){
                    return {value: val,name: (val/1000).toString()+"ms"};
                } else {
                    return {value: -9999, name: "Select"};
                }
            },
            filter: function(val) {
                return globalDeviceConstants.t7DeviceConstants.ainSettlingOptions_RAW;
                // if(val === 0) {
                //     return {value: val,name: 'Auto'};
                // } else if (val < 1000) {
                //     return {value: val,name: val.toString()+"us"};
                // } else {
                //     return {value: val,name: (val/1000).toString()+"ms"};
                // } 
            }
        },
        ainEFTypeMap: {
            // None
            0: function() {return globalDeviceConstants.t7DeviceConstants.ainEFTypeOptions[0];},

            // Slope/Offset
            1: function() {return globalDeviceConstants.t7DeviceConstants.ainEFTypeOptions[1];},

            // Average, Min, Max
            3: function() {return globalDeviceConstants.t7DeviceConstants.ainEFTypeOptions[2];},

            // Resistance
            4: function() {return globalDeviceConstants.t7DeviceConstants.ainEFTypeOptions[3];},

            // Average and Threshold
            5: function() {return globalDeviceConstants.t7DeviceConstants.ainEFTypeOptions[4];},

            // FlexRMS
            10: function() {return globalDeviceConstants.t7DeviceConstants.ainEFTypeOptions[5];},
            11: function() {return globalDeviceConstants.t7DeviceConstants.ainEFTypeOptions[6];},

            // Thermocouples
            20: function() {return globalDeviceConstants.t7DeviceConstants.ainEFTypeOptions[7];},
            21: function() {return globalDeviceConstants.t7DeviceConstants.ainEFTypeOptions[8];},
            22: function() {return globalDeviceConstants.t7DeviceConstants.ainEFTypeOptions[9];},
            23: function() {return globalDeviceConstants.t7DeviceConstants.ainEFTypeOptions[10];},
            24: function() {return globalDeviceConstants.t7DeviceConstants.ainEFTypeOptions[11];},
            25: function() {return globalDeviceConstants.t7DeviceConstants.ainEFTypeOptions[12];},
            30: function() {return globalDeviceConstants.t7DeviceConstants.ainEFTypeOptions[13];},

            40: function() {return globalDeviceConstants.t7DeviceConstants.ainEFTypeOptions[14];},
            41: function() {return globalDeviceConstants.t7DeviceConstants.ainEFTypeOptions[15];},
            42: function() {return globalDeviceConstants.t7DeviceConstants.ainEFTypeOptions[16];},

            50: function() {return globalDeviceConstants.t7DeviceConstants.ainEFTypeOptions[17];},
            51: function() {return globalDeviceConstants.t7DeviceConstants.ainEFTypeOptions[18];},
        },
        ainEFTypeOptions:[
            {"name": "Disabled", "value": 0,
                "getConfigRoutine": function() {
                    return globalDeviceConstants.t7DeviceConstants.efConfigRoutine.none;
                },
                "getReadRegs":function() {
                    return [];
                },
                "getConfigRegs": function() {
                    return [];
                },
            },
            {"name": "Slope/Offset","value": 1,
                "getConfigRoutine": function() {
                    return globalDeviceConstants.t7DeviceConstants.efConfigRoutine.slopeOffset;
                },
                "getReadRegs": function() {
                    return globalDeviceConstants.t7DeviceConstants.efReadOptions.slopeOffset;
                },
                "getConfigRegs": function() {
                    return globalDeviceConstants.t7DeviceConstants.efConfigOptions.slopeOffset;
                },
                url: "https://labjack.com/support/datasheets/t-series/ain/extended-features/offset-and-slope",
            },
            {"name": "Min, Max, Avg","value": 3,
                "getConfigRoutine": function() {
                    return globalDeviceConstants.t7DeviceConstants.efConfigRoutine.minMaxAvg;
                },
                "getReadRegs": function() {
                    return globalDeviceConstants.t7DeviceConstants.efReadOptions.minMaxAvg;
                },
                "getConfigRegs": function() {
                    return globalDeviceConstants.t7DeviceConstants.efConfigOptions.minMaxAvg;
                },
                url: "https://labjack.com/support/datasheets/t-series/ain/extended-features/average-min-max",
            },
            {"name": "Resistance","value": 4,
                "getConfigRoutine": function() {
                    return globalDeviceConstants.t7DeviceConstants.efConfigRoutine.resistance;
                },
                "getReadRegs": function() {
                    return globalDeviceConstants.t7DeviceConstants.efReadOptions.resistance;
                },
                "getConfigRegs": function() {
                    return globalDeviceConstants.t7DeviceConstants.efConfigOptions.resistance;
                },
                url: "https://labjack.com/support/datasheets/t-series/ain/extended-features/resistance",
            },
            {"name": "Average and Threshold","value": 5,
                "getConfigRoutine": function() {
                    return globalDeviceConstants.t7DeviceConstants.efConfigRoutine.averageThreshold;
                },
                "getReadRegs": function() {
                    return globalDeviceConstants.t7DeviceConstants.efReadOptions.averageThreshold;
                },
                "getConfigRegs": function() {
                    return globalDeviceConstants.t7DeviceConstants.efConfigOptions.averageThreshold;
                },
                url: "https://labjack.com/support/datasheets/t-series/ain/extended-features/average-and-threshold",
            },
            {"name": "FlexRMS","value": 10,
                "getConfigRoutine": function() {
                    return globalDeviceConstants.t7DeviceConstants.efConfigRoutine.flexRMS;
                },
                "getReadRegs": function() {
                    return globalDeviceConstants.t7DeviceConstants.efReadOptions.flexRMS;
                },
                "getConfigRegs": function() {
                    return globalDeviceConstants.t7DeviceConstants.efConfigOptions.flexRMS;
                },
                url: "https://labjack.com/support/datasheets/t-series/ain/extended-features/rms",
            },
            {"name": "AutoRMS","value": 11,
                "getConfigRoutine": function() {
                    return globalDeviceConstants.t7DeviceConstants.efConfigRoutine.autoRMS;
                },
                "getReadRegs": function() {
                    return globalDeviceConstants.t7DeviceConstants.efReadOptions.flexRMS;
                },
                "getConfigRegs": function() {
                    return globalDeviceConstants.t7DeviceConstants.efConfigOptions.autoRMS;
                },
                url: "https://labjack.com/support/datasheets/t-series/ain/extended-features/rms",
            },
            // {"name": "FlexRMS","value": 11,
            //     "getConfigRoutine": function() {
            //         return globalDeviceConstants.t7DeviceConstants.efConfigRoutine.flexRMS;
            //     },
            //     "getReadRegs": function() {
            //         return globalDeviceConstants.t7DeviceConstants.efReadOptions.flexRMS;
            //     },
            //     "getConfigRegs": function() {
            //         return globalDeviceConstants.t7DeviceConstants.efConfigOptions.flexRMS;
            //     }
            // },
            {"name": "TypeE Thermocouple","value": 20,
                "getConfigRoutine": function() {
                    return globalDeviceConstants.t7DeviceConstants.efConfigRoutine.thermocouples;
                },
                "getReadRegs": function() {
                    return globalDeviceConstants.t7DeviceConstants.efReadOptions.thermocouples;
                },
                "getConfigRegs": function() {
                    return globalDeviceConstants.t7DeviceConstants.efConfigOptions.thermocouples;
                },
                url: "https://labjack.com/support/datasheets/t-series/ain/extended-features/thermocouple",
            },
            {"name": "TypeJ Thermocouple","value": 21,
                "getConfigRoutine": function() {
                    return globalDeviceConstants.t7DeviceConstants.efConfigRoutine.thermocouples;
                },
                "getReadRegs": function() {
                    return globalDeviceConstants.t7DeviceConstants.efReadOptions.thermocouples;
                },
                "getConfigRegs": function() {
                    return globalDeviceConstants.t7DeviceConstants.efConfigOptions.thermocouples;
                },
                url: "https://labjack.com/support/datasheets/t-series/ain/extended-features/thermocouple",
            },
            {"name": "TypeK Thermocouple","value": 22,
                "getConfigRoutine": function() {
                    return globalDeviceConstants.t7DeviceConstants.efConfigRoutine.thermocouples;
                },
                "getReadRegs": function() {
                    return globalDeviceConstants.t7DeviceConstants.efReadOptions.thermocouples;
                },
                "getConfigRegs": function() {
                    return globalDeviceConstants.t7DeviceConstants.efConfigOptions.thermocouples;
                },
                url: "https://labjack.com/support/datasheets/t-series/ain/extended-features/thermocouple",
            },
            {"name": "TypeR Thermocouple","value": 23,
                "getConfigRoutine": function() {
                    return globalDeviceConstants.t7DeviceConstants.efConfigRoutine.thermocouples;
                },
                "getReadRegs": function() {
                    return globalDeviceConstants.t7DeviceConstants.efReadOptions.thermocouples;
                },
                "getConfigRegs": function() {
                    return globalDeviceConstants.t7DeviceConstants.efConfigOptions.thermocouples;
                },
                url: "https://labjack.com/support/datasheets/t-series/ain/extended-features/thermocouple",
            },
            {"name": "TypeT Thermocouple","value": 24,
                "getConfigRoutine": function() {
                    return globalDeviceConstants.t7DeviceConstants.efConfigRoutine.thermocouples;
                },
                "getReadRegs": function() {
                    return globalDeviceConstants.t7DeviceConstants.efReadOptions.thermocouples;
                },
                "getConfigRegs": function() {
                    return globalDeviceConstants.t7DeviceConstants.efConfigOptions.thermocouples;
                },
                url: "https://labjack.com/support/datasheets/t-series/ain/extended-features/thermocouple",
            },
            {"name": "TypeS Thermocouple","value": 25,
                "getConfigRoutine": function() {
                    return globalDeviceConstants.t7DeviceConstants.efConfigRoutine.thermocouples;
                },
                "getReadRegs": function() {
                    return globalDeviceConstants.t7DeviceConstants.efReadOptions.thermocouples;
                },
                "getConfigRegs": function() {
                    return globalDeviceConstants.t7DeviceConstants.efConfigOptions.thermocouples;
                },
                url: "https://labjack.com/support/datasheets/t-series/ain/extended-features/thermocouple",
            },
            {"name": "TypeC Thermocouple","value": 30,
                "getConfigRoutine": function() {
                    return globalDeviceConstants.t7DeviceConstants.efConfigRoutine.thermocouples;
                },
                "getReadRegs": function() {
                    return globalDeviceConstants.t7DeviceConstants.efReadOptions.thermocouples;
                },
                "getConfigRegs": function() {
                    return globalDeviceConstants.t7DeviceConstants.efConfigOptions.thermocouples;
                },
                url: "https://labjack.com/support/datasheets/t-series/ain/extended-features/thermocouple",
            },
            {"name": "RTD PT100","value": 40,
                "getConfigRoutine": function() {
                    return globalDeviceConstants.t7DeviceConstants.efConfigRoutine.rtd;
                },
                "getReadRegs": function() {
                    return globalDeviceConstants.t7DeviceConstants.efReadOptions.rtd;
                },
                "getConfigRegs": function() {
                    return globalDeviceConstants.t7DeviceConstants.efConfigOptions.rtd;
                },
                url: "https://labjack.com/support/datasheets/t-series/ain/extended-features/rtd",
            },
            {"name": "RTD PT500","value": 41,
                "getConfigRoutine": function() {
                    return globalDeviceConstants.t7DeviceConstants.efConfigRoutine.rtd;
                },
                "getReadRegs": function() {
                    return globalDeviceConstants.t7DeviceConstants.efReadOptions.rtd;
                },
                "getConfigRegs": function() {
                    return globalDeviceConstants.t7DeviceConstants.efConfigOptions.rtd;
                },
                url: "https://labjack.com/support/datasheets/t-series/ain/extended-features/rtd",
            },
            {"name": "RTD PT1000","value": 42,
                "getConfigRoutine": function() {
                    return globalDeviceConstants.t7DeviceConstants.efConfigRoutine.rtd;
                },
                "getReadRegs": function() {
                    return globalDeviceConstants.t7DeviceConstants.efReadOptions.rtd;
                },
                "getConfigRegs": function() {
                    return globalDeviceConstants.t7DeviceConstants.efConfigOptions.rtd;
                },
                url: "https://labjack.com/support/datasheets/t-series/ain/extended-features/rtd",
            },
            {"name": "Thermistor - Steinhart-Hart","value": 50,
                "getConfigRoutine": function() {
                    return globalDeviceConstants.t7DeviceConstants.efConfigRoutine.thermistor;
                },
                "getReadRegs": function() {
                    return globalDeviceConstants.t7DeviceConstants.efReadOptions.thermistor;
                },
                "getConfigRegs": function() {
                    var cfgs = globalDeviceConstants.t7DeviceConstants.efConfigOptions.thermistor;
                    var numCFGS = cfgs.length;
                    var gIndex = numCFGS-1-3;
                    var hIndex = numCFGS-1-2;
                    var retCFGS = [];
                    cfgs.forEach(function(cfg, i) {
                        if(cfg.configReg === '_EF_CONFIG_G') {
                            var str = 'A constant';
                            cfg.description = str;
                            cfg.humanName = str;
                            cfg.hint = str;
                            retCFGS.push(cfg);
                        } else if(cfg.configReg === '_EF_CONFIG_H') {
                            var strB = 'B constant';
                            cfg.description = strB;
                            cfg.humanName = strB;
                            cfg.hint = strB;
                            retCFGS.push(cfg);
                        } else {
                            retCFGS.push(cfg);
                        }
                    });
                    return retCFGS;
                },
                url: "https://labjack.com/support/datasheets/t-series/ain/extended-features/thermistor",
            },
            {"name": "Thermistor - Beta equation","value": 51,
                "getConfigRoutine": function() {
                    return globalDeviceConstants.t7DeviceConstants.efConfigRoutine.thermistor;
                },
                "getReadRegs": function() {
                    return globalDeviceConstants.t7DeviceConstants.efReadOptions.thermistor;
                },
                "getConfigRegs": function() {
                    // Need to exclude CONFIG_I and CONFIG_J and need to edit the descriptions of G and H.
                    /*
                    attributes of G and H:
                        description
                        humanName
                        hint
                    */
                    var cfgs = globalDeviceConstants.t7DeviceConstants.efConfigOptions.thermistor;
                    var numCFGS = cfgs.length;
                    var gIndex = numCFGS-1-3;
                    var hIndex = numCFGS-1-2;
                    var retCFGS = [];
                    cfgs.forEach(function(cfg, i) {
                        if(cfg.configReg === '_EF_CONFIG_G') {
                            cfg.description = 'ß';
                            cfg.humanName = 'ß';
                            cfg.hint = 'ß';
                            retCFGS.push(cfg);
                        } else if(cfg.configReg === '_EF_CONFIG_H') {
                            cfg.description = 'ºC at which ß was calculated';
                            cfg.humanName = 'ºC at which ß was calculated';
                            cfg.hint = 'ºC at which ß was calculated';
                            retCFGS.push(cfg);
                        } else if(cfg.configReg === '_EF_CONFIG_I'||cfg.configReg === '_EF_CONFIG_J') {
                        } else {
                            retCFGS.push(cfg);
                        }
                    });
                    return retCFGS;
                },
                url: "https://labjack.com/support/datasheets/t-series/ain/extended-features/thermistor",
            }
        ],
        efConfigRoutine: {
            none: [
                {"reg": "_EF_INDEX", "configKey": "efType"}
            ],
            slopeOffset: [
                {"reg": "_EF_INDEX", "value": 0, "description": ""},
                {"reg": "_EF_INDEX", "configKey": "efType", "description": ""},
                {"reg": "_EF_CONFIG_D", "value": 1, "description": "Custom Slope"},
                {"reg": "_EF_CONFIG_E", "value": 0, "description": "Custom Offset"}
            ],
            minMaxAvg: [
                {"reg": "_EF_INDEX", "value": 0, "description": ""},
                {"reg": "_EF_INDEX", "configKey": "efType", "description": ""},
                {"reg": "_EF_CONFIG_A", "value": 200, "description": "Number of Samples"},
                {"reg": "_EF_CONFIG_D", "value": 4000, "description": "Sampling Frequency"}
            ],
            resistance: [
                {"reg": "_EF_INDEX", "value": 0, "description": ""},
                {"reg": "_EF_INDEX", "configKey": "efType", "description": ""},
                // {"reg": "_EF_CONFIG_B", "value": 0, "description": "Excitation Circuit Index"},
                // {"reg": "_EF_CONFIG_C", "value": 0, "description": "Excitation AIN Channel Number"},
                // {"reg": "_EF_CONFIG_D", "value": 0, "description": "Excitation Detail Volts"},
                // {"reg": "_EF_CONFIG_E", "value": 0, "description": "Excitation Detail Ohms"},
            ],
            averageThreshold: [
                {"reg": "_EF_INDEX", "value": 0, "description": ""},
                {"reg": "_EF_INDEX", "configKey": "efType", "description": ""},
                {"reg": "_EF_CONFIG_A", "value": 100, "description": "Number of Samples"},
                {"reg": "_EF_CONFIG_B", "value": 0, "description": "Digital Override"},
                {"reg": "_EF_CONFIG_D", "value": 1000, "description": "Sampling Frequency"},
                {"reg": "_EF_CONFIG_E", "value": 10, "description": "Threshold"},
            ],
            flexRMS: [
                {"reg": "_EF_INDEX", "value": 0, "description": ""},
                {"reg": "_EF_INDEX", "configKey": "efType", "description": ""},
                {"reg": "_EF_CONFIG_A", "value": 200, "description": "Configure Num Scans"},
                {"reg": "_EF_CONFIG_D", "value": 6000, "description": "Configure Scan Rate"},
            ],
            autoRMS: [
                {"reg": "_EF_INDEX", "value": 0, "description": ""},
                {"reg": "_EF_INDEX", "configKey": "efType", "description": ""},
                {"reg": "_EF_CONFIG_A", "value": 200, "description": "Configure Num Scans"},
                {"reg": "_EF_CONFIG_B", "value": 100, "description": "Configure Hysteresis"},
                {"reg": "_EF_CONFIG_D", "value": 6000, "description": "Configure Scan Rate"},
            ],
            thermocouples: [
                {"reg": "_EF_INDEX", "value": 0, "description": ""},
                {"reg": "_RANGE", "value": 0.1, "description": ""},
                {"reg": "_EF_INDEX", "configKey": "efType", "description": ""},
                {"reg": "_EF_CONFIG_A", "value": 0, "description": "Configure Temperature Metric"},
                {"reg": "_EF_CONFIG_B", "value": 60052, "description": "Configure CJC Modbus Address"},
                {"reg": "_EF_CONFIG_D", "value": 1, "description": "Custom Slope"},
                {"reg": "_EF_CONFIG_E", "value": 0, "description": "Custom Offset"}
            ],
            rtd: [
                {"reg": "_EF_INDEX", "value": 0, "description": ""},
                {"reg": "_EF_INDEX", "configKey": "efType", "description": ""},
                {"reg": "_EF_CONFIG_A", "value": 0, "description": "Configure Temperature Metric"},   
                {"reg": "_EF_CONFIG_B", "value": 0, "description": "Configure Excitation Type"},
                {"reg": "_EF_CONFIG_C", "value": 0, "description": "Channel number of AIN used to measure RTD's excitation."},
                {"reg": "_EF_CONFIG_B", "value": 0, "description": "Excitation detail - Volts"},
                {"reg": "_EF_CONFIG_B", "value": 0, "description": "Excitation detail - Ohms"},
                {"reg": "_EF_CONFIG_B", "value": 0, "description": "Excitation detail - Amps"},
            ],
            thermistor: [
                {"reg": "_EF_INDEX", "value": 0, "description": ""},
                {"reg": "_EF_INDEX", "configKey": "efType", "description": ""},
                // {"reg": "_EF_CONFIG_A", "value": 0, "description": "Configure Temperature Metric"},
                // {"reg": "_EF_CONFIG_B", "value": 60052, "description": "Configure CJC Modbus Address"},
                // {"reg": "_EF_CONFIG_D", "value": 1, "description": "Custom Slope"},
                // {"reg": "_EF_CONFIG_E", "value": 0, "description": "Custom Offset"}
            ],
        },
        efConfigOptions: {
            slopeOffset: [{
                "configReg": "_EF_CONFIG_D",
                "description": "Custom slope to be applied to the reading",
                "humanName": "Slope",
                "type": "value",
                "defaultVal": 1,
                "format": "%.6f",
                "pattern": globalDoubleRegExStringPattern,
                "hint": "Slope",
                "validator": function(value) {
                    return true;
                }
            }, {
                "configReg": "_EF_CONFIG_E",
                "description": "Custom offset to be applied to the reading",
                "humanName": "Offset",
                "type": "value",
                "defaultVal": 0,
                "format": "%.6f",
                "pattern": globalDoubleRegExStringPattern,
                "hint": "Offset",
                "validator": function(value) {
                    return true;
                }
            }],
            minMaxAvg: [{
                "configReg": "_EF_CONFIG_A",
                "description": "Number of samples to be acquired. (default=200, max=16384)",
                "humanName": "Num Samples",
                "type": "value",
                "defaultVal": 200,
                "format": "%.0f",
                "pattern": globalIntegerRegExStringPattern,
                "hint": "Slope",
                "validator": function(value) {
                    return true;
                }
            }, {
                "configReg": "_EF_CONFIG_D",
                "description": "The frequency at which samples will be collected",
                "humanName": "Frequency",
                "type": "value",
                "defaultVal": 4000,
                "format": "%.4f",
                "pattern": globalDoubleRegExStringPattern,
                "hint": "Offset",
                "validator": function(value) {
                    return true;
                }
            }],
            resistance: [{
                "configReg": "_EF_CONFIG_B",
                "description": "Excitation Circuit, see datasheet section 14.1.0.1",
                "humanName": "Excitation Circuit Index",
                "type": "select",
                "defaultVal": 0,
                // "format": "%.0f",
                "pattern": globalIntegerRegExStringPattern,
                "hint": "Index",
                "format": function(data) {
                    var value = Number(data.value);
                    var options = globalDeviceConstants.t7DeviceConstants.excitationCircuits;
                    var unitStr = '';
                    options.forEach(function(option) {
                        if(option.value === value) {
                            unitStr = option.name;
                        }
                    });
                    return unitStr;
                },
                "getOptions": function() {
                    return globalDeviceConstants.t7DeviceConstants.excitationCircuits;
                }
            }, {
                "configReg": "_EF_CONFIG_C",
                "description": "Excitation AIN Channel Number used to measure the RTD's excitation.",
                "humanName": "Excitation AIN Channel Number",
                "type": "value",
                "defaultVal": 0,
                "format": "%.0f",
                "pattern": globalIntegerRegExStringPattern,
                "hint": "AIN Ch",
                "validator": function(value) {
                    if(value >= 0 && value <= 128) {
                        return true;
                    } else {
                        return false;
                    }
                }
            }, {
                "configReg": "_EF_CONFIG_D",
                "description": "Number of volts provided as the excitation circuit voltage source.",
                "humanName": "Excitation Detail Volts",
                "type": "value",
                "defaultVal": 0,
                "format": "%.4f",
                "pattern": globalDoubleRegExStringPattern,
                "hint": "Offset",
                "validator": function(value) {
                    return true;
                }
            }, {
                "configReg": "_EF_CONFIG_E",
                "description": "The resistance in ohms of the shunt resistor.",
                "humanName": "Excitation Detail Ohms",
                "type": "value",
                "defaultVal": 0,
                "format": "%.4f",
                "pattern": globalDoubleRegExStringPattern,
                "hint": "Offset",
                "validator": function(value) {
                    return true;
                }
            }],
            averageThreshold: [{
                "configReg": "_EF_CONFIG_A",
                "description": "Number of samples to be acquired. (default=200, max=16384)",
                "humanName": "Num Samples",
                "type": "value",
                "defaultVal": 200,
                "format": "%.0f",
                "pattern": globalIntegerRegExStringPattern,
                "hint": "Slope",
                "validator": function(value) {
                    return true;
                }
            }, {
                "configReg": "_EF_CONFIG_B",
                "description": "When set to zero, the AIN# will be used.  Can be a modbus address of a digital IO such as 2001 for FIO1.",
                "humanName": "Digital Override",
                "type": "value",
                "defaultVal": 0,
                "format": "%.0f",
                "pattern": globalIntegerRegExStringPattern,
                "hint": "Slope",
                "validator": function(value) {
                    return true;
                }
            }, {
                "configReg": "_EF_CONFIG_D",
                "description": "The frequency at which samples will be collected",
                "humanName": "Frequency",
                "type": "value",
                "defaultVal": 4000,
                "format": "%.4f",
                "pattern": globalDoubleRegExStringPattern,
                "hint": "Offset",
                "validator": function(value) {
                    return true;
                }
            }, {
                "configReg": "_EF_CONFIG_E",
                "description": "If the computed average is above this value then the threshold flag will be set.",
                "humanName": "Threshold",
                "type": "value",
                "defaultVal": 10,
                "format": "%.4f",
                "pattern": globalDoubleRegExStringPattern,
                "hint": "Offset",
                "validator": function(value) {
                    return true;
                }
            }],
            flexRMS: [{
                "configReg": "_EF_CONFIG_A",
                "description": "Configure Num Scans",
                "humanName": "Num Scans (default=200, max=16384)",
                "type": "value",
                "defaultVal": 200,
                "format": "%.0f",
                "pattern": globalIntegerRegExStringPattern,
                "hint": "Num Scans",
                "validator": function(value) {
                    var retVal = true;
                    if((value < 0) || (value > 16384)) {
                        retVal = false;
                    }
                    return retVal;
                }
            }, {
                "configReg": "_EF_CONFIG_D",
                "description": "Scan Rate",
                "humanName": "Scan Rate (default=6000)",
                "type": "value",
                "defaultVal": 6000,
                "format": "%.0f",
                "pattern": globalIntegerRegExStringPattern,
                "hint": "Scan Rate",
                "validator": function(value) {
                    var retVal = true;
                    if((value < 0) || (value > 16384)) {
                        retVal = false;
                    }
                    return retVal;
                }
            }],
            autoRMS: [{
                "configReg": "_EF_CONFIG_A",
                "description": "Configure Num Scans",
                "humanName": "Num Scans (default=200, max=16384)",
                "type": "value",
                "defaultVal": 200,
                "format": "%.0f",
                "pattern": globalIntegerRegExStringPattern,
                "hint": "Num Scans",
                "validator": function(value) {
                    var retVal = true;
                    if((value < 0) || (value > 16384)) {
                        retVal = false;
                    }
                    return retVal;
                }
            }, {
                "configReg": "_EF_CONFIG_B",
                "description": "Hysteresis",
                "humanName": "Hysteresis (default=100, 16-bit counts)",
                "type": "value",
                "defaultVal": 100,
                "format": "%.0f",
                "pattern": globalIntegerRegExStringPattern,
                "hint": "Hysteresis",
                "validator": function(value) {
                    var retVal = true;
                    if((value < 0) || (value > 65535)) {
                        retVal = false;
                    }
                    return retVal;
                }
            }, {
                "configReg": "_EF_CONFIG_D",
                "description": "Scan Rate",
                "humanName": "Scan Rate (default=6000)",
                "type": "value",
                "defaultVal": 6000,
                "format": "%.0f",
                "pattern": globalIntegerRegExStringPattern,
                "hint": "Scan Rate",
                "validator": function(value) {
                    var retVal = true;
                    if((value < 0) || (value > 16384)) {
                        retVal = false;
                    }
                    return retVal;
                }
            }],
            thermocouples: [{
                "configReg": "_EF_CONFIG_A",
                "description": "Bitmask to configure temperature metric",
                "humanName": "Metric",
                "type": "select",
                "defaultVal": 0,
                "cssClass": "ainEFConfigA",
                "format": function(data) {
                    var value = Number(data.value);
                    var options = globalDeviceConstants.t7DeviceConstants.thermocoupleTemperatureMetrics;
                    var unitStr = '';
                    options.forEach(function(option) {
                        if(option.value === value) {
                            unitStr = option.name;
                        }
                    });
                    return unitStr;
                },
                "getOptions": function() {
                    return globalDeviceConstants.t7DeviceConstants.thermocoupleTemperatureMetrics;
                }
            },
            // {
            //     // "configReg": "_EF_CONFIG_B",
            //     // "description": "Modbus address read to acquire CJC reading.  Default is 60052.",
            //     // "humanName": "Custom CJC Modbus Address",
            //     // "type": "value",
            //     // "defaultVal": 60050,
            //     // "format": "%d",
            //     // // "pattern": "(^[0-9]{1,}$)|(^[0-9]{1,}\\.$)|(^[0-9]{1,}\\.[0]{1,}$)",
            //     // "pattern": "(^60052$)|(^60050$)",
            //     // "hint": "Modbus Address",
            //     // "getValidator": function() {
            //     //     var isDec = new RegExp(/^[0-9]{1,}$/g);
            //     //     var isValid = function(value) {
            //     //         return isDec.test(value.toString());
            //     //     };
            //     //     return isValid;
            //     // }
            //     "configReg": "_EF_CONFIG_B",
            //     "description": "Modbus address read to acquire CJC reading.  Default is 60052.",
            //     "humanName": "Cold Junction Location",
            //     "type": "select",
            //     "defaultVal": 60052,
            //     "cssClass": "ainEFConfigB",
            //     "notFoundText": "Custom",
            //     "format": function(data) {
            //         var value = Number(data.value);
            //         var options = globalDeviceConstants.t7DeviceConstants.thermocoupleCJCRegisters;
            //         var unitStr = '';
            //         options.forEach(function(option) {
            //             if(option.value === value) {
            //                 unitStr = option.name;
            //             }
            //         });
            //         return unitStr;
            //     },
            //     "getOptions": function() {
            //         return globalDeviceConstants.t7DeviceConstants.thermocoupleCJCRegisters;
            //     }
            // },
            {
                "configReg": "_EF_CONFIG_B",
                "description": "Modbus address read to acquire CJC reading.  Default is 60052.  CJC Temp must be reported in degrees K",
                "humanName": "CJC Modbus Address",
                "type": "modbusRegister",
                "defaultVal": 60052,
                // "format": "%d",
                // "format": function(data) {
                //     console.log('In Format Func', data);
                //     return '0';
                // },
                "format": function(data) {
                    var value = Number(data.value);
                    var addressInfo = modbus_map.getAddressInfo(value, 'R');
                    var options = globalDeviceConstants.t7DeviceConstants.thermocoupleCJCRegisters;
                    var unitStr = '';
                    if(addressInfo.directionValid) {
                        unitStr = addressInfo.data.name;
                    } else {
                        unitStr = addressInfo.data.name + 'is invalid';
                    }
                    return unitStr;
                },
                "pattern": globalModbusRegExStringPattern,
                "hint": "Modbus Address to read for CJC val in deg K",
                "getValidator": function() {
                    var isValid = function(value) {
                        console.log('In Validator', value);
                        return true;
                    };
                    return isValid;
                },
                "getOptions": function() {
                    return globalDeviceConstants.t7DeviceConstants.thermocoupleCJCRegisters;
                }
            }, {
                "configReg": "_EF_CONFIG_D",
                "description": "Custom slope to be applied to CJC reading (55.56 for LM34)",
                "humanName": "CJC Slope (K/Volt)",
                "type": "value",
                "defaultVal": 1,
                "format": "%.6f",
                "pattern": globalDoubleRegExStringPattern,
                "hint": "Slope",
                "getValidator": function() {
                    var isValid = function(value) {
                        return true;
                    };
                    return isValid;
                }
            }, {
                "configReg": "_EF_CONFIG_E",
                "description": "Custom offset to be applied to CJC reading (255.37 for LM34)",
                "humanName": "CJC Offset (K)",
                "type": "value",
                "defaultVal": 0,
                "format": "%.6f",
                "pattern": globalDoubleRegExStringPattern,
                "hint": "Offset",
                "getValidator": function() {
                    var isValid = function(value) {
                        return true;
                    };
                    return isValid;
                }
            }],
            rtd: [{
                "configReg": "_EF_CONFIG_A",
                "description": "Bitmask to configure temperature metric",
                "humanName": "Metric",
                "type": "select",
                "defaultVal": 0,
                "cssClass": "ainEFConfigA",
                "format": function(data) {
                    var value = Number(data.value);
                    var options = globalDeviceConstants.t7DeviceConstants.rtdTemperatureMetrics;
                    var unitStr = '';
                    options.forEach(function(option) {
                        if(option.value === value) {
                            unitStr = option.name;
                        }
                    });
                    return unitStr;
                },
                "getOptions": function() {
                    return globalDeviceConstants.t7DeviceConstants.rtdTemperatureMetrics;
                }
            }, {
                "configReg": "_EF_CONFIG_B",
                "description": "Excitation Type - How is the RTD connected to the device?",
                "humanName": "Excitation Type",
                "type": "select",
                "defaultVal": 0,
                "cssClass": "ainEFConfigB",
                "notFoundText": "Custom",
                "format": function(data) {
                    var value = Number(data.value);
                    var options = globalDeviceConstants.t7DeviceConstants.excitationCircuits;
                    var unitStr = '';
                    options.forEach(function(option) {
                        if(option.value === value) {
                            unitStr = option.name;
                        }
                    });
                    return unitStr;
                },
                "getOptions": function() {
                    return globalDeviceConstants.t7DeviceConstants.excitationCircuits;
                }
            }, {
                "configReg": "_EF_CONFIG_C",
                "description": "Excitation AIN Channel Number used to measure the RTD's excitation.",
                "humanName": "Excitation AIN Channel Number (2nd AIN)",
                "type": "value",
                "defaultVal": 0,
                "format": "%.0f",
                "pattern": globalIntegerRegExStringPattern,
                "hint": "AIN Ch",
                "validator": function(value) {
                    if(value >= 0 && value <= 128) {
                        return true;
                    } else {
                        return false;
                    }
                }
            }, {
                "configReg": "_EF_CONFIG_D",
                "description": "Excitation detail - Volts or Amps",
                "humanName": "Excitation detail - Volts or Amps",
                "type": "value",
                "defaultVal": 0,
                "format": "%.6f",
                "pattern": globalDoubleRegExStringPattern,
                "hint": "Excitation detail - Volts or Amps (Register: _EF_CONFIG_D)",
                "getValidator": function() {
                    var isValid = function(value) {
                        return true;
                    };
                    return isValid;
                }
            }, {
                "configReg": "_EF_CONFIG_E",
                "description": "Excitation detail - Ohms (Resistance of shunt resistor)",
                "humanName": "Excitation detail - Ohms (Resistance of shunt resistor)",
                "type": "value",
                "defaultVal": 0,
                "format": "%.6f",
                "pattern": globalDoubleRegExStringPattern,
                "hint": "Excitation detail - Ohms (Register: _EF_CONFIG_D)",
                "getValidator": function() {
                    var isValid = function(value) {
                        return true;
                    };
                    return isValid;
                }
            }],
            thermistor: [{
                "configReg": "_EF_CONFIG_A",
                "description": "Bitmask to configure temperature metric",
                "humanName": "Metric",
                "type": "select",
                "defaultVal": 0,
                "cssClass": "ainEFConfigA",
                "format": function(data) {
                    var value = Number(data.value);
                    var options = globalDeviceConstants.t7DeviceConstants.rtdTemperatureMetrics;
                    var unitStr = '';
                    options.forEach(function(option) {
                        if(option.value === value) {
                            unitStr = option.name;
                        }
                    });
                    return unitStr;
                },
                "getOptions": function() {
                    return globalDeviceConstants.t7DeviceConstants.rtdTemperatureMetrics;
                }
            }, {
                "configReg": "_EF_CONFIG_B",
                "description": "Excitation Circuit, see datasheet section 14.1.0.1",
                "humanName": "Excitation Circuit Index",
                "type": "select",
                "defaultVal": 0,
                "cssClass": "ainEFConfigB",
                "notFoundText": "Custom",
                // "format": "%.0f",
                // "pattern": globalIntegerRegExStringPattern,
                "hint": "Index",
                "format": function(data) {
                    var value = Number(data.value);
                    var options = globalDeviceConstants.t7DeviceConstants.excitationCircuits;
                    var unitStr = '';
                    options.forEach(function(option) {
                        if(option.value === value) {
                            unitStr = option.name;
                        }
                    });
                    return unitStr;
                },
                "getOptions": function() {
                    return globalDeviceConstants.t7DeviceConstants.excitationCircuits;
                }
            }, {
                "configReg": "_EF_CONFIG_C",
                "description": "Excitation AIN Channel Number used to measure the Thermistor's excitation.",
                "humanName": "Excitation AIN Channel Number (2nd AIN)",
                "type": "value",
                "defaultVal": 0,
                "format": "%.0f",
                "pattern": globalIntegerRegExStringPattern,
                "hint": "AIN Ch. Register Number (0, 2, 4...). Write to reg. _EF_CONFIG_C",
                "validator": function(value) {
                    if(value >= 0 && value <= 128) {
                        return true;
                    } else {
                        return false;
                    }
                }
            }, {
                "configReg": "_EF_CONFIG_D",
                "description": "Number of volts provided as the excitation circuit voltage source.",
                "humanName": "Excitation detail - Volts or Amps",
                "type": "value",
                "defaultVal": 0,
                "format": "%.6f",
                "pattern": globalDoubleRegExStringPattern,
                "hint": "Excitation detail - Volts or Amps (Register: _EF_CONFIG_D)",
                "validator": function(value) {
                    return true;
                }
            }, {
                "configReg": "_EF_CONFIG_E",
                "description": "The resistance in ohms of the shunt resistor.",
                "humanName": "Excitation Detail Ohms (Resistance of shunt resistor)",
                "type": "value",
                "defaultVal": 0,
                "format": "%.6f",
                "pattern": globalDoubleRegExStringPattern,
                "hint": "Offset",
                "validator": function(value) {
                    return true;
                }
            }, {
                "configReg": "_EF_CONFIG_F",
                "description": "Nominal resistance of Thermistor at 25 °C",
                "humanName": "The nominal resistance in ohms of the thermistor at 25 °C",
                "type": "value",
                "defaultVal": 0,
                "format": "%.6f",
                "pattern": globalDoubleRegExStringPattern,
                "hint": "Excitation detail - Ohms",
                "getValidator": function() {
                    var isValid = function(value) {
                        return true;
                    };
                    return isValid;
                }
            }, {
                "configReg": "_EF_CONFIG_G",
                "description": "A constant",
                "humanName": "A constant or ß",
                "type": "value",
                "defaultVal": 0,
                "format": "%.6f",
                "pattern": globalDoubleRegExStringPattern,
                "hint": "A constant",
                "getValidator": function() {
                    var isValid = function(value) {
                        return true;
                    };
                    return isValid;
                }
            }, {
                "configReg": "_EF_CONFIG_H",
                "description": "B constant",
                "humanName": "B constant",
                "type": "value",
                "defaultVal": 0,
                "format": "%.6f",
                "pattern": globalDoubleRegExStringPattern,
                "hint": "B constant",
                "getValidator": function() {
                    var isValid = function(value) {
                        return true;
                    };
                    return isValid;
                }
            }, {
                "configReg": "_EF_CONFIG_I",
                "description": "C constant",
                "humanName": "C constant",
                "type": "value",
                "defaultVal": 0,
                "format": "%.6f",
                "pattern": globalDoubleRegExStringPattern,
                "hint": "C constant",
                "getValidator": function() {
                    var isValid = function(value) {
                        return true;
                    };
                    return isValid;
                }
            }, {
                "configReg": "_EF_CONFIG_J",
                "description": "D constant",
                "humanName": "D constant",
                "type": "value",
                "defaultVal": 0,
                "format": "%.6f",
                "pattern": globalDoubleRegExStringPattern,
                "hint": "D constant",
                "getValidator": function() {
                    var isValid = function(value) {
                        return true;
                    };
                    return isValid;
                }
            }],
        },
        efReadOptions: {
            slopeOffset: [{
                "readReg": "_EF_READ_A",
                "location":"primary",
                "humanName": "Slope/Offset",
                "description": "Measured volts * slope + offset",
                "unit": "",
            }],
            minMaxAvg: [{
                "readReg": "_EF_READ_A",
                "location": "primary",
                "humanName": "Average",
                "description": "Calculated average voltage from sampled data.",
                "unit": "V",
            }, {
                "readReg": "_EF_READ_B",
                "location": "secondary",
                "humanName": "Maximum Voltage",
                "description": "Calculated maximum voltage from the sampled data.",
                "unit": "V",
            }, {
                "readReg": "_EF_READ_C",
                "location": "secondary",
                "humanName": "Minimum Voltage",
                "description": "Calculated minimum voltage from the sampled data.",
                "unit": "V",
            }],
            resistance: [{
                "readReg": "_EF_READ_A",
                "location": "primary",
                "humanName": "Resistance",
                "description": "Calculated resistance.",
                "unit": "Ω",
            }, {
                "readReg": "_EF_READ_B",
                "location": "secondary",
                "humanName": "Voltage",
                "description": "Voltage.",
                "unit": "V",
            }, {
                "readReg": "_EF_READ_C",
                "location": "secondary",
                "humanName": "Current",
                "description": "Calculated minimum voltage from the sampled data.",
                "unit": "µA",
            }],
            averageThreshold: [{
                "readReg": "_EF_READ_A",
                "location": "primary",
                "humanName": "Threshold Flag",
                "description": "This is 1 when the average value is above the threshold.  0 when below.",
                "unit": "",
            }, {
                "readReg": "_EF_READ_B",
                "location": "secondary",
                "humanName": "Average",
                "description": "Calculated average voltage from the sampled data.",
                "unit": "V",
            }],
            flexRMS: [{
                "readReg": "_EF_READ_A",
                "location": "primary",
                "humanName": "RMS",
                "description": "Calculated Root Mean Square Voltage",
                "unit": "V",
            }, {
                "readReg": "_EF_READ_B",
                "location": "secondary",
                "humanName": "Peak-to-Peak Voltage",
                "description": "Calculated Peak-to-Peak Voltage",
                "unit": "V",
            }, {
                "readReg": "_EF_READ_C",
                "location": "secondary",
                "humanName": "DC Offset Voltage",
                "description": "Calculated DC Offset Voltage (Average)",
                "unit": "V",
            }, {
                "readReg": "_EF_READ_D",
                "location": "secondary",
                "humanName": "Period",
                "description": "Period (seconds)",
                "unit": "s",
            }],
            thermocouples: [{
                "readReg": "_EF_READ_A",
                "location": "primary",
                // "humanName": "Temp.",
                "humanNameReg": "_EF_INDEX",
                "getHumanName": function(efValue) {
                    var options = globalDeviceConstants.t7DeviceConstants.thermocoupleTypes;
                    var nameStr = 'N/A';
                    options.forEach(function(option) {
                        if(option.value === efValue) {
                            nameStr = option.name;
                        }
                    });
                    return nameStr;
                },
                "description": "Calculated Temperature",
                "format": function(data) {
                    var value = Number(data.value);
                    if(value !== -9999) {
                        return localSprintf('%.2f',value);
                    } else {
                        return "N/A";
                    }
                },
                "unitReg": "_EF_CONFIG_A",
                "getUnit": function(value) {
                    var options = globalDeviceConstants.t7DeviceConstants.thermocoupleTemperatureMetrics;
                    var unitStr = '';
                    options.forEach(function(option) {
                        if(option.value === value) {
                            unitStr = option.name;
                        }
                    });
                    return unitStr;
                }
            }, {
                "readReg": "_EF_READ_B",
                "location": "secondary",
                "humanName": "Final Voltage",
                "description": "Final voltage used to calculate Temperature",
                "unit": "V",
                "format": function(data) {
                    var value = Number(data.value);
                    if(value !== -9999) {
                        return localSprintf('%.6f',value);
                    } else {
                        return "N/A";
                    }
                }
            }, {
                "readReg": "_EF_READ_C",
                "location": "secondary",
                "humanName": "CJC Temperature",
                "description": "CJC temperature in degrees K",
                "format": function(data) {
                    var value = Number(data.value);
                    if(value !== -9999) {
                        return localSprintf('%.6f',value);
                    } else {
                        return "N/A";
                    }
                },
                "unitReg": "_EF_CONFIG_A",
                "getUnit": function(value) {
                    // Force value to reflect degrees K
                    // value = 0;
                    var options = globalDeviceConstants.t7DeviceConstants.thermocoupleTemperatureMetrics;
                    var unitStr = '';
                    options.forEach(function(option) {
                        if(option.value === value) {
                            unitStr = option.name;
                        }
                    });
                    return unitStr;
                }
            }, {
                "readReg": "_EF_READ_D",
                "location": "secondary",
                "humanName": "CJC Voltage",
                "description": "Thermocouple voltage calculated for CJC temperature",
                "unit": "V",
                "format": function(data) {
                    var value = Number(data.value);
                    if(value !== -9999) {
                        return localSprintf('%.6f',value);
                    } else {
                        return "N/A";
                    }
                }
            }],
            rtd: [{
                "readReg": "_EF_READ_A",
                "location": "primary",
                // "humanName": "Temp.",
                "humanNameReg": "_EF_INDEX",
                "getHumanName": function(efValue) {
                    var options = globalDeviceConstants.t7DeviceConstants.rtdTypes;
                    var nameStr = 'N/A';
                    options.forEach(function(option) {
                        if(option.value === efValue) {
                            nameStr = option.name;
                        }
                    });
                    return nameStr;
                },
                "description": "Calculated Temperature",
                "format": function(data) {
                    var value = Number(data.value);
                    if(value !== -9999) {
                        return localSprintf('%.2f',value);
                    } else {
                        return "N/A";
                    }
                },
                "unitReg": "_EF_CONFIG_A",
                "getUnit": function(value) {
                    var options = globalDeviceConstants.t7DeviceConstants.rtdTemperatureMetrics;
                    var unitStr = '';
                    options.forEach(function(option) {
                        if(option.value === value) {
                            unitStr = option.name;
                        }
                    });
                    return unitStr;
                }
            }, {
                "readReg": "_EF_READ_B",
                "location": "secondary",
                "humanName": "Resistance of the RTD",
                "description": "Resistance of the RTD",
                "unit": "Ω",
                "format": function(data) {
                    var value = Number(data.value);
                    if(value !== -9999) {
                        return localSprintf('%.6f',value);
                    } else {
                        return "N/A";
                    }
                }
            }, {
                "readReg": "_EF_READ_C",
                "location": "secondary",
                "humanName": "Voltage across the RTD",
                "description": "Voltage across the RTD",
                "unit": "V",
                "format": function(data) {
                    var value = Number(data.value);
                    if(value !== -9999) {
                        return localSprintf('%.6f',value);
                    } else {
                        return "N/A";
                    }
                }
            }, {
                "readReg": "_EF_READ_D",
                "location": "secondary",
                "humanName": "Current through the RTD",
                "description": "Current through the RTD",
                "unit": "A",
                "format": function(data) {
                    var value = Number(data.value);
                    if(value !== -9999) {
                        return localSprintf('%.6f',value);
                    } else {
                        return "N/A";
                    }
                }
            }],
            thermistor: [{
                "readReg": "_EF_READ_A",
                "location": "primary",
                "humanName": "Thermistor Temperature",
                "description": "Thermistor Temperature.",
                "format": function(data) {
                    var value = Number(data.value);
                    if(value !== -9999) {
                        return localSprintf('%.2f',value);
                    } else {
                        return "N/A";
                    }
                },
                "unitReg": "_EF_CONFIG_A",
                "getUnit": function(value) {
                    var options = globalDeviceConstants.t7DeviceConstants.rtdTemperatureMetrics;
                    var unitStr = '';
                    options.forEach(function(option) {
                        if(option.value === value) {
                            unitStr = option.name;
                        }
                    });
                    return unitStr;
                }
            }, {
                "readReg": "_EF_READ_B",
                "location": "secondary",
                "humanName": "Thermistor Resistance",
                "description": "Thermistor Resistance",
                "unit": "Ω",
            }, {
                "readReg": "_EF_READ_C",
                "location": "secondary",
                "humanName": "Thermistor Voltage",
                "description": "Thermistor Voltage.",
                "unit": "V",
            }],
        },
        excitationCircuits: [{
            "name": "Current source, 200 µA",
            "value": 0,
            "titleAppend":", use factory cal value"
        },{
            "name": "Current source, 10 µA",
            "value": 1,
            "titleAppend":", use factory cal value"
        },{
            "name": "Current source",
            "value": 2,
            "titleAppend":", specify amps in CONFIG_D"
        },{
            "name": "Shunt resistor",
            "value": 3,
            "titleAppend":", specify Rshunt ohms and AIN# to measure shunt voltage"
        },{
            "name": "Known Voltage source",
            "value": 4,
            "titleAppend":", specify R2 ohms and Vexc volts"
        },{
            "name": "Voltage source",
            "value": 5,
            "titleAppend":", specify R2 ohms and AIN# to measure Vexc voltage"
        }],
        thermocoupleTypes: [
            {"name": "TypeE","value": 20},
            {"name": "TypeJ","value": 21},
            {"name": "TypeK","value": 22},
            {"name": "TypeR","value": 23},
            {"name": "TypeT","value": 24},
            {"name": "TypeS","value": 25},
            {"name": "TypeC","value": 30}
        ],
        thermocoupleTemperatureMetrics: [
            {"name": "K","value": 0},
            {"name": "C","value": 1},
            {"name": "F","value": 2}
        ],
        thermocoupleCJCRegisters: [{
            "name": "T7 Screw Terminals (AIN0-3)",
            "value": 60052,
            "titleAppend":", TEMPERATURE_DEVICE_K"
        },{
            "name": "CB37 Screw Terminals (AIN0-13)",
            "value": 60050,
            "titleAppend":", TEMPERATURE_AIR_K"
        },{
            "name": "External Sensor on AIN12",
            "value": 24,// Modbus register for AIN12
            "titleAppend":", Voltage on AIN12, Req Slope: 55.56, Offset: 255.37"
        }],
        rtdTypes: [
            {"name": "PT100","value": 40},
            {"name": "PT500","value": 41},
            {"name": "PT1000","value": 42},
        ],
        rtdTemperatureMetrics: [
            {"name": "K","value": 0},
            {"name": "C","value": 1},
            {"name": "F","value": 2}
        ],
        rtdExcitationTypes: [{
            "name": "Current source, 200 µA",
            "value": 0,
            "titleAppend":", use factory cal value"
        },{
            "name": "Current source, 10 µA",
            "value": 1,
            "titleAppend":", use factory cal value"
        },{
            "name": "Current source",
            "value": 2,
            "titleAppend":", specify amps in CONFIG_G"
        },{
            "name": "Shunt resistor",
            "value": 3,
            "titleAppend":", specify Rshunt ohms and AIN# to measure shunt voltage"
        },{
            "name": "Known Voltage source",
            "value": 4,
            "titleAppend":", specify R2 ohms and Vexc volts"
        },{
            "name": "Voltage source",
            "value": 5,
            "titleAppend":", specify R2 ohms and AIN# to measure Vexc voltage"
        }],
    },
    "t7ProDeviceConstants": {
        "importedInfo":[
            "hasEFSystem",
            "ainBitsPrecision",
            "ainChannelNames",
            "allConfigRegisters",
            "configRegisters",
            "extraAllAinOptions",
            "ainNegativeCHOptions",
            "parsers",
            "ainRangeOptions",
            "ainResolutionOptions",
            "ainSettlingOptions_RAW",
            "ainSettlingOptions",
            "ainEFTypeOptions",
            "thermocoupleTypes",
            "thermocoupleTemperatureMetrics"
        ],
        "extendedInfo":[
            {"key":"ainResolutionOptions","values": [
                    {"name": "9","value": 9, "acquisitionTime": 200},
                    {"name": "10","value": 10, "acquisitionTime": 200},
                    {"name": "11","value": 11, "acquisitionTime": 200},
                    {"name": "12","value": 12, "acquisitionTime": 200}
                ]
            }
        ]
    }
};


var linkGlobalDeviceConstants = function() {
    var t7Pro = globalDeviceConstants.t7ProDeviceConstants;

    t7Pro.importedInfo.forEach(function(attr){
        var t7Info = globalDeviceConstants.t7DeviceConstants[attr];
        globalDeviceConstants.t7ProDeviceConstants[attr] = t7Info;
    });
    t7Pro.extendedInfo.forEach(function(attr){
        globalDeviceConstants.t7ProDeviceConstants[attr.key] = [];
        globalDeviceConstants.t7DeviceConstants[attr.key].forEach(function(t7Data){
            globalDeviceConstants.t7ProDeviceConstants[attr.key].push(t7Data);
        });
        var t7ProVals = attr.values;
        t7ProVals.forEach(function(t7ProData){
            globalDeviceConstants.t7ProDeviceConstants[attr.key].push(t7ProData);
        });
    });
};
linkGlobalDeviceConstants();



