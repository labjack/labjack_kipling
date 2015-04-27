/**
 * Micro-library to read LabJack MODBUS Map Markup language documents.
 *
 * Micro-library that supports the reading of documents or fields within larger
 * documents that contain LJMMM strings. These strings likely define a series
 * of MODBUS map registers (http://www.modbus.org/). See
 * https://bitbucket.org/labjack/ljm_constants for the LJMMM specification.
 *
 * @author Sam Pottinger (samnsparky, http://gleap.org)
 * @maintainer Chris Johnson (chrisjohn404, https://github.com/chrisJohn404)
 * @license MIT
**/

var async = require('async');
var extend = require('node.extend');
var sprintf = require('sprintf-js');

// Sizes in number of MODBUS registers (2 bytes each).
var DATA_TYPE_SIZES = {
    UINT64: 4,
    INT32: 2,
    STRING: 2,
    UINT16: 1,
    UINT32: 2,
    FLOAT32: 2
};


// TODO: This is slow and lazy would have been preferred. However, need an
//       alternative for those pesky synchronous options.
/**
 * Make a numerical range synchronously and return as an array.
 *
 * @param {number} startNum The first number in the range.
 * @param {number} endNum The last number to include in the range non-inclusive.
 *      In other words, the last number to include in the range + 1.
 * @param {number} increment The number value to increase by in each step or,
 *      in other words, the numerical difference between subsequent elements in
 *      the range.
 * @return {array} Resulting range as an array of number.
**/
function makeRange (startNum, endNum, increment) {
    var retVal = [];
    for (var i=startNum; i<endNum; i+=increment) {
        retVal.push(i);
    }
    return retVal;
}


/**
 * Get the size of the data of a given type in registers.
 *
 * Determine the size of the data of a given data type as indicated by a type
 * name. The size will be reported in MODBUS registers, each of which is two
 * bytes. Unknown data types are returned as -1 registers.
 *
 * @param {String} typeName The name of the type to get the data type size for.
 * @return {Number} The number of registers that values of the given data type 
 *      take up. -1 is returned if the type could not be found.
**/
function getTypeRegSize(typeName)
{
    if(DATA_TYPE_SIZES[typeName] === undefined)
        return -1;
    return DATA_TYPE_SIZES[typeName];
}


/**
 * Enumerates / interprets an LJMMM field.
 *
 * @param {String} name The field to interpret as an LJMMM string.
 * @param {function} onError The function to call if an error is encountered
 *      during expansion. Should take string argument describing the error. If
 *      not provided, the corresponding error will be thrown.
 * @param {function} onSuccess The function to call after the LJMMM field has
 *      been interpreted. The callback should take a single argument which
 *      will be an Array of String or, in other words, the expansion / result of
 *      the interpretation of the LJMMM field. If not provided, that argument
 *      will be returned from this function and this acts synchronously.
**/
exports.expandLJMMMName = function(name, onError, onSuccess)
{
    var ljmmmRegex = /^(.*)\#\((\d+)\:(\d+)\:?(\d+)?\)(.*)$/;
    var values = name.match(ljmmmRegex);

    if(values === null) {
        if (onSuccess === undefined) {
            return [name];
        } else {
            onSuccess([name]);
        }
    }

    var before = values[1];
    var startNum = Number(values[2]);
    var endNum = Number(values[3]);
    var increment = values[4];
    var after = values[5];

    var regNums;

    if (increment === undefined) {
        regNums = makeRange(startNum, endNum+1, 1);
    } else {
        increment = Number(increment);
        regNums = makeRange(startNum, endNum+1, increment);
    }

    var fullyQualifiedNames;

    fullyQualifiedNames = regNums.map(function(regNum){
        return sprintf.sprintf('%s%d%s', before, regNum, after);
    });

    if (onSuccess !== undefined)
        onSuccess(fullyQualifiedNames);

    return fullyQualifiedNames;
};


/**
 * Expand an entry's name and alname fields as LJMMM, enumerating appropriately.
 *
 * @param {Object} entry An Object containing information about a register or
 *      set of registers.
 * @param {function} onError The function to call if an error is encountered
 *      during expansion. Should take a string argument describing the error.
 * @param {function} onSuccess The function to call after enumerating. Will be
 *      given an Array of Array of String that results from interpreting the
 *      name of the provided entry as an LJMMM field, enumerating and creating
 *      the appropriate entries when interpreting that field. Each sub-Array is
 *      the result of expanding an original name.
**/
exports.expandLJMMMNameAndAltName = function (entry, onError, onSuccess)
{
    var originalNames = entry.altnames;
    if (originalNames === undefined)
        originalNames = [];
    
    originalNames.push(entry.name);

    async.map(
        originalNames,
        function (name, callback) {
            exports.expandLJMMMName(
                name,
                function (err) { callback(err, null); },
                function (names) { callback(null, names); }
            );
        },
        function (err, results) {
            if (err) {
                onError(err);
                return;
            }

            onSuccess(results);
        }
    );
}


