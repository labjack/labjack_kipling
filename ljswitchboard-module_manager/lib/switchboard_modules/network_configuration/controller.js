/**
 * Logic for a LabJack Switchboard module to update device network config.
 *
 * Logic for a LabJack Switchboard module to update device network configuration
 * settings.
 *
 * @author A. Samuel Pottinger (LabJack Corp, 2013)
**/

var Long = require('long');

var DEVICE_SELECTOR_SRC = 'network_configuration/device_selector.html';
var DEVICE_SELECTOR_PANE_SELECTOR = '#device-overview';
var HARDWARE_INSTALLED_REG = 60010;
var FLASH_UNAVAILABLE_ERROR = 2358;

var selectedDevice;


/**
 * Display an error encountered when operating a device via the GUI.
 *
 * @param {Object} err The error to display. If the passed structure has a
 *      retError attribute, that attribute will be used to describe the error.
**/
function showError (err) {
    var errorMessage;

    if (err.retError === undefined) {
        errorMessage = err.toString();
    } else {
        errorMessage = err.retError.toString();
    }

    showAlert(
        'Enountered an error during device operation: ' + errorMessage
    );
}


/**
 * Wrapper around a device that makes reading and changing network config easy.
 *
 * Wrapper around a device that makes reading and changing network configuration
 * settings easier.
 *
 * @param {Object} device The device to decorate / adapt.
**/
function DeviceNetworkAdapter(device)
{
    var createErrorSafeGetter = function (target, defaultValue) {
        return function () {
            try {
                return target();
            } catch (e) {
                if (e.code == FLASH_UNAVAILABLE_ERROR) {
                    throw e;
                } else {
                    if (e.code != 54)
                        showError(e);
                    return defaultValue;
                }
            }
        };
    };

    var createErrorSafeSetter = function (target) {
        return function (val) {
            try {
                target(val);
            } catch (e) {
                console.log(e);
                if (e.code == FLASH_UNAVAILABLE_ERROR) {
                    throw e;
                } else {
                    if (e.code != 54)
                        showError(e);
                }
            }
        };
    };

    /**
     * Get the serial number of the device encapsulated by this decorator.
     *
     * @return {String} The serial number of the encapsulated device.
    **/
    this.getSerial = createErrorSafeGetter(function ()
    {
        return device.getSerial();
    }, '[ could not read ]');

    /**
     * Get the name of the device encapsulated by this decorator.
     *
     * @return {String} The name of the encapsulated device.
    **/
    this.getName = createErrorSafeGetter(function ()
    {
        return device.getName();
    }, '[ could not read ]');

    /**
     * Determine if this device is currently connected.
     *
     * @return {Boolean} true if the device encapsulated by this decorator is
     *      currently connected. Returns false otherwise.
    **/
    this.getConnectionStatus = function()
    {
        return true;
    };

    /**
     * Get the IP address that this device will try to take when on Ethernet.
     *
     * Get the IP address that this device will attempt to take when connected
     * by ethernet.
     *
     * @return {String} XXX.XXX.X.X string representation of the IP address that
     *      this device will attempt to take when connected by Ethernet.
    **/
    this.getEthernetIPAddress = createErrorSafeGetter(function ()
    {
        return readIP(device.read('ETHERNET_IP_DEFAULT'));
    }, '[ could not read ]');

    /**
     * Get the subnet that this device will try to use when on ethernet.
     *
     * Get the subnet that this device will attempt to use when connecected by
     * ethernet.
     *
     * @return {String} XXX.XXX.X.X string representation of the IP address of
     *      the subnet that this device will use when connected by ethernet.
    **/
    this.getEthernetSubnet = createErrorSafeGetter(function ()
    {
        return readIP(device.read('ETHERNET_SUBNET_DEFAULT'));
    }, '[ could not read ]');

    /**
     * Get the gateway that this device will try to use when on ethernet.
     *
     * @return {String} XXX.XXX.X.X string representation of the IP address
     *      of the gateway that this device will use when connected by ethernet.
    **/
    this.getEthernetGateway = createErrorSafeGetter(function ()
    {
        return readIP(device.read('ETHERNET_GATEWAY_DEFAULT'));
    }, '[ could not read ]');

    /**
     * Determine if this device will use DCHP when connected by ethernet.
     *
     * @return {bool} True if this device will use DCHP when connected by
     *      ethernet and false otherwise.
    **/
    this.getEthernetDHCPEnabled = createErrorSafeGetter(function ()
    {
        return device.read('ETHERNET_DHCP_ENABLE') > 0.1;
    }, true);

    /**
     * Get the IP address of the device encapsulated by this decorator.
     *
     * @return {String} The IP address of the encapsulated device.
    **/
    this.getWiFiIPAddress = createErrorSafeGetter(function ()
    {
        return readIP(device.read('WIFI_IP_DEFAULT'));
    }, '[ could not read ]');

    /**
     * Get the name of the WiFi network this device is set to connect to.
     *
     * @return {String} Get the name of the WiFi network this device is
     *      set to connect to. This does not necessarily mean that this device
     *      is connected to that network.
    **/
    this.getWiFiNetwork = createErrorSafeGetter(function ()
    {
        return device.read('WIFI_SSID_DEFAULT');
    }, '[ could not read ]');

    /**
     * Get the password this device is set to use to connect to a WiFi network.
     *
     * @return {String} Get the password the device is set to use to connect
     *      to its preset network. Does not indicate if the device is actually
     *      connected to a WiFi network.
    **/
    this.getWiFiNetworkPassword = function()
    {
        return '        ';
    };

    /**
     * Get the subnet this device is set to use.
     *
     * @return {String} IP address of subnet this device is set to connect to.
     *      Returns null if the device does not support network connection.
    **/
    this.getWiFiSubnet = createErrorSafeGetter(function ()
    {
        return readIP(device.read('WIFI_SUBNET_DEFAULT'));
    }, '[ could not read ]');

    /**
     * Get the gateway to use when this device is connected by WiFi.
     *
     * @return {String} IP address of the gateway that should be used when this
     *      device is connected by WiFi.
    **/
    this.getWiFiGateway = createErrorSafeGetter(function ()
    {
        return readIP(device.read('WIFI_GATEWAY_DEFAULT'));
    }, '[ could not read ]');

    /**
     * Determine if this device should use DCHP when connected by WiFi.
     *
     * @return {bool} True if this device should use DCHP when connected by WiFi
     *      and false otherwise.
    **/
    this.getWiFiDHCPEnabled = createErrorSafeGetter(function ()
    {
        return device.read('WIFI_DHCP_ENABLE_DEFAULT') > 0.1;
    }, true);

    /**
     * Get the first default DNS server this device is set to use.
     *
     * @return {String} The IP address of first default DNS sever this device
     *      is set to use. Return null if the device does not support network
     *      connection.
    **/
    this.getDNS = createErrorSafeGetter(function ()
    {
        return readIP(device.read('ETHERNET_DNS_DEFAULT'));
    }, '[ could not read ]');

    /**
     * Get the backup / alternative DNS server this device is set to use.
     *
     * @return {String} The IP address of the DNS server this device is set to
     *      connect to if the first DNS server is unreachable. Returns null
     *      if the device does not support network connection.
    **/
    this.getAltDNS = createErrorSafeGetter(function ()
    {
        return readIP(device.read('ETHERNET_ALTDNS_DEFAULT'));
    }, '[ could not read ]');

    /**
     * Get the string description of this device's model type.
     *
     * @return {String} Description of the type of model this device is.
    **/
    this.getDeviceType = createErrorSafeGetter(function ()
    {
        return device.getDeviceType();
    }, '[ could not read ]');

    /**
     * Determine if the device has power to its ethernet functionality.
     *
     * @return {bool} True if the device has ethernet enabled and false
     *      otherwise.
    **/
    this.isEthernetEnabled = createErrorSafeGetter(function ()
    {
        return device.read('POWER_ETHERNET') > 0.1;
    }, false);

    /**
     * Determine if the device has power to its WiFi functionality.
     *
     * @return {bool} True if the device has WiFi enabled and false otherwise.
    **/
    this.isWiFiEnabled = createErrorSafeGetter(function ()
    {
        return device.read('POWER_WIFI') > 0.1;
    }, false);

    /**
     * Determine if the device is a T7 or T7 pro.
     *
     * @return {bool} True if the enclosed device handle is for a T7 Pro and
     *      false if the device is a T7 (not pro).
    **/
    this.isPro = createErrorSafeGetter(function ()
    {
        return Math.abs(device.read(HARDWARE_INSTALLED_REG)) > 0.1;
    }, false);

    /**
     * Indicate which network this device should connect to by default.
     *
     * @param {String} newVal The SSID (name) of the WiFi network to connect to.
    **/
    this.setDefaultWiFiNetwork = createErrorSafeSetter(function (newVal)
    {
        device.write('WIFI_SSID_DEFAULT', newVal);
    });

    /**
     * Indicate which password the device should use by default for WiFi.
     *
     * Indicate which password the device should use when connecting to the
     * default WiFi network.
     *
     * @param {String} newVal The password to use to authenticate with the
     *      default WiFi network.
    **/
    this.setDefaultWiFiNetworkPassword = createErrorSafeSetter(function (newVal)
    {
        if (newVal !== '        ')
            device.write('WIFI_PASSWORD_DEFAULT', newVal);
    });

    /**
     * Indicate which IP address this device should try to take over WiFi.
     *
     * Indicate which IP address this device should try to use when connected
     * over WiFi.
     *
     * @param {String} The string XXX.XXX.X.X representation of the IP address
     *      this device should attempt to use when connected over WiFi.
    **/
    this.setDefaultWiFiIPAddress = createErrorSafeSetter(function (newVal)
    {
        device.write('WIFI_IP_DEFAULT', writeIP(newVal));
    });

    /**
     * Indicate which subnet this device should use when connected by WiFi.
     *
     * @param {String} The string XXX.XXX.X.X representation of the IP address
     *      of the subnet that this device should use when connected over WiFi.
    **/
    this.setDefaultWiFiSubnet = createErrorSafeSetter(function (newVal)
    {
        device.write('WIFI_SUBNET_DEFAULT', writeIP(newVal));
    });

    /**
     * Indicate which gateway this device should use when connected by WiFi.
     *
     * @param {String} The string XXX.XXX.X.X representation of the IP address
     *      of the gateway that this device should use when connected over WiFi.
    **/
    this.setDefaultWiFiGateway = createErrorSafeSetter(function (newVal)
    {
        device.write('WIFI_GATEWAY_DEFAULT', writeIP(newVal));
    });

    /**
     * Indicate which primary DNS servers this device should use by default.
     *
     * @param {String} The string XXX.XXX.X.X representation of the IP address
     *      of the primary DNS servers to use.
    **/
    this.setDefaultDNS = createErrorSafeSetter(function (newVal)
    {
        device.write('ETHERNET_DNS_DEFAULT', writeIP(newVal));
    });

    /**
     * Indicate which DNS servers this device should use as a backup.
     *
     * @param {String} The string XXX.XXX.X.X representation of the IP address
     *      of the DNS servers to use if the primary DNS servers cannot be
     *      reached.
    **/
    this.setDefaultAltDNS = createErrorSafeSetter(function (newVal)
    {
        device.write('ETHERNET_ALTDNS_DEFAULT', writeIP(newVal));
    });

    /**
     * Indicate which IP address this device should try to take over Ethernet.
     *
     * Indicate which IP address this device should try to use when connected
     * over Ethernet.
     *
     * @param {String} The string XXX.XXX.X.X representation of the IP address
     *      this device should attempt to use when connected over Ethernet.
    **/
    this.setDefaultEthernetIPAddress = createErrorSafeSetter(function (newVal)
    {
        device.write('ETHERNET_IP_DEFAULT', writeIP(newVal));
    });

    /**
     * Indicate which subnet this device should use when connected by Ethernet.
     *
     * @param {String} The string XXX.XXX.X.X representation of the IP address
     *      of the subnet that this device should use when connected over
     *      Ethernet.
    **/
    this.setDefaultEthernetSubnet = createErrorSafeSetter(function (newVal)
    {
        device.write('ETHERNET_SUBNET_DEFAULT', writeIP(newVal));
    });

    /**
     * Indicate which gateway this device should use when connected by Ethernet.
     *
     * @param {String} The string XXX.XXX.X.X representation of the IP address
     *      of the gateway that this device should use when connected over
     *      Ethernet.
    **/
    this.setDefaultEthernetGateway = createErrorSafeSetter(function (newVal)
    {
        device.write('ETHERNET_GATEWAY_DEFAULT', writeIP(newVal));
    });

    /**
     * Specify if this device should use DCHP when connected by ethernet.
     *
     * @param {Number} newVal Value to write to the enable register. If > 0,
     *      DCHP will be enabled by default when connected by ethernet.
    **/
    this.setEthernetDHCPEnable = createErrorSafeSetter(function (newVal)
    {
        device.write('ETHERNET_DHCP_ENABLE_DEFAULT', newVal);
    });

    /**
     * Specify if this device should use DCHP when connected by WiFi.
     *
     * @param {Number} newVal Value to write to the enable register. If > 0,
     *      DCHP will be enabled by default when connected by ethernet.
    **/
    this.setWiFiDHCPEnable = createErrorSafeSetter(function (newVal)
    {
        device.write('WIFI_DHCP_ENABLE_DEFAULT', newVal);
    });

    /**
     * Specify if the device should power its ethernet module.
     *
     * @param {Number} newVal The value to write for the power enable register.
     *      If > 0, the ethernet module will be enabled by default.
    **/
    this.setPowerEthernet = createErrorSafeSetter(function (newVal)
    {
        device.write('POWER_ETHERNET', newVal);
        device.write('POWER_ETHERNET_DEFAULT', newVal);
    });

    /**
     * Specify if the device should power its WiFi module.
     *
     * @param {Number} newVal The value to write for the power enable register.
     *      If > 0, the WiFi module will be enabled by default.
    **/
    this.setPowerWiFi = createErrorSafeSetter(function (newVal)
    {
        device.write('POWER_WIFI', newVal);
        device.write('POWER_WIFI_DEFAULT', newVal);
    });

    /**
     * Indicate if the current WiFi settings should be applied.
     *
     * Indicate if the current WiFi settings should be applied to the device as
     * the default settings. This is necessary to make changes to the current
     * settings.
    **/
    this.saveDefaultConfig = createErrorSafeSetter(function ()
    {
        device.write('WIFI_APPLY_SETTINGS', 1);
    });

    this.isWiFiConnected = createErrorSafeGetter(function () {
        return device.read('WIFI_STATUS') == 2900;
    });

    this.device = device;
}


