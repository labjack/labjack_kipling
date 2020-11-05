
var fs = require('fs');
var unzip = require('unzipper');

function extractWithUnzip (from, to) {
    return new Promise((resolve, reject) => {
        var destinationPath = to;
        var upgradeZipFilePath = from;

        var isError = false;
        var archiveStream;
        var unzipExtractor;
        try {
            archiveStream = fs.createReadStream(upgradeZipFilePath);
            unzipExtractor = unzip.Extract({ path: destinationPath });
        } catch(err) {
            console.log('error...', err);
            isError = true;
            reject();
        }

        if(!isError) {
            // Emit events indicating that a zip file extraction has started
            // self.emit(EVENTS.STARTING_EXTRACTION, bundle);
            // self.emit(EVENTS.STARTING_ZIP_FILE_EXTRACTION, bundle);
            console.log('starting Extraction');

            unzipExtractor.on('error', function(err) {
                console.error('  - Error performZipFileUpgrade', err);
                console.error('   - Failed From:', from);
                console.error('   - Failed to:', to);

                var msg = 'Error performing a .zip file upgrade.  Verify ' +
                'the user-permissions for the directory and .zip file: ' +
                upgradeZipFilePath + ', and ' + destinationPath;
                var messageData = {
                    'step': 'performDirectoryUpgrade-copyRecursive',
                    'message': msg,
                    'isError': true,
                    'error': JSON.stringify(err)
                };
                // console.log('Message Data', messageData);
                console.log('');
                reject();
            });

            unzipExtractor.on('close', function() {
                // Emit events indicating that a zip file extraction has finished
                console.log('Finished Extracting');
                resolve();
            });

            archiveStream.pipe(unzipExtractor);
        }
    });
}

exports.extractWithUnzip = extractWithUnzip;
