/* jshint undef: true, unused: true, undef: true */
/* global console, global, module_manager, dict, q, showAlert, modbus_map, $ */
/* global ljmmm_parse, handlebars, TASK_LOADER, MODULE_CHROME, path, FILE_BROWSER */

/* global dataTableCreator */
/* exported activeModule, module, MODULE_UPDATE_PERIOD_MS */

/**
 * Goals for the Register Matrix module:
**/

// Constant that determines device polling rate.  Use an increased rate to aid
// in user experience.
var MODULE_UPDATE_PERIOD_MS = 1000;

var firmware_verifier = global.require('@labjack/ljswitchboard-firmware_verifier');
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
    this.moduleData = undefined;
    this.activeDevice = undefined;
    this.templates = {};
    this.userSelectedFW = undefined;
    this.userSelectedFWFile = undefined;
    this.upgradeInProgress = false;

    // var update_manager = TASK_LOADER.tasks.update_manager;



    // var update_manager_events = update_manager.eventList;
    // var update_manager_vm = update_manager.vm;

    var device_updater_service = TASK_LOADER.tasks.device_updater_service;
    var deviceUpdaterService = device_updater_service.deviceUpdaterService;
    this.dts = deviceUpdaterService;

    this.versionData = undefined;
    this.hasValidWebData = false;
    try {
        if(deviceUpdaterService.cachedVersionData) {
            this.versionData = JSON.parse(JSON.stringify(
                deviceUpdaterService.cachedVersionData
            ));
            this.hasValidWebData = true;
        } else {
            console.warn('Version Data not yet ready...');
        }
    } catch(err) {
        console.error('Error parsing file', err);
    }
    try {
        this.t7VersionData = deviceUpdaterService.getCachedT7Versions();
    } catch(err) {
        console.error('Error getting cached T7 versions');
    }
    try {
        this.t4VersionData = deviceUpdaterService.getCachedT4Versions();
    } catch(err) {
        console.error('Error getting cached T4 versions');
    }

    

    this.moduleContext.t7VersionData = this.t7VersionData;
    this.moduleContext.t4VersionData = this.t4VersionData;

    this.availableVersionData = {
        'T4': this.t4VersionData,
        'T7': this.t7VersionData,
    };
    this.currentDTVersionData = {};
    this.selectedDT = '';

    this.selectNewestCurrentFirmware = function() {
        var selectedFW = {};
        var selectedVersion = 0;
        var currentFWs;

        // Select what FW category we want to pick the newest version from.
        var subCategories = ['current', 'beta', 'alpha', 'old'];
        subCategories.some(function(subCategory) {
            if(self.currentDTVersionData[subCategory]) {
                currentFWs = self.currentDTVersionData[subCategory];
                return true;
            } else {
                return false;
            }
        });

        // Select the highest FW version.
        currentFWs.forEach(function(currentFW) {
            var versionStr = currentFW.version;
            var version = parseFloat(versionStr, 10);
            if(version > selectedVersion) {
                selectedVersion = version;
                selectedFW = currentFW;
            }
        });
        selectedFW.latest = true;
        self.userSelectedFW = selectedFW;
    };
    this.getSelectedFirmwareData = function(key) {
        var selectedFW;

        var subCategories = ['current', 'beta', 'alpha', 'old'];
        subCategories.some(function(subCategory) {
            if(self.currentDTVersionData[subCategory]) {
                return self.currentDTVersionData[subCategory].some(function(versionData) {
                    if(versionData.key === key) {
                        selectedFW = versionData;
                        return true;
                    }
                });
            } else {
                return false;
            }
        });
        return selectedFW;
    };
    this.compileTemplate = function(templateName) {
        try {
            self.templates[templateName] = handlebars.compile(
                self.moduleData.htmlFiles[templateName]
            );
        } catch(err) {
            console.error(
                'Error compiling template',
                templateName,
                err
            );
        }
    };
    /**
     * Function is called once every time the module tab is selected, loads the module.
     * @param  {[type]} framework   The active framework instance.
     * @param  {[type]} onError     Function to be called if an error occurs.
     * @param  {[type]} onSuccess   Function to be called when complete.
    **/
    this.onModuleLoaded = function(framework, onError, onSuccess) {
        // Save data relevant to the module
        self.startupData = framework.moduleData.startupData;
        self.moduleName = framework.moduleData.name;
        self.moduleData = framework.moduleData;

        // Compile module templates
        var templatesToCompile = [
            'selected_firmware',
            'firmware_file_info',
            'device_upgrade_status',
            'upgrade_results',
        ];
        templatesToCompile.forEach(self.compileTemplate);

        // Initialize the selected file data

        onSuccess();
    };

    /**
     * Function is called once every time a user selects a new device.  
     * @param  {[type]} framework   The active framework instance.
     * @param  {[type]} devices     The active framework instance.
     * @param  {[type]} onError     Function to be called if an error occurs.
     * @param  {[type]} onSuccess   Function to be called when complete.
    **/
    this.onDeviceSelected = function(framework, devices, onError, onSuccess) {
        self.activeDevices = devices;
        framework.clearConfigBindings();
        framework.setStartupMessage('Reading Device Configuration');
        
        onSuccess();
    };

    var deviceSpecificInfo = {
        'T4': {
            'changeLogLink': 'https://labjack.com/support/firmware/t4',
        },
        'T7': {
            'changeLogLink': 'https://labjack.com/support/firmware/t7',
        }
    }
    this.onDeviceConfigured = function(framework, devices, setupBindings, onError, onSuccess) {

        
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

        var deviceTypeCounts = {};
        devices.forEach(function(device) {
            var attrs = device.savedAttributes;
            var dtn = attrs.deviceTypeName;
            if(deviceTypeCounts[dtn]) {
                deviceTypeCounts[dtn] += 1;
            } else {
                deviceTypeCounts[dtn] = 1;
            }
        })
        var dtcKeys = Object.keys(deviceTypeCounts);
        var numDTs = dtcKeys.length;
        var dtCountsArray = [];
        dtcKeys.forEach(function(key) {
            var plural = deviceTypeCounts[key] > 1;
            dtCountsArray.push({
                'deviceType': key,
                'numDevices': deviceTypeCounts[key],
                'plural': plural,
            });
        });
        self.moduleContext.multipleDeviceTypes = numDTs > 1;
        self.moduleContext.numSelectedDeviceTypes = numDTs;
        self.moduleContext.deviceTypeCounts = deviceTypeCounts;
        self.moduleContext.deviceTypeCountsArray = dtCountsArray;

        var selectedDT = '';
        var deviceTypeInfo = {};
        if(numDTs == 1) {
            selectedDT = dtcKeys[0];
            self.selectedDT = selectedDT;
            deviceTypeInfo.dt = selectedDT;
            var dtInfo = deviceSpecificInfo[selectedDT];
            var infoKeys = Object.keys(dtInfo);
            infoKeys.forEach(function(key) {
                deviceTypeInfo[key] = dtInfo[key];
            });
            self.moduleContext.dtInfo = deviceTypeInfo;

            var versionData = self.availableVersionData[selectedDT];
            self.moduleContext.versionData = versionData;
            self.currentDTVersionData = versionData;

            // Select a firmware version to use by default.
            self.selectNewestCurrentFirmware();

            // Execute other FW file selecting functions.
            self.moduleContext.selectedFW = self.templates.selected_firmware(
                self.userSelectedFW
            );
            self.moduleContext.selectedFile = self.userSelectedFWFile;
            self.moduleContext.fileInfo = self.templates.firmware_file_info(
                self.userSelectedFWFile
            );

        }

        framework.setCustomContext(self.moduleContext);
        onSuccess();
    };

    this.onTemplateLoaded = function(framework, onError, onSuccess) {
        onSuccess();
    };
    this.updateSelectedFW = function(selectedFW) {
        var newData = self.templates.selected_firmware(selectedFW);
        self.pageElements.selectedFW.ele.html(newData);
        self.userSelectedFW = selectedFW;
    };
    this.onVersionSelected = function() {
        try {
            var selectedFW = self.getSelectedFirmwareData(this.id);
            self.updateSelectedFW(selectedFW);
        } catch(err) {
            console.error('Error Selecting new fw', err);
            showAlert('Error selecting fw');
        }
    };
    this.viewTransitionDelay = 200;
    this.disableUpgradeButtons = function() {
        var defered = q.defer();
        self.pageElements.upgradeElements.ele.fadeOut(
            self.viewTransitionDelay,
            defered.resolve
        );
        // defered.resolve();
        return defered.promise;
    };
    function getDeviceUpgrader(device, firmwareInfo, index) {
        console.log('Created index...', index);
        this.numPercentUpdates = 0;
        this.numStepUpdates = 0;
        this.sn = device.savedAttributes.serialNumber;

        var eleID = '#' + 'upgrade_status_' + this.sn.toString();
        var stepID = eleID + ' .upgrade-step';
        var barID = eleID + ' .progress .bar';
        this.stepEle = $(stepID);
        this.barEle = $(barID);
        this.upgradeInfo = {
            'sn': device.savedAttributes.serialNumber,
            'DEVICE_NAME_DEFAULT': device.savedAttributes.DEVICE_NAME_DEFAULT,
            'startingFW': device.savedAttributes.FIRMWARE_VERSION,
            'index': index,
            'firmwareInfo': firmwareInfo,
            'productType': device.savedAttributes.productType,
        };
        var debugUpdateManager = false;
        this.percentListener = function(percent) {
            // console.log(
            //     'in percentListener',
            //     upgradeManager.sn,
            //     percent
            // );
            try {
                var percentStr = percent.toString() + '%';
                upgradeManager.barEle.width(percentStr);
                upgradeManager.numPercentUpdates += 1;
            } catch(err) {
                console.warn('Error in percentListener', err);
            }
        };
        this.stepListener = function(step) {
            // console.log(
            //     'In stepListener',
            //     upgradeManager.sn,
            //     step
            // );
            try {
                upgradeManager.stepEle.text(step);
                upgradeManager.numStepUpdates += 1;
            } catch(err) {
                console.warn('Error in stepListener', err);
            }
        };
        var populateUpgradeData = function(err) {
            var endTime = new Date();
            var startTime = upgradeManager.upgradeInfo.startTime;
            var durationNum = endTime - startTime;
            var durationStr = (durationNum/1000).toFixed(1) + ' seconds';
            upgradeManager.upgradeInfo.endTime = endTime;
            upgradeManager.upgradeInfo.duration = durationStr;
            upgradeManager.upgradeInfo.numPercentUpdates = upgradeManager.numPercentUpdates;
            upgradeManager.upgradeInfo.numStepUpdates = upgradeManager.numStepUpdates;
            if(err) {
                upgradeManager.upgradeInfo.isError = true;
                upgradeManager.upgradeInfo.err = err;
                if(debugUpdateManager) {
                    console.log(
                        'Update Failed',
                        upgradeManager.sn,
                        index,
                        upgradeManager.numPercentUpdates,
                        upgradeManager.numStepUpdates,
                        err
                    );
                }
            } else {
                upgradeManager.upgradeInfo.isError = false;
                upgradeManager.upgradeInfo.err = undefined;
                if(debugUpdateManager) {
                    console.log(
                        'Upgrade Finished',
                        upgradeManager.sn,
                        index,
                        upgradeManager.numPercentUpdates,
                        upgradeManager.numStepUpdates
                    );
                }
            }
        };
        var upgradeDevice = function() {
            var defered = q.defer();
            console.log('Upgrading Device', device.savedAttributes, firmwareInfo);
            // setTimeout(defered.resolve, 2000);
            upgradeManager.upgradeInfo.startTime = new Date();
            function reportError(err) {
                populateUpgradeData(err);
                defered.resolve(upgradeManager.upgradeInfo);
            }
            function onAuthSuccess(res) {
                console.log('Is Device Authorized?', res);
                if(res) { // If the device is authorized...
                    device.updateFirmware(
                        firmwareInfo.path,
                        upgradeManager.percentListener,
                        upgradeManager.stepListener
                    ).then(function() {
                        populateUpgradeData();
                        defered.resolve(upgradeManager.upgradeInfo);
                    }, reportError);
                } else {
                    upgradeManager.percentListener(100);
                    upgradeManager.stepListener("Upgrade Failed, Device is not Authorized.  Please email support@labjack.com.");
                    reportError({"errorMessage": "Device is not Authorized.  Please email support@labjack.com."});
                }
            }

            if(device.savedAttributes.deviceTypeName === 'T4') {
                device.isAuthorized().then(onAuthSuccess, reportError);
            } else {
                onAuthSuccess(true);
            }
            return defered.promise;
        };
        this.startUpgrade = function() {
            var defered = q.defer();
            upgradeDevice()
            .then(defered.resolve);
            return defered.promise;
        };
        var upgradeManager = this;
    }
    this.getUpgradeDevices = function(firmwareInfo, devices) {
        var upgradeDevices = function() {
            var defered = q.defer();
            console.log(
                'Upgrading',
                devices.length,
                ' devices to firmware version',
                firmwareInfo.version
            );
            console.log('Upgrade Path', firmwareInfo.path);
            var promises = [];
            var deviceUpgraders = [];
            devices.forEach(function(device, i) {
                var deviceUpgrader = new getDeviceUpgrader(device, firmwareInfo, i);
                deviceUpgraders.push(deviceUpgrader);
                promises.push(deviceUpgrader.startUpgrade());
            });

            q.allSettled(promises)
            .then(function(promiseResults) {
                var results = [];
                promiseResults.forEach(function(promiseResult) {
                    if(promiseResult.state === 'fulfilled') {
                        results.push(promiseResult.value);
                    }
                });
                console.log('Upgrade Results', results);
                defered.resolve(results);
            });
            return defered.promise;
        };
        var displayUpgradeView = function() {
            var defered = q.defer();
            var data = self.templates.device_upgrade_status({
                'devices': devices,
                'firmwareInfo': firmwareInfo
            });
            self.pageElements.upgradeStatusHolder.ele.html(data);
            self.pageElements.upgradeStatusHolder.ele.fadeIn(
                self.viewTransitionDelay,
                defered.resolve
            );
            return defered.promise;
        };
        var createUpgradeResultsElement = function(results) {
            var defered = q.defer();
            var pageData = self.templates.upgrade_results({
                'results': results
            });
            self.pageElements.upgradeResults.ele.html(pageData);
            defered.resolve();
            return defered.promise;
        };
        var upgradeManager = function() {
            var defered = q.defer();
            displayUpgradeView()
            .then(upgradeDevices)
            .then(createUpgradeResultsElement)
            .then(defered.resolve);
            return defered.promise;
        };
        return upgradeManager;
    };
    this.hideUpgradeResults = function() {
        var defered = q.defer();
        self.pageElements.upgradeResults.ele.slideUp(function() {
            self.pageElements.upgradeResults.ele.empty();
            defered.resolve();
        });
        return defered.promise;
    };
    this.clearPreviousUpgradeResults = function() {
        var state = self.pageElements.upgradeResults.ele.css('display');
        if(state !== 'none') {
            return self.hideUpgradeResults();
        } else {
            var defered = q.defer();
            defered.resolve();
            return defered.promise;
        }
    };
    this.hideUpgradeView = function() {
        var defered = q.defer();
        self.pageElements.upgradeStatusHolder.ele.fadeOut(
            self.viewTransitionDelay,
            defered.resolve
        );
        return defered.promise;
    };
    this.emptyUpgradeView = function() {
        var defered = q.defer();
        self.pageElements.upgradeStatusHolder.ele.empty();
        defered.resolve();
        return defered.promise;
    };
    this.showUpgradeResults = function() {
        var defered = q.defer();
        self.pageElements.upgradeResults.ele.slideDown(function() {
            defered.resolve();
        });
        return defered.promise;
    };
    this.enableUpgradeButtons = function() {
        var defered = q.defer();
        console.log('Finished Upgrading');
        // defered.resolve();
        self.pageElements.upgradeElements.ele.fadeIn(
            self.viewTransitionDelay,
            defered.resolve
        );
        return defered.promise;
    };
    this.indicateUpgradeFinished = function() {
        var defered = q.defer();

        MODULE_CHROME.enableModuleLoading();
        self.upgradeInProgress = false;
        defered.resolve();
        return defered.promise;
    };
    this.startUpgrade = function(type) {
        try {
            if(!self.upgradeInProgress) {
                self.upgradeInProgress = true;
                MODULE_CHROME.disableModuleLoading('Please wait for upgrade to finish.');
                console.log('Starting Upgrade');
                var firmwareInfo = {};
                if(type === 'file') {
                    firmwareInfo.path = self.userSelectedFWFile.path;
                    firmwareInfo.version = self.userSelectedFWFile.version;
                } else {
                    firmwareInfo.path = self.userSelectedFW.upgradeLink;
                    firmwareInfo.version = self.userSelectedFW.version;
                }
                var devicesToUpgrade = self.activeDevices;

                self.disableUpgradeButtons()
                .then(self.clearPreviousUpgradeResults)
                .then(self.getUpgradeDevices(firmwareInfo, devicesToUpgrade))
                .then(self.hideUpgradeView)
                .then(self.emptyUpgradeView)
                .then(self.showUpgradeResults)
                .then(self.enableUpgradeButtons)
                .then(self.indicateUpgradeFinished);
            } else {
                showAlert('Upgrade Already in progress');
            }
        } catch(err) {
            showAlert('Failed to upgrade devices');
            console.error('Error Upgrading devices', err, type);
        }
    };
    this.downloadAndUpdateDevices = function() {
        self.startUpgrade('url');
    };


    var getSelectedFileStats = function(bundle) {
        var defered = q.defer();
        fs.stat(bundle.path, function(err, stats) {
            if(err) {
                bundle.isValid = false;
                bundle.message = 'Failed to read selected file, file probably does not exist.';
                defered.resolve(bundle);
            } else {
                bundle.fileStats = stats;
                defered.resolve(bundle);
            }
        });
        return defered.promise;
    };
    var checkSelectedFileEnding = function(bundle) {
        var defered = q.defer();

        if(bundle.isValid) {
            // Check to make sure that the file's ending is .bin
            if(bundle.extension !== '.bin') {
                bundle.isValid = false;
                bundle.message = 'File ending should be .bin not ' + bundle.extension + '.';
                defered.resolve(bundle);
                return defered.promise;
            }
            // Check to make sure that the file is less than 1MB in size
            
            var maxSize = 1000000;
            if(bundle.fileStats.size > maxSize) {
                bundle.isValid = false;
                bundle.message = 'File size is greater than 1MB, it is probably not a firmware file.';
                defered.resolve(bundle);
                return defered.promise;
            }
        }
        
        defered.resolve(bundle);
        return defered.promise;
    };
    var loadSelectedBinaryFile = function(bundle) {
        var defered = q.defer();
        if(bundle.isValid) {
            fs.readFile(bundle.path, function(err, data) {
                if(err) {
                    bundle.isValid = false;
                    bundle.message = 'Failed to read selected file.';
                } else {
                    bundle.fileData = data;
                }
                defered.resolve(bundle);
            });
        } else {
            defered.resolve(bundle);
        }
        return defered.promise;
    };
    var verifySelectedBinaryFile = function(bundle) {
        var defered = q.defer();
        try {
            if(bundle.isValid) {
                firmware_verifier.validateFirmwareFile(bundle.fileData, {
                    'version': bundle.version,
                    'deviceType': self.selectedDT,
                })
                .then(function(parsedData) {
                    bundle.isValidBinary = parsedData.isValid;
                    bundle.message = parsedData.message;
                    defered.resolve(bundle);
                });
            } else {
                defered.resolve(bundle);
            }
        } catch(err) {
            console.log('ERR in verifySelectedBinaryFile', err);
            // Error verifying the file
            defered.resolve(bundle);
        }
        return defered.promise;
    };
    var displaySelectedFileInfo = function(bundle) {
        var defered = q.defer();
        self.pageElements.chosenFilePath.ele.val(bundle.path);
        var fileInfo = self.templates.firmware_file_info(
            bundle
        );
        self.pageElements.userSelectedFileInfo.ele.html(fileInfo);

        if(bundle.isValid && bundle.isValidBinary) {
            self.userSelectedFWFile = bundle;
            self.pageElements.localUpdate.ele.attr('disabled', false);
        } else {
            self.userSelectedFWFile = undefined;
            self.pageElements.localUpdate.ele.attr('disabled', true);
        }
        defered.resolve(bundle);
        return defered.promise;
    };
    this.updateSelectedFWFile = function(filePath) {
        var info = path.parse(filePath);
        var fileData = {
            'path': filePath,
            'name': info.name,
            'fileName': info.base,
            'extension': info.ext,
            'version': '',
            'isValid': true,
            'message': '',
            'fileData': undefined,
            'fileStats': undefined,
            'isValidBinary': false,
        };

        try {
            var splitName = info.name.split('_');
            var versionStr = splitName[1];
            var fullNum = Number(versionStr)/10000;
            fileData.version = fullNum.toFixed(4);
        } catch(err) {
            fileData.version = '';
        }

        getSelectedFileStats(fileData)
        .then(checkSelectedFileEnding)
        .then(loadSelectedBinaryFile)
        .then(verifySelectedBinaryFile)
        .then(displaySelectedFileInfo)
        .done();
    };
    this.fileSelectedWithFileBrowser = function(fileLoc) {
        self.updateSelectedFWFile(fileLoc);
    };
    this.browseForFile = function() {
        try {

            // var chooser = $('#file-dialog-hidden');
            // chooser.off('change');
            // chooser.one('change', function(evt) {
            //     var fileLoc = $(this).val();
            //     console.log('Selected File', fileLoc);
            //     self.updateSelectedFWFile(fileLoc);
            //     // $('#file-loc-input').val(fileLoc);
            // });

            // chooser.trigger('click');
            var eventStr = FILE_BROWSER.eventList.FILE_SELECTED;
            FILE_BROWSER.removeAllListeners(eventStr);
            FILE_BROWSER.once(eventStr, self.fileSelectedWithFileBrowser);
            FILE_BROWSER.browseForFile({'filters':'.bin'});
        } catch(err) {
            console.error('Error in browseForFile', err);
        }
        // return false;
    };
    this.chosenFilePathChanged = function() {
        var fileLoc = $(this).val();
        self.updateSelectedFWFile(fileLoc);
    };
    this.updateFromLocalFile = function() {
        self.startUpgrade('file');
    };

    
    this.pageElements = {};
    var pageElementsToCache = [{
        'key': 'selectedFW',
        'selector': '#internet-controls #selected-firmware',
    }, {
        'key': 'fwOptions',
        'selector': '#internet-controls .firmware-selection-link',
        'on': 'click',
        'callback': this.onVersionSelected,
    }, {
        'key': 'downloadAndUpdate',
        'selector': '#internet-controls #web-update-button',
        'on': 'click',
        'callback': this.downloadAndUpdateDevices,
    }, {
        'key': 'browseForFile',
        'selector': '#local-file-controls #browse-link',
        'on': 'click',
        'callback': this.browseForFile,
    }, {
        'key': 'chosenFilePath',
        'selector': '#local-file-controls #file-loc-input',
        'on': 'change',
        'callback': this.chosenFilePathChanged,
    }, {
        'key': 'userSelectedFileInfo',
        'selector': '#local-file-controls #user-selected-file-info',
    }, {
        'key': 'localUpdate',
        'selector': '#local-file-controls #local-update-button',
        'on': 'click',
        'callback': this.updateFromLocalFile,
    }, {
        'key': 'upgradeElements',
        'selector': '#device_updater_holder #t7_firmware_controls',
    }, {
        'key': 'upgradeStatusHolder',
        'selector': '#device_updater_holder #upgrade_status_holder',
    }, {
        'key': 'upgradeResults',
        'selector': '#device_updater_holder #firmware-update-results-holder',
    }, {
        'key': 'hideUpgradeResultsListener',
        'on': 'click',
        'filter': 'button.hide-upgrade-results',
        'selector': '#device_updater_holder #firmware-update-results-holder',
        'callback': this.hideUpgradeResults,
    }];
    
    this.cachePageElements = function() {
        pageElementsToCache.forEach(function(pageElement) {
            var ele = $(pageElement.selector);
            pageElement.ele = ele;
            
            if(pageElement.on) {
                ele.off(pageElement.on);
                if(pageElement.filter) {
                    ele.on(
                        pageElement.on,
                        pageElement.filter,
                        pageElement.callback
                    );
                } else {
                    ele.on(pageElement.on, pageElement.callback);
                }
            }
            self.pageElements[pageElement.key] = pageElement;
        });
    };
    this.connectListeners = function() {
    };
    /**
     * Function that gets executed after the module's template is displayed.
     * @param  {object} framework framework object.
     * @param  {function} onError   function to be called on error.
     * @param  {function} onSuccess function to be called on success
     * @return {[type]}           [description]
     */
    this.onTemplateDisplayed = function(framework, onError, onSuccess) {

        self.cachePageElements();
        self.connectListeners();

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
    this.onCloseDevice = function(framework, devices, onError, onSuccess) {
        // self.saveModuleStartupData()
        // .then(onSuccess);
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
