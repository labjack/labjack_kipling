/**
 * Logic for the Analog Input Control Module.
 *
 * @author A. Samuel Pottinger (LabJack Corp, 2013)
 * @author Chris Johnson (LabJack Corp, 2013)
 *
 * Module Outline:
 *  1. Read Device Information
 *  2. Periodically Refresh Device Information
 *  3. Accept user input to Configure AINx Channels
 *
 * Read Device Information:
 *  1. Read AINx_EF_INDEX register to determine if configuring a channel will
 *     potentially have negative effects elsewhere.
 *  2. Read AINx_RANGE
 *  3. Read AINx_RESOLUTION_INDEX
 *  4. Read AINx_SETTLING_US
 *
 * Periodically Sample:
 *  1. AINx to get reported voltage value
 *  2. AINx_BINARY to get reported binary voltage value
 *
 * Configure AINx Channel:
 *  1. Accept input to change AINx_RANGE
 *  2. Accept input to change AINx_RESOLUTION_INDEX
 *  3. Accept input to change AINx_SETTLING_US
**/
const sprintf = require('sprintf-js').sprintf;
const async = require('async');

const globalDeviceConstants = global.globalDeviceConstants;
const globalDeviceConstantsSwitch = global.globalDeviceConstantsSwitch;

const handleBarsService = package_loader.getPackage('handleBarsService');

const ljmmm_parse = require('ljmmm-parse');

/**
 * Module object that gets automatically instantiated & linked to the appropriate framework.
 * When using the 'singleDevice' framework it is instantiated as sdModule.
 */
