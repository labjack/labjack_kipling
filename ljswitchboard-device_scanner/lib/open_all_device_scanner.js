/**
 * Device scanner by OpenAll
 */

var EventEmitter = require('events').EventEmitter;
var util = require('util');
var q = require('q');
var async = require('async');
var driver_const = require('ljswitchboard-ljm_driver_constants');
var data_parser = require('ljswitchboard-data_parser');
var device_curator = require('ljswitchboard-ljm_device_curator');
var modbus_map = require('ljswitchboard-modbus_map');
var constants = modbus_map.getConstants();

var eventList = require('./event_list').eventList;

var REQUIRED_INFO_BY_DEVICE = require('./required_device_info').requiredInfo;
var ds_util = require('../lib/device_scanner_util');

// Constant that controls mock scanning.
var LIVE_DEVICE_SCANNING_ENABLED = true;
var mock_open_all_device_scanner = require('./mock_open_all_device_scanner');
var mockDeviceScanningLib = new mock_open_all_device_scanner.create();

// A variable that will store a reference to the ljm driver
var ljm;
var ljmUtils;

// A variable that will store a reference to the labjack-nodejs driver
var ljmDriver;

/** DEBUGGING OPTIONS **/
var ENABLE_ERROR_OUTPUT = false;
/* Enable debugging for the individual scanning steps */
var DEBUG_SCAN_STEP = false;
/* Enable debugging for the OpenAll calls */
var DEBUG_OPEN_ALL_SCAN = false;
/* Enable debugging for the LJM Calls */
var DEBUG_LJM_CALLS = false;
/*
 * Enable Device Correlation Steps. Device information has already been
 * collected.  This step organizes all of the different "scanned connections"
 * so that they are organized by devices instead of handles.
 */
var DEBUG_DEVICE_CORRELATING = false;
/* Enable debugging for connection type verification.  This is when the 
 * discovered Ethernet and WiFi connection types are verified to make sure that
 * they can be properly used.
 */
var DEBUG_VERIFY_CONNECTION_TYPE = true;
/*
 * Enable debugging for organizing all of the scanned device data to get
 * returned to user.
*/
var DEBUG_ORGANIZE_SCAN_DATA = false;

function getLogger(bool) {
    return function logger() {
        if(bool) {
            console.log.apply(console, arguments);
        }
    };
}

var debugSS = getLogger(DEBUG_SCAN_STEP);
var debugOpenAll = getLogger(DEBUG_OPEN_ALL_SCAN);
var debugLJMCalls = getLogger(DEBUG_LJM_CALLS);
var debugDC = getLogger(DEBUG_DEVICE_CORRELATING);
var debugVCT = getLogger(DEBUG_VERIFY_CONNECTION_TYPE);
var debugOSD = getLogger(DEBUG_ORGANIZE_SCAN_DATA);
var errorLog = getLogger(ENABLE_ERROR_OUTPUT);



/* 
 * Enable debugging for the managed device object.  This prints out information
 * when data is being collected from a device...
 */ 
var DEBUG_MANAGED_DEVICE = false;
/*
 * Enable debugging for device management.  This prints out information about
 * devices that are being added vs not added.  This includes already connected
 * devices.
 */
var DEBUG_DEVICE_MANAGER = false;


var reportAsyncError = function(err) {
    console.log('open_all_device_scanner.js reportAsyncError', err, err.stack);
};


/* 
 * Define how the scan requests are performed.  Synchronously or asynchronously.
 */
var PERFORM_SCAN_REQUESTS_ASYNCHRONOUSLY = true;
/* 
 * Define how device connections are verified.  Synchronously or
 * asynchronously.
 */
var PERFORM_CONNECTION_VERIFICATION_ASYNCHRONOUSLY = true;
/* Define what the open all device scanner is trying to do */
var OPEN_ALL_SCAN_REQUEST_LIST = [
    {
        'deviceType': driver_const.LJM_DT_DIGIT,
        'connectionType': driver_const.LJM_CT_USB,
        'addresses': REQUIRED_INFO_BY_DEVICE.LJM_dtDIGIT,
        'numAttempts': 1,
        'async': false,
    },
    {
        'deviceType': driver_const.LJM_DT_T7,
        'connectionType': driver_const.LJM_CT_USB,
        'addresses': REQUIRED_INFO_BY_DEVICE.LJM_dtT7,
        'numAttempts': 1,
        'async': false,
    },
    {
        'deviceType': driver_const.LJM_DT_T7,
        'connectionType': driver_const.LJM_CT_UDP,
        'addresses': REQUIRED_INFO_BY_DEVICE.LJM_dtT7,
        'numAttempts': 2,
        'async': false,
    },
];

