'use strict';

const path = require('path');
const fs = require('fs');
const async = require('async');
const get_cwd = require('./get_cwd');

const validDirectory = function(directories) {
    return new Promise((resolve, reject) => {
        let directoryExists = false;
        let validDirectory = '';
        async.each(
            directories,
            function (directory, callback) {
                const normalizedDir = path.normalize(directory);
                fs.exists(directory, function(exists) {
                    if(exists) {
                       directoryExists = true;
                        validDirectory = directory;
                    }
                    callback();
                });
            }, function(err) {
                if(err) {
                    reject(err);
                } else {
                    const retData = {
                        'exists': directoryExists,
                        'path': validDirectory
                    };
                    resolve(retData);
                }
            }
        );
    });
};

const getArch = function(info) {
	let arch = '';
	if(info.target_arch) {
		const str = info.target_arch;
		if(str.indexOf('ia32') >= 0) {
			arch = 'ia32';
		} else if(str.indexOf('x64') >= 0) {
			arch = 'x64';
		}
	}
	return info.target_arch;
};
const getOS = function(info) {
	let os = '';
	if(info.user_agent) {
		const str = info.user_agent;
		if(str.indexOf('win32') >= 0) {
			os = 'win32';
		} else if(str.indexOf('darwin') >= 0) {
			os = 'darwin';
		} else if(str.indexOf('linux') >= 0) {
			os = 'linux';
		}
	}
	return os;
};

const getVersion = new RegExp("[0-9]{1,}\\.[0-9]{1,}\\.[0-9]{1,}");

const getNodeVersion = function(info) {
	let version = '';
	if(info.node_version) {
		try {
			const str = info.node_version;
			version = getVersion.exec(str)[0];
			const splitVersion = version.split('.');
			version = splitVersion.join('_');
		} catch(err) {

		}
	}
	return version;
};
const checkGYPIFile = function(directoryInfo) {
    return new Promise((resolve, reject) => {
        fs.readFile(directoryInfo.path, function (err, data) {
            if (err) {
                directoryInfo.isValid = false;
                directoryInfo.error = 'Failed to read file: ' + err.toString();
                resolve(directoryInfo);
            } else {
                try {
                    // Convert the data buffer to a string
                    const fileStr = data.toString('ascii');

                    /* OLD (works if external json parser w/ comments works)
                    // Replace the '#' style comments with the '// ' style
                    // const splitStr = fileStr.split('# ');
                    // fileStr = splitStr.join('// ');

                    // Parse the file as a .json file
                    // const gypiFileInfo = commentJson.parse(fileStr);
                    // const gypiFileInfo = jsonParser(fileStr);
                    */

                    /* New (10/28/2019): Parse w/ vanilla json parser.*/
                    const splitStr = fileStr.split('\n');
                    let concattedStr = '';
                    splitStr.forEach(function (str) {
                        if (str.indexOf('#') < 0) {
                            concattedStr += str;
                        }
                    });

                    let gypiFileInfo;

                    try {
                        gypiFileInfo = JSON.parse(concattedStr);
                    } catch (err) {
                        directoryInfo.isValid = false;
                        directoryInfo.error = 'Failed to parse file w/ JSON.parse: ' + directoryInfo.path;
                        resolve(directoryInfo);
                        return;
                    }

                    // Get the arch and os types
                    const buildArch = getArch(gypiFileInfo.variables);
                    const buildOS = getOS(gypiFileInfo.variables);
                    const nodeVersion = getNodeVersion(gypiFileInfo.variables);

                    directoryInfo.isValid = true;
                    if (buildArch === '') {
                        directoryInfo.isValid = false;
                        directoryInfo.error = 'Valid Arch type not found in config.gypi file';
                    }
                    if (buildOS === '') {
                        directoryInfo.isValid = false;
                        directoryInfo.error = 'Valid OS type not found in config.gypi file';
                    }
                    if (nodeVersion === '') {
                        directoryInfo.isValid = false;
                        directoryInfo.error = 'Valid Node Version not found in config.gypi file';
                    }
                    directoryInfo.info = {
                        'arch': buildArch,
                        'os': buildOS,
                        'node_version': nodeVersion
                    };
                    resolve(directoryInfo);
                } catch (parseError) {
                    directoryInfo.isValid = false;
                    directoryInfo.error = 'Failed to parse file: ' + parseError.toString();
                    resolve(directoryInfo);
                }

            }
        });
    });
};

const buildOperation = function(key, requirement, isRequired) {
    const reqType = path.extname(requirement[0]);

    return function (bundle) {
        return new Promise((resolve, reject) => {
            if (reqType === '') {
                validDirectory(requirement)
                    .then(function (res) {
                        bundle[key] = res;
                        if (isRequired) {
                            bundle.overallResult = bundle.overallResult && res.exists;
                        }
                        resolve(bundle);
                    })
                    .catch(err => reject(err));
            } else if (reqType === '.gypi') {
                validDirectory(requirement)
                    .then(checkGYPIFile)
                    .then(function (res) {
                        bundle[key] = res;
                        if (isRequired) {
                            bundle.overallResult = bundle.overallResult && res.isValid;
                        }
                        if (res.info.arch !== '') {
                            bundle.arch = res.info.arch;
                        }
                        if (res.info.os !== '') {
                            bundle.os = res.info.os;
                        }
                        if (res.info.node_version !== '') {
                            bundle.node_version = res.info.node_version;
                        }
                        resolve(bundle);
                    })
                    .catch(err => reject(err));
            } else {
                validDirectory(requirement)
                    .then(function (res) {
                        bundle[key] = res;
                        if (isRequired) {
                            bundle.overallResult = bundle.overallResult && res.exists;
                        }
                        resolve(bundle);
                    })
                    .catch(err => reject(err));
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

const checkRequirements = function(passedResult, passedResults) {
    return new Promise((resolve, reject) => {
        // Because the get_cwd file was first required in the io_interface.js file
        // the reported path doesn't need to get fixed.  It can be used directly.
        // It reports the path of the caller who originally included the file via
        // "module.parent.filename".
        const cwd = get_cwd.getCWD();
        const rootDir = passedResults.cwdOverride ? passedResults.cwdOverride : cwd;

        // const baseDirectory = rootDir + '/node_modules/labjack-nodejs';
        const baseDirectory = rootDir + '';
        const reqs = {
            'labjack-nodejs': [
                path.normalize(baseDirectory + '')
            ],
            'ffi': [
                path.normalize(baseDirectory + '/node_modules/ffi-napi')
            ],
            'ffi-build-info': [
                path.normalize(baseDirectory + '/node_modules/ffi-napi/build/config.gypi')
            ],
            'ref': [
                path.normalize(baseDirectory + '/node_modules/ref-napi')
            ],
            /* // TODO: commented while porting to electron, try to uncomment someday?
                    'ref-build-info': [
                        path.normalize(baseDirectory + '/node_modules/ref-napi/build/config.gypi')
                    ],
            */
        };

        const ops = getOperations(reqs, true);
        const results = {
            'overallResult': true,
            'arch': '',
            'os': '',
            'node_version': ''
        };

        // Execute each test in paralle.
        const promises = [];
        ops.forEach(function (op) {
            promises.push(op(results));
        });

        // Wait for each test to finish & check the results
        Promise.allSettled(promises)
            .then(function (res) {
                if (results.overallResult) {
                    resolve(results);
                } else {
                    reject(results);
                }
            })
            .catch(function (err) {
                console.error(err);
                reject(err);
            });
    });
};

exports.checkRequirements = checkRequirements;
