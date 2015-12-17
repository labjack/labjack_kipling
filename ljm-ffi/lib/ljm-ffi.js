/**
 * LJM dll & dynlib interface using ffi.
*/

var ffi;
ffi = require('ffi');
var util = require('util');
var ref = require('ref');       //Load variable type module
var fs = require('fs');         //Load File System module
var jsonConstants = require('ljswitchboard-modbus_map');
var modbus_map = jsonConstants.getConstants();
var driver_const = require('ljswitchboard-ljm_driver_constants');

var ljm_functions = require('./ljm_functions');
var LJM_FUNCTIONS = ljm_functions.LJM_FUNCTIONS;
var functionNames = Object.keys(LJM_FUNCTIONS);

// Define functions to assist with handling various C data types.
var type_helpers = require('./type_helpers');
var ljTypeMap = type_helpers.ljTypeMap;
var ljTypeOps = type_helpers.ljTypeOps;
var convertToFFIType = type_helpers.convertToFFIType;


function convertLJFunctionInfoToFFI(functionInfo) {
    // Define the array to store data types into
    var ffiInfo = [];

    // Loop through and add each of the return data types.
    functionInfo.returnArgTypes.forEach(function(returnArgType) {
        var ffiType = convertToFFIType(returnArgType);
        ffiInfo.push(ffiType);
    });

    // Define the array to store the function argument data types.
    var argumentTypes = [];

    // Loop through and add each of the required arguments.
    functionInfo.requiredArgTypes.forEach(function(requiredArgType) {
        var ffiType = convertToFFIType(requiredArgType);
        argumentTypes.push(ffiType);
    });

    // Add the built argumentTypes array.
    ffiInfo.push(argumentTypes);
    
    // Return the built ffiInfo array.
    return ffiInfo;
}

var LIBRARY_LOC = {
    'linux': 'libLabJackM.so',
    'linux2': 'libLabJackM.so',
    'sunos': 'libLabJackM.so',
    'solaris': 'libLabJackM.so',
    'freebsd': 'libLabJackM.so',
    'openbsd': 'libLabJackM.so',
    'darwin': 'libLabJackM.dylib',
    'mac': 'libLabJackM.dylib',
    'win32': 'LabJackM.dll'
}[process.platform];


function LJMFFIError(description) {
    this.description = description;
    this.stack = new Error().stack;
}
util.inherits(LJMFFIError, Error);
LJMFFIError.prototype.name = 'ljm-ffi Error';

function getFunctionArgNames (functionInfo) {
    return JSON.parse(JSON.stringify(functionInfo.requiredArgNames));
}

function allocateAndFillSyncFunctionArgs(functionInfo, funcArgs, userArgs) {
    functionInfo.requiredArgTypes.forEach(function(type, i) {
        var buf = ljTypeOps[type].allocate(userArgs[i]);
        buf = ljTypeOps[type].fill(buf, userArgs[i]);
        funcArgs.push(buf);
    });
}

function parseAndStoreSyncFunctionArgs(functionInfo, funcArgs, saveObj) {
    functionInfo.requiredArgTypes.forEach(function(type, i) {
        var buf = funcArgs[i];
        var parsedVal = ljTypeOps[type].parse(buf);
        var argName = functionInfo.requiredArgNames[i];
        saveObj[argName] = parsedVal;
    });
}

function createSyncFunction(functionName, functionInfo) {
    return function syncLJMFunction() {
        if(arguments.length != functionInfo.args.length) {
            var errStr = 'Invalid number of arguments.  Should be: ';
            errStr += functionInfo.args.length.toString() + '.  ';
            errStr += getFunctionArgNames(functionInfo).join(', ');
            errStr += '.';
            throw new LJMFFIError(errStr);
        } else {
            // console.log('Calling Sync Function', functionName);
            // Create an array that will be filled with values to call the
            // LJM function with.
            var funcArgs = [];

            // Parse and fill the function arguments array with data.
            allocateAndFillSyncFunctionArgs(functionInfo, funcArgs, arguments);
            // console.log('Filled Args', funcArgs);

            // Execute the synchronous LJM function.
            // var ljmError = liblabjack[functionName].apply(liblabjack[functionName], funcArgs);
            var ljmFunction = liblabjack[functionName];
            var ljmError = ljmFunction.apply(this, funcArgs);

            // Create an object to be returned.
            var retObj = {
                'ljmError': ljmError,
            };
            if(ljmError !== 0) {
                retObj.errorInfo = modbus_map.getErrorInfo(ljmError);
            }


            // Fill the object being returned with data.
            parseAndStoreSyncFunctionArgs(functionInfo, funcArgs, retObj);
            // console.log('Ret Data', retObj);
            return retObj;
        }
    };
}