var curatedDeviceEvents = [
    'DEVICE_DISCONNECTED',
    'DEVICE_RECONNECTED',
    'DEVICE_ERROR',
    'DEVICE_RECONNECTING',
    'DEVICE_ATTRIBUTES_CHANGED',
];
var deviceDataParsers = {
    'HARDWARE_INSTALLED': {
        'val': function(data) {
            return {
                'highResADC': data.highResADC,
                'wifi': data.wifi,
                'rtc': data.rtc,
                'sdCard': data.sdCard,
                'productType': data.productType,
            };
        }
    },
    'DEVICE_NAME_DEFAULT': {
        'name': 'deviceName',
    },
    'ETHERNET_IP': {
        'name': 'ethernetIP',
    },
    'WIFI_IP': {
        'name': 'wifiIP',
    },
    'WIFI_RSSI': {
        'name': 'wifiRSSI',
        'val': function(data) {
            return {
                str: data.str,
                val: data.val,
                imageName: data.imageName,
            };
        }
    }
};

function parseDeviceInfo(info, registers) {
    registers.forEach(function(register) {
        var regName = register.split('_').map(function(str) {
            str = str.toLowerCase();
            str = str.charAt(0).toUpperCase() + str.slice(1);
            return str;
        }).join('');
        regName = regName.charAt(0).toLowerCase() + regName.slice(1);

        var dp;
        if(deviceDataParsers[register]) {
            dp = deviceDataParsers[register];
            if(dp.name) {
                regName = dp.name;
            }
        }
        // console.log('Register Name', register, regName);
        var rawVal = info[register];
        var val = rawVal.val;
        var isError = typeof(rawVal.errorCode) !== 'undefined';
        if(!isError) {
            if(deviceDataParsers[register]) {
                dp = deviceDataParsers[register];
                if(dp.val) {
                    val = dp.val(rawVal);
                }
            }
        }
        info[regName] = val;
        // console.log(regName, val);
    });
}

function createManagedDevice(openedDevice, openParameters, curatedDevice) {
    this.log = function() {
        if(DEBUG_MANAGED_DEVICE) {
            console.log.apply(this, arguments);
        }
    };

    this.openedDevice = openedDevice;
    var deviceHandle = openedDevice.handle;
    // Save initialization data to this context.
    this.handle = deviceHandle;
    this.openParameters = openParameters;
    if(curatedDevice) {
        this.openParameters = curatedDevice.savedAttributes.openParameters;
    }
    this.curatedDevice = curatedDevice;


    var dt = driver_const.deviceTypes[this.openParameters.deviceType];
    var dcNames = driver_const.DRIVER_DEVICE_TYPE_NAMES;
    var ljmDTName = dcNames[dt];
    this.requiredInfo = REQUIRED_INFO_BY_DEVICE[ljmDTName];
    this.collectedDeviceData = {};

    function getDeviceInfo() {
        var defered = q.defer();
        debugLJMCalls('Getting Device Info:', self.handle);
        if(LIVE_DEVICE_SCANNING_ENABLED) {
            ljmUtils.getDeviceInfo(
                self.handle,
                self.requiredInfo,
                function(data) {
                    parseDeviceInfo(data, self.requiredInfo);
                    self.collectedDeviceData = data;
                    defered.resolve();
                });
        } else {
            mockDeviceScanningLib.getDeviceInfo(
                self.handle,
                self.requiredInfo,
                function(data) {
                    parseDeviceInfo(data, self.requiredInfo);
                    self.collectedDeviceData = data;
                    defered.resolve();
                });
        }
        return defered.promise;
    }

    function collectDataFromDeviceHandle() {
        self.log('in collectDeviceData', self.handle);
        return getDeviceInfo();
    }

    function collectDataFromCuratedDevice() {
        self.log('in collectDataFromCuratedDevice', self.handle);
        return getDeviceInfo();
    }

    this.collectDeviceData = function() {
        if(self.curatedDevice) {
            return collectDataFromCuratedDevice();
        } else {
            return collectDataFromDeviceHandle();
        }
    };
    this.closeDevice = function() {
        self.log('in closeDevice');
        var promise;
        var defered = q.defer();
        defered.resolve();
        promise = defered.promise;
        return promise;
    };
    var self = this;
}



