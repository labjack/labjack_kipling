require('./utils/error_catcher');

var path = require('path');
var async = require('async');
var child_process = require('child_process');
const {getBuildDirectory} = require('./utils/get_build_dir');

// Figure out what OS we are building for
var buildOS = {
	'darwin': 'darwin',
	'win32': 'win32'
}[process.platform];
if(typeof(buildOS) === 'undefined') {
	buildOS = 'linux';
}

var curVersion = process.versions.node.split('.').join('_');

// All known node binary .exe files
// Each file needs to be signed individually for Mac OS Notarizing Service to Pass
// List Updated for Kipling 3.3.2 - October 2022
const listOfNodeBinaries = [
	"labjack_kipling/ljswitchboard-builder/temp_project_files/ljswitchboard-kipling_tester/node_modules/fsevents/fsevents.node",
	"labjack_kipling/ljswitchboard-builder/temp_project_files/ljswitchboard-io_manager/node_modules/ffi-napi/node_modules/ref-napi/prebuilds/darwin-x64/electron.napi.node",
	"labjack_kipling/ljswitchboard-builder/temp_project_files/ljswitchboard-io_manager/node_modules/ffi-napi/node_modules/ref-napi/prebuilds/darwin-x64/node.napi.node",
	"labjack_kipling/ljswitchboard-builder/temp_project_files/ljswitchboard-io_manager/node_modules/ffi-napi/prebuilds/darwin-x64/node.napi.uv1.node",
	"labjack_kipling/ljswitchboard-builder/temp_project_files/ljswitchboard-io_manager/node_modules/ref-napi/prebuilds/darwin-x64/electron.napi.node",
	"labjack_kipling/ljswitchboard-builder/temp_project_files/ljswitchboard-io_manager/node_modules/ref-napi/prebuilds/darwin-x64/node.napi.node",
	"labjack_kipling/ljswitchboard-builder/temp_project_files/ljswitchboard-io_manager/node_modules/fsevents/fsevents.node"
	]

// node binary used by io_manager
var pathToBinaryPartials = [
	getBuildDirectory(),
	'temp_project_files',
	'ljswitchboard-io_manager',
	'node_binaries',
	buildOS,
	process.arch,
	curVersion,
	'node'
].join(path.sep);

// kipling_tester fsevents
var testFseventsNode = [
	getBuildDirectory(),
	'temp_project_files',
	'ljswitchboard-kipling_tester',
	'node_modules',
	'fsevents',
	'fsevents.node'
].join(path.sep)

//io_manager fsevents
var fseventsNode = [
	getBuildDirectory(),
	'temp_project_files',
	'ljswitchboard-io_manager',
	'node_modules',
	'fsevents', 'fsevents.node'
].join(path.sep)

// ffi node api for electron
var electronNodeApi_ffi = [
	getBuildDirectory(),
	'temp_project_files',
	'ljswitchboard-io_manager',
	'node_modules',
	'ffi-napi','node_modules','ref-napi','prebuilds', 'darwin-x64', 'electron.napi.node'
].join(path.sep);

/// ref node api for electron
var electronNodeApi_ref = [
	getBuildDirectory(),
	'temp_project_files',
	'ljswitchboard-io_manager',
	'node_modules',
	'ref-napi','prebuilds', 'darwin-x64', 'electron.napi.node'
].join(path.sep);

// ffi node api
var nodeApi_ffi = [
	getBuildDirectory(),
	'temp_project_files',
	'ljswitchboard-io_manager',
	'node_modules',
	'ffi-napi','node_modules','ref-napi','prebuilds', 'darwin-x64', 'node.napi.node'
].join(path.sep);

// ref node api
var nodeApi_ref = [
	getBuildDirectory(),
	'temp_project_files',
	'ljswitchboard-io_manager',
	'node_modules',
	'ref-napi','prebuilds', 'darwin-x64', 'node.napi.node'
].join(path.sep);

// uv1 node api
var nodeApi_uv1 = [
	getBuildDirectory(),
	'temp_project_files',
	'ljswitchboard-io_manager',
	'node_modules',
	'ffi-napi','prebuilds', 'darwin-x64', 'node.napi.uv1.node'
].join(path.sep);

var pathToRefBindingNode = [
	__dirname,
	'..',
	'temp_project_files',
	'ljswitchboard-io_manager',
	'node_modules',
	'ref-napi','build','Release','binding.node'
].join(path.sep);

var pathToFFIBindingNode = [
	__dirname,
	'..',
	'temp_project_files',
	'ljswitchboard-io_manager',
	'node_modules',
	'ffi-napi','build','Release','ffi_bindings.node'
].join(path.sep);

