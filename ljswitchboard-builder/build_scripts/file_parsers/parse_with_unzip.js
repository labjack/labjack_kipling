
var fs = require('fs');
var fse = require('fs-extra');
var path = require('path');
var q = require('q');

var unzip = require('unzip');


function parseWithUnzip(file) {
    var defered = q.defer();
    // Create a readable stream for the .zip file
    var readZipStream = fs.createReadStream(file);

    // Create an unzip parsing stream that will get piped the readable 
    // stream data.
    var parseZipStream = unzip.Parse();

    var foundPackageJsonFile = false;
    var packageString = '';

    // Define a function that saves the streamed package.json data to a 
    // string.
    var savePackageData = function(chunk) {
        packageString += chunk.toString('ascii');
    };

    // Define a function to be called when the .json file is finished being
    // parsed.
    var finishedReadingPackageData = function() {
        var data = JSON.parse(packageString);
        console.log('Finished finishedReadingPackageData');
        defered.resolve();
    };

    // Attach a variety of event listeners to the parse stream
    parseZipStream.on('entry', function(entry) {
        // console.log('Zip Info', entry.path);
        if(entry.path === 'package.json') {
            foundPackageJsonFile = true;
            entry.on('data', savePackageData);
            entry.on('end', finishedReadingPackageData);
        } else {
            entry.autodrain();
        }
    });
    parseZipStream.on('error', function(err) {
        console.error('  - .zip parsing finished with error', err, file);
        if(!foundPackageJsonFile) {
            defered.resolve();
        }
    });
    parseZipStream.on('close', function() {
        console.log('in parseZipStream close');
        if(!foundPackageJsonFile) {
            defered.resolve();
        }
    });

    // Pipe the readStream into the parseStream
    readZipStream.pipe(parseZipStream);
    return defered.promise;
}

exports.parseWithUnzip = parseWithUnzip;