// run_built_k3.js

// Requirements
var fs = require('fs');
var async = require('async');
var q = require('q');
var path = require('path');
var child_process = require('child_process');


// Figure out what OS we are building for
var buildOS = {
	'darwin': 'darwin',
	'win32': 'win32'
}[process.platform];
if(typeof(buildOS) === 'undefined') {
	buildOS = 'linux';
}

var cwd = process.cwd();
var BUILDER_PATH = path.join(cwd, '@labjack', 'ljswitchboard-builder');
// var currentFiles = fs.readdirSync(BUILDER_PATH);


// var currentFolders = currentFiles.filter(function(fileName) {
// 	// Determine if the found fileName is a directory
// 	var isDir = fs.statSync(path.join('.',fileName)).isDirectory();

// 	// Determine if the found fileName should be ignored
// 	var isIgnored = ignoredFolders.indexOf(fileName) >= 0;

// 	// If the fileName is a directory and shouldn't be ignored then return true.
// 	// (indicating that the fileName passes the filter)
// 	return isDir && !isIgnored;
// });
// console.log('hh', currentFiles);

// var startingDir = process.cwd();
var TEMP_PROJECT_FILES_DIRECTORY = 'temp_project_files';
var TEMP_PROJECT_FILES_PATH = path.join(BUILDER_PATH, TEMP_PROJECT_FILES_DIRECTORY);
var kiplingPackagePath = path.join(TEMP_PROJECT_FILES_PATH,'ljswitchboard-kipling','package.json');
var kiplingPackageInfo = require(kiplingPackagePath);
var k3Version = kiplingPackageInfo.version;

console.log('Running info for k3', k3Version);

// Building file output string kipling.3.1.10.2017_10_17_mac64
var k3StrPartial = ['kipling', k3Version].join('.') + '.'; // kipling.3.1.10.

var date = new Date();
var year = date.getFullYear();
var yearStr = year.toString();
var month = date.getMonth() + 1;
var monthStr = month.toString();
if(monthStr.length < 2) {
	monthStr = '0' + monthStr;
}
var day = date.getDate();
var dayStr = day.toString();
if(dayStr.length < 2) {
	dayStr = '0' + dayStr;
}
var dateStrPartial = [yearStr,monthStr,dayStr].join('_') + '_';

var osForOutputFileName = {
	'darwin': 'mac',
	'win32': 'win',
	'linux': 'linux',
}[buildOS];

var archForOutputFileName = {
	'x64': '64',
	'ia32': '32',
}[process.arch];
var osStrPartial = osForOutputFileName + archForOutputFileName;
var outputFileName = k3StrPartial + dateStrPartial + osStrPartial;
console.log('running app', outputFileName);

var k3Path = {
	'darwin': path.join(cwd, 'ljswitchboard-builder',outputFileName,'Kipling.app'),
	'win32': path.join(cwd, 'ljswitchboard-builder',outputFileName,'Kipling.exe'),
	'linux': path.join(cwd, 'ljswitchboard-builder',outputFileName,'Kipling'),
}[buildOS];

var osExecFunc = {
	'darwin': function(cmd) {
		return child_process.exec(
			'open ' + cmd,
			{
				cwd:process.cwd(),
			});
	},
	'win32': function(cmd) {
		return child_process.execFile(
			cmd,
			[],
			{
				cwd:process.cwd(),
			});
	},
	'linux': function(cmd) {
		return child_process.execFile(
			cmd,
			[],
			{
				cwd:process.cwd(),
			});
	}
}[buildOS];

function runFile(filePath) {
	var defered = q.defer();

	receivedDisconnectMessage = false;
    receivedExitMessage = false;

    function finishFunc() {
    	defered.resolve();
    }
	function errorListener(data) {
		console.log('in errorListener',data);
		finishFunc();
	}
	function exitListener(data) {
		receivedExitMessage = true;
		console.log('in exitListener',data);
		finishFunc();
	}
	function closeListener(data) {
		receivedExitMessage = true;
		console.log('in closeListener',data);
		finishFunc();
	}
	function disconnectListener(data) {
		console.log('in disconnectListener',data);
		finishFunc();
	}
	function messageListener(data) {
		// console.log('in messageListener',data);
	}
	function stdinListener(data) {
		// printStatusInfo(cmd);
		// console.log('Data from running cmd:', findNPMCmd(cmd));
		console.log(data.toString());
	}
	function stderrListener(data) {
		// console.log('Data from running cmd:', findNPMCmd(cmd));
		// printStatusInfo(cmd);
		console.log(data.toString());
	}

	// var subProcess = child_process.execFile(
	// 	filePath,
	// 	[],
	// 	{
	// 		cwd:process.cwd(),
	// 	});
	var subprocess;
	if(typeof(osExecFunc) === 'function') {
		subProcess = osExecFunc(filePath);

		subProcess.on('error', errorListener);
		subProcess.on('exit', exitListener);
		subProcess.on('close', closeListener);
		subProcess.on('disconnect', disconnectListener);
		subProcess.on('message', messageListener);
		subProcess.stdout.on('data', stdinListener);
		subProcess.stderr.on('data', stderrListener);
	} else {
		console.log('osExecFunc should be type function.', typeof(osExecFunc));
		finishFunc();
	}

	return defered.promise;
}

console.log('executing file:', k3Path);
runFile(k3Path);
// ljswitchboard-builder/build_scripts/build_project.js