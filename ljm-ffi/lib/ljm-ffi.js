/**
 * LJM dll & dynlib interface using ffi.
*/
var child_process = require('child_process');
const ffi = require('ffi-napi');
var util = require('util');

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

var path = require('path');

var DEBUG_LJM_LIBRARY_LOCATION_SELECTION = true;
var DEBUG_SEARCHING_FOR_LJM_LIB_LOCATIONS = true;
var DEBUG_LOAD_CUSTOM_LJM = true;
var VERBOSE_LJM_FUNCTION_LINKING = true;
var SILENT_LJM_FUNCTION_LINKING = true;

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
    'win32': 'LabJackM.dll',
}[process.platform];

var LJM_LIBRARY_BASE_NAME = {
    'linux': 'libLabJackM',
    'linux2': 'libLabJackM',
    'sunos': 'libLabJackM',
    'solaris': 'libLabJackM',
    'freebsd': 'libLabJackM',
    'openbsd': 'libLabJackM',
    'darwin': 'libLabJackM',
    'mac': 'libLabJackM',
    'win32': 'LabJackM',
}[process.platform];
var LJM_LIBRARY_FILE_TYPE = {
    'linux': '.so',
    'linux2': '.so',
    'sunos': '.so',
    'solaris': '.so',
    'freebsd': '.so',
    'openbsd': '.so',
    'darwin': '.dylib',
    'mac': '.dylib',
    'win32': '.dll',
}[process.platform];

var defaultLinuxLibraryLoc = {
    'ia32': function() {return ['/usr/local/lib'];},
    'x64': function() {return ['/usr/local/lib'];},
    'arm': function() {return ['/usr/local/lib'];},
};
var defaultMacLibraryLoc = {
    'ia32': function() {return ['/usr/local/lib'];},
    'x64': function() {return ['/usr/local/lib'];},
    'arm64': function() {return ['/usr/local/lib'];},
};
var defaultWindowsLibraryLoc = {
    'ia32': function() {return [
        path.join(process.env.SystemRoot, 'SysWOW64'),
        path.join(process.env.SystemRoot, 'System32')
    ];},
    'x64': function() {return [path.join(process.env.SystemRoot, 'System32')];},
};

var DEFAULT_LIBRARY_LOC;
var DEFAULT_LIBRARY_PATH;
try {
    var DEFAULT_LIBRARY_LOCATIONS = {
        'linux': defaultLinuxLibraryLoc,
        'linux2': defaultLinuxLibraryLoc,
        'sunos': defaultLinuxLibraryLoc,
        'solaris': defaultLinuxLibraryLoc,
        'freebsd': defaultLinuxLibraryLoc,
        'openbsd': defaultLinuxLibraryLoc,
        'darwin': defaultMacLibraryLoc,
        'mac': defaultMacLibraryLoc,
        'win32': defaultWindowsLibraryLoc,
    }[process.platform][process.arch]();
    var exists = DEFAULT_LIBRARY_LOCATIONS.some(function(loc) {
        DEFAULT_LIBRARY_LOC = loc;
        DEFAULT_LIBRARY_PATH = path.join(loc, LIBRARY_LOC);
        return fs.existsSync(loc);
    });
} catch(err) {
    console.error(
        'This platform/arch combination is not supported.',
        process.platform,
        process.arch,
        err
    );
}

function custLoadFFILib(libraryLocation, funcInfo) {
    var retInfo = null;
    try {
        retInfo = ffi.Library(ljmLibraryLocation, funcInfo);
    } catch(err) {
        retInfo = ffi.Library(DEFAULT_LIBRARY_PATH, funcInfo);
    }
    return retInfo;
}

function getLibraryName(ljmVersion) {
    if(process.platform === 'win32') {
        return 'LabJackM.dll';
    } else if(process.platform === 'mac' || process.platform === 'darwin') {
        // Build a string that looks like: "libLabJackM-1.11.1.dylib"


        return 'libLabJackM-' + versionStr + '.dylib';
    }
}

var approxPlatform = {
    'darwin': 'darwin',
    'mac': 'darwin',
    'win32': 'win32',
}[process.platform];
if(typeof(approxPlatform) === 'undefined') {
    approxPlatform = 'linux';
}


