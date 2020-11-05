var fs = require('fs');
var unzip = require('unzipper');

function parseWithUnzip(file) {
    return new Promise((resolve, reject) => {
        // Create a readable stream for the .zip file
        var readZipStream = fs.createReadStream(file);

        // Create an unzip parsing stream that will get piped the readable
        // stream data.
        var parseZipStream = unzip.Parse();

        var foundPackageJsonFile = false;
        var packageString = '';

        // Define a function that saves the streamed package.json data to a
        // string.
        var savePackageData = function (chunk) {
            packageString += chunk.toString('ascii');
        };

        // Define a function to be called when the .json file is finished being
        // parsed.
        var finishedReadingPackageData = function () {
            var data = JSON.parse(packageString);
            console.log('Finished finishedReadingPackageData');
            resolve();
        };

        // Attach a variety of event listeners to the parse stream
        parseZipStream.on('entry', function (entry) {
            // console.log('Zip Info', entry.path);
            if (entry.path === 'package.json') {
                foundPackageJsonFile = true;
                entry.on('data', savePackageData);
                entry.on('end', finishedReadingPackageData);
            } else {
                entry.autodrain();
            }
        });
        parseZipStream.on('error', function (err) {
            console.error('  - .zip parsing finished with error', err, file);
            if (!foundPackageJsonFile) {
                resolve();
            }
        });
        parseZipStream.on('close', function () {
            console.log('in parseZipStream close');
            if (!foundPackageJsonFile) {
                resolve();
            }
        });

        // Pipe the readStream into the parseStream
        readZipStream.pipe(parseZipStream);
    });
}

exports.parseWithUnzip = parseWithUnzip;
