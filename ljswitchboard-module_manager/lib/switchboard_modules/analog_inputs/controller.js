/**
 * Logic for the analog input module.
 *
 * @author A. Samuel Pottinger (LabJack Corp, 2013)
**/

const package_loader = global.package_loader;
const fs_facade = package_loader.getPackage('fs_facade');

var INPUTS_DATA_SRC = 'analog_inputs/inputs.json';
var RANGES_DATA_SRC = 'analog_inputs/ranges.json';
var RANGES_TEMPLATE_SRC = 'analog_inputs/range_options.html';
var INPUTS_TEMPLATE_SRC = 'analog_inputs/input_config.html';

var CONTROLS_MATRIX_SELECTOR = '#controls-matrix';
var RANGE_LISTS_SELECTOR = '.range-list';
var RANGE_LOADING_INDICATOR_SELECTOR = '#loading-ranges-display';
var selectedDevice;
var devices = [];
var targetInputsInfo;

var SINGLE_ENDED_CONFIG_VAL = 199;
var curDevSelection = 0;


/**
 * Convenience function that executes a string replace all function.
 *
 * Convenience function that executes a string replace function that replaces
 * all instances of a substring with another substring.
 *
 * @param {String} find The substring to find.
 * @param {String} replace The text to replace the find substring with.
 * @param {String} str The string to execute the find / replace operation on.
 * @return {String} The provided str input string after the find / replace
 *      operation.
**/
function replaceAll(find, replace, str) {
  return str.replace(new RegExp(find, 'g'), replace);
}

// TODO: Select ranges based on device type
/**
 * Load information about the available analog input ranges available.
 *
 * Load information about the various analog input ranges that are available
 * for the given device's analog inputs.
 *
 * @return {Promise} Promise for this operation. Resolves to undefined.
**/
function loadRangeOptions()
{
    return new Promise((resolve, reject) => {
        var templateLocation = fs_facade.getExternalURI(RANGES_TEMPLATE_SRC);
        var rangesSrc = fs_facade.getExternalURI(RANGES_DATA_SRC);

        fs_facade.getJSON(rangesSrc, genericErrorHandler, function (rangeInfo) {

            fs_facade.renderTemplate(
                templateLocation,
                {'ranges': rangeInfo},
                reject,
                function (renderedHTML) {
                    $(RANGE_LISTS_SELECTOR).each(function (index, e) {
                        var reg = e.id.replace('-select', '');
                        $(e).html(replaceAll('HOLD', reg, renderedHTML));
                    });
                    $(RANGE_LOADING_INDICATOR_SELECTOR).fadeOut();

                    $('.range-selector').click(function (event) {
                        var pieces = event.target.id;
                        pieces = pieces.replace('-range-selector', '').split('-');
                        rangeVal = parseFloat(pieces[0]);
                        if (pieces[1] === '') {
                            var numInputs = targetInputsInfo.length;
                            for (var i = 0; i < numInputs; i++) {
                                setRange(
                                    targetInputsInfo[i].range_register,
                                    rangeVal
                                );
                            }
                        } else {
                            rangeReg = parseInt(pieces[1], 10);
                            setRange(rangeReg, rangeVal);
                        }
                    });

                    resolve();
                }
            );

        });
    });
}


/**
 * A version of read many that appends the results to an existing array.
 *
 * @param {device_controller.Device} device The device to execute the read many
 *      operation on.
 * @param {Array} results The array to extend with results of the read many.
 * @param {Array} registers Array of addresses or register names to read.
 * @return {Promise} Promise that resolves after the read many completes or
 *      rejects on error. Resolves to nothing as results will be extended to
 *      provide access to the read results.
**/
function extendReadMany (device, results, registers)
{
    return function () {
        return device.readMany(registers).then(function (subResults) {
            results.push.apply(results, subResults);
        });
    };
}


