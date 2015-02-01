/**
 * Logic for the device selector integrated module.
 *
 * @author A. Samuel Pottinger (LabJack, 2013)
 * @contributor Chris Johnson (LabJack, 2014)
 *
 * Requires (from global_requires.js):
 *      handlebars = require('handlebars');
 *      q = require('q');
 *      device_controller = require('./device_controller');
 *      gui = require('nw.gui');
**/
var handlebars = require('handlebars');
var q = require('q');
var device_controller;
try {
    device_controller = require('./device_controller');
} catch(err) {
    console.log('in device_selector.js, error requiring device_controller', err);
}
var gui;
try {
    gui = require('nw.gui');
} catch(err) {
    console.log('in device_selector.js, error requiring nw.gui');
}

var OPEN_FAIL_MESSAGE = handlebars.compile(
    'Sorry. Failed to the open device. Please check the ' +
    'physical connection and try again. ' +
    'Driver error number: {{.}}');

var CONNECTED_OVER_TEMPLATE = handlebars.compile('Connected over {{ . }}');


var resizeTimeout;


/**
 * Event handler to hide the connect buttons for a device.
 *
 * Event handler that hides the GUI widgets that allow a user to select which
 * method (USB, Ethernet, WiFi, etc.) he / she wants to use to communicate with
 * a device.
 *
 * @param {jquery.Event} event jQuery event. The widgets manipulated will be
 *      relative to the target and should be cancel-connect-button or
 *      comperable.
**/
function hideConnectButtons(event)
{
    var jqueryID = '#' + event.target.id;
    $(jqueryID).parents('#connect-buttons').slideUp(function(){
        $(jqueryID).parents('#info-holder').children('#info').slideDown();
    });
}


/**
 * Event handler that opens a connection to a device.
 *
 * @param {jquery.Event} event jQuery event whose target should have an ID of
 *      the form deviceType-serial-connectionType (AngularJS should be used
 *      next time).
**/
function connectNewDevice(event)
{
    var deviceInfo = event.target.id.split('-');
    var jqueryID = '#' + event.target.id;

    var serial = deviceInfo[1];
    var ipAddress = deviceInfo[2].replace(/\_/g, '.');
    var connectionType = parseInt(deviceInfo[4]);
    var deviceType = parseInt(deviceInfo[5]);

    var container = $(jqueryID).parents('.connection-buttons-holder');
    container.children('#show-connect-button-holder').hide();
    $('#finish-button').slideUp();
    $('.connect-button').slideUp();

    hideConnectButtons(event);

    var onDeviceOpenend = function(device)
    {
        var typeStr = device_controller.CONNECTION_TYPE_NAMES.get(
            connectionType.toString()
        );

        device_controller.getDeviceKeeper().addDevice(device);
        showFinishButton();
        $('.connect-button').slideDown();
        container.find('.current-connection-indicator').html(
            CONNECTED_OVER_TEMPLATE(typeStr)
        );
        container.children('#disconnect-button-holder').slideDown();
    };

    device_controller.openDevice(serial, ipAddress, connectionType, deviceType,
        showAlert, onDeviceOpenend);
}


/**
 * Event handler that disconnects a device.
 *
 * @param {jquery.Event} event jQuery event whose target should have an ID of
 *      the form serial-.... The serial number will be parsed and that device
 *      will be disconnected. AngularJS or equivalent should be used next time.
**/
function disconnectDevice(event) {
    var deviceInfo = event.target.id.split('-');
    var jqueryID = '#' + event.target.id;
    var serial = deviceInfo[0];

    var container = $(jqueryID).parents('.connection-buttons-holder');

    container.children('#disconnect-button-holder').hide();

    var device = device_controller.getDeviceKeeper().getDevice(serial);

    var onDeviceClosed = function(device) {
        var deviceKeeper = device_controller.getDeviceKeeper();

        deviceKeeper.removeDevice(device);
        container.children('#connect-buttons').slideDown();

        if(deviceKeeper.getNumDevices() === 0) {
            hideFinishButton();
        }
    };

    device_controller.closeDevice(device, onDeviceClosed, showAlert);
}


/**
 * Convenience function to show the finish button.
 *
 * Convenience function to show the button that allows the user to move past the
 * device selector. Should only be shown when >0 devices are connected.
**/
function showFinishButton() {
    $('#finish-button').slideDown();
}


/**
 * Convenience function to hide the finish button.
 *
 * Convenience function to hide the button that allows the user to move past the
 * device selector. Should only be hidden when <1 devices are connected.
**/
function hideFinishButton() {
    $('#finish-button').slideUp();
}


/**
 * Hide the alert error display at the top of the screen.
**/
function closeAlert() {
    $('#alert-message').fadeOut(function() {
        $('.device-selector-holder').css('margin-top', '45px');
    });
}


