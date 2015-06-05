/**
 * The master_process is in charge of creating and destructing child
 * process and initiating any sendReceive type communication.
 *
 * @author Chris Johnson (LabJack Corp.)
**/

var q = require('q');
var async = require('async');
var util = require('util');
var fs = require('fs');
var path = require('path');

var arch = process.arch;
var platform = process.platform;
var os = {
    'win32': 'win32',
    'darwin': 'darwin',
    'linux': 'linux',
    'freebsd': 'linux',
    'sunos': 'linux'
}[platform];

var SystemRoot;
var HOME_DRIVE;
var ALLUSERSPROFILE;
var PROGRAMFILES;
var PROGRAMFILES86;
if(os === 'win32') {
    if(process.env.SystemRoot) {
        SystemRoot = process.env.SystemRoot;
    }
    if(process.env.HOME_DRIVE) {
        HOME_DRIVE=process.env.HOME_DRIVE;
    }
    if(process.env.ALLUSERSPROFILE) {
        ALLUSERSPROFILE = process.env.ALLUSERSPROFILE;
    }
    if(process.env.ProgramFiles) {
        PROGRAMFILES = process.env.ProgramFiles;
    }
    if(process.env['ProgramFiles(x86)']) {
        PROGRAMFILES86 = process.env['ProgramFiles(x86)'];
    }
}
var requirements = {
    'Driver': {
        'win32': {
            'ia32': [
                'C:\\Windows\\System32\\LabJackM.dll',
                SystemRoot + '\\System32\\LabJackM.dll',
            ],
            'x64': [
                // 'C:\\Windows\\SysWOW64\\LabJackM.dll',
                'C:\\Windows\\System32\\LabJackM.dll',
                // SystemRoot + '\\SysWOW64\\LabJackM.dll',
                SystemRoot + '\\System32\\LabJackM.dll',
            ]
        },
        'linux': {
            'ia32': [
                '/usr/local/lib/libLabJackM.so'
            ],
            'x64': [
                '/usr/local/lib/libLabJackM.so'
            ]
        },
        'darwin': {
            'ia32': [
                '/usr/local/lib/libLabJackM.dylib'
            ],
            'x64': [
                '/usr/local/lib/libLabJackM.dylib'
            ]
        }
    },
    'LabJack folder': {
        'win32': {
            'ia32': [
                ALLUSERSPROFILE + '\\LabJack',
                'C:\\ProgramData\\LabJack',
                'C:\\Documents and Settings\\All Users\\Application Data\\LabJack',
            ],
            'x64': [
                ALLUSERSPROFILE + '\\LabJack',
                'C:\\ProgramData\\LabJack',
                'C:\\Documents and Settings\\All Users\\Application Data\\LabJack',
            ]
        },
        'linux': {
            'ia32': [
                '/usr/local/share/LabJack'
            ],
            'x64': [
                '/usr/local/share/LabJack'
            ]
        },
        'darwin': {
            'ia32': [
                '/usr/local/share/LabJack'
            ],
            'x64': [
                '/usr/local/share/LabJack'
            ]
        }
    },
    'LabJack LJM folder': {
        'win32': {
            'ia32': [
                ALLUSERSPROFILE + '\\LabJack\\LJM',
                'C:\\ProgramData\\LabJack\\LJM',
                'C:\\Documents and Settings\\All Users\\Application Data\\LabJack\\LJM',
            ],
            'x64': [
                ALLUSERSPROFILE + '\\LabJack\\LJM',
                'C:\\ProgramData\\LabJack\\LJM',
                'C:\\Documents and Settings\\All Users\\Application Data\\LabJack\\LJM',
            ]
        },
        'linux': {
            'ia32': [
                '/usr/local/share/LabJack/LJM'
            ],
            'x64': [
                '/usr/local/share/LabJack/LJM'
            ]
        },
        'darwin': {
            'ia32': [
                '/usr/local/share/LabJack/LJM'
            ],
            'x64': [
                '/usr/local/share/LabJack/LJM'
            ]
        }
    },
    'LJM .json file': {
        'win32': {
            'ia32': [
                ALLUSERSPROFILE + '\\LabJack\\LJM\\ljm_constants.json',
                'C:\\ProgramData\\LabJack\\LJM\\ljm_constants.json',
                'C:\\Documents and Settings\\All Users\\Application Data\\LabJack\\LJM\\ljm_constants.json',
            ],
            'x64': [
                ALLUSERSPROFILE + '\\LabJack\\LJM\\ljm_constants.json',
                'C:\\ProgramData\\LabJack\\LJM\\ljm_constants.json',
                'C:\\Documents and Settings\\All Users\\Application Data\\LabJack\\LJM\\ljm_constants.json',
            ]
        },
        'linux': {
            'ia32': [
                '/usr/local/share/LabJack/LJM/ljm_constants.json'
            ],
            'x64': [
                '/usr/local/share/LabJack/LJM/ljm_constants.json'
            ]
        },
        'darwin': {
            'ia32': [
                '/usr/local/share/LabJack/LJM/ljm_constants.json'
            ],
            'x64': [
                '/usr/local/share/LabJack/LJM/ljm_constants.json'
            ]
        }
    },
};