/**
 * Set the range for an analog input.
 *
 * @param {Number or String} rangeAddr The numerical address or the string name
 *      of the register where the range for an input is held.
 * @param {Number} range The positive side of the range. The range will be set
 *      from +range volts to -range volts. Passing 10 will result in a range of
 *      -10 to 10V.
**/
function setRange (rangeAddr, range)
{
    selectedDevice.write(rangeAddr, range);

    var text;
    if (Math.abs(range - 10) < 0.001)
        text = '-10 to 10V';
    else if (Math.abs(range - 1) < 0.001)
        text = '-1 to 1V';
    else if (Math.abs(range - 0.1) < 0.001)
        text = '-0.1 to 0.1V';
    else if (Math.abs(range - 0.01) < 0.001)
        text = '-0.01 to 0.01V';

    const selector = '#input-display-' + rangeAddr;
    $(selector).html(text);
}


/**
 * Read the ranges for analog inputs & start the callback for reading AIN vals.
 *
 * Read the ranges for analog inputs and then start the periodic callback that
 * reads the values of those analog inputs.
 *
 * @param {Object} Structure containing information about the device analog
 *      inputs.
 * @param {Number} targetDevSelection A unique numerical ID specifying which
 *      set of devices have been selected. If the user changes their selection
 *      of devices, that new device selection will be given a new unique
 *      numerical ID. This ensures that old callbacks return without attempting
 *      to access devices.
**/
function readRangesAndStartReadingInputs (inputsInfo, targetDevSelection)
{
    targetInputsInfo = inputsInfo;
    var registers = inputsInfo.map(function (e) {
        return e.range_register;
    });
    var registersSets = [
        registers.slice(0, 8),
        registers.slice(8, 17)
    ];
    var results = [];
    extendReadMany(selectedDevice, results, registersSets[0])()
    .then(extendReadMany(selectedDevice, results, registersSets[1]))
    .then(
        function () {
            var numResults = results.length;
            for (var i=0; i<numResults; i++) {
                var regNum = registers[i];
                var value = results[i];
                var text = 'unknown';

                if (Math.abs(value - 10) < 0.001)
                    text = '-10 to 10V';
                else if (Math.abs(value - 1) < 0.001)
                    text = '-1 to 1V';
                else if (Math.abs(value - 0.1) < 0.001)
                    text = '-0.1 to 0.1V';
                else if (Math.abs(value - 0.01) < 0.001)
                    text = '-0.01 to 0.01V';

                const selector = '#input-display-' + regNum;
                $(selector).html(text);
            }
            setTimeout(function () {
                updateInputs(inputsInfo, targetDevSelection, getActiveTabID());
            }, 1000);
        },
        function (err) {
            console.log(err);
            showAlert(err.retError);
            setTimeout(function () {
                updateInputs(inputsInfo, targetDevSelection, getActiveTabID());
            }, 1000);
        }
    );
}


/**
 * Read all analog inputs again and display their values on the GUI.
 *
 * @param {Object} inputsInfo Information about the analog inputs to read.
 *      Should match the structure in inputs.json within the analog_inputs
 *      Switchboard module.
 * @param {Number} targetDevSelection A unique numerical ID specifying which
 *      set of devices have been selected. If the user changes their selection
 *      of devices, that new device selection will be given a new unique
 *      numerical ID. This ensures that old callbacks return without attempting
 *      to access devices.
**/
function updateInputs (inputsInfo, targetDevSelection, curTabID) {
    var deviceChanged = curDevSelection != targetDevSelection;
    console.log(curTabID);
    console.log(curTabID !== getActiveTabID());
    if (curTabID !== getActiveTabID() || deviceChanged) {
        return;
    }

    var registers = inputsInfo.map(function (e) {
        return e.value_register;
    });
    var registersSets = [
        registers.slice(0, 8),
        registers.slice(8, 17)
    ];
    var results = [];
    extendReadMany(selectedDevice, results, registersSets[0])()
    .then(extendReadMany(selectedDevice, results, registersSets[1]))
    .then(
        function () {
            var numResults = results.length;
            for (var i=0; i<numResults; i++) {
                var regNum = registers[i];
                var value = results[i];
                var selector = '#input-display-' + regNum;
                var barSelect = '#input-bar-' + regNum;
                var width = 100 * ((value + 10) / 20);

                if (width > 100)
                    width = 100;
                if (width < 0)
                    width = 0;

                $(selector).html(value.toFixed(6).toString() + ' V');
                $(barSelect).css('width', String(width) + 'px');
            }
            setTimeout(function () {
                updateInputs(inputsInfo, targetDevSelection, curTabID);
            }, 1000);
        },
        function (err) {
            showAlert(err.retError);
            setTimeout(function () {
                updateInputs(inputsInfo, targetDevSelection, curTabID);
            }, 1000);
        }
    );
}


