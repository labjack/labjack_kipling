/**
 * Logic for a channel dashboard / logging module.
 *
 * @author A. Samuel Pottinger (LabJack Corp, 2013)
**/


var async = require('async');
var handlebars = require('handlebars');
var extend = require('node.extend');

const package_loader = global.package_loader;
const fs_facade = package_loader.getPackage('fs_facade');

var ljmmm = require('./ljmmm');

var REGISTERS_DATA_SRC = 'dashboard_logger/ljm_constants.json';
var DEVICE_CATEG_SELECT_TEMPLATE_SRC = 'dashboard_logger/device_category_selector.html';
var CHANNEL_LIST_TEMPLATE_SRC = 'dashboard_logger/channel_list.html';
var WATCHLIST_TEMPLATE_SRC = 'dashboard_logger/watchlist.html'

var REG_CHECKBOX_ID_TEMPLATE_STR = '#{{name}}-{{address}}-{{serial}}-reg-selector';
var REG_CHECKBOX_ID_TEMPLATE = handlebars.compile(REG_CHECKBOX_ID_TEMPLATE_STR);

var CHANNEL_SELECTOR_HOLDER_SELECTOR = '#channel-selector-holder';

var selectedRegisters = [];


/**
 * Event handler for when the user selects a device to add a channel from.
 *
 * Show the available register tags for a given device, creating the appropriate
 * event listeners that allow the user to select one of those categories to see
 * the registers with that tag.
 *
 * @param {Event} event jQuery event information.
 * @param {Map} registersByTag Dictionary with register tags as keys and Arrays
 *       of register information objects as values.
**/
function selectDevice(event, registersByTag)
{
    var selectedDeviceInfo = $('#device-select-menu').val().split('-');
    var selectedSerial = selectedDeviceInfo[0];
    var selectedName = selectedDeviceInfo[1];

    var displayName = selectedSerial + ' (' + selectedName + ')';
    $('#selected-device-display').html(displayName);

    // TODO: Filter registers by tag to only include those from this device.

    $('#device-selector').slideUp();
    $('#selected-device-display-holder').show();
    $('#category-selector').slideDown();

    $('#category-select-menu option').unbind();
    $('#category-select-menu option').click(function(event){
        selectCategory(event, registersByTag, selectedSerial, selectedName);
    });
}


/**
 * Add information about whether or not the register is selected.
 *
 * Decorate register information objects with a "selected" field indicating
 * if the user has selected the given register for logging. Registers
 * information objects are duplicated and the original register entries passed
 * in are not modified.
 *
 * @param {Array} registers An Array of Object with reigster information.
 * @param {Object} device The device that selected registers should be flagged
 *      for. The same register selected on other devices will be ignored.
 * @return {Array} An Array of Object with register information, including the
 *      newly added "selected" attribute.
**/
function addRegisterSelectedInfo(registers, device)
{
    var targetSerial = device.getSerial();
    var relevantSelectedRegisters = selectedRegisters.filter(function(e){
        return e.device.getSerial() == targetSerial;
    });
    var selectedAddresses = relevantSelectedRegisters.map(function(e){
        return e.register.address;
    });

    var retList = [];
    var newRegister;
    var curAddress;

    var registersLen = registers.length;
    for(var i=0; i<registersLen; i++)
    {
        newRegister = extend({}, registers[i]);
        curAddress = newRegister.address;
        newRegister.selected = selectedAddresses.indexOf(curAddress) != -1;
        retList.push(newRegister);
    }

    return retList;
}


/**
 * Render the list of registers the dashboard / logger is currently watching.
 *
 * Render the list of registers the dashboard / logger is currently watching,
 * adding the appropriate event listeners during renderings.
**/
function refreshWatchList()
{
    selectedRegisters.sort(function(a, b){
        return a.register.address - b.register.address;
    });

    var location = fs_facade.getExternalURI(WATCHLIST_TEMPLATE_SRC);
    if(selectedRegisters.length > 0)
    {
        fs_facade.renderTemplate(
            location,
            {'channels': selectedRegisters},
            genericErrorHandler,
            function(renderedHTML)
            {
                $('#register-watch-table').html(renderedHTML);

                if(selectedRegisters.length == 1)
                    $('#register-watch-table').slideDown();

                $('.remove-from-watchlist-link').click(function(event){
                    var linkID = event.target.id;
                    var infoStr = linkID.replace('-remove-reg-watch-list', '');
                    var regInfo = infoStr.split('-');
                    var regName = regInfo[0];
                    var regAddress = regInfo[1];
                    var serial = regInfo[2];

                    var checkboxID = REG_CHECKBOX_ID_TEMPLATE(
                        {name: regName, address: regAddress, serial: serial}
                    );
                    $(checkboxID).prop('checked', false);
                    
                    selectedRegisters = selectedRegisters.filter(function(e){
                        var deviceSerial = e.device.getSerial();
                        var different = e.register.address != regAddress;
                        different = different || deviceSerial !== serial;
                        return different;
                    });

                    refreshWatchList();
                });
            }
        );
    }
    else
    {
        $('#register-watch-table').slideUp();
    }
}


