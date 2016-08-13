/* jshint undef: true, unused: true, undef: true */
/* global handlebars, console, q, static_files, dict, $, showAlert */
/**
 * Goals for the Device Info module.
 * This module displays basic device information about the Digit and T7 devices.
 *
 * @author Chris Johnson (LabJack Corp, 2014)
**/

var MODULE_UPDATE_PERIOD_MS = 1000;

/**
 * Module object that gets automatically instantiated & linked to the appropriate framework.
 * When using the 'singleDevice' framework it is instantiated as sdModule.
 */
function module() {
    this.MODULE_DEBUGGING = true;
    this.MODULE_LOADING_STATE_DEBUGGING = false;
    this.activeDevice = undefined;
    this.framework = undefined;
    this.moduleContext = {};
    this.moduleConstants = {};
    this.periodicRegisters = {};
    var savePeriodicRegisters = function(regInfo) {
        self.periodicRegisters[regInfo.name] = regInfo;
    };
    this.currentValues = dict();
    this.bufferedValues = dict();
    this.newBufferedValues = dict();

    var staticFilesDir = static_files.getDir();

    // var genericConfigCallback = function(data, onSuccess) {
    //     onSuccess();
    // };
    var genericPeriodicCallback = function(data, onSuccess) {
        var name = data.binding.binding;
        var value = data.value;
        if(self.currentValues.has(name)) {
            var oldValue = self.currentValues.get(name);
            if(oldValue.res != value.res) {
                // console.log('New Value!', name, value);
                self.newBufferedValues.set(name,value);
            } else {
                self.newBufferedValues.delete(name);
            }
        } else {
            self.newBufferedValues.set(name, value);
        }
        onSuccess();
    };
    var DEVICE_NAME_CONTROLS_ID = '#change-name-controls';
    var toggleNameControlElementsVisibility = function(data, onSuccess) {
        $(DEVICE_NAME_CONTROLS_ID).slideToggle();
        onSuccess();
    };
    var saveNewDeviceName = function(data, onSuccess) {
        var newName = $('#new-name-input').val();
        self.activeDevice.writeDeviceName(newName.toString())
        .then(function() {
            $(DEVICE_NAME_CONTROLS_ID).slideUp();
            onSuccess();
        }, function(err) {
            console.error('Failed to set device name', err);
            showAlert('Failed to save device name: ' + err.toString());
            onSuccess();
        });
    };
    var cancelSaveNewDeviceName = function(data, onSuccess) {
        $(DEVICE_NAME_CONTROLS_ID).slideUp();
        $('new-name-input').val('');
        onSuccess();
    };
    /**
     * Function is called once every time the module tab is selected, loads the module.
     * @param  {[type]} framework   The active framework instance.
     * @param  {[type]} onError     Function to be called if an error occurs.
     * @param  {[type]} onSuccess   Function to be called when complete.
    **/
    this.onModuleLoaded = function(framework, onError, onSuccess) {
        if(self.MODULE_LOADING_STATE_DEBUGGING) {
            console.log('in onModuleLoaded');
        }
        // Save references to module object
        self.moduleConstants = framework.moduleConstants;
        self.framework = framework;

        var customSmartBindings = [{
            // define binding to handle showing/hiding the name-changing gui
            // elements
            bindingName: 'change-name-link',
            smartName: 'clickHandler',
            callback: toggleNameControlElementsVisibility,
        }, {
            bindingName: 'change-name-button',
            smartName: 'clickHandler',
            callback: saveNewDeviceName,
        }, {
            bindingName: 'cancel-change-name-button',
            smartName: 'clickHandler',
            callback: cancelSaveNewDeviceName,
        }];

        // Save the customSmartBindings to the framework instance.
        framework.putSmartBindings(customSmartBindings);
        onSuccess();
    };
    
    /**
     * Function is called once every time a user selects a new device.  
     * @param  {[type]} framework   The active framework instance.
     * @param  {[type]} device      The active framework instance.
     * @param  {[type]} onError     Function to be called if an error occurs.
     * @param  {[type]} onSuccess   Function to be called when complete.
    **/
    this.deviceBindings = [];
    this.onDeviceSelected = function(framework, device, onError, onSuccess) {
        if(self.MODULE_LOADING_STATE_DEBUGGING) {
            console.log('in onDeviceSelected', device);
        }
        // Save a reference to the activeDevice
        self.activeDevice = device;

        // Deletes the periodically-executed functions.
        framework.clearConfigBindings();
        self.deviceBindings = [];
        var smartBindings = [];
        var addSmartBinding = function(regInfo) {
            var binding = {};
            binding.bindingName = regInfo.name;
            binding.smartName = 'readRegister';
            binding.periodicCallback = genericPeriodicCallback;
            binding.dataKey = '';
            smartBindings.push(binding);
            self.deviceBindings.push(regInfo.name);
        };
        var deviceTypeName = device.savedAttributes.deviceTypeName;
        if(self.moduleConstants[deviceTypeName]) {
            self.moduleConstants[deviceTypeName].forEach(addSmartBinding);
            self.moduleConstants[deviceTypeName].forEach(savePeriodicRegisters);
        }
        // Save the smartBindings to the framework instance.
        framework.putSmartBindings(smartBindings);

        framework.setStartupMessage('Reading Device Info');
        onSuccess();
    };
    var getExtraOperation = function(device,operation,input) {
        if(input) {
            return device[operation](input);
        } else {
            return device[operation]();
        }
    };

    this.onDeviceConfigured = function(framework, device, setupBindings, onError, onSuccess) {
        if(self.MODULE_LOADING_STATE_DEBUGGING) {
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

                context.staticFiles = staticFilesDir;
                // console.log('Template Context', context);
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

            // Extra required data for T7s
            extraRegisters = [
                'ETHERNET_IP',
                'WIFI_IP',
                'WIFI_RSSI',
                'CURRENT_SOURCE_200UA_CAL_VALUE',
                'CURRENT_SOURCE_10UA_CAL_VALUE',
                'POWER_ETHERNET',
                'POWER_WIFI',
                'POWER_AIN',
                'POWER_LED',
                'WATCHDOG_ENABLE_DEFAULT',
            ];
            var secondaryExtraRegisters = [
                'TEMPERATURE_DEVICE_K',
            ];
            promises.push(getExtraOperation(device,'sReadMany', extraRegisters));
            promises.push(getExtraOperation(device,'sReadMany', secondaryExtraRegisters));
            promises.push(getExtraOperation(device,'sRead', 'ETHERNET_MAC'));
            promises.push(getExtraOperation(device,'sRead', 'WIFI_MAC'));
            // promises.push(getExtraOperation(device, 'getRecoveryFirmwareVersion'))
            promises.push(function getDeviceRecoveryFirmwareVersion() {
                var defered = q.defer();   
                device.getRecoveryFirmwareVersion()
                .then(function(res) {
                    console.log('Get Device Recovery Firmware Version Result', res);
                    defered.resolve({
                        'val': res,
                        'name': 'recoveryFirmwareVersion'
                    });
                }, function(err) {
                    defered.reject(err);
                });
                return defered.promise;
            }());
            promises.push(function getDeviceMicroSDCardDiskInfo() {
                var defered = q.defer();   
                device.getDiskInfo()
                .then(function(res) {
                    console.log('Get Device Recovery Firmware Version Result', res);
                    defered.resolve({
                        'fileSystem': res.fileSystem,
                        'freeSpace': res.freeSpace,
                        'totalSize': res.totalSize,
                        'info': res,
                        'name': 'diskInfo',
                    });
                }, function(err) {
                    defered.reject(err);
                });
                return defered.promise;
            }());
            promises.push(getExtraOperation(device,'getLatestDeviceErrors'));
        } else if(device.savedAttributes.deviceTypeName === 'Digit') {
            deviceTemplate = handlebars.compile(
                framework.moduleData.htmlFiles.digit_template
            );

            // Extra required data for Digits
            extraRegisters = ['DGT_LIGHT_RAW'];
            promises.push(getExtraOperation(device,'sReadMany', extraRegisters));
            promises.push(getExtraOperation(device,'getLatestDeviceErrors'));
        }

        q.allSettled(promises)
        .then(function(results) {
            var data = {};
            results.forEach(function(result) {
                console.log('Results', result);
                var value = result.value;
                if(Array.isArray(value)) {
                    value.forEach(function(singleResult) {
                        data[singleResult.name] = singleResult;
                    });
                } else {
                    if(value.name) {
                        data[value.name] = value;
                    }
                    if((typeof(value.numErrors) !== 'undefined') && (typeof(value.errors) !== 'undefined')) {
                        data.latestDeviceErrors = value;
                    }
                }
            });
            continueFramework(deviceTemplate, data);
        });
    };
    

    this.onTemplateLoaded = function(framework, onError, onSuccess) {
        if(self.MODULE_LOADING_STATE_DEBUGGING) {
            console.log('in onTemplateLoaded');
        }
        onSuccess();
    };

    this.cachedPageControls = {};
    var cachePageControls = function() {
        var keys = Object.keys(self.periodicRegisters);
        keys.forEach(function(key) {
            var id = self.periodicRegisters[key].id;
            var element = $('#' + id);
            var dataKey = self.periodicRegisters[key].dataKey;
            self.cachedPageControls[key] = {
                'id': id,
                'element': element,
                'save': function(value) {
                    var saved = false;
                    if(dataKey) {
                        if(dataKey !== '') {
                            if(typeof(value[dataKey]) !== 'undefined') {
                                element.text(value[dataKey]);
                                saved = true;
                            }
                        }
                    }
                    if(!saved) {
                        if(key === 'WIFI_RSSI') {
                            var titleText = 'Signal Strength: ' + value.str;
                            var srcTxt = staticFilesDir + 'img/';
                            srcTxt += value.imageName + '.png';
                            element.attr('src', srcTxt);
                            element.attr('title', titleText);
                        }
                    }
                }
            };
        });
    };
    /**
     * Function that gets executed after the module's template is displayed.
     * @param  {object} framework framework object.
     * @param  {function} onError   function to be called on error.
     * @param  {function} onSuccess function to be called on success
     * @return {[type]}           [description]
     */
    this.onTemplateDisplayed = function(framework, onError, onSuccess) {
        if(self.MODULE_LOADING_STATE_DEBUGGING) {
            console.log('in onTemplateDisplayed');
        }
        cachePageControls();
        onSuccess();
    };
    this.onRegisterWrite = function(framework, binding, value, onError, onSuccess) {
        if(self.MODULE_LOADING_STATE_DEBUGGING) {
            console.log('in onRegisterWrite');
        }
        onSuccess();
    };
    this.onRegisterWritten = function(framework, registerName, value, onError, onSuccess) {
        if(self.MODULE_LOADING_STATE_DEBUGGING) {
            console.log('in onRegisterWritten');
        }
        onSuccess();
    };
    this.onRefresh = function(framework, registerNames, onError, onSuccess) {
        if(self.MODULE_LOADING_STATE_DEBUGGING) {
            console.log('in onRefresh');
        }
        onSuccess();
    };
    var handleNewBufferedValues = function(value, key) {
        self.currentValues.set(key, value);
        try {
            self.cachedPageControls[key].save(value);
        } catch(err) {
            cachePageControls();
            try {
                self.cachedPageControls[key].save(value);
            } catch(secondErr) {
                console.error('Error Updating value', secondErr, key, value);
            }
        }
        self.newBufferedValues.delete(key);
    };
    this.onRefreshed = function(framework, results, onError, onSuccess) {
        if(self.MODULE_LOADING_STATE_DEBUGGING) {
            console.log('in onRefreshed');
        }
        self.newBufferedValues.forEach(handleNewBufferedValues);
        onSuccess();
    };
    this.onCloseDevice = function(framework, device, onError, onSuccess) {
        if(self.MODULE_LOADING_STATE_DEBUGGING) {
            console.log('in onCloseDevice');
        }
        framework.deleteSmartBindings(self.deviceBindings);
        onSuccess();
    };
    this.onUnloadModule = function(framework, onError, onSuccess) {
        if(self.MODULE_LOADING_STATE_DEBUGGING) {
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