/**
 * Transition the user view to the software modules.
 *
 * Transition away from the device selector and replace it with the module
 * chome and starting module.
**/
function moveToModules() {
    renderTemplate(
        'module_chrome.html',
        {},
        CONTENTS_ELEMENT,
        true,
        ['module_chrome.css'],
        ['module_chrome.js'],
        getCustomGenericErrorHandler('device_selector-moveToModules')
    );
}


/**
 * Show an error message in an alert modal at the top of the screen.
 *
 * Show an error message in an alert modal positioned at the top of the screen.
 * This modal should be embedded and fixed (no moving). However, it should be
 * closeable.
 *
 * @param {String} errorMessage The message to display.
**/
function showAlert(errorMessage) {
    var message = OPEN_FAIL_MESSAGE(errorMessage);
    $('#error-display').html(message);
    $('.device-selector-holder').css('margin-top', '0px');
    $('#alert-message').fadeIn();
}


function refreshDevices() {
    renderDeviceSelector();
}

function kiplingStartupManager() {

    var startupConfigData = [];


    var handleErrors = function() {
        var innerDeferred = q.defer();
        innerDeferred.reject();
        return innerDeferred.promise;
    };

    this.loadConfigData = function() {
        var innerDeferred = q.defer();
        var filePath = fs_facade.getExternalURI('startupConfig.json');
        if (gui.App.manifest.enableStartupConfig) {
            fs_facade.getJSON(
                filePath,
                function() {
                    console.error('startupConfig.json, fileNotFound');
                    innerDeferred.reject();
                },
                function(contents) {
                    innerDeferred.resolve(contents);
                }
            );
        } else {
            innerDeferred.reject();
        }
        return innerDeferred.promise;
    };
    var loadConfigData = this.loadConfigData;

    this.startDevTools = function(configData) {
        var innerDeferred = q.defer();
        if (typeof(configData.displayDevTools) === "boolean") {
            if(configData.displayDevTools){
                // Display Dev-tools window, code ref:
                // https://github.com/rogerwang/node-webkit/wiki/Debugging-with-devtools
                gui.Window.get().showDevTools();
            }
        }
        innerDeferred.resolve(configData);
        return innerDeferred.promise;
    };
    var startDevTools = this.startDevTools;

    this.checkIfAutoConfigure = function(configData) {
        var innerDeferred = q.defer();
        if (configData.autoConnectToDevices !== undefined) {
            if (configData.autoConnectToDevices){
                innerDeferred.resolve(configData);
            } else {
                innerDeferred.reject();
            }
        } else {
            innerDeferred.reject();
        }
        return innerDeferred.promise;
    };
    var checkIfAutoConfigure = this.checkIfAutoConfigure;

    this.getDeviceData = function() {
        var devices = [];
        var serialNumbers = [];
        var connectionTypes = [];
        var devObjs = $('.devices-enumeration-scroller .device');
        var numDevicesFound = devObjs.length;


        var i;
        for(i = 0; i < numDevicesFound; i++) {
            var dev = devObjs.eq(i);
            var sn = dev.find('#serial').html();
            var conTypes = [];
            var conButtonObjects = dev.find('.connect-button');
            var numConTypes = conButtonObjects.length;
            var dtText = dev.find('#type').html();
            var dt = 0;
            if(dtText === 'T7 Pro') {
                dt = 'LJM_dtT7';
            } else if(dtText === 'T7') {
                dt = 'LJM_dtT7';
            } else if(dtText === 'Digit-TL') {
                dt = 'LJM_dtDIGIT_TL';
            } else if(dtText === 'Digit-TLH') {
                dt = 'LJM_dtDIGIT_TLH';
            }


            // var deviceInfo = event.target.id.split('-');
            // var jqueryID = '#' + event.target.id;
            // var serial = deviceInfo[1];
            // var ipAddress = deviceInfo[2].replace(/\_/g, '.');
            // var connectionType = parseInt(deviceInfo[4]);
            // var deviceType = parseInt(deviceInfo[5]);

            var j;
            for(j = 0; j < numConTypes; j++) {
                conTypes.push(
                    {
                        "type": conButtonObjects.eq(j).html(),
                        "button": conButtonObjects.eq(j)
                    }
                );
            }
            devices.push(
                {
                    "serialNumber": sn,
                    "connectionTypes": conTypes,
                    "deviceType": dt,


                }
            );
        }
        return devices;
    };
    var getDeviceData = getDeviceData;

    this.connectToDevices = function(configData) {
        var innerDeferred = q.defer();
        var foundDevices = self.getDeviceData();
        var moveToModule = false;
        var numDevicesConnected = 0;
        var numDevicesToConnectTo = 0;

        var openDevice = function(sn, ct, dt) {
            if(ct === 'Wifi') {
                ct = 'LJM_ctWIFI';
            } else if(ct === 'Ethernet') {
                ct = 'LJM_ctETHERNET';
            } else if(ct === 'USB') {
                ct = 'LJM_ctUSB';
            }
            device_controller.openDevice(
                sn,
                '',
                ct,
                dt,
                function() {
                    numDevicesConnected += 1;
                    if(numDevicesConnected == numDevicesToConnectTo) {
                        innerDeferred.resolve(configData);
                    }
                },
                function(device) {
                    numDevicesConnected += 1;
                    device_controller.getDeviceKeeper().addDevice(device);
                    if(numDevicesConnected == numDevicesToConnectTo) {
                        innerDeferred.resolve(configData);
                    }
                }
            );
        };

        configData.ljmDeviceParameters.forEach(function(reqDevice){
            foundDevices.forEach(function(foundDevice) {
                if(reqDevice.serialNumber === foundDevice.serialNumber) {
                    foundDevice.connectionTypes.forEach(function(cType){
                        if(reqDevice.connectionType === cType.type) {
                            cType.button.click();
                            // openDevice(
                            //     foundDevice.serialNumber,
                            //     cType.type,
                            //     foundDevice.deviceType
                            // );
                            numDevicesToConnectTo += 1;
                            moveToModule = true;
                        }
                    });
                }
            });
        });
        if(!moveToModule) {
            innerDeferred.reject();
        }
        else {
            innerDeferred.resolve(configData);
        }
        return innerDeferred.promise;
    };
    var connectToDevices = this.connectToDevices;

    this.configureStartUpModule = function(configData) {
        var innerDeferred = q.defer();

        if(configData.overrideAutoModuleLoad !== undefined) {
            if(configData.overrideAutoModuleLoad){
                START_UP_MODULE_OVERRIDE = configData.overrideAutoModuleLoad;
                START_UP_MODULE_NAME = configData.moduleName;
            }
        }

        innerDeferred.resolve(configData);
        return innerDeferred.promise;
    };
    var configureStartUpModule = this.configureStartUpModule;
    this.introduceDelay = function(configData) {
        var innerDeferred = q.defer();
        setTimeout(innerDeferred.resolve, 2000);
        return innerDeferred.promise;
    };
    this.clickFinishButton = function() {
        var innerDeferred = q.defer();
        $('#finish-button').click();
        innerDeferred.resolve();
        return innerDeferred.promise;
    };
    var clickFinishButton = this.clickFinishButton;


    this.autoStart = function() {
        var deferred = q.defer();
        self.loadConfigData()
        .then(self.startDevTools, handleErrors)
        .then(self.configureStartUpModule, handleErrors)
        .then(self.checkIfAutoConfigure, handleErrors)
        .then(self.connectToDevices, handleErrors)
        .then(self.introduceDelay, handleErrors)
        .then(self.clickFinishButton, handleErrors)
        .then(deferred.resolve, deferred.reject);

        return deferred.promise;
    };

    var self = this;
}

