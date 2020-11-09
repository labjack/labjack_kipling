'use strict';

require('./utils/error_catcher');
const path = require('path');
const {getBuildDirectory} = require('./utils/get_build_dir');

const builder = require('electron-builder');
const Platform = builder.Platform;

const config = require('../package.json').build;

const OUTPUT_PROJECT_FILES_PATH = path.join(getBuildDirectory(), 'output');
const BUILT_PROJECT_FILES_PATH = path.join(getBuildDirectory(), 'built');

const buildOS = {
    'darwin': 'darwin',
    'win32': 'win32'
}[process.platform] || 'linux';

const buildOpts = {
    projectDir: OUTPUT_PROJECT_FILES_PATH,
    linux: ['default'],
    win: ['default'],
    publish: [],
    // targets: [
    //     Platform.LINUX.createTarget()
    // ],
    config: Object.assign({}, config, {
        directories: {
            output: BUILT_PROJECT_FILES_PATH
        }
    })
};

if ('darwin' === buildOS) {
    buildOpts.mac = ['default'];
}

// Promise is returned
builder
    .build(buildOpts)
    .then(() => {
        // handle result
    })
    .catch((err) => {
        console.error(err);
        // handle error
        process.exit(1);
    });