/*
 * In these functions we will look at a given ljm library path and determine
 * what version of LJM will be loaded.  We will primarily rely on node's
 * path.parse(filePath) function.  An example output of that function is:
    > path.parse('/usr/local/lib/libLabJackM-1.9.0.dylib')
    { root: '/',
      dir: '/usr/local/lib',
      base: 'libLabJackM-1.9.0.dylib',
      ext: '.dylib',
      name: 'libLabJackM-1.9.0' }
 * For each platforms check function the ljmVersion string needs to look like:
 *  "1.11.1"
 */

/*
 * Define a helper function to check linux libry file path "base" attributes
 * to see if they contain the correct version number string.
 */
function linuxHelperCheckLJMVersion(libLocation, libPathInfo, ljmVersion) {
    var isCorrectVersion = false;
    var libraryName = libPathInfo.base;
    var expectedIndex;
    var index = libraryName.indexOf(ljmVersion);
    // We need to perform a switch based on the ending...
    if(libPathInfo.ext === '.so') {
        // make sure the ljmVersion number exists a small amount back from
        // the end of the parsed file path "base" attribute.
        expectedIndex = libraryName.length - libPathInfo.ext.length;
        expectedIndex -= ljmVersion.length;
    } else {
        // Check to make sure the ljmVersion number exists at the end of the
        // parsed file path "base" attribute.
        expectedIndex = libraryName.length - ljmVersion.length;
    }

    if(index == expectedIndex) {
        // Congrats, we have found the required version of LJM!

        // Debugging info...
        if(DEBUG_LJM_LIBRARY_LOCATION_SELECTION) {
            console.log('Found Library!', libLocation);
        }

        // Indicate that we have not found the required version of LJM.
        isCorrectVersion = true;
    } else {
        // We have not found the required version of LJM.

        // Debugging info...
        if(DEBUG_LJM_LIBRARY_LOCATION_SELECTION) {
            console.log('Library:', libLocation);
            console.log('Is the wrong version:', index, expectedIndex);
        }

        // Indicate that we have not found the required version of LJM.
        isCorrectVersion = false;
    }
    return isCorrectVersion;
}

/*
 * Define a helper function to check and rewport that a windows .dll file is
 * the correct version of LJM.
 */
function windowsHelperCheckLJMVersion(libLocation, libraryVersion, ljmVersion) {
    var isCorrectVersion = false;
    // On windows we can do a direct compare.
    if(libraryVersion === ljmVersion) {
        // Congrats, we have found the required version of LJM!

        // Debugging info...
        if(DEBUG_LJM_LIBRARY_LOCATION_SELECTION) {
            console.log('Found Library!', libLocation);
        }

        // Indicate that we have not found the required version of LJM.
        isCorrectVersion = true;
    } else {
        // We have not found the required version of LJM.

        // Debugging info...
        if(DEBUG_LJM_LIBRARY_LOCATION_SELECTION) {
            console.log('Library:', libLocation);
            console.log('Is the wrong version:', libraryVersion, ljmVersion);
        }

        // Indicate that we have not found the required version of LJM.
        isCorrectVersion = false;
    }
    return isCorrectVersion;
}

var windowsWMICRegExp = /(\d{1,3}.){1,3}(\d{1,3}){1}/;

