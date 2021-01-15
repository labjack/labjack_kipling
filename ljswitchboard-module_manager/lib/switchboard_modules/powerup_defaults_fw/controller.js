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
const fs = require('fs');
const path = require('path');
const q = require('q');

/**
 * Module object that gets automatically instantiated & linked to the appropriate framework.
 * When using the 'singleDevice' framework it is instantiated as sdModule.
 */
function module() {
    
    var DEBUG_SELECT_DEFAULTS_SOURCE = false;
    var DEBUG_SELECT_FILE_TO_LOAD = false;
    var DEBUG_CONFIGURING_DEVICE_DEFAULTS = false;
    var DEGUB_BROWSE_FOR_OUTPUT_DIRECTORY = false;
    var DEBUG_SAVE_POWERUP_DEFAULTS_BTN_PRESS = false;
    var ENABLE_ERROR_OUTPUT = true;

    function getLogger(bool) {
        return function logger() {
            if(bool) {
                console.log.apply(console, arguments);
            }
        };
    }

    var debugSDS = getLogger(DEBUG_SELECT_DEFAULTS_SOURCE);
    var debugSFTL = getLogger(DEBUG_SELECT_FILE_TO_LOAD);
    var debugCDD = getLogger(DEBUG_CONFIGURING_DEVICE_DEFAULTS);
    var debugBFOD = getLogger(DEGUB_BROWSE_FOR_OUTPUT_DIRECTORY);
    var debugSPBTN = getLogger(DEBUG_SAVE_POWERUP_DEFAULTS_BTN_PRESS);
    var errorLog = getLogger(ENABLE_ERROR_OUTPUT);


    this.moduleConstants = {};
    this.framework = undefined;
    this.startupData = undefined;
    this.moduleName = '';
    this.moduleContext = {};
    this.activeDevice = undefined;


    var requiredStartupDataKeys = [
        'selected_config_file_directory',
        'selected_output_directory',
    ];
    this.verifyStartupData = function(framework, startupData, onError, onSuccess) {
        try {
            var isDataValid = true;
            var messages = [];

            requiredStartupDataKeys.forEach(function(requiredAttr) {
                if(typeof(startupData[requiredAttr]) === 'undefined') {
                    isDataValid = false;
                    messages.push('Missing a primary key: ' + requiredAttr);
                }
            });

            if(isDataValid) {
                onSuccess();
            } else {
                console.warn(
                    'Invalid startupData detected powerup_defaults_fw',
                    messages
                );
                onError();
            }
        } catch(err) {
            console.error('Error verifying startupData powerup_defaults_fw', err);
        }
    };

    /**
     * Function is called once every time the module tab is selected, loads the module.
     * @param  {[type]} framework   The active framework instance.
     * @param  {[type]} onError     Function to be called if an error occurs.
     * @param  {[type]} onSuccess   Function to be called when complete.
    **/
    this.onModuleLoaded = function(framework, onError, onSuccess) {
        self.startupData = framework.moduleData.startupData;
        if(self.startupData.selected_config_file_directory !== '') {
            self.selectedFileInfo.path = self.startupData.selected_config_file_directory;
        }
        if(self.startupData.selected_output_directory !== '') {
            self.selectedOutputDirInfo.path = self.startupData.selected_output_directory;
            self.selectedOutputDirInfo.exists = true;
        }
        self.moduleName = framework.moduleData.name;
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
        self.activeDevices = device;
        
        self.moduleContext.numDevices = self.activeDevices.length;
        self.moduleContext.isMultiple = (self.activeDevices.length > 1) && (self.activeDevices.length > 0);
        
        self.moduleContext.selected_config_file_directory = self.startupData.selected_config_file_directory;
        self.moduleContext.selected_output_directory = self.startupData.selected_output_directory;
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
        var silentError = true;
        // Load & Parse file if one is selected.
        self.loadParseAndDisplaySelectedCfgFile(silentError)
        .then(function() {
            // Regardless of what happens, update the selected device list.
            updateConfigDefaultsDeviceSelectionList()
            .then(function() {
                onSuccess();
            },function() {
                onSuccess();
            });
        })
        .catch(function() {
            // Regardless of what happens, update the selected device list.
            updateConfigDefaultsDeviceSelectionList()
            .then(function() {
                onSuccess();
            },function() {
                onSuccess();
            });
        });
    };


    

    this.getSelectedDefaultsSource = function() {
        var selectedoOption = $('#select-defaults-source .radio input:checked');
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
            var val = $(devsToCfgTable[i]).val();
            var sn;
            if(val.indexOf('_') >= 0) {
                sn = val.split('_')[2];
            } else {
                sn = val;
            }
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
    this.getOutputFileNameForDevice = function(deviceObj, numericalIncrement) {
        var savedAttributes = deviceObj.savedAttributes;
        var productType = savedAttributes.productType;
        var serialNumber = savedAttributes.serialNumber;
        var name = savedAttributes.DEVICE_NAME_DEFAULT;
        var timeStr = self.getDateStringForFileName();
        var fileName = [timeStr, productType, serialNumber, name].join('_');
        if(numericalIncrement) {
            fileName += '(' + numericalIncrement.toString() + ')';
        }
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
        'exists': false,
    };
    
    /* Functions for loading and checking a config file. */
    function loadSelectedConfigFile(bundle) {
        debugBFOD('in loadSelectedConfigFile');
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
								defered.reject(bundle);
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
        debugBFOD('in parseLoadedConfigFile');
        var defered = q.defer();
        if(!bundle.isError) {
            try {
                var requiredKeys = ['startupConfigsData'];
                var data = JSON.parse(self.selectedFileInfo.rawData);
                var keys = Object.keys(data);
                debugBFOD('File Data', data, keys);
                var isValid = true;
                var missingKeys = [];
                requiredKeys.forEach(function(requiredKey) {
                    if(keys.indexOf(requiredKey) < 0) {
                        isValid = false;
                        missingKeys.push(requiredKey);
                    }
                });

                if(isValid) {
                    self.selectedFileInfo.data = data.startupConfigsData;
                    data.startupConfigsData.forEach(function(configData) {
                        var type = configData.type;
                        var group = configData.group;
                        var data = configData.data;
                        if(group === 'RequiredInfo') {
                            data.forEach(function(regData) {
                                if(regData.reg === 'PRODUCT_ID') {
                                    var deviceTypeName = driver_const.DEVICE_TYPE_NAMES[regData.res];
                                    self.selectedFileInfo.targetDevice = deviceTypeName;
                                } else if (regData.reg === 'FIRMWARE_VERSION') {
                                    self.selectedFileInfo.targetFWVersion = regData.res;
                                }
                            });
                        }
                    });
                }
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
        debugBFOD('in displayLoadedConfigFile');
        var defered = q.defer();
        var fileInfoObj = $('.selected-file-details');
        var noCFGFileSelected = $('.no-config-file-selected');
        if(self.selectedFileInfo.isDataValid) {
            var fileNameObj = fileInfoObj.find('.file-name .selectableText');
            var productName = fileInfoObj.find('.product-name  .selectableText');
            var firmwareVersion = fileInfoObj.find('.fw-version .selectableText');

            var fileName = path.basename(sdModule.selectedFileInfo.path);
            fileNameObj.text(fileName);
            productName.text(self.selectedFileInfo.targetDevice);
            firmwareVersion.text(self.selectedFileInfo.targetFWVersion);

            fileInfoObj.slideDown();
            noCFGFileSelected.slideUp();
        } else {
            fileInfoObj.slideUp();
            noCFGFileSelected.slideDown();
        }
        defered.resolve(bundle);
        return defered.promise;
    }
    function updateConfigDefaultsDeviceSelectionList(bundle) {
        debugBFOD('in disableIncompatibleDevices');

        var deviceCheckBoxes = $('.configure-device-defaults-device-checkbox');
        var userWarningTextObj = $('.user-fw-warning-text');
        var num = deviceCheckBoxes.length;
        var i = 0;
        var selectedSource = self.getSelectedDefaultsSource();
        if(selectedSource === 'file') {
            var oneDeviceIsDisabled = false;
            for(i = 0; i < num; i++) {
                var deviceCheckBox = deviceCheckBoxes[i];
                var valText = deviceCheckBox.value;
                var infoArray = valText.split('_');
                var FW = infoArray[0];
                var dt = infoArray[1];

                var isEnabled = true;
                if(FW != self.selectedFileInfo.targetFWVersion) {
                    isEnabled = false;
                }
                if(dt !== self.selectedFileInfo.targetDevice) {
                    isEnabled = false;
                }
                if(!self.selectedFileInfo.isDataValid) {
                    isEnabled = false;
                }

                var fwText = $(deviceCheckBox.parentElement.parentElement.parentElement).find('.device-fw-version');
                if(isEnabled) {
                    deviceCheckBox.checked = true;
                    deviceCheckBox.disabled = false;
                    fwText.css('color','');
                } else {
                    deviceCheckBox.checked = false;
                    deviceCheckBox.disabled = true;
                    oneDeviceIsDisabled = true;
                    fwText.css('color','#c9302c');
                }
            }
            if(oneDeviceIsDisabled) {
                userWarningTextObj.css('color','#c9302c');
            } else {
                userWarningTextObj.css('color','');
            }
        } else if(selectedSource === 'current') {
            for(i = 0; i < num; i++) {
                var deviceCheckBox = deviceCheckBoxes[i];
                var fwText = $(deviceCheckBox.parentElement.parentElement.parentElement).find('.device-fw-version');
                fwText.css('color','');
                deviceCheckBox.checked = true;
                deviceCheckBox.disabled = false;
            }
            userWarningTextObj.css('color','');
        } else if(selectedSource === 'factory') {
            for(i = 0; i < num; i++) {
                var deviceCheckBox = deviceCheckBoxes[i];
                var fwText = $(deviceCheckBox.parentElement.parentElement.parentElement).find('.device-fw-version');
                fwText.css('color','');
                deviceCheckBox.checked = true;
                deviceCheckBox.disabled = false;
            }
            userWarningTextObj.css('color','');
        }
        var defered = q.defer();
        defered.resolve(bundle);
        return defered.promise;
    }
    function autoSelectApplicableDevices(bundle) {
        debugBFOD('in autoSelectApplicableDevices');
        var defered = q.defer();
        defered.resolve(bundle);
        return defered.promise;
    }
    function handleLoadCfgFileErrors(bundle) {
        var defered = q.defer();
        if(!bundle.silentError) {
            showAlert('Failed to load selected config file.  Please try again.');
        }
        errorLog('Failed to load cfg file. Error:', bundle);

        var fileInfoObj = $('.selected-file-details');
        fileInfoObj.slideUp();
        var noCFGFileSelected = $('.no-config-file-selected');
        noCFGFileSelected.slideDown();
        defered.resolve(bundle);
        return defered.promise;
    }
    this.loadParseAndDisplaySelectedCfgFile = function(silentError) {
        debugBFOD('in loadParseAndDisplaySelectedCfgFile');
        var bundle = {
            'silentError': silentError,
            'isError': false,
            'error': null,
            'errorStep': '',
        };
        return loadSelectedConfigFile(bundle)
        .then(parseLoadedConfigFile)
        .then(displayLoadedConfigFile)
        .then(updateConfigDefaultsDeviceSelectionList)
        // .then(autoSelectApplicableDevices)
        .catch(handleLoadCfgFileErrors);
    };

    var TARGET_REGISTER = {
        factory: 'IO_CONFIG_SET_DEFAULT_TO_FACTORY',
        current: 'IO_CONFIG_SET_DEFAULT_TO_CURRENT'
    };
    this.configureDeviceStrategies = {
        factory: function(operation) {
            var defered = q.defer();

            // Write a 1 to the appropriate register.
            operation.device.iWrite(TARGET_REGISTER.factory, 1)
            .then(function(res) {
                defered.resolve(operation);
            })
            .catch(function(err) {
                operation.isError = true;
                operation.error = err;
                operation.errorStep = 'configureDeviceStrategies-factory';
                defered.reject(operation);
            });
            return defered.promise;
        },
        current: function(operation) {
            var defered = q.defer();

            // Write a 1 to the appropriate register.
            operation.device.iWrite(TARGET_REGISTER.current, 1)
            .then(function(res) {
                defered.resolve(operation);
            })
            .catch(function(err) {
                operation.isError = true;
                operation.error = err;
                operation.errorStep = 'configureDeviceStrategies-current';
                defered.reject(operation);
            });
            return defered.promise;
        },
        file: function(operation) {
            var defered = q.defer();

            if(self.selectedFileInfo.isDataValid) {
                operation.device.writeConfigs(self.selectedFileInfo.data)
                .then(function(res) {
                    defered.resolve(operation);
                })
                .catch(function(err) {
                    operation.isError = true;
                    operation.error = err;
                    operation.errorStep = 'configureDeviceStrategies-file';
                    defered.reject(operation);
                });
            } else {
                defered.reject(operation);
            }
            // From test file: deviceB.writeConfigs(deviceConfigs)
            return defered.promise;
        },
    };
    this.getSelectedDefaultsSource = function() {
        return $('#select-defaults-source .radio input:checked').val();;
    };
    this.configureSelectedDevices = function() {
        var defered = q.defer();

        try {
        var configSelection = self.getSelectedDefaultsSource();

        var bundle = {
            'configSelection': configSelection,
            'operations': [],
            'isError': false,
            'error': null,
            'errorStep': '',
        }
        var devices = self.getSelectedDevicesToConfigure();
        if(devices.length === 0) {
            if(configSelection === 'file') {
                showAlert('No Devices Selected.  Please select a compatible device to configure. Double check the files intended firmware version.')
            } else {
                showAlert('No Devices Selected.  Please select a device to configure.');
            }
        }
        devices.forEach(function(device) {
            bundle.operations.push({
                'device': device,
                'isError': false,
                'error': null,
                'errorStep': '',
            });
        });

        async.each(
            bundle.operations,
            function(operation, cb) {
                debugCDD('Configuring Device:',operation.device.savedAttributes.serialNumber, configSelection);
                self.configureDeviceStrategies[configSelection](operation)
                .then(function(res) {
                    cb();
                })
                .catch(function(err) {
                    cb();
                })
            },
            function(err) {
                defered.resolve(bundle);
            }
        );
        } catch(err) {
            errorLog('in configureSelectedDevices', err);
            defered.resolve(bundle);
        }
        return defered.promise;
    };
    this.rebootDevicesSelectedToBeConfigured = function() {
        var defered = q.defer();
        var devices = self.getSelectedDevicesToConfigure();
        async.each(
            devices,
            function(device, cb) {
                device.write('SYSTEM_REBOOT', 0x4C4A0004)
                .then(function(res) {
                    cb();
                }, function(err) {
                    cb();
                });
            }, function(err) {
                defered.resolve();
            });
        return defered.promise;
    }

    /* Functions for downloading and saving configs */
    this.displaySelectedOutputDir = function() {
        var defered = q.defer();
        var directoryObject = $('#current-directory-display');
        var path = self.selectedOutputDirInfo.path;
        if(path === '') {
            path = 'No folder Selected. Please browse for an output directory.';
        } else {

        }
        directoryObject.text(path);
        defered.resolve();
        return defered.promise;
    };

    function verifyOutputDirectory(bundle) {
        debugSPBTN('in verifyOutputDirectory',bundle);
        var defered = q.defer();
        var path =self.selectedOutputDirInfo.path;
        if(path !== '') {
            fs.stat(path, function(err, stats) {
                if(stats.isDirectory()) {
                    self.selectedOutputDirInfo.exists = true;
                }
                defered.resolve(bundle);
            });
        } else {
            bundle.isError = true;
            bundle.error = 'No selected otuput directory';
            bundle.errorStep = 'verifyOutputDirectory';
            defered.reject(bundle);
        }
        return defered.promise;
    }
    function buildDownloadAndSaveConfigsOperationsList(bundle) {
        debugSPBTN('in buildDownloadAndSaveConfigsOperationsList',bundle);
        var defered = q.defer();

        var devices = self.getSelectedDevicesToBackup();
        var operations = [];
        devices.forEach(function(device) {
            var fileName = self.getOutputFileNameForDevice(device);
            var newFilePath = '';
            if(self.selectedOutputDirInfo.exists) {
                newFilePath = path.join(self.selectedOutputDirInfo.path, fileName);
                operations.push({
                    'device': device,
                    'baseFilePath': self.selectedOutputDirInfo.path,
                    'outputFilePath': newFilePath,
                    'configData': null,
                    'filePathNumInc': 0,
                    'isError': false,
                    'error': null,
                    'errorStep': '',
                });
            } else {

            }
        });
        debugSPBTN('Created Operations', operations.length, operations);
        bundle.operations = operations;
        defered.resolve(bundle);
        return defered.promise;
    }
    function downloadDeviceConfigsToBundle(bundle) {
        debugSPBTN('in downloadDeviceConfigsToBundle',bundle);
        var defered = q.defer();
        
        var operations = bundle.operations;
        async.each(
            operations,
            function(operation, cb) {
                var device = operation.device;
                device.readConfigs([
                    'StartupPowerSettings', 
                    'StartupSettings', 
                    'CommSettings', 
                    // 'SWDTSettings', 
                    'AIN_EF_Settings'
                ])
                .then(function(results) {
                    var configData = {'startupConfigsData': results};
                    try {
                        operation.configData = JSON.stringify(configData);
                    } catch(err) {
                        errorLog('Failed to download configs', err);
                        operation.isError = true;
                        operation.error = err;
                        operation.errorStep = 'parsingConfigData-in-downloadDeviceConfigsToBundle';
                    }
                    cb();
                }, function(err) {
                    errorLog('Failed to download configs', err);
                    operation.isError = true;
                    operation.error = err;
                    operation.errorStep = 'downloadDeviceConfigsToBundle';
                    cb();
                });
            },
            function(err) {
                defered.resolve(bundle);
            });
        return defered.promise;
    }
    function checkForFileConflects(operation) {
        debugSPBTN('in checkForFileConflects', operation.filePathNumInc);
        var defered = q.defer();

        var selectedOption = $('#prevent-file-overwriting-selector');
        var isChecked = selectedOption[0].checked;
        if(!isChecked) {
            var filePath = operation.outputFilePath;
            fs.stat(filePath, function(err, stats) {
                if(err) {
                    // Error getting file path, therefore file does not exist.
                    defered.resolve(operation);
                } else if(stats.isFile()) {
                    debugSPBTN('Iterating for a new file name');

                    // The file exists... choose a new name.
                    operation.filePathNumInc+=1;
                    var newName = self.getOutputFileNameForDevice(
                        operation.device,
                        operation.filePathNumInc
                    );
                    var newPath = path.join(operation.baseFilePath, newName);
                    operation.outputFilePath = newPath;
                    debugSPBTN('Checking a new name', operation.outputFilePath);
                    return checkForFileConflects(operation).then(defered.resolve);
                } else {
                    defered.resolve(operation);
                }
            });
        } else {
            defered.resolve(operation);
        }
        return defered.promise;
    }
    function saveDeviceDataToFile(operation) {
        debugSPBTN('in saveDeviceDataToFile');
        var defered = q.defer();

        var filePath = operation.outputFilePath;
        var data = operation.configData;

        fs.writeFile(filePath, data, function(err) {
            if(err) {
                fs.writeFile(filePath, data, function(err) {
                    if(err) {
                        fs.writeFile(filePath, data, function(err) {
                            if(err) {
                                errorLog('Error Writing File', err, filePath);
                                operation.isError = true;
                                operation.error = err;
                                operation.errorStep = 'saveDeviceDataToFile';
                                defered.resolve(operation);
                            } else {
                                defered.resolve(operation);
                            }
                        });
                    } else {
                        defered.resolve(operation);
                    }
                });
            } else {
                defered.resolve(operation);
            }
        });
        return defered.promise;
    }
    function saveConfigDataToFile(bundle) {
        var defered = q.defer();
        

        var operations = bundle.operations;
        async.each(
            operations,
            function(operation, cb) {
                checkForFileConflects(operation)
                .then(saveDeviceDataToFile)
                .then(function(operation) {
                    debugSPBTN('Finished Writing data to file', operation);
                    cb();
                })
                .catch(function(operation) {
                    errorLog('Error writing data to file', operation);
                    cb();
                });
            },
            function(err) {
                defered.resolve(bundle);
            });

        return defered.promise;
    }
    function handleDownloadAndSaveConfigsErrors(bundle) {
        var defered = q.defer();
        showAlert('Failed to save selected device configs to file.  Please try again.');
        errorLog('Failed to save selected device configs to file. Error:', bundle);
        defered.resolve(bundle);
        return defered.promise;
    }
    this.downloadAndSaveConfigsToFile = function() {
        debugSPBTN('in downloadAndSaveConfigsToFile');
        var bundle = {
            'operations': [],
            'isError': false,
            'error': null,
            'errorStep': '',
        };

        return verifyOutputDirectory(bundle)
        .then(buildDownloadAndSaveConfigsOperationsList)
        .then(downloadDeviceConfigsToBundle)
        .then(saveConfigDataToFile)
        .catch(handleDownloadAndSaveConfigsErrors);
    };

    this.clickHandlers = {
        selectDefaultsSource: function(guiObj) {
            var defered = q.defer();
            debugSDS('in selectDefaultsSource', guiObj);
            updateConfigDefaultsDeviceSelectionList()
            .then(function() {
                defered.resolve(guiObj);
            })
            return defered.promise;
        },
        browseForConfigFile: async function(guiObj) {
            var defered = q.defer();
            // console.log('In the browseForConfigFile click handler...');

            try {
                var options = {'filters':'.json'};
                if(self.selectedFileInfo.path !== '') {
                    options.workingDirectory = path.dirname(self.selectedFileInfo.path);
                }
                const fileLoc = await FILE_BROWSER.browseForFile(options);
                if (fileLoc) {
                    debugSFTL('We got a file path', fileLoc);
                    self.selectedFileInfo.path = fileLoc;
                    self.updateStartupData();
                    self.loadParseAndDisplaySelectedCfgFile()
                        .then(function handledFileSelection(bundle) {
                            debugSFTL('Selected a file!', bundle);
                            debugSFTL('Info...', self.selectedFileInfo);
                        });
                }

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
            debugCDD('In the configDefaults click handler...');
            // execute the "self.configureSelectedDevices" function.
            self.configureSelectedDevices()
            .then(function() {
                defered.resolve(guiObj);
            });
            return defered.promise;
        },
        rebootConfiguredDevices: function(guiObj) {
            var defered = q.defer();
            debugCDD('In the rebootConfiguredDevices click handler...');

            self.rebootDevicesSelectedToBeConfigured()
            .then(function() {
                showInfoMessage('Device(s) are rebooting, watch for them to disconnect and then get re-connected.')
                defered.resolve(guiObj);
            });
            return defered.promise;
        },
        browseForOutputDir: async function(guiObj) {
            var defered = q.defer();
            debugBFOD('In the browseForOutputDir click handler...');
            try {
                var options = {};
                if(self.selectedOutputDirInfo.path !== '') {
                    options.workingDirectory = self.selectedOutputDirInfo.path;
                }
                const fileLoc = await FILE_BROWSER.browseForFolder(options);
                if (fileLoc) {
                    debugBFOD('We got a folder path', fileLoc);
                    self.selectedOutputDirInfo.path = fileLoc;
                    self.updateStartupData();

                    self.displaySelectedOutputDir()
                        .then(function handledFileSelection(bundle) {
                            debugBFOD('Selected a folder!', bundle);
                            debugBFOD('Info...', self.selectedOutputDirInfo);
                        });
                }

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
            debugSPBTN('In the saveDefaults click handler...');
            self.downloadAndSaveConfigsToFile()
            .then(function handledFileSelection(bundle) {
                debugSPBTN('Saved Power-up defaults', bundle);
                defered.resolve(guiObj);
            });
            return defered.promise;
        }
    };


    this.guiControlIDs = {
        'selectDefaultsSource': {
            'type': 'optionSelect',
            'id':'#select-defaults-source',
            'clickSelector': '.radio input',
            'clickHandler': 'selectDefaultsSource',
            'rootSelectorObj': undefined,
            'selectedOption': '',
        },
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
        'rebootDevices': {
            'type': 'button',
            'id': '#perform-system-reboot-button',
            'indicator': null,
            'buttonObj': undefined,
            'clickHandler': 'rebootConfiguredDevices',
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
    function getSelectionOptionClickHandler(info) {
        function selectionOptionClickHandler(evt) {
            var clickHandlerName = info.clickHandler;
            var clickHandlerFunction = self.clickHandlers[clickHandlerName];
            if(typeof(clickHandlerFunction) === 'function') {
                // debugSDS('in selectionOptionClickHandler', evt.currentTarget.value)
                info.selectedOption = evt.currentTarget.value;
                clickHandlerFunction(info)
                .then(self.attachListener)
                .then(function(successData) {
                    // debugSDS('end of selectionOptionClickHandler', evt)
                }, function(errorData){
                    console.error('Error handling selectionOptionClick', info, errorData);
                });
            } else {
                console.error('No Click Handler Function', clickHandlerName, info);
            }
        }
        return selectionOptionClickHandler;
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
            } else if(type === 'optionSelect') {
                // clickSelector
                guiObj.rootSelectorObj = $(guiObj.id);
                clickHandlerFunc = getSelectionOptionClickHandler(guiObj);
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
        } else if(type === 'optionSelect') {
            clickHandlerFunc = getSelectionOptionClickHandler(guiObj);
            guiObj.rootSelectorObj.one('click', guiObj.clickSelector, clickHandlerFunc);
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
    this.updateStartupData = function() {
        try {
            if(self.selectedFileInfo.path !== '') {
                self.framework.startupData.selected_config_file_directory = self.selectedFileInfo.path;
            }
            if(self.selectedOutputDirInfo.path !== '') {
                self.framework.startupData.selected_output_directory = self.selectedOutputDirInfo.path;
            }
        } catch(err) {
            console.error('Error updateStartupData', err);
        }
    };
    this.onCloseDevice = function(framework, device, onError, onSuccess) {
        self.updateStartupData();
        var buttonEle = $('#configure-button');
        buttonEle.off('click');
        onSuccess();
    };
    this.onUnloadModule = function(framework, onError, onSuccess) {
        self.updateStartupData();
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