function createDeviceManager() {
    
    this.log = function() {
        if(DEBUG_DEVICE_MANAGER) {
            console.log.apply(this, arguments);
        }
    };
    this.openDevices = [];

    // Call this function to add a single device handle that needs to become
    // a managed device.
    this.addDevice = function(openedDevice, requiredInfo, openInfo) {
        var promise = undefined;

        var deviceHandle = openedDevice.handle;

        // Check to see if the device handle already exists.
        var deviceExists = self.openDevices.some(function(openDevice) {
            if (openDevice.handle == deviceHandle) {
                return true;
            } else {
                return false;
            }
        });

        if(!deviceExists) {
            self.log('Adding a device handle', deviceHandle);
            // Create a new managed device.
            var newDevice = new createManagedDevice(openedDevice, openInfo);

            // Tell the device to collect information about itself.
            // promise = newDevice.collectDeviceData(requiredInfo);

            var defered = q.defer();
            defered.resolve();
            promise = defered.promise;
            // Save the created curated device object.
            self.openDevices.push(newDevice);
        } else {
            self.log('Not adding device', deviceHandle);
            // Return a resolved promise... aka do nothing...
            var defered = q.defer();
            defered.resolve();
            promise = defered.promise;
        }

        return promise;
    };

    // Call this function when adding multiple device handles.
    this.addDevices = function(deviceHandles, requiredInfo, openInfos) {
        var promises = [];
        deviceHandles.forEach(function(deviceHandle, i) {
            var openInfo = openInfos[i];
            promises.push(self.addDevice(deviceHandle, requiredInfo, openInfo));
        });
        return promises;
    };

    this.addCuratedDevice = function(curatedDevice) {
        var promise = undefined;

        var ljmDevice = curatedDevice.getDevice();
        var deviceHandle = ljmDevice.handle;

        // make the deviceTypeString a more accessable variable.
        var deviceTypeString = curatedDevice.savedAttributes.deviceTypeString;

        // Create a dummy openInfo object.
        var openInfo = {
            'deviceType': 'curatedDevice...',
            'connectionType': 'curatedDevice...',
            'identifier': 'curatedDevice...',
        };

        // Determine what information is required from the device.
        var requiredInfo = REQUIRED_INFO_BY_DEVICE[deviceTypeString];

        // Check to see if the device handle for the curatedDevice has already
        // been added as a managed device.
        var deviceExists = self.openDevices.some(function(openDevice) {
            if (openDevice.handle == deviceHandle) {
                return true;
            } else {
                return false;
            }
        });

        if(!deviceExists) {
            // Unlike the case of adding a device handle, we already have a
            // curated device...
            self.log('Adding curated device', deviceHandle);

            // Create a new managed device.
            var newDevice = new createManagedDevice({
                    'handle': deviceHandle,
                },
                openInfo,
                curatedDevice
            );

            // Tell the managed device that it should collect data from a
            // currently connected, curated device.
            // promise = newDevice.collectDataFromCuratedDevice(
            //     curatedDevice,
            //     requiredInfo
            // );

            var defered = q.defer();
            defered.resolve();
            promise = defered.promise;

            // Save the created curated device object.
            self.openDevices.push(newDevice);
        } else {
            // Return a resolved promise... aka do nothing...
            self.log('Not adding curated device', deviceHandle);

            var defered = q.defer();
            defered.resolve();
            promise = defered.promise;
        }

        return promise;
    };

    this.addCuratedDevices = function(curatedDevices) {
        return curatedDevices.map(self.addCuratedDevice);
    };

    // Call this function to close the devices that were opened by the device
    // scanner.
    this.closeDevicesOpenedByScanner = function() {
        var defered = q.defer();
        
        // Close all of the devices opened by the device scanner.
        var promises = self.openDevices.map(function(openDevice) {
            return openDevice.closeDevice();
        });

        // Wait for all of the devices to be closed.
        q.allSettled(promises)
        .then(function(results) {
            // Empty the array of open devices.
            self.openDevices = [];
            defered.resolve();
        }, function(err) {
            // Empty the array of open devices.
            self.openDevices = [];
            defered.resolve();
        });
        return defered.promise;
    };

    var self = this;
}