/**
 * Change the numerical representation of an IP address to a string rep.
 *
 * Change the numerical representation of an IP address to a string
 * representation like XXX.XXX.X.X.
 *
 * @param {Number} target The numerical representation of an IP address to
 *      convert.
 * @return {String} The string representation of the provided IP address.
**/
function readIP(target)
{
    var ipStr = '';
    ipStr += String(target >> 24 & 255);
    ipStr += ".";
    ipStr += String(target >> 16 & 255);
    ipStr += ".";
    ipStr += String(target >> 8 & 255);
    ipStr += ".";
    ipStr += String(target & 255);
    return ipStr;
}


/**
 * Change the string representation of an IP address to a numerical rep.
 *
 * Change the string representation of an IP address (like XXX.XXX.X.X) to a
 * numerical representation of an IP address.
 *
 * @param {String} target The string IP address (of form XXX.XXX.X.X) to convert
 *      to a numerical form.
 * @return {Number} The numerical representation of the provided IP address.
**/
function writeIP(target)
{
    var ipPieces = target.split('.').map(function (e) {
        return Number(e);
    });

    var retVal = 0;
    retVal = ipPieces[0] << 24 | retVal;
    retVal = ipPieces[1] << 16 | retVal;
    retVal = ipPieces[2] << 8 | retVal;
    retVal = ipPieces[3] | retVal;
    return (new Long(retVal, 0)).toNumber();
}


