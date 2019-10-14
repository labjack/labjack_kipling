

console.log('Building Kipling');

var errorCatcher = require('./error_catcher');
var fs = require('fs');
var fse = require('fs-extra');
var path = require('path');
var cwd = process.cwd();
var async = require('async');
var child_process = require('child_process');

// Figure out what OS we are building for
var buildOS = {
	'darwin': 'darwin',
	'win32': 'win32'
}[process.platform];
if(typeof(buildOS) === 'undefined') {
	buildOS = 'linux';
}


var BUILD_SCRIPTS_DIR = 'build_scripts';

var commands = {};
var buildScripts = [
	{'script': 'prepare_build', 'text': 'Preparing Build'},
	{'script': 'gather_project_files', 'text': 'Gathering Project Files'},
	{'script': 'edit_k3_startup_settings', 'text': 'Edit K3 Startup Settings'},
	{'script': 'install_production_dependencies', 'text': 'Installing production dependencies'},
	{'script': 'rebuild_native_modules', 'text': 'Rebuilding Native Modules (ffi & ref)'},
	{'script': 'clean_project', 'text': 'Cleaning Project'},
]

var conditionalMacBuildSteps = [
	{'script': 'sign_mac_build_before_compression', 'text': 'Signing Mac OS Build.'},
];

if(buildOS === 'darwin') {
	buildScripts = buildScripts.concat(conditionalMacBuildSteps);
}

var buildScriptsSecondary = [
	{'script': 'organize_project_files', 'text': 'Organizing Project Files & compress into packages.'},
	{'script': 'brand_project', 'text': 'Branding Project Files'},
	{'script': 'compress_output', 'text': 'Compressing Output and renaming'},
];
buildScripts = buildScripts.concat(buildScriptsSecondary);

var conditionalMacBuildStepsActerCompression = [
	{'script': 'sign_mac_build_after_compression', 'text': 'Signing Mac OS Build.'},
];

if(buildOS === 'darwin') {
	buildScripts = buildScripts.concat(conditionalMacBuildStepsActerCompression);
}

var finalBuildSteps = [
	{'script': 'compress_output', 'text': 'Compressing Output and renaming'},
];
buildScripts = buildScripts.concat(finalBuildSteps);



buildScripts.forEach(function(buildScript) {
	buildScript.scriptPath = path.normalize(path.join(
		BUILD_SCRIPTS_DIR, buildScript.script + '.js'
	));
	buildScript.cmd = 'node ' + buildScript.scriptPath;
	buildScript.isFinished = false;
	buildScript.isSuccessful = false;
});


// Synchronous version of executing scripts
// buildScripts.forEach(function(buildScript) {
// 	try {
// 		console.log('Starting Step:', buildScript.text);
// 		var execOutput = child_process.execSync(buildScript.cmd);
// 		console.log('execOutput: ' , execOutput.toString());
// 	} catch(err) {
// 		console.log('Error Executing', buildScript.script, buildScript.text);
// 		process.exit(1);
// 	}
// });

// Asynchronous version of executing scripts
async.eachSeries(
	buildScripts,
	function(buildScript, cb) {
		console.log('Starting Step:', buildScript.text);
		child_process.exec(buildScript.cmd, function(error, stdout, stderr) {
			if (error) {
				console.error('Error Executing', error);
				console.error(buildScript.script, buildScript.text);
				cb(error);
			}
			console.log('stdout: ',stdout);
			console.log('stderr: ',stderr);
			cb();
		})
	},
	function(err) {
		if(err) {
			console.log('Error Executing Build Scripts...', err);
			process.exit(1);
		}
	});

