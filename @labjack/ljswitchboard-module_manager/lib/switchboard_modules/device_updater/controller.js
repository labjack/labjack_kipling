/**
 * Logic for the device updater module for LabJack Swichboard.
 *
 * @author A. Samuel Pottinger (LabJack Corp, 2013)
**/

var BASE_FIRMWARE_LISTING_URL = 'http://www.labjack.com/support/firmware/t7';
var FIRMWARE_LISTING_URL = BASE_FIRMWARE_LISTING_URL;
var BETA_LISTING_URL = BASE_FIRMWARE_LISTING_URL+'/beta';
var OLD_LISTING_URL = BASE_FIRMWARE_LISTING_URL+'/old';
var DEVICE_SELECTOR_SRC = 'device_updater/device_selector.html';
var FIRMWARE_LISTING_SRC = 'device_updater/firmware_listing.html';
var DEVICE_SELECTOR_PANE_SELECTOR = '#device-overview';
var FIRMWARE_LIST_SELECTOR = '#firmware-list';
var FIRMWARE_LINK_REGEX = /href\=\".*T7firmware\_([\d\-]+)\_([\d\-]+)\.bin"/g;
var NUM_UPGRADE_STEPS = 4.0;
var COULD_NOT_PARSE_MSG = 'Could not find firmwares on labjack.com';

var async = require('async');
var handlebars = require('handlebars');
var q = require('q');
var request = require('request');

var labjack_t7_upgrade = require('./labjack_t7_upgrade');

var selectedSerials = [];

var DISABLE_WIFI_POWER = true;

var ERROR_TEMPLATE = handlebars.compile(
    '<li>Could not read {{ . }} registers</li>'
);

var HUMAN_VERSION_TEMPLATE = handlebars.compile(
    '{{ version }} -{{ humanName }}'
);


/**
 * A wrapper around a device to make device update operations easier.
 *
 * @param {Objct} device The device to adapt.
**/
function UpgradeableDeviceAdapter(device)
{
    var executeErrorSafeFunction = function (target) {
        try {
            return target();
        } catch (e) {
            var errMsg;
            if(!isNaN(e)){
                errMsg = device_controller.ljm_driver.errToStrSync(e);
            } else {
                if(e.code !== undefined) {
                    errMsg = device_controller.ljm_driver.errToStrSync(e.code);
                } else {
                    if (e.retError === undefined) {
                        errMsg = e.toString();
                    } else {
                        errMsg = e.retError.toString();
                    }
                }
            }
            showAlert('Failed to read device info: ' + errMsg);
            return '[unavailable]';
        }
    };

    /**
     * Get the serial number of the device that is this decorator encapsulates.
     *
     * @return {Number} The serial number of the inner device.
    **/
    this.getSerial = function()
    {
        return executeErrorSafeFunction(device.getSerial);
    };

    /**
     * Get the name of the device that this decorator encapsulates.
     *
     * @return {String} The name of the inner device.
    **/
    this.getName = function()
    {
        return device.getName();
    };
    /**
     * Get the type of device subclass that this decorator encapsulates.
     *
     * @return {String} The string description of the model sub-class of the 
     *      device that this decorator encapsulates.
    **/
    this.getSubclass = function()
    {
        return executeErrorSafeFunction(device.getSubclass);
    };

    /**
     * Get the type of device that this decorator encapsulates.
     *
     * @return {String} The string description of the model of the device that
     *      this decorator encapsulates.
    **/
    this.getDeviceType = function()
    {
        return executeErrorSafeFunction(device.getDeviceType);
    };

    /**
     * Get the version of the firmware currently loaded on the given device.
     *
     * @return {Number} The version of the firmware on this decorator's
     *      encapsulated device.
    **/
    this.getFirmwareVersion = function()
    {
        var formattedCall = function () {
            return device.getFirmwareVersion().toFixed(4);
        };
        return executeErrorSafeFunction(formattedCall);
    };

    /**
     * Get the version of the bootloader currently loaded on the given device.
     *
     * @return {Number} The version of the bootloader on this decorator's
     *      encapsulated device.
    **/
    this.getBootloaderVersion = function()
    {
        var formattedCall = function () {
            return device.getBootloaderVersion().toFixed(4);
        };
        return executeErrorSafeFunction(formattedCall);
    };
    this.getWifiFirmwareVersion = function()
    {
        var formattedCall = function () {
            return device.getWifiFirmwareVersion().toFixed(4);
        };
        return executeErrorSafeFunction(formattedCall);
    };
    this.getSubclass = function() {
        var formattedCall = function () {
            return device.getSubclass();
        };
        return executeErrorSafeFunction(formattedCall);
    };

    this.getConnectionTypeStr = function () {
        return device.getConnectionTypeStr();
    };
}