var optionalRequirements = {
    'LJM header file': {
        'win32': {
            'ia32': [
                PROGRAMFILES + '\\LabJack\\Drivers\\LabJackM.h',
                PROGRAMFILES86 + '\\LabJack\\Drivers\\LabJackM.h',
                'C:\\"Program Files"\\LabJack\\Drivers\\LabJackM.h',
            ],
            'x64': [
                PROGRAMFILES + '\\LabJack\\Drivers\\LabJackM.h',
                PROGRAMFILES86 + '\\LabJack\\Drivers\\LabJackM.h',
                'C:\\"Program Files"\\LabJack\\Drivers\\LabJackM.h',
                'C:\\"Program Files (x86)"\\LabJack\\Drivers\\LabJackM.h',
				'C:\\Program Files\\LabJack\\Drivers\\LabJackM.h',
                'C:\\Program Files (x86)\\LabJack\\Drivers\\LabJackM.h',
            ]
        },
        'linux': {
            'ia32': [
                '/usr/local/include/LabJackM.h'
            ],
            'x64': [
                '/usr/local/include/LabJackM.h'
            ]
        },
        'darwin': {
            'ia32': [
                '/usr/local/include/LabJackM.h'
            ],
            'x64': [
                '/usr/local/include/LabJackM.h'
            ]
        }
    },
    'LJM windows .lib file': {
        'win32': {
            'ia32': [
                PROGRAMFILES + '\\LabJack\\Drivers\\LabJackM.lib',
                PROGRAMFILES86 + '\\LabJack\\Drivers\\LabJackM.lib',
                'C:\\"Program Files"\\LabJack\\Drivers\\LabJackM.lib',
				'C:\\Program Files\\LabJack\\Drivers\\LabJackM.lib',
            ],
            'x64': [
                PROGRAMFILES + '\\LabJack\\Drivers\\LabJackM.lib',
                PROGRAMFILES86 + '\\LabJack\\Drivers\\LabJackM.lib',
                'C:\\"Program Files"\\LabJack\\Drivers\\LabJackM.lib',
				'C:\\Program Files\\LabJack\\Drivers\\LabJackM.lib',
				'C:\\Program Files (x86)\\LabJack\\Drivers\\LabJackM.lib',
            ]
        },
    },
    'LJM startup configs file': {
        'win32': {
            'ia32': [
                ALLUSERSPROFILE + '\\LabJack\\LJM\\ljm_startup_configs.json',
                'C:\\ProgramData\\LabJack\\LJM\\ljm_startup_configs.json',
                'C:\\Documents and Settings\\All Users\\Application Data\\LabJack\\LJM\\ljm_startup_configs.json',
            ],
            'x64': [
                ALLUSERSPROFILE + '\\LabJack\\LJM\\ljm_startup_configs.json',
                'C:\\ProgramData\\LabJack\\LJM\\ljm_startup_configs.json',
                'C:\\Documents and Settings\\All Users\\Application Data\\LabJack\\LJM\\ljm_startup_configs.json',
            ]
        },
        'linux': {
            'ia32': [
                '/usr/local/share/LabJack/LJM/ljm_startup_configs.json'
            ],
            'x64': [
                '/usr/local/share/LabJack/LJM/ljm_startup_configs.json'
            ]
        },
        'darwin': {
            'ia32': [
                '/usr/local/share/LabJack/LJM/ljm_startup_configs.json'
            ],
            'x64': [
                '/usr/local/share/LabJack/LJM/ljm_startup_configs.json'
            ]
        }
    },
};



