/* jshint undef: true, unused: true, undef: true */
/* global console, showAlert, $ */
/* global TASK_LOADER, MODULE_CHROME, FILE_BROWSER */
/* exported activeModule, module */

/**
 * Goals for the Register Matrix module:
**/

// Constant that determines device polling rate.  Use an increased rate to aid
// in user experience.

const handlebars = require('handlebars');
const path = require('path');
const fs = require('fs');
// eslint-disable-next-line import/no-unresolved
const firmware_verifier = require('ljswitchboard-firmware_verifier');
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

    const device_updater_service = TASK_LOADER.tasks.device_updater_service;
    const deviceUpdaterService = device_updater_service.deviceUpdaterService;
    this.dts = deviceUpdaterService;

    this.versionData = undefined;
    try {
        if(deviceUpdaterService.cachedVersionData) {
            this.versionData = JSON.parse(JSON.stringify(
                deviceUpdaterService.cachedVersionData
            ));
        } else {
            console.warn('Version Data not yet ready...');
        }
    } catch(err) {
        console.error('Error parsing file', err);
    }
    try {
        this.t8VersionData = deviceUpdaterService.getCachedT8Versions();
    } catch(err) {
        console.error('Error getting cached T8 versions');
    }
    try {
        this.t7VersionData = deviceUpdaterService.getCachedT7Versions();
    } catch(err) {
        console.error('Error getting cached T7 versions');
    }
    try {
        this.t4VersionData = deviceUpdaterService.getCachedT4Versions();
    } catch(err) {
        console.error('Error getting cached T4 versions', err);
    }

    const defaultVersionData = {
        'current': [],
        'beta': [],
        'old': [],
        'isValid': false
    };

    this.moduleContext.t4VersionData = this.t4VersionData;
    this.moduleContext.t7VersionData = this.t7VersionData;
    this.moduleContext.t8VersionData = this.t8VersionData;

    this.availableVersionData = {
        'T4': this.t4VersionData,
        'T7': this.t7VersionData,
        'T8': this.t8VersionData,
    };
    this.currentDTVersionData = {};
    this.selectedDT = '';

    this.selectNewestCurrentFirmware = function() {
        let selectedFW = {};
        let selectedVersion = 0;
        let currentFWs;

        // Select what FW category we want to pick the newest version from.
        const subCategories = ['current', 'beta', 'alpha', 'old'];
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
            const versionStr = currentFW.version;
            const version = parseFloat(versionStr, 10);
            // this is where the program is seeing if the selected version is 
            // larger than the curent version
            if(version > selectedVersion) {
                selectedVersion = version;
                selectedFW = currentFW;
            }
        });
        selectedFW.latest = true;
        self.userSelectedFW = selectedFW;
    };
    this.selectNewestBetaFirmware = function() {
        let selectedFW = {};
        let selectedVersion = 0;
        let betaFWs;
        let beta = 'beta';

        if(self.currentDTVersionData[beta]) {
            betaFWs = self.currentDTVersionData[beta]
            // Select the highest FW version.
            betaFWs.forEach(function(betaFW) {
                const versionStr = betaFW.version;
                const version = parseFloat(versionStr, 10);
                if(version > selectedVersion) {
                    selectedVersion = version;
                    selectedFW = betaFW;
                }
            });
            selectedFW.latest = true;
        }
    };
    this.getSelectedFirmwareData = function(key) {
        let selectedFW;

        const subCategories = ['current', 'beta', 'alpha', 'old'];
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
        const templatesToCompile = [
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


    // To-Do: Update changeLogLinks!!!!
    const deviceSpecificInfo = {
        'T4': {
            'changeLogLink': 'https://labjack.com/support/firmware/t4-firmware',
        },
        'T7': {
            'changeLogLink': 'https://labjack.com/support/firmware/t7-firmware',
        },
        'T8': {
            'changeLogLink': 'https://labjack.com/support/firmware/t8-firmware',
        },
    };
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

        const deviceTypeCounts = {};
        devices.forEach(function(device) {
            const attrs = device.savedAttributes;
            const dtn = attrs.deviceTypeName;
            if(deviceTypeCounts[dtn]) {
                deviceTypeCounts[dtn] += 1;
            } else {
                deviceTypeCounts[dtn] = 1;
            }
        });
        const dtcKeys = Object.keys(deviceTypeCounts);
        const numDTs = dtcKeys.length;
        const dtCountsArray = [];
        dtcKeys.forEach(function(key) {
            const plural = deviceTypeCounts[key] > 1;
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

        let selectedDT = '';
        const deviceTypeInfo = {};
        if(numDTs == 1) {
            selectedDT = dtcKeys[0];
            self.selectedDT = selectedDT;
            deviceTypeInfo.dt = selectedDT;
            const dtInfo = deviceSpecificInfo[selectedDT];
            const infoKeys = Object.keys(dtInfo);
            infoKeys.forEach(function(key) {
                deviceTypeInfo[key] = dtInfo[key];
            });
            self.moduleContext.dtInfo = deviceTypeInfo;

            const versionData = self.availableVersionData[selectedDT];
            self.moduleContext.versionData = versionData;
            self.currentDTVersionData = versionData;

            // Select a firmware version to use by default.
            self.selectNewestCurrentFirmware();

            // Mark the current beta as well.
            self.selectNewestBetaFirmware();

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
        const newData = self.templates.selected_firmware(selectedFW);
        self.pageElements.selectedFW.ele.html(newData);
        self.userSelectedFW = selectedFW;
    };
    this.onVersionSelected = function() {
        try {
            const selectedFW = self.getSelectedFirmwareData(this.id);
            self.updateSelectedFW(selectedFW);
        } catch(err) {
            console.error('Error Selecting new fw', err);
            showAlert('Error selecting fw');
        }
    };
    this.viewTransitionDelay = 200;
    this.disableUpgradeButtons = function() {
        return new Promise((resolve) => {
            self.pageElements.upgradeElements.ele.fadeOut(
                self.viewTransitionDelay,
                resolve
            );
        });
    };
    function getDeviceUpgrader(device, firmwareInfo, index) {
        console.log('Created index...', index);
        this.numPercentUpdates = 0;
        this.numStepUpdates = 0;
        this.sn = device.savedAttributes.serialNumber;

        const eleID = '#' + 'upgrade_status_' + this.sn.toString();
        const stepID = eleID + ' .upgrade-step';
        const barID = eleID + ' .progress .bar';
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
        const debugUpdateManager = false;
        this.percentListener = function(percent) {
            // console.log(
            //     'in percentListener',
            //     upgradeManager.sn,
            //     percent
            // );
            try {
                const percentStr = percent.toString() + '%';
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
        const populateUpgradeData = function(err) {
            const endTime = new Date();
            const startTime = upgradeManager.upgradeInfo.startTime;
            const durationNum = endTime - startTime;
            const durationStr = (durationNum/1000).toFixed(1) + ' seconds';
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
        const upgradeDevice = function() {
            return new Promise((resolve) => {
                console.log('Upgrading Device', device.savedAttributes, firmwareInfo);
                upgradeManager.upgradeInfo.startTime = new Date();

                function reportError(err) {
                    populateUpgradeData(err);
                    resolve(upgradeManager.upgradeInfo);
                }

                function onAuthSuccess(res) {
                    console.log('Is Device Authorized?', res);
                    if (res) { // If the device is authorized...
                        device.updateFirmware(
                            firmwareInfo.path,
                            upgradeManager.percentListener,
                            upgradeManager.stepListener
                        ).then(function () {
                            populateUpgradeData();
                            resolve(upgradeManager.upgradeInfo);
                        }, reportError);
                    } else {
                        upgradeManager.percentListener(100);
                        upgradeManager.stepListener("Upgrade Failed, Device is not Authorized.  Please email support@labjack.com.");
                        reportError({"errorMessage": "Device is not Authorized.  Please email support@labjack.com."});
                    }
                }

                if (device.savedAttributes.deviceTypeName === 'T4') {
                    device.isAuthorized().then(onAuthSuccess, reportError);
                } else {
                    onAuthSuccess(true);
                }
            });
        };
        this.startUpgrade = function() {
            return new Promise((resolve) => {
                upgradeDevice()
                    .then(resolve);
            });
        };
        const upgradeManager = this;
    }
    this.getUpgradeDevices = function(firmwareInfo, devices) {
        const upgradeDevices = function() {
            return new Promise((resolve) => {
                console.log(
                    'Upgrading',
                    devices.length,
                    ' devices to firmware version',
                    firmwareInfo.version
                );
                console.log('Upgrade Path', firmwareInfo.path);
                const promises = [];
                const deviceUpgraders = [];
                devices.forEach(function (device, i) {
                    const deviceUpgrader = new getDeviceUpgrader(device, firmwareInfo, i);
                    deviceUpgraders.push(deviceUpgrader);
                    promises.push(deviceUpgrader.startUpgrade());
                });

                Promise.allSettled(promises)
                    .then(function (promiseResults) {
                        const results = [];
                        promiseResults.forEach(function (promiseResult) {
                            if (promiseResult.state === 'fulfilled') {
                                results.push(promiseResult.value);
                            }
                        });
                        console.log('Upgrade Results', results);
                        resolve(results);
                    });
            });
        };
        const displayUpgradeView = function() {
            return new Promise((resolve) => {
                const data = self.templates.device_upgrade_status({
                    'devices': devices,
                    'firmwareInfo': firmwareInfo
                });
                self.pageElements.upgradeStatusHolder.ele.html(data);
                self.pageElements.upgradeStatusHolder.ele.fadeIn(
                    self.viewTransitionDelay,
                    () => resolve()
                );
            });
        };
        const createUpgradeResultsElement = function(results) {
            return new Promise((resolve) => {
                const pageData = self.templates.upgrade_results({
                    'results': results
                });
                self.pageElements.upgradeResults.ele.html(pageData);
                resolve();
            });
        };
        const upgradeManager = function() {
            return new Promise((resolve) => {
                displayUpgradeView()
                    .then(upgradeDevices)
                    .then(createUpgradeResultsElement)
                    .then(() => resolve());
            });
        };
        return upgradeManager;
    };
    this.hideUpgradeResults = function() {
        return new Promise((resolve) => {
            self.pageElements.upgradeResults.ele.slideUp(function () {
                self.pageElements.upgradeResults.ele.empty();
                resolve();
            });
        });
    };
    this.clearPreviousUpgradeResults = function() {
        const state = self.pageElements.upgradeResults.ele.css('display');
        if(state !== 'none') {
            return self.hideUpgradeResults();
        } else {
            return new Promise((resolve) => {
                resolve();
            });
        }
    };
    this.hideUpgradeView = function() {
        return new Promise((resolve) => {
            self.pageElements.upgradeStatusHolder.ele.fadeOut(
                self.viewTransitionDelay,
                () => resolve()
            );
        });
    };
    this.emptyUpgradeView = function() {
        self.pageElements.upgradeStatusHolder.ele.empty();
        return Promise.resolve();
    };
    this.showUpgradeResults = function() {
        return new Promise((resolve) => {
            self.pageElements.upgradeResults.ele.slideDown(function () {
                resolve();
            });
        });
    };
    this.enableUpgradeButtons = function() {
        return new Promise((resolve) => {
            console.log('Finished Upgrading');
            self.pageElements.upgradeElements.ele.fadeIn(
                self.viewTransitionDelay,
                () => resolve()
            );
        });
    };
    this.indicateUpgradeFinished = function() {
        MODULE_CHROME.enableModuleLoading();
        self.upgradeInProgress = false;
        return Promise.resolve();
    };
    this.startUpgrade = function(type) {
        try {
            if(!self.upgradeInProgress) {
                self.upgradeInProgress = true;
                MODULE_CHROME.disableModuleLoading('Please wait for upgrade to finish.');
                console.log('Starting Upgrade');
                const firmwareInfo = {};
                if(type === 'file') {
                    firmwareInfo.path = self.userSelectedFWFile.path;
                    firmwareInfo.version = self.userSelectedFWFile.version;
                } else {
                    firmwareInfo.path = self.userSelectedFW.upgradeLink;
                    firmwareInfo.version = self.userSelectedFW.version;
                }
                const devicesToUpgrade = self.activeDevices;

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


    const getSelectedFileStats = function(bundle) {
        return new Promise((resolve) => {
            fs.stat(bundle.path, function (err, stats) {
                if (err) {
                    bundle.isValid = false;
                    bundle.message = 'Failed to read selected file, file probably does not exist.';
                    resolve(bundle);
                } else {
                    bundle.fileStats = stats;
                    resolve(bundle);
                }
            });
        });
    };
    const checkSelectedFileEnding = function(bundle) {
        return new Promise((resolve) => {

            if (bundle.isValid) {
                // Check to make sure that the file's ending is .bin
                if (bundle.extension !== '.bin') {
                    bundle.isValid = false;
                    bundle.message = 'File ending should be .bin not ' + bundle.extension + '.';
                    return resolve(bundle);
                }
                // Check to make sure that the file is less than 1MB in size

                const maxSize = 1000000;
                if (bundle.fileStats.size > maxSize) {
                    bundle.isValid = false;
                    bundle.message = 'File size is greater than 1MB, it is probably not a firmware file.';
                    return resolve(bundle);
                }
            }

            resolve(bundle);
        });
    };
    const loadSelectedBinaryFile = function(bundle) {
        return new Promise((resolve) => {
            if (bundle.isValid) {
                fs.readFile(bundle.path, function (err, data) {
                    if (err) {
                        bundle.isValid = false;
                        bundle.message = 'Failed to read selected file.';
                    } else {
                        bundle.fileData = data;
                    }
                    resolve(bundle);
                });
            } else {
                resolve(bundle);
            }
        });
    };
    const verifySelectedBinaryFile = function(bundle) {
        return new Promise((resolve) => {
            try {
                if (bundle.isValid) {
                    firmware_verifier.validateFirmwareFile(bundle.fileData, {
                        'version': bundle.version,
                        'deviceType': self.selectedDT,
                    })
                        .then(function (parsedData) {
                            bundle.isValidBinary = parsedData.isValid;
                            bundle.message = parsedData.message;
                            resolve(bundle);
                        });
                } else {
                    resolve(bundle);
                }
            } catch (err) {
                console.log('ERR in verifySelectedBinaryFile', err);
                // Error verifying the file
                resolve(bundle);
            }
        });
    };
    const displaySelectedFileInfo = function(bundle) {
        return new Promise((resolve) => {
            self.pageElements.chosenFilePath.ele.val(bundle.path);
            const fileInfo = self.templates.firmware_file_info(
                bundle
            );
            self.pageElements.userSelectedFileInfo.ele.html(fileInfo);

            if (bundle.isValid && bundle.isValidBinary) {
                self.userSelectedFWFile = bundle;
                self.pageElements.localUpdate.ele.attr('disabled', false);
            } else {
                self.userSelectedFWFile = undefined;
                self.pageElements.localUpdate.ele.attr('disabled', true);
            }
            resolve(bundle);
        });
    };
    this.updateSelectedFWFile = function(filePath) {
        const info = path.parse(filePath);
        const fileData = {
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
            const splitName = info.name.split('_');
            const versionStr = splitName[1];
            const fullNum = Number(versionStr)/10000;
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
    this.browseForFile = async function() {
        try {
            const fileLoc = await FILE_BROWSER.browseForFile({'filters':'bin'});
            if (fileLoc) {
                self.fileSelectedWithFileBrowser(fileLoc);
            }
        } catch(err) {
            console.error('Error in browseForFile', err);
        }
        // return false;
    };
    this.chosenFilePathChanged = function() {
        const fileLoc = $(this).val();
        self.updateSelectedFWFile(fileLoc);
    };
    this.updateFromLocalFile = function() {
        self.startUpgrade('file');
    };


    this.pageElements = {};
    const pageElementsToCache = [{
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
            const ele = $(pageElement.selector);
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
    this.onCloseDevice = function(framework, devices, onError, onSuccess) {
        // self.saveModuleStartupData()
        // .then(onSuccess);
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
