/**
 * Logic for analog output (DAC) controls module.
 *
 * @author A. Samuel Pottinger (LabJack Corp, 2013)
**/

var sprintf = require('sprintf-js');

var CONFIG_PANE_SELECTOR = '#configuration-pane';
var OUTPUTS_TEMPLATE_SRC = 'analog_outputs/output_controls.html';
var OUTPUTS_DATA_SRC = 'analog_outputs/outputs.json';

var devices;


/**
 * Wrapper around device_controller.Devices for analog output manipulation.
 *
 * A manager for device_controller.Device structures, making the devices
 * easier to manipulate for analog outputs (DACs)
**/
function AnalogOutputDeviceController () {
    var connectedDevices = [];
    var outputs = new Map();

    /**
     * Configure the current selected devices to have certain DAC values.
     *
     * Configure the currently selected devices to have pre-specified DAC
     * values.
     *
     * @return {Promise} Promise that resolves after the DACs have been
     *      updated on the selected devices. Rejects on case of error.
    **/
    this.configureDACs = function () {
        return new Promise((resolve, reject) => {
            var registers = [];
            var values = [];
            outputs.forEach(function (value, register) {
                register = Number(register);
                if (register !== 0) {
                    registers.push(register);
                    values.push(value);
                }
            });

            var writeValueClosure = function (device) {
                return function () {
                    return device.writeMany(registers, values);
                };
            };

            var numDevices = connectedDevices.length;
            var writeValueClosures = [];
            for (var i = 0; i < numDevices; i++)
                writeValueClosures.push(writeValueClosure(connectedDevices[i]));

            var numClosures = writeValueClosures.length;
            if (numClosures == 0) {
                return Promise.resolve();
            }

            var lastPromise = null;
            for (var i = 0; i < numClosures; i++) {
                if (lastPromise === null)
                    lastPromise = writeValueClosures[i]();
                else
                    lastPromise.then(
                        writeValueClosures[i],
                        reject
                    );
            }

            lastPromise.then(
                () => resolve(),
                (err) => reject(err)
            );
        });
    };

    /**
     * Indicate which devices this manager should operate on.
     *
     * @param {Array} newConnectedDevices An array of device_controller.Device
     *      decorating the devices that this controller should operate on.
     * @return {Promise} Promise that resolves after the specified devices
     *      have their DAC values updated by this manager. Rejects on error.
    **/
    this.setConnectedDevices = function (newConnectedDevices) {
        connectedDevices = newConnectedDevices;
        return this.configureDACs();
    };

    /**
     * Set the value of a specific DAC across all managed devices.
     *
     * @param {Number} register The register of the DAC to write.
     * @param {Number} value The value (volts) to write to the specified DAC.
     * @return {Promise} Promise that resolves after the specified devices
     *      have their DAC values updated by this manager. Rejects on error.
    **/
    this.setDAC = function (register, value) {
        outputs.set(register.toString(), value);
        return this.configureDACs();
    };

    /**
     * Load the values currently specified for the DACs on the device.
     *
     * Load the values currently specified for the DACs on the first selected
     * device.
     *
     * @param {Number} register The register of the DAC to load current values
     *      for.
     * @return {Number} The currentl value of that DAC on the first selected
     *      device.
    **/
    this.loadDAC = function (register) {
        var value = connectedDevices[0].read(Number(register));
        outputs.set(register.toString(), value);
        return value;
    };
}
var analogOutputDeviceController = new AnalogOutputDeviceController();


/**
 * String formatting for the tooltip labels displayed on DAC controls.
 *
 * String formatting convenience function that generates strings for the
 * tooltips displayed on the DAC slider controls.
 *
 * @param {Number} value Floating point number indicating the voltage value
 *      being used on a DAC / analog output.
 * @return {String} Formatted string with the voltage value for a DAC / analog
 *      output.
**/
function formatVoltageTooltip(value)
{
    return sprintf.sprintf("%.2f V", value);
}


/**
 * Event listener for when a voltage value is selected for DAC / analog output.
 *
 * Event listener fired when a voltage value is selected for a DAC / analog
 * output.
 *
 * @param {Event} jQuery event object.
**/
function onVoltageSelected(event)
{
    var register = Number(event.target.id.replace('-control', ''));

    var confirmationSelector = '# ' + register + '-confirmation-display';

    var selectedVoltage = Number($('#'+event.target.id).val());

    console.log($('#'+event.target.id).slider('getValue'));
    $(confirmationSelector).html(
        formatVoltageTooltip(selectedVoltage)
    );

    analogOutputDeviceController.setDAC(register, selectedVoltage).fail(
        function (err) {showAlert(err.retError);});
}


/**
 * Create the DAC / analog output controls.
**/
function createSliders()
{
    $('.slider').slider(
        {formater: formatVoltageTooltip, value: 0}
    ).on('slideStop', onVoltageSelected);

    loadCurrentDACSettings();
}


/**
 * Event listener for changes in the list of active devices.
 *
 * Event listener watching which devices this module is controlling, firing when
 * changes are made to that list. This list indicates which devices have DACs /
 * analog outputs being controled by this module.
**/
function changeActiveDevices()
{
    var checkedDevices = $('.device-selection-checkbox:checked').map(
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

    analogOutputDeviceController.setConnectedDevices(checkedDevices).fail(
        function (err) {showAlert(err.retError);});
    $('#configuration-pane-holder').hide();

    if(checkedDevices.length != 0)
        $('#configuration-pane-holder').fadeIn();
}


/**
 * Load the values currently written to the selected device's DACs.
**/
function loadCurrentDACSettings ()
{
    $('.slider').each(function () {
        var register = Number(this.id.replace('-control', ''));
        var selectedVoltage = analogOutputDeviceController.loadDAC(register);

        $('#' + this.id).slider('setValue', selectedVoltage);

        var confirmationSelector = '#' + register + '-confirmation-display';
        $(confirmationSelector).html(formatVoltageTooltip(selectedVoltage));
    });
}


/**
 * Initialization logic for when the analog outputs module is loaded.
**/
$('#analog-output-config').ready(function(){
    var templateLocation = fs_facade.getExternalURI(OUTPUTS_TEMPLATE_SRC);
    var outputsSrc = fs_facade.getExternalURI(OUTPUTS_DATA_SRC);

    var keeper = device_controller.getDeviceKeeper();
    devices = keeper.getDevices();

    var currentDeviceSelector = '#' + devices[0].getSerial() + '-selector';

    $(currentDeviceSelector).attr('checked', true);
    analogOutputDeviceController.setConnectedDevices([devices[0]]);

    $('.device-selection-checkbox').click(changeActiveDevices);

    fs_facade.getJSON(outputsSrc, genericErrorHandler, function(outputsInfo){
        fs_facade.renderTemplate(
            templateLocation,
            {'outputs': outputsInfo},
            genericErrorHandler,
            function(renderedHTML)
            {
                $(CONFIG_PANE_SELECTOR).hide(function(){
                    $(CONFIG_PANE_SELECTOR).html(renderedHTML);
                    $(CONFIG_PANE_SELECTOR).fadeIn();
                    createSliders();
                });
            }
        );
    });
});