/**
 * Populate the network configuration controls with a device's current values.
 *
 * Populate the network configuration GUI controls with the corresponding values
 * that a given device currently has for its network configuration settings.
 *
 * @param {Object} device The DeviceNetworkAdapater to get the values from.
 * @param {function} onError The function to call if an error is encountered
 *      during population.
 * @param {function} onSuccess The function to call after the fields are
 *      popualted.
**/
function showCurrentDeviceSettings(device, onError, onSuccess)
{
    var curTab = getActiveTabID();
    try {
        
        if (device.isPro()) {
            $('#wifi-network-name-input').val(device.getWiFiNetwork());
            $('#wifi-network-password-input').val(device.getWiFiNetworkPassword());
            $('#wifi-ip-input').val(device.getWiFiIPAddress());
            $('#wifi-subnet-input').val(device.getWiFiSubnet());
            $('#wifi-gateway-input').val(device.getWiFiGateway());
        }

        $('#ethernet-ip-input').val(device.getEthernetIPAddress());
        $('#ethernet-subnet-input').val(device.getEthernetSubnet());
        $('#ethernet-gateway-input').val(device.getEthernetGateway());
        $('#default-dns-input').val(device.getDNS());
        $('#alt-dns-input').val(device.getAltDNS());

        configureForCurrentDeviceSettings(device);

        onSuccess();

    } catch (e) {
        if (e.code == FLASH_UNAVAILABLE_ERROR) {
            $('#flash-read-notice').slideDown();
            setTimeout(
                function () {
                    if (curTab === getActiveTabID())
                        showCurrentDeviceSettings(device, onError, onSuccess);
                },
                3000
            );
        } else {
            showError(e);
        }
    }
}


