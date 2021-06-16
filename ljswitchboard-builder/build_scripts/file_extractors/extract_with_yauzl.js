'use strict';

const fs = require('fs');
const fse = require('fs-extra');
const path = require('path');

const yauzl = require('yauzl');

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
    return new Promise((resolve) => {
        console.log('Extracting from', from);
        console.log('Extracting to', to);

        yauzl.open(from, function(err, zipfile) {
            const extractPromises = [];
            if (err) {
                console.log('Error opening .zip file');
            } else {
                zipfile.on('entry', function(entry) {
                    const fileName = entry.fileName;
                    const isDir = (fileName[fileName.length -1] === '/');

                    extractPromises.push(new Promise((resolve1, reject1) => {

                        if(isDir) {
                            const directoryPath = path.normalize(path.join(to, fileName));
                            // console.log('Creating directory', fileName);
                            fse.ensureDir(directoryPath, function(err) {
                                if(err) {
                                    console.log('Error creating directory', fileName);
                                    reject1();
                                } else {
                                    // console.log('Created directory');
                                    resolve1();
                                }
                            });
                        } else {
                            const filePath = path.normalize(path.join(to, fileName));
                            // console.log('Creating file', fileName);
                            zipfile.openReadStream(entry, function(err, readStream) {
                                if (err) {
                                    console.log('Error extracting .zip file (B)');
                                } else {
                                    // ensure parent directory exists, and then:
                                    const writeStream = fs.createWriteStream(filePath);
                                    writeStream.on('error', function() {
                                        console.log('Error detected, trying again later');
                                        setTimeout(function() {
                                            const writeStream = fs.createWriteStream(filePath);
                                            writeStream.on('error', function(err) {
                                                console.log('writeStream error', err.code);
                                                console.log(' - path length', err.path.length);
                                                console.log(' - ', err.path);
                                                reject1();
                                            });
                                            writeStream.on('finish', function() {
                                                console.log('Re-try Writestream finished');
                                                resolve1();
                                            });
                                            readStream.pipe(writeStream);
                                        }, 1000);
                                    });
                                    writeStream.on('finish', function() {
                                        // console.log('Writestream finished');
                                        resolve1();
                                    });
                                    readStream.pipe(writeStream);
                                }
                                readStream.on('error', function() {
                                    console.log('Error in readStream');
                                    // reject1();
                                });
                                readStream.on('end', function() {
                                    // console.log('Created file', fileName);
                                    // resolve1();
                                });
                            });
                        }
                    }));

                });
                zipfile.on('end', function() {
                    console.log('End...');
                    Promise.allSettled(extractPromises)
                    .then(function(results) {
                        console.log('Really ended', results.length);
                        resolve();
                    });
                });
                zipfile.on('close', function() {

                });
                zipfile.on('error', function() {
                    console.log('Error...');
                    resolve();
                });
            }

        });
    });
}

exports.extractWithYauzl = extractWithYauzl;
