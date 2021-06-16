'use strict';

const fs = require('fs');
const child_process = require('child_process');

exports.promiseExecute = function (cmd, directory, debugPath) {

    return new Promise((resolve, reject) => {
        const child = child_process.exec(cmd, {
            'cwd': directory
        });

        const debugStream = fs.createWriteStream(debugPath);
        debugStream.write(cmd + '\n\n');
        child.stdout.pipe(debugStream);
        child.stderr.pipe(debugStream);

        child.on('error', error => {
            console.error(error);
            console.error('Failed to execute:', cmd);
            console.error('Debug log location:', debugPath);
            reject();
        });

        child.on('exit', code => {
            if (code > 0) {
                console.error('Failed to execute:', cmd);
                console.error('Debug log location:', debugPath);
                reject();
            } else {
                resolve();
            }
        });

    });

};
