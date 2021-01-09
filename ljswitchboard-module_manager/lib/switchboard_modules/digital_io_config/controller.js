/**
 * Logic for the digital I/O configuration and monitoring module.
 *
 * @author A. Samuel Pottinger (LabJack Corp, 2013)
**/

var async = require('async');
var q = require('q');

const package_loader = global.package_loader;
const fs_facade = package_loader.getPackage('fs_facade');

var IO_CONFIG_PANE_SELECTOR = '#io-config-pane';

var REGISTERS_DATA_SRC = 'digital_io_config/registers.json';
var INDIVIDUAL_TEMPLATE_SRC = 'digital_io_config/individual_device_config.html';
var MULTIPLE_TEMPLATE_SRC = 'digital_io_config/multiple_device_config.html';
var LOADING_IMAGE_SRC = 'static/img/progress-indeterminate-ring-light.gif';
var REFRESH_DELAY = 1000;

var targetedDevices = [];

var curTabID = getActiveTabID();
var curDevSelection = 0;


/**
 * Flexible error handler for device communication failure.
 *
 * @param {Object} err The error to report. If err has a retError attribute,
 *      that attribute will be used to describe the error. Otherwise the err
 *      parameter's toString function will be used.
**/
function handleError (err) {
    if (err.retError === undefined) {
        showAlert(
            'Failed to communicate with the device. Error: ' + err.toString()
        );
    } else {
        showAlert(
            'Failed to communicate with the device. Error: ' +
            err.retError.toString()
        );
    }
}


/**
 * Render the controls and display for an individual device.
 *
 * @param {Array} registers An Array of Object with information about the
 *      registers that controls and displays should be created for.
 * @param {Array} devices An Array of Object with information about the devices
 *      that the display / controls should operate on.
 * @param {function} onSuccess The optional callback to call after the controls
 *      have been rendered.
**/
function renderIndividualDeviceControls(registers, device, onSuccess)
{
    var location = fs_facade.getExternalURI(INDIVIDUAL_TEMPLATE_SRC);
    fs_facade.renderTemplate(
        location,
        {'registers': registers, 'device': device},
        genericErrorHandler,
        function(renderedHTML)
        {
            $(IO_CONFIG_PANE_SELECTOR).html(renderedHTML);
            $('.switch').bootstrapSwitch();

            if(onSuccess !== undefined)
                onSuccess();
        }
    );
}


/**
 * Render the controls and display suitable for manipulating many devices.
 *
 * @param {Array} registers An Array of Object with information about the
 *      registers that controls and displays should be created for.
 * @param {Array} devicd An Array ofObject with informationabout the devices
 *      that the display / controls should operate on.
 * @param {function} onSuccess The optional callback to call after the controls
 *      have been rendered.
**/
function renderManyDeviceControls(registers, devices, onSuccess)
{
    var location = fs_facade.getExternalURI(MULTIPLE_TEMPLATE_SRC);
    fs_facade.renderTemplate(
        location,
        {'registers': registers, 'devices': devices},
        genericErrorHandler,
        function(renderedHTML)
        {
            $(IO_CONFIG_PANE_SELECTOR).html(renderedHTML);
            $('.switch').bootstrapSwitch();

            if(onSuccess !== undefined)
                onSuccess();
        }
    );
}


// TODO: The fact that this updates the view right off may violate MVC.
/**
 * Read the state of the digital lines configured as input.
 *
 * Read the state of the digital (FIO) lines configured as input on the selected
 * devices. This function will update the view in the process.
 *
 * @return {q.promise} Promise that resolves after the read is complete.
 *      Rejects on error and resolves to nothing.
**/
function readInputs ()
{
    var deferred = q.defer();
    async.each(
        targetedDevices,
        function (device, callback) {
            var regs = $('.direction-switch-check:not(:checked)').map(
                function () {
                    return parseInt(this.id.replace('-switch', ''));
                }
            ).get();
            var promise = device.readMany(regs, callback);
            promise.then(
                function (results) {
                    var numRegs = regs.length;
                    for (var i=0; i<numRegs; i++) {
                        var value = results[i];
                        var reg = regs[i];
                        const targetID = '#' + device.getDeviceType() + '-' + device.getSerial() + '-' + reg;

                        $(targetID).removeClass('inactive');
                        $(targetID).removeClass('active');
                        if (Math.abs(value - 1) < 0.1) {
                            $(targetID).addClass('active');
                        } else {
                            $(targetID).addClass('inactive');
                        }
                    }
                    callback();
                },
                callback
            );
        },
        function (err) {
            if (err) {
                deferred.reject(err);
            } else {
                deferred.resolve();
            }
        }
    );

    return deferred.promise;
}


