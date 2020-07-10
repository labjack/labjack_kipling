var TARGET_REGISTER = {
    factory: 'IO_CONFIG_SET_CURRENT_TO_FACTORY',
    powerup: 'IO_CONFIG_SET_CURRENT_TO_DEFAULT'
};

var FLASH_NOT_READY_ERR = 2358;

var checkedDevices;


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


function onDeviceSelectionChanged () {

    $('#reset-holder').hide();
    var devices = device_controller.getDeviceKeeper().getDevices();

    checkedDevices = $('.device-selection-checkbox:checked').map(
        function () {
            var numDevices = devices.length;
            var serial = this.id.replace('-selector', '');
            for (var i=0; i<numDevices; i++) {
                if (devices[i].getSerial() === serial)
                    return devices[i];
            }
            return null;
        }
    );
    
    if(checkedDevices.length > 0)
        $('#reset-holder').fadeIn();
}


function setDefaults () {
    try {
        $('#saved-indicator').hide();
        $('#reset-button').slideUp();
        $('#saving-indicator').slideDown();
        
        var selectedVal = $('input[name=source]:checked').val();
        for (var i=0; i<checkedDevices.length; i++) {
            checkedDevices[i].write(TARGET_REGISTER[selectedVal], 1);
        }
        
        $('#saving-indicator').slideUp();
        $('#saved-indicator').slideDown();
        $('#reset-button').slideDown();
    
    } catch (e) {
        if (e.code != FLASH_NOT_READY_ERR) {
            showError(e);
            $('#reset-button').slideDown();
        } else {
            $('#flash-read-notice').slideDown();
            setTimeout(function () {
                $('#flash-read-notice').fadeOut();
                setDefaults()
            }, 3000);
        }
    }
}


$('#set-defaults-module').ready(function () {
    $('.device-selection-checkbox').first().attr('checked', true);
    $('.device-selection-checkbox').click(onDeviceSelectionChanged);
    $('#reset-button').click(setDefaults);
    var devices = device_controller.getDeviceKeeper().getDevices();
    checkedDevices = [devices[0]];
});
