'use strict';

require('./utils/error_catcher');
const path = require('path');
const fs = require('fs');
const {getBuildDirectory} = require('./utils/get_build_dir');

const builder = require('electron-builder');
const Platform = builder.Platform;

const config = require('../package.json').build;

const OUTPUT_PROJECT_FILES_PATH = path.join(getBuildDirectory(), 'output');

const buildOS = {
    'darwin': 'darwin',
    'win32': 'win32'
}[process.platform] || 'linux';

const buildOpts = {
    projectDir: OUTPUT_PROJECT_FILES_PATH,
    publish: 'never',
    config
};


if ('darwin' === buildOS) {
    buildOpts.mac = ['default'];
} else if ('win32' === buildOS) {
    buildOpts.win = ['default'];
} else {
    buildOpts.linux = ['default'];
}

async function fixSnapName() {
    const files = fs.readdirSync(path.join(OUTPUT_PROJECT_FILES_PATH, 'dist'));
    for (const file of files) {
        if (file.startsWith('ljswitchboard-electron_main_') && file.endsWith('_amd64.snap')) {
            const newName = file
                .replace('ljswitchboard-electron_main_', 'kipling_');
            fs.renameSync(
                path.join(OUTPUT_PROJECT_FILES_PATH, 'dist', file),
                path.join(OUTPUT_PROJECT_FILES_PATH, 'dist', newName)
            );
        }
    }
}

builder
    .build(buildOpts)
    .then(() => {
        return fixSnapName();
    })
    .catch((err) => {
        console.error(err);
        // handle error
        process.exit(1);
    });