/**
 * Change the view to show the settings that can be set for the current device.
 *
 * Change the GUI to reflect the configuration settings that can be chanced for
 * the current device.
 *
 * @param {DeviceNetworkAdapater} device Decorated device to adapt the GUI for.
**/
function configureForCurrentDeviceSettings (device) 
{
    if (device.isPro()) {
        $('#wifi-note').hide();
        $('#wifi-controls').show();
        $('#wifi-advanced-controls').show();
    } else {
        $('#wifi-controls').hide();
        $('#wifi-advanced-controls').hide();
        $('#wifi-note').show();
    }

    if (device.isEthernetEnabled()) {
        $('#ethernet-switch').prop('checked', true);
    } else {
        $('#ethernet-switch').prop('checked', false);
    }

    if (device.isWiFiEnabled()) {
        $('#wifi-switch').prop('checked', true);
    } else {
        $('#wifi-switch').prop('checked', false);
    }

    if (device.getEthernetDHCPEnabled()) {
        $('#ethernet-dhcp-switch').prop('checked', true);
        $('#ethernet-static-ip-settings').hide();
    } else {
        $('#ethernet-dhcp-switch').prop('checked', false);
        $('#ethernet-static-ip-settings').show();
    }

    if (device.getWiFiDHCPEnabled()) {
        $('#wifi-dhcp-switch').prop('checked', true);
        $('#wifi-static-ip-settings').hide();
    } else {
        $('#wifi-dhcp-switch').prop('checked', false);
        $('#wifi-static-ip-settings').show();
    }
}


