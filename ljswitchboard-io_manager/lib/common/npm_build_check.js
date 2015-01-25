
var path = require('path');
var fs = require('fs');
var q = require('q');
var async = require('async');
var jsonParser = require('json-parser');

var arch = process.arch;
var platform = process.platform;
var os = {
    'win32': 'win32',
    'darwin': 'darwin',
    'linux': 'linux',
    'freebsd': 'linux',
    'sunos': 'linux'
}[platform];

var cwd = process.cwd();

var validDirectory = function(directories) {
    var defered = q.defer();
    var directoryExists = false;
    var validDirectory = '';
    async.each(
        directories,
        function (directory, callback) {
        	var normalizedDir = path.normalize(directory);
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
                var retData = {
                    'exists': directoryExists,
                    'path': validDirectory
                };
                defered.resolve(retData);
            }
        });
    return defered.promise;
};

var getArch = function(info) {
	var arch = '';
	if(info.target_arch) {
		var str = info.target_arch;
		if(str.indexOf('ia32') >= 0) {
			arch = 'ia32';
		} else if(str.indexOf('x64') >= 0) {
			arch = 'x64';
		}
	}
	return info.target_arch;
};
var getOS = function(info) {
	var os = '';
	if(info.user_agent) {
		var str = info.user_agent;
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
var getVersion = new RegExp("[0-9]{1,}\\.[0-9]{1,}\\.[0-9]{1,}");
var getNodeVersion = function(info) {
	var version = '';
	if(info.node_version) {
		try {
			var str = info.node_version;
			version = getVersion.exec(str)[0];
			var splitVersion = version.split('.');
			version = splitVersion.join('_');
		} catch(err) {

		}
	}
	return version;
};
var checkGYPIFile = function(directoryInfo) {
    var defered = q.defer();
    fs.readFile(directoryInfo.path, function(err, data) {
        if(err) {
            directoryInfo.isValid = false;
            directoryInfo.error = 'Failed to read file: ' + err.toString();
            defered.resolve(directoryInfo);
        } else {
            var jsonFile;
            try {
            	// Convert the data buffer to a string
            	var fileStr = data.toString('ascii');

            	// Replace the '#' style comments with the '// ' style
            	var splitStr = fileStr.split('# ');
            	fileStr = splitStr.join('// ');

            	// Parse the file as a .json file
            	var gypiFileInfo = jsonParser.parse(fileStr);

            	// Get the arch and os types
            	var buildArch = getArch(gypiFileInfo.variables);
            	var buildOS = getOS(gypiFileInfo.variables);
            	var nodeVersion = getNodeVersion(gypiFileInfo.variables);

                directoryInfo.isValid = true;
                if(buildArch === '') {
                	directoryInfo.isValid = false;
                	directoryInfo.error = 'Valid Arch type not found in config.gypi file';
                }
                if(buildOS === '') {
                	directoryInfo.isValid = false;
                	directoryInfo.error = 'Valid OS type not found in config.gypi file';
                }
                if(nodeVersion === '') {
                	directoryInfo.isValid = false;
                	directoryInfo.error = 'Valid Node Version not found in config.gypi file';
                }
                var detectedInfo = {
                	'arch': buildArch,
                	'os': buildOS,
                	'node_version': nodeVersion
                };
                directoryInfo.info = detectedInfo;
                defered.resolve(directoryInfo);
            } catch (parseError) {
                directoryInfo.isValid = false;
                directoryInfo.error = 'Failed to parse file: ' + parseError.toString();
                defered.resolve(directoryInfo);
            }
            
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
        } else if(reqType === '.gypi') {
            validDirectory(requirement)
            .then(checkGYPIFile)
            .then(function(res) {
                bundle[key] = res;
                if(isRequired) {
                    bundle.overallResult = bundle.overallResult && res.isValid;
                }
                if(res.info.arch !== '') {
                	bundle.arch = res.info.arch;
                }
                if(res.info.os !== '') {
                	bundle.os = res.info.os;
                }
                if(res.info.node_version !== '') {
                	bundle.node_version = res.info.node_version;
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

var checkRequirements = function(passedResult, passedResults) {
	var defered = q.defer();

	var rootDir;
	if(passedResults.cwdOverride) {
		rootDir = passedResults.cwdOverride;
	} else {
		rootDir = process.cwd();
	}

	var res = {
		'overallResult': true
	};

	var reqs = {
		'labjack-nodejs': [
			path.normalize(rootDir + '/node_modules/labjack-nodejs')
		],
		'ffi': [
			path.normalize(rootDir + '/node_modules/labjack-nodejs/node_modules/ffi')
		],
		'ffi-build-info': [
			path.normalize(rootDir + '/node_modules/labjack-nodejs/node_modules/ffi/build/config.gypi')
		],
		'ref': [
			path.normalize(rootDir + '/node_modules/labjack-nodejs/node_modules/ref')
		],
		'ref-build-info': [
			path.normalize(rootDir + '/node_modules/labjack-nodejs/node_modules/ref/build/config.gypi')
		],
	};

	var ops = getOperations(reqs, true);
	var results = {
		'overallResult': true,
		'arch': '',
		'os': '',
		'node_version': ''
	};

	// Execute each test in paralle.
	var promises = [];
	ops.forEach(function(op) {
		promises.push(op(results));
	});

	// Wait for each test to finish & check the results
	q.allSettled(promises)
    .then(function(res) {
    	if(results.overallResult) {
    		defered.resolve(results);
    	} else {
    		defered.reject(results);
    	}
    }, function(err) {
    	defered.reject(err);
    });
	return defered.promise;
};

exports.checkRequirements = checkRequirements;