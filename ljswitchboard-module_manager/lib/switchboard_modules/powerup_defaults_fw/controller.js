/* jshint undef: true, unused: true, undef: true */
/* global console, showAlert, $ */
/* global FILE_BROWSER */

/* exported activeModule, module, MODULE_UPDATE_PERIOD_MS */

/**
 * Goals for the Register Matrix module:
**/

// Constant that determines device polling rate.  Use an increased rate to aid
// in user experience.
const fs = require('fs');
const path = require('path');
const async = require('async');
const driver_const = require('ljswitchboard-ljm_driver_constants');

/**
 * Module object that gets automatically instantiated & linked to the appropriate framework.
 * When using the 'singleDevice' framework it is instantiated as sdModule.
 */
function module() {
    
    const DEBUG_SELECT_DEFAULTS_SOURCE = false;
    const DEBUG_SELECT_FILE_TO_LOAD = false;
    const DEBUG_CONFIGURING_DEVICE_DEFAULTS = false;
    const DEGUB_BROWSE_FOR_OUTPUT_DIRECTORY = false;
    const DEBUG_SAVE_POWERUP_DEFAULTS_BTN_PRESS = false;
    const ENABLE_ERROR_OUTPUT = true;

    function getLogger(bool) {
        return function logger() {
            if (bool) {
                console.log.apply(console, arguments);
            }
        };
    }

    const debugSDS = getLogger(DEBUG_SELECT_DEFAULTS_SOURCE);
    const debugSFTL = getLogger(DEBUG_SELECT_FILE_TO_LOAD);
    const debugCDD = getLogger(DEBUG_CONFIGURING_DEVICE_DEFAULTS);
    const debugBFOD = getLogger(DEGUB_BROWSE_FOR_OUTPUT_DIRECTORY);
    const debugSPBTN = getLogger(DEBUG_SAVE_POWERUP_DEFAULTS_BTN_PRESS);
    const errorLog = getLogger(ENABLE_ERROR_OUTPUT);

    this.moduleConstants = {};
    this.framework = undefined;
    this.startupData = undefined;
    this.moduleName = '';
    this.moduleContext = {};
    this.activeDevice = undefined;

    const requiredStartupDataKeys = [
        'selected_config_file_directory',
        'selected_output_directory',
    ];
    this.verifyStartupData = function(framework, startupData, onError, onSuccess) {
        try {
            let isDataValid = true;
            const messages = [];

            requiredStartupDataKeys.forEach(function(requiredAttr) {
                if (typeof(startupData[requiredAttr]) === 'undefined') {
                    isDataValid = false;
                    messages.push('Missing a primary key: ' + requiredAttr);
                }
            });

            if (isDataValid) {
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
        if (self.startupData.selected_config_file_directory !== '') {
            self.selectedFileInfo.path = self.startupData.selected_config_file_directory;
        }
        if (self.startupData.selected_output_directory !== '') {
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
        const silentError = true;
        // Load & Parse file if one is selected.
        self.loadParseAndDisplaySelectedCfgFile(silentError)
        .then(() => {
            // Regardless of what happens, update the selected device list.
            updateConfigDefaultsDeviceSelectionList()
            .then(() => {
                onSuccess();
            }, () => {
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
        const selectedOption = $('#select-defaults-source .radio input:checked');
        // selectedVal is either "current", "factory", or "file".
        return selectedOption.val();
    };

    function getSelectedDevicesFromTable(tableID) {
        const fullString = tableID + ' .checkbox :checked';
        const devsToCfgTable = $(fullString);

        const num = devsToCfgTable.length;
        const serialNumbers = [];
        for (let i = 0; i < num; i++) {
            const val = $(devsToCfgTable[i]).val();
            let sn;
            if (val.indexOf('_') >= 0) {
                sn = val.split('_')[2];
            } else {
                sn = val;
            }
            serialNumbers.push(parseInt(sn));
        }
        
        const selectedDevices = [];
        self.activeDevices.forEach((activeDevice) => {
            const sn = activeDevice.savedAttributes.serialNumber;
            if (serialNumbers.indexOf(sn) >= 0) {
                selectedDevices.push(activeDevice);
            }
        });

        return selectedDevices;
    }
    this.getSelectedDevicesToConfigure = () => {
        return getSelectedDevicesFromTable('#configure-defaults-device-selection-table');
    };

    this.getSelectedDevicesToBackup = () => {
        return getSelectedDevicesFromTable('#save-defaults-device-selection-table');
    };
    this.getDateStringForFileName = () => {
        const time = new Date();
        const year = time.getFullYear();
        const month = time.getMonth() +1;
        const day = time.getDate();
        return year.toString() + '-' + month.toString() + '-' + day.toString();
    };
    this.getOutputFileNameForDevice = (deviceObj, numericalIncrement) => {
        const savedAttributes = deviceObj.savedAttributes;
        const productType = savedAttributes.productType;
        const serialNumber = savedAttributes.serialNumber;
        const name = savedAttributes.DEVICE_NAME_DEFAULT;
        const timeStr = self.getDateStringForFileName();
        let fileName = [timeStr, productType, serialNumber, name].join('_');
        if (numericalIncrement) {
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
        return new Promise((resolve, reject) => {
            const filePath = self.selectedFileInfo.path;
            fs.readFile(filePath, (err, data) => {
                if (err) {
                    fs.readFile(filePath, (err, data) => {
                        if (err) {
                            fs.readFile(filePath, (err, data) => {
                                if (err) {
                                    console.error('Error Reading File', err, filePath);
                                    bundle.isError = true;
                                    bundle.error = err;
                                    bundle.errorStep = 'editOpenConfigFile';
                                    reject(bundle);
                                } else {
                                    self.selectedFileInfo.rawData = data;
                                    resolve(bundle);
                                }
                            });
                        } else {
                            self.selectedFileInfo.rawData = data;
                            resolve(bundle);
                        }
                    });
                } else {
                    self.selectedFileInfo.rawData = data;
                    resolve(bundle);
                }
            });
        });
    }
    function parseLoadedConfigFile(bundle) {
        debugBFOD('in parseLoadedConfigFile');
        if (!bundle.isError) {
            try {
                const requiredKeys = ['startupConfigsData'];
                const data = JSON.parse(self.selectedFileInfo.rawData);
                const keys = Object.keys(data);
                debugBFOD('File Data', data, keys);
                let isValid = true;
                const missingKeys = [];
                requiredKeys.forEach(function(requiredKey) {
                    if (keys.indexOf(requiredKey) < 0) {
                        isValid = false;
                        missingKeys.push(requiredKey);
                    }
                });

                if (isValid) {
                    self.selectedFileInfo.data = data.startupConfigsData;
                    data.startupConfigsData.forEach(function(configData) {
                        const group = configData.group;
                        const data = configData.data;
                        if (group === 'RequiredInfo') {
                            data.forEach(function(regData) {
                                if (regData.reg === 'PRODUCT_ID') {
                                    const deviceTypeName = driver_const.DEVICE_TYPE_NAMES[regData.res];
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
        return Promise.resolve(bundle);
    }
    function displayLoadedConfigFile(bundle) {
        debugBFOD('in displayLoadedConfigFile');
        const fileInfoObj = $('.selected-file-details');
        const noCFGFileSelected = $('.no-config-file-selected');
        if (self.selectedFileInfo.isDataValid) {
            const fileNameObj = fileInfoObj.find('.file-name .selectableText');
            const productName = fileInfoObj.find('.product-name  .selectableText');
            const firmwareVersion = fileInfoObj.find('.fw-version .selectableText');

            const fileName = path.basename(global.sdModule.selectedFileInfo.path);
            fileNameObj.text(fileName);
            productName.text(self.selectedFileInfo.targetDevice);
            firmwareVersion.text(self.selectedFileInfo.targetFWVersion);

            fileInfoObj.slideDown();
            noCFGFileSelected.slideUp();
        } else {
            fileInfoObj.slideUp();
            noCFGFileSelected.slideDown();
        }
        return Promise.resolve(bundle);
    }
    function updateConfigDefaultsDeviceSelectionList(bundle) {
        debugBFOD('in disableIncompatibleDevices');

        const deviceCheckBoxes = $('.configure-device-defaults-device-checkbox');
        const userWarningTextObj = $('.user-fw-warning-text');
        const num = deviceCheckBoxes.length;
        const selectedSource = self.getSelectedDefaultsSource();
        if (selectedSource === 'file') {
            let oneDeviceIsDisabled = false;
            for (let i = 0; i < num; i++) {
                const deviceCheckBox = deviceCheckBoxes[i];
                const valText = deviceCheckBox.value;
                const infoArray = valText.split('_');
                const FW = infoArray[0];
                const dt = infoArray[1];

                let isEnabled = true;
                if (FW != self.selectedFileInfo.targetFWVersion) {
                    isEnabled = false;
                }
                if (dt !== self.selectedFileInfo.targetDevice) {
                    isEnabled = false;
                }
                if (!self.selectedFileInfo.isDataValid) {
                    isEnabled = false;
                }

                const fwText = $(deviceCheckBox.parentElement.parentElement.parentElement).find('.device-fw-version');
                if (isEnabled) {
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
            if (oneDeviceIsDisabled) {
                userWarningTextObj.css('color','#c9302c');
            } else {
                userWarningTextObj.css('color','');
            }
        } else if (selectedSource === 'current') {
            for (let i = 0; i < num; i++) {
                const deviceCheckBox = deviceCheckBoxes[i];
                const fwText = $(deviceCheckBox.parentElement.parentElement.parentElement).find('.device-fw-version');
                fwText.css('color','');
                deviceCheckBox.checked = true;
                deviceCheckBox.disabled = false;
            }
            userWarningTextObj.css('color','');
        } else if (selectedSource === 'factory') {
            for (let i = 0; i < num; i++) {
                const deviceCheckBox = deviceCheckBoxes[i];
                const fwText = $(deviceCheckBox.parentElement.parentElement.parentElement).find('.device-fw-version');
                fwText.css('color','');
                deviceCheckBox.checked = true;
                deviceCheckBox.disabled = false;
            }
            userWarningTextObj.css('color','');
        }
        return Promise.resolve(bundle);
    }
    // function autoSelectApplicableDevices(bundle) {
    //     debugBFOD('in autoSelectApplicableDevices');
    //     return Promise.resolve(bundle);
    // }
    function handleLoadCfgFileErrors(bundle) {
        if (!bundle.silentError) {
            showAlert('Failed to load selected config file.  Please try again.');
        }
        errorLog('Failed to load cfg file. Error:', bundle);

        $('.selected-file-details').slideUp();
        $('.no-config-file-selected').slideDown();
        return Promise.resolve(bundle);
    }
    this.loadParseAndDisplaySelectedCfgFile = function(silentError) {
        debugBFOD('in loadParseAndDisplaySelectedCfgFile');
        const bundle = {
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

    const TARGET_REGISTER = {
        factory: 'IO_CONFIG_SET_DEFAULT_TO_FACTORY',
        current: 'IO_CONFIG_SET_DEFAULT_TO_CURRENT'
    };
    this.configureDeviceStrategies = {
        factory: function(operation) {
            return new Promise((resolve, reject) => {
                // Write a 1 to the appropriate register.
                operation.device.iWrite(TARGET_REGISTER.factory, 1)
                    .then(() => {
                        resolve(operation);
                    })
                    .catch((err) => {
                        operation.isError = true;
                        operation.error = err;
                        operation.errorStep = 'configureDeviceStrategies-factory';
                        reject(operation);
                    });
            });
        },
        current: function(operation) {
            return new Promise((resolve, reject) => {

                // Write a 1 to the appropriate register.
                operation.device.iWrite(TARGET_REGISTER.current, 1)
                    .then(() => {
                        resolve(operation);
                    })
                    .catch((err) => {
                        operation.isError = true;
                        operation.error = err;
                        operation.errorStep = 'configureDeviceStrategies-current';
                        reject(operation);
                    });
            });
        },
        file: (operation) => {
            return new Promise((resolve, reject) => {

                if (self.selectedFileInfo.isDataValid) {
                    operation.device.writeConfigs(self.selectedFileInfo.data)
                        .then(() => {
                            resolve(operation);
                        })
                        .catch((err) => {
                            operation.isError = true;
                            operation.error = err;
                            operation.errorStep = 'configureDeviceStrategies-file';
                            reject(operation);
                        });
                } else {
                    reject(operation);
                }
                // From test file: deviceB.writeConfigs(deviceConfigs)
            });
        },
    };
    this.getSelectedDefaultsSource = () => {
        return $('#select-defaults-source .radio input:checked').val();
    };
    this.configureSelectedDevices = async () => {
        try {
            const configSelection = self.getSelectedDefaultsSource();

            const bundle = {
                'configSelection': configSelection,
                'operations': [],
                'isError': false,
                'error': null,
                'errorStep': '',
            };
            const devices = self.getSelectedDevicesToConfigure();
            if (devices.length === 0) {
                if (configSelection === 'file') {
                    showAlert('No Devices Selected.  Please select a compatible device to configure. Double check the files intended firmware version.');
                } else {
                    showAlert('No Devices Selected.  Please select a device to configure.');
                }
            }
            devices.forEach(function (device) {
                bundle.operations.push({
                    'device': device,
                    'isError': false,
                    'error': null,
                    'errorStep': '',
                });
            });

            await new Promise(resolve => {
                async.each(
                    bundle.operations,
                    function (operation, cb) {
                        debugCDD('Configuring Device:', operation.device.savedAttributes.serialNumber, configSelection);
                        self.configureDeviceStrategies[configSelection](operation)
                            .then(() => {
                                cb();
                            })
                            .catch(() => {
                                cb();
                            });
                    },
                    () => {
                        resolve();
                    }
                );
            });
        } catch (err) {
            errorLog('in configureSelectedDevices', err);
        }
    };

    this.rebootDevicesSelectedToBeConfigured = function() {
        return new Promise(resolve => {
            const devices = self.getSelectedDevicesToConfigure();
            async.each(
                devices,
                function (device, cb) {
                    device.write('SYSTEM_REBOOT', 0x4C4A0004)
                        .then(() => {
                            cb();
                        }, () => {
                            cb();
                        });
                }, () => {
                    resolve();
                });
        });
    };

    /* Functions for downloading and saving configs */
    this.displaySelectedOutputDir = function() {
        const directoryObject = $('#current-directory-display');
        const path = self.selectedOutputDirInfo.path || 'No folder Selected. Please browse for an output directory.';
        directoryObject.text(path);
        return Promise.resolve();
    };

    function verifyOutputDirectory(bundle) {
        debugSPBTN('in verifyOutputDirectory', bundle);
        return new Promise((resolve, reject) => {
            const path = self.selectedOutputDirInfo.path;
            if (path !== '') {
                fs.stat(path, (err, stats) => {
                    if (stats.isDirectory()) {
                        self.selectedOutputDirInfo.exists = true;
                    }
                    resolve();
                });
            } else {
                bundle.isError = true;
                bundle.error = 'No selected output directory';
                bundle.errorStep = 'verifyOutputDirectory';
                reject(new Error('No selected output directory'));
            }
        });
    }
    async function buildDownloadAndSaveConfigsOperationsList(bundle) {
        debugSPBTN('in buildDownloadAndSaveConfigsOperationsList',bundle);

        const devices = self.getSelectedDevicesToBackup();
        const operations = [];
        devices.forEach(function(device) {
            const fileName = self.getOutputFileNameForDevice(device);
            if (self.selectedOutputDirInfo.exists) {
                const newFilePath = path.join(self.selectedOutputDirInfo.path, fileName);
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
            }
        });
        debugSPBTN('Created Operations', operations.length, operations);
        bundle.operations = operations;
    }
    function downloadDeviceConfigsToBundle(bundle) {
        debugSPBTN('in downloadDeviceConfigsToBundle',bundle);
        return new Promise((resolve) => {

            const operations = bundle.operations;
            async.each(
                operations,
                (operation, cb) => {
                    const device = operation.device;
                    device.readConfigs([
                        'StartupPowerSettings',
                        'StartupSettings',
                        'CommSettings',
                        // 'SWDTSettings',
                        'AIN_EF_Settings'
                    ])
                        .then((results) => {
                            const configData = {'startupConfigsData': results};
                            try {
                                operation.configData = JSON.stringify(configData);
                            } catch (err) {
                                errorLog('Failed to download configs', err);
                                operation.isError = true;
                                operation.error = err;
                                operation.errorStep = 'parsingConfigData-in-downloadDeviceConfigsToBundle';
                            }
                            cb();
                        }, function (err) {
                            errorLog('Failed to download configs', err);
                            operation.isError = true;
                            operation.error = err;
                            operation.errorStep = 'downloadDeviceConfigsToBundle';
                            cb();
                        });
                },
                () => {
                    resolve(bundle);
                });
        });
    }
    function checkForFileConflects(operation) {
        debugSPBTN('in checkForFileConflects', operation.filePathNumInc);
        return new Promise(resolve => {
            const selectedOption = $('#prevent-file-overwriting-selector');
            const isChecked = selectedOption[0].checked;
            if (!isChecked) {
                const filePath = operation.outputFilePath;
                fs.stat(filePath, function(err, stats) {
                    if (err) {
                        // Error getting file path, therefore file does not exist.
                        resolve(operation);
                    } else if (stats.isFile()) {
                        debugSPBTN('Iterating for a new file name');

                        // The file exists... choose a new name.
                        operation.filePathNumInc+=1;
                        const newName = self.getOutputFileNameForDevice(
                            operation.device,
                            operation.filePathNumInc
                        );
                        operation.outputFilePath = path.join(operation.baseFilePath, newName);
                        debugSPBTN('Checking a new name', operation.outputFilePath);
                        return checkForFileConflects(operation).then(resolve);
                    } else {
                        resolve(operation);
                    }
                });
            } else {
                resolve(operation);
            }
        });
    }
    function saveDeviceDataToFile(operation) {
        debugSPBTN('in saveDeviceDataToFile');
        return new Promise((resolve) => {
            const filePath = operation.outputFilePath;
            const data = operation.configData;

            fs.writeFile(filePath, data, function (err) {
                if (err) {
                    fs.writeFile(filePath, data, function (err) {
                        if (err) {
                            fs.writeFile(filePath, data, function (err) {
                                if (err) {
                                    errorLog('Error Writing File', err, filePath);
                                    operation.isError = true;
                                    operation.error = err;
                                    operation.errorStep = 'saveDeviceDataToFile';
                                    resolve(operation);
                                } else {
                                    resolve(operation);
                                }
                            });
                        } else {
                            resolve(operation);
                        }
                    });
                } else {
                    resolve(operation);
                }
            });
        });
    }
    function saveConfigDataToFile(bundle) {
        return new Promise((resolve) => {
            const operations = bundle.operations;
            async.each(
                operations,
                (operation, cb) => {
                    checkForFileConflects(operation)
                        .then(saveDeviceDataToFile)
                        .then((operation) => {
                            debugSPBTN('Finished Writing data to file', operation);
                            cb();
                        })
                        .catch((operation) => {
                            errorLog('Error writing data to file', operation);
                            cb();
                        });
                },
                () => {
                    resolve(bundle);
                });
        });
    }
    this.downloadAndSaveConfigsToFile = async () => {
        debugSPBTN('in downloadAndSaveConfigsToFile');
        const bundle = {
            'operations': [],
            'isError': false,
            'error': null,
            'errorStep': '',
        };

        try {
            await verifyOutputDirectory(bundle);
            await buildDownloadAndSaveConfigsOperationsList(bundle);
            await downloadDeviceConfigsToBundle(bundle);
            await saveConfigDataToFile(bundle);
        } catch (err) {
            showAlert('Failed to save selected device configs to file. Please try again.');
            console.error(err, bundle);
        }

        return bundle;
    };

    this.clickHandlers = {
        selectDefaultsSource: async (guiObj) => {
            debugSDS('in selectDefaultsSource', guiObj);

            await updateConfigDefaultsDeviceSelectionList();
            return guiObj;
        },
        browseForConfigFile: async (guiObj) => {
            // console.log('In the browseForConfigFile click handler...');

            try {
                const options = {'filters': 'json'};
                if (self.selectedFileInfo.path !== '') {
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
            } catch (err) {
                console.error('Error loadingLuaFile', err);
            }

            return guiObj;
        },
        configDefaults: async (guiObj) => {
            debugCDD('In the configDefaults click handler...');
            // execute the "self.configureSelectedDevices" function.
            await self.configureSelectedDevices();
            return guiObj;
        },
        rebootConfiguredDevices: async (guiObj) => {
            debugCDD('In the rebootConfiguredDevices click handler...');

            await self.rebootDevicesSelectedToBeConfigured();
            global.showInfoMessage('Device(s) are rebooting, watch for them to disconnect and then get re-connected.');
            return guiObj;
        },
        browseForOutputDir: async (guiObj) => {
            debugBFOD('In the browseForOutputDir click handler...');
            try {
                const options = {};
                if (self.selectedOutputDirInfo.path !== '') {
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
            } catch (err) {
                console.error('Error loadingLuaFile', err);
            }
            return guiObj;
        },
        saveDefaults: async (guiObj) => {
            debugSPBTN('In the saveDefaults click handler...');
            const bundle = await self.downloadAndSaveConfigsToFile();
            debugSPBTN('Saved Power-up defaults', bundle);
            return guiObj;
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

        // Hide the guiObj button
        guiObj.buttonObj.slideUp();

        // show the guiObj indicator
        guiObj.indicatorObj.slideDown();
        
        return Promise.resolve(guiObj);
    };
    this.showSaveButtons = function(guiObj) {
        //Hide the guiObj indicator
        guiObj.indicatorObj.slideUp();

        // Show the guiObj button
        guiObj.buttonObj.slideDown();

        return Promise.resolve(guiObj);
    };

    function getReactiveButtonClickHandler(info) {
        function reactiveButtonClickHandler() {
            const clickHandlerName = info.clickHandler;
            const clickHandlerFunction = self.clickHandlers[clickHandlerName];
            if (typeof(clickHandlerFunction) === 'function') {
                self.hideSaveButtons(info)
                .then(clickHandlerFunction)
                .then(self.showSaveButtons)
                .then(self.attachListener)
                .then(() => {
                    // Do something w/ successData...
                }, (errorData) => {
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
            const clickHandlerName = info.clickHandler;
            const clickHandlerFunction = self.clickHandlers[clickHandlerName];
            if (typeof(clickHandlerFunction) === 'function') {
                clickHandlerFunction(info)
                .then(self.attachListener)
                .then(() => {
                    // Do something w/ successData...
                }, (errorData) => {
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
            const clickHandlerName = info.clickHandler;
            const clickHandlerFunction = self.clickHandlers[clickHandlerName];
            if (typeof(clickHandlerFunction) === 'function') {
                // debugSDS('in selectionOptionClickHandler', evt.currentTarget.value)
                info.selectedOption = evt.currentTarget.value;
                clickHandlerFunction(info)
                .then(self.attachListener)
                .then(() => {
                    // debugSDS('end of selectionOptionClickHandler', evt)
                }, (errorData) => {
                    console.error('Error handling selectionOptionClick', info, errorData);
                });
            } else {
                console.error('No Click Handler Function', clickHandlerName, info);
            }
        }
        return selectionOptionClickHandler;
    }

    this.generateGUIObjects = function() {
        const guiKeys = Object.keys(self.guiControlIDs);
        guiKeys.forEach(function(guiKey) {
            const guiObj = self.guiControlIDs[guiKey];
            const type = guiObj.type;
            let clickHandlerFunc;

            if (type === 'button') {
                guiObj.buttonObj = $(guiObj.id);
                clickHandlerFunc = getBasicButtonClickHandler(guiObj);

            } else if (type === 'reactiveButton') {
                guiObj.buttonObj = $(guiObj.id);
                guiObj.indicatorObj = $(guiObj.indicator);
                clickHandlerFunc = getReactiveButtonClickHandler(guiObj);
                
            } else if (type === 'deviceSelectionTable') {
                // Not sure if this is needed...
            } else if (type === 'optionSelect') {
                // clickSelector
                guiObj.rootSelectorObj = $(guiObj.id);
                clickHandlerFunc = getSelectionOptionClickHandler(guiObj);
            }
        });
    };

    this.attachListener = function(guiObj) {
        const type = guiObj.type;
        let clickHandlerFunc;

        if (type === 'button') {
            clickHandlerFunc = getBasicButtonClickHandler(guiObj);
            guiObj.buttonObj.one('click', clickHandlerFunc);
        } else if (type === 'reactiveButton') {
            clickHandlerFunc = getReactiveButtonClickHandler(guiObj);
            guiObj.buttonObj.one('click', clickHandlerFunc);
        } else if (type === 'optionSelect') {
            clickHandlerFunc = getSelectionOptionClickHandler(guiObj);
            guiObj.rootSelectorObj.one('click', guiObj.clickSelector, clickHandlerFunc);
        }
        return Promise.resolve(guiObj);
    };

    this.attachListeners = function() {
        const promises = [];

        const guiKeys = Object.keys(self.guiControlIDs);
        guiKeys.forEach(function(guiKey) {
            const guiObj = self.guiControlIDs[guiKey];
            promises.push(self.attachListener(guiObj));
        });

        return Promise.allSettled(promises);
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
            if (self.selectedFileInfo.path !== '') {
                self.framework.startupData.selected_config_file_directory = self.selectedFileInfo.path;
            }
            if (self.selectedOutputDirInfo.path !== '') {
                self.framework.startupData.selected_output_directory = self.selectedOutputDirInfo.path;
            }
        } catch(err) {
            console.error('Error updateStartupData', err);
        }
    };
    this.onCloseDevice = function(framework, device, onError, onSuccess) {
        self.updateStartupData();
        const buttonEle = $('#configure-button');
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

    const self = this;
}