/**
 * Download a list of available firmware versions.
 *
 * @param {function} onError The function to call if an error is encountered
 *      while downloading the firmware versions.
 * @param {function} onSuccess The function to call after the firmware version
 *      listing has been downloaded.
**/
function getAvailableFirmwareListing(onError, onSuccess)
{
    var nicerOnError = function (display) {
        $('#web-load-waiting-indicator').slideUp();
        $('#no-internet-message').show();
        $('#no-internet-message').hide();
        $('#no-internet-message').slideDown();
        $('#internet-controls').html(COULD_NOT_PARSE_MSG);
    };

    var innerRequest = function (url, humanName, hasLatest) {
        return function (overallFirmwareListing) {
            var innerDeferred = q.defer();
            request(
                url,
                function (error, response, body) {
                    if (error || response.statusCode != 200) {
                        $('#internet-error-list').append(
                            ERROR_TEMPLATE(humanName)
                        );
                        innerDeferred.resolve(overallFirmwareListing);
                        return;
                    }
                    console.log('HERE',url);

                    var firmwareListing = [];
                    var match = FIRMWARE_LINK_REGEX.exec(body);

                    while (match !== null) {
                        console.log('in while loop',match)
                        var targetURL = match[0].replace(/href\=\"/g, '');
                        targetURL = targetURL.replace(/\"/g, '');
                        var version = (parseFloat(match[1])/10000).toFixed(4);
                        var humanVersion = HUMAN_VERSION_TEMPLATE({
                            version: version,
                            humanName: humanName
                        });

                        firmwareListing.push(
                            {
                                version: version,
                                latest: false,
                                humanVersion: humanVersion,
                                url: targetURL
                            }
                        );

                        match = FIRMWARE_LINK_REGEX.exec(body);

                    }

                    var numFirmwares = firmwareListing.length;
                    if (numFirmwares === 0) {
                        innerDeferred.resolve(overallFirmwareListing);
                        return;
                    }
                    console.log('After While Loop');
                    var highestFirmware = firmwareListing[0];
                    for (var i=1; i<numFirmwares; i++) {
                        if (highestFirmware.version < firmwareListing[i].version)
                            highestFirmware = firmwareListing[i];
                    }

                    if (hasLatest)
                        highestFirmware.latest = true;

                    overallFirmwareListing = overallFirmwareListing.concat(
                        firmwareListing
                    );
                    innerDeferred.resolve(overallFirmwareListing);
                }
            );

            return innerDeferred.promise;
        };
    };

    var futures = [
        innerRequest(FIRMWARE_LISTING_URL, 'current', true),
        innerRequest(BETA_LISTING_URL, 'beta', false),
        innerRequest(OLD_LISTING_URL, 'old', false)
    ];

    var finalPromise = futures.reduce(
        function (lastPromise, currentPromise) {
            if (lastPromise === null)
                return currentPromise([]);
            else
                return lastPromise.then(currentPromise);
        },
        null
    );

    finalPromise.then(function (firmwareListing) {
        if (firmwareListing.length === 0)
            nicerOnError();
        else
            $('#internet-error-list').remove();
        onSuccess(firmwareListing);
    });
}


/**
 * Handler for selecting / unselecting devices for updating.
 *
 * Handler for checkboxes that select / unselect devices for updating. If no
 * devices are selected, the configuration pane / updater pane is hidden.
**/
function onChangeSelectedDevices()
{
    var selectedCheckboxes = $('.device-selection-checkbox:checked');
    if(selectedCheckboxes.length === 0) {
        selectedSerials = [];
        $('#device-configuration-pane').fadeOut();
    }
    else {
        selectedSerials = [];
        selectedCheckboxes.each(function (index, item)  {
            selectedSerials.push($(item).attr('id'));
        });
        $('#device-configuration-pane').fadeIn();
    }
}


/**
 * Handler for when a firmware version is selected.
 *
 * Handler for when a firmware version is selected. Updates the dropdown menu
 * that allows the user to select a firmware.
 *
 * @param {Object} event The jQuery event information.
**/
function onFirmwareLinkSelect(event)
{
    var firmwareDisplayStr;

    var version = event.target.id.replace('-selector', '');

    if(event.target.getAttribute('latest') === 'true')
        firmwareDisplayStr = version + ' (latest)';
    else
        firmwareDisplayStr = version;

    $('#selected-firmware').html('version ' + firmwareDisplayStr);
    $('#selected-firmware').attr('selected-version', version);
    $('#selected-firmware').attr('remote', $(event.target).attr('remote'));
}


/**
 * Populate the firmware options dropdown menu.
 *
 * Populate the firmware options dropdown menu, making the first firmware marked
 * as "latest" as the default choice.
 *
 * @param {Array} firmwareInfo An Array of Object with firmware version
 *      information.
**/
function displayFirmwareListing(firmwareInfo)
{
    var latestFirmwares = firmwareInfo.filter(function(e){ return e.latest; });
    var latestFirmware = latestFirmwares[0];

    $('#selected-firmware').html(
        'version ' + latestFirmware.version + ' (latest)'
    );
    $('#selected-firmware').attr('selected-version', latestFirmware.version);
    $('#selected-firmware').attr('remote', latestFirmware.url);

    var location = fs_facade.getExternalURI(FIRMWARE_LISTING_SRC);
    fs_facade.renderTemplate(
        location,
        {'firmwares': firmwareInfo},
        showAlert,
        function(renderedHTML)
        {
            $(FIRMWARE_LIST_SELECTOR).html(renderedHTML);
            $('.firmware-selection-link').click(onFirmwareLinkSelect);
            
            $('#web-load-waiting-indicator').hide();
            $('#firmware-select').fadeIn();
        }
    );
}

/**
 * Disable old-firmware checking
**/
var disableOldFirmwareCheck = function(bundle) {
    var deferred = q.defer();
    device_controller.ljm_driver.writeLibrary(
        "LJM_OLD_FIRMWARE_CHECK",           // Parameter
        0,                                  // Value
        function() {                        // onError
            console.log('Error Disabling Firmware Check');
            deferred.resolve(bundle);
        },
        function() {                        // onSuccess
            console.log('Successfully Disabled Firmware Check');
            deferred.resolve(bundle);
        }
    );
    return deferred.promise;
}
/**
 * Enable old-firmware checking
**/
var enableOldFirmwareCheck = function(bundle) {
    var deferred = q.defer();
    device_controller.ljm_driver.writeLibrary(
        "LJM_OLD_FIRMWARE_CHECK",           // Parameter
        1,                                  // Value
        function() {                        // onError
            console.log('Error Disabling Firmware Check');
            deferred.resolve(bundle);
        },
        function() {                        // onSuccess
            console.log('Successfully Disabled Firmware Check');
            deferred.resolve(bundle);
        }
    );
    return deferred.promise;
}


/**
 * Routine to update the firmware on the selected devices.
 *
 * Routine to update the firmware on the devices selected within the device
 * keeper.
 *
 * @param {String} firmwareFileLocation The location of the firmware file to use
 *      to update this device. If this location starts with "http://", the file
 *      will be downloaded from the Internet.
**/
function updateFirmware (firmwareFileLocation) {
    $('.firmware-source-option').slideUp();
    $('#working-status-pane').slideDown();

    var keeper = device_controller.getDeviceKeeper();

    var ProgressListener = function () {

        this.update = function (value, callback) {
            $('#device-upgrade-progress-indicator-bar').css(
                {'width': value.toString() + '%'}
            );
            if (callback !== undefined)
                callback();
        };

        this.displayStatusText = function (value, callback) {
            $('#device-upgrade-progress-status').html(value);
            if (callback !== undefined)
                callback();
        };

        this.update(0);
    };

    $('#total-devices-display').html(selectedSerials.length);
    $('#complete-devices-display').html(0);
    try {
        device_controller.ljm_driver.writeLibrarySync('LJM_OPEN_TCP_DEVICE_TIMEOUT_MS',1000);
        device_controller.ljm_driver.writeLibrarySync('LJM_LISTALL_TIMEOUT_MS_ETHERNET',1000);
        device_controller.ljm_driver.writeLibrarySync('LJM_LISTALL_NUM_ATTEMPTS_ETHERNET',5);
        device_controller.ljm_driver.writeLibrarySync('LJM_LISTALL_TIMEOUT_MS_WIFI',1000);
        device_controller.ljm_driver.writeLibrarySync('LJM_LISTALL_NUM_ATTEMPTS_WIFI',5);
    } catch(e) {
        console.log('Error caught',e);
    }

    var numUpgraded = 0;
    async.each(
        selectedSerials,
        function (serial, callback) {
            console.log('reported serial',serial);
            console.log('typeof',typeof(serial));
            serial = serial.split('-selector')[0];
            var device = keeper.getDevice(serial);
            var connectionType = device.getConnectionTypeStr();
            var progressListener = new ProgressListener();

            var runUpgrade = function () {
                labjack_t7_upgrade.updateFirmware(
                    device.device,
                    firmwareFileLocation,
                    connectionType,
                    progressListener
                ).then(
                    function (bundle) {
                        var firmwareDisplaySelector = '#';
                        firmwareDisplaySelector += serial.toString();
                        firmwareDisplaySelector += '-firmware-display';
                        device.device = bundle.getDevice();
                        console.log('device_updater, device.device:',device.device);
                        device.invalidateCache();
                        numUpgraded+=1;
                        $(firmwareDisplaySelector).html(
                            bundle.getFirmwareVersion()
                        );
                        $('#complete-devices-display').html(numUpgraded);
                        try {
                            device_controller.ljm_driver.writeLibrarySync('LJM_OPEN_TCP_DEVICE_TIMEOUT_MS','default');
                            device_controller.ljm_driver.writeLibrarySync('LJM_LISTALL_TIMEOUT_MS_ETHERNET','default');
                            device_controller.ljm_driver.writeLibrarySync('LJM_LISTALL_NUM_ATTEMPTS_ETHERNET',5);
                            device_controller.ljm_driver.writeLibrarySync('LJM_LISTALL_TIMEOUT_MS_WIFI','default');
                            device_controller.ljm_driver.writeLibrarySync('LJM_LISTALL_NUM_ATTEMPTS_WIFI',5);
                        } catch(e) {
                            console.log('Error caught',e);
                        }
                        callback();
                    },
                    function (err) {
                        callback(err);
                    }
                );
            };

            try {
                if (DISABLE_WIFI_POWER && device.getConnectionTypeStr() !== "LJM_ctWIFI" && device.read('POWER_WIFI') != 0) {
                    try{
                        device.write('POWER_WIFI', 0);
                        device.write('POWER_WIFI_DEFAULT', 0);
                    } catch(err) {

                    }
                    setTimeout(runUpgrade, 3000);
                } else {
                    runUpgrade();
                }
            } catch (e) {
                if(e.message == 1307) {
                    callback(e.message);
                } else {
                    callback(
                        'Configuring WIFI failed. Please try upgrading again.'+e.toString()
                    );
                }
            }
            
        },
        function (err) {
            if (err) {
                var errMsg;
                // Check for wifi-error
                if (err == 2358) {
                    $('#flash-notice').slideDown();
                    setTimeout(
                        function () {
                            $('#flash-notice').slideUp();
                            updateFirmware(firmwareFileLocation);
                        },
                        3000
                    );
                    return;
                }
                // Check for old-firmware error
                if (err == 1307) {
                    console.log('Updating device w/ old firmware');
                    // disableOldFirmwareCheck()
                    // .then(function() {
                    //     updateFirmware(firmwareFileLocation);
                    // },
                    // function() {
                    //     console.log('Issues disabling oldFirmwareCheck')
                    // })
                    DISABLE_WIFI_POWER = false;
                    updateFirmware(firmwareFileLocation);
                    return;
                }

                if (err.retError === undefined) {
                    errMsg = err.toString();
                } else  {
                    errMsg = err.retError.toString();
                }
                console.log('Error..... bleh',err);
                showAlert(
                    'Failed to update device firmware with the error :' + errMsg +
                    ' Please try again. If the problem persists, please contact support@labjack.com.'
                );
            } else {
                DISABLE_WIFI_POWER = true;
            }
            $('.firmware-source-option').slideDown();
            $('#working-status-pane').slideUp();
        }
    );
}


/**
 * Initialization logic for the devie update module.
**/
$('#network-configuration').ready(function(){
    var keeper = device_controller.getDeviceKeeper();
    var devices = keeper.getDevices();

    var decoratedDevices = devices.map(function(device) {
        return new UpgradeableDeviceAdapter(device);
    });

    selectedSerials = decoratedDevices.map(
        function (e) { return e.getSerial(); }
    );

    var location = fs_facade.getExternalURI(DEVICE_SELECTOR_SRC);
    fs_facade.renderTemplate(
        location,
        {
            'devices': decoratedDevices,
            'hasMultipleDevices': decoratedDevices.length > 1
        },
        genericErrorHandler,
        function(renderedHTML)
        {
            $(DEVICE_SELECTOR_PANE_SELECTOR).html(renderedHTML);
            $('.device-selection-checkbox').click(onChangeSelectedDevices);
        }
    );

    $('#browse-link').click(function () {
        var chooser = $('#file-dialog-hidden');
        chooser.change(function(evt) {
            var fileLoc = $(this).val();
            $('#file-loc-input').val(fileLoc);
        });

        chooser.trigger('click');
        return false;
    });

    $('#local-update-button').click(function () {
        var fileLocation = $('#file-loc-input').val();
        fs.exists(fileLocation,function(res){
            if(res) {
                updateFirmware(fileLocation);
            } else {
                $('#browse-link').trigger('click');
            }
        });
        return false;
    });

    $('#web-update-button').click(function () {
        updateFirmware($('#selected-firmware').attr('remote'));
        return false;
    });

    getAvailableFirmwareListing(genericErrorHandler, displayFirmwareListing);
});
