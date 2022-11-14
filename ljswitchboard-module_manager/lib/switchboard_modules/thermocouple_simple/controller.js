/**
 * Logic for the Thermocouple Reading module.
 *
 * @author A. Samuel Pottinger (LabJack Corp, 2013)
 * @author Chris Johnson (LabJack Corp, 2013)
 *
 * Module Outline:
 *  1. Read Device Information
 *  2. Periodically Refresh Device Information
 *  3. Accept user input to configure the device
 *
 * Read Device Information:
 *  1. Read AINx_EF_INDEX register to determine what type is currently selected
 *  2. Read AINx_EF_CONFIG_A to determine temperature metric
 *
 * Periodically Sample:
 *  1. AINx_EF_READ_A for a computed thermocouple reading
 *  2. Also sample AINx_EF_READ_B, _C, _D, AIN0, and AIN0_BINARY to give user
 *      more relevant channel information.
 *
 * Configure AINx Channel for Thermocouple Reading:
 *  1. Write 0 to AINx_EF_INDEX in order to re-set all EF config values
 *  2. Write 0.1 to AINx_RANGE register to configure AINx gain settings
 *  3. Configure AINx_EF_INDEX to the proper thermocouple constant:
        20: typeE
        21: typeJ
        22: typeK
        23: typeR
        24: typeT
 *  4. Set AINx_EF_CONFIG_B to 60052 to __XXXX-DESCRIPTION-XXXX__
**/
var sprintf = require('sprintf-js').sprintf;

// Constant that determines device polling rate.
var MODULE_UPDATE_PERIOD_MS = 1000;

// Constant that can be set to disable auto-linking the module to the framework
var DISABLE_AUTOMATIC_FRAMEWORK_LINKAGE = false;
const globalDeviceConstants = global.globalDeviceConstants;

/**
 * Module object that gets automatically instantiated & linked to the appropriate framework.
 * When using the 'singleDevice' framework it is instantiated as sdModule.
 */
