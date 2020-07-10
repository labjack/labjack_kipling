
var fs = require('fs');
var fse = require('fs-extra');
var path = require('path');
var q = require('q');

var Decompress = require('decompress');
var decompressUnzip = require('decompress-unzip');

function extractWithDecompressUnzip (from, to) {
    var defered = q.defer();
    console.log('Extracting from', from);
    console.log('Extracting to', to);
    var decompress = new Decompress()
        .src(from)
        .dest(to)
        .use(decompressUnzip({strip: 1}));
     
    decompress.run(function (err, files) {
        if (err) {
            console.error('Error decompressing...', err);
            defered.reject();
        } else {
            console.log('Files extracted successfully!');
            defered.resolve();
        }
    });
    return defered.promise;
}

exports.extractWithDecompressUnzip = extractWithDecompressUnzip;