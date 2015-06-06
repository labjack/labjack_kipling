
var errorCatcher = require('./error_catcher');
var fs = require('fs');
var fse = require('fs-extra');
var fsex = require('fs.extra');
var path = require('path');

var OUTPUT_BUILD_DIRECTORY = 'output';
var OUTPUT_BUILD_PATH = path.join(process.cwd(), OUTPUT_BUILD_DIRECTORY);

var emptyDirectory = require('./empty_directory');

// Empty the temp files dir.
emptyDirectory.emptyDirectoryOrDie(OUTPUT_BUILD_PATH);

// Determine current operating system so an appropriate version of node-webkit
// can be used
var os = {
    'win32': 'win',
    'darwin': 'osx',
    'linux': 'linux',
    'freebsd': 'linux',
    'sunos': 'linux'
}[process.platform];
var arch = {
	'arm': 'arm',
	'x64': '64',
	'ia32': '32',
}[process.arch];

// build the path to the appropriate version of node-webkit to build
var nwjs_version = os + arch;
var NODE_WEBKIT_FILES_DIR = 'node_webkit_files';
var NODE_WEBKIT_FILES_PATH = path.join(
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


// console.log('Preparing node-webkit version:', nwjs_version);
