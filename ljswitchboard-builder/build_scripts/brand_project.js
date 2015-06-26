
var errorCatcher = require('./error_catcher');
var fs = require('fs');
var q = require('q');
var path = require('path');
var fse = require('fs-extra');
var async = require('async');
var child_process = require('child_process');

var startingDir = process.cwd();

var TEMP_PROJECT_FILES_DIRECTORY = 'temp_project_files';
var TEMP_PROJECT_FILES_PATH = path.join(startingDir, TEMP_PROJECT_FILES_DIRECTORY);

var OUTPUT_PROJECT_FILES_DIRECTORY = 'output';
var OUTPUT_PROJECT_FILES_PATH = path.normalize(path.join(startingDir, OUTPUT_PROJECT_FILES_DIRECTORY));

var BUILD_TOOLS_DIRECTORY = 'build_tools';
var BUILD_TOOLS_PATH = path.normalize(path.join(startingDir, BUILD_TOOLS_DIRECTORY));

var RESOURCE_HACKER_DIRECTORY = 'resource_hacker';
var RESOURCE_HACKER_EXECUTABLE_NAME = 'ResourceHacker.exe';
var RESOURCE_HACKER_PATH = path.normalize(path.join(
	BUILD_TOOLS_PATH,
	RESOURCE_HACKER_DIRECTORY,
	RESOURCE_HACKER_EXECUTABLE_NAME
));

var desiredProjectName = 'Kipling';

var BRANDING_FILES_DIR = 'branding_files';
var BRANDING_FILES_PATH = path.normalize(path.join(startingDir, BRANDING_FILES_DIR));

// Figure out what OS we are building for
var buildOS = {
	'darwin': 'darwin',
	'win32': 'win32'
}[process.platform];
if(typeof(buildOS) === 'undefined') {
	buildOS = 'linux';
}

var enableDebugging = false;
function debugLog() {
	if(enableDebugging) {
		console.log.apply(console, arguments);
	}
}

function copyBrandingFiles(bundle) {
	var fromName = bundle.from;
	var toName = bundle.to;

	var defered = q.defer();
	var from = path.normalize(path.join(
		BRANDING_FILES_PATH,
		fromName
	));

	var to = path.normalize(path.join(
		OUTPUT_PROJECT_FILES_PATH,
		toName,
		path.basename(path.normalize(fromName))
	));

	debugLog('Copying File from', from);
	debugLog('Copying File to', to);
	// If the file already exists, remove it.
	
	// Copy the desired file
	
	fse.remove(to, function fileRemoved(err) {
		if(err) {
			console.log('Error removing', err);
		}
		fse.copy(from, to, function fileCoppied(err) {
			if(err) {
				console.error('Error coppying file', err);
				defered.reject(err);
			} else {
				defered.resolve();
			}
		});
	});
	return defered.promise;
}

function renameFileBrandingOp(bundle) {
	var defered = q.defer();
	var fromName = bundle.from;
	var toName = bundle.to;

	var from = path.normalize(path.join(
		OUTPUT_PROJECT_FILES_PATH,
		fromName
	));

	var to = path.normalize(path.join(
		OUTPUT_PROJECT_FILES_PATH,
		toName
	));

	fs.rename(from, to, function fileRenamed(err) {
		if(err) {
			console.error('Error renaming file', err);
			defered.reject(err);
		} else {
			defered.resolve();
		}
	});
	defered.resolve();
	return defered.promise;
}


function winExecuteResourceHacker(bundle) {
	var defered = q.defer();
	console.log('Executing resourceHacker');

	var buildScript = {
		'text': 'ResourceHacker.exe',
		'cmd': 'ls'
	};

	var from = path.normalize(path.join(
		OUTPUT_PROJECT_FILES_PATH,
		bundle.from
	));
	var to = path.normalize(path.join(
		OUTPUT_PROJECT_FILES_PATH,
		bundle.to
	));

	var icoFileName = bundle.icoFile;
	var icoFile = path.normalize(path.join(
		BRANDING_FILES_PATH,
		icoFileName
	));

	var execArgs = [
		RESOURCE_HACKER_PATH,
		'-addoverwrite',
		'"' + from + '",',
		'"' + to + '",',
		'"' + icoFile + '",',
		'ICONGROUP,',
		'IDR_MAINFRAME,',
		'0',
	];

	console.log('Execution Arguments: ');
	execArgs.forEach(function(execArg) {
		console.log(' - ', execArg);
	});

	buildScript.cmd = execArgs.join(' ');

	try {
		console.log('Starting Step:', buildScript.text);
		console.log('Cmd: ', buildScript.cmd);
		var execOutput = child_process.execSync(buildScript.cmd);
		defered.resolve();
	} catch(err) {
		console.log('Error Executing', buildScript.cmd, buildScript.text);
		console.log('Error: ', err);
		defered.reject('Failed to execute: ' + buildScript.script);
	}
	return defered.promise;
}

var brandingOperationsMap = {
	'copy': copyBrandingFiles,
	'rename': renameFileBrandingOp,
	'resHacker': winExecuteResourceHacker,
};


var darwinBrandingOps = [{
	'operation': 'copy',
	'from': 'Kipling3.icns',
	'to': 'nwjs.app/Contents/Resources',
}, {
	'operation': 'copy',
	'from': 'Info.plist',
	'to': 'nwjs.app/Contents',
}, {
	'operation': 'rename',
	'from': 'nwjs.app',
	'to': desiredProjectName + '.app',
}];

var win32BrandingOps = [
{
	'operation': 'resHacker',
	// 'exeName': desiredProjectName + '.exe',
	'from': 'nw.exe',
	'to': 'nw.exe',
	'icoFile': 'Kipling3.ico'
},
{
	'operation': 'rename',
	'from': 'nw.exe',
	'to': desiredProjectName + '.exe',
}];

var linuxBrandingOps = [{
	'operation': 'rename',
	'from': 'nw',
	'to': desiredProjectName,
}];

var brandingOperations = {
	'darwin': darwinBrandingOps,
	'win32': win32BrandingOps,
	'linux': linuxBrandingOps,
}[buildOS];


function executeBrandingOperations(brandingOps) {
	var defered = q.defer();

	if(brandingOps.length > 0) {
		async.eachSeries(
			brandingOps,
			function iterator(item, callback) {
				var func = brandingOperationsMap[item.operation];
				if(typeof(func) === 'function') {
					debugLog('Starting execution op', item.operation);
					func(item)
					.then(function brandingOpSucc() {
						debugLog('Finished executing op', item.operation);
						callback();
					}, function brandingOpErr(err) {
						console.error('Error Executing Branding Operation', err);
						callback(err);
					});
				} else {
					console.error('Operation Not defined', item.operation);
					callback('Operation Not defined: "' + item.operation.toString() + '"');
				}
			}, function done(err) {
				if(err) {
					defered.reject(err);
				} else {
					defered.resolve();
				}
			}
		);
	} else {
		console.error('No defined branding operations');
		defered.reject('No defined branding operations');
	}
	return defered.promise;
}
// start project branding procedure
executeBrandingOperations(brandingOperations)
.then(function() {
	debugLog('Finished Branding');
}, function(err) {
	console.error('Error Performing Branding Operations', err);
	process.exit(1);
});

