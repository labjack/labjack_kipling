
var fs = require('fs');
var path = require('path');
var yauzl = require('yauzl');
var q = require('q');
var semver = require('../semver_min');

var enableDebugging = false;
var debug = function() {
  if(enableDebugging) {
    console.log.apply(this, arguments);
  }
};
var logError = function() {
    console.error.apply(this, arguments);
};
function parseWithYauzl (packageInfo) {
    var defered = q.defer();
    var file = packageInfo.location;

    var foundPackageJsonFile = false;
    var isError = false;
    var isResolved = false;
    var errorMessage = '';

    var packageString = '';
    var packageData = {};

    var readStreamError;
    var readZipError;

    var zipFileDone = false;
    var parseFileDone = false;
    // Define a function that saves the streamed package.json data to a 
    // string.
    var savePackageData = function(chunk) {
        packageString += chunk.toString('ascii');
    };

    // Define a function to be called when the .json file is finished being
    // parsed.
    var finishedReadingPackageData = function() {
        try {
            debug('parsing package.json file data');
            packageData = JSON.parse(packageString);
            // console.log('Version...', packageData.name, packageData.version);
            if(packageData.version) {
                if(semver.valid(packageData.version)) {
                    packageInfo.version = packageData.version;
                }
            }
            if(packageData.ljswitchboardDependencies) {
                packageInfo.dependencies = packageData.ljswitchboardDependencies;
            }
        } catch(err) {
            logError('error parsing package.json file data', err);
        }
        parseFileDone = true;
        finishedParsing('parsefile.on(done)');
    };

    var finishedParsing = function(caller) {
        if(!(zipFileDone && parseFileDone)) {
            return;
        }
        debug('Finished parsing', isResolved, isError, foundPackageJsonFile, caller);
        if(isResolved) {
            logError('parseWithYauzl has already resolved...');
        } else {
            isResolved = true;
            if(isError) {
                var errInfo = {
                    'foundPackageJsonFile': foundPackageJsonFile,
                    'readStreamError': readStreamError,
                    'readZipError': readZipError,
                    'errorMessage': errorMessage,
                };
                logError('parseWithYauzl ended in an error', errInfo);
                defered.resolve(packageInfo);
            } else {
                if(foundPackageJsonFile) {
                    // The file was found with no errors.
                    defered.resolve(packageInfo);
                } else {
                    logError('package.json file not found');
                    // The file wasn't found and no errors occured
                    defered.resolve(packageInfo);
                }
            }
        }
    };

    debug('Opening .zip file', file);
    yauzl.open(file, function(err, zipfile) {
        function extractFile(entry) {
            zipfile.openReadStream(entry, function(err, readStream) {
                if(err) {
                    logError('openReadStream error', err);
                } else {
                    readStream.on('data', savePackageData);
                    readStream.on('end', finishedReadingPackageData);
                    readStream.on('error', function(err) {
                        logError('readStream error', err);
                        isError = true;
                        readStreamError = err;
                        errorMessage = 'Error in readStream';
                        finishedParsing('readStream.on(error)');
                    });
                }
            });
        }

        if(err) {
            logError('opening zipfile error', err);
            isError = true;
            readZipError = err;
            errorMessage = 'Error opening the zipfile';
            finishedParsing('zipfile open error');
        } else {
            zipfile.on('entry', function(entry) {
                var fileName = entry.fileName;
                if(!foundPackageJsonFile) {
                    if(fileName === 'package.json') {
                        foundPackageJsonFile = true;
                        extractFile(entry);
                    }
                }
            });
            
            zipfile.on('close', function() {
                zipFileDone = true;
                finishedParsing('zipfile.on(close)');
            });
            zipfile.on('error', function(err) {
                logError('zipfile error', err);
                isError = true;
                readZipError = err;
                errorMessage = 'Error in zipfile error';
                finishedParsing('zipfile.on(error)');
            });
        }
    });
    return defered.promise;
}

exports.parseWithYauzl = parseWithYauzl;