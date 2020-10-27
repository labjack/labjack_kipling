/* jshint undef: true, unused: true, undef: true */
/* global handlebars, console, q, static_files, dict, $, showAlert */
/**
 * Goals for the Device Info module.
 * This module displays basic device information about the Digit and T7 devices.
 *
 * @author Chris Johnson (LabJack Corp, 2014)
**/

console.log('Loaded Module');
const package_loader = global.lj_di_injector.get('package_loader');
const static_files = package_loader.getPackage('static_files');
var MODULE_UPDATE_PERIOD_MS = 1000;

/**
 * Module object that gets automatically instantiated & linked to the appropriate framework.
 * When using the 'singleDevice' framework it is instantiated as sdModule.
 */
function module() {
    this.MODULE_DEBUGGING = true;
    this.MODULE_LOADING_STATE_DEBUGGING = true;

    this.activeDevice = undefined;
    this.framework = undefined;
    this.startupData = {};
    this.moduleName = '';
    this.moduleContext = {};
    this.moduleConstants = {};
    this.periodicRegisters = {};
    this.templates = {};
    var savePeriodicRegisters = function(regInfo) {
        self.periodicRegisters[regInfo.name] = regInfo;
    };
    this.currentValues = dict();
    this.bufferedValues = dict();
    this.newBufferedValues = dict();

    this.viewGenerator = undefined;

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

    this.clickData = undefined;
    function startDownloadingFiles(data, onSuccess) {
        console.log('in startDownloadingFiles', data);
        self.clickData = data;
        onSuccess();
    }
    function openDownloadsDirectory(data, onSuccess) {
        console.log('in openDownloadsDirectory', data);
        self.clickData = data;
        onSuccess();
    }
    function editDownloadsDirectory(data, onSuccess) {
        console.log('in editDownloadsDirectory', data);
        self.clickData = data;
        onSuccess();
    }
    function navigateBackwards(data, onSuccess) {
        console.log('in navigateBackwards', data);
        self.clickData = data;
        onSuccess();
    }
    function refreshDirectoryListing(data, onSuccess) {
        console.log('in refreshDirectoryListing', data);
        self.clickData = data;
        onSuccess();
    }

    this.currentWorkingDirectory = '';

    this.templates = {};
    var compileTemplates = function(framework) {
        var templatesToCompile = [
            'download_controls_template',
            'browser_controls_template',
            'file_browser_template',
        ];
        templatesToCompile.forEach(function(templateName) {
            try {
                self.templates[templateName] = handlebars.compile(
                    framework.moduleData.htmlFiles[templateName]
                );
            } catch(err) {
                console.error('Error compiling templates', err);
            }
        });
    };

    /**
     * Function is called several times giving the module a chance to verify its
     * startupData.  Execute onError if it is not valid or onSuccess if it is
     * valid.
    **/
    this.verifyStartupData = function(framework, startupData, onError, onSuccess) {
        var missingData = [];
        try {
            // Initialize the boolean.
            var isStartupDataValid = false;

            // Indicate that it is valid.
            isStartupDataValid = true;

            if(isStartupDataValid) {
                onSuccess();
            } else {
                console.warn('Found bad data...', missingData);
                onError();
            }
        } catch(err) {
            console.error('Error in verifyStartupData', err);
            onError();
        }
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
        self.startupData = framework.startupData;
        self.moduleName = framework.moduleData.name;

        // Compile required template files
        compileTemplates(framework);

        // Update the tableManager's templates
        // self.tableManager.updateTemplates(self.templates);

        // Create the view generator
        self.viewGenerator = new createFileBrowserViewGenerator();

        // Share the compiled templates object with the view generator
        self.viewGenerator.saveTemplates(self.templates);

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
        // Code that allows device-specific register bindings
        var deviceTypeName = device.savedAttributes.deviceTypeName;
        if(self.moduleConstants[deviceTypeName]) {
            self.moduleConstants[deviceTypeName].forEach(addSmartBinding);
            self.moduleConstants[deviceTypeName].forEach(savePeriodicRegisters);
        }

        // Code that creates device agnostic register bindings
        if(self.moduleConstants.registerList) {
            self.moduleConstants.registerList.forEach(addSmartBinding);
            self.moduleConstants.registerList.forEach(savePeriodicRegisters);
        }

        // Save the smartBindings to the framework instance.
        framework.putSmartBindings(smartBindings);

        framework.setStartupMessage('Reading Device Info');
        onSuccess();
    };
    function getExtraOperation (device,operation,input) {
        if(input) {
            return device[operation](input);
        } else {
            return device[operation]();
        }
    }
    function getExtraOperationSaveOp(device, operation, input) {
        var defered = q.defer();
        function onSuccess(res) {
            var data = {'func': operation};
            Object.keys(res).forEach(function(key) {
                data[key] = res[key];
            });
            defered.resolve(data);
        }
        function onError(res) {
            var data = {'func': operation};
            Object.keys(res).forEach(function(key) {
                data[key] = res[key];
            });
            defered.resolve(data);
        }
        if(input) {
            device[operation](input).then(onSuccess, onError);
        } else {
            device[operation]().then(onSuccess, onError);
        }
        return defered.promise;
    }

    this.onDeviceConfigured = function(framework, device, setupBindings, onError, onSuccess) {
        if(self.MODULE_LOADING_STATE_DEBUGGING) {
            console.log('in onDeviceConfigured', device.savedAttributes);
        }
        var extraRegisters;
        var promises = [];
        var fileListingTemplate = self.templates.file_browser_template;


        function continueFramework (missingData) {
            console.log('Additional Collected Data', missingData);
            var compiledData = '';
            var keys;
            var context = {};
            var customContext = {
                'info': 'My Info',
                'device': device.savedAttributes,
            };
            try {
                // Combine the collected data and the saved device attributes
                keys = Object.keys(device.savedAttributes);
                keys.forEach(function(key) {
                    context[key] = device.savedAttributes[key];
                });
                keys = Object.keys(missingData);
                keys.forEach(function(key) {
                    context[key] = missingData[key];
                });
                console.log('Template Context', context);
                context.staticFiles = staticFilesDir;
                customContext.download_controls = self.viewGenerator.getDownloadControlsRaw(context);
                customContext.browser_controls = self.viewGenerator.getBrowserControlsRaw(context);
                customContext.file_browser = self.viewGenerator.getFileBrowserRaw(context);

            } catch(err) {
                console.error('Error compiling template', err);
            }

            self.viewGenerator.saveInitialContext(context);

            console.log('Compiled Data', compiledData);
            customContext.pageData = compiledData;
            framework.setCustomContext(customContext);
            console.log('Calling onSuccess');
            onSuccess();
        }

        if(device.savedAttributes.HARDWARE_INSTALLED.sdCard || true) {
            // Extra things that need to be done assuming that the device
            // has an installed sdCard.
            // Extra registers that need to be read
            extraRegisters = ['LUA_RUN'];
            promises.push(getExtraOperation(device, 'sReadMany', extraRegisters));
            promises.push(getExtraOperationSaveOp(device, 'getCWD'));
            promises.push(getExtraOperationSaveOp(device, 'getDiskInfo'));
            promises.push(getExtraOperationSaveOp(device, 'readdir'));
            promises.push(getExtraOperation(device,'getLatestDeviceErrors'));
        } else {
            // Extra things that need to be done assuming that the device
            // does not have an installed sdCard.
            extraRegisters = ['LUA_RUN'];
            promises.push(getExtraOperation(device, 'sReadMany', extraRegisters));
            promises.push(getExtraOperation(device,'getLatestDeviceErrors'));
        }

        console.log('Waiting for extra device data');
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
                    // If the result is a register result
                    if(value.name) {
                        data[value.name] = value;
                    } else if((typeof(value.numErrors) !== 'undefined') && (typeof(value.errors) !== 'undefined')) {
                        data.latestDeviceErrors = value;
                    } else if(value.func) {
                        data[value.func] = value;
                    }
                }
            });
            continueFramework(data);
        });
    };

    this.table = undefined;
    this.onTemplateLoaded = function(framework, onError, onSuccess) {
        if(self.MODULE_LOADING_STATE_DEBUGGING) {
            console.log('in onTemplateLoaded');
        }
        var tableElementStr = '#file_browser_table';
        // self.table = self.tableManager.createDataTable(tableElementStr);

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
                        console.warn('Un-saved key', key);
                        // if(key === 'WIFI_RSSI') {
                        //     var titleText = 'Signal Strength: ' + value.str;
                        //     var srcTxt = staticFilesDir + 'img/';
                        //     srcTxt += value.imageName + '.png';
                        //     element.attr('src', srcTxt);
                        //     element.attr('title', titleText);
                        // }
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
        if(self.MODULE_LOADING_STATE_DEBUGGING && false) {
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
        if(self.MODULE_LOADING_STATE_DEBUGGING && false) {
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