var pathToFFIRefBindingNode = [
	__dirname,
	'..',
	'temp_project_files',
	'ljswitchboard-io_manager',
	'node_modules',
	'ffi-napi','node_modules',
	'ref-napi', 'build','Release','binding.node'
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

var nodePath                  = path.resolve(path.join(pathToBinaryPartials));
var pathToTestFsevents        = path.resolve(path.join(testFseventsNode));
var pathToFsevents            = path.resolve(path.join(fseventsNode));
var pathToElectronNodeApi_ffi = path.resolve(path.join(electronNodeApi_ffi));
var pathToElectronNodeApi_ref = path.resolve(path.join(electronNodeApi_ref));
var pathToNodeApi_ffi         = path.resolve(path.join(nodeApi_ffi));
var pathToNodeApi_ref         = path.resolve(path.join(nodeApi_ref));
var pathToNodeApi_uv1         = path.resolve(path.join(nodeApi_uv1));

var pathToParentPList = path.resolve(path.join(pathToParentPListPartials))
var pathToChildPList = path.resolve(path.join(pathToChildPListPartials))

var refBindingPath = path.resolve(path.join(pathToRefBindingNode));
var ffiBindingPath = path.resolve(path.join(pathToFFIBindingNode));
var refFFIBindingPath = path.resolve(path.join(pathToFFIRefBindingNode));


// Not really sure what this does, but not getting rid of it
// Was part of old Kipling framework
if(typeof(process.argv) !== 'undefined') {
	var cliArgs = process.argv;
	if(process.argv.length == 4) {
		// Get rid of the first two arguments
		cliArgs = cliArgs.slice(2, cliArgs.length);

		nodePath = cliArgs[1].split('"').join();
	}
}

var buildScripts = [
	// {
	// 'script': ['codesign --sign "LabJack Corporation" --force --timestamp --options runtime',
	// '--deep --entitlements "'+pathToParentPList+'"',
	// '"' + nodePath + '"'].join(' '),
	// 'text': 'Signing Node.exe',
	// },
	{
	'script': ['codesign --sign "LabJack Corporation" --force --timestamp --options runtime',
	'--deep --entitlements "'+pathToParentPList+'"',
	'"' + pathToTestFsevents + '"'].join(' '),
	'text': 'Signing kipling_tester: fsevents.node',
	},{
	'script': ['codesign --sign "LabJack Corporation" --force --timestamp --options runtime',
	'--deep --entitlements "'+pathToParentPList+'"',
	'"' + pathToFsevents + '"'].join(' '),
	'text': 'Signing io_manager: fsevents.node',
	},{
	'script': ['codesign --sign "LabJack Corporation" --force --timestamp --options runtime',
	'--deep --entitlements "'+pathToParentPList+'"',
	'"' + pathToElectronNodeApi_ffi + '"'].join(' '),
	'text': 'Signing Electron ffi: electron.napi.node',
	},{
	'script': ['codesign --sign "LabJack Corporation" --force --timestamp --options runtime',
	'--deep --entitlements "'+pathToParentPList+'"',
	'"' + pathToElectronNodeApi_ref + '"'].join(' '),
	'text': 'Signing Electron ref: electron.napi.node',
	},{
	'script': ['codesign --sign "LabJack Corporation" --force --timestamp --options runtime',
	'--deep --entitlements "'+pathToParentPList+'"',
	'"' + pathToNodeApi_ffi + '"'].join(' '),
	'text': 'Signing Node ffi: node.napi.node',
	},{
	'script': ['codesign --sign "LabJack Corporation" --force --timestamp --options runtime',
	'--deep --entitlements "'+pathToParentPList+'"',
	'"' + pathToNodeApi_ref + '"'].join(' '),
	'text': 'Signing Node ref: node.napi.node',
	},{
	'script': ['codesign --sign "LabJack Corporation" --force --timestamp --options runtime',
	'--deep --entitlements "'+pathToParentPList+'"',
	'"' + pathToNodeApi_uv1 + '"'].join(' '),
	'text': 'Signing Node uv1: node.napi.uv1.node',
	},
	{
	'script': ['codesign --sign "LabJack Corporation" --force --timestamp --options runtime',
		'--deep --entitlements "'+pathToParentPList+'"',
		'"' + refBindingPath + '"'].join(' '),
	'text': 'Signing ref: binding.node',
	}, 
	{
	'script': ['codesign --sign "LabJack Corporation" --force --timestamp --options runtime',
		'--deep --entitlements "'+pathToParentPList+'"',
		'"' + ffiBindingPath + '"'].join(' '),
	'text': 'Signing ffi: ffi_binding.node',
	},
	{
	'script': ['codesign --sign "LabJack Corporation" --force --timestamp --options runtime',
		'--deep --entitlements "'+pathToParentPList+'"',
		'"' + refFFIBindingPath + '"'].join(' '),
	'text': 'Signing ref+ffi: binding.node',
	}
	]


// var buildScripts = [{
// 	'script': ['codesign --sign "LabJack Corporation" --force --timestamp --options runtime',
// 		'--deep --entitlements "'+pathToParentPList+'"',
// 		'"' + nodePath + '"'].join(' '),
// 	'text': 'Signing Node.exe',
// }, 
// // {
// 	// 'script': ['codesign --sign "LabJack Corporation" --force --timestamp --options runtime',
// 	// 	'--deep --entitlements "'+pathToParentPList+'"',
// 	// 	'"' + refBindingPath + '"'].join(' '),
// 	// 'text': 'Signing ref: binding.node',
// // }, 
// {
// 	'script': ['codesign --sign "LabJack Corporation" --force --timestamp --options runtime',
// 		'--deep --entitlements "'+pathToParentPList+'"',
// 		'"' + ffiBindingPath + '"'].join(' '),
// 	'text': 'Signing ffi: ffi_binding.node',
// }];

buildScripts.forEach(function(buildScript) {
	buildScript.cmd = buildScript.script;
	buildScript.isFinished = false;
	buildScript.isSuccessful = false;
});

async.eachSeries(
	buildScripts,
	function(buildScript, cb) {
		console.log('Starting Step:', buildScript.text, "\n Script:", buildScript.script);
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
