/* jshint undef: true, unused: true, undef: true */
/* global handlebars, console, q, static_files */
/**
 * Goals for the Device Info module.
 * This module displays basic device information about the Digit and T7 devices.
 *
 * @author Chris Johnson (LabJack Corp, 2014)
**/

/**
 * Module object that gets automatically instantiated & linked to the appropriate framework.
 * When using the 'singleDevice' framework it is instantiated as sdModule.
 */
function module() {
    this.MODULE_DEBUGGING = true;
    this.activeDevice = undefined;
    this.framework = undefined;
    this.moduleContext = {};
    /**
     * Function is called once every time the module tab is selected, loads the module.
     * @param  {[type]} framework   The active framework instance.
     * @param  {[type]} onError     Function to be called if an error occurs.
     * @param  {[type]} onSuccess   Function to be called when complete.
    **/
    this.onModuleLoaded = function(framework, onError, onSuccess) {
        if(self.MODULE_DEBUGGING) {
            console.log('in onModuleLoaded');
        }
        self.framework = framework;
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
        if(self.MODULE_DEBUGGING) {
            console.log('in onDeviceSelected', device);
        }
        self.activeDevice = device;

        framework.clearConfigBindings();
        framework.setStartupMessage('Reading Device Info');
        onSuccess();
    };
    var getExtraOperation = function(device,operation,input) {
        return device[operation](input);
    };

    this.onDeviceConfigured = function(framework, device, setupBindings, onError, onSuccess) {
        if(self.MODULE_DEBUGGING) {
            console.log('in onDeviceConfigured', device);
        }
        var extraRegisters;
        var promises = [];
        var deviceTemplate;
        var continueFramework = function(template, missingData) {
            var compiledData = '';
            var keys;
            var context = {};
            try {
                keys = Object.keys(device.savedAttributes);
                keys.forEach(function(key) {
                    context[key] = device.savedAttributes[key];
                });
                keys = Object.keys(missingData);
                keys.forEach(function(key) {
                    context[key] = missingData[key];
                });

                context.staticFiles = static_files.getDir();
                console.log('Template Context', context);
                compiledData = template(context);
            } catch(err) {
                console.error('Error compiling template', err);
            }
            // console.log('Compiled Data', compiledData);
            framework.setCustomContext({
                'info':'My Info',
                'device': device.savedAttributes,
                'pageData': compiledData,
            });
            onSuccess();
        };
        
        if(device.savedAttributes.deviceTypeName === 'T7') {
            deviceTemplate = handlebars.compile(
                framework.moduleData.htmlFiles.t7_template
            );

            // Extra required data for T7's
            extraRegisters = [
                'ETHERNET_IP',
                'WIFI_IP',
                'TEMPERATURE_DEVICE_K',
                'CURRENT_SOURCE_200UA_CAL_VALUE',
                'CURRENT_SOURCE_10UA_CAL_VALUE',
                'POWER_ETHERNET',
                'POWER_WIFI',
                'POWER_AIN',
                'POWER_LED',
                'WATCHDOG_ENABLE_DEFAULT',
            ];
            promises.push(getExtraOperation(device,'iReadMany', extraRegisters));
            promises.push(getExtraOperation(device,'iRead', 'ETHERNET_MAC'));
            promises.push(getExtraOperation(device,'iRead', 'WIFI_MAC'));
            q.allSettled(promises)
            .then(function(results) {
                var data = {};
                results.forEach(function(result) {
                    var value = result.value;
                    if(Array.isArray(value)) {
                        value.forEach(function(singleResult) {
                            data[singleResult.name] = singleResult;
                        });
                    } else {
                        data[value.name] = value;
                    }
                });
                continueFramework(deviceTemplate, data);
            });
        } else if(device.savedAttributes.deviceTypeName === 'Digit') {
            deviceTemplate = handlebars.compile(
                framework.moduleData.htmlFiles.digit_template
            );
            continueFramework(deviceTemplate, {});
        }
    };
    

    this.onTemplateLoaded = function(framework, onError, onSuccess) {
        if(self.MODULE_DEBUGGING) {
            console.log('in onTemplateLoaded');
        }
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
        if(self.MODULE_DEBUGGING) {
            console.log('in onTemplateDisplayed');
        }
        onSuccess();
    };
    this.onRegisterWrite = function(framework, binding, value, onError, onSuccess) {
        if(self.MODULE_DEBUGGING) {
            console.log('in onRegisterWrite');
        }
        onSuccess();
    };
    this.onRegisterWritten = function(framework, registerName, value, onError, onSuccess) {
        if(self.MODULE_DEBUGGING) {
            console.log('in onRegisterWritten');
        }
        onSuccess();
    };
    this.onRefresh = function(framework, registerNames, onError, onSuccess) {
        if(self.MODULE_DEBUGGING) {
            console.log('in onRefresh');
        }
        onSuccess();
    };
    this.onRefreshed = function(framework, results, onError, onSuccess) {
        if(self.MODULE_DEBUGGING) {
            console.log('in onRefreshed');
        }
        onSuccess();
    };
    this.onCloseDevice = function(framework, device, onError, onSuccess) {
        if(self.MODULE_DEBUGGING) {
            console.log('in onCloseDevice');
        }
        onSuccess();
    };
    this.onUnloadModule = function(framework, onError, onSuccess) {
        if(self.MODULE_DEBUGGING) {
            console.log('in onUnloadModule');
        }
        onSuccess();
    };
    this.onLoadError = function(framework, description, onHandle) {
        console.error('in onLoadError', description);
        onHandle(true);
    };
    this.onWriteError = function(framework, registerName, value, description, onHandle) {
        console.error('in onConfigError', description);
        onHandle(true);
    };
    this.onRefreshError = function(framework, registerNames, description, onHandle) {
        console.error('in onRefreshError', description);
        if(typeof(description.retError) === 'number') {
            console.error('in onRefreshError',description.retError);
        } else {
            console.error('Type of error',typeof(description.retError),description.retError);
        }
        onHandle(true);
    };

    var self = this;
}
