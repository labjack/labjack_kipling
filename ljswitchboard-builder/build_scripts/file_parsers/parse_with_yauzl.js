
var yauzl = require('yauzl');

var enableDebugging = false;
var debug = function() {
  if(enableDebugging) {
    console.log.apply(this, arguments);
  }
};
function parseWithYauzl (file) {
    return new Promise((resolve, reject) => {

        var foundPackageJsonFile = false;
        var packageString = '';
        var packageData = {};

        // Define a function that saves the streamed package.json data to a
        // string.
        var savePackageData = function (chunk) {
            packageString += chunk.toString('ascii');
        };

        // Define a function to be called when the .json file is finished being
        // parsed.
        var finishedReadingPackageData = function () {
            try {
                debug('parsing package.json file data');
                packageData = JSON.parse(packageString);
            } catch (err) {
                debug('error parsing package.json file data');
            }
        };

        var finishedParsing = function () {
            resolve(packageData);
        };

        debug('Opening .zip file', file);
        yauzl.open(file, function (err, zipfile) {
            function extractFile(entry) {
                zipfile.openReadStream(entry, function (err, readStream) {
                    if (err) {
                        debug('openReadStream error', err);
                    } else {
                        readStream.on('data', savePackageData);
                        readStream.on('end', finishedReadingPackageData);
                        readStream.on('error', function (err) {
                            debug('readStream error', err);
                        });
                    }
                });
            }

            if (err) {
                debug('opening zipfile error', err);
                reject(err);
            } else {
                zipfile.on('entry', function (entry) {
                    var fileName = entry.fileName;
                    if (!foundPackageJsonFile) {
                        if (fileName === 'package.json') {
                            foundPackageJsonFile = true;
                            extractFile(entry);
                        }
                    }
                });

                zipfile.on('close', function () {
                    finishedParsing();
                });
                zipfile.on('error', function (err) {
                    debug('zipfile error', err);
                });
            }
        });
    });
}

exports.parseWithYauzl = parseWithYauzl;