var osRequirements = {};
var osOptionalRequirements = {};
var coreRequirements = {};

var requirementKeys = Object.keys(requirements);
var optionalRequirementKeys = Object.keys(optionalRequirements);
var coreKeys = [
    'LabJack folder'
];


// Add valid requirements to the osRequirements object
requirementKeys.forEach(function(key) {
    // If the OS has that requirement
    if(requirements[key][os]) {
        // If the OS/arch pair has a requirement
        if(requirements[key][os][arch]) {
            osRequirements[key] = requirements[key][os][arch];
        }
    }
});

// Add valid optional requirements to the osOptionalRequirements object
optionalRequirementKeys.forEach(function(key) {
    // If the OS has that requirement
    if(optionalRequirements[key][os]) {
        // If the OS/arch pair has a requirement
        if(optionalRequirements[key][os][arch]) {
            osOptionalRequirements[key] = optionalRequirements[key][os][arch];
        }
    }
});

// Copy over the core requirements to the coreRequirements object
coreKeys.forEach(function(key) {
    // Switch on OS
    if(requirements[key][os]) {
        // Switch on OS/Arch pair
        if(requirements[key][os][arch]) {
            coreRequirements[key] = requirements[key][os][arch];
        }
    }
});


var validDirectory = function(directories) {
    var defered = q.defer();
    var directoryExists = false;
    var validDirectory = '';
    async.each(
        directories,
        function (directory, callback) {
            fs.exists(directory, function(exists) {
                if(exists) {
                   directoryExists = true;
                    validDirectory = directory;
                }
                callback();
            });
        }, function(err) {
            
            if(err) {
                defered.reject(err);
            } else {
                var retData = {};
                retData.exists = directoryExists;
                retData.path = validDirectory;
                if(!directoryExists) {
                    retData.testedPaths = directories;
                }
                defered.resolve(retData);
            }
        });
    return defered.promise;
};

