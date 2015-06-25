var errorCatcher = require('./error_catcher');
var archiver = require('archiver');
var fs = require('fs');
var fse = require('fs-extra');
var fsex = require('fs.extra');
var path = require('path');
var q = require('q');


var zip = require('node-zip');
var AdmZip = require('adm-zip');



exports.debug = false;


function walkDirectory (bundle) {
    var defered = q.defer();

    var from = bundle.from;
    var debugCompression = bundle.debugCompression;

    function fileHandler(root, fileStat, next) {
        // debugCompression('in fileHandler', fileStat.name);
        

        var fromDirName = path.dirname(from);
        var splitPath = root.split(from + '/');
        var relativeRootPath = '';
        if(splitPath.length > 1) {
            relativeRootPath = splitPath[1];
        }

        // debugCompression('in fileHandler', relativeRootPath);

        var absolutePath = path.normalize(path.join(
            root,
            fileStat.name
        ));
        // debugCompression('in fileHandler', relativeRootPath);
        var relativePath = path.normalize(path.join(
            relativeRootPath,
            fileStat.name
        ));
        // debugCompression('in fileHandler', relativePath);
        bundle.files.push({
            'absolutePath': absolutePath,
            'relativePath': relativePath,
        });
        next();
    }
    function errorsHandler(root, nodeStatsArray, next) {
        console.log('ERROR!!! Walking', from);
        next();
    }
    function endHandler() {
        debugCompression('Finished Walking');
        defered.resolve(bundle);
    }
    var walker = fsex.walk(from, { followLinks: true });
    
    // Attach Handlers
    walker.on('file', fileHandler);
    walker.on('errors', errorsHandler);
    walker.on('end', endHandler);

    return defered.promise;
}
var yazl = require('yazl');
function performCompressionWithYazl (bundle) {
    var defered = q.defer();

    var from = bundle.from;
    var to = bundle.to;
    var files = bundle.files;
    var debugCompression = bundle.debugCompression;

    var zipfile = new yazl.ZipFile();

    // Add files to the zip file
    files.forEach(function(file) {
        zipfile.addFile(file.absolutePath, file.relativePath);
    });
    zipfile.end();

    // create the .zip file
    function handleFinish() {
        debugCompression('Finished creating .zip file');
        defered.resolve();
    }
    zipfile.outputStream.pipe(fs.createWriteStream(to)).on(
        'close',
        handleFinish
    );

    return defered.promise;
}
function compressFolderWithYazl (from, to) {
    var defered = q.defer();

    var innerDebug = false;
    var debugCompression = function() {
        if(innerDebug) {
            console.log.apply(console, arguments);
        }
    }
    if(from.indexOf('splash_screen') >= 0) {
        innerDebug = true;
    }

    debugCompression('Compressing...', from);
    debugCompression('YaY!!!');

    var fileListing = [];

    var bundle = {
        'from': from,
        'to': to,
        'files': [],
        'debugCompression': debugCompression,
    };

    walkDirectory(bundle)
    .then(performCompressionWithYazl)
    .then(defered.resolve);

    return defered.promise;
}
function compressFolderWithArchiver (from, to) {
    var defered = q.defer();
    if(exports.debug) {
        console.log('Compressing', JSON.stringify(folder, null, 2));
    }

    var output = fs.createWriteStream(to);
    var archive = archiver('zip');

    var reportedError = false;

    output.on('close', function() {
        if(exports.debug) {
            console.log(archive.pointer() + ' total bytes');
            console.log('archiver has been finalized and the output file descriptor has closed.');
        }
        if(reportedError) {
            console.log('!!! Close Happened after reporting an error');
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
        reportedError = true;
        defered.reject();
    });

    archive.pipe(output);

    archive.directory(from, false, { date: new Date() })
    .finalize();
    
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
    // return compressFolderWithArchiver(folder.from, folder.to);
    return compressFolderWithYazl(folder.from, folder.to);
    
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
    './file_extractors/extract_with_unzip'
).extractWithUnzip;

var extractWithDecompressUnzip = require(
    './file_extractors/extract_with_decompress_unzip'
).extractWithDecompressUnzip;

var extractWithYauzl = require(
    './file_extractors/extract_with_yauzl'
).extractWithYauzl;

var extractWithExtractZip = require(
    './file_extractors/extract_with_extract_zip'
).extractWithExtractZip;

var extractWithYauzlQ = require(
    './file_extractors/extract_with_yauzl_q'
).extractWithYauzlQ;

function extractFile (file) {
    var defered = q.defer();
    // extractWithYauzl(file.from, file.to)
    // extractWithUnzip(file.from, file.to)
    // extractWithExtractZip(file.from, file.to)
    extractWithYauzlQ(file.from, file.to)
    .then(function() {
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
    var startTime = new Date();
    var promises = files.map(function(file) {
        return extractFile(file);
    });

    q.allSettled(promises)
    .then(function() {
        var endTime = new Date();
        console.log('Duration', ((endTime - startTime)/1000).toFixed(4));
        defered.resolve();
    });
    return defered.promise;
}
exports.extractFiles = extractFiles;




var parseWithUnzip = require(
    './file_parsers/parse_with_unzip'
).parseWithUnzip;

var parseWithYauzl = require(
    './file_parsers/parse_with_yauzl'
).parseWithYauzl;

function parseZipFile (file) {

    var defered = q.defer();

    // parseWithUnzip(file.path)
    parseWithYauzl(file.path)
    .then(function(data) {
        console.log('Parsed Data', data.name, data.version);
        defered.resolve();
    });
    return defered.promise;
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