/**
 * Interpret an entry's name field as LJMMM, enumerating as appropriate.
 *
 * @param {Object} entry An Object containing information about a register or
 *      set of registers.
 * @param {function} onError The function to call if an error is encountered
 *      during expansion. Should take a string argument describing the error.
 * @param {function} onSuccess The function to call after enumerating. Will be
 *      given an Array of Object that results from interpreting the name
 *      of the provided entry as an LJMMM field, enumerating and creating the
 *      appropriate entries when interpreting that field.
**/
exports.expandLJMMMEntry = function(entry, onError, onSuccess)
{
    exports.expandLJMMMNameAndAltName(
        entry,
        onError,
        function (nameSets) {
            var address;
            var numNames;
            var names;
            var expandedEntries = [];

            var regTypeSize = getTypeRegSize(entry.type);
            var numNameSets = nameSets.length;

            for (var i=0; i<numNameSets; i++) {
                names = nameSets[i];
                numNames = names.length;
                address = entry.address;

                for (var j=0; j<numNames; j++) {
                    var name = names[j];
                    var newEntry = extend({}, entry);
                    newEntry.name = name;
                    newEntry.address = address;
                    newEntry.group = entry.name;
                    address += regTypeSize;
                    delete newEntry.altnames;
                    expandedEntries.push(newEntry);
                }
            }

            onSuccess(expandedEntries);
        }
    );
};


/**
 * Interpret an entry's name field as LJMMM synchronously.
 *
 * @param {Object} entry An Object containing information about a register or
 *      set of registers.
 * @return {Array} An Array of Object that results from interpreting the name
 *      of the provided entry as an LJMMM field, enumerating and creating the
 *      appropriate entries when interpreting that field.
**/
exports.expandLJMMMEntrySync = function(entry)
{
    var names;
    var numNameSets;
    var numAltNames;
    var nameSets = [];
    var expandedEntries = [];

    var address = entry.address;
    var regTypeSize = getTypeRegSize(entry.type);

    if (entry.altnames !== undefined)
        numAltNames = entry.altnames.length

    nameSets.push(exports.expandLJMMMName(entry.name));
    for (var i=0; i<numAltNames; i++) {
        nameSets.push(exports.expandLJMMMName(entry.altnames[i]));
    }

    numNameSets = nameSets.length;
    for (var i=0; i<numNameSets; i++) {
        names = nameSets[i];
        numNames = names.length;
        address = entry.address;

        var numNames = names.length;
        for (var j=0; j<numNames; j++) {
            var name = names[j];
            var newEntry = extend({}, entry);
            newEntry.name = name;
            newEntry.address = address;
            newEntry.group = entry.name;
            address += regTypeSize;
            delete newEntry.altnames;
            expandedEntries.push(newEntry);
        }
    }

    return expandedEntries;
};


/**
 * Interpret an the names of entries field as LJMMM, enumerating as appropriate.
 *
 * @param {array} entry An array of objects containing information about a
 *      register or set of registers.
 * @param {function} onError The function to call if an error is encountered
 *      during expansion. Should take a string argument describing the error.
 * @param {function} onSuccess The function to call after enumerating. Will be
 *      given an Array of Object that results from interpreting the name
 *      of the provided entry as an LJMMM field, enumerating and creating the
 *      appropriate entries when interpreting that field.
**/
exports.expandLJMMMEntries = function(entries, onError, onSuccess)
{
    var retEntries = [];
    async.each(
        entries,
        function (entry, callback) {
            exports.expandLJMMMEntry(entry, callback, function(newEntries) {
                retEntries.push.apply(retEntries, newEntries);
                callback();
            });
        },
        function (err) {
            if(err !== null && err !== undefined)
                onError(err);
            else
                onSuccess(retEntries);
        }
    );
}


/**
 * Interpret an the names of entries field as LJMMM synchronously.
 *
 * @param {array} entry An array of objects containing information about a
 *      register or set of registers.
 * @return {Array} An Array of Object that results from interpreting the name
 *      of the provided entry as an LJMMM field, enumerating and creating the
 *      appropriate entries when interpreting that field.
**/
exports.expandLJMMMEntriesSync = function(entries, onError, onSuccess)
{
    var retEntries = [];

    var numEntries = entries.length;
    for(var i=0; i<numEntries; i++)
    {
        var newEntries = exports.expandLJMMMEntrySync(entries[i]);
        retEntries.push.apply(retEntries, newEntries);
    }

    return retEntries;
}