/**
 * Select the category to filter the available list of registers by.
 *
 * Select the category to filter the available list of registers by and update
 * that registers list, associating the appropriate event listeners.
 *
 * @param {Event} event jQuery event information.
 * @param {Map} registersByTag An indexed layer for register information. A
 *      dict that acts as an index for register information. Keys should be
 *      String tags and values should be Array of Objects with register info
 *      for registers with that tag.
 * @param {String} selectedSerial The serial number of the device that registers
 *      are being displayed for.
 * @param {String} selectedName The name of the device that registers are being
 *      added for.
**/
function selectCategory(event, registersByTag, selectedSerial, selectedName)
{
    var selectedCategory = $('#category-select-menu').val();
    $('#category-selector').slideUp();
    $('#selected-category-display').html(selectedCategory);
    $('#selected-category-display-holder').show();

    var devices = device_controller.getDeviceKeeper().getDevices();
    var device = devices.filter(function(e){
        return e.getSerial() === selectedSerial
    })[0];

    var registers = registersByTag.get(selectedCategory);
    var decoratedRegisters = addRegisterSelectedInfo(registers, device);

    var templateVals = {'registers': decoratedRegisters, 'device': device};

    var onCheckboxChanged = function(event)
    {
        var checkboxID = event.target.id;
        var regInfo = checkboxID.replace('-reg-selector','').split('-');
        var regName = regInfo[0];
        var regAddress = Number(regInfo[1]);

        var jquerySelector = '#' + checkboxID;
        var selected = $(jquerySelector).prop('checked');
        
        if(selected)
        {
            var register = registers.filter(function(e){
                return e.address == regAddress
            })[0];

            selectedRegisters.push(
                {'register': register, 'device': device}
            );
        }
        else
        {
            var targetSerial = device.getSerial();
            selectedRegisters = selectedRegisters.filter(function(e){
                var regSerial = e.device.getSerial();
                var different =  e.register.address != regAddress;
                different = different || targetSerial != regSerial;
                return different;
            });
        }

        refreshWatchList();
    };

    var location = fs_facade.getExternalURI(CHANNEL_LIST_TEMPLATE_SRC);
    fs_facade.renderTemplate(
        location,
        templateVals,
        genericErrorHandler,
        function(renderedHTML)
        {
            $('#channel-select-menu').html('');
            $('#register-selector').slideDown(function(){
                $('#channel-select-menu').html(renderedHTML);
                $('.reg-checkbox').change(onCheckboxChanged);
            });
        }
    );
}


/**
 * Render the controls for selecting a channel to watch.
 *
 * Render the controls that allow for the selection of a channel to display
 * and / or log. Creates appropriate event listeners for those controls.
 *
 * @param {Map} registersByTag Dictionary with information about available
 *      registers organized by tag. The key is the String tag and the value is
 *      an Array of Object with register information.
 * @return {Promise} A promise that resovles to undefined.
**/
function renderChannelSelectControls(registersByTag)
{
    return new Promise((resolve, reject) => {
        var devices = device_controller.getDeviceKeeper().getDevices();
        var categories = [];
        registersByTag.forEach(function (value, key) {
            categories.push(key);
        });

        var templateVals = {
            'devices': devices,
            'categories': categories
        };

        var location = fs_facade.getExternalURI(DEVICE_CATEG_SELECT_TEMPLATE_SRC);
        fs_facade.renderTemplate(
            location,
            templateVals,
            genericErrorHandler,
            function (renderedHTML) {
                $(CHANNEL_SELECTOR_HOLDER_SELECTOR).html(renderedHTML);
                $('#category-selector').hide();
                $('#register-selector').hide();

                $('#device-select-menu option').click(function (event) {
                    selectDevice(event, registersByTag)
                });

                $('#choose-different-device-link').click(chooseDifferentDevice);
                $('#choose-different-category-link').click(chooseDifferentCategory);

                resolve();
            }
        );
    });
}

