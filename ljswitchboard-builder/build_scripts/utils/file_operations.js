'use strict';

require('./error_catcher');
const fs = require('fs');
const fse = require('fs-extra');
const fsex = require('fs.extra');
const path = require('path');
const targz = require('targz');
const yazl = require('yazl');

exports.debug = false;

function walkDirectory (bundle) {
    return new Promise((resolve) => {

        const from = bundle.from;
        const debugCompression = bundle.debugCompression;

        function getFileHandler(isDirectory) {
            const fileHandler = function(root, fileStat, next) {
                // debugCompression('in fileHandler', fileStat.name);

                const splitPath = root.split(from + path.sep);
                const relativeRootPath = splitPath.length > 1 ? splitPath[1] : '';

                const absolutePath = path.normalize(path.join(
                    root,
                    fileStat.name
                ));
                // debugCompression('in fileHandler', relativeRootPath);
                const relativePath = path.normalize(path.join(
                    relativeRootPath,
                    fileStat.name
                ));
                // debugCompression('in fileHandler', relativePath);
                if(isDirectory) {
                    bundle.folders.push({
                        'absolutePath': absolutePath,
                        'relativePath': relativePath,
                    });
                } else {
                    bundle.files.push({
                        'absolutePath': absolutePath,
                        'relativePath': relativePath,
                    });
                }
                next();
            };
            return fileHandler;
        }
        function errorsHandler(root, nodeStatsArray, next) {
            console.log('[ERROR] Errors occurred while walking', from, ':');
            nodeStatsArray.forEach(function (n) {
                console.error("[ERROR] " + n.name);
                console.error(n.error.message || (n.error.code + ": " + n.error.path));
            });
            console.log('');
            next();
        }
        function endHandler() {
            debugCompression('Finished Walking');
            resolve(bundle);
        }
        const walker = fsex.walk(from, { followLinks: true });

        // Attach Handlers
        walker.on('file', getFileHandler(false));
        walker.on('directory', getFileHandler(true));
        walker.on('errors', errorsHandler);
        walker.on('end', endHandler);

    });
}

function performCompressionWithYazl (bundle) {
    return new Promise((resolve) => {
        const to = bundle.to;
        const files = bundle.files;
        const debugCompression = bundle.debugCompression;

        const zipfile = new yazl.ZipFile();

        // Add folders to the zip file
        // folders.forEach(function(file) {
        //     console.log('Adding Folder', file);
        //     const unixRelativePath = path.posix.join.apply(
        //         path,
        //         file.relativePath.split(path.sep)
        //     );
        //     zipfile.addEmptyDirectory(unixRelativePath);
        // });

        // Add files to the zip file
        files.forEach(function(file) {
            const unixAbsolutePath = path.posix.join.apply(
                path,
                file.absolutePath.split(path.sep)
            );
            const unixRelativePath = path.posix.join.apply(
                path,
                file.relativePath.split(path.sep)
            );
            zipfile.addFile(file.absolutePath, unixRelativePath);
        });
        zipfile.end();

        // create the .zip file
        function handleFinish() {
            debugCompression('Finished creating .zip file');
            resolve();
        }
        zipfile.outputStream.pipe(fs.createWriteStream(to)).on(
            'close',
            handleFinish
        );

    });
}
function compressFolderWithYazl (from, to) {
    return new Promise((resolve) => {
        let innerDebug = false;
        const debugCompression = function() {
            if(innerDebug) {
                console.log.apply(console, arguments);
            }
        };
        if(from.indexOf('splash_screen') >= 0) {
            innerDebug = true;
        }

        debugCompression('Yazl Compressing', from, 'to', to);

        const bundle = {
            'from': from,
            'to': to,
            'files': [],
            'folders': [],
            'debugCompression': debugCompression,
        };

        walkDirectory(bundle)
        .then(performCompressionWithYazl)
        .then(resolve);

    });
}
function compressFolderWithtargz (from, to) {
    // the targz compression doesn't make a folder inside the .tar.gz file
    // where all data is copied to.  This is required by LJM's build system.
    // Therefore we need to make an output_tgz folder, make a k3xxx folder inside it
    // and then copy data from the /output folder to the created folder before
    // compressing.
    return new Promise((resolve, reject) => {
        const outputName = path.parse(path.parse(to).name).name;
        const prevDir = path.dirname(from);
        const outTgzPath = path.join(prevDir, 'output_tgz');
        const tempOutputPath = path.join(prevDir, 'output_tgz', outputName);
        const extractFromPath = path.join(prevDir, 'output_tgz');

        fse.emptyDir(outTgzPath, function(err) {
            // Create an empty directory
            fse.emptyDir(tempOutputPath, function(err) {
                // Copy folder contents to new directory
                copyFolder({
                    from: from,
                    to: tempOutputPath
                })
                .then(function(res) {
                    // compress files into tar.gz archive
                    targz.compress({
                        src: extractFromPath,
                        dest: to,
                    }, function(err){
                        if(err) {
                            console.log('Error creating archive', err);
                            reject();
                        } else {
                            if(exports.debug) {
                                console.log('archiver has been finalized and the output file descriptor has closed.');
                            }
                            resolve();
                        }
                    });
                }, function(err) {
                    console.log('Error moving folders', err);
                    reject();
                });

            });
        });

    });
}

