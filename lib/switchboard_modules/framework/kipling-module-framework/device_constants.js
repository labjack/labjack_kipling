var globalDeviceConstantsSwitch = {
    "T7":"t7DeviceConstants",
    "T7Pro":"t7ProDeviceConstants",
    "T7-Pro":"t7ProDeviceConstants"
};
var globalDoubleRegExStringPattern = "(^\-?[0-9]{1,}$)|(^\-?[0-9]{1,}\\.$)|(^\-?[0-9]{1,}\\.[0-9]{1,}$)|(^\-?\\.[0-9]{1,}$)";
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
            0: function() {return globalDeviceConstants.t7DeviceConstants.ainEFTypeOptions[0];},
            1: function() {return globalDeviceConstants.t7DeviceConstants.ainEFTypeOptions[1];},
            20: function() {return globalDeviceConstants.t7DeviceConstants.ainEFTypeOptions[2];},
            21: function() {return globalDeviceConstants.t7DeviceConstants.ainEFTypeOptions[3];},
            22: function() {return globalDeviceConstants.t7DeviceConstants.ainEFTypeOptions[4];},
            23: function() {return globalDeviceConstants.t7DeviceConstants.ainEFTypeOptions[5];},
            24: function() {return globalDeviceConstants.t7DeviceConstants.ainEFTypeOptions[6];}
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
                }
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
                }
            },
            {"name": "TypeE Thermocouple","value": 20,
                "getConfigRoutine": function() {
                    return globalDeviceConstants.t7DeviceConstants.efConfigRoutine.thermocouples;
                },
                "getReadRegs": function() {
                    return globalDeviceConstants.t7DeviceConstants.efReadOptions.thermocouples;
                },
                "getConfigRegs": function() {
                    return globalDeviceConstants.t7DeviceConstants.efConfigOptions.thermocouples;
                }
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
                }
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
                }
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
                }
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
                }
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
            thermocouples: [
                {"reg": "_EF_INDEX", "value": 0, "description": ""},
                {"reg": "_RANGE", "value": 0.1, "description": ""},
                {"reg": "_EF_INDEX", "configKey": "efType", "description": ""},
                {"reg": "_EF_CONFIG_A", "value": 0, "description": ""},
                {"reg": "_EF_CONFIG_B", "value": 60052, "description": ""}
            ]
        },
        efConfigOptions: {
            slopeOffset: [
                {
                    "configReg": "_EF_CONFIG_D",
                    "description": "Custom slope to be applied to the reading",
                    "humanName": "Slope",
                    "type": "value",
                    "defaultVal": 1,
                    "format": "%.4f",
                    "pattern": globalDoubleRegExStringPattern,
                    "hint": "Slope",
                    "validator": function(value) {
                        return true;
                    }
                },{
                    "configReg": "_EF_CONFIG_E",
                    "description": "Custom offset to be applied to the reading",
                    "humanName": "Offset",
                    "type": "value",
                    "defaultVal": 0,
                    "format": "%.4f",
                    "pattern": globalDoubleRegExStringPattern,
                    "hint": "Offset",
                    "validator": function(value) {
                        return true;
                    }
                }
            ],
            thermocouples: [
                {
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
                },{
                    // "configReg": "_EF_CONFIG_B",
                    // "description": "Modbus address read to acquire CJC reading.  Default is 60052.",
                    // "humanName": "Custom CJC Modbus Address",
                    // "type": "value",
                    // "defaultVal": 60050,
                    // "format": "%d",
                    // // "pattern": "(^[0-9]{1,}$)|(^[0-9]{1,}\\.$)|(^[0-9]{1,}\\.[0]{1,}$)",
                    // "pattern": "(^60052$)|(^60050$)",
                    // "hint": "Modbus Address",
                    // "getValidator": function() {
                    //     var isDec = new RegExp(/^[0-9]{1,}$/g);
                    //     var isValid = function(value) {
                    //         return isDec.test(value.toString());
                    //     };
                    //     return isValid;
                    // }
                    "configReg": "_EF_CONFIG_B",
                    "description": "Modbus address read to acquire CJC reading.  Default is 60052.",
                    "humanName": "Cold Junction Location",
                    "type": "select",
                    "defaultVal": 60052,
                    "cssClass": "ainEFConfigB",
                    "notFoundText": "Custom",
                    "format": function(data) {
                        var value = Number(data.value);
                        var options = globalDeviceConstants.t7DeviceConstants.thermocoupleCJCRegisters;
                        var unitStr = '';
                        options.forEach(function(option) {
                            if(option.value === value) {
                                unitStr = option.name;
                            }
                        });
                        return unitStr;
                    },
                    "getOptions": function() {
                        return globalDeviceConstants.t7DeviceConstants.thermocoupleCJCRegisters;
                    }
                },{
                    "configReg": "_EF_CONFIG_D",
                    "description": "Custom slope to be applied to CJC reading (55.56 for LM34)",
                    "humanName": "CJC Slope",
                    "type": "value",
                    "defaultVal": 1,
                    "format": "%.4f",
                    "pattern": globalDoubleRegExStringPattern,
                    "hint": "Slope",
                    "getValidator": function() {
                        var isValid = function(value) {
                            return true;
                        };
                        return isValid;
                    }
                },{
                    "configReg": "_EF_CONFIG_E",
                    "description": "Custom offset to be applied to CJC reading (255.37 for LM34)",
                    "humanName": "CJC Offset",
                    "type": "value",
                    "defaultVal": 0,
                    "format": "%.4f",
                    "pattern": globalDoubleRegExStringPattern,
                    "hint": "Offset",
                    "getValidator": function() {
                        var isValid = function(value) {
                            return true;
                        };
                        return isValid;
                    }
                }
            ]
        },
        efReadOptions: {
            slopeOffset: [
                {
                    "readReg": "_EF_READ_A",
                    "location":"primary",
                    "humanName": "Slope/Offset",
                    "description": "Measured volts * slope + offset",
                    "unit": "",
                },
            ],
            thermocouples: [
                {
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
                            return sprintf('%.2f',value);
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
                },{
                    "readReg": "_EF_READ_B",
                    "location": "secondary",
                    "humanName": "Final Voltage",
                    "description": "Final voltage used to calculate Temperature",
                    "unit": "V"
                },{
                    "readReg": "_EF_READ_C",
                    "location": "secondary",
                    "humanName": "CJC Temperature",
                    "description": "CJC temperature in degrees K",
                    "format": function(data) {
                        var value = Number(data.value);
                        if(value !== -9999) {
                            return sprintf('%.4f',value);
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
                },{
                    "readReg": "_EF_READ_D",
                    "location": "secondary",
                    "humanName": "CJC Voltage",
                    "description": "Thermocouple voltage calculated for CJC temperature",
                    "unit": "V"
                }
            ]
        },
        thermocoupleTypes: [
            {"name": "TypeE","value": 20},
            {"name": "TypeJ","value": 21},
            {"name": "TypeK","value": 22},
            {"name": "TypeR","value": 23},
            {"name": "TypeT","value": 24}
        ],
        thermocoupleTemperatureMetrics: [
            {"name": "K","value": 0},
            {"name": "C","value": 1},
            {"name": "F","value": 2}
        ],
        thermocoupleCJCRegisters: [
            {
                "name": "T7 Screw Terminals (AIN0-3)",
                "value": 60052,
                "titleAppend":", TEMPERATURE_DEVICE_K"
            },{
                "name": "CB37 Screw Terminals (AIN0-13)",
                "value": 60050,
                "titleAppend":", TEMPERATURE_AIR_K"
            },{
                "name": "External LM34 on AIN12",
                "value": 24,// Modbus register for AIN12
                "titleAppend":", Voltage on AIN12, Req Slope: 55.56, Offset: 255.37"
            }
        ]
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



