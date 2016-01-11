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

// Define what the library name will be on the various platforms.
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

// Define an error object that gets created by this library.
function LJMFFIError(description) {
    this.description = description;
    this.stack = new Error().stack;
}
util.inherits(LJMFFIError, Error);
LJMFFIError.prototype.name = 'ljm-ffi Error';

// Define a function that is used for creating error messages.
function getFunctionArgNames (functionInfo) {
    return JSON.parse(JSON.stringify(functionInfo.requiredArgNames));
}

// Define a function that is used to allocate and fill buffers to communicate
// with the LJM library through ffi.
function allocateAndFillSyncFunctionArgs(functionInfo, funcArgs, userArgs) {
    functionInfo.requiredArgTypes.forEach(function(type, i) {
        var buf = ljTypeOps[type].allocate(userArgs[i]);
        buf = ljTypeOps[type].fill(buf, userArgs[i]);
        funcArgs.push(buf);
    });
}

// Define a function that is used to parse the values altered by LJM through the
// ffi library & save them to a return-object.
function parseAndStoreSyncFunctionArgs(functionInfo, funcArgs, saveObj) {
    functionInfo.requiredArgTypes.forEach(function(type, i) {
        var buf = funcArgs[i];
        var parsedVal = ljTypeOps[type].parse(buf);
        var argName = functionInfo.requiredArgNames[i];
        saveObj[argName] = parsedVal;
    });
}

// Define a function that creates functions that can call LJM synchronously.
function createSyncFunction(functionName, functionInfo) {
    return function syncLJMFunction() {
        if(arguments.length != functionInfo.args.length) {
            var errStr = 'Invalid number of arguments.  Should be: ';
            errStr += functionInfo.args.length.toString() + '.  ';
            errStr += getFunctionArgNames(functionInfo).join(', ');
            errStr += '.';
            throw new LJMFFIError(errStr);
        } else {
            // Create an array that will be filled with values to call the
            // LJM function with.
            var funcArgs = [];

            // Parse and fill the function arguments array with data.
            allocateAndFillSyncFunctionArgs(functionInfo, funcArgs, arguments);

            // Execute the synchronous LJM function.
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
            return retObj;
        }
    };
}

// Define a function that creates safe LJM ffi calls.
function createSafeSyncFunction(functionName, functionInfo) {
    return function safeSyncFunction() {
        // Define a variable to store the error string in.
        var errStr;

        // Check to make sure the arguments seem to be valid.
        if(arguments.length != functionInfo.args.length) {
            // Throw an error if an invalid number of arguments were found.
            errStr = 'Invalid number of arguments.  Should be: ';
            errStr += functionInfo.args.length.toString() + '.  ';
            errStr += getFunctionArgNames(functionInfo).join(', ');
            errStr += '.';
            throw new LJMFFIError(errStr);
        } else {
            // Get a reference to the LJM function being called.
            var ljmFunction = ffi_liblabjack[functionName];
            
            // Check to make sure that the function being called has been
            // defined.
            if(typeof(ljmFunction) === 'function') {
                // Define a variable to store the ljmError value in.
                var ljmError;

                try {
                    // Execute the synchronous LJM function.
                    ljmError = ljmFunction.apply(this, arguments);
                } catch(err) {
                    // Throw an error if the function being called doesn't exist.
                    errStr = 'The function: ';
                    errStr += functionName;
                    errStr += ' is not implemented by the installed version of LJM.';
                    throw new LJMFFIError(errStr);
                }

                // Return the ljmError
                return ljmError;
            } else {
                // Throw an error if the function being called doesn't exist.
                errStr = 'The function: ';
                errStr += functionName;
                errStr += ' is not implemented by the installed version of LJM.';
                throw new LJMFFIError(errStr);
            }
        }
    };
}

// Define a function that creates functions that can call LJM asynchronously.
function createAsyncFunction(functionName, functionInfo) {
    return function asyncLJMFunction() {
        var userCB;
        function cb(err, res) {
            if(err) {
                console.error('Error Reported by Async Function', functionName);
            }
            
            // Create an object to be returned.
            var ljmError = res;
            var retObj = {
                'ljmError': ljmError,
            };
            if(ljmError !== 0) {
                retObj.errorInfo = modbus_map.getErrorInfo(ljmError);
            }

            // Fill the object being returned with data.
            parseAndStoreSyncFunctionArgs(functionInfo, funcArgs, retObj);

            // Execute the user's callback function.
            userCB(retObj);

            return;
        }

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
            if(typeof(arguments[functionInfo.args.length]) !== 'function') {
                userCB = function() {};
            } else {
                userCB = arguments[functionInfo.args.length];

            }

            // Create an array that will be filled with values to call the
            // LJM function with.
            var funcArgs = [];

            // Parse and fill the function arguments array with data.
            allocateAndFillSyncFunctionArgs(functionInfo, funcArgs, arguments);

            // Over-write the function callback in the arguments list.
            funcArgs[funcArgs.length] = cb;

            // Execute the asynchronous LJM function.
            var ljmFunction = liblabjack[functionName].async;
            ljmFunction.apply(this, funcArgs);

            return;
        }
    };
}