function compressFolder (folder) {
    if(folder.outputType && folder.outputType === '.tar.gz') {
        return compressFolderWithtargz(folder.from, folder.to);
    } else {
        return compressFolderWithYazl(folder.from, folder.to);
    }
}
exports.compressFolder = compressFolder;

function compressFolders (folders) {
    return new Promise((resolve) => {
        const promises = folders.map(function(folder) {
            return compressFolder(folder);
        });

        // console.log('Compressing Folders...');
        Promise.allSettled(promises)
            .then(function() {
                // console.log('finished in compressFolders');
                resolve();
            });
    });
}
exports.compressFolders = compressFolders;



function copySingleFile (from, to) {
    return new Promise((resolve, reject) => {
        if(fs.statSync(from).isDirectory()) {
            fse.ensureDirSync(to);
        }
        // console.log('in copySingleFile', from, to);
        fse.copy(from, to, function(isErr) {
            if (isErr) {
                reject();
                return;
            }

            // console.log('Finished copying', from, to);
            resolve();
        });
    });
}
exports.copySingleFile = copySingleFile;

function copyFolder (folder) {
    return new Promise((resolve) => {
        if(exports.debug) {
            console.log('Coppying', JSON.stringify(folder, null, 2));
        }
        copySingleFile(folder.from, folder.to).then(resolve);
    });
}
exports.copyFolder = copyFolder;

function copyFolders (folders) {
    return new Promise((resolve) => {
        const promises = folders.map(function(folder) {
            return copyFolder(folder);
        });

        Promise.allSettled(promises)
        .then(function() {
            resolve();
        });
    });
}
exports.copyFolders = copyFolders;


/* Move operations */

function moveSingleFile (from, to) {
    return new Promise((resolve) => {
        if(fs.statSync(from).isDirectory()) {
            fse.ensureDirSync(to);
        }
        // console.log('in moveSingleFile', from, to);
        fse.move(from, to, {overwrite:true}, function(isErr) {
            // console.log('Finished copying', from, to);
            resolve();
        });
    });
}
exports.moveSingleFile = moveSingleFile;

function moveFolder (folder) {
    return new Promise((resolve) => {
        if(exports.debug) {
            console.log('Moving', JSON.stringify(folder, null, 2));
        }
        moveSingleFile(folder.from, folder.to).then(resolve);
    });
}
exports.moveFolder = moveFolder;

function moveFolders (folders) {
    return new Promise((resolve) => {
        const promises = folders.map(function(folder) {
            return moveFolder(folder);
        });

        Promise.allSettled(promises)
        .then(function() {
            resolve();
        });
    });
}
exports.moveFolders = moveFolders;

const extractWithUnzip = require(
    '../file_extractors/extract_with_unzip'
).extractWithUnzip;

const extractWithDecompressUnzip = require(
    '../file_extractors/extract_with_decompress_unzip'
).extractWithDecompressUnzip;

const extractWithYauzl = require(
    '../file_extractors/extract_with_yauzl'
).extractWithYauzl;

const extractWithExtractZip = require(
    '../file_extractors/extract_with_extract_zip'
).extractWithExtractZip;

const extractWithYauzlQ = require(
    '../file_extractors/extract_with_yauzl_q'
).extractWithYauzlQ;

function extractFile (file) {
    return new Promise((resolve) => {
        // extractWithYauzl(file.from, file.to)
        // extractWithUnzip(file.from, file.to)
        // extractWithExtractZip(file.from, file.to)
        extractWithYauzlQ(file.from, file.to)
            .then(function() {
                resolve();
            });
    });
    // return extractWithUnzip(file.from, file.to);
    // return extractWithDecompressUnzip(file.from, file.to);
    // return extractWithYauzl(file.from, file.to);

}
exports.extractFile = extractFile;

function extractFiles (files) {
    return new Promise((resolve) => {
        const startTime = new Date();
        const promises = files.map(function(file) {
            return extractFile(file);
        });

        Promise.allSettled(promises)
        .then(function() {
            const endTime = new Date();
            console.log('Duration', ((endTime - startTime)/1000).toFixed(4), 'seconds');
            resolve();
        });
    });
}
exports.extractFiles = extractFiles;

const parseWithUnzip = require(
    '../file_parsers/parse_with_unzip'
).parseWithUnzip;

const parseWithYauzl = require(
    '../file_parsers/parse_with_yauzl'
).parseWithYauzl;

function parseZipFile (file) {
    return new Promise((resolve) => {
        // parseWithUnzip(file.path)
        parseWithYauzl(file.path)
        .then(function(data) {
            if (exports.debug) {
                console.log('Parsed Data', data.name, data.version);
            }
            resolve();
        });
    });
}
exports.parseZipFile = parseZipFile;

function parseZipFiles (files) {
    return new Promise((resolve) => {
        const promises = files.map(function(file) {
            return parseZipFile(file);
        });

        Promise.allSettled(promises)
            .then(function() {
                resolve();
            });
    });
}
exports.parseZipFiles = parseZipFiles;
