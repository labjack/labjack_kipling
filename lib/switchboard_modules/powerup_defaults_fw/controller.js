/* jshint undef: true, unused: true, undef: true */
/* global console, module_manager, dict, q, showAlert, modbus_map, $ */
/* global ljmmm_parse, handlebars, FILE_BROWSER */

/* global dataTableCreator */
/* exported activeModule, module, MODULE_UPDATE_PERIOD_MS */

/**
 * Goals for the Register Matrix module:
**/

// Constant that determines device polling rate.  Use an increased rate to aid
// in user experience.
var MODULE_UPDATE_PERIOD_MS = 1000;
var fs = require('fs');

/**
 * Module object that gets automatically instantiated & linked to the appropriate framework.
 * When using the 'singleDevice' framework it is instantiated as sdModule.
 */
function module() {

    this.moduleConstants = {};

    this.startupData = {};
    this.moduleName = '';
    this.moduleContext = {};
    this.activeDevice = undefined;




    /**
     * Function is called once every time the module tab is selected, loads the module.
     * @param  {[type]} framework   The active framework instance.
     * @param  {[type]} onError     Function to be called if an error occurs.
     * @param  {[type]} onSuccess   Function to be called when complete.
    **/
    this.onModuleLoaded = function(framework, onError, onSuccess) {
        self.startupData = framework.moduleData.startupData;
        self.moduleName = framework.moduleData.name;

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
        self.activeDevices = device;
        
        self.moduleContext.numDevices = self.activeDevices.length;
        self.moduleContext.isMultiple = (self.activeDevices.length > 1) && (self.activeDevices.length > 0);
        
        framework.setCustomContext(self.moduleContext);
        framework.clearConfigBindings();
        framework.setStartupMessage('Reading Device Configuration');
        
        onSuccess();
    };


    this.onDeviceConfigured = function(framework, device, setupBindings, onError, onSuccess) {
        self.moduleContext.numDevices = self.activeDevices.length;
        self.moduleContext.isMultipleDevices = (self.activeDevices.length > 1) && (self.activeDevices.length > 0);
        
        framework.setCustomContext(self.moduleContext);
        // self.getRegistersToDisplay()
        // .then(self.getRegistersModbusInfo)
        // .then(self.cachedRegistersToDisplay)
        // .then(self.getInitialDeviceData)
        // .then(function(registers) {
        //     console.log('Registers to display:', registers);
        //     self.moduleContext = {
        //         'activeRegisters': self.getActiveRegistersData(registers)
        //     };
        //     framework.setCustomContext(self.moduleContext);
        //     onSuccess();
        // });
        // framework.setCustomContext(self.moduleContext);
        onSuccess();
    };

    this.onTemplateLoaded = function(framework, onError, onSuccess) {
        onSuccess();
    };


    var TARGET_REGISTER = {
        factory: 'IO_CONFIG_SET_DEFAULT_TO_FACTORY',
        current: 'IO_CONFIG_SET_DEFAULT_TO_CURRENT'
    };
    var configureDeviceStrategies = {
        factory: function(device) {
            // Write a 1 to the appropriate register.
            return device.iWrite(TARGET_REGISTER.factory, 1);
        },
        current: function(device) {
            // Write a 1 to the appropriate register.
            return device.iWrite(TARGET_REGISTER.current, 1);
        }
    };
    this.configureSelectedDevice = function(device) {
        try {
            var selectedOption = $('.radio input:checked');
            var selectedVal = selectedOption.val();
            return configureDeviceStrategies[selectedVal](device);
        } catch(err) {
            console.error('Error writing to device', err);
        }
    };
    this.configureSelectedDevices = function() {
        var defered = q.defer();
        var promises = self.activeDevices.map(self.configureSelectedDevice);
        q.allSettled(promises)
        .then(function() {
            defered.resolve();
        });
        return defered.promise;
    };
    
    
    /*
    this.configureDevice = function() {
        self.hideSaveButtons()
        .then(self.configureSelectedDevices)
        .then(self.showSaveButtons)
        .then(self.attachListener);
    };
    */

    this.getSelectedDefaultsSource = function() {
        var selectedoOption = $('.primary-step-content .radio input:checked');
        var selectedVal = selectedoOption.val();
        // selectedVal is either "current", "factory", or "file".
        return selectedVal;
    };

    function getSelectedDevicesFromTable(tableID) {
        var fullString = tableID + ' .checkbox :checked';
        var devsToCfgTable = $(fullString);

        var num = devsToCfgTable.length;
        var serialNumbers = [];
        for(var i = 0; i < num; i++) {
            var sn = $(devsToCfgTable[i]).val();
            serialNumbers.push(parseInt(sn));
        }
        
        var selectedDevices = [];
        self.activeDevices.forEach(function(activeDevice) {
            var sn = activeDevice.savedAttributes.serialNumber;
            if(serialNumbers.indexOf(sn) >= 0) {
                selectedDevices.push(activeDevice);
            }
        });

        return selectedDevices;
    }
    this.getSelectedDevicesToConfigure = function() {
        return getSelectedDevicesFromTable('#configure-defaults-device-selection-table');
    };

    this.getSelectedDevicesToBackup = function() {
        return getSelectedDevicesFromTable('#save-defaults-device-selection-table');
    };
    this.getDateStringForFileName = function() {
        var time = new Date();
        var year = time.getFullYear();
        var month = time.getMonth() +1;
        var day = time.getDate();
        var str = year.toString();
        str += '-' + month.toString();
        str += '-' + day.toString();
        return str;
    };
    this.getOutputFileNameForDevice = function(deviceObj) {
        var savedAttributes = deviceObj.savedAttributes;
        var productType = savedAttributes.productType;
        var serialNumber = savedAttributes.serialNumber;
        var name = savedAttributes.DEVICE_NAME_DEFAULT;
        var timeStr = self.getDateStringForFileName();
        var fileName = [timeStr, productType, serialNumber, name].join('_');
        fileName += '.json';
        return fileName;
    };

    this.selectedFileInfo = {
        'path': '',
        'targetDevice': '',
        'targetFWVersion': '',
        'rawData': '',
        'data': null,
        'isDataValid': false,
        'missingKeys': [],
    };


    this.selectedOutputDirInfo = {
        'path': '',
    };
    
    /* Functions for loading and checking a config file. */
    function loadSelectedConfigFile(bundle) {
        var defered = q.defer();

        var filePath = self.selectedFileInfo.path;
        fs.readFile(filePath, function(err, data) {
			if(err) {
				fs.readFile(filePath, function(err, data) {
					if(err) {
						fs.readFile(filePath, function(err, data) {
							if(err) {
								console.error('Error Reading File', err, filePath);
                                bundle.isError = true;
                                bundle.error = err;
                                bundle.errorStep = 'editOpenConfigFile';
								defered.resolve(bundle);
							} else {
                                self.selectedFileInfo.rawData = data;
								defered.resolve(bundle);
							}
						});
					} else {
                        self.selectedFileInfo.rawData = data;
						defered.resolve(bundle);
					}
				});
			} else {
                self.selectedFileInfo.rawData = data;
				defered.resolve(bundle);
			}
		});
        return defered.promise;
    }
    function parseLoadedConfigFile(bundle) {
        var defered = q.defer();
        if(!bundle.isError) {
            try {
                var requiredKeys = [];
                var data = JSON.parse(self.selectedFileInfo.rawData);
                var keys = Object.keys(data);
                var isValid = true;
                var missingKeys = [];
                requiredKeys.forEach(function(requiredKey) {
                    if(keys.indexOf(requiredKey) < 0) {
                        isValid = false;
                        missingKeys.push(requiredKey);
                    }
                });
                self.selectedFileInfo.isDataValid = isValid;
                self.selectedFileInfo.missingKeys = missingKeys;
            } catch(err) {
                bundle.isError = true;
                bundle.error = err;
                bundle.errorStep = 'parseLoadedConfigFile';
            }
        }
        defered.resolve(bundle);
        return defered.promise;
    }
    function displayLoadedConfigFile(bundle) {
        var defered = q.defer();
        defered.resolve(bundle);
        return defered.promise;
    }
    function autoSelectApplicableDevices(bundle) {
        var defered = q.defer();
        defered.resolve(bundle);
        return defered.promise;
    }
    function handleLoadCfgFileErrors(bundle) {
        var defered = q.defer();
        showAlert('Failed to load selected config file.  Please try again.');
        console.error('Failed to load cfg file. Error:', bundle);
        defered.resolve(bundle);
        return defered.promise;
    }
    this.loadParseAndDisplaySelectedCfgFile = function() {
        var bundle = {
            'isError': false,
            'error': null,
            'errorStep': '',
        };
        return loadSelectedConfigFile(bundle)
        .then(parseLoadedConfigFile)
        .then(displayLoadedConfigFile)
        .then(autoSelectApplicableDevices)
        .catch(handleLoadCfgFileErrors);
    };

    /* Functions for downloading and saving configs */
    this.displaySelectedOutputDir = function() {

    };

    this.clickHandlers = {
        browseForConfigFile: function(guiObj) {
            var defered = q.defer();
            // console.log('In the browseForConfigFile click handler...');

            try {
                var fileSelectedEventStr = FILE_BROWSER.eventList.FILE_SELECTED;
                FILE_BROWSER.removeAllListeners(fileSelectedEventStr);
                FILE_BROWSER.once(fileSelectedEventStr, function selectedFile(fileLoc) {
                    console.log('We got a file path', fileLoc);
                    self.selectedFileInfo.path = fileLoc;
                    self.loadParseAndDisplaySelectedCfgFile()
                    .then(function handledFileSelection(bundle) {
                        console.log('Selected a file!', bundle);
                        console.log('Info...', self.selectedFileInfo);
                    });
                });
                FILE_BROWSER.browseForFile({'filters':'.json'});

                // Do not wait for the file browser to return information to resolve
                // the promise b/c the cancel button can not be listened for.
                defered.resolve(guiObj);
            } catch(err) {
                console.error('Error loadingLuaFile', err);
                defered.resolve(guiObj);
            }
            return defered.promise;
        },
        configDefaults: function(guiObj) {
            var defered = q.defer();
            console.log('In the configDefaults click handler...');
            // execute the "self.configureSelectedDevices" function.
            defered.resolve(guiObj);
            return defered.promise;
        },
        browseForOutputDir: function(guiObj) {
            var defered = q.defer();
            console.log('In the browseForOutputDir click handler...');
            try {
                var fileSelectedEventStr = FILE_BROWSER.eventList.FILE_SELECTED;
                FILE_BROWSER.removeAllListeners(fileSelectedEventStr);
                FILE_BROWSER.once(fileSelectedEventStr, function selectedFolder(fileLoc) {
                    console.log('We got a folder path', fileLoc);
                    self.selectedOutputDirInfo.path = fileLoc;
                });
                FILE_BROWSER.browseForFolder();

                // Do not wait for the file browser to return information to resolve
                // the promise b/c the cancel button can not be listened for.
                defered.resolve(guiObj);
            } catch(err) {
                console.error('Error loadingLuaFile', err);
                defered.resolve(guiObj);
            }
            return defered.promise;
        },
        saveDefaults: function(guiObj) {
            var defered = q.defer();
            console.log('In the saveDefaults click handler...');
            defered.resolve(guiObj);
            return defered.promise;
        }
    };


    this.guiControlIDs = {
       'browseForConfigFile': {
            'type': 'button',
            'id': '#browse-for-config-file-button',
            'indicator': null,
            'buttonObj': undefined,
            'clickHandler': 'browseForConfigFile',
        },
        'deviceSelectionForPUConfig': {
            'type': 'deviceSelectionTable',
            'id': '#configure-defaults-device-selection-table',
        },
        'configurePowerupDefaults': {
            'type': 'reactiveButton',
            'id': '#configure-button',
            'indicator': '#saving-indicator',
            'buttonObj': undefined,
            'indicatorObj': undefined,
            'clickHandler': 'configDefaults',
        },
        'browseForOutputDir': {
            'type': 'button',
            'id': '#browse-for-output-directory-button',
            'indicator': null,
            'buttonObj': undefined,
            'clickHandler': 'browseForOutputDir',
        },
        'deviceSelectionForBackup': {
            'type': 'deviceSelectionTable',
            'id': '#save-defaults-device-selection-table',
        },
        'savePowerupDefaults': {
            'type': 'reactiveButton',
            'id': '#save-defaults-button',
            'indicator': '#saving-to-file-indicator',
            'buttonObj': undefined,
            'indicatorObj': undefined,
            'clickHandler': 'saveDefaults',
        },
    };

    this.hideSaveButtons = function(guiObj) {
        var defered = q.defer();

        // Hide the guiObj button
        guiObj.buttonObj.slideUp();

        // show the guiObj indicator
        guiObj.indicatorObj.slideDown();
        
        defered.resolve(guiObj);
        return defered.promise;
    };
    this.showSaveButtons = function(guiObj) {
        var defered = q.defer();

        //Hide the guiObj indicator
        guiObj.indicatorObj.slideUp();

        // Show the guiObj button
        guiObj.buttonObj.slideDown();

        defered.resolve(guiObj);
        return defered.promise;
    };

    function getReactiveButtonClickHandler(info) {
        function reactiveButtonClickHandler() {
            var clickHandlerName = info.clickHandler;
            var clickHandlerFunction = self.clickHandlers[clickHandlerName];
            if(typeof(clickHandlerFunction) === 'function') {
                self.hideSaveButtons(info)
                .then(clickHandlerFunction)
                .then(self.showSaveButtons)
                .then(self.attachListener)
                .then(function(successData) {
                    // Do something w/ successData...
                }, function(errorData) {
                    console.error('Error handling reactiveButton', info, errorData);
                });
            } else {
                console.error('No Click Handler Function', clickHandlerName, info);
            }
        }
        return reactiveButtonClickHandler;
    }
    function getBasicButtonClickHandler(info) {
        function basicButtonClickHandler() {
            var clickHandlerName = info.clickHandler;
            var clickHandlerFunction = self.clickHandlers[clickHandlerName];
            if(typeof(clickHandlerFunction) === 'function') {
                clickHandlerFunction(info)
                .then(self.attachListener)
                .then(function(successData) {
                    // Do something w/ successData...
                }, function(errorData) {
                    console.error('Error handling basicButton', info, errorData);
                });
            } else {
                console.error('No Click Handler Function', clickHandlerName, info);
            }
        }
        return basicButtonClickHandler;
    }

    this.generateGUIObjects = function() {
        var guiKeys = Object.keys(self.guiControlIDs);
        guiKeys.forEach(function(guiKey) {
            var guiObj = self.guiControlIDs[guiKey];
            var type = guiObj.type;
            var clickHandlerFunc;

            if(type === 'button') {
                guiObj.buttonObj = $(guiObj.id);
                clickHandlerFunc = getBasicButtonClickHandler(guiObj);

            } else if(type === 'reactiveButton') {
                guiObj.buttonObj = $(guiObj.id);
                guiObj.indicatorObj = $(guiObj.indicator);
                clickHandlerFunc = getReactiveButtonClickHandler(guiObj);
                
            } else if(type === 'deviceSelectionTable') {
                // Not sure if this is needed...
            }
        });
    };

    this.attachListener = function(guiObj) {
        var defered = q.defer();

        var type = guiObj.type;
        var clickHandlerFunc;

        if(type === 'button') {
            clickHandlerFunc = getBasicButtonClickHandler(guiObj);
            guiObj.buttonObj.one('click', clickHandlerFunc);
        } else if(type === 'reactiveButton') {
            clickHandlerFunc = getReactiveButtonClickHandler(guiObj);
            guiObj.buttonObj.one('click', clickHandlerFunc);
        }
        defered.resolve(guiObj);
        return defered.promise;
    };

    this.attachListeners = function() {
        var defered = q.defer();
        var promises = [];

        var guiKeys = Object.keys(self.guiControlIDs);
        guiKeys.forEach(function(guiKey) {
            var guiObj = self.guiControlIDs[guiKey];
            promises.push(self.attachListener(guiObj));
        });
        q.allSettled(promises)
        .then(defered.resolve, defered.reject);
        return defered.promise;
    };

    /**
     * Function that gets executed after the module's template is displayed.
     * @param  {object} framework framework object.
     * @param  {function} onError   function to be called on error.
     * @param  {function} onSuccess function to be called on success
     * @return {[type]}           [description]
     */
    this.onTemplateDisplayed = function(framework, onError, onSuccess) {
        // Finish populating the guiControlIDs object.
        self.generateGUIObjects();

        self.attachListeners()
        .then(onSuccess, onError);
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
        var buttonEle = $('#configure-button');
        buttonEle.off('click');
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
