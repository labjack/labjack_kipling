
var fs = require('fs');
var path = require('path');
var async = require('async');

var yauzl = require('yauzl');
var mkdirp = require('fs-extra').mkdirp;
var concat = require('concat-stream');
var q = require('q');

var enableDebugging = false;
var debug = function() {
    if(enableDebugging) {
        console.log.apply(this, arguments);
    }
};
var logError = function() {
    console.error.apply(this, arguments);
};

function extractWithYauzl (bundle, self, EVENTS) {
    
    var from = bundle.chosenUpgrade.location;
    var to = bundle.currentPackage.location;
    debug('opening', from, 'extracting to', to);

    // Emit events indicating that a zip file extraction has started
    self.emit(EVENTS.STARTING_EXTRACTION, bundle);
    self.emit(EVENTS.STARTING_ZIP_FILE_EXTRACTION, bundle);

    var defered = q.defer();

    var resolveError = function(err) {
        logError('  - Error performZipFileUpgrade', err, bundle.name);
        var msg = 'Error performing a .zip file upgrade.  Verify ' +
        'the user-permissions for the directory and .zip file: ' +
        upgradeZipFilePath + ', and ' + destinationPath;
        bundle.resultMessages.push({
            'step': 'performDirectoryUpgrade-copyRecursive',
            'message': msg,
            'isError': true,
            'error': JSON.stringify(err)
        });
        bundle.overallResult = false;
        bundle.isError = true;

        // Emit events indicating that a zip file extraction has finished
        // w/ an error
        self.emit(EVENTS.FINISHED_EXTRACTION_ERROR, bundle);
        self.emit(EVENTS.FINISHED_ZIP_FILE_EXTRACTION_ERROR, bundle);
        defered.resolve(bundle);
    };
    var resolveSuccess = function() {
        // Emit events indicating that a zip file extraction has finished
        self.emit(EVENTS.FINISHED_EXTRACTION, bundle);
        self.emit(EVENTS.FINISHED_ZIP_FILE_EXTRACTION, bundle);
        defered.resolve(bundle);
    };

    yauzl.open(from, {autoClose: false}, function(err, zipfile) {
    if (err) {
        resolveError(err);
        return;
    }
    
    var cancelled = false;
    var finished = false;
    
    var asyncQueue = async.queue(extractEntry, 1);
    
    asyncQueue.drain = function() {
        if (!finished) return;
        debug('zip extraction complete');
        resolveSuccess();
    };
    
    zipfile.on("entry", function(entry) {
        debug('zipfile entry', entry.fileName);
        
        if (/\/$/.test(entry.fileName)) {
            // directory file names end with '/'
            return;
        }
        
        if (/^__MACOSX\//.test(entry.fileName)) {
            // dir name starts with __MACOSX/
            return;
        }
        
        asyncQueue.push(entry, function(err) {
            debug('finished processing', entry.fileName, {err: err});
        });
    });
    zipfile.on('error', function(err) {
        resolveError(err);
    });
    zipfile.on('end', function() {
        finished = true;
    });
    
    function extractEntry(entry, done) {
        if (cancelled) {
            debug('skipping entry', entry.fileName, {cancelled: cancelled});
            return setImmediate(done);
        } else {
            debug('extracting entry', entry.fileName);
        }
        
        var dest = path.join(to, entry.fileName);
        var destDir = path.dirname(dest);
        
        // convert external file attr int into a fs stat mode int
        var mode = (entry.externalFileAttributes >> 16) & 0xFFFF;
        // check if it's a symlink or dir (using stat mode constants)
        var IFMT = 61440;
        var IFDIR = 16384;
        var IFLNK = 40960;
        var symlink = (mode & IFMT) === IFLNK;
        var isDir = (mode & IFMT) === IFDIR;
        
        // if no mode then default to readable
        if (mode === 0) {
            if (isDir) mode = 0555;
            else mode = 0444;
        }
        
        // reverse umask first (~)
        var umask = ~process.umask();
        // & with processes umask to override invalid perms
        var procMode = mode & umask;

        zipfile.openReadStream(entry, function(err, readStream) {
            if (err) {
                logError('openReadStream error', err);
                cancelled = true;
                return done(err);
            }
            
            readStream.on('error', function(err) {
                logError('readStream error', err);
            });

            mkdirp(destDir, function(err) {
                if (err) {
                    logError('mkdirp error', destDir, {error: err});
                    cancelled = true;
                    return done(err);
                }

                if (symlink) writeSymlink();
                else writeStream();
            });
            
            function writeStream() {
                var createdWriteStream = fs.createWriteStream(dest, {mode: procMode});
                readStream.pipe(createdWriteStream);
                createdWriteStream.on('finish', function() {
                    done();
                });
                createdWriteStream.on('error', function(err) {
                    logError('write error', {error: err});
                    cancelled = true;
                    return done(err);
                });
            }
            
            // AFAICT the content of the symlink file itself is the symlink target filename string
            function writeSymlink() {
                readStream.pipe(concat(function(data) {
                    var link = data.toString();
                    debug('creating symlink', link, dest);
                    fs.symlink(link, dest, function(err) {
                        if (err) cancelled = true;
                        done(err);
                    });
                }));
            }
        });
    }

    });
    return defered.promise;
}

exports.extractWithYauzl = extractWithYauzl;
