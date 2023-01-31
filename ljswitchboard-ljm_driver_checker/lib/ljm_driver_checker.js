'use strict';

/**
 * The master_process is in charge of creating and destructing child
 * process and initiating any sendReceive type communication.
 *
 * @author Chris Johnson (LabJack Corp.)
**/

const async = require('async');
const fs = require('fs');
const path = require('path');

const arch = process.arch;
const platform = process.platform;
const os = {
    'win32': 'win32',
    'darwin': 'darwin',
    'linux': 'linux',
    'freebsd': 'linux',
    'sunos': 'linux'
}[platform];

let SystemRoot;
let HOME_DRIVE;
let ALLUSERSPROFILE;
let PROGRAMFILES;
let PROGRAMFILES86;
if (os === 'win32') {
    if (process.env.SystemRoot) {
        SystemRoot = process.env.SystemRoot;
    }
    if (process.env.HOME_DRIVE) {
        HOME_DRIVE=process.env.HOME_DRIVE;
    }
    if (process.env.ALLUSERSPROFILE) {
        ALLUSERSPROFILE = process.env.ALLUSERSPROFILE;
    }
    if (process.env.ProgramFiles) {
        PROGRAMFILES = process.env.ProgramFiles;
    }
    if (process.env['ProgramFiles(x86)']) {
        PROGRAMFILES86 = process.env['ProgramFiles(x86)'];
    }
}
const requirements = {
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
            ],
            'arm64': [
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
            ],
            'arm64': [
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
            ],
            'arm64': [
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
            ],
            'arm64': [
                '/usr/local/share/LabJack/LJM/ljm_constants.json'
            ]
        }
    },
};

const optionalRequirements = {
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
            ],
            'arm64': [
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
            ],
            'arm64': [
                '/usr/local/share/LabJack/LJM/ljm_startup_configs.json'
            ]
        }
    },
};



const osRequirements = {};
const osOptionalRequirements = {};
const coreRequirements = {};

const requirementKeys = Object.keys(requirements);
const optionalRequirementKeys = Object.keys(optionalRequirements);
const coreKeys = [
    'LabJack folder'
];

// Add valid requirements to the osRequirements object
requirementKeys.forEach(function(key) {
    // If the OS has that requirement
    if (requirements[key][os]) {
        // If the OS/arch pair has a requirement
        if (requirements[key][os][arch]) {
            osRequirements[key] = requirements[key][os][arch];
        }
    }
});

// Add valid optional requirements to the osOptionalRequirements object
optionalRequirementKeys.forEach(function(key) {
    // If the OS has that requirement
    if (optionalRequirements[key][os]) {
        // If the OS/arch pair has a requirement
        if (optionalRequirements[key][os][arch]) {
            osOptionalRequirements[key] = optionalRequirements[key][os][arch];
        }
    }
});

// Copy over the core requirements to the coreRequirements object
coreKeys.forEach(function(key) {
    // Switch on OS
    if (requirements[key][os]) {
        // Switch on OS/Arch pair
        if (requirements[key][os][arch]) {
            coreRequirements[key] = requirements[key][os][arch];
        }
    }
});


function validDirectory(directories) {
    return new Promise((resolve, reject) => {
        let directoryExists = false;
        let validDirectory = '';
        let isFound = false;
        async.each(
            directories,
            function (directory, callback) {
                fs.exists(directory, function (exists) {
                    if (exists && !isFound) {
                        isFound = true;
                        directoryExists = true;
                        validDirectory = directory;
                    }
                    callback();
                });
            }, function (err) {
                if (err) {
                    reject(err);
                } else {
                    const retData = {};
                    retData.exists = directoryExists;
                    retData.path = validDirectory;
                    if (!directoryExists) {
                        retData.testedPaths = directories;
                    }
                    resolve(retData);
                }
            });
    });
}

const findVersionString = new RegExp("(?:(#define\\sLJM_VERSION\\s))[0-9]\\.[0-9]{1,}");
const findVersionNum = new RegExp("[0-9]\\.[0-9]{1,}");

