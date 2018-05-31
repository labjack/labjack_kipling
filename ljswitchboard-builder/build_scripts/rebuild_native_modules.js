

console.log('Building Kipling');

var errorCatcher = require('./error_catcher');
var fs = require('fs');
var fse = require('fs-extra');
var path = require('path');
var cwd = process.cwd();
var child_process = require('child_process');
var async = require('async');


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
		// cleanProject,
		configureProject,
		buildProject,
	];

	buildScript.isFinished = false;
	buildScript.isSuccessful = false;
});

console.log('buildScripts', buildScripts);


// var executeBuildStepAsync = function(buildStep, cb) {
// 	console.log('Executing CMD', buildStep);
// 	// var execOutput = child_process.execSync(buildStep);
// 	child_process.exec(
// 		buildStep,
// 		function(error, stdout, stderr) {
// 			console.log('stdout: ' + stdout);
// 			console.log('stderr: ' + stderr);
// 			if (error !== null) {
// 				console.log('exec error: ' + error);
// 			}
// 			cb();
// 		});
// };

// async.eachSeries(
// 	buildScripts,
// 	function(buildScript, cb) {
// 		// Change Directories
// 		process.chdir(buildScript.libPath);

// 		console.log('Current Dir', process.cwd());
// 		try {
// 			console.log('Starting Step:', buildScript.text);
// 			// buildScript.cmds.forEach(executeBuildStep);
// 			async.eachSeries(buildScript.cmds, executeBuildStep, function(err) {
// 				// Restoring to starting directory
// 				process.chdir(cwd);
// 				cb();
// 			});
// 		} catch(err) {
// 			console.log('Error Executing', buildScript.text);
// 			// Restoring to starting directory
// 			process.chdir(cwd);
// 			cb();
// 		}
// 	}, function(err) {

// 	});

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