// TODO: The fact that this reads right from the view may violate MVC.
/**
 * Write the state of all FIO lines configured as output.
 *
 * Sets of all of the digital (FIO) lines to the user selected state on all of
 * the currently selected devices.
 *
 * @return {q.promise} Promise that resolves (to nothing) after the device
 *      write operations complete. Rejects on error.
**/
function writeOutputs ()
{
    var deferred = q.defer();
    async.each(
        targetedDevices,
        function (device, callback) {
            var regs = $('.direction-switch-check:checked').map(
                function () {
                    return parseInt(this.id.replace('-switch', ''));
                }
            ).get();
            var numRegs = regs.length;
            var addresses = [];
            var values = [];
            for (var i=0; i<numRegs; i++) {
                var reg = regs[i];
                const targetID = '#' + reg + '-output-switch';
                if($(targetID).is(":checked"))
                    values.push(1);
                else
                    values.push(0);
                addresses.push(reg);
            }
            if (addresses.length == 0) {
                deferred.resolve();
            } else {
                var promise = device.writeMany(addresses, values);
                promise.then(callback, callback);
            }
        },
        function (err) {
            if (err) {
                deferred.reject(err);
            } else {
                deferred.resolve();
            }
        }
    );

    return deferred.promise;
}


/**
 * Convenience function that writes all outputs and then reads all inputs.
 *
 * Convenience function that writes all outputs and then reads all inputs before
 * scheduling another set of read / write operations. This will return without
 * operation or setting a timeout if the tab has changed or the device selection
 * was updated.
**/
function readInputsWriteOutputs (expectedDevSelection)
{
    var shouldStop = curTabID !== getActiveTabID();
    shouldStop = shouldStop || curDevSelection != expectedDevSelection
    if ( shouldStop ) {
        return;
    }

    writeOutputs()
    .then(readInputs, handleError)
    .then(
        function() {
            setTimeout(
                function () { readInputsWriteOutputs(expectedDevSelection); },
                REFRESH_DELAY
            );
        },
        handleError
    );
}


/**
 * JQuery event handler to manage user toggling the direction of an FIO line.
 *
 * JQuery event handler that actuates changing an FIO line from an input to an
 * output or an output to an input.
**/
function changeFIODir (event)
{
    var selectedSwitch = event.target.id;
    var targetID = selectedSwitch.replace('-switch', '');
    var targetIndicators = '.state-indicator-' + targetID;
    var targetOutputSwitch = '#' + targetID + '-output-switch';

    if ($(event.target).is(":checked")) {
        $(targetIndicators).slideUp(function () {
            $(targetOutputSwitch).parent().parent().slideDown();
            var numDevices = targetedDevices.length;
        });
    } else {
        $(targetOutputSwitch).parent().parent().slideUp(function () {
            $(targetIndicators).slideDown();
        });
    }
}


/**
 * Change the list of devices that are currently being manipulated.
 *
 * Change the list of devices that are currently being manipulated by this
 * digital I/O configuration module.
 *
 * @param {Array} devices An Array of Object with information about the
 *      registers that this module should manage for each device.
**/
function changeActiveDevices(registers)
{
    curDevSelection++;
    $(IO_CONFIG_PANE_SELECTOR).fadeOut(function(){
        var devices = [];
        var keeper = device_controller.getDeviceKeeper();

        $('.device-selection-checkbox:checked').each(function(){
            var serial = this.id.replace('-selector', '');
            devices.push(keeper.getDevice(serial));
        });

        var onRender = function() {
            $(IO_CONFIG_PANE_SELECTOR).fadeIn();
            targetedDevices = devices;
            setTimeout(
                function () { readInputsWriteOutputs(curDevSelection); },
                REFRESH_DELAY
            );
            $('.direction-switch-check').change(changeFIODir);
            $('.output-switch-check').parent().parent().hide();
        };

        if(devices.length == 1)
        {
            renderIndividualDeviceControls(registers, devices[0], onRender);
        }
        else
        {
            renderManyDeviceControls(registers, devices, onRender);
        }
    });
}


/**
 * Initialization logic for the digital IO config module.
**/
$('#digital-io-configuration').ready(function(){
    var keeper = device_controller.getDeviceKeeper();
    var devices = keeper.getDevices();
    const currentDeviceSelector = '#' + devices[0].getSerial() + '-selector';

    $(currentDeviceSelector).attr('checked', true);

    $(IO_CONFIG_PANE_SELECTOR).empty().append(
        $('<img>').attr('src', LOADING_IMAGE_SRC)
    );

    var registersSrc = fs_facade.getExternalURI(REGISTERS_DATA_SRC);
    fs_facade.getJSON(registersSrc, genericErrorHandler, function(registerData){
        renderIndividualDeviceControls(
            registerData,
            devices[0],
            function () {
                $('.direction-switch-check').change(changeFIODir);
                $('.output-switch-check').parent().parent().hide();
            }
        );
        targetedDevices = [devices[0]];
        devices[0].write('FIO_DIRECTION', 0);
        setTimeout(
            function () { readInputsWriteOutputs(curDevSelection); },
            REFRESH_DELAY
        );

        $('.device-selection-checkbox').click(function(){
            changeActiveDevices(registerData);
        });
    });
});
