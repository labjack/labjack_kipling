
var errorCatcher = require('./error_catcher');
var fs = require('fs');
var q = require('q');
var path = require('path');
var fse = require('fs-extra');
var async = require('async');
var child_process = require('child_process');
var handlebars = require('handlebars');

var startingDir = process.cwd();

var TEMP_PROJECT_FILES_DIRECTORY = 'temp_project_files';
var TEMP_PROJECT_FILES_PATH = path.join(startingDir, TEMP_PROJECT_FILES_DIRECTORY);

var K3_VERSION_FILE_PATH = path.join(startingDir, TEMP_PROJECT_FILES_DIRECTORY, 'ljswitchboard-kipling','package.json');
var k3Data;
var k3VersionStr = '';
try {
	k3Data = require(K3_VERSION_FILE_PATH);
	k3VersionStr = k3Data.version;
	console.log('Branding project files for K3 Version:', k3VersionStr);
} catch(err) {
	console.error('Error getting K3 info', err);
}

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

function getUpdateK3Version(bundle) {
	function updateK3Version() {
		var defered = q.defer();
		var fromName = bundle.from;
		var toName = bundle.to;
		var to = path.normalize(path.join(
			OUTPUT_PROJECT_FILES_PATH,
			toName,
			path.basename(path.normalize(fromName))
		));
		debugLog('Editing file', to);

		function editFileContents(data) {
			var template = handlebars.compile(data.toString());
			var compiledData = template({k3Version:k3VersionStr});
			// console.log('We have opened a file!', data);
			// console.log('it is now',compiledData);
			return compiledData;
		}
		function editAndSaveFile(data) {
			var newData = editFileContents(data);
			fse.outputFile(to, newData, function(err) {
				if(err) {
					fse.outputFile(to, newData, function(err) {
						if(err) {
							defered.reject();
						} else {
							defered.resolve();
						}
					});
				} else {
					defered.resolve();
				}
			});
		}
		fse.readFile(to, function(err, data) {
			if(err) {
				fse.readFile(to, function(err, data) {
					if(err) {
						defered.reject(err);
					} else {
						editAndSaveFile(data);
					}
				});
			} else {
				editAndSaveFile(data);
			}
		});
		return defered.promise;
	}
	return updateK3Version;
}
function copyAndUpdateK3Version(bundle) {
	var defered = q.defer();
	copyBrandingFiles(bundle)
	.then(getUpdateK3Version(bundle), function(err) {
		defered.reject(err);
	})
	.then(function(res) {
		defered.resolve();
	}, function(err) {
		defered.reject(err);
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
			var fsOutput = fs.statSync(to);
			var isFile = fsOutput.isFile();
			var isDir = fsOutput.isDirectory();
			var exists = isFile || isDir;
			if(!exists) {
				console.error('Error renaming file', err);
				defered.reject(err);
			} else {
				console.log('File already exists', to);
				defered.resolve();
			}
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
	'copyAndUpdateK3Version': copyAndUpdateK3Version,
	'rename': renameFileBrandingOp,
	'resHacker': winExecuteResourceHacker,
};


var darwinEHHelperName = 'Info-nwjs-helper-EH.plist';
var darwinNPHelperName = 'Info-nwjs-helper-NP.plist';
var darwinBaseHelperName = 'Info-nwjs-helper.plist';
var darwinEHHelperBasePath = 'nwjs.app/Contents/Frameworks/nwjs Helper EH.app/Contents';
var darwinNPHelperBasePath = 'nwjs.app/Contents/Frameworks/nwjs Helper NP.app/Contents';
var darwinBaseHelperBasePath = 'nwjs.app/Contents/Frameworks/nwjs Helper.app/Contents';
var darwinEHHelperPath = path.join(darwinEHHelperBasePath, darwinEHHelperName);
var darwinNPHelperPath = path.join(darwinNPHelperBasePath, darwinNPHelperName);
var darwinBaseHelperPath = path.join(darwinBaseHelperBasePath, darwinBaseHelperName);
var darwinEHHelperRenameToPath = path.join(darwinEHHelperBasePath, 'Info.plist');
var darwinNPHelperRenameToPath = path.join(darwinNPHelperBasePath, 'Info.plist');
var darwinBaseHelperRenameToPath = path.join(darwinBaseHelperBasePath, 'Info.plist');


var darwinBrandingOps = [
{
	'operation': 'copy',
	'from': 'Kipling3.icns',
	'to': 'nwjs.app/Contents/Resources',
},
{
	'operation': 'copyAndUpdateK3Version',
	'from': 'Info.plist',
	'to': 'nwjs.app/Contents',
},
{
	'operation': 'copy',
	'from': darwinEHHelperName,
	'to': darwinEHHelperBasePath,
},
{
	'operation': 'copy',
	'from': darwinNPHelperName,
	'to': darwinNPHelperBasePath,
},
{
	'operation': 'copy',
	'from': darwinBaseHelperName,
	'to': darwinBaseHelperBasePath,
},
{
	'operation': 'rename',
	'from': darwinEHHelperPath,
	'to': darwinEHHelperRenameToPath,
},
{
	'operation': 'rename',
	'from': darwinNPHelperPath,
	'to': darwinNPHelperRenameToPath,
},
{
	'operation': 'rename',
	'from': darwinBaseHelperPath,
	'to': darwinBaseHelperRenameToPath,
},
{
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

