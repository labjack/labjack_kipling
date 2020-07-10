

var fs = require('fs');
var fse = require('fs-extra');
var path = require('path');
var q = require('q');
var startingDir = process.cwd();

var DEBUG_FILE_COPYING = false;
var OUTPUT_PROJECT_FILES_DIRECTORY = 'output';
var OUTPUT_PROJECT_FILES_PATH = path.normalize(path.join(startingDir, OUTPUT_PROJECT_FILES_DIRECTORY));