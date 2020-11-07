'use strict';

require('./utils/error_catcher');
const path = require('path');
const {getBuildDirectory} = require('./utils/get_build_dir');

const builder = require('electron-builder');
const Platform = builder.Platform;

const config = require('../package.json').build;

const OUTPUT_PROJECT_FILES_PATH = path.join(getBuildDirectory(), 'output');

// Promise is returned
builder
    .build({
        projectDir: OUTPUT_PROJECT_FILES_PATH,
        linux: ['default'],
        win: ['default'],
        // targets: [
        //     Platform.LINUX.createTarget()
        // ],
        config
    })
    .then(() => {
        // handle result
    })
    .catch((err) => {
        console.error(err);
        // handle error
        process.exit(1);
    });