function createAsyncFunction(functionName, functionInfo) {
    return function asyncLJMFunction() {
        // Check arg-length + 1 for the callback.
        if(arguments.length != (functionInfo.args.length + 1)) {
            var errStr = 'Invalid number of arguments.  Should be: ';
            errStr += functionInfo.args.length.toString() + '.  ';
            errStr += getFunctionArgNames(functionInfo).join(', ');
            errStr += ', ' + 'callback.';
            throw new LJMFFIError(errStr);
        // } else if(typeof(arguments[arguments.length]) !== 'function') {
        //     var errStr
        } else {
            var cb;
            if(typeof(arguments[arguments.length]) !== 'function') {
                cb = function() {};
            }
            console.log('Calling Async Function', functionName, functionInfo);
        }
    };
}

var liblabjack = {};
var ljm = {};
var loadedLJM = false;
function loadLJMMultiple() {
    if(!loadedLJM) {
        var numToTry = 1000;
        functionNames.forEach(function(functionName, i) {
            try {
                if(i < numToTry) {
                    var funcInfo = {};

                    // Convert the defined function into a function definition
                    // compatible with the FFI library.
                    funcInfo[functionName] = convertLJFunctionInfoToFFI(
                        LJM_FUNCTIONS[functionName]
                    );

                    // Create a reference to the function with FFI.
                    var ljmFunctionBinding = ffi.Library(LIBRARY_LOC, funcInfo);
                    liblabjack[functionName] = ljmFunctionBinding[functionName];

                    ljm[functionName] = createSyncFunction(
                        functionName,
                        LJM_FUNCTIONS[functionName]
                    );
                    ljm[functionName].async = createSyncFunction(
                        functionName,
                        LJM_FUNCTIONS[functionName]
                    );
                }
            } catch(err) {
                console.log('Failed to link function', functionName, err);
            }
        });

        // console.log('Finished linking to LJM');
        loadedLJM = true;
    }
    return ljm;
}
function loadLJMSingle() {
    if(!loadedLJM) {
        var numToTry = 1000;
        var ffiFuncInfo = {};
        functionNames.forEach(function(functionName, i) {
            try {
                if(i < numToTry) {
                    // Convert the defined function into a function definition
                    // compatible with the FFI library.
                    ffiFuncInfo[functionName] = convertLJFunctionInfoToFFI(
                        LJM_FUNCTIONS[functionName]
                    );
                }
            } catch(err) {
                console.log('Failed to convert function', functionName, err);
            }
        });
        
        liblabjack = ffi.Library(LIBRARY_LOC, ffiFuncInfo);

        var ljmFunctionNames = Object.keys(liblabjack);
        ljmFunctionNames.forEach(function(ljmFunctionName) {
            ljm[ljmFunctionName] = createSyncFunction(
                ljmFunctionName,
                LJM_FUNCTIONS[ljmFunctionName]
            );
            ljm[ljmFunctionName].async = createSyncFunction(
                ljmFunctionName,
                LJM_FUNCTIONS[ljmFunctionName]
            );
        });

        // console.log('Finished linking to LJM');
        loadedLJM = true;
    }
}
liblabjack.test = function() {
    console.log('liblabjack HERE');
};
liblabjack.test.async = function(cb) {
    console.log('liblabjack here');
};
ljm.test = function() {
    console.log('ljm HERE');
};
ljm.test.async = function(cb) {
    console.log('ljm here');
};
exports.load = function() {
    loadLJMSingle();
    return ljm;
};
exports.loadRaw = function() {
    loadLJMSingle();
    return liblabjack;
}