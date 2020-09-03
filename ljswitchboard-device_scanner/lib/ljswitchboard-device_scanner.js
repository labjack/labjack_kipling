/**
 * Creates and manages device scanner object.
 */

var device_scanner;
var driver;

var getListAllScanner = function(scanner) {
    device_scanner = require('./device_scanner').createDeviceScanner(driver);
};
var getOpenAllScanner = function() {
    device_scanner = require('./open_all_device_scanner').createDeviceScanner(driver);
};

var listAllNames = [
    'device_scanner',
    'list_all',
    'list_all_scanner',
    'list_all_device_scanner',
];
var openAllNames = [
    'open_all',
    'open_all_scanner',
    'open_all_device_scanner',
];
var POTENTIALLY_ENABLE_OPEN_ALL_SCANNER = false;

var ENABLE_SELECTION_DEBUGGING = false;
function debug () {
    if(ENABLE_SELECTION_DEBUGGING) {
        console.log.apply(console, arguments);
    }
}

var SAFE_LOAD_ENABLED = true;
function safeGetOpenAllScanner() {
    if(SAFE_LOAD_ENABLED) {
        if(driver.hasOpenAll) {
            // If installed LJM driver has a compatable version of openAll
            // then use the openAll scanner.
            debug('Selecting openAll Scanner...');
            getOpenAllScanner();
        } else {
            // If the installed LJM driver does not have a compatable
            // version of openALl then use the listAll scanner.
            debug('Selecting listAll Scanner...');
            getListAllScanner();
        }
    } else {
        debug('Selecting openAll Scanner...');
        getOpenAllScanner();
    }
}
function innerGetDeviceScanner(whichScanner) {
    if(device_scanner) {
        // Nothing; we already have the device_scanner
    } else {
        // Load the LJM driver functions
        driver = require('labjack-nodejs').driver();

        // Determine which version of the device_scanner to return.
        if(whichScanner) {
            if (listAllNames.indexOf(whichScanner) >= 0) {
                debug('Case B');
                // If the user selected the list_all device scanner...
                getListAllScanner();
            } else if (openAllNames.indexOf(whichScanner) >= 0) {
                debug('Case C');
                // If the user selected the open_all device scanner...
                safeGetOpenAllScanner();
            } else {
                // Default Behavior...
                // getOpenAllScanner();

                // Return the ListAll scanner by default... for now...
                debug('Selecting Default Scanner...');
                getListAllScanner();
            }
        } else {
            debug('Case A');
            safeGetOpenAllScanner();
        }
    }

    // Return the device_scanner.
    return device_scanner;
}
exports.enableSafeLoad = function() {
    SAFE_LOAD_ENABLED = true;
};
exports.disableSafeLoad = function() {
    SAFE_LOAD_ENABLED = false;
};
exports.unload = function() {
    device_scanner = undefined;
};
exports.getDeviceScanner = innerGetDeviceScanner;
exports.deviceScanner = innerGetDeviceScanner;

exports.eventList = require('./event_list').eventList;