var findVersionString = new RegExp("(?:(\\#define\\sLJM_VERSION\\s))[0-9]\\.[0-9]{1,}");
var findVersionNum = new RegExp("[0-9]\\.[0-9]{1,}");
var checkHeaderFile = function(directoryInfo) {
    var defered = q.defer();
    var finishFunc = function(data) {
        try {
            var versionString = findVersionString.exec(data);
            if(versionString) {
                versionString = versionString[0];
                var versionNumStr = findVersionNum.exec(versionString);
                if(versionNumStr) {
                    versionNumStr = versionNumStr[0];
                    directoryInfo.isValid = true;
                    directoryInfo.version = versionNumStr;
                    defered.resolve(directoryInfo);
                } else {
                    directoryInfo.isValid = false;
                    directoryInfo.error = 'Vailed to find the LJM_VERSION string(2)';
                    defered.resolve(directoryInfo);
                }
                
            } else {
                directoryInfo.isValid = false;
                directoryInfo.error = 'Vailed to find the LJM_VERSION string';
                defered.resolve(directoryInfo);
            }
            
        } catch (parseError) {
            directoryInfo.isValid = false;
            directoryInfo.error = 'Failed to parse file: ' + parseError.toString();
            defered.resolve(directoryInfo);
        }
    };
    fs.readFile(directoryInfo.path, function(err, data) {
        if(err) {
            fs.readFile(directoryInfo.path, function(err, data) {
                if(err) {
                    fs.readFile(directoryInfo.path, function(err, data) {
                        if(err) {
                            directoryInfo.isValid = false;
                            directoryInfo.error = 'Failed to read file: ' + err.toString();
                            defered.resolve(directoryInfo);
                        } else {
                            finishFunc(data);
                        }
                    });
                } else {
                    finishFunc(data);
                }
            });
        } else {
            finishFunc(data);
        }
    });
    return defered.promise;
};
var checkJSONFile = function(directoryInfo) {
    var defered = q.defer();
    var finishFunc = function(data) {
        var jsonFile;
        try {
            jsonFile = JSON.parse(data);
            directoryInfo.isValid = true;
            defered.resolve(directoryInfo);
        } catch (parseError) {
            directoryInfo.isValid = false;
            directoryInfo.error = 'Failed to parse file: ' + parseError.toString();
            defered.resolve(directoryInfo);
        }
    };
    fs.readFile(directoryInfo.path, function(err, data) {
        if(err) {
            fs.readFile(directoryInfo.path, function(err, data) {
                if(err) {
                    fs.readFile(directoryInfo.path, function(err, data) {
                        if(err) {
                            directoryInfo.isValid = false;
                            directoryInfo.error = 'Failed to read file: ' + err.toString();
                            defered.resolve(directoryInfo);
                        } else {
                            finishFunc(data);
                        }
                    });
                } else {
                    finishFunc(data);
                }
            });
        } else {
            finishFunc(data);
        }
    });
    return defered.promise;
};
var buildOperation = function(key, requirement, isRequired) {
    var reqType = path.extname(requirement[0]);

    var operation = function(bundle) {
        var defered = q.defer();

        if(reqType === '') {
            validDirectory(requirement)
            .then(function(res) {
                bundle[key] = res;
                if(isRequired) {
                    bundle.overallResult = bundle.overallResult && res.exists;
                }
                defered.resolve(bundle);
            });
        } else if(reqType === '.h') {
            validDirectory(requirement)
            .then(checkHeaderFile)
            .then(function(res) {
                bundle[key] = res;
                if(isRequired) {
                    bundle.overallResult = bundle.overallResult && res.isValid;
                }
                if(res.version) {
                    bundle.ljmVersion = res.version;
                }
                defered.resolve(bundle);
            });
        } else if(reqType === '.json') {
            validDirectory(requirement)
            .then(checkJSONFile)
            .then(function(res) {
                bundle[key] = res;
                if(isRequired) {
                    bundle.overallResult = bundle.overallResult && res.isValid;
                }
                
                defered.resolve(bundle);
            });
        } else {
            validDirectory(requirement)
            .then(function(res) {
                bundle[key] = res;
                if(isRequired) {
                    bundle.overallResult = bundle.overallResult && res.exists;
                }
                defered.resolve(bundle);
            });
        }
        return defered.promise;
    };

    return operation;
};

var getOperations = function(requirements, isRequired) {
    var operations = [];
    var keys = Object.keys(requirements);

    keys.forEach(function(key) {
        operations.push(buildOperation(key, requirements[key], isRequired));
    });
    
    return operations;
};

var ops = getOperations(osRequirements, true);
var nonReqOps = getOperations(osOptionalRequirements, false);
ops = ops.concat(nonReqOps);



exports.verifyLJMInstallation = function() {
    var defered = q.defer();

    var results = {'overallResult': true,'ljmVersion': ''};

    // Execute functions in parallel
    var promises = [];
    ops.forEach(function(op) {
        promises.push(op(results));
    });

    // Wait for all of the operations to complete
    q.allSettled(promises)
    .then(function(res) {
        // console.log('Finished Test Res', results.overallResult);
        if(results.overallResult) {
            defered.resolve(results);
        } else {
            defered.reject(results);
        }
    }, function(err) {
        // console.log('Finished Test Err', err);
        defered.reject(results);
    });
    return defered.promise;
};

var coreOps = getOperations(coreRequirements, true);
exports.verifyCoreInstall = function() {
    var defered = q.defer();

    var results = {'overallResult': true};

    // Execute functions in parallel
    var promises = [];
    coreOps.forEach(function(op) {
        promises.push(op(results));
    });

    // Wait for all of the operations to complete
    q.allSettled(promises)
    .then(function(res) {
        // console.log('Finished Test Res', results.overallResult);
        if(results.overallResult) {
            defered.resolve(results);
        } else {
            defered.reject(results);
        }
    }, function(err) {
        // console.log('Finished Test Err', err);
        defered.reject(results);
    });
    return defered.promise;
};