var checkLJMLibForVersion = {
    'linux': function checkLinuxLibraryPath(libLocation, ljmVersion) {
        // For Linux machines the LJM library is distributed looking like:
        //     "libLabJackM.so.1.8.5"
        // Apparently sometimes the files also look like:
        //     "libLabJackM-1.8.5.so"

        // The Linux binaries are distributed as either 32 or 64 bit therefore
        // some extra logic is required to determine what .so is used.
        // Therefore in order to choose between LJM versions a folder structure
        // must be used:
        // ~/linux/ia32/libLabJackM.so.1.8.5
        // ~/linux/x64/libLabJackM.so.1.8.5



        // This needs to not be applied to the default linux library directory:
        // "/usr/local/lib" aka the variable : DEFAULT_LIBRARY_LOC
        // as it will contain only 64bit libraries.  Libraries in this
        // directory should always be allowed.
        var foundLJMVersion = false;
        var pathInfo = path.parse(libLocation);

        // Check if we are in the platforms default library path.
        if(pathInfo.dir === DEFAULT_LIBRARY_LOC) {
            // We don't need to have any logic to determine 32/64 bit versions.

            // Call the helper function to perform logic to check the lib file's
            // version.
            foundLJMVersion = linuxHelperCheckLJMVersion(
                libLocation,
                pathInfo,
                ljmVersion
            );
        } else {
            // We need to have logic to determine the appropriate architecture.
            var arch = process.arch;

            // We can determine the libraries targeted architecture by parsing
            // the pathInfo's "dir" attribute and looking at the "base"
            // attribute.
            var dirInfo = path.parse(pathInfo.dir);
            var libArch = dirInfo.base;
            // We can now check the libraries targeted architecture as well
            // as checking the libraries version.
            if(arch === libArch) {
                // Call the helper function to perform logic to check the lib
                // file's version.
                foundLJMVersion = linuxHelperCheckLJMVersion(
                    libLocation,
                    pathInfo,
                    ljmVersion
                );
            } else {
                // Debugging info...
                if(DEBUG_LJM_LIBRARY_LOCATION_SELECTION) {
                    console.log('Library:', libLocation);
                    console.log('Is for the wrong architecture:', libArch);
                    console.log('The required architecture is:', arch);
                }
                // The library in question is for the wrong architecture.
                foundLJMVersion = false;
            }
        }

        return foundLJMVersion;
    },
    'darwin': function checkDarwinLibraryPath(libLocation, ljmVersion) {
        // For Mac OS X machines the LJM library is distributed looking like:
        //     "libLabJackM-1.11.1.dylib"
        // The Mac OS X binaries are distributed as a combined 32 & 64bit dll so
        // no extra logic is required to determine what .dylib is used.
        var foundLJMVersion = false;
        var pathInfo = path.parse(libLocation);

        // Check to make sure the ljmVersion number exists at the end of the
        // parsed file path "name" attribute.
        var expectedIndex = pathInfo.name.length - ljmVersion.length;
        var index = pathInfo.name.indexOf(ljmVersion);
        if(index == expectedIndex) {
            // Congrats, we have found the required version of the LJM library!

            // Debugging info...
            if(DEBUG_LJM_LIBRARY_LOCATION_SELECTION) {
                console.log('Found Library!', libLocation);
            }

            // Indicate that we found the required version of the LJM library.
            foundLJMVersion = true;
        } else {
            // We have not found the required version of the LJM library.

            // Debugging info...
            if(DEBUG_LJM_LIBRARY_LOCATION_SELECTION) {
                console.log('Library:', libLocation);
                console.log('Is the wrong version:', index, expectedIndex);
            }

            // Indicate that we have not found the required version of LJM.
            foundLJMVersion = false;
        }
        return foundLJMVersion;
    },
    'win32': function checkWin32LibraryPath(libLocation, ljmVersion) {
        // For windows machines the .dll is always distributed as:
        //     "LabJackM.dll"
        // To choose between directories a user must save the .dll's with a
        // particular folder structure:
        //     ~/win32/ia32/1_9_0/LabJackM.dll
        //     ~/win32/x64/1_9_0/LabJackM.dll

        // This needs to not be applied to the relevant default windows .dll
        // directory: "/Windows/System32" or "/Windows/SysWOW64" aka the
        // variable: DEFAULT_LIBRARY_LOC as it will contain only 64bit
        // libraries.  Libraries in this directory should always be allowed.

        var foundLJMVersion = false;
        var pathInfo = path.parse(libLocation);

        // Follow the information available on this stack-overflow page to get
        // a .dll file's version number.
        // http://stackoverflow.com/questions/31149104/node-js-read-file-properties
        var wmicLibVersion = '';
        var cmdStr = "wmic datafile where name='";
        try {
            cmdStr += libLocation.split('\\').join('\\\\');
            cmdStr += "' get Version";

            var wmicOutput = child_process.execSync(cmdStr).toString();
            var regexOutput = windowsWMICRegExp.exec(wmicOutput);
            if(regexOutput) {
                wmicLibVersion = regexOutput[0];
            }
        } catch(err) {
            console.error('Error Executing wmic to collect LabJackM.dll version', err);
            console.error('Library Path', libLocation);
            console.error('Error executing string....', cmdStr);
        }
        var libVersionPartials = [];
        var wmicLibVersionPartials = wmicLibVersion.split('.');
        wmicLibVersionPartials.forEach(function(partial, i) {
            if(i < 3) {
                libVersionPartials.push(partial);
            }
        });
        var libVersion = libVersionPartials.join('.');

        // Check if we are in the platforms default library path.
        if(pathInfo.dir === DEFAULT_LIBRARY_LOC) {

            // We don't need to have any logic to determine 32/64 bit versions.

            // Call the helper function to perform logic to check the lib file's
            // version.
            foundLJMVersion = windowsHelperCheckLJMVersion(
                libLocation,
                libVersion,
                ljmVersion
            );
        } else {
            // We need to have logic to determine the appropriate architecture.
            var arch = process.arch;

            // We can determine the libraries targeted architecture by parsing
            // one directory up from the pathInfo's "dir" attribute and looking
            // at the "base" attribute.
            var dirInfo = path.parse(path.resolve(pathInfo.dir,'..'));
            var libArch = dirInfo.base;

            // We can now check the libraries targeted architecture as well
            // as checking the libraries version.
            if(arch === libArch) {
                // Call the helper function to perform logic to check the lib
                // file's version.
                foundLJMVersion = windowsHelperCheckLJMVersion(
                    libLocation,
                    libVersion,
                    ljmVersion
                );
            } else {
                // Debugging info...
                if(DEBUG_LJM_LIBRARY_LOCATION_SELECTION) {
                    console.log('Library:', libLocation);
                    console.log('Is for the wrong architecture:', libArch);
                    console.log('The required architecture is:', arch);
                }
                // The library in question is for the wrong architecture.
                foundLJMVersion = false;
            }
        }
        return foundLJMVersion;
    }
}[approxPlatform];