/**
 * Load the list of inputs for the given device.
 *
 * @return {Promise} A Q promise that resolves to undefined.
**/
function loadInputs()
{
    return new Promise((resolve, reject) => {
        var templateLocation = fs_facade.getExternalURI(INPUTS_TEMPLATE_SRC);
        var inputsSrc = fs_facade.getExternalURI(INPUTS_DATA_SRC);

        fs_facade.getJSON(inputsSrc, genericErrorHandler, function (inputsInfo) {
            targetInputsInfo = inputsInfo;
            fs_facade.renderTemplate(
                templateLocation,
                {'inputs': inputsInfo},
                genericErrorHandler,
                function (renderedHTML) {
                    $(CONTROLS_MATRIX_SELECTOR).hide(function () {
                        $(CONTROLS_MATRIX_SELECTOR).html(renderedHTML);
                        $(CONTROLS_MATRIX_SELECTOR).fadeIn();

                        resolve();
                    });
                }
            );
        });
    });
}

/**
 * Set the current device's analog inputs to be single ended.
**/
function setAllToSingleEnded()
{
    var numInputs = targetInputsInfo.length;
    var addrsToWrite = [];
    var valuesToWrite = [];
    var curInput;
    var curNegativeChannel;

    for (var i=0; i<numInputs; i++) {
        curInput = targetInputsInfo[i];
        if (curInput.negative_channel !== undefined) {
            curNegativeChannel = curInput.negative_channel;
            addrsToWrite.push(curNegativeChannel);
            valuesToWrite.push(SINGLE_ENDED_CONFIG_VAL);
        }
    }

    return selectedDevice.writeMany(addrsToWrite, valuesToWrite);
}


/**
 * Event handler for when the selected list of devices is changed.
 *
 * Event handler for changes in the selected list of devices. This collection
 * indicates which devices have AIN inputs being manipulated by this module.
**/
function changeSelectedDevice()
{
    var selectedCheckboxes = $('.device-selection-radio:checked');
    curDevSelection++;
    $('#loading-ranges-display').show();
    $('#all-device-configuration-controls').hide();
    $('#individual-device-configuration-controls').hide();

    var selectedDevices = $('.device-selection-radio:checked').map(
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
    selectedDevice = selectedDevices[0];

    setAllToSingleEnded().then(
        function () {
            readRangesAndStartReadingInputs(targetInputsInfo, curDevSelection);
            $('#loading-ranges-display').hide();
            $('#all-device-configuration-controls').fadeIn();
            $('#individual-device-configuration-controls').fadeIn();
            document.body.style.display='none';
            document.body.style.display='block';
        },
        function (err) {
            showAlert(err.retError);
        }
    );
}


/**
 * Initialization logic for the analog inputs module.
**/
$('#analog-inputs-configuration').ready(function(){
    $('.device-selection-radio').click(changeSelectedDevice);
    $('.device-selection-radio').first().prop('checked', true);

    var keeper = device_controller.getDeviceKeeper();
    devices = keeper.getDevices();

    loadInputs().then(loadRangeOptions).then(changeSelectedDevice);
});
