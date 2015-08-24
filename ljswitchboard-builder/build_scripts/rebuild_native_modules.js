

console.log('Building Kipling');

var errorCatcher = require('./error_catcher');
var fs = require('fs');
var fse = require('fs-extra');
var path = require('path');
var cwd = process.cwd();
var child_process = require('child_process');


// It is required that anode/io.js version with child_process.execSync implemented
if(typeof(child_process.execSync) !== 'function') {
	console.log('Please install a version of node/io.js with child_process.execSync');
	process.exit();
}

var commands = {};

var NATIVE_MODULES_BASE_LOCATION = path.normalize(path.join(
	'temp_project_files',
	'ljswitchboard-io_manager',
	'node_modules'
	// 'labjack-nodejs',
	// 'node_modules'
));

var buildScripts = [
	{'lib': 'ffi', 'text': 'Building ffi'},
	{'lib': 'ref', 'text': 'Building ref'},
];

var buildCommands = [];

buildScripts.forEach(function(buildScript) {
	buildScript.libPath = path.normalize(path.join(
		cwd, NATIVE_MODULES_BASE_LOCATION, buildScript.lib
	));

	var cleanProject = [
		'node-gyp',
		'clean'
	].join(' ');

	var buildOS = {
		'darwin': 'darwin',
		'win32': 'win32'
	}[process.platform];
	if(typeof(buildOS) === 'undefined') {
		buildOS = 'linux';
	}

	// Project configurations
	var configureProject = {
		'win32': [
			'node-gyp',
			'configure',
			'--msvs_version=2008',
			'--arch=' + process.arch,
			'--target=' + process.versions.node
		],
		'darwin': [
			'node-gyp',
			'configure',
			'--arch=' + process.arch,
			'--target=' + process.versions.node
		],
		'linux': [
			'node-gyp',
			'configure',
			'--arch=' + process.arch,
			'--target=' + process.versions.node,
		]
	}[buildOS].join(' ');

	var buildProject = [
		'node-gyp',
		'build'
	].join(' ');

	buildScript.cmds = [
		cleanProject,
		configureProject,
		buildProject,
	];

	buildScript.isFinished = false;
	buildScript.isSuccessful = false;
});

console.log('buildScripts', buildScripts);


var executeBuildStep = function(buildStep) {
	console.log('Executing CMD', buildStep);
	var execOutput = child_process.execSync(buildStep);
};

buildScripts.forEach(function(buildScript) {
	// Change Directories
	process.chdir(buildScript.libPath);

	console.log('Current Dir', process.cwd());
	try {
		console.log('Starting Step:', buildScript.text);
		buildScript.cmds.forEach(executeBuildStep);
	} catch(err) {
		console.log('Error Executing', buildScript.text);
	}

	// Restoring to starting directory
	process.chdir(cwd);
});

