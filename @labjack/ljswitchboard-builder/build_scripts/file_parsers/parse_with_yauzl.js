
var fs = require('fs');
var path = require('path');
var yauzl = require('yauzl');
var q = require('q');

var enableDebugging = false;
var debug = function() {
  if(enableDebugging) {
    console.log.apply(this, arguments);
  }
};
function parseWithYauzl (file) {
    var defered = q.defer();

    var foundPackageJsonFile = false;
    var packageString = '';
    var packageData = {};

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
        } catch(err) {
            debug('error parsing package.json file data');
        }
    };

    var finishedParsing = function() {
        defered.resolve(packageData);
    };

    debug('Opening .zip file', file);
    yauzl.open(file, function(err, zipfile) {
        function extractFile(entry) {
            zipfile.openReadStream(entry, function(err, readStream) {
                if(err) {
                    debug('openReadStream error', err);
                } else {
                    readStream.on('data', savePackageData);
                    readStream.on('end', finishedReadingPackageData);
                    readStream.on('error', function(err) {
                        debug('readStream error', err);
                    });
                }
            });
        }

        if(err) {
            debug('opening zipfile error', err);
            defered.reject(err);
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
                finishedParsing();
            });
            zipfile.on('error', function(err) {
                debug('zipfile error', err);
            });
        }
    });
    return defered.promise;
}

exports.parseWithYauzl = parseWithYauzl;