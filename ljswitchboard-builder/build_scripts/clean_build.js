'use strict';

require('./utils/error_catcher');

const path = require('path');
const {emptyDirectoryOrDie} = require('./utils/empty_directory');
const {getBuildDirectory} = require('./utils/get_build_dir');

const OUTPUT_BUILD_PATH = path.join(getBuildDirectory(), 'output');
const TEMP_PUBLISH_PATH = path.join(getBuildDirectory(), 'temp_publish');
const TEMP_PROJECT_FILES_PATH = path.join(getBuildDirectory(), 'temp_project_files');

emptyDirectoryOrDie(OUTPUT_BUILD_PATH);
emptyDirectoryOrDie(TEMP_PUBLISH_PATH);
emptyDirectoryOrDie(TEMP_PROJECT_FILES_PATH);