function chooseLJMLibFile(libLocations, ljmVersion, requireExactVersion) {
    var libPath = LIBRARY_LOC;
    var foundLJMLib = libLocations.some(function(libLocation) {
        var isVersion = checkLJMLibForVersion(libLocation, ljmVersion);
        if(isVersion) {
            libPath = libLocation;
        }
        return isVersion;
    });

    if(foundLJMLib) {
        // If we found the proper ljmLib then lets return its path.
        return libPath;
    } else {
        // If not we need to decide what to do....
        if(requireExactVersion) {
            // We need to throw an error because we didn't find the
            // requested version of LJM.
            console.error();
            console.error('ERROR: (lib-ffi)');
            console.error('Could not find and load the required version of LJM');
            console.error('Required version of LJM:', ljmVersion);
            console.error('Found LJM Library Locations:', libLocations);
            throw new Error('Did not find the version: ' + ljmVersion + ', of the LJM Library.');
        } else {
            return libPath;
        }
    }
}

function validateLinuxLJMLibPathForSearch(libPath) {
    var fpInfo = path.parse(libPath);
    var isValidFile = true;
    if(fpInfo.base.indexOf(LJM_LIBRARY_BASE_NAME) != 0) {
        isValidFile = false;
    }
    if(fpInfo.ext.indexOf(LJM_LIBRARY_FILE_TYPE) < 0) {
        isValidFile = false;
    }
    return isValidFile;
}
function validateMacLJMLibPathForSearch(libPath) {
    var fpInfo = path.parse(libPath);
    var isValidFile = true;
    if(fpInfo.name.indexOf(LJM_LIBRARY_BASE_NAME) < 0) {
        isValidFile = false;
    }
    if(fpInfo.ext.indexOf(LJM_LIBRARY_FILE_TYPE) < 0) {
        isValidFile = false;
    }
    return isValidFile;
}
function validateWindowsLJMLibPathForSearch(libPath) {
    var fpInfo = path.parse(libPath);
    var isValidFile = true;
    if(fpInfo.name.indexOf(LJM_LIBRARY_BASE_NAME) < 0) {
        isValidFile = false;
    }
    if(fpInfo.ext.indexOf(LJM_LIBRARY_FILE_TYPE) < 0) {
        isValidFile = false;
    }
    return isValidFile;
}
var validateLJMLibPathForSearch = {
    'linux': validateLinuxLJMLibPathForSearch,
    'darwin': validateMacLJMLibPathForSearch,
    'win32': validateWindowsLJMLibPathForSearch,
}[approxPlatform];
function performLJMLibLocationsSearch(foundLJMLibLocations, currentDir) {
    if(DEBUG_SEARCHING_FOR_LJM_LIB_LOCATIONS) {
        console.log('Searching Directory...', currentDir);
        console.log('Searching for info... base name', LJM_LIBRARY_BASE_NAME);
        console.log('Searching for info... file type', LJM_LIBRARY_FILE_TYPE);
    }

    try {
        var foundThings = fs.readdirSync(currentDir);

        var foundDirectories = [];

        // Logic to prevent from recursing into the computer's default library
        // location in order to not recursively search a potentially HUGE &
        // uncontrollably deap directory structure defined by the operating
        // system...
        var recurseIntoDir = true;
        if (currentDir === DEFAULT_LIBRARY_LOC) {
            recurseIntoDir = false;
        }

        foundThings.forEach(function(foundThing, i) {
            try {
                var fullThingPath = path.join(currentDir, foundThing);
                var thingStat = fs.statSync(fullThingPath);
                if(thingStat.isFile()) {
                    // console.log('Checking File...', fullThingPath);
                    var fpInfo = path.parse(fullThingPath);
                    var isValidFile = true;
                    if(fpInfo.base.indexOf(LJM_LIBRARY_BASE_NAME) != 0) {
                        isValidFile = false;
                    }
                    if(fpInfo.base.indexOf(LJM_LIBRARY_FILE_TYPE) < 0) {
                        isValidFile = false;
                    }

                    if(isValidFile) {
                        // console.log('Found File', fullThingPath);
                        foundLJMLibLocations.push(fullThingPath);
                    } else {

                    }
                } else if(thingStat.isDirectory() && recurseIntoDir) {
                    foundDirectories.push(fullThingPath);
                }
            } catch(err) {
                // console.log('Error...', err, foundThing, i);
                // Windows will throw permission errors when checking stats for
                // protected files...
            }
        });

        if(recurseIntoDir) {
            // Recurse into found directories
            foundDirectories.forEach(function(foundDirectory) {
                performLJMLibLocationsSearch(foundLJMLibLocations, foundDirectory);
            });
        } else {
            if(DEBUG_SEARCHING_FOR_LJM_LIB_LOCATIONS) {
                console.log('Not recursing into directory:', currentDir);
            }
        }
    } catch(err) {
        // Caught any synchronous file searching errors... Do nothing...
    }

}
function getAvailableLJMLibLocations(dirsToSearch) {
    var foundLJMLibLocations = [];

    dirsToSearch.forEach(function(dirToSearch) {
        // Call recursive search function to find available LJM libraries.
        performLJMLibLocationsSearch(foundLJMLibLocations, dirToSearch);
    });

    return foundLJMLibLocations;
}
function getLibraryLocation(options) {
    var customLoad = false;
    var location = LIBRARY_LOC;
    var ljmVersion;
    var librarySearchRoot = '';
    var loadExact = false;
    if(options) {
        var ljmVersionPartials;
        var isValidLJMVersion = false;

        // If the requested ljmVersion is a number.
        if(typeof(options.ljmVersion) === 'number') {
            var ljmVersionNum = parseFloat(options.ljmVersion.toFixed(4));
            var majorVal = parseInt(ljmVersionNum.toFixed(0));
            var minorVal = parseInt(((parseFloat(ljmVersionNum.toFixed(2)) - majorVal) * 100).toFixed(0));
            var incrementalVal = parseInt(((ljmVersionNum - majorVal - minorVal/100)*10000).toFixed(0));
            var data = {
                'major': majorVal.toString(),
                'minor': minorVal.toString(),
                'patch': incrementalVal.toString(),
            };
            isValidLJMVersion = true;
            ljmVersionPartials = [data.major, data.minor, data.patch];
        }

        // If the requested ljmVersion is a string.
        // It needs to be in one of the following formats:
        // ['x.x.x', 'x-x-x', 'x_x_x']
        if(typeof(options.ljmVersion) === 'string') {
            var ljmVersionStr = options.ljmVersion;
            var separator = '';
            var isValidStr = true;
            if(ljmVersionStr.indexOf('.') >= 0) {
                separator = '.';
            } else if(ljmVersionStr.indexOf('-') >= 0) {
                separator = '-';
            } else if(ljmVersionStr.indexOf('_') >= 0) {
                separator = '_';
            } else {
                isValidStr = false;
            }

            if(isValidStr) {
                ljmVersionPartials = ljmVersionStr.split(separator);
                if(ljmVersionPartials.length == 3) {
                    isValidLJMVersion = true;
                }
            }
        }

        // If we were given a valid ljmVersion option then combine the built
        // ljmVersionPartials array into a proper ljm version string.
        if(isValidLJMVersion) {
            ljmVersion = ljmVersionPartials.join('.');
            if(DEBUG_LOAD_CUSTOM_LJM) {
                console.log('Requested LJM Version:', ljmVersion);
            }
            customLoad = true;
        }

        // If the user specified the loadExact boolean option.
        if(typeof(options.loadExact) === 'boolean') {
            loadExact = options.loadExact;
        }

        // If the user specified a particular root directory to search...
        if(typeof(options.root) === 'string') {
            librarySearchRoot = options.root;
        }
    }


    if(customLoad) {
        var localDependencies = '';
        var modulePathInfo = path.parse(module.filename);
        var moduleDir = modulePathInfo.dir;
        localDependencies = path.resolve(moduleDir, '..', 'deps');

        if(DEBUG_LOAD_CUSTOM_LJM) {
            console.log('Default Library Location:', DEFAULT_LIBRARY_LOC);
            console.log('Local ljm-ffi dependencies:', localDependencies);
            console.log('User Dir:', librarySearchRoot);
        }

        var ljmLibLocations = getAvailableLJMLibLocations([
            DEFAULT_LIBRARY_LOC,
            librarySearchRoot,
            localDependencies,
        ]);
        if(DEBUG_SEARCHING_FOR_LJM_LIB_LOCATIONS) {
            console.log('Found LJM Libraries:', ljmLibLocations);
        }
        if(DEBUG_LOAD_CUSTOM_LJM) {
            console.log('Num LJM Libs Found', ljmLibLocations.length);
            console.log('Looking for ljm version:', ljmVersion, 'load exact:', loadExact);
        }

        location = chooseLJMLibFile(ljmLibLocations, ljmVersion, loadExact);
        // For now we should assume the user wants to use a version
        // globally installed on their computer
    } else {
        // Do nothing cool for now... Potentially we can check to
        // see if the .dll/.dylib/.so exists and if it doesn't use
        // a local version instead of the global one.
    }
    return location;
}

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
            errStr += 'Given: ' + arguments.length + '.  ';
            errStr += getFunctionArgNames(functionInfo).join(', ');
            errStr += '.';
            console.error('Error in ljm-ffi syncLJMFunction', errStr);
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
    if (!functionInfo || !functionInfo.args) {
        console.error("functionInfo:", functionInfo, "\t functionInfo.args", functionInfo.args);
        throw new Error('functionInfo for "' + functionName + '" without args');
    }

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
            if(typeof(arguments[functionInfo.args.length]) !== 'function') {
                // Throw an error if the last argument is not a function.  This
                // is mandatory for all async function calls.
                errStr = 'Invalid argument; last argument must be a function ';
                errStr += 'but was not. Function name: \'';
                errStr += functionName;
                errStr += '\'.';
                throw new LJMFFIError(errStr);
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
function loadLJMMultiple(ljmVersion) {
    if(!loadedLJM) {
        var ljmLibraryLocation = getLibraryLocation(ljmVersion);
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
                    var ljmFunctionBinding = custLoadFFILib(ljmLibraryLocation, funcInfo);
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
                if(VERBOSE_LJM_FUNCTION_LINKING) {
                    console.log('Warning: Failed to link function', functionName, err);
                } else {
                    if(!SILENT_LJM_FUNCTION_LINKING) {
                        console.log('Warning: Failed to link function', functionName);
                    }
                }

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

function loadLJMSingle(ljmVersion) {
    if(!loadedLJM) {
        var ljmLibraryLocation = getLibraryLocation(ljmVersion);
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
                if(VERBOSE_LJM_FUNCTION_LINKING) {
                    console.log('Failed to convert function', functionName, err);
                } else {
                    console.log('Failed to convert function', functionName);
                }
            }
        });

        ffi_liblabjack = custLoadFFILib(ljmLibraryLocation, ffiFuncInfo);

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

exports.load = function load(options) {
    // loadLJMSingle(options);
    loadLJMMultiple(options);
    return ljm;
};
exports.loadSafe = function loadSafe(options) {
    loadLJMMultiple(options);
    return liblabjack;
};
exports.loadRaw = function loadRaw(options) {
    // loadLJMSingle(options);
    loadLJMMultiple(options);
    return ffi_liblabjack;
};
exports.unload = function() {
    // Un-link the created objects.
    ljm = undefined;
    liblabjack = undefined;
    ffi_liblabjack = undefined;

    // Re-define the library objects as empty objects.
    ffi_liblabjack = {};
    liblabjack = {};
    ljm = {};

    // Indicate that LJM is no longer loaded.
    loadedLJM = false;
};
