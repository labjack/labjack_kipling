/**
 * Logic to upgrade the firmware on a LabJack T7.
 *
 * @author Chris Johnson (chrisjohn404)
 * @author Sam Pottinger (samnsparky)
**/

var fs = require('fs');
var async = require('async');
var labjack_nodejs = require('@labjack/labjack-nodejs');
var ljmDriver = new labjack_nodejs.driver();
var q = require('q');
var request = require('request');
var modbus_map = require('@labjack/ljswitchboard-modbus_map').getConstants();
var semver = require('semver');
var USE_MODERN_BUFFER_ALLOC = semver.gt(process.version, '8.0.0');

var driver_const = labjack_nodejs.driver_const;

var DEBUG_CHECK_ERASE = true;
var DEBUG_CHECK_WRITE = true;
var DEBUG_FIRMWARE_UPGRADE_PROCESS = true;
var ALLOWED_IMAGE_INFO_DEVICE_TYPES = [
    driver_const.T4_TARGET,
    driver_const.T4_RECOVERY_TARGET,
];


var UPGRADE_TARGET_FLASH_INFO = {};
UPGRADE_TARGET_FLASH_INFO[driver_const.T7_TARGET_OLD.toString()] = {
    'imageKey': driver_const.T7_EFkey_ExtFirmwareImage,
    'imageAddress': driver_const.T7_EFAdd_ExtFirmwareImage,
    'imageInfoKey': driver_const.T7_EFkey_ExtFirmwareImgInfo,
    'imageInfoAddress': driver_const.T7_EFAdd_ExtFirmwareImgInfo,
    'imagePageSize': driver_const.T7_IMG_FLASH_PAGE_ERASE,
    'verifyFirmwareVersion': true,
    'isRecoveryFW': false,
    'requiredProductID': driver_const.LJM_DT_T7,
};
UPGRADE_TARGET_FLASH_INFO[driver_const.T7_TARGET.toString()] = {
    'imageKey': driver_const.T7_EFkey_ExtFirmwareImage,
    'imageAddress': driver_const.T7_EFAdd_ExtFirmwareImage,
    'imageInfoKey': driver_const.T7_EFkey_ExtFirmwareImgInfo,
    'imageInfoAddress': driver_const.T7_EFAdd_ExtFirmwareImgInfo,
    'imagePageSize': driver_const.T7_IMG_FLASH_PAGE_ERASE,
    'verifyFirmwareVersion': true,
    'isRecoveryFW': false,
    'requiredProductID': driver_const.LJM_DT_T7,
};
UPGRADE_TARGET_FLASH_INFO[driver_const.T7_RECOVERY_TARGET.toString()] = {
    'imageKey': driver_const.T7_EFkey_EmerFirmwareImage,
    'imageAddress': driver_const.T7_EFAdd_EmerFirmwareImage,
    'imageInfoKey': driver_const.T7_EFkey_EmerFirmwareImgInfo,
    'imageInfoAddress': driver_const.T7_EFAdd_EmerFirmwareImgInfo,
    'imagePageSize': driver_const.T7_RECOVERY_IMG_FLASH_PAGE_ERASE,
    'verifyFirmwareVersion': false,
    'isRecoveryFW': true,
    'requiredProductID': driver_const.LJM_DT_T7,
};
UPGRADE_TARGET_FLASH_INFO[driver_const.T4_TARGET.toString()] = {
    'imageKey': driver_const.T7_EFkey_ExtFirmwareImage,
    'imageAddress': driver_const.T7_EFAdd_ExtFirmwareImage,
    'imageInfoKey': driver_const.T7_EFkey_ExtFirmwareImgInfo,
    'imageInfoAddress': driver_const.T7_EFAdd_ExtFirmwareImgInfo,
    'imagePageSize': driver_const.T7_IMG_FLASH_PAGE_ERASE,
    'verifyFirmwareVersion': true,
    'isRecoveryFW': false,
    'requiredProductID': driver_const.LJM_DT_T4,
};
UPGRADE_TARGET_FLASH_INFO[driver_const.T4_RECOVERY_TARGET.toString()] = {
    'imageKey': driver_const.T7_EFkey_EmerFirmwareImage,
    'imageAddress': driver_const.T7_EFAdd_EmerFirmwareImage,
    'imageInfoKey': driver_const.T7_EFkey_EmerFirmwareImgInfo,
    'imageInfoAddress': driver_const.T7_EFAdd_EmerFirmwareImgInfo,
    'imagePageSize': driver_const.T7_RECOVERY_IMG_FLASH_PAGE_ERASE,
    'verifyFirmwareVersion': false,
    'isRecoveryFW': true,
    'requiredProductID': driver_const.LJM_DT_T4,
};

var DEFAULT_UPGRADE_TARGET_FLASH_INFO = {
    'imageKey': driver_const.T7_EFkey_ExtFirmwareImage,
    'imageAddress': driver_const.T7_EFAdd_ExtFirmwareImage,
    'imageInfoKey': driver_const.T7_EFkey_ExtFirmwareImgInfo,
    'imageInfoAddress': driver_const.T7_EFAdd_ExtFirmwareImgInfo,
    'imagePageSize': driver_const.T7_IMG_FLASH_PAGE_ERASE,
    'verifyFirmwareVersion': true,
    'isRecoveryFW': false,
};


var EXPECTED_ZEROED_MEM_VAL = 4294967295; // 0xFFFFFFFF
var EXPECTED_REBOOT_WAIT = 1000;
var EXPECTED_FIRMWARE_UPDATE_TIME = 5000;

var CHECKPOINT_ONE_PERCENT = 10;
var CHECKPOINT_TWO_PERCENT = 30;
var CHECKPOINT_THREE_PERCENT = 85;
var CHECKPOINT_FOUR_PERCENT = 90;
var CHECKPOINT_FIVE_PERCENT = 100;

var RECOVERY_FIRMWARE_VERSIONS = [0.6602, 0.6604];

function isRecoveryFirmwareVersion(versionToCheck) {
    var isRecoveryVersion = RECOVERY_FIRMWARE_VERSIONS.some(function(fwV) {
        if(parseFloat(versionToCheck) == parseFloat(fwV)) {
            return true;
        } else {
            return false;
        }
    });
    return isRecoveryVersion;
}

var nop = function(){};