/**
 * Callback that dyanmically handles window resizing.
**/
function onResized() {
    var decrement = 105;
    if($('.device-selector-holder h1').height() > 48) {
        decrement += 78;
    }
    var num = ($(window).height()-decrement);
    num -= 13;
    $('.device-pane').height((num-10).toString()+'px');
}

function attachUpgradeLinkListeners() {
    console.log('HERE, device_selector.js');
    $('.labjackVersions #showUpgradeLinks').unbind();
    $('.labjackVersions #closeUpgradeLinkWindow').unbind();
    $('.labjackVersions #showUpgradeLinks').bind('click',function() {
        $('#versionNumbers').hide();
        $('#lvm_upgrade_box').show();
    });
    $('.labjackVersions #closeUpgradeLinkWindow').bind('click',function() {
        $('#lvm_upgrade_box').hide();
        $('#versionNumbers').show();
    });

    $('.labjackVersions .upgradeButton').bind('click',function(event) {
        console.log('Clicked!',event.toElement);

        var href = event.toElement.attributes.href.value;
        FILE_DOWNLOADER_UTILITY.downloadFile(href)
        .then(function(info) {
            console.log('success!',info);
        }, function(error) {
            console.log('Error :(',error);
        });
    });
    

}

$('#device-selector-holder').ready(function(){
    onResized();
    $('.connect-button').click(connectNewDevice);
    $('.close-alert-button').click(closeAlert);
    $('.disconnect-button').click(disconnectDevice);
    $('#refresh-button').click(refreshDevices);
    $('#finish-button').click(moveToModules);

    $( window ).resize(function () {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(onResized, 2);
    });

    var deviceKeeper = device_controller.getDeviceKeeper();

    if(deviceKeeper.getNumDevices() > 0)
        $('#finish-button').show();

    var starter = new kiplingStartupManager();
    starter.autoStart();

    // attachUpgradeLinkListeners();
    LABJACK_VERSION_MANAGER.initializeLVM({
        'versionNumbersID': 'versionNumbers',
        'showLinksButtonID': 'showUpgradeLinks',
        'upgradeLinksID': 'lvm_upgrade_box',
        'linksListID': 'upgradeLinksList',
        'hideLinksButtonID': 'closeUpgradeLinkWindow',
        'ljmVersion': device_controller.ljm_driver.installedDriverVersion,
        'kiplingVersion': gui.App.manifest.version
    });
});