// Define a function that creates safe LJM ffi calls.
function createSafeAsyncFunction(functionName, functionInfo) {
    return function safeAsyncFunction() {
        // Define a variable to store the error string in.
        var errStr;

        // Check to make sure the arguments seem to be valid.
        if(arguments.length != (functionInfo.args.length + 1)) {
            // Throw an error if an invalid number of arguments were found.
            errStr = 'Invalid number of arguments.  Should be: ';
            errStr += functionInfo.args.length.toString() + '.  ';
            errStr += getFunctionArgNames(functionInfo).join(', ');
            errStr += '.';
            throw new LJMFFIError(errStr);
        } else {
            // Make sure that the last argument is a function.  This is
            // mandatory for all async function calls.
            if(typeof(arguments[functionInfo.args.length]) !== 'function') {
                arguments[functionInfo.args.length] = function undef() {};
            }

            // Get a reference to the LJM function being called.
            var ljmFunction = ffi_liblabjack[functionName].async;
            
            // Check to make sure that the function being called has been
            // defined.
            if(typeof(ljmFunction) === 'function') {
                // Define a variable to store the ljmError value in.
                var ljmError;

                try {
                    // Execute the synchronous LJM function.
                    ljmError = ljmFunction.apply(this, arguments);
                } catch(err) {
                    // Throw an error if the function being called doesn't exist.
                    errStr = 'The function: ';
                    errStr += functionName;
                    errStr += ' is not implemented by the installed version of LJM.';
                    throw new LJMFFIError(errStr);
                }

                // Return the ljmError
                return ljmError;
            } else {
                // Throw an error if the function being called doesn't exist.
                errStr = 'The function: ';
                errStr += functionName;
                errStr += ' is not implemented by the installed version of LJM.';
                throw new LJMFFIError(errStr);
            }
        }
    };
}

var ffi_liblabjack = {};
var liblabjack = {};
var ljm = {};

var loadedLJM = false;
function loadLJMMultiple() {
    if(!loadedLJM) {
        var numToTry = 1000;
        functionNames.forEach(function(functionName, i) {
            function dummyFunction() {
                console.log('I am alive');
                // console.log(functionName + ' is not implemented by the installed version of LJM.');
            }
            
            var fn = functionName;
            var fi = dummyFunction;
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
                    ffi_liblabjack[functionName] = ljmFunctionBinding[functionName];

                    fn = functionName;
                    fi = LJM_FUNCTIONS[functionName];

                    // Create functions that go in the liblabjack object.
                    liblabjack[fn] = createSafeSyncFunction(fn, fi);
                    liblabjack[fn].async = createSafeAsyncFunction(fn, fi);

                    // Create functions in the ljm object with the same names.
                    ljm[fn] = createSyncFunction(fn, fi);
                    ljm[fn].async = createAsyncFunction(fn, fi);
                }
            } catch(err) {
                // console.log('Failed to link function', functionName, err);
                
                // Create functions that go in the liblabjack object.
                liblabjack[fn] = createSafeSyncFunction(fn, fi);
                liblabjack[fn].async = createSafeAsyncFunction(fn, fi);

                // Create functions in the ljm object with the same names.
                ljm[fn] = createSyncFunction(fn, fi);
                ljm[fn].async = createAsyncFunction(fn, fi);
            }
        });

        // console.log('Finished linking to LJM');
        loadedLJM = true;
    }
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
        
        ffi_liblabjack = ffi.Library(LIBRARY_LOC, ffiFuncInfo);

        var ljmFunctionNames = Object.keys(ffi_liblabjack);
        ljmFunctionNames.forEach(function(functionName) {
            var fn = functionName;
            var fi = LJM_FUNCTIONS[functionName];

            // Create functions that go in the liblabjack object.
            liblabjack[fn] = createSafeSyncFunction(fn, fi);
            liblabjack[fn].async = createSafeAsyncFunction(fn, fi);

            // Create functions in the ljm object with the same names.
            ljm[fn] = createSyncFunction(fn, fi);
            ljm[fn].async = createAsyncFunction(fn, fi);
        });

        // console.log('Finished linking to LJM');
        loadedLJM = true;
    }
}

exports.load = function() {
    // loadLJMSingle();
    loadLJMMultiple();
    return ljm;
};
exports.loadSafe = function() {
    loadLJMMultiple();
    return liblabjack;
};
exports.loadRaw = function() {
    // loadLJMSingle();
    loadLJMMultiple();
    return ffi_liblabjack;
};