/* jshint undef: true, unused: true, undef: true */
/* global handlebars, console, q, dict, $, showAlert, driver_const */
/**
 * Goals for the Device Info module.
 * This module displays basic device information about the Digit and T7 devices.
 *
 * @author Chris Johnson (LabJack Corp, 2014)
**/

const q = require('q');
const package_loader = global.package_loader;
var MODULE_UPDATE_PERIOD_MS = 1000;

/**
 * Module object that gets automatically instantiated & linked to the appropriate framework.
 * When using the 'singleDevice' framework it is instantiated as sdModule.
 */
function module() {
    var driver_const = require('ljswitchboard-ljm_driver_constants');
    this.MODULE_DEBUGGING = true;
    this.MODULE_LOADING_STATE_DEBUGGING = true;
    this.activeDevice = undefined;
    this.framework = undefined;
    this.moduleContext = {};
    this.moduleConstants = {};
    this.periodicRegisters = {};
    var savePeriodicRegisters = function(regInfo) {
        self.periodicRegisters[regInfo.name] = regInfo;
    };
    this.currentValues = new Map();
    this.bufferedValues = new Map();
    this.newBufferedValues = new Map();

    const static_files = package_loader.getPackage('static_files');
    var staticFilesDir = static_files.getDir();

    // var genericConfigCallback = function(data, onSuccess) {
    //     onSuccess();
    // };
    var genericPeriodicCallback = function(data, onSuccess) {
        var name = data.binding.binding;
        var value = data.value;
        if(self.currentValues.has(name)) {
            var oldValue = self.currentValues.get(name);
            // Zander - this is a place that i am getting an error
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
    function setRTCTimeToSystemTime(data, onSuccess) {
        var systemTime = (new Date()).getTime()/1000;
        self.activeDevice.write('RTC_SET_TIME_S',systemTime)
        .then(function() {
            onSuccess();
        }, function(err) {
            console.error('Failed to set RTC_SET_TIME_S', systemTime, err);
            showAlert('Failed to set device time to system time: ' + err.toString());
            onSuccess();
        });
    }
    function openAppCFGFile(appName, ending) {
        console.log('Opening config file for app: ', appName);
        var cfgFileName = appName + ending;
        function openApp(err, data) {
            try {
                var progPath = data[appName].workdir;
                var posixPath = progPath.split(path.sep).join(path.posix.sep);
                var workingDirPath = 'file:///' + posixPath;
                var filePath = workingDirPath + path.posix.sep + cfgFileName;
                console.log('HERE', data, progPath, posixPath, filePath);
                const gui = global.gui;
                gui.Shell.openExternal(filePath);
            } catch(errA) {
                console.log('error opening application', errA);
            }
        }
        try {
            var regInfo = require('lj-apps-win-registry-info');
            regInfo.getLJAppsRegistryInfo(regInfo.ljAppNames,openApp);
        } catch(err) {
            console.log('error getting app registry info', err);
        }
    }
    function openLJLogMOpenConfigFile(data, onSuccess) {
        openAppCFGFile('LJLogM','_open.cfg');
        onSuccess();
    }
    function openLJStreamMOpenConfigFile(data, onSuccess) {
        openAppCFGFile('LJStreamM','_open.cfg');
        onSuccess();
    }
    function openLJLogMConfigFile(data, onSuccess) {
        openAppCFGFile('LJLogM','.cfg');
        onSuccess();
    }
    function openLJStreamMConfigFile(data, onSuccess) {
        openAppCFGFile('LJStreamM','.cfg');
        onSuccess();
    }
    function openLJApplication(appName) {
        var appPath = {
            'LJLogM': "file:///C:/Program Files (x86)/LabJack/Applications/LJLogM.exe",
            'LJStreamM': "file:///C:/Program Files (x86)/LabJack/Applications/LJStreamM.exe"
        }[appName];
        const gui = global.gui;
        gui.Shell.openExternal(appPath);
    }
    function configAndOpenApp(appName) {

    }
    function openLJLogMApplication(data, onSuccess) {
        openLJApplication('LJLogM');
        onSuccess();
    }
    function openLJStreamMApplication(data, onSuccess) {
        openLJApplication('LJStreamM');
        onSuccess();
    }
    function configAndOpenLJLogMApplication(data, onSuccess) {
        self.activeDevice.openDeviceInLJLogM()
        .then(function(res) {
            onSuccess();
        }, function(err) {
            onSuccess();
        });
    }
    function configAndOpenLJStreamMApplication(data, onSuccess) {
        self.activeDevice.openDeviceInLJStreamM()
        .then(function(res) {
            onSuccess();
        }, function(err) {
            onSuccess();
        });
    }
    // This function should be used to open both of the aplications (LJLogM and LJStreamM)
    function getConfigAndOpenInApplication(appName, ct) {
        return function configAndOpenInApplication(data, onSuccess) {
            console.log('Opening Application:', appName, ct);
            var msgStr = 'Opening device in '+appName +' ';
            var preventCloseOpen = false;
            var ctToOpen;
                if(ct === 'current') {
                    ctToOpen = driver_const.connectionTypes[self.activeDevice.savedAttributes.connectionTypeName];
                    msgStr += 'over' + ctToOpen;
                    console.log("this is the stream btn presses.");
                } else {
                    msgStr += 'over' + ct;
                    ctToOpen = driver_const.connectionTypes[ct.toUpperCase()];
                    console.log("this is the else statment")
                }

            if(ctToOpen == driver_const.connectionTypes.USB) {
                preventCloseOpen = false;
            } else if(ctToOpen == driver_const.connectionTypes.Ethernet) {
                preventCloseOpen = true; // Force app to open via Ethernet and maintain current connection.
            } else if(ctToOpen == driver_const.connectionTypes.WiFi) {
                preventCloseOpen = false;
            }

            showInfoMessage(msgStr);
            self.activeDevice.openDeviceInExternalApplication(appName, ct, preventCloseOpen)
            .then(function(res) {
                onSuccess();
            }, function(err) {
                onSuccess();
            });
        };
    }
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
        }, {
            bindingName: 'set_rtc_time',
            smartName: 'clickHandler',
            callback: setRTCTimeToSystemTime,
        }, {
            bindingName: 'lj-open-file-link-holder-ljLogMApp', // Open the LJLogM_open.cfg file
            smartName: 'clickHandler',
            callback: openLJLogMOpenConfigFile,
        }, {
            bindingName: 'lj-open-file-link-holder-ljStreamMApp', // Open the LJStreamM_open.cfg file
            smartName: 'clickHandler',
            callback: openLJStreamMOpenConfigFile,
        }, {
            bindingName: 'lj-cfg-file-link-holder-ljLogMApp', // Open the LJLogM.cfg file
            smartName: 'clickHandler',
            callback: openLJLogMConfigFile,
        }, {
            bindingName: 'lj-cfg-file-link-holder-ljStreamMApp', // Open the LJStreamM.cfg file
            smartName: 'clickHandler',
            callback: openLJStreamMConfigFile,
        }, {
            bindingName: 'lj-app-link-holder-ljLogMApp',
            smartName: 'clickHandler',
            callback: openLJLogMApplication,
        }, {
            bindingName: 'lj-app-link-holder-ljStreamMApp',
            smartName: 'clickHandler',
            callback: openLJStreamMApplication,
        }, {
            bindingName: 'lj-config-and-open-link-holder-ljLogMApp',
            smartName: 'clickHandler',
            callback: getConfigAndOpenInApplication('LJLogM','current'),
        }, {
            bindingName: 'lj-config-and-open-link-holder-ljStreamMApp',
            smartName: 'clickHandler',
            callback: getConfigAndOpenInApplication('LJStreamM','current'),
        }, {
            bindingName: 'lj-config-and-open-link-holder-ljLogMApp-USB',
            smartName: 'clickHandler',
            callback: getConfigAndOpenInApplication('LJLogM','USB'),
        }, {
            bindingName: 'lj-config-and-open-link-holder-ljLogMApp-Ethernet',
            smartName: 'clickHandler',
            callback: getConfigAndOpenInApplication('LJLogM','Ethernet'),
        }, {
            bindingName: 'lj-config-and-open-link-holder-ljLogMApp-WiFi',
            smartName: 'clickHandler',
            callback: getConfigAndOpenInApplication('LJLogM','WiFi'),
        }, {
            bindingName: 'lj-config-and-open-link-holder-ljStreamMApp-USB',
            smartName: 'clickHandler',
            callback: getConfigAndOpenInApplication('LJStreamM','USB'),
        }, {
            bindingName: 'lj-config-and-open-link-holder-ljStreamMApp-Ethernet',
            smartName: 'clickHandler',
            callback: getConfigAndOpenInApplication('LJStreamM','Ethernet'),
        }, {
            bindingName: 'lj-config-and-open-link-holder-ljStreamMApp-WiFi',
            smartName: 'clickHandler',
            callback: getConfigAndOpenInApplication('LJStreamM','WiFi'),
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
            var context = {'isPlatformWindows': process.platform==='win32'};
            var devMachineCWD = process.env.HOME + '\\git\\LabJack\\pm\\ljswitchboard-splash_screen';
            var curCWD = process.cwd();

            context.enableBetaFeatures = false;
            try {
                context.enableBetaFeatures = process.env.npm_package_enableBetaOptions;
            } catch(err) {
                // context.enableBetaFeatures = false;
                // ignore the error.
            }
            if(curCWD === devMachineCWD) {
                context.enableBetaFeatures = true;
            }

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
                'RTC_TIME_S',
                'SNTP_UPDATE_INTERVAL',
                'HARDWARE_VERSION',
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

            promises.push(function performCheckForHardwareIssues() {
                var defered = q.defer();
                device.checkForHardwareIssues()
                .then(function(res) {
                    console.log('HW Issues Results', res);
                    var retData = JSON.parse(JSON.stringify(res));
                    retData.name = 'hwIssues';
                    retData.testResults = [];
                    var tests = Object.keys(res.testResults);
                    tests.forEach(function(key) {
                        retData.testResults.push(res.testResults[key]);
                    });
                defered.resolve(retData);
                }, function(err) {
                    defered.reject(err);
                });
                return defered.promise;
            }());
            promises.push(function getDeviceMicroSDCardDiskInfo() {
                var defered = q.defer();
                if(device.savedAttributes.HARDWARE_INSTALLED.sdCard) {
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
                } else {
                    defered.resolve();
                }
                return defered.promise;
            }());
            promises.push(function getAvailableConnectionTypes() {
                var defered = q.defer();
                device.getAvailableConnectionTypes()
                .then(function(result) {
                    console.log('Available connection types');
                    var connections = result.connections;
                    var isUSB = false;
                    var isEth = false;
                    var isWiFi = false;
                    connections.forEach(function(connection) {
                        if(connection.type === 'USB') {
                            isUSB = connection.isAvailable;
                        }
                        if(connection.type === 'Ethernet') {
                            isEth = connection.isAvailable;
                        }
                        if(connection.type === 'WiFi') {
                            isWiFi = connection.isAvailable;
                        }
                    });
                    defered.resolve({
                        'val': result,
                        'name': 'availableConnections',
                        'isUSB': isUSB,
                        'isEth': isEth,
                        'isWiFi': isWiFi,
                    });
                }, function(err) {
                    defered.reject(err);
                });
                return defered.promise;
            }());
            promises.push(getExtraOperation(device,'getLatestDeviceErrors'));
        // Zander - do we want to keep this in? because we no loger do/use the diget?
        } else if(device.savedAttributes.deviceTypeName === 'Digit') {
            deviceTemplate = handlebars.compile(
                framework.moduleData.htmlFiles.digit_template
            );

            // Extra required data for Digits
            extraRegisters = ['DGT_LIGHT_RAW'];
            promises.push(getExtraOperation(device,'sReadMany', extraRegisters));
            promises.push(getExtraOperation(device,'getLatestDeviceErrors'));
        } else if(device.savedAttributes.deviceTypeName === 'T4') {
            console.warn("so we see it as a t4 corret????")
            deviceTemplate = handlebars.compile(
                framework.moduleData.htmlFiles.t4_template
            );

            // Extra required data for T4s
            extraRegisters = [
                'ETHERNET_IP',
                'POWER_LED',
                'WATCHDOG_ENABLE_DEFAULT',
                'HARDWARE_VERSION',
                // 'RTC_TIME_S', // Not available in T4 FW 0.202
                // 'SNTP_UPDATE_INTERVAL', // Not available in T4 FW 0.202
            ];


            // Not available in T4 FW 0.202
            var secondaryExtraRegisters = [
                'TEMPERATURE_DEVICE_K',
            ];
            // var secondaryExtraRegisters = [];
            promises.push(getExtraOperation(device,'sReadMany', extraRegisters));
            promises.push(getExtraOperation(device,'sReadMany', secondaryExtraRegisters));
            promises.push(getExtraOperation(device,'sRead', 'ETHERNET_MAC'));
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
            promises.push(function performCheckForHardwareIssues() {
                var defered = q.defer();
                device.checkForHardwareIssues()
                .then(function(res) {
                    console.log('HW Issues Results', res);
                    var retData = JSON.parse(JSON.stringify(res));
                    retData.name = 'hwIssues';
                    retData.testResults = [];
                    var tests = Object.keys(res.testResults);
                    tests.forEach(function(key) {
                        retData.testResults.push(res.testResults[key]);
                    });
                    defered.resolve(retData);
                }, function(err) {
                    defered.reject(err);
                });
                return defered.promise;
            }());
            promises.push(function getDeviceAuthStatus() {
                var defered = q.defer();
                device.isAuthorized()
                .then(function(res) {
                    console.log('Device Auth Status', res);
                    var message = "Device is Authorized";
                    var shortMessage = "Authorized";
                    if(!res) {
                        message = "Not authorized, please email support@labjack.com";
                        shortMessage = "Not Authorized";
                    }
                    defered.resolve({
                        'val': res,
                        'name': 'isAuthorized',
                        'message': message,
                        'shortMessage': shortMessage,
                    });
                }, function(err) {
                    defered.reject(err);
                });
                return defered.promise;
            }());
            promises.push(function getAvailableConnectionTypes() {
                var defered = q.defer();
                device.getAvailableConnectionTypes()
                .then(function(result) {
                    console.log('Available connection types');
                    var connections = result.connections;
                    var isUSB = false;
                    var isEth = false;
                    var isWiFi = false;
                    connections.forEach(function(connection) {
                        if(connection.type === 'USB') {
                            isUSB = connection.isAvailable;
                        }
                        if(connection.type === 'Ethernet') {
                            isEth = connection.isAvailable;
                        }
                        if(connection.type === 'WiFi') {
                            isWiFi = connection.isAvailable;
                        }
                    });
                    defered.resolve({
                        'val': result,
                        'name': 'availableConnections',
                        'isUSB': isUSB,
                        'isEth': isEth,
                        'isWiFi': isWiFi,
                    });
                }, function(err) {
                    defered.reject(err);
                });
                return defered.promise;
            }());
            promises.push(getExtraOperation(device,'getLatestDeviceErrors'));
        } else if(device.savedAttributes.deviceTypeName === 'T8') {
            deviceTemplate = handlebars.compile(
                framework.moduleData.htmlFiles.t8_template
            );

            // Extra required data for T8s
            extraRegisters = [
                'ETHERNET_IP',
                'POWER_LED',
                'WATCHDOG_ENABLE_DEFAULT',
                'HARDWARE_VERSION',
                // 'RTC_TIME_S', // Not available in T8 FW 0.202
                // 'SNTP_UPDATE_INTERVAL', // Not available in T8 FW 0.202
            ];

            var secondaryExtraRegisters = [
                'TEMPERATURE_DEVICE_K',
            ];
            // var secondaryExtraRegisters = [];
            promises.push(getExtraOperation(device,'sReadMany', extraRegisters));
            promises.push(getExtraOperation(device,'sReadMany', secondaryExtraRegisters));
            promises.push(getExtraOperation(device,'sRead', 'ETHERNET_MAC'));
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
            promises.push(function performCheckForHardwareIssues() {
                var defered = q.defer();
                device.checkForHardwareIssues()
                .then(function(res) {
                    console.log('HW Issues Results', res);
                    var retData = JSON.parse(JSON.stringify(res));
                    retData.name = 'hwIssues';
                    retData.testResults = [];
                    var tests = Object.keys(res.testResults);
                    tests.forEach(function(key) {
                        retData.testResults.push(res.testResults[key]);
                    });
                    defered.resolve(retData);
                }, function(err) {
                    defered.reject(err);
                });
                return defered.promise;
            }());
            promises.push(function getDeviceAuthStatus() {
                var defered = q.defer();
                device.isAuthorized()
                .then(function(res) {
                    console.log('Device Auth Status', res);
                    var message = "Device is Authorized";
                    var shortMessage = "Authorized";
                    if(!res) {
                        message = "Not authorized, please email support@labjack.com";
                        shortMessage = "Not Authorized";
                    }
                    defered.resolve({
                        'val': res,
                        'name': 'isAuthorized',
                        'message': message,
                        'shortMessage': shortMessage,
                    });
                }, function(err) {
                    defered.reject(err);
                });
                return defered.promise;
            }());
            promises.push(function getAvailableConnectionTypes() {
                var defered = q.defer();
                device.getAvailableConnectionTypes()
                .then(function(result) {
                    console.log('Available connection types');
                    var connections = result.connections;
                    var isUSB = false;
                    var isEth = false;
                    var isWiFi = false;
                    connections.forEach(function(connection) {
                        if(connection.type === 'USB') {
                            isUSB = connection.isAvailable;
                        }
                        if(connection.type === 'Ethernet') {
                            isEth = connection.isAvailable;
                        }
                        if(connection.type === 'WiFi') {
                            isWiFi = connection.isAvailable;
                        }
                    });
                    defered.resolve({
                        'val': result,
                        'name': 'availableConnections',
                        'isUSB': isUSB,
                        'isEth': isEth,
                        'isWiFi': isWiFi,
                    });
                }, function(err) {
                    defered.reject(err);
                });
                return defered.promise;
            }());
            promises.push(getExtraOperation(device,'getLatestDeviceErrors'));
        }

        Promise.allSettled(promises)
        .then(function(results) {
            var data = {};
            results.forEach(function(result) {
                try {
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
                } catch(err) {
                    // console.error('Error parsing results', err);
                    // This handles the error that gets thrown when
                    // trying to read disk-info from a device w/o a uSD card.
                }
            });
            continueFramework(deviceTemplate, data);
        }).catch(err => {
            console.error(err);
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
            var eleA;
            var eleB;
            if(dataKey === 'rtcTime') {
                eleA = $('#' + 'rtc-device-time');
                eleB = $('#' + 'rtc-system-time');
            }
            self.cachedPageControls[key] = {
                'id': id,
                'element': element,
                'save': function(value) {
                    var saved = false;
                    if(dataKey) {
                        if(dataKey == 'rtcTime') {
                            // var eleA = $('#' + 'rtc-device-time');
                            // var eleB = $('#' + 'rtc-system-time');
                            // Zander - This has nothing to do with the 
                            eleA.text(value.t7TimeStr);
                            eleB.text(value.pcTimeStr);
                        } else if(dataKey !== '') {
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
            // TODO - do we really need to be loging everytime we refresh?
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
