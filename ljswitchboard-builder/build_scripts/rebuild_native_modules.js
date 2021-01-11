'use strict';

console.log('Building Kipling');

require('./utils/error_catcher');
const path = require('path');
const cwd = process.cwd();
const child_process = require('child_process');
const {getBuildDirectory} = require('./utils/get_build_dir');

const NATIVE_MODULES_BASE_LOCATION = path.join(
	getBuildDirectory(),
	'temp_project_files',
	'ljswitchboard-io_manager',
	'node_modules'
);

const buildScripts = [
	{'lib': 'ffi-napi', 'text': 'Building ffi-napi'},
	{'lib': 'ref-napi', 'text': 'Building ref-napi'},
];

const buildOS = {
	'darwin': 'darwin',
	'win32': 'win32'
}[process.platform] || 'linux';

buildScripts.forEach(function(buildScript) {
	buildScript.libPath = path.join( NATIVE_MODULES_BASE_LOCATION, buildScript.lib );

	// Project configurations
	const configureProject = {
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

	const buildProject = [
		'node-gyp',
		'build'
	].join(' ');

	buildScript.cmds = [
		configureProject,
		buildProject,
	];

	buildScript.isFinished = false;
	buildScript.isSuccessful = false;
});

console.log('buildScripts', buildScripts);


// const executeBuildStepAsync = function(buildStep, cb) {
// 	console.log('Executing CMD', buildStep);
// 	// const execOutput = child_process.execSync(buildStep);
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

const executeBuildStep = function(buildStep) {
	console.log('Executing CMD', buildStep);
	child_process.execSync(buildStep);
};
buildScripts.forEach(function(buildScript) {
	// Change Directories

	try {
		process.chdir(buildScript.libPath);
	} catch (e) {
		const parts = buildScript.libPath.split(path.sep);

		for (let steps = 0; steps < 3; steps++) {
			const dir = parts.slice(0, parts.length - steps).join(path.sep);
			console.log('ls -l ' + dir);
			try {
				console.log(child_process.execSync('ls -l ' + dir));
			} catch(err) {
				console.log('Error Executing ls  -l ' + dir, err);
			}
		}

		throw e;
	}

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