/**
 * Handler for when a device is select / unselected for configuration.
**/
function onChangeSelectedDevices()
{
    $('#device-configuration-pane').hide();

    var selectedCheckboxes = $('.device-selection-checkbox:checked');
    if(selectedCheckboxes.length === 0)
        return;
    else if(selectedCheckboxes.length == 1)
        $('#multiple-device-note').hide();
    else
        $('#multiple-device-note').show();

    var keeper = device_controller.getDeviceKeeper();
    var deviceSerial = selectedCheckboxes[0].id.replace('-selector', '');
    var device = new DeviceNetworkAdapter(keeper.getDevice(deviceSerial));
    selectedDevice = device;

    showCurrentDeviceSettings(device, genericErrorHandler, function () {
        $('#flash-read-notice').slideUp();
        $('#device-configuration-pane').fadeIn();
    });
}


/**
 * Prepare the UI and event listeners for managing multiple devices.
 *
 * Prepare and show the more complex UI necessary for managing / configuring
 * multiple devices.
 *
 * @param {Array} decoratedDevices Array of DeviceNetworkAdapters for the
 *      devices that this module should configure.
**/
function prepareMultipleDeviceConfiguration(decoratedDevices)
{
    var location = fs_facade.getExternalURI(DEVICE_SELECTOR_SRC);
    fs_facade.renderTemplate(
        location,
        {'devices': decoratedDevices},
        genericErrorHandler,
        function(renderedHTML)
        {
            $(DEVICE_SELECTOR_PANE_SELECTOR).html(renderedHTML);
            $('.device-selection-checkbox').click(onChangeSelectedDevices);
            $('.device-selection-checkbox').first().prop('checked', true);
            onChangeSelectedDevices();
            $('.switch').bootstrapSwitch();
        }
    );
}


/**
 * Prepare the UI and event listeners for managing a single device.
 *
 * Prepare and show a simplier UI with controls needed for managing /
 * configuring a single device.
 *
 * @param {Object} decoratedDevice The DeviceNetworkAdapater for the device this
 *      module will be responsible for managing / configuring.
**/
function prepareIndividualDeviceConfiguration(decoratedDevice)
{
    showCurrentDeviceSettings(decoratedDevice, genericErrorHandler, function(){
        $('#device-configuration-pane').css('display', 'inline');
        $('#flash-read-notice').slideUp();
        $('.switch').bootstrapSwitch();
    });
}