function module() {
    this.ENABLE_DEBUGGING = false;
    this.moduleConstants = {};
    this.moduleContext = {};
    this.activeDevice = undefined;
    this.activeDeviceType = undefined;
    this.framework = undefined;
    this.defineDebuggingArrays = true;
    this.baseRegisters = undefined;
    this.ain_ef_type_map = undefined;

    // String key to trigger a clearing of current values
    var FORCE_AIN_VAL_REFRESH = 'FORCE_AIN_VAL_REFRESH';
    this.currentValues = new Map();
    this.isValueNew = new Map();
    this.newBufferedValues = new Map();
    this.bufferedOutputValues = new Map();
    this.analogInputsDict = new Map();

    this.ANALOG_INPUT_PRECISION = 6;

    this.deviceConstants = {};
    this.curDeviceOptions = new Map();
    this.regParserDict = new Map();
    this.regParser = new Map();

    this.initRegParser = function() {
        self.regParser = new Map();
        // self.regParser.set = (name, value) => {
        //     self.regParserDict.set(name, value);
        // };
        self.regParserGet = function (name, value) {
            var data = self.regParser.get(name);
            if(typeof(data) === 'undefined') {
                return self.deviceConstants.extraAllAinOptions[0];
            }
            if (typeof data === 'function') {
                return data(value);
            }
            return data;
        };
/*
        self.regParser.get = function(name) {
            var data = self.regParserDict.get(name);
            if(typeof(data) === 'undefined') {
                return self.deviceConstants.extraAllAinOptions[0];
            } else {
                if (typeof data === 'function') {
                    return data();
                }
                return data;
            }
        };
*/
        // self.regParser.delete = self.regParserDict.delete;
        // self.regParser.forEach = self.regParserDict.forEach;
        // self.regParser.size = self.regParserDict.size;
        // self.regParser.has = self.regParserDict.has;

    };

    //Define nop (do-nothing) function
    var nop = function(){};

    // T4 ONLY NEED TO MAKE THIS CHANGE BASED ON DEVICE TYPE --------------
     // Base-Register Variable for Configuring multiple thermocouples.
     var baseReg = 'AIN#(0:13)';
     // Expand baseReg & create baseRegister list using ljmmm.
     var baseRegisters = ljmmm_parse.expandLJMMMName(baseReg);
     this.ain_ef_types = globalDeviceConstants.t7DeviceConstants.ainEFTypeOptions;
     var ain_ef_type_map = globalDeviceConstants.t7DeviceConstants.ainEFTypeMap;
     this.ain_ef_type_map = ain_ef_type_map; // this seems to be the only one used for now.
    // var baseReg = 'AIN#(0:11)';
    // var baseRegisters = ljmmm_parse.expandLJMMMName(baseReg);

    // var ain_ef_types = globalDeviceConstants.t4DeviceConstants.ainEFTypeOptions;
    // var ain_ef_type_map = globalDeviceConstants.t4DeviceConstants.ainEFTypeMap;
    // this.ain_ef_type_map = ain_ef_type_map; // this seems to be the only one used for now.


    // this.onDeviceSelected;
    // console.warn("active device", self.onDeviceSelected);
    // switch (self.activeDeviceType) {
    //     case 'T8':
    //         // Base-Register Variable for Configuring multiple thermocouples.
    //         var baseReg = 'AIN#(0:7)';
    //         // Expand baseReg & create baseRegister list using ljmmm.
    //         var baseRegisters = ljmmm_parse.expandLJMMMName(baseReg);
    //         this.ain_ef_types = globalDeviceConstants.t8DeviceConstants.ainEFTypeOptions;
    //         var ain_ef_type_map = globalDeviceConstants.t8DeviceConstants.ainEFTypeMap;
    //         this.ain_ef_type_map = ain_ef_type_map; // this seems to be the only one used for now.
    //         break;
    //     case 'T7':
    //         // Base-Register Variable for Configuring multiple thermocouples.
    //         var baseReg = 'AIN#(0:13)';
    //         // Expand baseReg & create baseRegister list using ljmmm.
    //         var baseRegisters = ljmmm_parse.expandLJMMMName(baseReg);
    //         this.ain_ef_types = globalDeviceConstants.t7DeviceConstants.ainEFTypeOptions;
    //         var ain_ef_type_map = globalDeviceConstants.t7DeviceConstants.ainEFTypeMap;
    //         this.ain_ef_type_map = ain_ef_type_map; // this seems to be the only one used for now.
    //         break;
    //     case 'T4':
    //         // Base-Register Variable for Configuring multiple thermocouples.
    //         var baseReg = 'AIN#(0:11)';
    //         // Expand baseReg & create baseRegister list using ljmmm.
    //         this.baseRegisters = ljmmm_parse.expandLJMMMName(baseReg);
    //         this.ain_ef_types = globalDeviceConstants.t4DeviceConstants.ainEFTypeOptions;
    //         var ain_ef_type_map = globalDeviceConstants.t4DeviceConstants.ainEFTypeMap;
    //         this.ain_ef_type_map = ain_ef_type_map; // this seems to be the only one used for now.
    //         break;
    // }

    // efTypeName template
    var ainEFTypeNameTemplate;

    // Helper-text template.
    var ainEFTypeHelperTextTemplate;

    // efTypePrimary template
    var ainEFTypePrimaryTemplate;

    // efTypeSecondary template
    var ainEFTypeSecondaryRegTemplate;

    // ef config templates
    var ainEFTypeConfigTemplates = {
        // 'value':
        // 'select':
        // 'modbusRegister':
    };

    // Templates
    this.templates = {};

    var compileTemplates = function(framework) {
        var templatesToCompile = [
            'ainEFTypeNameTemplate',
            'ainEFTypePrimaryTemplate',
            'ainEFTypeSecondaryRegTemplate',
            'ainEFTypeConfigTemplateStr_value',
            'ainEFTypeConfigTemplateStr_modbusRegister',
            'ainEFTypeConfigTemplateStr_select',
            'ainEFTypeHelperTextTemplate',
        ];
        templatesToCompile.forEach(function(templateName) {
            try {
                self.templates[templateName] = handleBarsService._compileTemplate(
                    framework.moduleData.htmlFiles[templateName]
                );
            } catch(err) {
                console.error('Error compiling templates', err);
            }
        });
        ainEFTypeNameTemplate = self.templates.ainEFTypeNameTemplate;
        ainEFTypeHelperTextTemplate = self.templates.ainEFTypeHelperTextTemplate;
        ainEFTypePrimaryTemplate = self.templates.ainEFTypePrimaryTemplate;
        ainEFTypeSecondaryRegTemplate = self.templates.ainEFTypeSecondaryRegTemplate;
        ainEFTypeConfigTemplates.value = self.templates.ainEFTypeConfigTemplateStr_value;
        ainEFTypeConfigTemplates.select = self.templates.ainEFTypeConfigTemplateStr_select;
        ainEFTypeConfigTemplates.modbusRegister = self.templates.ainEFTypeConfigTemplateStr_modbusRegister;

    };

    var isDefined = function(val) {
        if(typeof(val) !== 'undefined') {
            return true;
        } else {
            return false;
        }
    };


    // Supported analog input negative channel options
    var ainNegativeCHOptions = [{
        value: 199,
        name: "GND"
    }];
    this.getNegativeChOption = function(val){
        if(val%2 === 0) {
            return [
                {value: 199,name: "GND"},
                {value: val,name: 'AIN'+val.toString()}
            ];
        } else {
            return [
                {value: 199,name: "GND"}
            ];
        }
    };

    // Supported extra options
    // TODO - do we want/need the extra options for the T8
    var extraAllAinOptions = globalDeviceConstants.t7DeviceConstants.extraAllAinOptions;

    // var extraAllAinOptions = globalDeviceConstants.t8DeviceConstants.extraAllAinOptions;

    this.efTypeDict = new Map();
    this.rangeOptionsDict = new Map();
    this.resolutionOptionsDict = new Map();
    this.settlingOptionsDict = new Map();
    this.negativeChannelDict = new Map();

    var overrideGraphRanges = false;
    var minGraphRange;
    var maxGraphRange;

    this.pDict = function(dictToPrint) {
        dictToPrint.forEach(function(value,name){
            console.log(name,value);
        });
    };

    this.setupTypeConversionDicts = function(target,destination) {
        var setInfo = function(value,index){
            destination.set(value.value.toString(),value.name);
        };
        target.forEach(setInfo);
        var extraInfo = self.deviceConstants.extraAllAinOptions;
        extraInfo.forEach(setInfo);
    };
    this.buildDataParsers = function() {
        var parsers = self.deviceConstants.parsers;
        parsers.forEach(function(name){
            var dictName = name+'Dict';
            self.deviceConstants[dictName] = new Map();
            if(typeof(self.deviceConstants[name].numbers) !== 'undefined'){
                var options = [];
                var base = self.deviceConstants[name];
                base.numbers.forEach(function(num){
                    options.push(base.func(num));
                });
                self.setupTypeConversionDicts(
                    options,
                    self.deviceConstants[dictName]
                );
            } else {
                self.setupTypeConversionDicts(
                    self.deviceConstants[name],
                    self.deviceConstants[dictName]
                );
            }
        });
    };
    this.buildRegParser = function() {
        var configArray = self.deviceConstants.allConfigRegisters;
        var chConfigArray = self.deviceConstants.configRegisters;
        var addParser = function(data,index) {
            var formatReg = handleBarsService._compileTemplate(data.register);
            var compReg = formatReg(self.deviceConstants);
            var addrList = ljmmm_parse.expandLJMMMEntrySync(
                    {name: compReg, address: 0, type: 'FLOAT32'}
                ).map(function (entry) { return entry.name; });
            if((data.options !== 'func') && (data.options !== 'raw')) {
                var dataObj = self.deviceConstants[data.options+'Dict'];
                var getData = function(val) {
                    var value = Math.round(val*1000)/1000;
                    return {value: val, name: dataObj.get(value.toString())};
                };
                addrList.forEach(function(addr){
                    self.regParser.set(addr, getData);
                });
            } else if (data.options === 'raw') {
                addrList.forEach(function(addr){
                    var getData = function(val) {
                        return {name:addr,value:val};
                    };
                    self.regParser.set(addr,getData);
                });
            } else if (data.options === 'func') {
                addrList.forEach(function(addr){
                    var dataObj = self.deviceConstants[data.func];
                    var getData = function(val) {
                        return dataObj.func(val);
                    };
                    self.regParser.set(addr,getData);
                });
            }
        };
        configArray.forEach(addParser);
        chConfigArray.forEach(addParser);
        addParser({
            register:self.deviceConstants.ainChannelNames,
            options: 'raw'
        });
    };
    this.buildOptionsDict = function() {
        var configArray = self.deviceConstants.allConfigRegisters;
        var chConfigArray = self.deviceConstants.configRegisters;

        var addOptions = function(data) {
            var formatReg = handleBarsService._compileTemplate(data.register);
            var compReg = formatReg(self.deviceConstants);
            var addrList = ljmmm_parse.expandLJMMMEntrySync(
                {name: compReg, address: 0, type: 'FLOAT32'}
            ).map(function (entry) { return entry.name; });

            var deviceOptionsData = {};
            deviceOptionsData.name = data.name;
            deviceOptionsData.cssClass = data.cssClass;
            if (data.options !== 'func') {
                addrList.forEach(function(addr){
                    var menuOptions = [];
                    menuOptions = self.deviceConstants[data.options];
                    deviceOptionsData.menuOptions = menuOptions;
                    self.curDeviceOptions.set(addr,deviceOptionsData);
                });
            } else if (data.options === 'func') {
                var findNum = new RegExp("[0-9]{1,2}");
                addrList.forEach(function(addr){
                    var addrNum = findNum.exec(addr);
                    var dataObj = self.deviceConstants[data.func];
                    var menuOptions = dataObj.filter(addrNum);
                    deviceOptionsData.menuOptions = menuOptions;
                    self.curDeviceOptions.set(addr,deviceOptionsData);
                });
            }
        };
        configArray.forEach(addOptions);
        chConfigArray.forEach(addOptions);
    };

    this.writeReg = function(address,value) {
        return self.activeDevice.iWrite(address,value)
            .then(function(){
                self.bufferedOutputValues.set(address,value);
            });
    };
    this.getWriteReg = function(address, value) {
        return function() {
            return self.writeReg(address,value)
        };
    };

    /**
     * Function to handle ain reading formatting & updating the mini-graph.
     */
    this.ainResultUpdate = function(info) {
        var ainReading = info.value;
        var binding = info.binding.binding;
        var rangeIdName = '#'+binding+'-analog-input-range-select';
        var barIdName = '#'+binding+'-input-bar';
        var minValIdName = '#'+binding+'-min-range-val';
        var maxValIdName = '#'+binding+'-max-range-val';
        var rawVal = $(rangeIdName).val();
        var rangeVal;
        if(isNaN(rawVal)) {
            rangeVal = 10;
        } else {
            rangeVal = Number(rawVal);
        }
        var minRangeText = $(minValIdName).text();
        var maxRangeText = $(maxValIdName).text();
        var tStr;

        if (rangeVal == 2.5) { tStr = "0"; } //case for T4 AIN4-11 which are 0-2.5V
        else { tStr = (-1 * rangeVal).toString(); }

        if (minRangeText !== tStr) {
            $(minValIdName).text(tStr);
        }
        tStr = '+'+(rangeVal.toString());
        if (maxRangeText !== tStr) {
            $(maxValIdName).text(tStr);
        }

        switch (rangeVal) {
            case 10:
                break;
            case 1:
                ainReading = ainReading * 10;
                break;
            case 0.1:
                ainReading = ainReading * 100;
                break;
            case 0.01:
                ainReading = ainReading * 1000;
                break;
            case 0.001:
                ainReading = ainReading * 10000;
                break;
            default:
                break;
        }
        var width = 100 * ((ainReading + 10) / 20);
        if (width > 100){
            width = 100;
        }
        if (width < 0) {
            width = 0;
        }
        $(barIdName).css('width', String(width) + '%');

        if(typeof(info.value) !== 'number') {
            console.warn('Preventing sprintf on non-number');
            info.value = 0;
        }
        return sprintf('%10.6f', info.value);
    };
    this.genericConfigCallback = function(data, onSuccess) {
        var name = data.binding.binding;
        var value = data.value;
        if(name.indexOf('_RANGE') !== -1) {
            value = Math.round(value * 1000)/1000;
        }
        self.currentValues.set(name,value);
        self.isValueNew.set(name,false);
        onSuccess();
    };
    this.genericPeriodicCallback = function(data, onSuccess) {
        var name = data.binding.binding;
        var value = data.value;
        if(name.indexOf('_RANGE') !== -1) {
            value = Math.round(value * 1000)/1000;
        }
        var oldValue = self.currentValues.get(name);
        if(oldValue != value) {
            self.isValueNew.set(name,true);
            self.newBufferedValues.set(name,value);
        } else {
            self.isValueNew.set(name,false);
            self.newBufferedValues.delete(name);
        }
        onSuccess();
    };
    this.optionsClickHandler = function(data, onSuccess) {
        var clickId = '#'+data.binding.binding;
        var objId = clickId.split('callback')[0]+'options';
        var buttonId = clickId.split('-callback')[0];
        var objEl = $(objId);
        var buttonEl = $(buttonId);
        if(objEl.css('display') === 'none') {
            objEl.fadeIn(100,function(){
                buttonEl.removeClass('icon-plus');
                buttonEl.addClass('icon-minus');
                buttonEl.attr('title','Hide Options');
            });
        } else {
            objEl.fadeOut(100,function(){
                buttonEl.removeClass('icon-minus');
                buttonEl.addClass('icon-plus');
                buttonEl.attr('title','Show Options');
            });
        }
        onSuccess();
    };
    this.genericDropdownClickHandler = function(data, onSuccess) {
        var rootEl = data.eventData.toElement;
        // console.warn("",data)
        var className = rootEl.className;
        var buttonEl;
        var buttonID = '';
        var selectEl;
        var register;
        var value;
        var newText = '';
        var newTitle = '';


        if(className === 'menuOption') {
            self.bufferedOutputValues.set(FORCE_AIN_VAL_REFRESH,1);
            buttonEl = rootEl.parentElement.parentElement.parentElement;
            buttonID = buttonEl.id;
            selectEl = buttonEl.children[0].children[0];
            register = buttonID.split('-SELECT')[0];
            value = Number(rootEl.getAttribute('value'));
            newText = rootEl.text;
            newTitle = register + ' is set to ' + value.toString();

            //Set title
            selectEl.title = newTitle;
            //Set new text
            selectEl.innerText = newText;

            // -----------------------------------------------------------------
            //Perform device I/O from TC-simple
            // if(tcTypeVal !== 0) {
            //     device.write(channelName + AIN_EF_SETUP_CONFIG_STR,0);
            //     device.write(channelName + '_RANGE',0.1);
            //     device.write(channelName + AIN_EF_SETUP_CONFIG_STR,tcTypeVal);
            //     device.write(channelName + '_EF_CONFIG_A',tempMetricVal);
            //     device.write(channelName + '_EF_CONFIG_B',60052);
            // } else {
            //     device.write(channelName + AIN_EF_SETUP_CONFIG_STR,0);
            // }
            // -----------------------------------------------------------------

            // Get determine if we are configuring an AIN_EF
            var isIndex = register.indexOf('_EF_INDEX') > -1;
            var isType = register.indexOf('_EF_TYPE') > -1;


            var getDeviceCalls = function(efInfo, register, value) {
                var ioArray = [];
                var curChannel = findActiveChannel.exec(register);
                var writeList = [];
                efInfo.configRoutine.forEach(function(configStep) {
                    var writeVal;
                    var writeReg = curChannel + configStep.reg;
                    // Check to see if there is a value that must be written
                    if(typeof(configStep.value) !== 'undefined') {
                        // Save desired default value as value to be written
                        writeVal = configStep.value;
                    } else {
                        // We Must find a value to write....
                        if(typeof(configStep.configKey) !== 'undefined') {
                            if(configStep.configKey === 'efType') {
                                writeVal = value;
                            } else {
                                writeVal = 0;
                            }
                        } else {
                            writeVal = 0;
                        }
                    }
                    var singleOp = {
                        "register": writeReg,
                        "value": writeVal
                    };
                    writeList.push(singleOp);
                    ioArray.push(self.getWriteReg(writeReg,writeVal));
                });

                return ioArray;
            };
            var configDevice = function(ioArray) {
                return new Promise((resolve, reject) => {
                    var step = 0;
                    async.eachSeries(ioArray, function (func, callback) {
                        step += 1;
                        func()
                            .then(callback, function (err) {
                                console.error('IO Error Step', step, func);
                                callback(err);
                            });
                    }, function (err) {
                        if (err) {
                            console.error('EF Config Failed -configDevice', err);
                            reject(err);
                        } else {
                            resolve();
                        }
                    });
                });
            };
            var baseReg = 'AIN#(0:13)'
            var baseRegisters = ljmmm_parse.expandLJMMMName(baseReg);
            switch (self.activeDeviceType) {
                case 'T8':
                    baseReg = 'AIN#(0:7)'
                    baseRegisters = ljmmm_parse.expandLJMMMName(baseReg);
                    break;
                case 'T7':
                    baseReg = 'AIN#(0:13)';
                    baseRegisters = ljmmm_parse.expandLJMMMName(baseReg);
                    break;
                case 'T7-Pro':
                    baseReg = 'AIN#(0:13)';
                    baseRegisters = ljmmm_parse.expandLJMMMName(baseReg);
                    break;
                case 'T4':
                    baseReg = 'AIN#(0:11)';
                    baseRegisters = ljmmm_parse.expandLJMMMName(baseReg);
                    break;

            }

            if(register.indexOf('AIN_ALL') === 0) {
                // console.error("569 base registers used here \n\n")
                baseRegisters.forEach(function(baseRegister) {
                    var reg = baseRegister + register.split('AIN_ALL')[1];
                    self.bufferedOutputValues.set(reg,value);
                });
            }

            // Switch based on what type of register is being configured. (check for _EF_TYPE or _EF_INDEX)
            if (isIndex || isType) {
                var getCurEFInfo = self.ain_ef_type_map[value];
                if(typeof(getCurEFInfo) !== 'undefined') {
                    var curEFInfo = getCurEFInfo();
                    if (typeof(curEFInfo) !== 'undefined') {
                        curEFInfo.configRoutine = curEFInfo.getConfigRoutine();
                        curEFInfo.readRegs = curEFInfo.getReadRegs();
                        curEFInfo.configRegs = curEFInfo.getConfigRegs();

                        curEFInfo.configRegs.forEach(function(reg,i) {
                            if(reg.type === 'select') {
                                curEFInfo.configRegs[i].options = reg.getOptions();
                            }
                        });
                        var getRefreshPageInfo = function(register,value) {
                            var refreshPageInfo = function() {
                                // When finished configuring the device...
                                var chNum = findActiveChannelNum.exec(register);
                                if(typeof(chNum[0]) !== 'undefined') {
                                    chNum = chNum[0];
                                    // refresh the DOM & framework according to EF data.
                                    self.refreshEFInfo(chNum,value);
                                }
                            };
                            return refreshPageInfo;
                        };
                        var ioArray = getDeviceCalls(curEFInfo, register, value);
                        configDevice(ioArray)
                        .then(
                            getRefreshPageInfo(register,value),
                            function(err) {
                                // if we failed to configure the device, set EF type to 0.
                                var recoveryInfo = ain_ef_type_map[0]();
                                recoveryInfo.configRoutine = recoveryInfo.getConfigRoutine();
                                recoveryInfo.readRegs = recoveryInfo.getReadRegs();
                                recoveryInfo.configRegs = recoveryInfo.getConfigRegs();
                                var recoverFuncs = getDeviceCalls(recoveryInfo, register, 0);
                                configDevice(recoverFuncs)
                                .then(
                                    getRefreshPageInfo(register,value),
                                    getRefreshPageInfo(register,value)
                                );
                                showAlert(
                                    'Failed to config AIN_EF, attempting to recover' +
                                    self.ljmDriver.errToStrSync(err)
                                );
                        });
                    } else {
                        showAlert('Un-expected Error, Bad _EF Selection');
                        console.error('Check device_constants.js, *ainEFTypeMap*');
                    }
                } else {
                    showAlert('Un-expected Error, Bad _EF Selection');
                    console.error('Check device_constants.js, *ainEFTypeMap*');
                }
            } else {
                //Perform device IO
                self.writeReg(register,value)
                .then(function(){
                    console.log('Successfully wrote data!', register, value);
                }, function(err){
                    console.log('Failed to write data :(',err,register,value);
                    var errorInfo;
                    var callShowAlert = true;
                    try {
                        errorInfo = modbus_map.getErrorInfo(err);
                        if(errorInfo.error >= 0) {
                            callShowAlert = false;
                        } else {
                            errorInfo = err.toString();
                        }
                    } catch(caughtError) {
                        errorInfo = caughtError.toString();
                    }
                    if(callShowAlert) {
                        showAlert(errorInfo);
                    }
                });
            }
        }
        onSuccess();
    };

    this.configureModule = function(onSuccess) {
        // console.error('configureModule\n\n\n')
        var devConstStr;
        var productType;
        var baseReg;
        try{
            productType = self.activeDevice.savedAttributes.productType;
            devConstStr = globalDeviceConstantsSwitch[productType];
            self.deviceConstants = globalDeviceConstants[devConstStr];
            console.warn("self", self)
            console.warn("globalDeviceConstants", globalDeviceConstants)
            baseReg = self.deviceConstants.ainChannelNames;
            if(typeof(self.deviceConstants)==='undefined'){
                console.error('Selected Device is not defined!!');
            }
        } catch(err) {
            console.error('Failed to configureModule',err);
        }
        // self.setupTypeConversionDicts(self.deviceConstants);
        self.initRegParser();
        self.buildDataParsers();
        self.buildRegParser();
        self.buildOptionsDict();

        // Define the module's setupBindings
        var bindingList = [];
        bindingList.push({"name": baseReg, "isPeriodic":true, "type":"FLOAT32"});
        var addRegs = function(data) {
            var formatReg;
            var compReg;
            if(typeof(data.manual) === 'undefined') {
                formatReg = handleBarsService._compileTemplate(data.register);
                compReg = formatReg(self.deviceConstants);
                bindingList.push({"name": compReg, "isPeriodic":true});
            } else {
                if(!data.manual) {
                    formatReg = handleBarsService._compileTemplate(data.register);
                    compReg = formatReg(self.deviceConstants);
                    bindingList.push({"name": compReg, "isPeriodic":true});
                }
            }
        };
        self.deviceConstants.configRegisters.forEach(addRegs);
        self.deviceConstants.allConfigRegisters.forEach(addRegs);

        // Initialize smart register's array
        var smartBindings = [];

        // Add analog input registers
        var addAINInputReg = function(newBinding) {
            var binding = {};
            binding.bindingName = newBinding.name;
            if(newBinding.isPeriodic) {
                binding.smartName = 'readRegister';
            }
            if(typeof(newBinding.type) !== 'undefined') {
                if(newBinding.type === 'FLOAT32') {
                    binding.format = '%.' ;
                    binding.format += self.ANALOG_INPUT_PRECISION.toString();
                    binding.format += 'f';
                }
            }
            binding.periodicCallback = self.genericPeriodicCallback;
            binding.configCallback = self.genericConfigCallback;
            smartBindings.push(binding);

            var clickBinding = {};
            if(!(typeof(newBinding.type) !== 'undefined')) {
                clickBinding.bindingName = newBinding.name+'-SELECT';
                clickBinding.smartName = 'clickHandler';
                clickBinding.callback = self.genericDropdownClickHandler;
                smartBindings.push(clickBinding);
            }

        };
        bindingList.forEach(addAINInputReg);

        var customSmartBindings = [
            {
                // Define binding to handle user click events on options button.
                bindingName: baseReg+'-options-toggle-button',
                smartName: 'clickHandler',
                callback: self.optionsClickHandler
            }
        ];

        self.framework.putSmartBindings(smartBindings);
        self.framework.putSmartBindings(customSmartBindings);
        onSuccess();
    };
    this.refreshEFInfo = function(chNum, efType) {
        // Clear any bindings that may exist & clear DOM data.
        self.removeAinEFInfo(chNum);

        // Add the info back to the dom & add bindings back.
        self.addAinEFInfo(chNum, efType);
    };
    this.removeAinEFInfo = function(chNum) {
        var chName = 'AIN' + chNum.toString();
        var baseID = '#' + chName + '-table-data';
        var nameEle = $(baseID + ' .efTypeName');
        var primaryEle = $(baseID + ' .efPrimaryReading');
        var efBaseID = '#' + chName + '-ainEFExtendedInfo';
        var helperTextEle = $(efBaseID + ' .efExtendedInfoHelperText');
        var efConfigsEle = $(efBaseID + ' .ainEFConfigs');
        var secondaryReadsEle = $(efBaseID + ' .ainEFSecondaryReadRegisters');
        nameEle.slideUp(function(){
            nameEle.empty();
        });
        primaryEle.slideUp(function(){
            primaryEle.empty();
        });
        helperTextEle.slideUp(function() {
            helperTextEle.empty();
        });
        efConfigsEle.slideUp(function() {
            efConfigsEle.empty();
        });
        secondaryReadsEle.slideUp(function() {
            secondaryReadsEle.empty();
        });
        self.deleteEFBindings(chNum);
    };
    this.deleteEFBindings = function(chNum) {
        chNum = 'AIN' + chNum.toString();
        var endings = ['A','B','C','D','E'];
        var types = ['_EF_READ_','_EF_CONFIG_'];
        var bindings = [];
        endings.forEach(function(ending) {
            types.forEach(function(type){
                var key = chNum + type + ending;
                if(self.framework.bindings.has(key)) {
                    bindings.push({
                        bindingClass: key,
                        template: key,
                        binding: key,
                        direction: 'read'
                    });
                }
            });
        });
        if(bindings.length > 0) {
            self.framework.deleteConfigBindings(bindings);
        }
    };

    this.getCurrentBufferedVal = function(key,defaultVal) {
        if(self.bufferedOutputValues.has(key)) {
            return self.bufferedOutputValues.get(key);
        } else {
            return self.currentValues.get(key,defaultVal);
        }
    };

    this.lastInputClickEvent = null;
    this.lastInputGoEvent = null;
    this.lastInputKeyboardEvent = null;
    this.lastInputKeyboardEvent = null;
    this.registerClickHandlers = function(chNum, efType, baseID) {
        var writeConfig = function(reg, val, isValid) {
            var errorString;
            if((typeof(val) !== 'undefined') && (typeof(reg) !== 'undefined')) {
                if(isValid) {
                    self.writeReg(reg,val).then(
                        function() {},
                        function(err) {
                            var message = "Got: ";
                            message += self.ljmDriver.errToStrSync(err);
                            message += " writing reg: " + reg;
                            showAlert(message);
                        }
                    );
                } else {
                    errorString = 'Prevented writing invalid value: ' +
                        String(val) + ' to register: ' + reg;
                    showAlert(errorString);
                }
            } else {
                errorString = 'Detected error before writing value: ' +
                    String(val) + ' to register: ' + reg;
                showAlert(errorString);
            }
        };
        var menuClickHandler = function(event) {
            var rootEl = event.toElement;
            var className = rootEl.className;
            var buttonEl;
            var buttonID = '';
            var selectEl;
            var register;
            var value;
            var newText = '';
            var newTitle = '';
            var isValid;

            if(className === 'menuOption') {
                self.lastMenuClickEvent = event;
                buttonEl = rootEl.parentElement.parentElement.parentElement;
                buttonID = buttonEl.id;
                selectEl = buttonEl.children[0].children[0];
                register = buttonID.replace('-SELECT','');
                value = Number(rootEl.getAttribute('value'));
                newText = rootEl.text;
                newTitle = register + ' is set to ' + value.toString();

                //Set title
                selectEl.title = newTitle;
                //Set new text
                selectEl.innerText = newText;
                isValid = true;
                writeConfig(register,value,isValid);
            }

        };
        var modbusRegOptionsMenuClickHandler = function(event) {
            var rootEl = event.toElement;
            var className = rootEl.className;
            var buttonEl;
            var buttonID = '';
            var selectEl;
            var register;
            var value;
            var newText = '';
            var newTitle = '';
            var isValid;

            if(className === 'menuOption') {
                self.lastMenuClickEvent = event;
                buttonEl = rootEl.parentElement.parentElement.parentElement;
                buttonID = buttonEl.id;
                selectEl = buttonEl.children[0].children[0];
                register = buttonID.replace('-MB-REG-SELECT','');
                value = Number(rootEl.getAttribute('value'));
                newText = rootEl.text;
                newTitle = register + ' is set to ' + value.toString();

                //Set title
                // selectEl.title = newTitle;
                //Set new text
                // selectEl.innerText = newText;
                isValid = true;
                // console.log('Writing...', register, value);
                writeConfig(register,value,isValid);
            }

        };
        var inputKeyboardHandler = function(event) {
            if (event.which == 13) {
                event.preventDefault();
                self.lastInputKeyboardEvent = event;
                var rootEl = event.target;
                var rootID = rootEl.id;
                var reg = rootID;
                var rawVal = rootEl.value;
                var val = Number(rawVal);
                var isValid = rootEl.validity.valid;

                // Un-focus the element
                rootEl.blur();

                // Code to support writing modbusRegister addresses as values.
                var ele = $(rootEl);
                var ljtype = ele.attr('ljtype');
                if(ljtype) {
                    if(ljtype === 'modbusRegister') {
                        val = rawVal;
                        var regInfo = modbus_map.getAddressInfo(val, 'R');
                        if(regInfo.directionValid) {
                            val = regInfo.data.address;
                            isValid = true;
                        } else {
                            isValid = false;
                        }
                    }
                }

                writeConfig(reg,val,isValid);
            } else {
                console.log('Other keypress captured',event.which);
            }
        };
        var inputGoHandler = function(event) {
            self.lastInputGoEvent = event;
            var toElement = event.toElement;
            var rootEl;
            var valEL;

            if(toElement.tagName === 'SPAN') {
                rootEl = toElement.parentElement;
                valEl = rootEl.parentElement.children[0];
            } else if (toElement.tagName === 'BUTTON') {
                rootEl = toElement;
                valEl = rootEl.parentElement.children[0];
            }
            var rawVal = valEl.value;
            var val = Number(rawVal);
            var rootID = rootEl.id;
            var reg = rootID.replace('-efConfig-INPUT-BTN','');
            var isValid = valEl.validity.valid;

            rootEl.blur();
            writeConfig(reg,val,isValid);
        };
        var inputChangeHandler = function(event) {
            self.lastInputClickEvent = event;
            var rootEl = event.target;
            var rootID = rootEl.id;

            var reg = rootID.replace('-INPUT','');
            var rawVal = rootEl.value;
            var val = Number(rawVal);
            var isValid = rootEl.validity.valid;

            // Un-focus the element
            rootEl.blur();

            // Code to support writing modbusRegister addresses as values.
            var ele = $(rootEl);
            var ljtype = ele.attr('ljtype');
            if(ljtype) {
                if(ljtype === 'modbusRegister') {
                    val = rawVal;
                    var regInfo = modbus_map.getAddressInfo(val, 'R');
                    if(regInfo.directionValid) {
                        val = regInfo.data.address;
                        isValid = true;
                    } else {
                        isValid = false;
                    }
                }
            }
            writeConfig(reg,val,isValid);
        };
        function helpTextURLClickHandler(event) {
            const gui = global.gui;
            // gui.Shell.openExternal(linkToBindTo.url);
            var url = $(event.currentTarget).attr('url');
            console.log('Opening link...', url);
            gui.Shell.openExternal(url);
        }

        var inputElements = $(baseID + ' .efConfig-INPUT');
        var inputBtnElements = $(baseID + ' .efConfig-INPUT-BTN');
        var selectElements = $(baseID + ' .efConfig-SELECT');
        var mbRegSelectElements = $(baseID + ' .efConfig-MB-REG-SELECT');
        var helpTextLinkElements = $(baseID + ' .ainEFUrlLink');

        inputElements.unbind();
        inputBtnElements.unbind();
        selectElements.unbind();
        mbRegSelectElements.unbind();
        helpTextLinkElements.unbind();

        inputElements.bind('change',inputChangeHandler);
        inputBtnElements.bind('click',inputGoHandler);
        inputElements.keypress(inputKeyboardHandler);

        selectElements.bind('click',menuClickHandler);
        mbRegSelectElements.bind('click',modbusRegOptionsMenuClickHandler);
        helpTextLinkElements.bind('click', helpTextURLClickHandler);
    };

    this.addAinEFInfo = function(chNum, efType) {
        var chName = 'AIN' + chNum.toString();
        var baseID = '#' + chName + '-table-data';
        var efData = self.ain_ef_type_map[efType];
        if(typeof(efData) !== 'undefined') {
            efData = efData();
        } else {
            console.error('in addAINEFInfo',chNum, efType);
            return;
        }
        var primaryNamesData = '';
        var secondaryReadRegsData = '';
        var efControlsData = '';
        var primaryReadRegsData = '';
        var helperTextData = '';
        var primaryReadRegs = [];
        var secondaryReadRegs = [];
        var readBindings = [];
        var readRegs = efData.getReadRegs();
        var configRegs = efData.getConfigRegs();

        // Compile helper text element
        if(efData.name != 'Disabled') {
            helperTextData = ainEFTypeHelperTextTemplate(efData);
        }

        // Loop through and parse read regisgers
        readRegs.forEach(function(readReg) {
            var registerName = chName + readReg.readReg;
            var unitRegName;
            if (typeof(readReg.unitReg) !== 'undefined') {
                unitRegName = chName + readReg.unitReg;
            }
            var humanName = '';
            if(typeof(readReg.humanName) !== 'undefined') {
                humanName = readReg.humanName;
            } else {
                var nameReg = chName + readReg.humanNameReg;
                var nameVal = 0;
                nameVal = self.getCurrentBufferedVal(nameReg,0);
                humanName = readReg.getHumanName(efType);
            }
            var title = readReg.description;
            var unit = '';
            if(typeof(readReg.unit) !== 'undefined') {
                unit = readReg.unit;
            } else {
                var dependentReg = chName + readReg.unitReg;
                var dependentRegVal = self.getCurrentBufferedVal(dependentReg,0);
                unit = readReg.getUnit(dependentRegVal);
            }
            var newEFData = {
                'title': title,
                'registerName': registerName,
                'humanName': humanName,
                'value': 0,
                'unit': unit,
                'unitRegName': unitRegName
            };
            var newBinding = {
                "bindingName": registerName,
                "smartName": 'readRegister',
                "periodicCallback": function(data, onSuccess) {
                    // console.log('Callback for: ' + registerName);
                    onSuccess();
                }
            };
            newBinding.periodicCallback = self.genericPeriodicCallback;
            if(typeof(readReg.format) !== 'undefined') {
                newBinding.format = 'customFormat';
                var formatFunc = readReg.format;
                if(isDefined(readReg.unitReg) && isDefined(readReg.getUnit)) {
                    var getFormatFunc = function(readReg,regName) {
                        var unitReg = readReg.unitReg;
                        var getUnit = readReg.getUnit;
                        var custFormatFunc = readReg.format;
                        var secFormatFunc = function(data) {
                            var val = self.getCurrentBufferedVal(regName);
                            var unitStr = getUnit(val);
                            var valStr = custFormatFunc(data);
                            return valStr + ' ' + unitStr;
                        };
                        return secFormatFunc;
                    };
                    var unitRegisterName = chName + readReg.unitReg;
                    formatFunc = getFormatFunc(readReg,unitRegisterName);
                    newEFData.unit = undefined;
                    newEFData.unitRegName = undefined;
                    var initUnitVal = self.getCurrentBufferedVal(unitRegisterName);
                    newEFData.value = '0 ' + readReg.getUnit(initUnitVal);
                }
                newBinding.customFormatFunc = formatFunc;
            }

            if(readReg.location === 'primary') {
                primaryReadRegs.push(newEFData);
                primaryNamesData += ainEFTypeNameTemplate({
                    'name':humanName,
                    'title': registerName
                });
                primaryReadRegsData += ainEFTypePrimaryTemplate(newEFData);
            } else {
                secondaryReadRegs.push(newEFData);
                secondaryReadRegsData += ainEFTypeSecondaryRegTemplate(newEFData);
            }
            readBindings.push(newBinding);
        });

        // Loop through and add config reg info
        configRegs.forEach(function(configReg) {
            var regName = chName + configReg.configReg;
            var humanName = configReg.humanName;
            var title = configReg.description;
            var defaultVal = configReg.defaultVal;
            var curVal = self.getCurrentBufferedVal(regName, defaultVal);
            // console.warn(configReg.defaultVal);

            var newEFConfigData = {
                'humanName': humanName,
                'title': title,
                'registerName': regName,
                'curVal': curVal,
                'value': curVal,
                'titleAppend': configReg.titleAppend,
                'cssClass': configReg.cssClass
            };

            var newBinding = {
                "bindingName": regName,
                "smartName": 'readRegister',
                "periodicCallback": function(data, onSuccess) {
                    // console.log('Callback for: ' + regName);
                    onSuccess();
                }
            };
            newBinding.periodicCallback = self.genericPeriodicCallback;
            if(typeof(configReg.format) !== 'undefined') {
                newBinding.format = 'customFormat';
                newBinding.customFormatFunc = configReg.format;
            }

            var inputType = configReg.type;
            if(inputType === 'value') {
                newEFConfigData.pattern = configReg.pattern;
                newEFConfigData.hint = configReg.hint;
                efControlsData +=  ainEFTypeConfigTemplates.value(newEFConfigData);
                newBinding.displayType = 'input';
                newBinding.format = configReg.format;
            } else if(inputType === 'modbusRegister') {
                var curStr = 'N/A';
                if(typeof(configReg.notFoundText) !== 'undefined') {
                    curStr = configReg.notFoundText;
                }

                var menuOptions = configReg.getOptions();
                menuOptions.forEach(function(menuOption){
                    if(menuOption.value === curVal) {
                        curStr = menuOption.name;
                    }
                });
                newEFConfigData.curStr = curStr;
                newEFConfigData.menuOptions = menuOptions;


                newEFConfigData.pattern = configReg.pattern;
                // newEFConfigData.hint = configReg.hint;
                newBinding.displayType = 'input';
                // newBinding.format = configReg.format;
                efControlsData +=  ainEFTypeConfigTemplates.modbusRegister(newEFConfigData);
                function getCallback(options) {
                    function callback(data, onSuccess) {
                        try {
                            var curBinding = data.binding;
                            var curVal = data.value;
                            var stringVal = data.stringVal;
                            var id = '#' + curBinding.template + '-CURRENT-VALUE';
                            var ele = $(id);
                            var reg = curBinding.binding;

                            // Update Module's Device buffer
                            self.currentValues.set(reg,curVal);

                            if(!ele.is(":focus")) {
                                ele.val(stringVal);
                            }
                            onSuccess();
                        } catch(err) {
                            console.log('Error in modbusRegister callback', err);
                            onSuccess();
                        }
                    }
                    return callback;
                }
                newBinding.periodicCallback = getCallback(menuOptions);
            } else if (inputType === 'select') {
                var menuOptions = configReg.getOptions();
                var curStr = 'N/A';
                if(typeof(configReg.notFoundText) !== 'undefined') {
                    curStr = configReg.notFoundText;
                }

                menuOptions.forEach(function(menuOption){
                    if(menuOption.value === curVal) {
                        curStr = menuOption.name;
                    }
                });
                newEFConfigData.curStr = '112' + curStr;
                newEFConfigData.menuOptions = menuOptions;
                efControlsData +=  ainEFTypeConfigTemplates.select(newEFConfigData);
                var getCallback = function(options) {
                    var callback = function(data, onSuccess) {
                        try {
                            var curBinding = data.binding;
                            var curVal = data.value;
                            var stringVal = data.stringVal;
                            var id = '#' + curBinding.template + '-CURRENT-VALUE';
                            var ele = $(id);
                            var reg = curBinding.binding;

                            // Update Module's Device buffer
                            self.currentValues.set(reg,curVal);

                            var newTitle = reg + ' is set to ' + curVal.toString();
                            var titleAppend = '';
                            options.forEach(function(option){
                                if(option.value === curVal) {
                                    if(option.titleAppend) {
                                        titleAppend = option.titleAppend;
                                        titleAppend = titleAppend.replace(', ','');
                                    } else {
                                        titleAppend = option.name;
                                    }
                                }
                            });
                            newTitle += ', ' + titleAppend;
                            ele.attr('title',newTitle);
                            ele.text(stringVal);
                            onSuccess();
                        } catch(err) {
                            onSuccess();
                        }
                    };
                    return callback;
                };
                newBinding.periodicCallback = getCallback(menuOptions);
            } else {
                efControlsData +=  '<p>Undefined inputType' +regName+'</p>';
            }

            // Add config register to bindings list
            readBindings.push(newBinding);
        });


        var nameEle = $(baseID + ' .efTypeName');
        var primaryEle = $(baseID + ' .efPrimaryReading');
        var efBaseID = '#' + chName + '-ainEFExtendedInfo';
        var helperTextEle = $(efBaseID + ' .efExtendedInfoHelperText');
        var efConfigsEle = $(efBaseID + ' .ainEFConfigs');
        var secondaryReadsEle = $(efBaseID + ' .ainEFSecondaryReadRegisters');

        var finishedPages = [];
        var numFinished = 0;
        var pageInfos = [
            {'key':'nameEle','ele':nameEle,'data':primaryNamesData},
            {'key':'primaryEle','ele':primaryEle,'data':primaryReadRegsData},
            {'key': 'helperTextEle', 'ele': helperTextEle, 'data': helperTextData},
            {'key':'efConfigsEle','ele':efConfigsEle,'data':efControlsData},
            {'key':'secondaryReadsEle','ele':secondaryReadsEle,'data':secondaryReadRegsData},
        ];
        var continueFunc = function(pageInfo) {
            numFinished += 1;
            if(pageInfo) {
                finishedPages.push(pageInfo);
            }
            if(numFinished > (pageInfos.length-1)) {
                self.registerClickHandlers(chNum, efType, efBaseID);
                self.framework.putSmartBindings(readBindings);
                finishedPages.forEach(function(finishedPage) {
                    finishedPage.ele.slideDown();
                });
                KEYBOARD_EVENT_HANDLER.initInputListeners();
            }
        };

        pageInfos.forEach(function(pageInfo) {
            if(pageInfo.data !== '') {
                pageInfo.ele.slideUp(function() {
                    pageInfo.ele.empty();
                    pageInfo.ele.html(pageInfo.data);
                    continueFunc(pageInfo);
                });
            } else {
                continueFunc();
            }
        });
    };

    this.configureBaseRegisters = function(deviceTypeName) {
        switch (deviceTypeName) {
            case 'T8':
                // Base-Register Variable for Configuring multiple thermocouples.
                var baseReg = 'AIN#(0:7)';
                // Expand baseReg & create baseRegister list using ljmmm.
                self.baseRegisters = ljmmm_parse.expandLJMMMName(baseReg);
                break;
            case 'T7':
                // Base-Register Variable for Configuring multiple thermocouples.
                var baseReg = 'AIN#(0:13)';
                // Expand baseReg & create baseRegister list using ljmmm.
                self.baseRegisters = ljmmm_parse.expandLJMMMName(baseReg);
                break;
            case 'T7-Pro':
                // Base-Register Variable for Configuring multiple thermocouples.
                var baseReg = 'AIN#(0:13)';
                // Expand baseReg & create baseRegister list using ljmmm.
                self.baseRegisters = ljmmm_parse.expandLJMMMName(baseReg);
                break;
            case 'T4':
                // Base-Register Variable for Configuring multiple thermocouples.
                var baseReg = 'AIN#(0:11)';
                // Expand baseReg & create baseRegister list using ljmmm.
                baseRegisters = ljmmm_parse.expandLJMMMName(baseReg);
                return baseRegisters;
                break;
        }
    }

    /**
     * Function is called once every time the module tab is selected, loads the module.
     * @param  {[type]} framework   The active framework instance.
     * @param  {[type]} onError     Function to be called if an error occurs.
     * @param  {[type]} onSuccess   Function to be called when complete.
    **/
    this.onModuleLoaded = function(framework, onError, onSuccess) {
        // console.error('onModuleLoaded\n\n\n\n');
        self.framework = framework;
        compileTemplates(framework);

        // Enable framework-timing debugging
        onSuccess();
    };

    this.clearCachedData = function() {
        for (let i = 0; i < 13; i++) {
            self.removeAinEFInfo(i);
        }
        self.currentValues = new Map();
        self.newBufferedValues = new Map();
        self.isValueNew = new Map();
        self.bufferedOutputValues = new Map();
        self.analogInputsDict.clear();

        self.deviceConstants = {};
        self.curDeviceOptions = new Map();
        self.regParserDict = new Map();
        self.regParser = new Map();

        self.efTypeDict = new Map();
        self.rangeOptionsDict = new Map();
        self.resolutionOptionsDict = new Map();
        self.settlingOptionsDict = new Map();
        self.negativeChannelDict = new Map();
        // we need to delete this but not at this time find a better place to do it. it breaks it
        // self.baseRegisters = undefined;
    };
    /**
     * Function is called once every time a user selects a new device.
     * @param  {[type]} framework   The active framework instance.
     * @param  {[type]} device      The active framework instance.
     * @param  {[type]} onError     Function to be called if an error occurs.
     * @param  {[type]} onSuccess   Function to be called when complete.
    **/
    this.onDeviceSelected = function(framework, device, onError, onSuccess) {
        // console.error("onDeviceSelected\n\n")
        self.activeDevice = device;
        self.activeDeviceType = device.savedAttributes.deviceTypeName;
        self.clearCachedData();

        framework.clearConfigBindings();
        framework.setStartupMessage('Reading Device Configuration');
        self.configureModule(onSuccess);
    };

    this.onDeviceConfigured = function(framework, device, setupBindings, onError, onSuccess) {
        // Initialize variable where module config data will go.
        // console.error("onDeviceConfigured\n\n");

        var baseReg = 'AIN#(0:11)';
        var baseRegisters = ljmmm_parse.expandLJMMMName(baseReg);
        switch (self.activeDeviceType) {
            case 'T8':
                // Base-Register Variable for Configuring multiple thermocouples.
                baseReg = 'AIN#(0:7)';
                // Expand baseReg & create baseRegister list using ljmmm.
                var baseRegisters = ljmmm_parse.expandLJMMMName(baseReg);
                this.ain_ef_types = globalDeviceConstants.t8DeviceConstants.ainEFTypeOptions;
                var ain_ef_type_map = globalDeviceConstants.t8DeviceConstants.ainEFTypeMap;
                this.ain_ef_type_map = ain_ef_type_map; // this seems to be the only one used for now.
                break;
            case 'T7':
                // Base-Register Variable for Configuring multiple thermocouples.
                baseReg = 'AIN#(0:13)';
                // Expand baseReg & create baseRegister list using ljmmm.
                baseRegisters = ljmmm_parse.expandLJMMMName(baseReg);
                this.ain_ef_types = globalDeviceConstants.t7DeviceConstants.ainEFTypeOptions;
                var ain_ef_type_map = globalDeviceConstants.t7DeviceConstants.ainEFTypeMap;
                this.ain_ef_type_map = ain_ef_type_map; // this seems to be the only one used for now.
                break;
            case 'T7-Pro':
                // Base-Register Variable for Configuring multiple thermocouples.
                baseReg = 'AIN#(0:13)';
                // Expand baseReg & create baseRegister list using ljmmm.
                baseRegisters = ljmmm_parse.expandLJMMMName(baseReg);
                this.ain_ef_types = globalDeviceConstants.t7ProDeviceConstants.ainEFTypeOptions;
                var ain_ef_type_map = globalDeviceConstants.t7ProDeviceConstants.ainEFTypeMap;
                this.ain_ef_type_map = ain_ef_type_map; // this seems to be the only one used for now.
                break;
            case 'T4':
                // Base-Register Variable for Configuring multiple thermocouples.
                baseReg = 'AIN#(0:11)';
                // Expand baseReg & create baseRegister list using ljmmm.
                this.baseRegisters = ljmmm_parse.expandLJMMMName(baseReg);
                this.ain_ef_types = globalDeviceConstants.t4DeviceConstants.ainEFTypeOptions;
                var ain_ef_type_map = globalDeviceConstants.t4DeviceConstants.ainEFTypeMap;
                this.ain_ef_type_map = ain_ef_type_map; // this seems to be the only one used for now.
                
        }

        self.moduleContext = {};
        self.analogInputsDict.clear();
        if(self.defineDebuggingArrays){
            var analogInputs = [];
        }
        // self.baseRegisters = self.configureBaseRegisters(device.savedAttributes.deviceTypeName);
        // console.error("1378 base registers used here too")
        baseRegisters.forEach(function(reg,index){
            var ainChannel = {
                "name":reg,
                "value":null,
                "strVal":null,
                "optionsDict":new Map(),
                "minGraphVal":null,
                "maxGraphVal":null
            };
            if(self.defineDebuggingArrays){
                ainChannel.options = [];
            }
            self.deviceConstants.configRegisters.forEach(function(configReg){
                var options = {};
                var menuOptions;
                var formatReg = handleBarsService._compileTemplate(configReg.register);
                var compReg = formatReg({ainChannelNames:reg});

                options.menuTitle = configReg.name;
                options.reg = compReg;
                options.curStr = null;
                options.curVal = null;
                options.cssClass = configReg.cssClass;
                if(configReg.options !== 'func') {
                    menuOptions = self.deviceConstants[configReg.options];
                } else {
                    var menuGenFunc = self.deviceConstants[configReg.func].filter;
                    menuOptions = menuGenFunc(index);
                }
                options.menuOptions = menuOptions;

                ainChannel.optionsDict.set(compReg,options);
                if(self.defineDebuggingArrays){
                    ainChannel.options.push(options);
                }
            });
            if(self.defineDebuggingArrays){
                analogInputs.push(ainChannel);
            }
            self.analogInputsDict.set(reg, ainChannel);
        });

        var findNum = new RegExp("[0-9]{1,2}");
        var isFound = function(haystack,needle) {
            return (haystack.indexOf(needle) != -1);
        };
        var getValStr = function(dict,val) {
            var res = dict.get(val);
            if(typeof(res) === 'undefined') {
                return 'select';
            } else {
                return res;
            }
        };

        // setup data for ain-ef types
        ainEFTypeInfo = {
            val:0,
            valStr: 'None'

        };

        var configRegistersDict = new Map();

        self.moduleContext.allEFTypeVal = null;
        self.moduleContext.allEFTypesSame = true;
        self.moduleContext.allEFTypeOptions = this.ain_ef_types;

        self.currentValues.forEach(function(value,name){
            var dataObj = {};
            dataObj.reg = name;
            dataObj.val = value;
            if(typeof(value) === 'undefined') {
                console.error('in onDeviceConfigured, currentValue is undefined...',name,value);
            } else {
                var strVal = value.toString();
                // Switch on
                var newData;
                if(!findNum.test(name)) {
                    newData = self.regParserGet(name, value);
                    var optionsData = self.curDeviceOptions.get(name);
                    dataObj.curStr = newData.name;
                    dataObj.curVal = newData.value;
                    dataObj.menuOptions = optionsData.menuOptions;
                    dataObj.name = optionsData.name;
                    dataObj.cssClass = optionsData.cssClass;
                    configRegistersDict.set(name,dataObj);
                } else {
                    var res = findNum.exec(name);
                    var index = Number(res[0]);
                    // Get currently saved values
                    var ainInfo = self.analogInputsDict.get('AIN'+index.toString());

                    newData = self.regParserGet(name, value);
                    if(isFound(name,'_')) {
                        var menuOptions = ainInfo.optionsDict.get(name);
                        menuOptions.curStr = newData.name;
                        menuOptions.curVal = newData.value;

                        if(name.indexOf('_RANGE') !== -1) {
                            var rangeStr = newData.value.toString();
                            ainInfo.rangeVal = newData.value;
                            if (newData.value == 2.5) { ainInfo.minRangeVal = 0; } else { ainInfo.minRangeVal = newData.value; } // case for T4 AIN4-11 which has the range 0-2.5V
                            ainInfo.rangeStr = name + ' is set to ' + rangeStr;
                        }
                        ainInfo.optionsDict.set(name, menuOptions);
                    } else {
                        var roundedRes = value.toFixed(self.ANALOG_INPUT_PRECISION);
                        ainInfo.value = value;
                        ainInfo.strVal = roundedRes + ' V';
                    }

                    // Update saved values
                    self.analogInputsDict.set('AIN'+index.toString(), ainInfo);
                }
            }
        });

        self.moduleContext.analogInputsDict = self.analogInputsDict;
        self.moduleContext.configRegistersDict = configRegistersDict;

        framework.setCustomContext(self.moduleContext);
        onSuccess();
    };
    this.splitAinValue = function(value) {
        var data = {pos: 0,neg: 0};
        if(value < 0) {
            neg = value;
        } else {
            pos = value;
        }
    };
    this.getD3GraphWidth = function (value, range) {
        // the extra values tat are below are there for the T8 some of the values will need to be motifyed and with that being
        // said this does work for the time being.
        var val;
        var widthMultiplyer;
        switch (range) {
            // default for the t8
            case 11:
                // T8 exclusive range
                val = value / (range + 0.1);
                widthMultiplyer = 90;
                break
            case 10:
                // for both the T4 and the T7
                val = value / (range + 0.8);
                widthMultiplyer = 100;
                break;
            case 9.7:
                // for both tthe T4 and T7
                val = value / (range + 0.8);
                widthMultiplyer = 100;
                break;
            case 4.8:
                // T8 exclusive range
                val = value / (range + 0.8);
                widthMultiplyer = 90;
                break;
            case 2.5:
                // for the T4
                val = value / (range + 0.8);
                widthMultiplyer = 100;
                break;
            case 2.4:
                // T8 exclusinve range
                val = value / (range + 0.8);
                widthMultiplyer = 90;
                break;
            case 1.2:
                // T8 exclusive range
                val = value / (range + 0.8);
                widthMultiplyer = 90;
                break;
            case 1:
                // for both the T4 and the T7
                val = value / (range + 0.052);
                widthMultiplyer = 100;
                break;
            case 0.75:
                val = value / (range + 0.8);
                widthMultiplyer = 100;
                break;
            case 0.6:
                // T8 exclusive range
                val = value / (range + 0.8);
                widthMultiplyer = 90;
                break;
            case 0.36:
                val = value / (range + 0.8);
                widthMultiplyer = 100;
                break;
            case 0.3:
                // T8 exclusive range
                val = value / (range + 0.8);
                widthMultiplyer = 90;
                break;
            case 0.18:
                val = value / (range + 0.8);
                widthMultiplyer = 100;
                break;
            case 0.15:
                // T8 exclusive range
                val = value / (range + 0.8);
                widthMultiplyer = 90;
                break;
            case 0.13:
                // for both the T4 and the T7
                val = value / (range + 0.5);
                widthMultiplyer = 100;
                break;
            case 0.1:
                // for both the T4 and the T7
                val = value / (range + 0.0051);
                widthMultiplyer = 100;
                break;
            case 0.01:
                // for both the T4 and the T7
                val = value / (range + 0.0003);
                widthMultiplyer = 100;
                break;
            default:
                val = 0;
                widthMultiplyer = 100;
                break;
        }
        val = (Math.abs(val) * widthMultiplyer);
        return val;
    };
    this.getSVGWidth = function(val) {
        return function() {
            if(val > 0) {
                return '50%';
            } else {
                return '50%';
            }
        };
    };
    this.getSVGStyle = function(val,range) {
        return function() {
            var width;
            if(val > 0) {
                width = val;
            } else {
                width = 50-self.getD3GraphWidth(val,range)/2;
            }

            // console.warn(width);
            // width = width + 3;
            return 'margin-left:' + width.toString() + '%;';
        };
    };
    this.getFillColor = function(val) {
        return function() {
            if(val > 0) {
                return '#01a31c';
            } else {
                return '#2d89f0';
            }
        };
    };
    this.initializeD3Graphs = function(onSuccess) {
        // For each analog input channel, create graphs using D3!
        self.analogInputsDict.forEach(function(val, name) {
            // Save the current value
            var curVal = val.value;

            // save the current range value
            var curRange = val.rangeVal;

            // Get the width of space allocated to rendering the d3 rectangles.
            var svgID = '#' + name + '-graph';
            var svgEle = $(svgID);
            var graphWidth = svgEle.width();

            // Calculate half the width and/or the offset to be used for the
            // second graph.
            var halfWidth = graphWidth / 2;

            // Select the svg element to be D3's target
            var ainGraph = d3.select(svgID)
            .attr('width', self.getSVGWidth(curVal))
            .attr('height', '5px')
            .attr('style',self.getSVGStyle(curVal,curRange))
            .selectAll('.ainGraphLine')                                         // Select all elements with the class .ainGraphLine incase some already exist.
            .data(function () {
                return [curVal];                                                // Return array of data to be added to svg element
            })
            .enter()                                                            // for each data point....
            .append('rect')                                                     // Draw a rectangle 'rect'
            .attr('width', function (data) {
                 // this was 50 could be an issue but I changed it back
                 // not sure when it was changed to 50 but that is returned by this function anyways
                return self.getD3GraphWidth(curVal,curRange).toString() + '%';
            })
            .attr('height', '5')
            .attr('fill', self.getFillColor(curVal))
            .attr('class', 'ainGraphLine');
        });

        // Display the graphs
        $('.graphSlider').removeClass('uninitialized');
        // $('.graphSlider').
        if(typeof(onSuccess) !== 'undefined') {
            onSuccess();
        }
    };
    this.updateD3Graph = function(name,curVal) {
        // console.warn("some");
        var curRange = self.currentValues.get(name + '_RANGE');
        // what is this for T8 only???
        if(curRange == 0.08){
            curRange = 0.075;
        }
        else if(curRange == 0.04){
            curRange = 0.036;
        }
        else if(curRange == 0.02){
            curRange = 0.018;
        }
        var svgID = '#' + name + '-graph';
        var ainGraph = d3.select(svgID)
        .attr('width', self.getSVGWidth(curVal))
        .attr('style',self.getSVGStyle(curVal,curRange));
        var ainGraphLine = d3.select(svgID + ' .ainGraphLine')
        .attr('fill', self.getFillColor(curVal))
        .attr('width', function (data) {
            var str = self.getD3GraphWidth(curVal,curRange).toString();
            if(str === 'NaN') {
                str = '0';
                // str = 1; // why is this here????
            }
            return (str) + '%';
        });

    };
    this.clearTempData = function() {
        $('.efTypeName').html('');
        $('.efPrimaryReading').html('');
        $('.ainEFConfigs').html('');
        $('.ainEFSecondaryReadRegisters').html('');
    };

    this.onTemplateLoaded = function(framework, onError, onSuccess) {
        // console.error('onTemplateLoaded\n\n')
        self.clearTempData();
        // Populated list of missing registers
        var missingRegs = [];
        var refreshEFData = [];
        self.currentValues.forEach(function(curVal,key) {
            if(findEFIndexRegister.test(key)) {
                var chName = findActiveChannel.exec(key);
                var chNum = findActiveChannelNum.exec(key);
                refreshEFData.push({'chNum':chNum,'efType':curVal});
                var efData = self.ain_ef_type_map[curVal];
                if(typeof(efData) !== 'undefined') {
                    efData = efData();
                    if(typeof(efData.getReadRegs) !== 'undefined') {
                        efData.getReadRegs().forEach(function(readReg) {
                            var regName = chName + readReg.readReg;
                            missingRegs.push(regName);
                        });
                        efData.getConfigRegs().forEach(function(configReg) {
                            var regName = chName + configReg.configReg;
                            missingRegs.push(regName);
                        });
                    }
                }
            }
        });
        async.eachSeries(missingRegs,
            function(reg,callback) {
                self.activeDevice.sRead(reg)
                .then(function(val) {
                    console.log('Read Reg', reg, val.res);
                    self.currentValues.set(reg,val.res);
                    callback();
                }, function(err) {
                    // self.currentValues.set(reg,0);
                    callback();
                });
            }, function(err) {
                refreshEFData.forEach(function(data) {
                    self.refreshEFInfo(data.chNum, data.efType);
                });
                onSuccess();
            });
    };

    this.onTemplateDisplayed = function(framework, onError, onSuccess) {
        // Initialize the D3 Graphs
        self.initializeD3Graphs(onSuccess);
    };
    var findRangeRegisterRegex = new RegExp("AIN[0-9]{1,2}_RANGE");
    var findEFIndexRegister = new RegExp("AIN[0-9]{1,2}_EF_INDEX");
    var findOnlyActiveChannel = new RegExp("^AIN[0-9]{1,2}$");
    var findActiveChannel = new RegExp("AIN[0-9]{1,2}");
    var findActiveChannelNum = new RegExp("[0-9]{1,2}");
    this.lastRefreshError = null;
    this.onRefreshed = function onRefreshed(framework, results, onError, onSuccess) {
        var baseReg = 'AIN#(0:13)'
        var baseRegisters = ljmmm_parse.expandLJMMMName(baseReg);
        switch (self.activeDeviceType) {
            case 'T8':
                baseReg = 'AIN#(0:7)'
                baseRegisters = ljmmm_parse.expandLJMMMName(baseReg);
                break;
            case 'T7':
                baseReg = 'AIN#(0:13)';
                baseRegisters = ljmmm_parse.expandLJMMMName(baseReg);
                break;
            case 'T7-Pro':
                baseReg = 'AIN#(0:13)';
                baseRegisters = ljmmm_parse.expandLJMMMName(baseReg);
                break;
            case 'T4':
                baseReg = 'AIN#(0:11)';
                baseRegisters = ljmmm_parse.expandLJMMMName(baseReg);
                break;

        }
        try {
            var clearCurAINREadings = false;
            self.bufferedOutputValues.forEach(function(value,name){
                if(name === FORCE_AIN_VAL_REFRESH) {
                    baseRegisters.forEach(function(baseRegister) {
                        var oldVal = self.currentValues.get(baseRegister);
                        self.newBufferedValues.set(baseRegister,oldVal);
                    });
                    self.bufferedOutputValues.delete(name);
                } else {
                    self.newBufferedValues.set(name,value);
                    self.bufferedOutputValues.delete(name);
                }
            });
            self.newBufferedValues.forEach(function eachNewBuffValue(value,name){
                // if the new value that is read is not an analog input aka a
                // channel config option do some special DOM stuff
                var buttonID;
                var buttonEl;
                var selectEl;
                if(typeof(value) !== 'undefined') {
                    if(name.indexOf('_') != -1) {
                        buttonID = '#' + name + '-SELECT';
                        buttonEl = $(buttonID);
                        selectEl = buttonEl.find('.currentValue');
                        var parserFunc = self.regParserGet(name, value);
                        if(typeof(parserFunc) === 'undefined') {
                            console.warn('parserFunc not defined',typeof(parserFunc),name);
                        } else {
                            var newText = parserFunc;
                            var stringVal = value.toString();
                            var newTitle = name + ' is set to ' + stringVal;
                            var rangeReg = findRangeRegisterRegex.exec(name);
                            if(rangeReg) {
                                var reg = rangeReg[0].split('_RANGE')[0];
                                var obj = $('#' + reg + '-table-data .ain-range-val');
                                obj.html(stringVal);
                            }
                            selectEl.text(newText.name);
                            selectEl.attr('title',newTitle);
                        }
                    } else {
                        // the possability for this is that the voltage is wron for the t7 and with that it might be screwing up how everything is bing updated.
                        // the salution could be to make sure that ranges are correct?
                        // if is an AINx channel
                        self.updateD3Graph(name,value);
                    }
                } else {
                    buttonID = '#' + name + '-SELECT';
                    buttonEl = $(buttonID);
                    selectEl = buttonEl.find('.currentValue');
                    selectEl.text('NaN');
                    selectEl.attr('title','Check Device Connection');
                }
                self.currentValues.set(name,value);
                self.newBufferedValues.delete(name);
            });
            onSuccess();
        } catch (err) {
            self.lastRefreshError = err;
            console.error('Failed To Refresh, check sdModule.lastRefreshError');
            // console.error('Caught Error... in onRefreshed',err,err.stack);
            onSuccess();
        }
    };
    this.onCloseDevice = function(framework, device, onError, onSuccess) {
        self.clearCachedData();
        onSuccess();
    };
    this.onLoadError = function(framework, description, onHandle) {
        console.log('in onLoadError', description);
        onHandle(true);
    };
    this.onWriteError = function(framework, registerName, value, description, onHandle) {
        console.log('in onConfigError', description);
        onHandle(true);
    };
    this.onRefreshError = function(framework, registerNames, description, onHandle) {
        console.log('in onRefreshError', description,framework.moduleName);
        if(typeof(description.retError) === 'number') {
            console.log('in onRefreshError',device_controller.ljm_driver.errToStrSync(description.retError));
        } else {
            console.log('Type of error',typeof(description.retError),description.retError);
        }
        onHandle(true);
    };

    var self = this;
}
