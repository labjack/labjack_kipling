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
 *  1. Read AINx_EF_TYPE register to determine if configuring a channel will 
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
var sprintf = require('sprintf-js').sprintf;

// Constant that determines device polling rate.
var MODULE_UPDATE_PERIOD_MS = 1000;

// Constant that can be set to disable auto-linking the module to the framework
var DISABLE_AUTOMATIC_FRAMEWORK_LINKAGE = false;

/**
 * Module object that gets automatically instantiated & linked to the appropriate framework.
 * When using the 'singleDevice' framework it is instantiated as sdModule.
 */
function module() {
    //Define nop (do-nothing) function
    var nop = function(){};

    // Base-Register Variable for Configuring multiple thermocouples.
    var baseReg = 'AIN#(0:13)';

    // Expand baseReg & create baseRegister list using ljmmm.
    // ex: ['AIN0', 'AIN1', ... 'AIN13']
    var baseRegisters = ljmmm_parse.expandLJMMMName(baseReg);

    // Define support analog input ef-types
    var ain_ef_types = t7DeviceConstants.ainEFTypeOptions;

    // Supported analog input range options.
    var ainRangeOptions = t7DeviceConstants.ainRangeOptions;

    // Supported analog input resolution options.
    var ainResolutionOptions = t7DeviceConstants.ainResolutionOptions;

    // Supported analog input resolution options.
    var ainSettlingOptions = t7DeviceConstants.ainSettlingOptions;

    // Supported analog input negative channel options
    var ainNegativeCHOptions = [{
        value: 199,
        name: "GND",
        selected:''
    }];

    var overrideGraphRanges = false;
    var minGraphRange;
    var maxGraphRange;

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
        var rangeVal = Number($(rangeIdName).val());
        var minRangeText = $(minValIdName).text();
        var maxRangeText = $(maxValIdName).text();
        var tStr;
        // console.log('binding',binding,'range: ',rangeVal);
        
        tStr = (-1 * rangeVal).toString();
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

        return sprintf('%10.6f',info.value);
    };

    /**
     * Function is called once every time the module tab is selected, loads the module.
     * @param  {[type]} framework   The active framework instance.
     * @param  {[type]} onError     Function to be called if an error occurs.
     * @param  {[type]} onSuccess   Function to be called when complete.
    **/
    this.onModuleLoaded = function(framework, onError, onSuccess) {
        // Define the module's setupBindings
        var setupBindings = [
            {bindingClass: baseReg+'_EF_TYPE', binding: baseReg+'_EF_TYPE', direction: 'read'},
            {bindingClass: baseReg+'_RANGE', binding: baseReg+'_RANGE', direction: 'read'},
            {bindingClass: baseReg+'_RESOLUTION_INDEX', binding: baseReg+'_RESOLUTION_INDEX', direction: 'read'},
            {bindingClass: baseReg+'_SETTLING_US', binding: baseReg+'_SETTLING_US', direction: 'read'},
            {bindingClass: baseReg+'_NEGATIVE_CH', binding: baseReg+'_NEGATIVE_CH', direction: 'read'},
            {bindingClass: 'AIN_ALL_RANGE', binding: 'AIN_ALL_RANGE', direction: 'read'},
            {bindingClass: 'AIN_ALL_RESOLUTION_INDEX', binding: 'AIN_ALL_RESOLUTION_INDEX', direction: 'read'},
            {bindingClass: 'AIN_ALL_SETTLING_US', binding: 'AIN_ALL_SETTLING_US', direction: 'read'},
            {bindingClass: 'AIN_ALL_NEGATIVE_CH', binding: 'AIN_ALL_NEGATIVE_CH', direction: 'read'},
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
        moduleContext.analogInputs = [];
        var configuredEFType = [];
        var configuredRange = [];
        var configuredResolution = [];
        var configuredSettlingUS = [];
        var configuredNegativeCH = [];
        var configuredAllAinRange = -9999;
        var configuredAllAinResolution = -9999;
        var configuredAllAinSettlingUS = -9999;
        var configuredAllAinNegativeCH = -9999;

        //by default don't show the efSystemStatusWarning message
        var showEFSystemStatusWarning = false;

        //Loop through results and save them appropriately.  
        setupBindings.forEach(function(binding, key){
            // console.log('key',key,'Address',binding.address,', Result: ',binding.result);
            if (key.search('_EF_TYPE') > 0) {
                if (binding.status === 'success') {
                    // Read was successful, save AINx_EF_TYPE state
                    configuredEFType.push(binding.result);
                } else {
                    // Read was not successful, on old devices this means 
                    // AINx_EF_TYPE is un-configured
                    configuredEFType.push(0);
                }
            } else if (binding.status === 'success') {
                if(key.search('AIN_ALL_RANGE') >= 0) {
                    configuredAllAinRange = binding.result.toFixed(3);
                } else if(key.search('AIN_ALL_RESOLUTION_INDEX') >= 0) {
                    configuredAllAinResolution = binding.result;
                } else if(key.search('AIN_ALL_SETTLING_US') >= 0) {
                    configuredAllAinSettlingUS = binding.result;
                } else if(key.search('AIN_ALL_NEGATIVE_CH') >= 0) {
                    configuredAllAinNegativeCH = binding.result;
                } else if (key.search('_RANGE') > 0) {
                    configuredRange.push(binding.result.toFixed(3));
                } else if (key.search('_RESOLUTION_INDEX') > 0) {
                    configuredResolution.push(binding.result);
                } else if (key.search('_SETTLING_US') > 0) {
                    // console.log('settling: ',binding.result);
                    configuredSettlingUS.push(binding.result);
                } else if (key.search('_NEGATIVE_CH') > 0) {
                    configuredNegativeCH.push(binding.result);
                }
            } else {
                console.log(
                    'SetupBinding Read Fail',
                    binding.address, 
                    binding.result
                );
            }
        });
    
        var populateMenuArray = function(newArray, origArray) {
            origArray.forEach(function(type){
                newArray.push({
                    name:type.name,
                    value:type.value,
                    selected:'',
                    disp:true,
                    style:''
                });
            });
            return newArray;
        }
        var selectValue = function(array, value, debug) {
            var i;
            for(i = 0; i < array.length; i++) {
                if(array[i].value == value){
                    if(typeof(debug) === "boolean") {
                        if(debug) {
                            console.log('selecting...');
                        }
                    }
                    array[i].selected = 'selected';
                    return array;
                }
            }
        }

        baseRegisters.forEach( function (reg, index) {
            var efSystemStatusMessage = "Not Configured";
            var style = "color:black";
            var ainRangeMenuOptions = [];
            var ainResolutionMenuOptions = [];
            var ainSettlingMenuOptions = [];
            var negativeCHMenuOptions = [];

            var displayNegativeCh = false;
            var efSystemStatus = {
                message: 'Not Configured',
                showWarning: false,
                style: 'color:black',
                class: ''
            }

            var efType = configuredEFType[index];
            if (efType !== 0) {
                var name = '';
                ain_ef_types.forEach(function(type){
                    if (type.value == efType) {
                        name = type.name;
                    }
                });
                if (name === '') {
                    name = "Configured: " + efType.toString();
                }
                efSystemStatus.message = name+': ('+efType.toString()+')';
                efSystemStatus.style = "color:red";
                efSystemStatus.showWarning = true;
                showEFSystemStatusWarning = true;
                efSystemStatus.class = 'text-warning';
            }

            // Populate ainRangeMenuOptions
            ainRangeMenuOptions = populateMenuArray(ainRangeMenuOptions, ainRangeOptions);

            // Populate ainResolutionMenuOptions
            ainResolutionMenuOptions = populateMenuArray(ainResolutionMenuOptions, ainResolutionOptions);

            // Populate negativeCHMenuOptions
            ainSettlingMenuOptions = populateMenuArray(ainSettlingMenuOptions, ainSettlingOptions);

            // Populate negativeCHMenuOptions
            negativeCHMenuOptions = populateMenuArray(negativeCHMenuOptions, ainNegativeCHOptions);

            if ((index % 2) == 0) {
                var displayNegativeCh = true;
                negativeCHMenuOptions.push({
                    value: index+1,
                    name: "AIN"+(index+1).toString(),
                    selected:''
                });
            }

            // Select configured menu option for: ainRangeMenuOptions
            selectValue(ainRangeMenuOptions, configuredRange[index]);

            // Select configured menu option for: ainResolutionMenuOptions
            selectValue(ainResolutionMenuOptions, configuredResolution[index]);

            // Select configured menu option for: ainSettlingMenuOptions
            selectValue(ainSettlingMenuOptions, configuredResolution[index]);

            // Select configured menu option for: negativeCHMenuOptions
            selectValue(negativeCHMenuOptions, configuredNegativeCH[index]);

            moduleContext.analogInputs.push({
                "name": reg,
                "style": style,
                "efSystemStatus": efSystemStatus,
                "ainRangeMenuOptions": ainRangeMenuOptions,
                "ainResolutionMenuOptions": ainResolutionMenuOptions,
                "ainSettlingMenuOptions": ainSettlingMenuOptions,
                "displayNegativeCh": displayNegativeCh,
                "negativeCHMenuOptions": negativeCHMenuOptions,
            });
            
        });

        var ainRangeMenuOptionsAll = [];
        var ainResolutionMenuOptionsAll = [];
        var ainSettlingMenuOptionsAll = [];
        var ainNegativeCHMenuOptionsAll = [];

        //Populate Menu's with Select Option & default value:
        ainRangeMenuOptionsAll.push({
            name: 'Select',
            value: -9999,
            selected: '',
            disp: false,
        });
        ainResolutionMenuOptionsAll.push({
            name: 'Select',
            value: -9999,
            selected: '',
            disp: false,
        });
        ainSettlingMenuOptionsAll.push({
            name: 'Select',
            value: -9999,
            selected: '',
            disp: false,
        });
        ainNegativeCHMenuOptionsAll.push({
            name: 'Select',
            value: -9999,
            selected: '',
            disp: false,
        });

        // Populate Menu's with remaining options
        ainRangeOptions = populateMenuArray(ainRangeMenuOptionsAll, ainRangeOptions);
        ainResolutionOptions = populateMenuArray(ainResolutionMenuOptionsAll, ainResolutionOptions);
        ainSettlingOptions = populateMenuArray(ainSettlingMenuOptionsAll, ainSettlingOptions);
        ainNegativeCHOptions = populateMenuArray(ainNegativeCHMenuOptionsAll, ainNegativeCHOptions);

        // Select appropriate values
        selectValue(ainRangeOptions, configuredAllAinRange);
        selectValue(ainResolutionOptions, configuredAllAinResolution);
        selectValue(ainSettlingOptions, configuredAllAinSettlingUS);
        selectValue(ainNegativeCHOptions, configuredAllAinNegativeCH);

        
        moduleContext.ainRangeMenuOptionsAll = ainRangeMenuOptionsAll;
        moduleContext.ainResolutionMenuOptionsAll = ainResolutionMenuOptionsAll;
        moduleContext.ainSettlingMenuOptionsAll = ainSettlingMenuOptionsAll;
        moduleContext.ainNegativeCHMenuOptionsAll = ainNegativeCHMenuOptionsAll;
        moduleContext.showEFSystemStatusWarning = showEFSystemStatusWarning;
        framework.setCustomContext(moduleContext);
        onSuccess();
    };

    this.onTemplateLoaded = function(framework, onError, onSuccess) {
        // Define device-global device-configuration event handler function.
        var configDeviceGlobal = function(data, onSuccess) {
            var handleConfigError = function(err) {
                console.log('configError',err,binding,value);
                sdFramework.manageError(err);
                onSuccess();
            }
            console.log(data.binding.bindingClass,'!event!');
            var framework = data.framework;
            var device = data.device;
            var binding = data.binding.binding.split('-callback')[0];
            var value = Number(data.value);
            var className = data.binding.bindingClass.split('all-ain')[1];
            className = '.analog-input' + className;

            console.log('binding: ',binding,', value:',value, ', className: ',className);

            if(value != -9999) {
                // Update related selectors
                $(className).val(value);

                // Perform device I/O
                device.qWrite(binding,value)
                .then(onSuccess,handleConfigError)
            } else {
                onSuccess();
            }
        }

        // Define individual channel device-configuration event handler function.
        var configDevice = function(data, onSuccess) {
            var handleConfigError = function(err) {
                console.log('configError',err,binding,value);
                onSuccess();
            }
            console.log(data.binding.bindingClass,'!event!');
            var framework = data.framework;
            var device = data.device;
            var binding = data.binding.binding.split('-callback')[0];
            var value = Number(data.value);
            var className = data.binding.bindingClass.split('analog-input')[1];
            className = '#all-ain' + className;

            console.log('binding: ',binding,', value:',value);

            // Update related selectors
            $(className).val(-9999);

            // Perform device I/O
            device.qWrite(binding,value)
            .then(onSuccess,handleConfigError)
        };

        // Define Generic Options Button Callback
        var optionsButtonHandler = function(data, onSuccess) {
            var binding = data.binding;
            var value = data.value;
            console.log('OptionsButton-event');
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
        };

        // Define the module's run-time bindings:
        var moduleBindings = [
            {
                // Define binding to automatically read AINx Registers.
                bindingClass: baseReg, 
                template: baseReg, 
                binding: baseReg, 
                direction: 'read', 
                format: 'customFormat', 
                customFormatFunc: self.ainResultUpdate
            },
            {
                // Define binding to automatically read AINx_BINARY Registers.
                bindingClass: baseReg+'_BINARY', 
                template: baseReg+'_BINARY',   
                binding: baseReg+'_BINARY',    
                direction: 'read',  
                format: '%d'
            },
            {
                // Define binding to handle AIN_ALL_RANGE user inputs.
                bindingClass: 'all-ain-range-select',  
                template: 'all-ain-range-select', 
                binding: 'AIN_ALL_RANGE-callback',  
                direction: 'write', 
                event: 'change',
                writeCallback: configDeviceGlobal
            },
            {
                // Define binding to handle AIN_ALL_RESOLUTION_INDEX user inputs.
                bindingClass: 'all-ain-resolution-select',  
                template: 'all-ain-resolution-select', 
                binding: 'AIN_ALL_RESOLUTION_INDEX-callback',  
                direction: 'write', 
                event: 'change',
                writeCallback: configDeviceGlobal
            },
            {
                // Define binding to handle AIN_ALL_SETTLING_US user inputs.
                bindingClass: 'all-ain-settling-select',  
                template: 'all-ain-settling-select', 
                binding: 'AIN_ALL_SETTLING_US-callback',  
                direction: 'write', 
                event: 'change',
                writeCallback: configDeviceGlobal
            },
            {
                // Define binding to handle AIN_ALL_NEGATIVE_CH user inputs.
                bindingClass: 'all-ain-negative-channel-select',  
                template: 'all-ain-negative-channel-select', 
                binding: 'AIN_ALL_NEGATIVE_CH-callback',  
                direction: 'write', 
                event: 'change',
                writeCallback: configDeviceGlobal
            },
            {
                // Define binding to handle AINx_RANGE user inputs.
                bindingClass: baseReg+'-analog-input-range-select',  
                template: baseReg+'-analog-input-range-select', 
                binding: baseReg+'_RANGE-callback',  
                direction: 'write', 
                event: 'change',
                writeCallback: configDevice
            },
            {
                // Define binding to handle AINx_RESOLUTION_INDEX user inputs.
                bindingClass: baseReg+'-analog-input-resolution-select',  
                template: baseReg+'-analog-input-resolution-select', 
                binding: baseReg+'_RESOLUTION_INDEX-callback',  
                direction: 'write', 
                event: 'change',
                writeCallback: configDevice
            },
            {
                // Define binding to handle AINx_SETTLING_US user inputs.
                bindingClass: baseReg+'-analog-input-settling-select',  
                template: baseReg+'-analog-input-settling-select', 
                binding: baseReg+'_SETTLING_US-callback',  
                direction: 'write', 
                event: 'change',
                writeCallback: configDevice
            },
            {
                // Define binding to handle AINx_NEGATIVE_CH user inputs.
                bindingClass: baseReg+'-analog-input-negative-ch-select',  
                template: baseReg+'-analog-input-negative-ch-select', 
                binding: baseReg+'_NEGATIVE_CH-callback',  
                direction: 'write', 
                event: 'change',
                writeCallback: configDevice
            },
            {
                // Define binding to handle graph button presses
                bindingClass: 'Graph-Range-Options#(0:2)',
                template: 'Graph-Range-Options#(0:2)',
                binding: 'Graph-Range-Options#(0:2)-callback',
                direction: 'write',
                event: 'change',
                writeCallback: function(data, onSuccess) {
                    console.log('data',data);
                    onSuccess();
                }
            },
            {
                // Define binding to handle display/hide option-button presses.
                bindingClass: 'module-options-toggle-button',  
                template: 'module-options-toggle-button', 
                binding: 'module-options-callback',  
                direction: 'write', 
                event: 'click',
                writeCallback: function(data, onSuccess) {
                    //Use for reading checkbox:
                    // $('').prop('checked',false) to set
                    // $('').prop('checked') to read
                    // for html:
                    // <input type="checkbox" id="inlineCheckbox1" value="option1">
                    optionsButtonHandler(data, onSuccess);
                }
            },
            {
                // Define binding to handle display/hide option-button presses.
                bindingClass: baseReg+'-options-toggle-button',  
                template: baseReg+'-options-toggle-button', 
                binding: baseReg+'-callback',  
                direction: 'write', 
                event: 'click',
                writeCallback: function(data, onSuccess) {
                    optionsButtonHandler(data, onSuccess);
                }
            },
        ];

        // Save the bindings to the framework instance.
        framework.putConfigBindings(moduleBindings);
        onSuccess();
    };
    this.onRegisterWrite = function(framework, binding, value, onError, onSuccess) {
        onSuccess();
    };
    this.onRegisterWritten = function(framework, registerName, value, onError, onSuccess) {
        onSuccess();
    };
    this.onRefresh = function(framework, registerNames, onError, onSuccess) {
        onSuccess();
    };
    this.onRefreshed = function(framework, results, onError, onSuccess) {
        onSuccess();
    };
    this.onCloseDevice = function(framework, device, onError, onSuccess) {
        framework.clearConfigBindings();
        onSuccess();
    };
    this.onUnloadModule = function(framework, onError, onSuccess) {
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
