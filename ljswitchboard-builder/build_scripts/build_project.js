

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

var BUILD_SCRIPTS_DIR = 'build_scripts';

var commands = {};
var buildScripts = [
	{'script': 'prepare_build', 'text': 'Preparing Build'},
	{'script': 'gather_project_files', 'text': 'Gathering Project Files'},
	{'script': 'edit_k3_startup_settings', 'text': 'Edit K3 Startup Settings'},
	{'script': 'install_production_dependencies', 'text': 'Installing production dependencies'},
	{'script': 'rebuild_native_modules', 'text': 'Rebuilding Native Modules (ffi & ref)'},
	{'script': 'clean_project', 'text': 'Cleaning Project'},
	{'script': 'organize_project_files', 'text': 'Organizing Project Files & compress into packages.'},
	{'script': 'brand_project', 'text': 'Branding Project Files'},
	{'script': 'compress_output', 'text': 'Compressing Output and renaming'},
];
buildScripts.forEach(function(buildScript) {
	buildScript.scriptPath = path.normalize(path.join(
		BUILD_SCRIPTS_DIR, buildScript.script + '.js'
	));
	buildScript.cmd = 'node ' + buildScript.scriptPath;
	buildScript.isFinished = false;
	buildScript.isSuccessful = false;
});

buildScripts.forEach(function(buildScript) {
	try {
		console.log('Starting Step:', buildScript.text);
		var execOutput = child_process.execSync(buildScript.cmd);
	} catch(err) {
		console.log('Error Executing', buildScript.script, buildScript.text);
	}
});

