
console.log('sign_mac_build_before_compression');

var errorCatcher = require('./error_catcher');
var fs = require('fs');
var fse = require('fs-extra');
var fsex = require('fs.extra');
var path = require('path');
var q = require('q');
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

var curVersion = process.versions.node.split('.').join('_');

var pathToBinaryPartials = [
	__dirname,
	'..',
	'temp_project_files',
	'ljswitchboard-io_manager',
	'node_binaries',
	buildOS,
	process.arch,
	curVersion,
	'node'
].join(path.sep);

var pathToRefBindingNode = [
	__dirname,
	'..',
	'temp_project_files',
	'ljswitchboard-io_manager',
	'node_modules',
	'ref','build','Release','binding.node'
].join(path.sep);

var pathToFFIBindingNode = [
	__dirname,
	'..',
	'temp_project_files',
	'ljswitchboard-io_manager',
	'node_modules',
	'ffi','build','Release','ffi_bindings.node'
].join(path.sep);

var pathToParentPListPartials = [
	__dirname,
	'..',
	'branding_files',
	'kipling_parent.plist'
].join(path.sep)

var pathToChildPListPartials = [
	__dirname,
	'..',
	'branding_files',
	'kipling_child.plist'
].join(path.sep);

var nodePath = path.resolve(path.join(pathToBinaryPartials));
var refBindingPath = path.resolve(path.join(pathToRefBindingNode));
var ffiBindingPath = path.resolve(path.join(pathToFFIBindingNode));
var pathToParentPList = path.resolve(path.join(pathToParentPListPartials))
var pathToChildPList = path.resolve(path.join(pathToChildPListPartials))



if(typeof(process.argv) !== 'undefined') {
	var cliArgs = process.argv;
	if(process.argv.length == 4) {
		// Get rid of the first two arguments
		cliArgs = cliArgs.slice(2, cliArgs.length);

		nodePath = cliArgs[1].split('"').join();
	}
}


console.log('nodePath', nodePath);
var buildScripts = [{
	'script': ['codesign --sign "LabJack Corporation" --force --timestamp --options runtime', 
		'--deep --entitlements "'+pathToParentPList+'"',
		'"' + nodePath + '"'].join(' '),
	'text': 'Signing Node.exe',
}, {
	'script': ['codesign --sign "LabJack Corporation" --force --timestamp --options runtime', 
		'--deep --entitlements "'+pathToParentPList+'"',
		'"' + refBindingPath + '"'].join(' '),
	'text': 'Signing ref: binding.node',
}, {
	'script': ['codesign --sign "LabJack Corporation" --force --timestamp --options runtime', 
		'--deep --entitlements "'+pathToParentPList+'"',
		'"' + ffiBindingPath + '"'].join(' '),
	'text': 'Signing ffi: ffi_binding.node',
}];



buildScripts.forEach(function(buildScript) {
	buildScript.cmd = buildScript.script;
	buildScript.isFinished = false;
	buildScript.isSuccessful = false;
});

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
// buildScripts.forEach(function(buildScript) {
// 	try {
// 		console.log('Starting Step:', buildScript.text);
// 		var execOutput = child_process.execSync(buildScript.cmd);
// 		console.log('execOutput: ' , execOutput.toString());
// 	} catch(err) {
		
// 		process.exit(1);
// 	}
// });