function module() {
    var nop = function(){};
    // Base-Register Variable for Configuring multiple thermocouples.
    var baseReg = 'AIN#(0:13)';

    // Expand baseReg & create baseRegister list using ljmmm.
    // ex: ['AIN0', 'AIN1', ... 'AIN13']
    var baseRegisters = ljmmm_parse.expandLJMMMName(baseReg);

    var ain_ef_types = globalDeviceConstants.t7DeviceConstants.ainEFTypeOptions;
    var ain_ef_types = globalDeviceConstants.t8DeviceConstants.ainEFTypeOptions;

    // Supported thermocouple types & associated constants.
    var thermocoupleTypes = globalDeviceConstants.t7DeviceConstants.thermocoupleTypes;
    var thermocoupleTypes = globalDeviceConstants.t8DeviceConstants.thermocoupleTypes;
    this.thermocoupleTypes = thermocoupleTypes;

    // Supported thermocouple temperature metrics & associated constants.
    var tcTemperatureMetrics = globalDeviceConstants.t7DeviceConstants.thermocoupleTemperatureMetrics;
    var tcTemperatureMetrics = globalDeviceConstants.t8DeviceConstants.thermocoupleTemperatureMetrics;
    this.tcTemperatureMetrics = tcTemperatureMetrics;

    var INITIALIZED_CLICK_HANDLERS = false;

    var AIN_EF_SETUP_CONFIG_STR = '_EF_INDEX';

    /**
     * Function to handle thermocouple reading formatting & add conditional
     * statements for determining whether a thermocouple reading is out of range
     * or not connected vs it being a valid reading.
     */
    this.tcFormatFunc = function(info) {
        var tcReading = info.value;
        if(tcReading == -9999) {
            return "TC Not Connected";
        } else {
            return sprintf('%.4f',tcReading);
        }
    };
    /**
     * Function to simplify configuring thermocouple channels.
     * ex: configureChannel(device, 'AIN0', 'TypeK', 'K');
     * ex: configureChannel(device, 'AIN0', 22, 0);
    **/
    this.configureChannel = function(device, channelName, type, metric) {
        //Initialize values to defaults
        var tcTypeVal = 0;
        var tempMetricVal = 0;

        // Check and see if a valid type was given, if so, use that type
        // Can be a number or a string
        if(type !== undefined) {
            if(typeof(type) === "number") {
                tcTypeVal = type;
            } else {
                thermocoupleTypes.forEach(function(tcType) {
                    if(tcType.name === type) {
                        tcTypeVal = tcType.value;
                    }
                });
            }
        }
        // Check and see if a valid metric was given, if so, use that metric
        // Can be a number or a string
        if(metric !== undefined) {
            if(typeof(metric) === "number") {
                tempMetricVal = metric;
            } else {
                tcTemperatureMetrics.forEach(function(tcTempMetric) {
                    if(tcTempMetric.name === metric) {
                        tempMetricVal = tcTempMetric.value;
                    }
                });
            }
        }

        //Perform device I/O
        if(tcTypeVal !== 0) {
            device.write(channelName + AIN_EF_SETUP_CONFIG_STR,0);
            device.write(channelName + '_RANGE',0.1);
            device.write(channelName + AIN_EF_SETUP_CONFIG_STR,tcTypeVal);
            device.write(channelName + '_EF_CONFIG_A',tempMetricVal);
            device.write(channelName + '_EF_CONFIG_B',60052);
        } else {
            device.write(channelName + AIN_EF_SETUP_CONFIG_STR,0);
        }
    };

    this.editBindings = function(framework, method, channelNumber) {
        var chNum;
        if (typeof(channelNumber) === 'string') {
            chNum = channelNumber;
        } else if (typeof(channelNumber) === 'number'){
            chNum = channelNumber.toString();
        }
        chNum = 'AIN' + chNum;
        var bindings = [
            {bindingClass: chNum, template: chNum,   binding: chNum,    direction: 'read',  format: '%.10f'},
            {bindingClass: chNum+'_BINARY', template: chNum+'_BINARY',   binding: chNum+'_BINARY',    direction: 'read',  format: '%d'},
            {bindingClass: chNum+'_EF_READ_A',  template: chNum+'_EF_READ_A', binding: chNum+'_EF_READ_A',  direction: 'read',  format: 'customFormat', customFormatFunc: self.tcFormatFunc},
            {bindingClass: chNum+'_EF_READ_B',  template: chNum+'_EF_READ_B', binding: chNum+'_EF_READ_B',  direction: 'read',  format: '%.8f'},
            {bindingClass: chNum+'_EF_READ_C',  template: chNum+'_EF_READ_C', binding: chNum+'_EF_READ_C',  direction: 'read',  format: '%.4f'},
            {bindingClass: chNum+'_EF_READ_D',  template: chNum+'_EF_READ_D', binding: chNum+'_EF_READ_D',  direction: 'read',  format: '%.8f'}
        ];
        if(method === 'put') {
            // Save the bindings to the framework instance.
            framework.putConfigBindings(bindings);
        } else if(method === 'delete') {
            // Delete the bindings from the framework instance.
            framework.deleteConfigBindings(bindings);
        }
    };

    /**
     * Function is called once every time the module tab is selected, loads the module.
     * @param  {[type]} framework   The active framework instance.
     * @param  {[type]} onError     Function to be called if an error occurs.
     * @param  {[type]} onSuccess   Function to be called when complete.
    **/
    this.onModuleLoaded = function(framework, onError, onSuccess) {
        var setupBindings = [
            {bindingClass: baseReg+AIN_EF_SETUP_CONFIG_STR, binding: baseReg+AIN_EF_SETUP_CONFIG_STR, direction: 'read'},
            {bindingClass: baseReg+'_EF_CONFIG_A', binding: baseReg+'_EF_CONFIG_A', direction: 'read'}
        ];

        // Save the setupBindings to the framework instance.
        framework.putSetupBindings(setupBindings);
        onSuccess();
    };

    /**
     * Function is called once every time a user selects a new device.
     * @param  {[type]} framework   The active framework instance.
     * @param  {[type]} device      The active framework instance.
     * @param  {[type]} onError     Function to be called if an error occurs.
     * @param  {[type]} onSuccess   Function to be called when complete.
    **/
    this.onDeviceSelected = function(framework, device, onError, onSuccess) {
        framework.clearConfigBindings();
        onSuccess();

    };

    this.onDeviceConfigured = function(framework, device, setupBindings, onError, onSuccess) {
        // Initialize variable where module config data will go.
        var moduleContext = {};

        // While configuring the device build a dict to be used for generating the
        // module's template.
        moduleContext.tcInputs = [];
        var configuredEFType = [];
        var configuredMetric = [];

        //Loop through results and save them appropriately.
        setupBindings.forEach(function(binding, key){
            // console.log('key',key,'Address',binding.address,', Result: ',binding.result);
            if(key.search(AIN_EF_SETUP_CONFIG_STR) > 0) {
                if(binding.status === 'success') {
                    // Read was successful, parse configured tc type:
                    var validTCType = false;
                    ain_ef_types.forEach(function(type){
                        if(type.value == binding.result){
                            validTCType = true;
                            configuredEFType.push(type.name);
                        }
                    });
                } else {
                    // Read was not successful, force display to be undefined:
                    configuredEFType.push(ain_ef_types[0].name);
                }
            }
            if(key.search('_EF_CONFIG_A') > 0) {
                configuredMetric.push({
                    result: binding.result,
                    status: binding.status
                });
            }
        });

        baseRegisters.forEach( function (reg, index) {
            // self.configureChannel(device, reg, 'TypeK', 'K');
            var style = "display:none";
            var validTCType = false;
            var confMetric = 'none';
            var efTypeMenuOptions = [];
            var tcMetricMenuOptions = [];

            ain_ef_types.forEach(function(type){
                efTypeMenuOptions.push({
                    name:type.name,
                    value:type.value,
                    selected:''
                });
            });

            tcTemperatureMetrics.forEach(function(type){
                tcMetricMenuOptions.push({
                    name:type.name,
                    value:type.value,
                    selected:''
                });
            });

            if (configuredEFType[index] === ain_ef_types[0].name) {
                style = "display:none";
                validTCType = false;
                confMetric = 'none';
                efTypeMenuOptions[0].selected = 'selected';
            } else {
                var i;

                // Populate efTypeMenuOptions
                for(i = 0; i < thermocoupleTypes.length; i++) {
                    var type = thermocoupleTypes[i];
                    if(type.name === configuredEFType[index]){
                        validTCType = true;
                        style = '';
                        efTypeMenuOptions[0].selected = '';
                        efTypeMenuOptions[i+1].selected = 'selected';
                        break;
                    }
                }

                // Populate tcMetricMenuOptions
                for(i = 0; i < tcTemperatureMetrics.length; i++) {
                    var metric = tcTemperatureMetrics[i];
                    if(metric.value === configuredMetric[index].result){
                        tcMetricMenuOptions[i].selected = 'selected';
                        break;
                    }
                }
            }

            if(validTCType) {
                self.editBindings(framework, 'put',index);
            }
            moduleContext.tcInputs.push({
                "name": reg,
                "types": thermocoupleTypes,
                "metrics": tcTemperatureMetrics,
                "isConfigured": validTCType,
                confMetric: true,
                "style": style,
                "typeOptions": efTypeMenuOptions,
                "metricOptions": tcMetricMenuOptions
            });

        });
        framework.setCustomContext(moduleContext);
        onSuccess();
    };

    this.onTemplateLoaded = function(framework, onError, onSuccess) {
        var moduleBindings = [
            {bindingClass: baseReg+'-thermocouple-type-select',  template: baseReg+'-thermocouple-type-select', binding: baseReg+'_EF_INDEX',  direction: 'write', event: 'change'},
            {
                bindingClass: baseReg+'-thermocouple-metric-select',
                template: baseReg+'-thermocouple-metric-select',
                binding: baseReg+'-callback',
                direction: 'write',
                event: 'change',
                execCallback: true,
                callback: function(data, onSuccess) {
                    var binding = data.binding;
                    var value = data.value;
                    //Get AIN channel name, 'AIN0'
                    var reg = binding.binding.split('-callback')[0];

                    //Get the selected thermocouple type number
                    var tcTypeStr = $('#'+reg+'-thermocouple-type-select').val();
                    var tcTypeNum = parseInt(tcTypeStr);

                    //Get the selected thermocouple temperature metric
                    var tcTempMetricNum = parseInt(value);

                    //Perform device IO to configure channel
                    self.configureChannel(
                        framework.getSelectedDevice(),
                        reg,
                        tcTypeNum,
                        tcTempMetricNum);
                }
            },
            {
                bindingClass: baseReg+'-options-toggle-button',
                template: baseReg+'-options-toggle-button',
                binding: baseReg+'-callback',
                direction: 'write',
                event: 'click',
                execCallback: true,
                callback: function(data, onSuccess) {
                    var binding = data.binding;
                    var value = data.value;
                    var btnObj = $('#'+binding.template);
                    // Switch based off icon state
                    if(btnObj.hasClass('icon-plus'))  {
                        btnObj.removeClass('icon-plus');
                        btnObj.addClass('icon-minus');
                        $('#'+binding.template+'-options').fadeIn(
                            FADE_DURATION,
                            onSuccess
                            );
                    } else if(btnObj.hasClass('icon-minus'))  {
                        btnObj.removeClass('icon-minus');
                        btnObj.addClass('icon-plus');
                        $('#'+binding.template+'-options').fadeOut(
                            FADE_DURATION,
                            onSuccess
                            );
                    } else {
                        onSuccess();
                    }
                }
            },
        ];

        // Save the bindings to the framework instance.
        framework.putConfigBindings(moduleBindings);
        onSuccess();
    };
    this.onRegisterWrite = function(framework, binding, value, onError, onSuccess) {
        // console.log('in onRegisterWrite',binding);
        var overRideWrite = false;
        baseRegisters.forEach(function(reg) {
            if(binding.template === (reg + '-thermocouple-type-select')) {
                overRideWrite = true;
                var tcTempMetric = parseInt($('#'+reg+'-thermocouple-metric-select').val());
                var tcType = parseInt(value);
                // console.log('overRidden',reg, 'type:',value, 'metric',tcTempMetric);

                // Delete active binding from framework:
                self.editBindings(framework, 'delete',reg.split('AIN')[1]);

                self.configureChannel(framework.getSelectedDevice(),reg,tcType,tcTempMetric);

                //Add the binding back if it is a valid channel.
                if(tcType !== 0) {
                    self.editBindings(framework, 'put',reg.split('AIN')[1]);
                    $('#'+reg+'-table-data'+' .configuration-dependent-attribute').show();
                } else {
                    $('#'+reg+'-table-data'+' .configuration-dependent-attribute').hide();
                }

            }
        });
        onSuccess(overRideWrite);
    };
    this.onCloseDevice = function(framework, device, onError, onSuccess) {
        framework.clearConfigBindings();
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
        console.log('in onRefreshError', description);
        onHandle(true);
    };
    var self = this;
}
