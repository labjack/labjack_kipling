/**
 * Goals for the Lua Script Debugger module.
 * This is a Lua script intro-app that performs a minimal number of scripting
 * operations.  It is simply capable of detecting whether or not a Lua script
 * is running and then prints out the debugging log to the window.  
 *
 * @author Chris Johnson (LabJack Corp, 2014)
 *
 * Configuration:
 * No configuration of the device is required
 *
 * Periodic Processes:
 *     1. Read from "LUA_RUN" register to determine if a Lua script is running.
 *     2. Read from "LUA_DEBUG_NUM_BYTES" register to determine how much data is
 *         available in the debugging info buffer.
 *     3. If there is data available in the debugging buffer then get it from
 *         the device. 
**/

// Constant that determines device polling rate.  Use an increased rate to aid
// in user experience.
var MODULE_UPDATE_PERIOD_MS = 250;

// Constant that can be set to disable auto-linking the module to the framework
var DISABLE_AUTOMATIC_FRAMEWORK_LINKAGE = false;

/**
 * Module object that gets automatically instantiated & linked to the appropriate framework.
 * When using the 'singleDevice' framework it is instantiated as sdModule.
 */
function module() {
    this.moduleConstants = {};
    this.DACRegisters = {};
    this.moduleContext = {};
    this.activeDevice = undefined;

    this.currentValues = dict();
    this.bufferedValues = dict();
    this.newBufferedValues = dict();
    this.bufferedOutputValues = dict();


    this.hasChanges = false;

    this.DAC_CHANNEL_READ_DELAY = 3;

    this.DAC_CHANNEL_PRECISION = 3;

    this.spinnerController;
    this.updateDOM = true;

    

    /**
     * Function is called once every time the module tab is selected, loads the module.
     * @param  {[type]} framework   The active framework instance.
     * @param  {[type]} onError     Function to be called if an error occurs.
     * @param  {[type]} onSuccess   Function to be called when complete.
    **/
    this.onModuleLoaded = function(framework, onError, onSuccess) {
        // device_controller.ljm_driver.writeLibrarySync('LJM_SEND_RECEIVE_TIMEOUT_MS',5000);
        // Save Module Constant objects
        self.moduleConstants = framework.moduleConstants;
        self.DACRegisters = framework.moduleConstants.DACRegisters;

        var genericConfigCallback = function(data, onSuccess) {
            onSuccess();
        };

        var genericPeriodicCallback = function(data, onSuccess) {
            var name = data.binding.binding;
            var value = data.value;
            var oldValue = self.currentValues.get(name);
            if(oldValue != value) {
                self.newBufferedValues.set(name,value);
            } else {
                self.newBufferedValues.delete(name);
            }
            onSuccess();
        };
        var writeBufferedDACValues = function(data, onSuccess) {
            if (self.hasChanges) {
                self.bufferedOutputValues.forEach(function(newVal,address){
                    self.writeReg(address,newVal);
                });
                self.bufferedOutputValues = dict();
                self.hasChanges = false;
            }else if(self.bufferedOutputValues.size > 0) {
                self.bufferedOutputValues = dict();
            }
            onSuccess();
        }
        var smartBindings = [];

        var addSmartBinding = function(regInfo) {
            var binding = {};
            binding.bindingName = regInfo.name;
            binding.smartName = 'readRegister';
            binding.iterationDelay = self.DAC_CHANNEL_READ_DELAY;
            binding.periodicCallback = genericPeriodicCallback;
            binding.configCallback = genericConfigCallback;
            smartBindings.push(binding);
        };

        // Add DAC readRegisters
        self.DACRegisters.forEach(addSmartBinding);

        var customSmartBindings = [
            {
                // Define binding to handle Ethernet-Status updates.
                bindingName: 'dacUpdater', 
                smartName: 'periodicFunction',
                periodicCallback: writeBufferedDACValues
            }
        ];
        // Save the smartBindings to the framework instance.
        framework.putSmartBindings(smartBindings);
        // Save the customSmartBindings to the framework instance.
        framework.putSmartBindings(customSmartBindings);
        onSuccess();
    };
    this.writeReg = function(reg, val) {
        var ioDeferred = q.defer();
        self.activeDevice.qWrite(reg,val)
        .then(function() {
            self.currentValues.set(reg,val);
            ioDeferred.resolve();
        }, function(err) {
            onsole.error('AnalogOutputs-writeReg',address,err);
            ioDeferred.reject(err);
        });
        return ioDeferred.promise;
    };
    
    /**
     * Function is called once every time a user selects a new device.  
     * @param  {[type]} framework   The active framework instance.
     * @param  {[type]} device      The active framework instance.
     * @param  {[type]} onError     Function to be called if an error occurs.
     * @param  {[type]} onSuccess   Function to be called when complete.
    **/
    this.onDeviceSelected = function(framework, device, onError, onSuccess) {
        self.activeDevice = device;
        var dacSpinnerInfo = [
            {spinnerID:'DAC0_input_spinner', reg: 'DAC0'},
            {spinnerID:'DAC1_input_spinner', reg: 'DAC1'}
        ];
        self.spinnerController = new customSpinners(
            self, 
            dacSpinnerInfo,
            self.spinnerWriteEventHandler,
            self.incrementalSpinerUpdateEventHandler
        );

        framework.clearConfigBindings();
        framework.setStartupMessage('Reading Device Configuration');
        onSuccess();
    };

    this.onDeviceConfigured = function(framework, device, setupBindings, onError, onSuccess) {
        setupBindings.forEach(function(setupBinding){
            var name = setupBinding.address;
            var value;
            if(setupBinding.status === 'error') {
                value = 0;
            } else {
                value = setupBinding.result;
            }
            self.currentValues.set(name,value);
            self.bufferedOutputValues.set(name,value);
            self.hasChanges = false;
        });

        self.moduleContext.outputs = self.DACRegisters;
        framework.setCustomContext(self.moduleContext);
        onSuccess();
    };

    this.formatVoltageTooltip = function(value) {
        return sprintf.sprintf("%.2f V", value);
    };
    this.updateSpinnerVal = function(reg, val) {
        var spinner = $('#' + reg + '_input_spinner')
        self.spinnerController.writeDACSpinner(spinner,val);
    }
    this.updateSliderVal = function(reg, val) {
        $('#' + reg + '_input_slider').slider('setValue', val);
    };
    /**
     * Function to handle definitive spinner-write events.  
     *     The DAC channel SHOULD be updated
     * @param  {string} reg Device register to be written
     * @param  {number} val Value to be written to device register.
    **/
    this.spinnerWriteEventHandler = function(reg, val) {
        self.hasChanges = false;
        self.bufferedOutputValues.delete(reg);
        self.updateSliderVal(reg,val);
        self.writeReg(reg,val)
        .then(function() {
            self.writeDisplayedVoltage(register,selectedVoltage);
            self.updateDOM = true;
        });
    }
    this.incrementalSpinerUpdateEventHandler = function (reg, val) {
        self.updateDOM = false;
        self.bufferedOutputValues.set(reg,val);
        self.updateSliderVal(reg, val);
        self.hasChanges = true;
    }
    this.sliderWriteEventHandler = function(event) {
        var firingID = event.target.id;
        var register = firingID.replace('_input_slider', '');
        var selectedVoltage = Number(
            $('#'+firingID).data('slider').getValue()
        );
        self.hasChanges = false;
        self.bufferedOutputValues.delete(register);
        self.updateSpinnerVal(register, selectedVoltage);
        self.writeReg(register, selectedVoltage)
        .then(function() {
            self.writeDisplayedVoltage(register,selectedVoltage);
            self.updateDOM = true;
        });
    };
    this.incrementalSliderUpdateEventHandler = function(event) {
        self.updateDOM = false;
        var firingID = event.target.id;
        var register = firingID.replace('_input_slider', '');
        var selectedVoltage = Number(
            $('#'+firingID).data('slider').getValue()
        );
        self.bufferedOutputValues.set(register,selectedVoltage);
        self.updateSpinnerVal(register, selectedVoltage);
        self.hasChanges = true;
    };
    this.writeDisplayedVoltage = function(register, selectedVoltage) {
        self.updateSpinnerVal(register, selectedVoltage);
        self.updateSliderVal(register, selectedVoltage);
    }
    
    /**
     * Create the DAC / analog output controls.
    **/
    this.createSliders = function()
    {
        $('.slider').unbind();
        var sliderObj = $('.slider').slider(
            {'formater': self.formatVoltageTooltip, 'value': 4.9}
        );
        sliderObj.bind('slide', self.incrementalSliderUpdateEventHandler);
        sliderObj.bind('slideStop', self.sliderWriteEventHandler);
    }

    this.onTemplateLoaded = function(framework, onError, onSuccess) {
        self.spinnerController.createSpinners();
        onSuccess();
    };
    /**
     * Function that gets executed after the module's template is displayed.
     * @param  {object} framework framework object.
     * @param  {function} onError   function to be called on error.
     * @param  {function} onSuccess function to be called on success
     * @return {[type]}           [description]
     */
    this.onTemplateDisplayed = function(framework, onError, onSuccess) {
        self.createSliders();
        self.DACRegisters.forEach(function(register){
            var val = self.currentValues.get(register.register);
            self.writeDisplayedVoltage(register.register,val);
        });
        $('#analog_outputs_fw_hider').css('position','inherit');
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
        // Loop through the new buffered values, save them, and display their 
        // changes
        self.newBufferedValues.forEach(function(value,key){
            if(self.updateDOM) {
                self.writeDisplayedVoltage(key,value);
            }
            self.currentValues.set(key,value);
            self.newBufferedValues.delete(key);
        });
        onSuccess();
    };
    this.onCloseDevice = function(framework, device, onError, onSuccess) {
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
        if(typeof(description.retError) === 'number') {
            console.log('in onRefreshError',device_controller.ljm_driver.errToStrSync(description.retError));
        } else {
            console.log('Type of error',typeof(description.retError),description.retError);
        }
        onHandle(true);
    };

    var self = this;
}
