var errorCatcher = require('./error_catcher');
var archiver = require('archiver');
var fs = require('fs');
var fse = require('fs-extra');
var path = require('path');
var q = require('q');


var zip = require('node-zip');
var AdmZip = require('adm-zip');



exports.debug = false;


function compressFolderWithArchiver (from, to) {
    var defered = q.defer();
    if(exports.debug) {
        console.log('Compressing', JSON.stringify(folder, null, 2));
    }

    var output = fs.createWriteStream(to);
    var archive = archiver('zip');

    output.on('close', function() {
        if(exports.debug) {
            console.log(archive.pointer() + ' total bytes');
            console.log('archiver has been finalized and the output file descriptor has closed.');
        }
        defered.resolve();
    });

    output.on('finish', function() {
        if(exports.debug) {
            console.log('archiver has finished');
        }
    });

    archive.on('error', function(err) {
        console.log('Error creating archive', err);
        defered.reject();
    });

    archive.pipe(output);

    archive.directory(from, false, { date: new Date() }).finalize();
    
    return defered.promise;
}
function compressFolderWithNodeZip (from, to) {
    var newZip = new zip();
    newZip.zipFolder(from,function() {

    });
}
function compressFolderWithAdmZip (from, to) {
    var newZip = new zip();
    newZip.zipFolder(from,function() {

    });
}

function compressFolder (folder) {
    return compressFolderWithArchiver(folder.from, folder.to);
}
exports.compressFolder = compressFolder;

function compressFolders (folders) {
    var defered = q.defer();

    var promises = folders.map(function(folder) {
        return compressFolder(folder);
    });

    q.allSettled(promises)
    .then(function() {
        console.log('finished in compressFolders');
        defered.resolve();
    });
    return defered.promise;
}
exports.compressFolders = compressFolders;

function copySingleFile (from, to) {
    var defered = q.defer();
    if(fs.statSync(from).isDirectory()) {
        fse.ensureDirSync(to);
    }
    // console.log('in copySingleFile', from, to);
    fse.copy(from, to, function(isErr) {
        // console.log('Finished copying', from, to);
        defered.resolve();
    });
    return defered.promise;
}
exports.copySingleFile = copySingleFile;

function copyFolder (folder) {
    var defered = q.defer();
    if(exports.debug) {
        console.log('Coppying', JSON.stringify(folder, null, 2));
    }
    copySingleFile(folder.from, folder.to)
    .then(defered.resolve);
    return defered.promise;
}
exports.copyFolder = copyFolder;

function copyFolders (folders) {
    var defered = q.defer();

    var promises = folders.map(function(folder) {
        return copyFolder(folder);
    });

    q.allSettled(promises)
    .then(function() {
        defered.resolve();
    });
    return defered.promise;
}
exports.copyFolders = copyFolders;




var extractWithUnzip = require(
    'file_extractors/extract_with_unzip'
).extractWithUnzip;

var extractWithDecompressUnzip = require(
    'file_extractors/extract_with_decompress_unzip'
).extractWithDecompressUnzip;

var extractWithYauzl = require(
    'file_extractors/extract_with_yauzl'
).extractWithYauzl;

function extractFile (file) {
    var defered = q.defer();
    extractWithYauzl(file.from, file.to)
    // extractWithUnzip(file.from, file.to)
    .then(function() {
        console.log('Finished Extracting...');
        defered.resolve();
    });
    return defered.promise;
    // return extractWithUnzip(file.from, file.to);
    // return extractWithDecompressUnzip(file.from, file.to);
    // return extractWithYauzl(file.from, file.to);
    
}
exports.extractFile = extractFile;

function extractFiles (files) {
    var defered = q.defer();

    var promises = files.map(function(file) {
        return extractFile(file);
    });

    q.allSettled(promises)
    .then(function() {
        defered.resolve();
    });
    return defered.promise;
}
exports.extractFiles = extractFiles;


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
function parseZipFile (file) {
    return parseWithUnzip(file.path);
}
exports.parseZipFile = parseZipFile;

function parseZipFiles (files) {
    var defered = q.defer();

    var promises = files.map(function(file) {
        return parseZipFile(file);
    });

    q.allSettled(promises)
    .then(function() {
        defered.resolve();
    });
    return defered.promise;
}
exports.parseZipFiles = parseZipFiles;