/**
 * Logic for the register matrix LabJack Switchboard module.
 *
 * Logic for a matrix with information about registers that also allows users
 * to read and write the current value of those registers via raw values.
 *
 * @author Chris Johnson  (labJack Corp, 2013)
 * @author A. Samuel Pottinger (LabJack Corp, 2013)
**/
AUTO_ENABLE_TAB_CLICK = false;
var curTemplateVals = null;
var curPaginationObj = null;
var latestKeypress = null;
function ACTIVE_KIPLING_MODULE() {

// Functions to analyze performance
function addZero(x,n) {
    if (x.toString().length < n) {
        x = "0" + x;
    }
    return x;
}
var PRINTED_TIME_POSITION = 40;
function reportTime(data) {
    var d = new Date();
    var h = addZero(d.getHours(), 2);
    var m = addZero(d.getMinutes(), 2);
    var s = addZero(d.getSeconds(), 2);
    var ms = addZero(d.getMilliseconds(), 3);
    
    var numTabs = PRINTED_TIME_POSITION-data.length;
    var tabStr = '';
    for (i = 0; i < numTabs; i++) {
        tabStr += ' ';
    }
    console.log(data, tabStr + h + ":" + m + ":" + s + ":" + ms);
}
reportTime('Initializing Module');

var simplesets = require('simplesets');

var ljmmm = require('./ljmmm');

var REGISTERS_DATA_SRC = 'register_matrix/ljm_constants.json';
var REGISTERS_TABLE_TEMPLATE_SRC = 'register_matrix/matrix.html';
var REGISTER_WATCH_LIST_TEMPLATE_SRC = 'register_matrix/watchlist.html';
var REGISTER_TABLE_LIST_TEMPLATE_SRC = 'register_matrix/table_list.html';

var REGISTER_MATRIX_SELECTOR = '#register-matrix';
var REGISTER_MATRIX_SELECTOR_OBJ = null;
var REGISTER_WATCHLIST_SELECTOR = '#register-watchlist';
var REGISTER_WATCHLIST_EMPTY_SELECTOR = '#register-matrix-empty-holder';

var DESCRIPTION_DISPLAY_TEMPLATE_SELECTOR_STR =
    '#{{address}}-description-display';
var ADD_TO_LIST_DESCRIPTOR_TEMPLATE_STR = '#{{address}}-add-to-list-button';
var WATCH_ROW_SELECTOR_TEMPLATE_STR = '#{{address}}-watch-row';
var WRITE_INPUT_SELECTOR_TEMPLATE_STR = '#write-reg-{{address}}-input';

var DESCRIPTION_DISPLAY_SELECTOR_TEMPLATE = handlebars.compile(
    DESCRIPTION_DISPLAY_TEMPLATE_SELECTOR_STR);
var ADD_TO_LIST_DESCRIPTOR_TEMPLATE = handlebars.compile(
    ADD_TO_LIST_DESCRIPTOR_TEMPLATE_STR);
var WATCH_ROW_SELECTOR_TEMPLATE = handlebars.compile(
    WATCH_ROW_SELECTOR_TEMPLATE_STR);
var WRITE_INPUT_SELECTOR_TEMPLATE = handlebars.compile(
    WRITE_INPUT_SELECTOR_TEMPLATE_STR);

var TYPEAHEAD_EMPTY_TEMPLATE = [
        '<div class="empty-message">',
        'Unable to find any registers that match the current query',
        '</div>'
    ].join('\n');
var TYPEAHEAD_CUSTOM_TEMPLATE = handlebars.compile(
        '<p>{{name}}<br><span class="typeaheadRegInfo">{{address}}: {{description}}</span></p>'
    );
var TYPEAHEAD_REGISTER_LIST_TT_ADAPTER;

var REFRESH_DELAY = 1000;

var selectedDevice;
var registerWatchList = [];
var curTabID = getActiveTabID();

var localRegistersList = [];
this.getLocalRegistersList = function() {
    return localRegistersList;
};

var registerNames = [];
this.getRegisterNames = function() {
    return registerNames;
};

/**
 * Force a redraw on the rendering engine.
**/
function runRedraw()
{
    document.body.style.display='none';
    var h = document.body.offsetHeight;
    document.body.style.display='block';
}
function qRunRedraw() {
    var innerDeferred = q.defer();
    runRedraw();
    innerDeferred.resolve();
    return innerDeferred.promise;
}

reportTime('After Initial Includes');
/**
 * Inform the user of an error via the GUI.
 *
 * @param {Object} err The error encountered. If err has a retError attribute,
 *      that error will be described by its retError attribute. Otherwise it
 *      will be described by its toString method.
**/
function showError(err) {
    var errMsg;

    if (err.retError === undefined) {
        errMsg = err.toString();
    } else {
        errMsg = err.retError.toString();
    }

    showAlert('Error while communicating with the device: ' + errMsg);
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
 * @return {q.deferred.promise} A Q promise that resolves to an Array of Array
 *      of Objects with information about registers. Each sub-array is the
 *      result of interpreting a register entry's name field as LJMMM and
 *      enumerating as appropriate.
**/
function expandLJMMMEntries(entries)
{
    reportTime('expandingLJMMMEntries');
    var deferred = q.defer();
    async.map(
        entries,
        function(entry, callback){
            ljmmm.expandLJMMMEntry(entry, function(newEntries){
                newEntries.forEach(function(entry){
                    registerNames.push(entry.name);
                    localRegistersList.push(entry);
                });
                callback(null, newEntries);
            });
        },
        function(error, newEntries){
            if (error) {
                deferred.reject(error);
            } else {
                deferred.resolve(newEntries);
            }
        }
    );

    return deferred.promise;
}


/**
 * Load information about registers for all devices.
 *
 * @return {q.defer.promise} A Q promise that will resolve to an Array of Object
 *      where each object contains information about a register or set of
 *      registers. The later will have a name field that can be interpreted as
 *      LJMMM.
**/
function getRegisterInfo()
{
    var deferred = q.defer();

    deferred.resolve(device_controller.fullRegisterList);

    return deferred.promise;
}


/**
 * Filter out register entries that are not available on the given device type.
 *
 * @param {Array} registers An Array of Object with information about a
 *      register or a set of registers. Each Object must have a device field
 *      with the type of Array of Object, each element having a name field.
 * @param {String} deviceName The device type to look for. All register entries
 *      that do not have this device type will be filtered out.
 * @return {q.defer.promise} A Q promise that will resolve to an Array of Object
 *      where each Object contains information about an register or class of
 *      registers. This Array will contain all of the registers originally
 *      passed in that have the given device type listed in their devices
 *      field. All others will be excluded.
**/
function filterDeviceRegisters(registers, deviceName)
{
    var deferred = q.defer();

    async.filter(
        registers,
        function(register, callback){
            var devices = register.devices;

            if (typeof(devices) === 'string') {
                callback(devices === deviceName);
            } else if (devices instanceof String) {
                callback(devices === deviceName);
            } else {
                var names = devices.map(function(e){
                    if(e.device === undefined)
                        return e;
                    else
                        return e.device;
                });
                callback(names.indexOf(deviceName) != -1);
            }
        },
        function(registers){
            deferred.resolve(registers);
        }
    );

    return deferred.promise;
}


/**
 * Create a function as a closure over a device type for filterDeviceRegisters.
 *
 * Create a closure around device that calls filterDeviceRegisters with the
 * provided device type.
 *
 * @param {String} device The device type that is being filtered for.
 * @return {function} Closure with device type info. See filterDeviceRegisters.
**/
function createDeviceFilter(device)
{
    return function(registers){
        reportTime('creatingDeviceFilter');
        return filterDeviceRegisters(registers, device);
    };
}


/**
 * Add a new field to the given register information objects with firmware info.
 *
 * Add a new field to the given register information objects with the minimum
 * firmware at which the cooresponding register became available for the given
 * device type.
 *
 * @param {Array} registers An Array of Object with information about registers
 *      to decorate.
 * @param {String} device The name of the device type to find the minimum
 *      firmware version for.
 * @return {q.defer.promise} A Q promise that resovles to an Array of Object
 *      with information about a register or class of registers. These modified
 *      Objects will have an added relevantFwmin field.
**/
function fwminSelector(registers, device)
{
    var deferred = q.defer();

    async.map(
        registers,
        function(register, callback){
            var newRegister = $.extend({}, register);
            var device = register.devices[device];
            var relevantFwmin;
            if(device === undefined || device.fwmin === undefined)
                relevantFwmin = 0;
            else
                relevantFwmin = device.fwmin;
            newRegister.relevantFwmin = relevantFwmin;
            callback(null, newRegister);
        },
        function(error, registers){
            if (error) {
                deferred.reject(error);
            } else {
                deferred.resolve(registers);
            }
        }
    );

    return deferred.promise;
}


/**
 * Create a closure around device type information for fwminSelector.
 *
 * Create a closure around device type information to call fwminSelector for
 * that device type.
 *
 * @param {String} device The device type to create the closure with.
 * @return {function} Closure around fwminSelector for the given device type.
 *      See fwminSelector.
**/
function createFwminSelector(device)
{
    return function(registers){
        reportTime('creatingFwminSelector');
        return fwminSelector(registers, device);
    };
}


/**
 * jQuery event listener to show / hide documentation for a register entry.
 *
 * @param {Event} event Standard jQuery event information.
**/
function toggleRegisterInfo(event)
{
    var toggleButtonID = event.target.id;
    var jqueryToggleButtonID = '#' + toggleButtonID;
    var address = toggleButtonID.replace('-toggle-button', '');
    var expand = event.target.className.indexOf('expand') != -1;

    var descriptionSelector = DESCRIPTION_DISPLAY_SELECTOR_TEMPLATE(
        {address: address});

    if(expand)
    {
        $(descriptionSelector).fadeIn();
        $(jqueryToggleButtonID).addClass('collapse').removeClass('expand');
        $(jqueryToggleButtonID).addClass('icon-minus').removeClass(
            'icon-plus');
    }
    else
    {
        $(descriptionSelector).fadeOut();
        $(jqueryToggleButtonID).addClass('expand').removeClass('collapse');
        $(jqueryToggleButtonID).addClass('icon-plus').removeClass(
            'icon-minus');
    }
}


/**
 * Convert an Array of two Arrays to an Object.
 *
 * Convert an Array of Arrays with two elements to a dict such that each
 * Array's first element acts as a key to the second.
 *
 * @param {Array} data An Array of two Arrays to zip together into a dict.
 * @return {Object} Object created by combining the two arrays.
 * @throws Error thrown if one of data's Arrays does not contain exactly two
 *      elements.
**/
function zip(data)
{

    var retVal = {};

    var dataLen = data.length;
    for(var i=0; i<dataLen; i++)
    {
        if(data[i].length != 2)
        {
            throw new Error(
                'The collection to be zipped must have two elements.'
            );
        }
        retVal[data[i][0]] = data[i][1];
    }

    return retVal;
}


/**
 * Index a collection of registers by their addresses.
 *
 * Create an Object with address numbers for attributes and Objects describing
 * the corresponding register as values.
 *
 * @param {Array} registers An Array of Object with register information.
 * @return {Object} An Object acting as an index or mapping between address and
 *      register info Object.
**/
function organizeRegistersByAddress(registers)
{
    var pairs = registers.map(function(e){
        return [e.address, e];
    });

    return zip(pairs);
}


/**
 * Get a list of unique tags represented across all of the provided registers.
 *
 * @param {Array} entries Array of Object with register information.
 * @return {Array} An Array of String, each element a unique tag found in the
 *      provided corpus of registers. This represents the set of all unique tags
 *      across all of the provided entries.
**/
function getTagSet(entries)
{
    var tagsHierarchical = entries.map(function(e) {return e.tags;});
    var tags = [];

    var tagsHierarchicalLen = tagsHierarchical.length;
    for(var i=0; i<tagsHierarchicalLen; i++)
    {
        tags.push.apply(tags, tagsHierarchical[i]);
    }

    var tagSet = new simplesets.Set(tags);
    var tagArray = tagSet.array();
    // Re-Arrange indicies so that 'ALL' is first
    var index = tagArray.indexOf('all');
    var tempTag = tagArray[0];
    tagArray[0] = 'all';
    tagArray[index] = tempTag;
    return tagArray;
}

/**
 * Configure typeahead data upon startup
 * @return {[type]} [description]
**/
function configureTypeaheadData(data) {
    reportTime('configureTypeaheadData');
    var deferred = q.defer();
    // constructs the suggestion engine
    var TYPEAHEAD_REGISTER_LIST = new Bloodhound({
        limit: 10,
        datumTokenizer: Bloodhound.tokenizers.obj.whitespace('name'),
        queryTokenizer: Bloodhound.tokenizers.whitespace,
        local: $.map(localRegistersList, function(localRegister) {
            return {
                name: localRegister.name,
                address: localRegister.address,
                description: localRegister.description
            };
        })
    });
    // kicks off the loading/processing of `local` and `prefetch`
    TYPEAHEAD_REGISTER_LIST.initialize();
    TYPEAHEAD_REGISTER_LIST_TT_ADAPTER = TYPEAHEAD_REGISTER_LIST.ttAdapter();

    deferred.resolve(data);
    return deferred.promise;
}
function initializeTypeahead() {
    $('#ljm-register-search-box .typeahead').typeahead({
            hint: true,
            highlight: true,
            minLength: 1
        },
        {
            name: 'registerNames',
            displayKey: 'name',
            valueKey: 'name',
            // `ttAdapter` wraps the suggestion engine in an adapter that
            // is compatible with the typeahead jQuery plugin
            source: TYPEAHEAD_REGISTER_LIST_TT_ADAPTER,
            templates: {
                empty: TYPEAHEAD_EMPTY_TEMPLATE,
                suggestion: TYPEAHEAD_CUSTOM_TEMPLATE
            }
    });
}
// TODO: LJMMM allows for 'all' to be a valid register name.
/**
 * Render a table with information about registers.
 *
 * Render the UI widgets to view / manipulate information about device
 * registers.
 *
 * @param {Array} entries An Array of Object with information about registers.
 * @param {Array} tags An Array of String, each String being unique in the Array
 *      and the name of a tag in the corpus of provided registers. All tags
 *      across all of the registers available in the selected device should be
 *      included.
 * @param {String} currentTag The tag that the user is currently filtereing
 *      on. Can be 'all' if no registers should be filtered out by tags.
 * @param {String} currentSearchTerm The term the user is searching for.
 * @return {q.defer.promise} A Q promise that resolves to null.
**/
function renderRegistersTable(entries, tags, filteredEntries, filteredTags,
    currentTag, currentSearchTerm)
{
    reportTime('renderRegistersTable');
    var deferred = q.defer();

    var location = fs_facade.getExternalURI(REGISTERS_TABLE_TEMPLATE_SRC);
    var entriesByAddress = organizeRegistersByAddress(entries);
    
    if(tags === undefined)
        tags = getTagSet(entries);
    if(currentTag === undefined)
        currentTag = 'all';
    if(currentSearchTerm === undefined)
        currentSearchTerm = '';
    if(filteredEntries === undefined)
        filteredEntries = entries;
    if(filteredTags === undefined)
        filteredTags = getTagSet(entries);

    var templateVals = {
        'registers': filteredEntries,
        'hasRegisters': filteredEntries.length > 0,
        'tags': filteredTags,
        'currentTag': currentTag,
        'currentSearchTerm': currentSearchTerm,
        'currentRegisters': null
    };

    var renderModule = function(renderedHTML) {
        reportTime('renderRegisters-templateRendered');
        if(REGISTER_MATRIX_SELECTOR_OBJ) {
            REGISTER_MATRIX_SELECTOR_OBJ.html(renderedHTML);
        } else {
            REGISTER_MATRIX_SELECTOR_OBJ = $(REGISTER_MATRIX_SELECTOR);
            REGISTER_MATRIX_SELECTOR_OBJ.html(renderedHTML);
        }

        var bindToTableListElements = function() {
            reportTime('renderRegisters-bindToToggles');
            $('.toggle-info-button').unbind();
            $('.toggle-info-button').bind('click',toggleRegisterInfo);

            reportTime('renderRegisters-bindToLists');
            $('.add-to-list-button').unbind();
            $('.add-to-list-button').bind('click',function(event){
                addToWatchList(event, entriesByAddress);
            });
        };

        var getAppendTableText = function(curPage, numPerPage) {
            var appendTableText = function(info) {
                $('#page-content').html(info);
                bindToTableListElements();
            };
            return appendTableText;
        };

        // Initialize pagination table
        var NUM_ITEMS_PER_PAGE = 10;
        var numPartialPages = templateVals.registers.length/NUM_ITEMS_PER_PAGE;
        var numPages = Math.ceil(numPartialPages);
        var getPageClickFunc = function(templateVals) {
            var pageClickFunc = function(event, page) {
                var curIndex = page - 1;
                var startIndex = curIndex * NUM_ITEMS_PER_PAGE;
                var endIndex = startIndex + NUM_ITEMS_PER_PAGE;
                var curPageInfo = templateVals.registers.slice(startIndex,endIndex);
                console.log('Cur Page Info',curPageInfo);

                templateVals.currentRegisters = curPageInfo;
                curTemplateVals = curPageInfo;

                var tableListLocation = fs_facade.getExternalURI(REGISTER_TABLE_LIST_TEMPLATE_SRC);
                fs_facade.renderTemplate(
                    tableListLocation,
                    templateVals,
                    showError,
                    getAppendTableText(curIndex,NUM_ITEMS_PER_PAGE)
                );
            };
            return pageClickFunc;
        };

        // Create Footer Element
        var footerElement = $('#module-chrome-contents-footer');
        var footerText = '';
        footerText += '<div class="text-center">';
        footerText += '<ul id="pagination-demo" class="pagination-sm"></ul>';
        footerText += '</div>';
        footerElement.empty();
        footerElement.html(footerText);
        footerElement.show();

        /**
         * Using the twbsPagination library:
         * url: http://esimakin.github.io/twbs-pagination/
         * another potential library:
         * url: http://flaviusmatis.github.io/simplePagination.js/#page-11
        **/
        if(numPages > 0) {
            curPaginationObj = $('#pagination-demo').twbsPagination({
                totalPages: numPages,
                visiblePages: 7,
                onPageClick: getPageClickFunc(templateVals)
            });
        }

        reportTime('renderRegisters-bindToTags');
        $('.tag-selection-link').unbind();
        $('.tag-selection-link').bind('click',function(event){
            var tag = event.target.id.replace('-tag-selector', '');
            searchRegisters(entries, tags, tag, currentSearchTerm);
        });

        reportTime('renderRegisters-bindToSearchButton');
        $('#search-button').unbind();
        $('#search-button').bind('click',function(event){
            $('.typeahead').blur();
            var term = $('#search-box').val();
            searchRegisters(entries, tags, currentTag, term);
        });

        reportTime('renderRegisters-bindToSearchBox');
        $('#search-box').keypress(function (e) {
            if (e.which != 13)
                return;
            $('.typeahead').blur();
            var term = $('#search-box').val();
            searchRegisters(entries, tags, currentTag, term);
        });
        reportTime('renderRegisters-templateConnected');

        // Redraw bug
        runRedraw();

        // Initialize Typeahead
        initializeTypeahead();

        deferred.resolve();
    };

    reportTime('renderRegisters-renderTemplate');
    fs_facade.renderTemplate(
        location,
        templateVals,
        showError,
        renderModule
    );
    

    return deferred.promise;
}


// TODO: By LJMMM, 'all' is a valid tag.
/**
 * Filter / search registers by tag and search term.
 *
 * Filter / search registers by tag and search term, rendering a registers table
 * with the listing after filtering.
 *
 * @param {Array} entires An Array of Object with information about the corpus
 *      of registers to search through.
 * @param {Array} allTags An Array of String with the names of all tags in the
 *      provided corpus of registers.
 * @param {String} tag The tag to filter by. Can be 'all' to avoid filtering.
 * @param {String} searchTerm The term to search the description, name, and
 *      tags for. If the term cannot be found, the register will be filered out.
**/
function searchRegisters(entries, allTags, tag, searchTerm)
{
    var filteredEntries = entries;
    var filteredTags = [];
    $('#searching-status').show();
    console.log('HERE 0');

    var appendTag = function(tagName) {
        if (filteredTags.indexOf(tagName) === -1) {
            filteredTags.push(tagName);
        }
    };

    if (tag !== 'all')
    {
        filteredEntries = filteredEntries.filter(function(e){
            if (typeof(e.tags) === 'undefined') {
                return false;
            } else {
                if (e.tags.indexOf(tag) != -1) {
                    return true;
                } else {
                    return false;
                }
            }
        });
    }

    var termLow = searchTerm.toLowerCase();

    var matchesTerm = function (testTerm) {
        var matches = testTerm !== undefined;
        matches = matches && testTerm.toLowerCase().indexOf(termLow) != -1;
        return matches;
    };

    if(termLow !== '')
    {
        filteredEntries = filteredEntries.filter(function(e){
            var matchesName = matchesTerm(e.name);
            var matchesTag = matchesTerm(e.flatTagStr);
            var matchesDesc = matchesTerm(e.description);
            var isMatch = matchesName || matchesTag || matchesDesc;
            return isMatch;
        });
    }

    if(tag === 'all') {
        filteredTags = allTags;
    }
    if (searchTerm === '') {
        filteredTags = allTags;
    } else {
        filteredTags = allTags;
    }
    // Naaw..... I'll leave this here for future chris to think about adding agian...
    // Code to try and filter the tags a little to only show relevant tags
    // filteredEntries.forEach(function(e) {
    //     if(typeof(e.tags) !== 'undefined') {
    //         e.tags.forEach(function(matchTag) {
    //             appendTag(matchTag);
    //         });
    //     }
    // });
    renderRegistersTable(entries, allTags, filteredEntries, filteredTags, tag, searchTerm)
    .then(function() {
        $('#searching-status').hide();
    },function() {
        $('#searching-status').hide();
    });
}


/**
 * Turn a hierarchical Array of register information into a linear one.
 *
 * Convert an Array with Array elements containing Objects with register
 * information to an Array of the same Objects.
 *
 * @param {Array} entries The Array of Arrays to convert.
 * @return {q.defer.promise} A Q promise that resolves to the "flattened" or
 *      converted Array of Object.
**/
function flattenEntries(entries)
{
    reportTime('flatteningEntries');
    var deferred = q.defer();
    var retList = [];

    async.each(
        entries,
        function(itemSet, callback){
            var itemSetLen = itemSet.length;
            for(var i=0; i<itemSetLen; i++)
                retList.push(itemSet[i]);
            callback();
        },
        function(error){
            if (error) {
                deferred.reject(error);
            } else {
                deferred.resolve(retList);
            }
        }
    );

    return deferred.promise;
}

/**
 * Convert the tags attribute of Objects with register info to a String.
 *
 * Convert the tags attribute of Objects with register info from an Array of
 * String tags to a String containing the same list of tags joined by a comma.
 * The list will be saved as a new attribute called flatTagStr on the same
 * objects.
 *
 * @param {Array} registers An Array of Objects with register information to
 *      create flattened tag strings for.
 * @return {q.defer.promise} A Q promise that resolves to the new Array of
 *      Object with flattened tag strings.
**/
function flattenTags(registers)
{
    reportTime('flattening Tags');
    var deferred = q.defer();

    async.map(
        registers,
        function(register, callback){
            var newRegister = $.extend({}, register);
            if(typeof(register.tags) !== 'undefined') {
                newRegister.flatTagStr = register.tags.join(',');
            } else {
                newRegister.flatTagStr = '';
            }
            callback(null, newRegister);
        },
        function(error, registers){
            if (error) {
                deferred.reject(error);
            } else {
                deferred.resolve(registers);
            }
        }
    );

    return deferred.promise;
}


/**
 * Add information to register info Objects about register access restrictions.
 *
 * Parse the readwrite field of register information Objects, adding the Boolean
 * fields of readAccess and writeAccess indicating if the register can be read
 * and written to respectively.
 *
 * @param {Array} registers An Array of Object with register inforamtion to
 *      decorate.
 * @return {q.promise} A promise that resovles to the decorated / updated
 *      register information objects.
**/
function addRWInfo(registers)
{
    var deferred = q.defer();
    reportTime('addRWInfo');
    async.map(
        registers,
        function(register, callback){
            var newRegister = $.extend({}, register);
            newRegister.readAccess = newRegister.readwrite.indexOf('R') != -1;
            newRegister.writeAccess = newRegister.readwrite.indexOf('W') != -1;
            var writeOnly = newRegister.writeAccess && !newRegister.readAccess;
            newRegister.writeOnly = writeOnly;
            newRegister.useAsWrite = writeOnly;
            newRegister.type = newRegister.type;
            callback(null, newRegister);
        },
        function(error, registers){
            if (error) {
                deferred.reject(error);
            } else {
                deferred.resolve(registers);
            }
        }
    );

    return deferred.promise;
}


/**
 * Refresh / re-render the list of registers being watchted by this module.
**/
function refreshWatchList()
{
    var location = fs_facade.getExternalURI(REGISTER_WATCH_LIST_TEMPLATE_SRC);
    registerWatchList.sort(function(a, b){
        return a.address - b.address;
    });

    if(registerWatchList.length > 0)
    {
        $('#watch-config-tooltip').hide();
        fs_facade.renderTemplate(
            location,
            {'registers': registerWatchList},
            genericErrorHandler,
            function(renderedHTML)
            {
                $(REGISTER_WATCHLIST_SELECTOR).html(renderedHTML);
                $(REGISTER_WATCHLIST_EMPTY_SELECTOR).hide();
                $(REGISTER_WATCHLIST_SELECTOR).show(runRedraw);

                var showRegiserEditControls = function(event) {
                    var address = event.target.id.replace('edit-reg-', '');
                    var rowSelector = WATCH_ROW_SELECTOR_TEMPLATE({
                        'address': address
                    });

                    var numAddress = Number(address);
                    var targetRegister = registerWatchList.filter(function (e) {
                        return e.address == numAddress;
                    })[0];
                    targetRegister.useAsWrite = true;

                    $(rowSelector).find('.value-display').fadeOut('fast',
                        function () {
                            runRedraw();
                            $(rowSelector).find('.value-edit-controls').fadeIn(
                                'fast',
                                runRedraw
                            );
                        }
                    );
                };

                var hideRegisterEditControls = function(event) {
                    var address = event.target.id;
                    address = address.replace('close-edit-reg-', '');
                    address = address.replace('icon-', '');
                    var rowSelector = WATCH_ROW_SELECTOR_TEMPLATE({
                        'address': address
                    });

                    var numAddress = Number(address);
                    var targetRegister = registerWatchList.filter(function (e) {
                        return e.address == numAddress;
                    })[0];
                    targetRegister.useAsWrite = false;

                    $(rowSelector).find('.value-edit-controls').fadeOut('fast',
                        function () {
                            runRedraw();
                            $(rowSelector).find('.value-display').fadeIn('fast',
                                runRedraw
                            );
                        }
                    );
                };

                var writeRegister = function(event) {
                    var address = event.target.id;
                    address = address.replace('write-reg-', '');
                    address = address.replace('icon-', '');
                    address = address.replace('-input','');
                    var isString = $('#' + address.toString() + '-type-display').html() === 'STRING';
                    var rowSelector = WATCH_ROW_SELECTOR_TEMPLATE({
                        'address': address
                    });

                    var inputSelector = WRITE_INPUT_SELECTOR_TEMPLATE({
                        'address': address
                    });
                    var value = $(inputSelector).val();

                    var addressNum = Number(address);
                    var convValue;
                    if (isString) {
                        convValue = value;
                    } else {
                        convValue = Number(value);
                    }
                    console.log('hERE',rowSelector,address,value,addressNum,convValue);

                    $(rowSelector).find('.write-confirm-msg').fadeIn(
                        function () {
                            selectedDevice.writeAsync(addressNum, convValue)
                            .then(
                                function () {
                                    $(rowSelector).find(
                                        '.write-confirm-msg'
                                    ).fadeOut();
                                },
                                function (err) {
                                    if(!isNaN(err)) {
                                        showError('LJM Error ' + device_controller.ljm_driver.errToStrSync(err));
                                    } else {
                                        showError(err);
                                    }
                                    $(rowSelector).find(
                                        '.write-confirm-msg'
                                    ).fadeOut();
                                }
                            );
                        }
                    );
                };

                $('.remove-from-list-button').click(removeFromWatchList);

                $('.edit-register-button').click(showRegiserEditControls);

                $('.close-value-editor-button').click(hideRegisterEditControls);

                $('.write-value-editor-button').click(writeRegister);

                $('.write-reg-value-input').keypress(function (e) {
                    if (e.which != 13) {
                        return;
                    } else {
                        latestKeypress = e;
                        var curID = e.target.id;
                        var curEl = $('#'+e.target.id);
                        // var curAddress = curID.split('-')[2];
                        // var newVal = curEl.val();
                        curEl.blur();
                        writeRegister(e);
                    }
                });
                KEYBOARD_EVENT_HANDLER.initInputListeners();
            }
        );
    }
    else
    {
        $(REGISTER_WATCHLIST_SELECTOR).hide();
        $(REGISTER_WATCHLIST_EMPTY_SELECTOR).show();
        // $('#watch-config-tooltip').fadeIn();
        $('#watch-config-tooltip').hide();
    }
}


/**
 * Event listener to add a new register to the watch list for this module.
 *
 * Event listener that will add a new register entry to the watch list for this
 * module, refresing the watch list in the process.
 *
 * @param {Event} event jQuery event information.
 * @param {Object} registerInfoByAddress Object acting as an address indexed
 *      access layer for register information. Attributes should be addresses
 *      of registers and values should be Objects with information about the
 *      corresponding register.
**/
function addToWatchList(event, registerInfoByAddress)
{
    var buttonID = event.target.id;
    var address = Number(buttonID.replace('-add-to-list-button', ''));
    var descriptor = ADD_TO_LIST_DESCRIPTOR_TEMPLATE({address: address});
    $(descriptor).hide();

    var targetRegister = registerInfoByAddress[address];
    registerWatchList.push(targetRegister);
    console.log('Adding targetRegister to registerWatchList',targetRegister);
    refreshWatchList();
    runRedraw();
}


/**
 * Event listener to remove a register from the watch list for this module.
 *
 * @param {Event} event jQuery event information.
**/
function removeFromWatchList(event)
{
    var buttonID = event.target.id;
    var address = buttonID.replace('-remove-from-list-button', '');

    var registersToRemove = registerWatchList.filter(
        function(e){ return e.address == address; }
    );
    registerWatchList = registerWatchList.filter(
        function(e){ return e.address != address; }
    );
    refreshWatchList();

    var registersToRemoveLen = registersToRemove.length;
    for(var i=0; i<registersToRemoveLen; i++)
    {
        var registerToRemove = registersToRemove[i];
        var descriptor = ADD_TO_LIST_DESCRIPTOR_TEMPLATE(
            {address: registerToRemove.address}
        );
        $(descriptor).show();
    }

    runRedraw();
}


function createUpdateReadNumberRegistersCallback (readAddresses)
{
    return function (results) {
        var deferred = q.defer();
        var numResults = results.length;
        for (var i=0; i<numResults; i++) {
            var register = readAddresses[i];
            var value = results[i];
            var displaySelector = '#' + String(register) + '-cur-val-display';
            $(displaySelector).html(value.toFixed(6));
        }
        deferred.resolve();
        return deferred.promise;
    };
}


function updateStringRegisterCallback (register, value)
{
    var displaySelector = '#' + String(register) + '-cur-val-display';
    $(displaySelector).html(value);
}


function splitByRetType (registers)
{
    var numberRegisters = [];
    var stringRegisters = [];

    registers.forEach(function (register) {
        if (register.type === 'STRING') {
            stringRegisters.push(register);
        } else {
            numberRegisters.push(register);
        }
    });

    return {numRegs: numberRegisters, strRegs: stringRegisters};
}


function updateReadRegisters ()
{
    if(LOADED_MODULE_INFO_OBJECT.name !== 'register_matrix') {
        runRedraw();
        return;
    }
    var onError = function (err) {
        if (err) {
            showError(err);
        }
        setTimeout(updateReadRegisters, REFRESH_DELAY);
    };

    if (curTabID !== getActiveTabID()) {
        return;
    }

    var readRegisters = registerWatchList.filter(function (e) {
        return !e.useAsWrite;
    });

    var splitResult = splitByRetType(readRegisters);
    var numberReadRegisters = splitResult.numRegs;
    var stringReadRegisters = splitResult.strRegs;

    var numberReadAddresses = numberReadRegisters.map(function (e) {
        return e.address;
    });
    var stringReadAddresses = stringReadRegisters.map(function (e) {
        return e.address;
    });

    var promise;
    if (numberReadAddresses.length > 0) {
        promise = selectedDevice.readMany(numberReadAddresses);
        promise.then(
            createUpdateReadNumberRegistersCallback(numberReadAddresses),
            onError
        );
    } else {
        var immediateDeferred = q.defer();
        promise = immediateDeferred.promise;
        immediateDeferred.resolve();
    }

    stringReadAddresses.forEach(function (address) {
        promise.then(function () {
            var innerDeferred = q.defer();
            selectedDevice.readAsync(
                address,
                onError,
                function (val) {
                    updateStringRegisterCallback(address, val);
                    innerDeferred.resolve();
                }
            );
            return innerDeferred.promise;
        }, onError);
    });

    promise.then(
        function () {
            if(LOADED_MODULE_INFO_OBJECT.name !== 'register_matrix') {
                runRedraw();
                return;
            }
            setTimeout(updateReadRegisters, REFRESH_DELAY);
        },
        onError
    );
}


function setSelectedDevice (serial)
{
    var keeper = device_controller.getDeviceKeeper();
    var devices = keeper.getDevices();
    var numDevices = devices.length;

    for (var i=0; i<numDevices; i++) {
        if (devices[i].getSerial() === serial)
            selectedDevice = devices[i];
    }
}


// TODO: Need to select device filter based on selected device
$('#register-matrix-holder').ready(function(){
    reportTime('onReady');
    var filterByDevice = createDeviceFilter('T7');
    var selectFwmin = createFwminSelector('T7');

    $('.device-selection-radio').first().prop('checked', true);
    $('.device-selection-radio').change(function(){
        // $('#device-selector').hide();
        // $('#device-selector').fadeIn();
        var serialNum = $('input[name=deviceSelectionRadios]:checked').val();
        setSelectedDevice(serialNum);
    });

    getRegisterInfo()
    .then(filterByDevice)
    .then(selectFwmin)
    .then(flattenTags)
    .then(addRWInfo)
    .then(expandLJMMMEntries)
    .then(configureTypeaheadData)
    .then(flattenEntries)
    .then(renderRegistersTable)
    .then(qRunRedraw)
    .done(function () {
        unlockModuleLoader();
        KEYBOARD_EVENT_HANDLER.initInputListeners();
        reportTime('Finished!');
        var keeper = device_controller.getDeviceKeeper();
        selectedDevice = keeper.getDevices()[0];
        setTimeout(updateReadRegisters, REFRESH_DELAY);
    });
});
reportTime('After Initial Includes');
}
var ACTIVE_KIPLING_MODULE = new ACTIVE_KIPLING_MODULE();