function checkHeaderFile(directoryInfo) {
    return new Promise((resolve) => {
        const finishFunc = function (data) {
            try {
                let versionString = findVersionString.exec(data);
                if (versionString) {
                    versionString = versionString[0];
                    let versionNumStr = findVersionNum.exec(versionString);
                    if (versionNumStr) {
                        versionNumStr = versionNumStr[0];
                        directoryInfo.isValid = true;
                        directoryInfo.version = versionNumStr;
                        resolve(directoryInfo);
                    } else {
                        directoryInfo.isValid = false;
                        directoryInfo.error = 'Failed to find the LJM_VERSION string(2)';
                        resolve(directoryInfo);
                    }

                } else {
                    directoryInfo.isValid = false;
                    directoryInfo.error = 'Failed to find the LJM_VERSION string';
                    resolve(directoryInfo);
                }

            } catch (parseError) {
                directoryInfo.isValid = false;
                directoryInfo.error = 'Failed to parse file: ' + parseError.toString();
                resolve(directoryInfo);
            }
        };
        fs.readFile(directoryInfo.path, function (err, data) {
            if (err) {
                fs.readFile(directoryInfo.path, function (err, data) {
                    if (err) {
                        fs.readFile(directoryInfo.path, function (err, data) {
                            if (err) {
                                directoryInfo.isValid = false;
                                directoryInfo.error = 'Failed to read file: ' + err.toString();
                                resolve(directoryInfo);
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
    });
}

function checkJSONFile(directoryInfo) {
    return new Promise((resolve) => {
        function finishFunc(data) {
            try {
                JSON.parse(JSON.stringify(data));
                directoryInfo.isValid = true;
                resolve(directoryInfo);
            } catch (parseError) {
                directoryInfo.isValid = false;
                directoryInfo.error = 'Failed to parse file: ' + parseError.toString();
                resolve(directoryInfo);
            }
        }
        fs.readFile(directoryInfo.path, function (err, data) {
            if (err) {
                fs.readFile(directoryInfo.path, function (err, data) {
                    if (err) {
                        fs.readFile(directoryInfo.path, function (err, data) {
                            if (err) {
                                directoryInfo.isValid = false;
                                directoryInfo.error = 'Failed to read file: ' + err.toString();
                                resolve(directoryInfo);
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
    });
}
const buildOperation = function(key, requirement, isRequired) {
    const reqType = path.extname(requirement[0]);

    return function (bundle) {
        return new Promise((resolve) => {
            if (reqType === '') {
                validDirectory(requirement)
                    .then(function (res) {
                        bundle[key] = res;
                        if (isRequired) {
                            bundle.overallResult = bundle.overallResult && res.exists;
                        }
                        resolve(bundle);
                    });
            } else if (reqType === '.h') {
                validDirectory(requirement)
                    .then(checkHeaderFile)
                    .then(function (res) {
                        bundle[key] = res;
                        if (isRequired) {
                            bundle.overallResult = bundle.overallResult && res.isValid;
                        }
                        if (res.version) {
                            bundle.ljmVersion = res.version;
                        }
                        resolve(bundle);
                    });
            } else if (reqType === '.json') {
                validDirectory(requirement)
                    .then(checkJSONFile)
                    .then(function (res) {
                        bundle[key] = res;
                        if (isRequired) {
                            bundle.overallResult = bundle.overallResult && res.isValid;
                        }

                        resolve(bundle);
                    });
            } else {
                validDirectory(requirement)
                    .then(function (res) {
                        bundle[key] = res;
                        if (isRequired) {
                            bundle.overallResult = bundle.overallResult && res.exists;
                        }
                        resolve(bundle);
                    });
            }
        });
    };
};

const getOperations = function(requirements, isRequired) {
    const operations = [];
    const keys = Object.keys(requirements);

    keys.forEach(function(key) {
        operations.push(buildOperation(key, requirements[key], isRequired));
    });

    return operations;
};

const nonReqOps = getOperations(osOptionalRequirements, false);
const ops = getOperations(osRequirements, true).concat(nonReqOps);

exports.verifyLJMInstallation = function() {
    return new Promise((resolve, reject) => {

        const results = {'overallResult': true, 'ljmVersion': ''};

        // Execute functions in parallel
        const promises = [];
        ops.forEach(function (op) {
            promises.push(op(results));
        });

        // Wait for all of the operations to complete
        Promise.allSettled(promises)
            .then(function (res) {
                // console.log('Finished Test Res', results.overallResult);
                if (results.overallResult) {
                    resolve(results);
                } else {
                    reject(results);
                }
            }, function (err) {
                console.error('Finished Test Err', err);
                reject(results);
            });
    });
};

const coreOps = getOperations(coreRequirements, true);
exports.verifyCoreInstall = function() {
    return new Promise((resolve, reject) => {

        const results = {'overallResult': true};

        // Execute functions in parallel
        const promises = [];
        coreOps.forEach(function (op) {
            promises.push(op(results));
        });

        // Wait for all of the operations to complete
        Promise.allSettled(promises)
            .then(function () {
                // console.log('Finished Test Res', results.overallResult);
                if (results.overallResult) {
                    resolve(results);
                } else {
                    reject(results);
                }
            }, function (err) {
                console.error('Finished Test Err', err);
                reject(results);
            });
    });
};