function openAllDeviceScanner() {
    this.driver = undefined;
    this.deviceManager = undefined;

    this.scanResults = [];
    this.activeDeviceResults = [];
    this.scanInProgress = false;
    this.sortedResults = [];

    this.disableDeviceScanning = function() {
        var defered = q.defer();
        LIVE_DEVICE_SCANNING_ENABLED = false;
        defered.resolve();
        return defered.promise;
    };

    this.enableDeviceScanning = function() {
        var defered = q.defer();
        LIVE_DEVICE_SCANNING_ENABLED = true;
        defered.resolve();
        return defered.promise;
    };

    this.getDeviceScanningState = function() {
        var defered = q.defer();
        defered.resolve(LIVE_DEVICE_SCANNING_ENABLED);
        return defered.promise;
    };

    function createScannedDeviceManager(bundle) {
        debugSS('in createScannedDeviceManager');
        var defered = q.defer();
        self.deviceManager = new createDeviceManager();
        defered.resolve(bundle);
        return defered.promise;
    }

    /*
     * The function "markAndAddActiveDevices" does...
    */
    function markAndAddActiveDevices(bundle) {
        debugSS('in markAndAddActiveDevices');
        var defered = q.defer();
        var promises = self.deviceManager.addCuratedDevices(
            self.cachedCurrentDevices
        );
        
        // Wait for all of the curated devices to get added.
        q.allSettled(promises)
        .then(function() {
            defered.resolve(bundle);
        }, function() {
            defered.resolve(bundle);
        });

        return defered.promise;
    }

    /*
     * The function performOpenAllScanIteration does...
     */
    function performOpenAllScanIteration(scanMethod, cb) {
        var dt = scanMethod.deviceType;
        var ct = scanMethod.connectionType;
        var requiredInfo = scanMethod.addresses;

        function onErr(err) {
            cb();
        }
        function onSuccess(openAllData) {
            var stopTime = new Date();
            var deltaTime = parseFloat(((stopTime - startTime)/1000).toFixed(2));
            debugSS('Successfully called OpenAll', deltaTime);
            debugLJMCalls('Successfully called OpenAll', deltaTime);
            debugOpenAll('Successfully called OpenAll', deltaTime);
            var openedHandles = openAllData.handles;

            var openedDevices = [];
            openedHandles.forEach(function(openedHandle) {
                openedDevices.push({
                    'handle': openedHandle,
                });
            });


            /* openedHandles is an array of objects aka [ {handle: 0}, {handle: 1}, ... ] */
            debugOpenAll('OpenAll Finished, in onSuccess, data:', dt, ct, openAllData);

            // Build an array of promises indicating when all opened devices are finished being opened.
            var promises = openedDevices.map(function(openedDevice) {
                var openInfo = {
                    'deviceType': dt,
                    'connectionType': ct,
                    'identifier': 'LJM_idANY',
                };
                debugOpenAll('Managing device...', openedDevice);
                var promise = self.deviceManager.addDevice(
                    openedDevice,
                    requiredInfo,
                    openInfo
                );
                return promise;
            });


            // When all devices have been added to the device manager we can return.
            q.allSettled(promises)
            .then(function() {
                cb();
            }, function(err) {
                console.error('Error in performOpenAllScanIteration', err);
                cb();
            });
        }
        var startTime = new Date();
        debugLJMCalls('Calling OpenAll', dt, ct);

        if(LIVE_DEVICE_SCANNING_ENABLED) {
            // Execute the LJM openAll function.
            self.driver.openAll(dt, ct, onErr, onSuccess);
        } else {
            mockDeviceScanningLib.openAll(dt, ct, onErr, onSuccess);
        }
    }

    /*
     * The function performOpenAllScanMethod does...
     */
    function performOpenAllScanMethod(scanMethod, cb) {
        debugOpenAll('in performOpenAllScanMethod');
        var scanIterations = [];
        var numAttempts = scanMethod.numAttempts;
        for(var i = 0; i < numAttempts; i++) {
            scanIterations.push(scanMethod);
        }

        var performAsync = scanMethod.async;

        function finishedScanning() {
            debugOpenAll('Finished performing scanMethod...');
            // We are finished scanning...
            debugOpenAll(
                'Finished performing openAll scans, sm:',
                scanMethod.deviceType,
                scanMethod.connectionType
            );
            cb();
        }

        if(performAsync) {
            async.each(
                scanIterations,
                performOpenAllScanIteration,
                finishedScanning
            );
        } else {
            async.eachSeries(
                scanIterations,
                performOpenAllScanIteration,
                finishedScanning
            );
        }
    }
    /*
     * The function "openAllAvailableDevices" performs several OpenAll function calls to 
     * build up a list of all the currently available LabJack devices.
    */
    function openAllAvailableDevices(bundle) {
        debugSS('in openAllAvailableDevices');
        var defered = q.defer();

        // Save the scan request list to a local variable w/ a shorter name.
        var scanMethods = OPEN_ALL_SCAN_REQUEST_LIST;

        // Save async vs sync option to a local variable w/ a shorter name.
        var performAsync = PERFORM_SCAN_REQUESTS_ASYNCHRONOUSLY;

        var startTime = new Date();
        function finishedScanning() {
            var stopTime = new Date();
            var duration = stopTime - startTime;
            duration = parseFloat((duration/1000).toFixed(3));

            // We are finished scanning...
            if(DEBUG_OPEN_ALL_SCAN) {
                console.log(
                    'Finished performing all openAll scans. Duration:',
                    duration
                );
            }
            defered.resolve(bundle);
        }

        if(performAsync) {
            async.each(
                scanMethods,
                performOpenAllScanMethod,
                finishedScanning
            );
        } else {
            async.eachSeries(
                scanMethods,
                performOpenAllScanMethod,
                finishedScanning
            );
        }
        return defered.promise;
    }

    /*
     * The function "collectRequiredDeviceInfo" does...
    */
    
    function debugPrintFlatScannedData(data, printer) {
        var pInfo = [
            'numConnectionTypes',
            'connectionTypeNames',
            'verifiedConnectionTypeNames',
            'connectionTypes',
            'unverifiedConnectionTypeNames',
        ];
        var pData = {};
        var keys = Object.keys(data);
        keys.forEach(function(key) {
            var dData = data[key];
            var dKeys = Object.keys(dData);
            pData[key] = {};
            var otherKeys = [];
            dKeys.forEach(function(dKey) {
                if(pInfo.indexOf(dKey) >= 0) {
                    pData[key][dKey] = dData[dKey];
                } else {
                    otherKeys.push(dKey);
                }
            });
            // pData[key].keys = otherKeys;
        });
        if(printer) {
            printer('Scanned Data', pData);
        } else {
            console.log('Scanned Data', pData);
        }
    }
    function collectRequiredDeviceInfo(bundle) {
        debugSS('in collectRequiredDeviceInfo');
        // We need to make sure that we have collected the required information
        // from devices that are currently open by the user.
        
        var defered = q.defer();
        var openDevices = self.deviceManager.openDevices;
        var openDeviceAttributes = [];
        var scannedData = {};

        function getDeviceKey(deviceInfo) {
            var dt = deviceInfo.dt;
            var sn = deviceInfo.serialNumber;
            if(typeof(dt) === 'undefined') {
                console.log("ERR", deviceInfo);
            }
            return [dt.toString(), sn.toString()].join('_');
        }

        /*
         * This function is used to initialize a connectionType object that gets
         * added to the connectionTypes array.
         */
        function createDeviceConnectionObj(dt, ct, id) {
            var obj = {
                'dt': dt,
                'ct': ct,
                'id': id,
                'connectionType': ct,
                'connectionTypeStr': driver_const.DRIVER_CONNECTION_TYPE_NAMES[ct],
                'connectionTypeName': driver_const.CONNECTION_TYPE_NAMES[ct],
                'isVerified': false,
                'isScanned': false,
            };
            var ethCT = driver_const.connectionTypes.ethernet;
            var wifiCT = driver_const.connectionTypes.wifi;
            if((ct == ethCT)||(ct == wifiCT)) {
                obj.ip = id;
                // Define the port as the modbus 502 port.
                obj.port = 502;
            }
            return obj;
        }

        /* 
         * This function is used to initialize the connectionTypes array.  Which
         * is a list of the device's available connection types.
         */
        function getDeviceConnectionTypesData(deviceInfo) {
            var connectionTypes = [];

            var foundUSB = false;
            var usbInfo = {};
            var foundEth = false;
            var ethInfo = {};
            var foundWiFi = false;
            var wifiInfo = {};

            var usbCT = driver_const.connectionTypes.usb;
            var ethCT = driver_const.connectionTypes.ethernet;
            var wifiCT = driver_const.connectionTypes.wifi;
            if(deviceInfo.ct === usbCT) {
                usbInfo = createDeviceConnectionObj(
                    deviceInfo.dt,
                    deviceInfo.ct,
                    deviceInfo.serialNumber.toString()
                );
                usbInfo.isVerified = true;
                usbInfo.isScanned = true;
                foundUSB = true;
            } else if(deviceInfo.ct === ethCT) {
                ethInfo = createDeviceConnectionObj(
                    deviceInfo.dt,
                    deviceInfo.ct,
                    deviceInfo.ip
                );
                ethInfo.isVerified = false;
                ethInfo.isScanned = true;
                foundEth = true;
            } else if(deviceInfo.ct === wifiCT) {
                wifiInfo = createDeviceConnectionObj(
                    deviceInfo.dt,
                    deviceInfo.ct,
                    deviceInfo.ip
                );
                wifiInfo.isVerified = false;
                wifiInfo.isScanned = true;
                foundWiFi = true;
            } else {
                console.error('openall_d_s, Encountered Invalid Connection Type', deviceInfo.ct);
            }

            if(!foundEth) {
                if(deviceInfo.ETHERNET_IP) {
                    if(deviceInfo.ETHERNET_IP.isReal) {
                        ethInfo = createDeviceConnectionObj(
                            deviceInfo.dt,
                            ethCT,
                            deviceInfo.ethernetIP
                        );
                        foundEth = true;
                    }
                }
            }
            if(!foundWiFi) {
                if(deviceInfo.WIFI_IP) {
                    if(deviceInfo.WIFI_IP.isReal) {
                        wifiInfo = createDeviceConnectionObj(
                            deviceInfo.dt,
                            wifiCT,
                            deviceInfo.wifiIP
                        );
                        foundWiFi = true;
                    }
                }
            }

            if(foundUSB) {connectionTypes.push(usbInfo);}
            if(foundEth) {connectionTypes.push(ethInfo);}
            if(foundWiFi) {connectionTypes.push(wifiInfo);}

            // console.log('device connection types', deviceInfo.ct, deviceInfo.WIFI_IP, deviceInfo.ETHERNET_IP);

            return connectionTypes;
        }

        /* This function is used to combine connection type data */
        function appendDeviceConnectionTypesData(origCTs, newCTs, di) {
            newCTs.forEach(function(newCT) {
                var isFound = origCTs.some(function(origCT) {
                    if(origCT.connectionType === newCT.connectionType) {
                        // If we found an already existing connection type then
                        // we need to set the isVerified and isScanned
                        // properties.
                        if(newCT.isVerified) {
                            origCT.isVerified = true;
                        }
                        if(newCT.isScanned) {
                            origCT.isScanned = true;
                        }
                        return true;
                    } else {
                        return false;
                    }
                });

                if(!isFound) {
                    debugDC('New CT!', di.serialNumber, newCT.connectionTypeName);
                    origCTs.push(newCT);
                } else {
                    debugDC('Dup CT!', di.serialNumber, newCT.connectionTypeName);
                }
            });
            return origCTs;
        }

        /* This function saves a device's info to the scannedData object. */
        function saveDeviceInfo(deviceInfo) {
            debugDC('in saveDeviceInfo');
            var key = getDeviceKey(deviceInfo);
            var connectionTypes = [];
            var newConnectionTypes = getDeviceConnectionTypesData(deviceInfo);

            if(scannedData[key]) {
                // The data has already been added.
                connectionTypes = scannedData[key].connectionTypes;
            } else {
                // The data has not been added.  Object needs to be initialized.
                scannedData[key] = {};
            }

            // Append new connection types to the connectionTypes array.
            debugDC('Initial CTS', connectionTypes.length, newConnectionTypes.length);
            connectionTypes = appendDeviceConnectionTypesData(
                connectionTypes,
                newConnectionTypes,
                deviceInfo
            );
            debugDC('Appended CTS', connectionTypes.length);

            // Parse the connectionTypes array to populate a few remaining
            // variables.
            scannedData[key].numConnectionTypes = connectionTypes.length;
            scannedData[key].connectionTypeNames = connectionTypes.map(function(ct) {
                return ct.connectionTypeName;
            });

            // Determine what connections are and aren't verified.
            scannedData[key].unverifiedConnectionTypes = [];
            scannedData[key].unverifiedConnectionTypeNames = [];
            scannedData[key].verifiedConnectionTypeNames = [];
            connectionTypes.forEach(function(ct) {
                var ctn = ct.connectionTypeName;
                if(ct.isVerified) {
                    scannedData[key].verifiedConnectionTypeNames.push(ctn);
                } else {
                    scannedData[key].unverifiedConnectionTypes.push(ct);
                    scannedData[key].unverifiedConnectionTypeNames.push(ctn);
                }
            });

            // Save the connectionTypes array.
            scannedData[key].connectionTypes = connectionTypes;

            // Save the deviceInfo object to the scannedData object.
            var iKeys = Object.keys(deviceInfo);
            iKeys.forEach(function(iKey) {
                if(typeof(scannedData[key][iKey]) === 'undefined') {
                    scannedData[key][iKey] = deviceInfo[iKey];
                }
            });
        }

        // Perform the device data collection.
        var promises = self.deviceManager.openDevices.map(function(openDevice) {
            return openDevice.collectDeviceData();
        });
        
        // Wait for the device data collection to happen.
        q.allSettled(promises)
        .then(function() {
            debugSS('Finished Collecting Device Data');
            openDevices.forEach(function(openDevice) {
                debugSS('Organizing Collected Data...');
                var cd = openDevice.collectedDeviceData;
                try {
                    saveDeviceInfo(cd);
                } catch(err) {
                    console.log('ERR', err, err.stack);
                }
                // console.log('collected data', Object.keys(cd));
            });
            if(DEBUG_DEVICE_CORRELATING) {
                debugPrintFlatScannedData(scannedData, debugDC);
            }
            bundle.scannedData = scannedData;
            defered.resolve(bundle);
        }, function(err) {
            defered.resolve(bundle);
        });
        return defered.promise;
    }

    function verifyUnverifiedConnectionType(ct) {
        var defered = q.defer();
        debugVCT('Verifying CT:', ct.dt, ct.ct, ct.id);
        debugLJMCalls('Verifying CT:', ct.dt, ct.ct, ct.id);
        if(LIVE_DEVICE_SCANNING_ENABLED) {
            ljmUtils.verifyDeviceConnection(ct.dt, ct.ct, ct.id, function(res) {
                ct.isVerified = res.isVerified;
                defered.resolve();
            });
        } else {
            mockDeviceScanningLib.verifyDeviceConnection(ct.dt, ct.ct, ct.id, function(res) {
                ct.isVerified = res.isVerified;
                defered.resolve();
            });
        }
        return defered.promise;
    }
    function verifyUnverifiedConnectionTypes(deviceInfo) {
        var defered = q.defer();
        if(PERFORM_CONNECTION_VERIFICATION_ASYNCHRONOUSLY) {
            var promises = [];
            deviceInfo.connectionTypes.forEach(function(ct) {
                if(!ct.isVerified) {
                    promises.push(verifyUnverifiedConnectionType(ct));
                }
            });
            q.allSettled(promises)
            .then(function(res) {
                defered.resolve();
            }, function(err) {
                defered.resolve();
            });
        } else {
            async.eachSeries(
                deviceInfo.connectionTypes,
                function syncVerifyConnectionType(ct, cb) {
                    if(!ct.isVerified) {
                        verifyUnverifiedConnectionType(ct)
                        .then(cb, cb);
                    } else {
                        cb();
                    }
                }, function(err) {
                    defered.resolve();
                });
        }
        return defered.promise;
    }
    function updateScannedDataInfo(bundle) {
        var scannedData = bundle.scannedData;
        var keys = Object.keys(scannedData);
        keys.forEach(function(key) {
            var connectionTypes = scannedData[key].connectionTypes;
            scannedData[key].unverifiedConnectionTypes = [];
            scannedData[key].unverifiedConnectionTypeNames = [];
            scannedData[key].verifiedConnectionTypeNames = [];
            connectionTypes.forEach(function(ct) {
                var ctn = ct.connectionTypeName;
                if(ct.isVerified) {
                    scannedData[key].verifiedConnectionTypeNames.push(ctn);
                } else {
                    scannedData[key].unverifiedConnectionTypes.push(ct);
                    scannedData[key].unverifiedConnectionTypeNames.push(ctn);
                }
            });
        });
        return bundle;
    }
    function verifyDeviceConnections(bundle) {
        debugSS('in verifyDeviceConnections');
        var defered = q.defer();
        var openDevices = self.deviceManager.openDevices;
        var scannedData = bundle.scannedData;
        var keys = Object.keys(scannedData);

        if(PERFORM_CONNECTION_VERIFICATION_ASYNCHRONOUSLY) {
            var promises = keys.map(function(key) {
                return verifyUnverifiedConnectionTypes(scannedData[key]);
            });
            q.allSettled(promises)
            .then(function(res) {
                bundle = updateScannedDataInfo(bundle);
                if(DEBUG_VERIFY_CONNECTION_TYPE) {
                    debugPrintFlatScannedData(bundle.scannedData);
                }
                defered.resolve(bundle);
            }, function(err) {
                defered.resolve(bundle);
            });
        } else {
            async.eachSeries(
                keys,
                function syncVerifyConnectionTypes(key, cb) {
                    verifyUnverifiedConnectionTypes(scannedData[key])
                    .then(cb, cb);
                }, function(err) {
                    defered.resolve(bundle);
                });
        }
        return defered.promise;
    }

    function sortScannedDeviceData(deviceTypesArray, deviceInfo) {
        debugOSD('Device Info', Object.keys(deviceInfo));
        var dt = deviceInfo.dt;
        var dts = deviceInfo.deviceTypeStr;
        var dtn = deviceInfo.deviceTypeName;

        var deviceTypeExists = false;
        deviceTypesArray.some(function(deviceType) {
            if(deviceType.deviceTypeString === dts) {
                // Given that the device type exists, lets add this device's
                // info to the devices array.
                deviceType.devices.push(deviceInfo);
                deviceTypeExists = true;
                return true;
            }
            return false;
        });

        if(!deviceTypeExists) {
            // The device type doesn't exist so we need to create one.
            deviceTypesArray.push({
                'deviceType': dt,
                'deviceTypeString': dts,
                'deviceTypeName': dtn,
                'devices': [deviceInfo],
            });
        }
    }

    function organizeCollectedDeviceData(bundle) {
        debugSS('in organizeCollectedDeviceData');
        var defered = q.defer();
        var deviceTypes = [];
        var scannedData = bundle.scannedData;
        var keys = Object.keys(scannedData);
        keys.forEach(function(key) {
            sortScannedDeviceData(deviceTypes, scannedData[key]);
        });
        bundle.deviceTypes = deviceTypes;
        debugOSD('Scanned Device Types', deviceTypes);
        defered.resolve(bundle);
        return defered.promise;
    }

    /*
     * The function "closeInactiveDevices" does...
    */
    function closeInactiveDevices(bundle) {
        debugSS('in closeInactiveDevices');
        var defered = q.defer();

        self.deviceManager.closeDevicesOpenedByScanner()
        .then(function() {
            defered.resolve(bundle);
        })
        .catch(function() {
            defered.resolve(bundle);
        });
        return defered.promise;
    }

    /*
     * The function "returnResults" does...
    */
    function returnResults(bundle) {
        console.log('in returnResults');
        var defered = q.defer();
        defered.resolve(bundle.deviceTypes);
        return defered.promise;
    }

    function createFindAllDevicesBundle() {
        return {
            'findAllBundle': 'me!!',
            'secondaryIPAddresses': [],
            'scannedData': {},
            'unverifiedConnectionTypes': [],
            'deviceTypes': [],
        };
    }
    this.originalOldfwState = 0;

    this.cachedCurrentDevices = [];
    this.findAllDevices = function(currentDevices) {
        console.log('Finding all devices...');
        var defered = q.defer();
        if (self.scanInProgress) {
            defered.reject('Scan in progress');
            return defered.promise;
        }

        self.scanInProgress = true;
        if(currentDevices) {
            if(Array.isArray(currentDevices)) {
                self.cachedCurrentDevices = currentDevices;
            } else {
                self.cachedCurrentDevices = [];
            }
        } else {
            self.cachedCurrentDevices = [];
        }

        var numToDelete;
        var i;
        // Empty the cached scanResults
        numToDelete = self.scanResults.length;
        for(i = 0; i < numToDelete; i++) {
            delete self.scanResults[i];
        }
        self.scanResults = [];

        // Empty the cached activeDeviceResults
        numToDelete = self.activeDeviceResults.length;
        for(i = 0; i < numToDelete; i++) {
            delete self.activeDeviceResults[i];
        }
        self.activeDeviceResults = [];

        // Empty the cached sortedResults
        numToDelete = self.sortedResults.length;
        for(i = 0; i < numToDelete; i++) {
            delete self.sortedResults[i];
        }
        self.sortedResults = [];

        var getOnError = function(msg) {
            return function(err) {
                console.error('An Error', err, msg, err.stack);
                var errDefered = q.defer();
                errDefered.reject(err);
                return errDefered.promise;
            };
        };

        var bundle = createFindAllDevicesBundle();

        if(LIVE_DEVICE_SCANNING_ENABLED) {
            // Create the device manager object.
            createScannedDeviceManager(bundle)

            // Mark the devices that are currently open and should not be closed.
            .then(markAndAddActiveDevices, getOnError('createScannedDeviceManager'))

            // Incrementally open as many devices as possible via USB and UDP connections.
            .then(openAllAvailableDevices, getOnError('markAndAddActiveDevices'))

            // Collect the required information about each opened device.
            .then(collectRequiredDeviceInfo, getOnError('openAllAvailableDevices'))

            // Verify the un-verified device connection types.
            .then(verifyDeviceConnections, getOnError('collectRequiredDeviceInfo'))

            // Organize the collected device data.
            .then(organizeCollectedDeviceData, getOnError('verifyDeviceConnections'))

            // Close the devices that aren't currently open.
            .then(closeInactiveDevices, getOnError('organizeCollectedDeviceData'))

            // Compile the data that needs to be returned to the user.
            .then(returnResults, getOnError('closeInactiveDevices'))

            // Resolve or reject the promise.
            .then(defered.resolve, defered.reject)

            .catch(function(err) {
                console.log('Error!!! LIVE_DEVICE_SCANNING_ENABLED', err);
            });
            // console.log('hasOpenAll');
            // createInternalFindAllDevices(
            //     scanByOpenAllPeek,
            //     OPEN_ALL_SCAN_REQUEST_LIST
            // )()
            // .then(markActiveDevices, getOnError('findAllByOpenAllPeek'))
            // .then(sortResultConnectionTypes, getOnError('markActiveDevices'))
            // .then(sortScanResults, getOnError('sortResultConnectionTypes'))
            // .then(returnResults, getOnError('sortScanResults'))
            // .then(defered.resolve, defered.reject);
            // defered.resolve({'data':'dummy data'});
        } else {
            // internalFindMockDevices()
            // .then(populateMissingScanData, getOnError('internalFindMockDevices'))
            // .then(markActiveDevices, getOnError('populateMissingScanData'))
            // .then(sortResultConnectionTypes, getOnError('markActiveDevices'))
            // .then(sortScanResults, getOnError('sortResultConnectionTypes'))
            // .then(returnResults, getOnError('sortScanResults'))
            // .then(defered.resolve, defered.reject);
            defered.resolve({'data':'dummy data'});
        }
        return defered.promise;
    };

    this.getLastFoundDevices = function() {
        var defered = q.defer();
        if(!self.scanInProgress) {
            defered.resolve(self.sortedResults);
        } else {
            defered.resolve([]);
        }
        return defered.promise;
    };

    this.addMockDevice = function(device) {
        return mockDeviceScanningLib.addDevice(device);
    };

    this.addMockDevices = function(devices) {
        return mockDeviceScanningLib.addDevices(devices);
    };

    var self = this;
}
util.inherits(openAllDeviceScanner, EventEmitter);

exports.openAllDeviceScanner = openAllDeviceScanner;

var createDeviceScanner = function(driver) {
    var ds = new openAllDeviceScanner();
    ds.driver = driver;
    ds.hasOpenAll = driver.hasOpenAll;
    ljm = require('ljm-ffi').load();
    ljmUtils = require('./ljm_utils/ljm_utils');
    ljmDriver = driver;
    return ds;
};

exports.createDeviceScanner = createDeviceScanner;