/**
 * Event listener for when the user goes to select a different device.
 *
 * Event listener to show the device selection controls, UI allowing the user
 * to select a different device to filter available registers and tags by.
**/
function chooseDifferentDevice()
{
    $('#category-selector').slideUp();
    $('#selected-category-display-holder').hide();
    $('#register-selector').slideUp();
    $('#selected-device-display-holder').hide();
    $('#device-selector').slideDown();
}


/**
 * Event listener for when the user goes to select a different register tag.
 *
 * Event listener to show the category selection controls, UI allowing the user
 * to select a different tag to filter available registers by. The same device
 * selection will be used.
**/
function chooseDifferentCategory()
{
    $('#category-selector').slideDown();
    $('#selected-category-display-holder').hide();
    $('#register-selector').slideUp();
}


/**
 * Organize available registers by tag.
 *
 * Index the list of available registers by their tag, returning the result as
 * a dictionary with tags as keys and Arrays of Object with register information
 * as values.
 *
 * @param {Array} registers An Array of Object with reigster information.
 * @return {Promise} A promise that resolves to a dict indexed by tag.
**/
function getRegistersByTag(registers)
{
    return new Promise((resolve, reject) => {


        var retDict = new Map();
        async.each(
            registers,
            function (register, callback) {
                var tagsLen = register.tags.length;
                for (var i = 0; i < tagsLen; i++) {
                    var tag = register.tags[i]
                    if (tag.replace(' ', '') !== '') {
                        if (!retDict.has(tag))
                            retDict.set(tag, []);
                        retDict.get(tag).push(register);
                    }
                }

                callback();
            },
            function (err) {
                if (err !== null) {
                    genericErrorHandler(err);
                    return;
                }
                resolve(retDict);
            }
        );
    });
}

/**
 * Get information about the registers that can be logged / watched.
 *
 * Load register information for all devices, a complete record of registers
 * that can be logged or watched.
 *
 * @return {Promise} A promise that resolves to an Object with register
 *      information. See the registers section of the ljm_constants JSON file.
**/
function getRegisters()
{
    return new Promise((resolve) => {
        var registerInfoSrc = fs_facade.getExternalURI(REGISTERS_DATA_SRC);
        fs_facade.getJSON(registerInfoSrc, genericErrorHandler, function (info) {
            resolve(info['registers']);
        });
    });
}


/**
 * Interpret the name fields of entries as LJMMM fields.
 *
 * Interpret the name fields of entries as LJMMM fields, creating the
 * appropriate register information Objects during enumeration during that
 * LJMMM interpretation.
 *
 * @param {Array} entries An Array of Object with information about registers
 *      whose name field should be interpreted as LJMMM fields.
 * @return {Promise} A Q promise that resolves to an Array of Array
 *      of Objects with information about registers. Each sub-array is the
 *      result of interpreting a register entry's name field as LJMMM and
 *      enumerating as appropriate.
**/
function expandLJMMMEntries(entries)
{
    return new Promise((resolve, reject) => {
        async.map(
            entries,
            function (entry, callback) {
                ljmmm.expandLJMMMEntry(entry, function (newEntries) {
                    callback(null, newEntries);
                });
            },
            function (error, newEntries) {
                resolve(newEntries);
            }
        );
    });
}


/**
 * Convert a Array of Arrays with register information to a single Array.
 *
 * Convert an Array of Array of Object with register info to a single Array of
 * Array of Object with the same register info, effectively removing that
 * hierarchical information.
 *
 * @param {Array} registers Array of Array of Object to flatten.
 * @return {Promise} A promise that resolves to the flattened Array.
**/
function flattenRegisters(registers)
{
    return new Promise((resolve, reject) => {


        var retArray = [];
        async.each(
            registers,
            function (registerSet, callback) {
                var registerSetLen = registerSet.length;
                for (var i = 0; i < registerSetLen; i++) {
                    retArray.push(registerSet[i]);
                }

                callback();
            },
            function (err) {
                if (err !== null) {
                    genericErrorHandler(err);
                    return;
                }
                resolve(retArray);
            }
        );
    });
}


$('#dashboard-logger').ready(function(){
    $('#polling-rate-control').slider();

    getRegisters()
    .then(expandLJMMMEntries)
    .then(flattenRegisters)
    .then(getRegistersByTag)
    .then(renderChannelSelectControls)
    .done();
});