/**
 * Write the configuration values the user specified in GUI to the device.
 *
 * Convert the user's specification of configuration values as provided through
 * Kipling's GUI into values appropriate for the device and write those values
 * to the device.
 *
 * @param {DeviceNetworkAdapter} device Decorated device to operate on /
 *      configure.
**/
function writeDefaultConfiguationValues(device)
{
    if (device.isPro()) {
        if (!device.isWiFiConnected()) {
            device.setPowerWiFi(0);
            device.saveDefaultConfig();
        }
        device.setDefaultWiFiNetwork($('#wifi-network-name-input').val());
        device.setDefaultWiFiNetworkPassword(
            $('#wifi-network-password-input').val());
        device.setDefaultWiFiIPAddress($('#wifi-ip-input').val());
        device.setDefaultWiFiSubnet($('#wifi-subnet-input').val());
        device.setDefaultWiFiGateway($('#wifi-gateway-input').val());
    }

    device.setDefaultDNS($('#default-dns-input').val());
    device.setDefaultAltDNS($('#alt-dns-input').val());
    device.setDefaultEthernetIPAddress($('#ethernet-ip-input').val());
    device.setDefaultEthernetSubnet($('#ethernet-subnet-input').val());
    device.setDefaultEthernetGateway($('#ethernet-gateway-input').val());

    if($('#ethernet-dhcp-switch').is(':checked')) {
        device.setEthernetDHCPEnable(1);
    } else {
        device.setEthernetDHCPEnable(0);
    }

    if ($('#ethernet-switch').is(':checked')) {
        device.setPowerEthernet(1);
    } else {
        device.setPowerEthernet(0);
    }

    if (device.isPro()) {
        if ($('#wifi-dhcp-switch').is(':checked')) {
            device.setWiFiDHCPEnable(1);
        } else {
            device.setWiFiDHCPEnable(0);
        }
        
        if($('#wifi-switch').is(':checked')) {
            device.setPowerWiFi(1);
        } else {
            device.setPowerWiFi(0);
        }
    }

    device.saveDefaultConfig();
}


function showFlashWait(callback)
{
    var canceled = false;
    $('#cancel-flash-button').off('click');
    $('#cancel-flash-button').click(function () {
        canceled = true;
        $('#save-indicator').hide();
        $('#saved-indicator').hide();
        $('#flash-write-notice').hide();
        $('#update-button').slideDown();
    });
    $('#flash-write-notice').fadeIn();
    setTimeout(
        function () {
            if (canceled)
                return;

            $('#flash-write-notice').fadeOut();
            callback();
        },
        3000
    );
}


/**
 * Write configuration values for all devices with updates to GUI.
 *
 * Configure the GUI to indicate that configuration settings are being written
 * to a device. This will both update the GUI and start the actual write.
**/
function writeConfigurationValues()
{
    $('#update-button').slideUp();
    $('#saved-indicator').hide();
    $('#save-indicator').slideDown();
    try {
        writeDefaultConfiguationValues(selectedDevice);
        $('#save-indicator').hide();
        $('#saved-indicator').slideDown();
        $('#update-button').slideDown();
    }
    catch (e) {
        if (e.code === FLASH_UNAVAILABLE_ERROR) {
            showFlashWait(writeConfigurationValues);
        } else {
            showError(e);
        }
    }
    return false;
}


/**
 * Initialization logic for the network configuration module.
**/
$('#network-configuration').ready(function(){
    var keeper = device_controller.getDeviceKeeper();
    var devices = keeper.getDevices();

    var decoratedDevices = devices.map(function(device) {
        return new DeviceNetworkAdapter(device);
    });

    var targetDevice = decoratedDevices[0];
    $('#advanced-settings').hide();
    $('#multiple-device-note').hide();
    $('#save-indicator').hide();
    $('#saved-indicator').hide();

    $('#update-button').click(writeConfigurationValues);

    $('#show-advanced-settings-link').click(function () {
        $('#advanced-settings-collapsed').hide(0, function () {
            $('#advanced-settings').slideDown();
        });
    });

    $('#ethernet-dhcp-switch').change(function () {
        if ($('#ethernet-dhcp-switch').is(':checked')) {
            $('#ethernet-static-ip-settings').slideUp();
        } else {
            $('#ethernet-static-ip-settings').slideDown();
        }
    });

    $('#wifi-dhcp-switch').change(function () {
        if ($('#wifi-dhcp-switch').is(':checked')) {
            $('#wifi-static-ip-settings').slideUp();
        } else {
            $('#wifi-static-ip-settings').slideDown();
        }
    });

    selectedDevice = targetDevice;
    if(decoratedDevices.length == 1)
        prepareIndividualDeviceConfiguration(decoratedDevices[0]);
    else
        prepareMultipleDeviceConfiguration(decoratedDevices);
});
