

console.log('Building Kipling');

var errorCatcher = require('./error_catcher');
var fs = require('fs');
var fse = require('fs-extra');
var path = require('path');
var cwd = process.cwd();
var child_process = require('child_process');


var BUILD_SCRIPTS_DIR = 'build_scripts';

var commands = {};
var buildScripts = [
	{'script': 'prepare_build', 'text': 'Preparing Build'},
	{'script': 'organize_project_files', 'text': 'Organizing Project Files'},
	{'script': 'brand_project', 'text': 'Branding Project Files'},
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

