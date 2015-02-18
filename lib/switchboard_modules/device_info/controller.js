/**
 * Controller for the device info inspector.
 *
 * Logic / controller for the device info inspector, a module that allows the
 * user to see basic device information.
 *
 * @author Chris Johnson  (labJack Corp, 2013)
 * @author A. Samuel Pottinger (LabJack Corp, 2013)
**/

var device_controller = require('./device_controller');

function ACTIVE_KIPLING_MODULE() {
var activeDevice = null;
var DEVICE_DISPLAY_SRC = 'device_info/device_display.html';
var DEVICE_NAME_DEFAULT_REGISTER = 60500;
var NAME_MAX_LEN = 49;


function formatAsIP(ipAddress) {
    var ipString = "";
    ipString += ((ipAddress>>24)&0xFF).toString();
    ipString += ".";
    ipString += ((ipAddress>>16)&0xFF).toString();
    ipString += ".";
    ipString += ((ipAddress>>8)&0xFF).toString();
    ipString += ".";
    ipString += ((ipAddress)&0xFF).toString();
    return ipString;
}


/**
 * Render a template with the information for a device.
 *
 * @param {device_controller.Device} device Object with device information.
 * @param {Object} specialInfo Object with additional info about the connected
 *      model.
 * @param {function} onSuccess The function to call after the device info is
 *      being displayed.
**/
function showDevice(device, onSuccess)
{
    activeDevice = device;
    var location = fs_facade.getExternalURI(DEVICE_DISPLAY_SRC);
    var isPro;
    var templateValues;
    var firmwareVersion;
    var bootloaderVersion;
    var wifiFirmwareVersion;
    var ethIPNum;
    var ethernetMac;
    var wifiIPNum;
    var internalTemp;
    var wifiMac;
    var currentSourceA;
    var currentSourceB;
    var isCalibrationValid;
    var deviceCalibrationMessage;
    var deviceCalibrationLongMessage;

    isCalibrationValid = device.cachedCalibrationValidity;
    if(isCalibrationValid) {
        deviceCalibrationMessage = 'Good';
        deviceCalibrationLongMessage = 'Device Calibration is Valid';
    } else {
        deviceCalibrationMessage = 'Invalid';
        deviceCalibrationLongMessage = 'Device Calibration is Invalid, email support@labjack.com';
    }

    try {
        isPro = device.read('HARDWARE_INSTALLED') != 0;
    } catch (e) {
        showAlert(
            'Failed to communicate with device: ' + e.toString()
        );
        isPro = false;
    }

    try {
        firmwareVersion = device.getFirmwareVersion().toFixed(4);
    } catch (e) {
        showAlert(
            'Failed to communicate with device: ' + e.toString()
        );
        firmwareVersion = '[ could not read firmware version]'
    }
    if(isPro) {
        try {
            wifiFirmwareVersion = device.getWifiFirmwareVersion().toFixed(4);
        } catch (e) {
            showAlert(
                'Failed to communicate with device: ' + e.toString()
            );
            wifiFirmwareVersion = '[ could not read WiFi firmware version]'
        }
    }

    try {
        bootloaderVersion = device.getBootloaderVersion().toFixed(4);
    } catch (e) {
        showAlert(
            'Failed to communicate with device: ' + e.toString()
        );
        bootloaderVersion = '[ could not read bootloader version ]';
    }

    try {
        ethIPNum = device.read('ETHERNET_IP');
        if(ethIPNum !== 0) {
            ethernetIP = formatAsIP(ethIPNum);
        } else {
            ethernetIP = 'Not Connected';
        }
        
    } catch (e) {
        showAlert(
            'Failed to communicate with device: ' + e.toString()
        );
        ethernetIP = '[ could not read ethernet IP address ]';
    }
    try {
        ethernetMac = device.readUINT64('ethernet');
    } catch (e) {
        showAlert(
            'Failed to communicate with device: ' + e.toString()
        );
        ethernetMac = '[ could not read ethernet mac address ]';
    }

    try {
        wifiIPNum = device.read('WIFI_IP');
        if(wifiIPNum !== 0) {
            wifiIP = formatAsIP(wifiIPNum);
        } else {
            wifiIP = 'Not Connected';
        }
    } catch (e) {
        showAlert(
            'Failed to communicate with device: ' + e.toString()
        );
        wifiIP = '[ could not read wifi IP address ]';
    }
    try {
        internalTemp = device.read('TEMPERATURE_DEVICE_K');
        internalTemp = internalTemp.toFixed(2);
    } catch (e) {
        showAlert(
            'Failed to communicate with device: ' + e.toString()
        );
        internalTemp = '[ could not read temperature ]';
    }
    try {
        currentSourceA = device.read('CURRENT_SOURCE_200UA_CAL_VALUE');
        currentSourceA *= 1000000;
        currentSourceA = currentSourceA.toFixed(3);
    } catch (e) {
        showAlert(
            'Failed to communicate with device: ' + e.toString()
        );
        currentSourceA = '[ could not read 200UA Current Source Cal ]';
    }
    try {
        currentSourceB = device.read('CURRENT_SOURCE_10UA_CAL_VALUE');
        currentSourceB *= 1000000;
        currentSourceB = currentSourceB.toFixed(3);
    } catch (e) {
        showAlert(
            'Failed to communicate with device: ' + e.toString()
        );
        currentSourceB = '[ could not read 10UA Current Source Cal ]';
    }


    try {
        wifiMac = device.readUINT64('wifi');
    } catch (e) {
        showAlert(
            'Failed to communicate with device: ' + e.toString()
        );
        wifiMac = '[ could not read wifi mac address ]';
    }

    try {
        powerEthernet = device.read('POWER_ETHERNET');
    } catch (e) {
        showAlert('Could not read POWER_ETHERNET');
        powerEthernet = false;
    }

    try {
        powerWifi = device.read('POWER_WIFI');
    } catch (e) {
        showAlert('Could not read POWER_WIFI');
        powerWifi = false;
    }

    try {
        powerAin = device.read('POWER_AIN');
    } catch (e) {
        showAlert('Could not read POWER_AIN');
        powerAin = false;
    }

    try {
        powerLed = device.read('POWER_LED');
    } catch (e) {
        showAlert('Could not read POWER_LED');
        powerLed = false;
    }
    try {
        powerWatchdog = device.read('WATCHDOG_ENABLE_DEFAULT');
    } catch (e) {
        showAlert('Could not read WATCHDOG_ENABLE_DEFAULT');
        powerWatchdog = false;
    }

    templateValues = {
        'device': device,
        'firmware': firmwareVersion,
        'bootloader': bootloaderVersion,
        'ethernetIP': ethernetIP,
        'ethernetMac': ethernetMac,
        'wifiIP': wifiIP,
        'wifiMac': wifiMac,
        'isPro': isPro,
        'powerEthernet': powerEthernet,
        'powerWifi': powerWifi,
        'powerAin': powerAin,
        'powerLed': powerLed,
        'wifiFirmware': wifiFirmwareVersion,
        'internalTemp': internalTemp,
        'currentSourceA': currentSourceA,
        'currentSourceB': currentSourceB,
        'powerWatchdog': powerWatchdog,
        'isCalibrationValid': isCalibrationValid,
        'deviceCalibrationMessage': deviceCalibrationMessage,
        'deviceCalibrationLongMessage': deviceCalibrationLongMessage
    };

    if (isPro) {
        templateValues.specialImageSuffix = '-pro';
        templateValues.specialText = ' Pro';
    }

    fs_facade.renderTemplate(
        location,
        templateValues,
        genericErrorHandler,
        function(renderedHTML)
        {
            $('#device-info-display').html(renderedHTML);

            $('#change-name-link').unbind();
            $('#change-name-link').bind('click',function () {
                $('#change-name-controls').slideDown();
            });

            var changeNameListener = function () {
                var newName = $('#new-name-input').val();
                changeDeviceName(device, newName);
                $('#change-name-controls').slideUp();
            };

            $('#change-name-button').unbind();
            $('#change-name-button').bind('click',changeNameListener);
            
            $('#cancel-change-name-button').unbind();
            $('#cancel-change-name-button').bind('click',function() {
                $('#change-name-controls').slideUp(function() {
                    $('#new-name-input').val('');
                });
            });

            $('#new-name-input').unbind();
            $('#new-name-input').keypress(function (event) {
                if ( event.which == 13 ) {
                    event.preventDefault();
                    changeNameListener();
                }
            });

            $('#selected-device-display').html(device.getSerial());

            onSuccess();
        }
    );
}


/**
 * Show the information about a device given its serial number.
 *
 * @param {String} serial The serial number of the device to display information
 *      for.
**/
function showDeviceSerial(serial)
{
    var device = device_controller.getDeviceKeeper().getDevice(serial);
    if(device === null)
    {
        showAlert('Could not load device info.');
        return;
    }

    $('#device-info-display').hide();
    showDevice(device, function(){$('#device-info-display').fadeIn();});
    device.getCalibrationStatus(function(isCalValid) {
        showDevice(device, function() {
            $('#device-info-display').fadeIn();
            // Initializing the inputListeners allows for excape key presses to
            // cancel out of input boxes and undo the changes.
            KEYBOARD_EVENT_HANDLER.initInputListeners();
        });
    });
}


/**
 * Change the name of a device.
 *
 * Updates the device name as shown in Switchboard's GUI as well as on the
 * device itself.
 *
 * @param {device_controller.Device} device The device to operate on / the
 *      device whose name should be changed.
 * @param {String} newName The new name to give this device.
**/
function changeDeviceName (device, newName)
{
    newName = newName.replace('.', '');
    newName = newName.substr(0, 49);

    try {
        device.setName(newName);
    } catch (e) {
        showAlert('Failed to set device name: ' + e.toString());
    }

    $('#current-name-display').html(newName);
    $('#change-name-controls').slideUp();
}


/**
 * Read the name of a device.
 *
 * Request the name of a device from the device itself. Note that, if the name
 * was changed before a power cycle, the new name may not be provided.
 *
 * @param {device_controller.Device} device The device to read the name from.
**/
function getDeviceName (device)
{
    try {
        return device.read('DEVICE_NAME_DEFAULT');
    } catch (e) {
        showAlert('Could not read device info: ' + e.toString());
        return '[ Could not read name. ]';
    }
}


/**
 * Module initialization logic for the device info inspector.
**/
$('#device-info-inspector').ready(function(){
    // Attach event listener
    $('.device-selection-radio').first().prop('checked', true);
    $('.device-selection-radio').change(function(event){
        var serial = event.target.id.replace('-selector', '');
        showDeviceSerial(serial);
    });

    var devices = device_controller.getDeviceKeeper().getDevices();
    var device = devices[0];

    device.getCalibrationStatus(function(isCalValid) {
        showDevice(device, function(){
            $('#device-info-display').fadeIn();
            // Initializing the inputListeners allows for excape key presses to
            // cancel out of input boxes and undo the changes.
            KEYBOARD_EVENT_HANDLER.initInputListeners();
        });
    });
});

var test = function() {
    var testCh = function(ch,val) {
        ch = ch.toString();
        var origVal = d.read('AIN'+ch+'_SETTLING_US');
        d.write('AIN'+ch+'_SETTLING_US',val);
        var reportedVal = d.read('AIN'+ch+'_SETTLING_US');
        d.write('AIN'+ch+'_SETTLING_US',origVal);
        var finalVal = d.read('AIN'+ch+'_SETTLING_US');
        var str = ch+'\t';
        str += origVal.toString()+'\t\t';
        str += val.toString()+'\t\t';
        str += reportedVal.toString()+'\t\t\t';
        str += finalVal.toString()+'\t\t';
        var result = false;
        if (val == reportedVal) {
            result = true;
        }
        str += result.toString();
        console.log(str);
        return result;
    };
    var d = activeDevice;
    var reportAllSettling = d.read('AIN_ALL_SETTLING_US');
    d.write('AIN_ALL_SETTLING_US',200);
    console.log('Testing _SETTLING_US');
    console.log('Original AIN_ALL_SETTLING_US',reportAllSettling,'now set to 200');
    var str = 'Ch\torig.\ttest\treported\tfinal\tresult';
    console.log(str);
    var result = true;
    for (i=0; i<13; i++) {
        var res = testCh(i,10);
        result = result && res;
    }
    if(result) {
        result = 'Passed';
    } else {
        result = 'Failed';
    }
    console.log('Overall Result:',result);
};
this.test = test;
}
var ACTIVE_KIPLING_MODULE = new ACTIVE_KIPLING_MODULE();