'use strict';

require('./utils/error_catcher');

const fse = require('fs-extra');
const path = require('path');

const {getBuildDirectory} = require('./utils/get_build_dir');
const OUTPUT_BUILD_PATH = path.join(getBuildDirectory(), 'output');

// Determine current operating system so an appropriate version of node-webkit
// can be used
const os = {
    'win32': 'win',
    'darwin': 'osx',
    'linux': 'linux',
    'freebsd': 'linux',
    'sunos': 'linux'
}[process.platform];
const arch = {
	'arm': 'arm',
	'x64': '64',
	'ia32': '32',
}[process.arch];

// build the path to the appropriate version of node-webkit to build
const nwjs_version = os + arch;
const NODE_WEBKIT_FILES_DIR = 'node_webkit_files';
const NODE_WEBKIT_FILES_PATH = path.join(
	process.cwd(),
	NODE_WEBKIT_FILES_DIR,
	nwjs_version
);

// Copy the appropriate node-webkit files to the output directory
try {
	console.log('Copying node-webkit files');
	fse.copySync(NODE_WEBKIT_FILES_PATH, OUTPUT_BUILD_PATH);
} catch(err) {
	console.log('Failed to copy relevant node-webkit files', err);
	process.exit(1);
}