function createT4Upgrader() {
var curOffset = 0;
var curScaling = 0;
var shouldUpdateProgressBar = false;

/**
 * Reject a deferred / promise because of an error.
 *
 * @param {q.deferred} deferred The deferred whose promise should be rejected.
 * @param {Object} error Error object optionally with a retError attribute. If
 *      there is a retError attribute on the provided error object, that
 *      retError will be the reported value of the error. Otherwise the error's
 *      toString method will be used.
 * @param {String} prefix Optional string that will be prepended to the error
 *      message the provided deferred execution / promise will be rejected with.
 *      If not provided, the error number / message provided by the error's
 *      retError or toString method will be used.
**/
function safelyReject (deferred, error, prefix) {
    var errorMsg;
    if (error.retError === undefined) {
        errorMsg = error.toString();
    } else {
        errorMsg = error.retError.toString();
    }

    if (prefix === undefined) {
        deferred.reject(errorMsg);
    } else {
        deferred.reject(prefix + errorMsg);
    }
}


/**
 * Create a closure over a deferred execution for error handling.
 *
 * Creates a closure that, when executed with an error, will reject the provided
 * deferred execution / promise. The returned function should be called with
 * a single parameter: an error. This error object can optionally have with a
 * retError attribute. If there is a retError attribute on the provided error
 * object, that retError will be the reported value of the error. Otherwise the
 * error's toString method will be used.
 *
 * @param {q.deferred} deferred The deferred execution / promise to reject when
 *      the resulting function is called.
 * @return {function} Closure over the provided deferred. This funciton will
 *      take a single error parameter and reject the provided deferred / promise
 *      when executed.
**/
function createSafeReject (deferred) {
    return function (error) {
        return safelyReject(deferred, error);
    };
}


/**
 * Create a range enumeration like in Python.
 *
 * @param {int} start The first number in the sequence (inclusive).
 * @param {int} stop The last number in the sequence (non-inclusive).
 * @param {int} step The integer distance between members of the returned
 *      sequence.
 * @return {Array} Array with the numerical sequence.
 * @author Tadeck - http://stackoverflow.com/questions/8273047
**/
function range(start, stop, step) {
    if (typeof stop=='undefined') {
        // one param defined
        stop = start;
        start = 0;
    }
    if (typeof step=='undefined') {
        step = 1;
    }
    if ((step>0 && start>=stop) || (step<0 && start<=stop)) {
        return [];
    }
    var result = [];
    for (var i=start; step>0 ? i<stop : i>stop; i+=step) {
        result.push(i);
    }
    return result;
}


/**
 * Structure containing device and firmware information.
 *
 * Structure containing device and firmware information that is passed along the
 * pipeline of steps used to upgrade a device.
**/
function DeviceFirmwareBundle() {
    var firmwareImageInformation = null;
    var firmwareImage = null;
    var deviceImage = null;
    var device = null;
    var curatedDevice = null;

    var initialDeviceState = {};

    var version = null;
    var serial = null;
    var connectionType = null;
    var deviceType = null;
    var deviceTypeString = null;

    var progressListener = null;

    this.setProgressListener = function(newListener) {
        progressListener = newListener;
    };
    this.getProgressListener = function() {
        return progressListener;
    };
    this.updateProgressScaled = function(value) {
        if (shouldUpdateProgressBar) {
            var scaledValue = curScaling * value + curOffset;
            progressListener.updatePercentage(scaledValue, nop);
            // console.log('Updating progress...', serial, scaledValue);
        }
    };
    /**
     * Get the raw contents of the firmware image.
     *
     * Get the contents of the firmware that the device is being upgraded to.
     * This is the raw file contents (binary) as read from the firmware bin
     * file.
     *
     * @return {Buffer} A node standard library Buffer with the raw firmware
     *      file contents.
    **/
    this.getFirmwareImage = function() {
        return firmwareImage;
    };

    /** 
     * Specify the raw contents of the firmware image.
     *
     * Provide the firmware that the device should be upgraded to. This is the
     * raw contents (binary) that will be written as the firmware image to the
     * device.
     *
     * @param {Buffer} newFirmwareImage A node standard library Buffer with the
     *      raw firmware (file) contents.
    **/
    this.setFirmwareImage = function(newFirmwareImage) {
        firmwareImage = newFirmwareImage;
    };

    /**
     * Get the image information header.
     *
     * Get the image information header for the firmware image that is being
     * written to the device.
     *
     * @return {Object} Object with information about the image being written
     *      to the device.
    **/
    this.getFirmwareImageInformation = function() {
        return firmwareImageInformation;
    };

    function getUpgradeTargetFlashInfo() {
        var upgradeTarget = firmwareImageInformation.intendedDevice;
        var upgradeTargetStr = upgradeTarget.toString();
        var info = UPGRADE_TARGET_FLASH_INFO[upgradeTargetStr];
        // console.log('Returning Flash Info', info);
        if(false) {
            var keys = Object.keys(info);
            keys.forEach(function(key) {
                var  numStr = info[key].toString(16).toUpperCase();
                console.log('Flash Info: ' + key, '0x' + numStr);
            });
        }
        if(info) {
            return info;
        } else {
            return DEFAULT_UPGRADE_TARGET_FLASH_INFO;
        }
    }
    this.getUpgradeTargetFlashInfo = getUpgradeTargetFlashInfo;

    function isLoadingRecoveryFW() {
        var info = getUpgradeTargetFlashInfo();
        return info.isRecoveryFW;
    }
    this.isLoadingRecoveryFW = isLoadingRecoveryFW;

    this.setConnectionType = function(newConnectionType) {
        connectionType = newConnectionType;
    };
    this.setDeviceType = function(newDeviceType) {
        var dtInt = driver_const.deviceTypes[newDeviceType];
        deviceType = dtInt;
        deviceTypeString = driver_const.DRIVER_DEVICE_TYPE_NAMES[dtInt];
    };

    /**
     * Provide information about the image that is being written.
     *
     * Provide information parsed from the image header about that image.
     * Should include a rawImageInfo attribute that has the Node standard lib
     * Buffer with the raw data read from the bin file.
     *
     * @param {Object} newFirmwareImageInformation Object with parsed firmware
     *      image information.
    **/
    this.setFirmwareImageInformation = function(newFirmwareImageInformation) {
        firmwareImageInformation = newFirmwareImageInformation;
    };

    /**
     * Set the labjack-nodejs device object to operate on.
     *
     * Provide the labjack-nodejs device object that corresponds / encapsulates
     * the device to upgrade.
     *
     * @param {labjack-nodejs.device} newDevice The device to upgrade.
    **/
    this.setDevice = function(newDevice) {
        device = newDevice;
    };

    /**
     * Set the curated device object that is being operated on.
    **/
    this.setCuratedDevice = function(newCuratedDevice) {
        curatedDevice = newCuratedDevice;
    };

    /**
     * Get the device that should be upgraded.
     *
     * Get the labjack-nodejs device that encapsulates the LabJack that should
     * be upgraded.
     *
    **/
    this.getDevice = function() {
        return device;
    };

    /**
     * Get the curated device being upgraded
    **/
    this.getCuratedDevice = function() {
        return curatedDevice;
    };

    /**
     * Get the version of the firmware that is being installed on the device.
     *
     * @return {float} The version of the firmware that is being written to the
     *      device as part of this upgrade.
    **/
    this.getFirmwareVersion = function() {
        return version;
    };

    /**
     * Set the version of the firmware that is being installed on the device.
     *
     * @param {float} The version of the firmware that is being written to the
     *      device as part of this upgrade.
    **/
    this.setFirmwareVersion = function(newVersion) {
        version = newVersion;
    };

    /**
     * Set the serial number of the device that is being upgraded.
     *
     * Record the serial number of the device that is being upgraded. Will be
     * used in device re-enumeration.
     *
     * @param {float} newSerial The serial number of the device taht is being
     *      upgraded.
    **/
    this.setSerialNumber = function(newSerial) {
        serial = newSerial;
    };

    /**
     * Get the serial number of the device that is being upgraded.
     *
     * Get the recorded serial number of the device that is being upgraded. This
     * serial number should be checked against during device re-enumeration.
    **/
    this.getSerialNumber = function() {
        return serial;
    };

    this.getConnectionType = function () {
        return connectionType;
    };

    this.getDeviceType = function() {
        return deviceType;
    };
    this.getDeviceTypeString = function() {
        return deviceTypeString;
    };
    this.getProductType = function() {
        var pt = curatedDevice.savedAttributes.productType;
        return driver_const.deviceTypes[pt];
    };
    
    function interpretData(activeFW, primaryFW, recoveryFW) {
        // var activeFWStr = parseFloat(activeFW).toFixed(4);
        // var recoveryFWStr = parseFloat(recoveryFW).toFixed(4);
        // var isRecoveryFWLoaded = false;
        // if(activeFWStr === recoveryFWStr) {
        //     isRecoveryFWLoaded = true;
        // }
        var isRecoveryFWLoaded = isRecoveryFirmwareVersion(activeFW);
        return {
            'activeFW': parseFloat(activeFW),
            'primaryFW': parseFloat(primaryFW),
            'recoveryFW': parseFloat(recoveryFW),
            'isRecoveryFWLoaded': isRecoveryFWLoaded,
        };
    }
    /**
     * Functions to get and set the device firmware states.
    **/
    this.getInitialDeviceState = function() {
        return initialDeviceState;
    };
    this.setInitialDeviceState = function(activeFW, primaryFW, recoveryFW) {
        initialDeviceState = interpretData(activeFW, primaryFW, recoveryFW);
    };
    this.performDeviceReboot = function() {
        /**
         * Variables...
         * 1. isLoadingRecoveryFW()
         * 2. initialDeviceState.isRecoveryFWLoaded
         *
         * Cases...
         * 1. We are loading a primary fw version & device is executing primary
         * fw.  False, False -> we should re-boot.
         * 2. We are loading recovery fw & device is executing recovery fw.
         * True, True -> we should re-boot (just incase SPC & FIO3 are still
         * connected)
         * 3. We are loading a primary fw & device is executing recovery fw.
         * False, True -> we should re-boot.
         * 4. We are loading a recovery fw & device is executing primary fw.
         * True, False -> We should not re-boot.
        **/
        var loadingRecoveryFW = isLoadingRecoveryFW();
        var executingRecoveryFW = initialDeviceState.isRecoveryFWLoaded;
        if(executingRecoveryFW) {
            return true;
        } else {
            if(loadingRecoveryFW) {
                return false;
            } else {
                return true;
            }
        }
    };
    this.verifyLoadedFirmwareVersion = function() {
        /**
         * We should only verify the loaded firmware version when:
         * 1. We loaded a primary FW and the device was executing its primary fw.
        **/
        var loadingRecoveryFW = isLoadingRecoveryFW();
        var executingRecoveryFW = initialDeviceState.isRecoveryFWLoaded;
        if(!loadingRecoveryFW && !executingRecoveryFW) {
            return true;
        } else {
            return false;
        }
    };

    var tempDataStore = {};
    this.clearTempDataStore = function() {
        tempDataStore = {};
    };
    this.addTempDataStore = function(key, value) {
        tempDataStore[key] = value;
    };
    this.getTempDataStore = function() {
        return tempDataStore;
    };
}


/**
 * Reads the contents of the specified firmware file into memory.
 *
 * Reads the raw contents of the specified firmware file asynchronously. Note
 * that the entire file is read into memory.
 *
 * @param {String} fileSrc The full path to the file to read.
 * @return {q.promise} New DeviceFirmwareBundle without a device loaded but
 *      initalized with the contents of the specified firmware file.
**/
this.readFirmwareFile = function(fileSrc, bundle)
{
    var deferred = q.defer();
    var urlComponents;
    var fileName;
    var parseFile = function (err, data) {
        if (err) {
            deferred.reject('Could not read firmware file: ' + err.toString());
            return;
        }

        var imageFile;
        if(USE_MODERN_BUFFER_ALLOC) {
            imageFile = Buffer.from(data);
        } else {
            imageFile = new Buffer(data);
        }
        var imageInformation;

        try {
            imageInformation = {
                rawImageInfo: imageFile.slice(0, 128),
                headerCode: imageFile.readUInt32BE(driver_const.HEADER_CODE),
                intendedDevice: imageFile.readUInt32BE(
                    driver_const.HEADER_TARGET),
                containedVersion: imageFile.readFloatBE(
                    driver_const.HEADER_VERSION).toFixed(4),
                requiredUpgraderVersion: imageFile.readFloatBE(
                    driver_const.HEADER_REQ_LJSU).toFixed(4),
                imageNumber: imageFile.readUInt16BE(
                    driver_const.HEADER_IMAGE_NUM),
                numImgInFile: imageFile.readUInt16BE(
                    driver_const.HEADER_NUM_IMAGES),
                startNextImg: imageFile.readUInt32BE(
                    driver_const.HEADER_NEXT_IMG),
                lenOfImg: imageFile.readUInt32BE(driver_const.HEADER_IMG_LEN),
                imgOffset: imageFile.readUInt32BE(
                    driver_const.HEADER_IMG_OFFSET),
                numBytesInSHA: imageFile.readUInt32BE(
                    driver_const.HEADER_SHA_BYTE_COUNT),
                options: imageFile.readUInt32BE(72),
                encryptedSHA: imageFile.readUInt32BE(
                    driver_const.HEADER_ENC_SHA1),
                unencryptedSHA: imageFile.readUInt32BE(
                    driver_const.HEADER_SHA1),
                headerChecksum: imageFile.readUInt32BE(
                    driver_const.HEADER_CHECKSUM)
            };

            // Save the required device type
            var reqDev = imageInformation.intendedDevice;
            imageInformation.requiredDT = driver_const.TARGET_TO_REQ_DT[reqDev];
        } catch (e) {
            safelyReject(
                deferred,
                e,
                'Could not read image information: '
            );
            return;
        }

        bundle.setFirmwareImageInformation(imageInformation);
        try {
            bundle.setFirmwareImage(imageFile.slice(128, imageFile.length));    
        } catch (e) {
            safelyReject(
                deferred,
                e,
                'Could not read image: '
            );
            return;
        }        

        var versionStr = fileName.split('_');
        versionStr = versionStr[1];
        try {
            bundle.setFirmwareVersion(Number(versionStr)/10000);
        } catch (e) {
            safelyReject(
                deferred,
                e,
                'Could not firmware version: '
            );
            return;
        }
        deferred.resolve(bundle);
    };

    if ((fileSrc.indexOf('http') === 0) || (fileSrc.indexOf('https') === 0)) {
        urlComponents = fileSrc.split('/');
        fileName = urlComponents[urlComponents.length-1];
        request(
            {url: fileSrc, encoding: null},
            function (error, response, body) {
                // Catch statusCode's that aren't 200 (http: OK)
                if(response.statusCode == 200) {
                    parseFile(error, body);
                } else {
                    deferred.reject(
                        'Failed to query URL, status code: ' + response.statusCode.toString()
                    );
                }
            }
        );
    } else {
        fileName = fileSrc;
        fs.readFile(fileSrc, parseFile);
    }

    return deferred.promise;
};


/**
 * Ensure that the given firmware image is compatible with the given device.
 *
 * @param {DeviceFirmwareBundle} bundle The firmware and corresponding device to
 *      check compatability for.
 * @return {q.promise} Promise that resolves to the provided device bundle.
 * @throws {Error} Thrown if the firmware image is not compatible.
**/
this.checkCompatibility = function(bundle)
{
    var deferred = q.defer();

    var expectedHeaderCode = driver_const.T7_HEAD_FIRST_FOUR_BYTES;
    var imageInformation = bundle.getFirmwareImageInformation();
    var firmwareVersion = bundle.getFirmwareVersion();

    var headerCodeCorrect = imageInformation.headerCode == expectedHeaderCode;
    var intendedDeviceCorrect = ALLOWED_IMAGE_INFO_DEVICE_TYPES.indexOf(
        imageInformation.intendedDevice) != -1;
    var versionCorrect = imageInformation.containedVersion == firmwareVersion;

    console.log('In the checkCompatibility function!!');
    console.log('Intended Device:', imageInformation.intendedDevice);
    console.log('bundle.getDeviceType:', bundle.getDeviceType());
    console.log('bundle.getProductType:', bundle.getProductType());

    // Make sure that the DT and PT results are the same
    var dt = bundle.getDeviceType();
    var pt = bundle.getProductType();
    var dtPtAreEqual = dt == pt;

    // Make sure that the intended device type is the type of device that is
    // being upgraded.
    var curDevIsReqDev = dt == imageInformation.requiredDT;

    console.log('Is intended device?', dtPtAreEqual, curDevIsReqDev);
    intendedDeviceCorrect = intendedDeviceCorrect && dtPtAreEqual && curDevIsReqDev;
    console.log('intendedDeviceCorrect', intendedDeviceCorrect);

    if (headerCodeCorrect && intendedDeviceCorrect && versionCorrect) {
        deferred.resolve(bundle);
    } else {
        if (!headerCodeCorrect)
            deferred.reject(new Error('Invalid header code.'));
        else if(!intendedDeviceCorrect)
            deferred.reject(new Error('Incorrect device type.'));
        else
            deferred.reject(new Error('Incorrect version.'));
    }
    
    return deferred.promise;
};

/**
 * Gets and updates the bundle with the currently loaded firmware version in ex
 * flash.
**/
this.getLoadedPrimaryFW = function(bundle) {
    var defered = q.defer();
    function succFunc(res) {
        bundle.addTempDataStore('primaryFW', res);
        defered.resolve(bundle);
    }
    function errFunc(err) {
        bundle.addTempDataStore('primaryFW', 0.000);
        defered.resolve(bundle);
    }

    var curatedDevice = bundle.getCuratedDevice();
    curatedDevice.getPrimaryFirmwareVersion()
    .then(succFunc, succFunc).catch(errFunc);

    return defered.promise;
};

this.getLoadedEmergencyFW = function(bundle) {
    var defered = q.defer();
    function succFunc(res) {
        bundle.addTempDataStore('recoveryFW', res);
        defered.resolve(bundle);
    }
    function errFunc(err) {
        bundle.addTempDataStore('recoveryFW', 0.000);
        defered.resolve(bundle);
    }
    
    var curatedDevice = bundle.getCuratedDevice();
    curatedDevice.getRecoveryFirmwareVersion()
    .then(succFunc, succFunc).catch(errFunc);
    return defered.promise;
};
this.getLoadedActiveFW = function(bundle) {
    var defered = q.defer();
    function succFunc(res) {
        bundle.addTempDataStore('activeFW', res.val);
        defered.resolve(bundle);
    }
    function errFunc(err) {
        bundle.addTempDataStore('activeFW', 0.000);
        defered.resolve(bundle);
    }
    
    var curatedDevice = bundle.getCuratedDevice();
    curatedDevice.iRead('FIRMWARE_VERSION')
    .then(succFunc, errFunc).catch(errFunc);
    return defered.promise;
};
this.getInitialDeviceFWState = function(bundle) {
    var deferred = q.defer();
    bundle.clearTempDataStore();
    t7Upgrader.getLoadedActiveFW(bundle)
    .then(t7Upgrader.getLoadedEmergencyFW)
    .then(t7Upgrader.getLoadedPrimaryFW)
    .then(function(retBundle) {
        var fwData = retBundle.getTempDataStore();
        retBundle.setInitialDeviceState(
            fwData.activeFW,
            fwData.primaryFW,
            fwData.recoveryFW
        );
        // console.log(
        //     'Finished in getInitialDeviceFWState',
        //     JSON.stringify(retBundle.getInitialDeviceState())
        // );
        deferred.resolve(retBundle);
    });
    return deferred.promise;
};

/**
 * Erases n number of flash pages on the device within the provided bundle.
 *
 * @param {DeviceFirmwareBundle} bundle The bundle with the device to perform
 *      the erase operation on.
 * @param {Number} startAddress The address to start erasing flash pages on.
 * @param {Number} numPages The number of pages to erase;
 * @param {Number} key Permissions key for that range.
 * @return {q.promise} Promise that resolves to the provided bundle after the
 *      erase is complete.
**/
this.eraseFlash = function(bundle, startAddress, numPages, key) {
    var deferred = q.defer();

    var device = bundle.getDevice();
    var pages = range(numPages);
    async.eachSeries(
        pages,
        function (page, callback) {
            device.writeMany(
                [driver_const.T7_MA_EXF_KEY, driver_const.T7_MA_EXF_ERASE],
                [key, startAddress + page * driver_const.T7_FLASH_PAGE_SIZE],
                function (err) { callback(err); },
                function () { callback(null); }
            );
        },
        function (err) {
            if (err) {
                safelyReject(deferred, err);
            } else {
                deferred.resolve(bundle);
            }
        }
    );

    return deferred.promise;
};


/**
 * Erases the existing image in the device within the provided bundle.
 *
 * @param {DeviceFirmwareBundle} bundle The bundle with the device to perform
 *      the erase operation on.
 * @return {q.promise} Promise that resolves to the provided bundle after the
 *      erase is complete.
**/
this.eraseImage = function(bundle) {
    var eraseImageDefered = q.defer();
    var info = bundle.getUpgradeTargetFlashInfo();
    //imagePageSize
    //

    t7Upgrader.eraseFlash(
        bundle,
        info.imageAddress,
        info.imagePageSize,//driver_const.T7_IMG_FLASH_PAGE_ERASE,
        info.imageKey
    ).then(
        function(bundle) {
            eraseImageDefered.resolve(bundle);
        }, function(bundle) {
            createSafeReject(eraseImageDefered)(bundle);
        }
    );

    return eraseImageDefered.promise;
};


/**
 * Erases the existing header in the device within the provided bundle.
 *
 * Erases the existing image information in the device within the provided
 * bundle.
 *
 * @param {DeviceFirmwareBundle} bundle The bundle with the device to perform
 *      the erase operation on.
 * @return {q.promise} Promise that resolves to the provided bundle after the
 *      erase is complete.
**/
this.eraseImageInformation = function(bundle)
{
    var eraseImageInformationDefered = q.defer();
    var info = bundle.getUpgradeTargetFlashInfo();
    t7Upgrader.eraseFlash(
        bundle,
        info.imageInfoAddress,
        driver_const.T7_HDR_FLASH_PAGE_ERASE,
        info.imageInfoKey
    ).then(
        function(bundle) {
            eraseImageInformationDefered.resolve(bundle);
        }, function(bundle) {
            createSafeReject(eraseImageInformationDefered)(bundle);
        }
    );

    return eraseImageInformationDefered.promise;
};


/**
 * Execute a read or write operation on a device's flash memory.
 *
 * As writing / reading flash is both hard and has some overlap between the read
 * and write operation, this convenience function handles flash memory keys as
 * well as address calculation and actual driver call generation.
 *
 * @param {DeviceFirmwareBundle} bundle The bundle with the device to perform
 *      the flash memory operation on.
 * @param {Number} startAddress The starting address where the flash operation
 *      (read or write) should start.
 * @param {Number} lengthInts The size of the data to read or write. This should
 *      be reported in number of integers (4 byte pieces).
 * @param {Number} sizeInts The size of the block to read or write. Should be
 *      specific to the region of flash memory being operated on.
 * @param {Number} ptrAddress The memory pointer modbus address to use to index
 *      into the desired section of flash memory. Should be a constant like
 *      T7_MA_EXF_pREAD. This is a modbus address not a flash address.
 * @param {Number} flashAddress The memory modbus address to index into to get
 *      to the desired sectin of flash memory. Should be a constants like
 *      T7_MA_EXF_READ. This is a modbus address not a flash address.
 * @param {bool} isReadOp Indicate if this is a read operation. If false, this
 *      is a write operation.
 * @param {Number} key The key specific to the section of flash memory used to
 *      authorize / validate this memory operation. Should be a constant.
 * @param {Buffer} data If a write operation, this is the data to write to the
 *      flash memory. Does not need to be provided if a read operation.
 * @param {q.promise} A promise that resolves when the operation finishes or
 *      rejects in case of error. Will resolve to the data written or the the
 *      data read.
**/
var createFlashOperation = function (bundle, startAddress, lengthInts, sizeInts,
    ptrAddress, flashAddress, isReadOp, key, data)
{
    var deferred = q.defer();
    var device = bundle.getDevice();
    
    // Creates a closure over a rw excutiong with an address and size
    var createExecution = function(address, innerSize, writeValues)
    {
        return function (lastResults) {
            var innerDeferred = q.defer();

            var addresses = [];
            var values = [];
            var directions = [];
            var numFrames;
            var numValues;

            // Flash memory pointer
            directions.push(driver_const.LJM_WRITE);

            // Key
            if (key === undefined) {
                numFrames = 2;
                numValues = [1];
            } else {
                // Write for key
                directions.push(driver_const.LJM_WRITE);
                addresses.push(driver_const.T7_MA_EXF_KEY);
                values.push(key);
                numFrames = 3;
                numValues = [1, 1];
            }

            if (isReadOp)
                directions.push(driver_const.LJM_READ);
            else
                directions.push(driver_const.LJM_WRITE);

            addresses.push(ptrAddress);
            values.push(address);
            addresses.push(flashAddress);

            if (isReadOp) {
                for (var i=0; i<innerSize; i++) {
                    values.push(null);
                }
            } else {
                values.push.apply(values, writeValues);
            }

            numValues.push(innerSize);

            // console.log(' calling rwMany', isReadOp, addresses, directions, numValues, values);
            device.rwMany(
                addresses,
                directions,
                numValues,
                values,
                function(err) {
                    // console.log('t7_upgrade: calling rwMany', isReadOp, addresses, directions, numValues, values);
                    // console.log('t7_upgrade: rwMany Error', err);
                    // console.log('Throwing Upgrade Error', err);
                    var callFunc = createSafeReject(innerDeferred);
                    callFunc(err);
                },
                function (newResults) { 
                    delete addresses;
                    delete directions;
                    delete numValues;
                    delete values;
                    lastResults.push.apply(lastResults, newResults);
                    innerDeferred.resolve(lastResults);
                }
            );

            return innerDeferred.promise;
        };
    };

    var getdata = function (imageBuffer, numIntegers, offset) {
        var retArray = [];
        for (var i=0; i<numIntegers; i++) {
            retArray.push(imageBuffer.readUInt32BE(i*4 + offset));
        }
        return retArray;
    };

    var executeOperations = [];
    var size = sizeInts;
    var length = lengthInts;
    var numIterations = Math.floor(length / size);
    var remainder = length % size;
    var shouldAugment = remainder > 0;
    var currentAddress = startAddress;
    var offset = 0;
    var execution;

    for (var i = 0; i<numIterations; i++)
    {
        if (isReadOp) {
            execution = createExecution(
                currentAddress,
                size
            );
        } else {
            execution = createExecution(
                currentAddress,
                size,
                getdata(
                    data,
                    8, // 8 integer max for each rw op.
                    offset
                )
            );
        }
        executeOperations.push(execution);
        currentAddress += size * 4; // 4 bytes per integer written
        offset += 32; // 4 bytes per integer * 8 integers written
    }

    if (shouldAugment && remainder > 0) {
        if (isReadOp) {
            execution = createExecution(
                currentAddress,
                remainder
            );
        } else {
            execution = createExecution(
                currentAddress,
                remainder,
                getdata(
                    data,
                    remainder,
                    offset
                )
            );
        }
        executeOperations.push(execution);
    }

    var numIntsWritten = 0;

    async.reduce(
        executeOperations,
        [],
        function (lastMemoryResult, currentExecution, callback) {
            numIntsWritten += sizeInts;
            bundle.updateProgressScaled(numIntsWritten);
            currentExecution(lastMemoryResult).then(
                function (newMemory){
                    callback(null, newMemory);
                },
                function (err) {
                    callback(err, null);
                }
            );
        },
        function (err, allMemoryRead) {
            if (err) {
                safelyReject(deferred, err);
            } else {
                deferred.resolve(bundle);
            }
        }
    );

    return deferred.promise;
};


/**
 * Reads desired flash memory region from the device.
 *
 * @param {DeviceFirwareBundle} bundle The bundle with the device to read from.
 * @param {Number} startAddress The address to start reading at.
 * @param {Number} length Number of integers to read.
 * @param {Number} size The number of reads to combine in a single read call.
**/
this.readFlash = function(bundle, startAddress, length, size)
{
    var readPtrAddress = driver_const.T7_MA_EXF_pREAD;
    var readFlashAddress = driver_const.T7_MA_EXF_READ;
    var device = bundle.getDevice();
    return createFlashOperation(
        bundle,
        startAddress,
        length,
        size,
        readPtrAddress,
        readFlashAddress,
        true
    );
};


/**
 * Reads image from flash memory.
 *
 * @param {DeviceFirmwareBundle} bundle The bundle with the device to read from.
 * @return {q.promise} Promise that resolves to the image as read from memory
 *      contents.
**/
this.readImage = function(bundle)
{
    var deferred = q.defer();

    var numberOfIntegers = driver_const.T7_IMG_FLASH_PAGE_ERASE *
        driver_const.T7_FLASH_PAGE_SIZE / 4;

    var info = bundle.getUpgradeTargetFlashInfo();
    t7Upgrader.readFlash(
        bundle,
        info.imageAddress,
        numberOfIntegers,
        driver_const.T7_FLASH_BLOCK_WRITE_SIZE
    ).then(
        function (memoryContents) { deferred.resolve(bundle); },
        function (err) { safelyReject(deferred, err); }
    ).done();

    return deferred.promise;
};


/**
 * Reads image information from flash memory.
 *
 * @param {DeviceFirmwareBundle} bundle The bundle with the device to read from.
 * @return {q.promise} Promise that resolves to the image information as read
 *      from memory contents.
**/
this.readImageInformation = function(bundle)
{
    var deferred = q.defer();

    var numberOfIntegers = driver_const.T7_HDR_FLASH_PAGE_ERASE *
        driver_const.T7_FLASH_PAGE_SIZE / 4;

    var info = bundle.getUpgradeTargetFlashInfo();
    t7Upgrader.readFlash(
        bundle,
        info.imageInfoAddress,
        numberOfIntegers,
        driver_const.T7_FLASH_BLOCK_WRITE_SIZE
    ).then(
        function (memoryContents) { deferred.resolve(bundle); },
        function (err) { safelyReject(deferred, err); }
    ).done();

    return deferred.promise;
};


/**
 * Check that all image information and image pages have been erased.
 *
 * @param {DeviceFirmwareBundle} bundle The bundle with the device to check.
 * @return {q.promise} Promise that resovles to the provided bundle.
 * @throws {Error} Error thrown if the image and image information pages on the
 *      specified device are not zeroed.
**/
this.checkErase = function(bundle)
{
    var deferred = q.defer();

    var isAllZeroed = function (memory)
    {
        var memoryLength = memory.length;
        for(var i=0; i<memoryLength; i++)
        {
            if (memory[i] != EXPECTED_ZEROED_MEM_VAL)
                return false;
        }

        return true;
    };

    var checkIfZeroedThenContinue = function (memory) {
        var innerDeferred = q.defer();
        if (isAllZeroed(memory)) {
            innerDeferred.resolve();
        } else {
            innerDeferred.reject(new Error('Not zeroed')); // TODO: Lame error.
        }
    };

    var checkMemory = function (targetFunction)
    {
        return function () {
            var innerDeferred = q.defer();
            targetFunction(bundle).then(function (memory)
            {
                if (!isAllZeroed(memory))
                    deferred.reject(new Error('Memory not zeroed.'));
                else
                    innerDeferred.resolve(bundle);
            });

            return innerDeferred.promise;
        };
    };

    t7Upgrader.readImageInformation(bundle)
    .then(checkIfZeroedThenContinue, createSafeReject(deferred))
    .then(checkMemory(t7Upgrader.readImage), createSafeReject(deferred))
    .then(function () {
        deferred.resolve(bundle);
    }, createSafeReject(deferred));

    return deferred.promise;
};


/**
 * Creates a new flash operation that writes data to flash with a key.
 *
 * @param {DeviceFirmwareBundle} bundle The bundle with the device to write to.
 * @param {Number} startAddress The flash memory address to start writing at.
 * @param {Number} length The number of 4 byte values (integers) to write. This
 *      could be the size of the firmware image file to write for example.
 * @param {Number} size The full block size to write. This could be the flash
 *      block write size for eaxmple.
 * @param {Number} key The key that is provides access to the flash memory. This
 *      is specific to the region of flash being written.
 * @param {Buffer} data The data to write to flash at the given address.
 * @param {q.promise} Promise that resolves after the flash write operation
 *      finishes successfully or fails due to error (will reject on error).
**/
this.writeFlash = function(bundle, startAddress, length, size, key, data) {
    var writePtrAddress = driver_const.T7_MA_EXF_pWRITE;
    var writeFlashAddress = driver_const.T7_MA_EXF_WRITE;
    var device = bundle.getDevice();
    return createFlashOperation(
        bundle,
        startAddress,
        length,
        size,
        writePtrAddress,
        writeFlashAddress,
        false,
        key,
        data
    );
};


/**
 * Write the image in the provided bundle to the device in that bundle.
 *
 * @param {DeviceFirmwareBundle} bundle The bundle to perform the write in.
 * @return {q.promise} Promise that resolves to the provided bundle after the
 *      write is complete.
**/
this.writeImage = function(minPercent, maxPercent) {
    return function (bundle) {
        var deferred = q.defer();
        shouldUpdateProgressBar = true;

        // 4 bytes per integer
        var numberOfIntegers = bundle.getFirmwareImage().length / 4;
        var perecentScaleFactor = (maxPercent - minPercent)/numberOfIntegers;
        curScaling = perecentScaleFactor;
        curOffset = minPercent;

        var info = bundle.getUpgradeTargetFlashInfo();
        t7Upgrader.writeFlash(
            bundle,
            info.imageAddress,
            numberOfIntegers,
            driver_const.T7_FLASH_BLOCK_WRITE_SIZE,
            info.imageKey,
            bundle.getFirmwareImage()
        ).then(
            function (memoryContents) {
                shouldUpdateProgressBar = false;
                deferred.resolve(bundle);
            },
            function (err) {
                var callback = createSafeReject(deferred);
                shouldUpdateProgressBar = false;
                callback(err);
            }
        ).done();

        return deferred.promise;
    };
};


/**
 * Write the header in the provided bundle to the device in that bundle.
 *
 * Write the image information in the provided bundle to the device within that
 * bundle.
 *
 * @param {DeviceFirmwareBundle} bundle The bundle to perform the write in.
 * @return {q.promise} Promise that resolves to the provided bundle after the
 *      write is complete.
**/
this.writeImageInformation = function(minPercent, maxPercent)
{
    return function (bundle) {
        var deferred = q.defer();

        var rawImageInfo = bundle.getFirmwareImageInformation().rawImageInfo;

        // 4 bytes per integer
        var numberOfIntegers = rawImageInfo.length / 4;
        var perecentScaleFactor = (maxPercent - minPercent)/numberOfIntegers;
        curScaling = perecentScaleFactor;
        curOffset = minPercent;

        var info = bundle.getUpgradeTargetFlashInfo();
        t7Upgrader.writeFlash(
            bundle,
            info.imageInfoAddress,
            numberOfIntegers,
            driver_const.T7_FLASH_BLOCK_WRITE_SIZE,
            info.imageInfoKey,
            rawImageInfo
        ).then(
            function (memoryContents) {
                shouldUpdateProgressBar = false;
                deferred.resolve(bundle);
            },
            function (err) {
                var callback = createSafeReject(deferred);
                shouldUpdateProgressBar = false;
                callback(err);
            }
        ).done();

        return deferred.promise;
    };
};


// TODO: Check image write information


/**
 * Check that the proper image / image information was written.
 *
 * @param {DeviceFirmwareBundle} bundle The bundle to perform the check in.
 * @return {q.promise} Promise that resolves to the provided bundle after the
 *      check.
 * @throws {Error} Error thrown if the check fails.
**/
this.checkImageWrite = function(bundle)
{
    var deferred = q.defer();

    t7Upgrader.readImage(bundle).then(function (readImage) {
        var readImageLength = readImage.length;
        var bundleImage = bundle.getFirmwareImage();
        for(var i=0; i<readImageLength; i++)
        {
            if (bundleImage[i] != readImage[i])
                deferred.reject(new Error('Unexpected image data at ' + i));
        }

        deferred.resolve(bundle);
    }, createSafeReject(deferred));

    return deferred.promise;
};


/**
 * Soft reboot the device, instructing it to upgrade in the process.
 *
 * @param {DeviceFirmwareBundle} bundle The bundle to perform the upgrade in.
 * @return {q.promise} Promise that resolves to the provided bundle after the
 *      upgrade and reboot has started.
**/
this.restartAndUpgrade = function(bundle) {
    var deferred = q.defer();
    if(bundle.performDeviceReboot()) {
        var device = bundle.getDevice();
        var self = this;
        device.write(
            driver_const.T7_MA_REQ_FWUPG,
            driver_const.T7_REQUEST_FW_UPGRADE,
            createSafeReject(deferred),
            function () {
                deferred.resolve(bundle);
            }
        );
    } else {
        deferred.resolve(bundle);
    }
    return deferred.promise;
};
this.closeDevice = function(bundle) {
    var deferred = q.defer();
    if(bundle.performDeviceReboot()) {
        var device = bundle.getDevice();
        var curatedDevice = bundle.getCuratedDevice();
        curatedDevice.declareDeviceDisconnected();
        var attributes = curatedDevice.savedAttributes;
        if(DEBUG_FIRMWARE_UPGRADE_PROCESS) {
            console.log(
                'Closing Device',
                device.handle,
                // Object.keys(attributes),
                attributes.identifierString,
                attributes.deviceTypeString,
                attributes.connectionTypeString
            );
        }
        device.close(function(err) {
            deferred.reject(bundle);
        }, function() {
            deferred.resolve(bundle);
        });
    } else {
        deferred.resolve(bundle);
    }
    return deferred.promise;
};
this.forceClose = function(bundle) {
    var deferred = q.defer();
    if(bundle.performDeviceReboot()) {
        var executeCode = true;
        if(typeof(bundle) === 'object') {
            var keys = Object.keys(bundle);
            if(keys.length == 2) {
                if(keys[0] === 'message', keys[1] === 'error') {
                    executeCode = false;
                }
            } else if(keys.length == 3) {
                if(keys[0] === 'message', keys[1] === 'error', keys[2] === 'errorInfo') {
                    executeCode = false;
                }
            } else if(keys.length == 4) {
                if(keys[0] === 'message', keys[1] === 'error', keys[2] === 'errorInfo', keys[3] === 'errorMessage') {
                    executeCode = false;
                }
            }
        }
        if(executeCode) {
            var curatedDevice = bundle.getCuratedDevice();
            var attributes = curatedDevice.getDeviceAttributes();
            console.error(
                'Force Closing Device',
                device,
                device.handle,
                attributes,
                attributes.identifierString,
                attributes.deviceTypeString,
                attributes.connectionTypeString
            );
            
            var device = bundle.getDevice();
            if(DEBUG_FIRMWARE_UPGRADE_PROCESS) {
                console.log(
                    'Device Info',
                    device.handle,
                    attributes,
                    attributes.identifierString,
                    attributes.deviceTypeString,
                    attributes.connectionTypeString
                );
            }
            device.close(function(err) {
                deferred.resolve(bundle);
            }, function() {
                deferred.resolve(bundle);
            });
        } else {
            deferred.reject(bundle);
        }
    } else {
        deferred.resolve(bundle);
    }
    return deferred.promise;
};
this.pauseForClose = function(bundle) {
    var deferred = q.defer();
    if(bundle.performDeviceReboot()) {
        var continueExec = function() {
            deferred.resolve(bundle);
        };
        setTimeout(continueExec, EXPECTED_FIRMWARE_UPDATE_TIME);
    } else {
        deferred.resolve(bundle);
    }
    return deferred.promise;
};


/**
 * Wait for a device to re-enumerate.
 *
 * Wait for a specific device to re-enumerate. Will look for a device that has
 * the same attributes as the device in the provided bundle and update the
 * provided bundle with that new device after openining.
 *
 * @param {DeviceFirmwareBundle} bundle The bundle with the device information
 *      to match.
 * @return {q.promise} Promise that resolves to the updated bundle.
**/
this.waitForEnumeration = function(bundle)
{
    var curatedDevice = bundle.getCuratedDevice();
    var curatedDeviceAttributes = {};
    var dataToTransfer = [
        'serialNumber',
        'HARDWARE_INSTALLED',
        'ETHERNET_IP',
        // 'WIFI_IP',
        'PRODUCT_ID',
        'HARDWARE_VERSION',
        'ETHERNET_MAC',
        // 'WIFI_MAC',
        'DEVICE_NAME_DEFAULT',
    ];
    
    var isMockDevice = false;
    if(curatedDevice.savedAttributes.isMockDevice) {
        isMockDevice = true;
        dataToTransfer.forEach(function(key) {
            curatedDeviceAttributes[key] = curatedDevice.savedAttributes[key];
        });
        curatedDeviceAttributes.FIRMWARE_VERSION = bundle.getFirmwareVersion();
    }
    var deferred = q.defer();
    var targetSerial = bundle.getSerialNumber();
    this.targetSerial = targetSerial;
    
    if(DEBUG_FIRMWARE_UPGRADE_PROCESS) {
        console.log(
            'in waitForEnumeration',
            curatedDevice.savedAttributes.serialNumber,
            targetSerial,
            isMockDevice,
            bundle.getFirmwareVersion(),
            typeof(bundle.getFirmwareVersion())
        );
    }

    function getCheckForDevice (bundle) {
        console.log('In Get Check For Device...', bundle.getDeviceType());

        this.bundle = bundle;
        this.deviceTypeStr = bundle.getDeviceTypeString();
        this.targetSerial = bundle.getSerialNumber().toString();
        this.connectionType = bundle.getConnectionType();
        var getAllConnectedSerials = function () {
            var innerDeferred = q.defer();
            console.log('Performing List All', self.deviceTypeInteger, self.connectionType);
            ljmDriver.listAll(
                self.deviceTypeStr,
                self.connectionType,
                createSafeReject(innerDeferred),
                function (devicesInfo) {
                    var serials = devicesInfo.map(function (e) {
                        return e.serialNumber;
                    });
                    if(isMockDevice) {
                        serials.push(parseInt(self.targetSerial, 10));
                    }
                    innerDeferred.resolve(serials);
                }
            );

            return innerDeferred.promise;
        };
        this.getAllConnectedSerials = getAllConnectedSerials;
        var checkForDevice = function () {
            console.log('Bundle Info:',self.deviceTypeStr,self.targetSerial,self.connectionType);
            function handleGetAllConSerErr (err) {
                console.log('in handleGetAllConSerErr', err);
            }
            self.getAllConnectedSerials().then(function (serialNumbers) {
                console.log('t7_upgrade.js-Check Scan Results',self.targetSerial,self.connectionType,serialNumbers);
                console.log('Target Serial', targetSerial, self.targetSerial, serialNumbers.indexOf(targetSerial));
                if (serialNumbers.indexOf(targetSerial) != -1) {
                    var newDevice;
                    if(isMockDevice) {
                        var ljmMockDevice = require('./mocks/device_mock');
                        newDevice = new ljmMockDevice.device();
                        newDevice.configureMockDeviceSync(curatedDeviceAttributes);

                        // Configure original curated device object as the
                        // device handle can't be passed back...
                        curatedDevice.configureMockDeviceSync({
                            'FIRMWARE_VERSION': curatedDeviceAttributes.FIRMWARE_VERSION
                        });
                    } else {
                        newDevice = new labjack_nodejs.device();
                        
                    }
                    console.log('t7_upgrade.js-Trying to open device',self.targetSerial,self.connectionType);
                    newDevice.open(
                        self.deviceTypeStr,
                        self.connectionType,
                        self.targetSerial,
                        function(err){
                            if(DEBUG_FIRMWARE_UPGRADE_PROCESS) {
                                console.log('t7_upgrade.js - Open Error',err);
                            }
                            // console.log('t7_upgrade.js-Failed to connect',bundle.getConnectionType(),targetSerial.toString(), err);
                            setTimeout(checkForDevice, EXPECTED_REBOOT_WAIT);
                        },
                        function(succ){
                            if(DEBUG_FIRMWARE_UPGRADE_PROCESS) {
                               console.log('t7_upgrade.js - Open Success',self.targetSerial);
                            }
                            // console.log('t7_upgrade.js-Bundle...',bundle.getConnectionType(),targetSerial.toString());
                            bundle.setDevice(newDevice);
                            deferred.resolve(bundle);
                        }
                    );
                } else {
                    // console.log('HERE, serial number not found',targetSerial,serialNumbers, self.targetSerial);
                    setTimeout(self.checkForDevice, EXPECTED_REBOOT_WAIT);
                }
            }, handleGetAllConSerErr).catch(handleGetAllConSerErr);
        };
        this.checkForDevice = checkForDevice;
        var self = this;
        return checkForDevice;
    }
    var deviceChecker = new getCheckForDevice(bundle);
    setTimeout(deviceChecker, EXPECTED_REBOOT_WAIT);

    return deferred.promise;
};


/**
 * Checks that firmware image / image info matches the firmware on a device.
 *
 * @param {DeviceFirmwareBundle} bundle The bundle with the device to check and
 *      the firmware image / image info to check for.
 * @return {q.promise} Promise that resolves to the provided bundle.
 * @throws {Error} Error thrown if the firmware does not match.
**/
this.checkNewFirmware = function(bundle)
{
    var deferred = q.defer();
    var device = bundle.getDevice();
    if(DEBUG_FIRMWARE_UPGRADE_PROCESS) {
        console.log(
            'Reading device FW version',
            device.handle,
            device.deviceType,
            device.isHandleValid
        );
    }
    var verifyFWVersion = bundle.verifyLoadedFirmwareVersion();
    if(verifyFWVersion) {
        device.read('FIRMWARE_VERSION',
            createSafeReject(deferred),
            function (firmwareVersion) {
                if(DEBUG_FIRMWARE_UPGRADE_PROCESS) {
                    console.log('t7_upgrade.js - Reported Firmware Version', firmwareVersion.toFixed(4));
                }
                var dif = bundle.getFirmwareVersion() - firmwareVersion;
                if(Math.abs(dif) > 0.0001) {
                    var errorMsg = 'New firmware version does not reflect upgrade.';
                    deferred.reject(new Error(errorMsg));
                } else {
                    deferred.resolve(bundle);
                }
                // if(Math.abs(dif) > 0.0001) {
                //     var errorMsg = 'New firmware version does not reflect upgrade.';
                //     console.error('Reported Firmware Version',firmwareVersion);
                //     if(bundle.getFirmwareVersion() > 0.96) {
                //         deferred.reject(new Error(errorMsg))
                //     } else {
                //         deferred.resolve(bundle);
                //     }
                // } else {
                //     deferred.resolve(bundle);
                // }
            }
        );
    } else {
        deferred.resolve(bundle);
    }

    return deferred.promise;
};

/**
 * Facade / entry point for the update firmware pipeline.
 *
 * @param {labjack-nodejs.device} device The device to update.
 * @param {String} firmwareFileLocation The location of the bin file to read the
 *      firmware from.
 * @return {q.promise} Promise that resolves after the build process completes.
**/
var internalUpdateFirmware = function(curatedDevice, device, firmwareFileLocation,
    connectionType, progressListener)
{
    var deferred = q.defer();
    var initialWiFiStatus = 0;
    var initialStartupConfigs = 0;
    var errorEncountered = false;
    var injectDevice = function (bundle) {
        var innerDeferred = q.defer();
        try {
            bundle.setSerialNumber(curatedDevice.savedAttributes.serialNumber);
            bundle.setConnectionType(connectionType);
            bundle.setDeviceType(curatedDevice.savedAttributes.deviceType);
        } catch (e) {
            safelyReject(innerDeferred, e);
        }
        bundle.setCuratedDevice(curatedDevice);
        bundle.setDevice(device);
        innerDeferred.resolve(bundle);
        return innerDeferred.promise;
    };
    var cleanErrorMessageString = function(LJMError) {
        var stringError = LJMError.toString();
        var lowerCaseStr = stringError.toLowerCase();
        var splitStr = lowerCaseStr.split('_');
        return splitStr.join(' ');
    };
    var createErrorMessage = function(step, error, deviceAttributes) {
        var message = 'Encountered an error in step: ' + step.toString();
        

        var errorCode = parseInt(error, 10);
        var info = {};
        var shortMessage = 'Encountered an error in step: ' + step.toString();
        if(errorCode) {
            info = modbus_map.getErrorInfo(errorCode);
            var cleanErrorString = cleanErrorMessageString(info.string);

            shortMessage += ', ' + cleanErrorString + ' (' + error.toString() + ').';
            message += ', ' + cleanErrorString + ' (' + error.toString() + ').';
            // message += ', error ' + error.toString();
            // message += ' (' + info.string + ').';
            if(info.description) {
                message += '  ' + info.description;
            }
            var addCheckWiFiMsg = true;
            if(errorCode == 2355) {
                message += '  Remove the uSD card and try again.';
                addCheckWiFiMsg = false;
            }
            if(errorCode == 1300) {
                message += 'Remove the uSD card and try again.';
                addCheckWiFiMsg = false;
            }
            if(deviceAttributes.isPro) {
                if((deviceAttributes.WIFI_VERSION === 0) && addCheckWiFiMsg) {
                    message += '  Check the WiFi module, it reported a version number of 0.';
                }
            }
        } else {
            message += ', error ' + error.toString();
        }
        return {
            'info': info,
            'message': message,
            'shortMessage': shortMessage,
        };
    };
    
    var reportError = function(message) {
        var errorMessage = '';
        var reportErrorFunc = function(error) {
            var reportErrorDefered = q.defer();
            
            if(errorEncountered) {
                reportErrorDefered.reject(error);
            } else {
                var err;
                var errorMessage = createErrorMessage(
                    message,
                    error,
                    curatedDevice.savedAttributes
                );
                err = {
                    'step': message,
                    'error': error,
                    'errorInfo': errorMessage.info,
                    'errorMessage': errorMessage.message,
                };
                errorEncountered = true;

                updateStatusText(errorMessage.shortMessage)(bundle)
                .then(function() {
                    reportErrorDefered.reject(err);
                });
            }

            // throw error;
            return reportErrorDefered.promise;
        };
        return reportErrorFunc;
    };

    var updateProgress = function (value) {
        return function (bundle) {
            var innerDeferred = q.defer();
            var progressListener = bundle.getProgressListener();
            progressListener.updatePercentage(value, function () {
                innerDeferred.resolve(bundle);
            });
            return innerDeferred.promise;
        };
    };
    var updateStatusText = function (value) {
        return function (bundle) {
            var innerDeferred = q.defer();
            var progressListener = bundle.getProgressListener();
            progressListener.updateStepName(value, function () {
                innerDeferred.resolve(bundle);
            });
            return innerDeferred.promise;
        };
    };
    var saveStartupConfigsFWCheck = function() {
        return function (bundle) {
            var innerDeferred = q.defer();
            var param = 'LJM_OLD_FIRMWARE_CHECK';
            ljmDriver.readLibrary(param, function(err) {
                console.error('Error Reading param', param, err);
                innerDeferred.reject(err);
            }, function(res) {
                initialStartupConfigs = res;
                innerDeferred.resolve(bundle);
            });
            return innerDeferred.promise;
        };
    };
    var disableStartupConfigsFWCheck = function() {
        return function (bundle) {
            var innerDeferred = q.defer();
            var param = 'LJM_OLD_FIRMWARE_CHECK';
            ljmDriver.writeLibrary(param, 0, function(err) {
                console.error('Error Writing param', param, err);
                innerDeferred.reject(err);
            }, function(res) {
                innerDeferred.resolve(bundle);
            });
            return innerDeferred.promise;
        };
    };
    var restoreStartupConfigsFWCheck = function() {
        return function (bundle) {
            var innerDeferred = q.defer();
            var param = 'LJM_OLD_FIRMWARE_CHECK';
            ljmDriver.writeLibrary(param, initialStartupConfigs, function(err) {
                console.error('Error Writing param', param, err);
                innerDeferred.reject(err);
            }, function(res) {
                innerDeferred.resolve(bundle);
            });
            return innerDeferred.promise;
        };
    };

    var saveWiFiStatus = function() {
        return function (bundle) {
            var innerDeferred = q.defer();
            var fwVer = curatedDevice.savedAttributes.FIRMWARE_VERSION;

            device.read('POWER_WIFI', function(err) {
                    console.log('Failed to Read WiFi Status', err);
                    innerDeferred.reject(err);
                }, function(res) {
                    initialWiFiStatus = res;
                    innerDeferred.resolve(bundle);
                });
            return innerDeferred.promise;
        };
    };
    var toggleWiFi = function(operation) {
        return function (bundle) {
            var innerDeferred = q.defer();
            var conT = bundle.getConnectionType();
            conT = driver_const.connectionTypes[conT];

            if (conT != driver_const.LJM_CT_WIFI) {
                if(initialWiFiStatus === 1) {
                    var device = bundle.getDevice();
                    var val;
                    var updateMessage = '';

                    if(operation === 'enable') {
                        updateMessage = 'Enabling WiFi';
                        val = 1;
                    } else {
                        updateMessage = 'Disabling WiFi';
                        val = 0;
                    }
                    var getFinishFunc = function(msg) {
                        return function() {
                            var progressListener = bundle.getProgressListener();
                            progressListener.updateStepName(
                                msg,
                                function() {
                                    innerDeferred.resolve(bundle);
                                }
                            );
                        };
                    };
                    device.write('POWER_WIFI', val, function(err) {
                        // console.log('Failed to Disable WiFi');
                        innerDeferred.reject(err);
                    }, function(res) {
                        // console.log('Disabled WiFi');
                        setTimeout(getFinishFunc(updateMessage), 2000);
                    });
                } else {
                    innerDeferred.resolve(bundle);
                }
            } else {
                innerDeferred.resolve(bundle);
            }
            return innerDeferred.promise;
        };
    };
    var finishedUpgrade = function(res) {
        var finishedDefered = q.defer();
        setImmediate(function() {
            finishedDefered.resolve(res);
        });
        return finishedDefered.promise;
    };
    
    // Create a new bundle to be passed along
    var bundle = new DeviceFirmwareBundle();

    bundle.setProgressListener(progressListener);


    t7Upgrader.readFirmwareFile(firmwareFileLocation, bundle) //reportError('readingFirmwareFile')
    .then(injectDevice, reportError('readingFirmwareFile'))
    .then(saveStartupConfigsFWCheck(), reportError('injectDevice'))
    .then(disableStartupConfigsFWCheck(), reportError('saveStartupConfigsFWCheck'))

    // Not required for T4
    // .then(saveWiFiStatus(), reportError('disableStartupConfigsFWCheck'))
    // .then(toggleWiFi('disable'), reportError('readWiFiStatus'))


    .then(t7Upgrader.checkCompatibility, reportError('disableStartupConfigsFWCheck'))
    .then(updateProgress(CHECKPOINT_ONE_PERCENT), reportError('checkCompatibility'))
    .then(t7Upgrader.getInitialDeviceFWState, reportError('updateProgress'))
    .then(updateStatusText('Erasing image...'), reportError('getInitialDeviceFWState'))
    .then(t7Upgrader.eraseImage, reportError('updateStatusText'))
    .then(t7Upgrader.eraseImageInformation, reportError('eraseImage'))
    //.then(t7Upgrader.checkErase, reportError)
    .then(updateProgress(CHECKPOINT_TWO_PERCENT), reportError('eraseImageInformation'))
    .then(updateStatusText('Writing image...'), reportError('updateProgress'))
    .then(t7Upgrader.writeImage(
        CHECKPOINT_TWO_PERCENT,
        CHECKPOINT_THREE_PERCENT
    ), reportError('updateStatusText'))
    .then(updateStatusText('Writing image info...'), reportError('writeImage'))
    .then(t7Upgrader.writeImageInformation(
        CHECKPOINT_THREE_PERCENT,
        CHECKPOINT_FOUR_PERCENT
    ), reportError('updateStatusText'))
    //.then(t7Upgrader.checkImageWrite, reportError) - Not doing anymore for speed
    .then(updateProgress(CHECKPOINT_FOUR_PERCENT), reportError('writeImageInformation'))
    .then(updateStatusText('Restarting...'), reportError('updateProgress'))
    .then(t7Upgrader.restartAndUpgrade, reportError('updateStatusText'))
    .then(t7Upgrader.closeDevice, exports.forceClose)
    .then(updateStatusText('Reconnecting to device..'), reportError('restartAndUpgrade'))
    .then(t7Upgrader.pauseForClose, reportError('updateStatusText'))
    .then(t7Upgrader.waitForEnumeration, reportError('pauseForClose'))
    .then(t7Upgrader.checkNewFirmware, reportError('waitForEnumeration'))

    // Not required for T4
    // .then(toggleWiFi('enable'), reportError('checkNewFirmware'))
    .then(updateProgress(CHECKPOINT_FIVE_PERCENT), reportError('checkNewFirmware'))
    .then(disableStartupConfigsFWCheck(), reportError('updateStatusText'))
    .then(finishedUpgrade, reportError('disableStartupConfigsFWCheck'))
    .then(deferred.resolve, deferred.reject);

    return deferred.promise;
};


this.updateFirmware = function(curatedDevice, device, firmwareFileLocation,
    connectionType, progressListener) {
    var defered = q.defer();
    internalUpdateFirmware(curatedDevice, device, firmwareFileLocation, connectionType, progressListener)
    .then(function(res) {
        defered.resolve(res);
    }, function(err) {
        defered.reject(err);
    });
    return defered.promise;
};

var t7Upgrader = this;
}
exports.createT4Upgrader = createT4Upgrader;