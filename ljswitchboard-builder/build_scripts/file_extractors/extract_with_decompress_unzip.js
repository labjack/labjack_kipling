'use strict';

const Decompress = require('decompress');
const decompressUnzip = require('decompress-unzip');

function extractWithDecompressUnzip (from, to) {
    return new Promise((resolve, reject) => {
        console.log('Extracting from', from);
        console.log('Extracting to', to);
        const decompress = new Decompress()
            .src(from)
            .dest(to)
            .use(decompressUnzip({strip: 1}));

        decompress.run(function (err) {
            if (err) {
                console.error('Error decompressing...', err);
                reject();
            } else {
                console.log('Files extracted successfully!');
                resolve();
            }
        });
    });
}

exports.extractWithDecompressUnzip = extractWithDecompressUnzip;
