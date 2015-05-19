
var fs = require('fs');
var fse = require('fs-extra');
var path = require('path');
var q = require('q');

var yauzl = require('yauzl');

/*
 * Documentation for using yauzl is found below:
 *
 * Yauzl github page:
 *  - https://github.com/thejoshwolfe/yauzl
 * Yauzl npm page:
 *  - https://www.npmjs.com/package/yauzl
 * Creating write streams:
 *  - https://nodejs.org/api/fs.html#fs_fs_createwritestream_path_options
*/
function extractWithYauzl (from, to) {
    var defered = q.defer();
    console.log('Extracting from', from);
    console.log('Extracting to', to);
    
    yauzl.open(from, function(err, zipfile) {
        var extractPromises = [];
        var readStreams = [];
        if (err) {
            console.log('Error opening .zip file');
        } else {
            zipfile.on('entry', function(entry) {
                // console.log('Entry...', entry.fileName);
                // if (/\/$/.test(entry.fileName)) {
                //     // directory file names end with '/' 
                //     return;
                // }
                var isDir = false;
                var fileName = entry.fileName;
                if (fileName[fileName.length -1] === '/') {
                    isDir = true;
                }
                var extractDefered = q.defer();
                extractPromises.push(extractDefered.promise);

                if(isDir) {
                    var directoryPath = path.normalize(path.join(to, fileName));
                    // console.log('Creating directory', fileName);
                    fse.ensureDir(directoryPath, function(err) {
                        if(err) {
                            console.log('Error creating directory', fileName);
                            extractDefered.reject();
                        } else {
                            // console.log('Created directory');
                            extractDefered.resolve();
                        }
                    });
                } else {
                    var filePath = path.normalize(path.join(to, fileName));
                    // console.log('Creating file', fileName);
                    var fileStream = zipfile.openReadStream(entry, function(err, readStream) {
                        readStreams.push(readStream);
                        if (err) {
                            console.log('Error extracting .zip file (B)');
                        } else {
                            // ensure parent directory exists, and then: 
                            var writeStream = fs.createWriteStream(filePath);
                            writeStream.on('error', function(err) {
                                console.log('Error detected, trying again later');
                                setTimeout(function() {
                                    var writeStream = fs.createWriteStream(filePath);
                                    writeStream.on('error', function(err) {
                                        console.log('writeStream error', err.code);
                                        console.log(' - path length', err.path.length);
                                        console.log(' - ', err.path);
                                        extractDefered.reject();
                                    });
                                    writeStream.on('finish', function() {
                                        console.log('Re-try Writestream finished');
                                        extractDefered.resolve();
                                    });
                                    readStream.pipe(writeStream);
                                }, 1000);
                            });
                            writeStream.on('finish', function() {
                                // console.log('Writestream finished');
                                extractDefered.resolve();
                            });
                            readStream.pipe(writeStream);
                        }
                        readStream.on('error', function() {
                            console.log('Error in readStream');
                            // extractDefered.reject();
                        });
                        readStream.on('end', function() {
                            // console.log('Created file', fileName);
                            // extractDefered.resolve();
                        });
                    });
                }
               
            });
            zipfile.on('end', function() {
                console.log('End...');
                q.allSettled(extractPromises)
                .then(function(results) {
                    console.log('Really ended', results.length);
                    defered.resolve();
                });
            });
            zipfile.on('close', function() {
                
            });
            zipfile.on('error', function() {
                console.log('Error...');
                defered.resolve();
            });
        }
       
    });
    return defered.promise;
}
