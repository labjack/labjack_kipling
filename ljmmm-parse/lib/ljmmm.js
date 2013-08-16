/**
 * Micro-library to read LabJack MODBUS Map Markup language documents.
 *
 * Micro-library that supports the reading of documents or fields within larger
 * documents that contain LJMMM strings. These strings likely define a series
 * of MODBUS map registers (http://www.modbus.org/). See
 * https://bitbucket.org/labjack/ljm_constants for the LJMMM specification.
 *
 * @author Sam Pottinger (samnsparky, http://gleap.org)
 * @license MIT
**/


var extend = require('node.extend');
var lazy = require('lazy');
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
 *      during expansion. Should take string argument describing the error.
 * @param {function} onSuccess The function to call after the LJMMM field has
 *      been interpreted. The callback should take a single argument which
 *      will be an Array of String or, in other words, the expansion / result of
 *      the interpretation of the LJMMM field.
**/
exports.expandLJMMMName = function(name, onError, onSuccess)
{
    var ljmmmRegex = /^(.*)\#\((\d+)\:(\d+)\:?(\d+)?\)(.*)$/;
    var values = name.match(ljmmmRegex);

    if(values === null) {
        onSuccess([name]);
        return;
    }

    var before = values[1];
    var startNum = Number(values[2]);
    var endNum = Number(values[3]);
    var increment = values[4];
    var after = values[5];

    var registerRange;

    if (increment === undefined) {
        registerRange = lazy.range(startNum, endNum+1);
    } else {
        increment = Number(increment);
        registerRange = lazy.range(startNum, endNum+1, increment);
    }

    registerRange.join(function(regNums){
        var fullyQualifiedNames = regNums.map(function(regNum){
            return sprintf.sprintf('%s%d%s', before, regNum, after);
        });
        onSuccess(fullyQualifiedNames);
    });
};


/**
 * Interpret an entry's name field as LJMMM, enumerating as appropriate.
 *
 * @param {Object} entry An Object containing information about a register or
 *      set of registers.
 * @param {function} onError The function to call if an error is encountered
 *      during expansion. Should take a string argument describing the error.
 * @param {function} onSuccess The function to call after enumerating.
 * @return {Array} An Array of Object that results from interpreting the name
 *      of the provided entry as an LJMMM field, enumerating and creating the
 *      appropriate entries when interpreting that field.
**/
exports.expandLJMMMEntry = function(entry, onError, onSuccess)
{
    var expandedEntries = exports.expandLJMMMName(
        entry.name,
        onError,
        function (names) {
            var expandedEntries = [];

            var address = entry.address;
            var regTypeSize = getTypeRegSize(entry.type);

            for (var i in names) {
                var name = names[i];
                var newEntry = extend({}, entry);
                newEntry.name = name;
                newEntry.address = address;
                address += regTypeSize;
                expandedEntries.push(newEntry);
            }

            onSuccess(expandedEntries);
        }
    );
};
