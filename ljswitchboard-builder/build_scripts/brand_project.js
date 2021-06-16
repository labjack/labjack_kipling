'use strict';

require('./utils/error_catcher');
const fs = require('fs');
const path = require('path');
const fse = require('fs-extra');
const async = require('async');
const child_process = require('child_process');
const handlebars = require('handlebars');
const {getBuildDirectory} = require('./utils/get_build_dir');

const startingDir = process.cwd();

const K3_VERSION_FILE_PATH = path.join(getBuildDirectory(), 'temp_project_files', 'ljswitchboard-kipling', 'package.json');
let k3Data;
let k3VersionStr = '';
try {
	k3Data = require(K3_VERSION_FILE_PATH);
	k3VersionStr = k3Data.version;
	console.log('Branding project files for K3 Version:', k3VersionStr);
} catch(err) {
	console.error('Error getting K3 info', err);
}

const OUTPUT_PROJECT_FILES_PATH = path.join(getBuildDirectory(), 'output');
const BUILD_TOOLS_PATH = path.normalize(path.join(__dirname, '..', 'build_tools'));

const RESOURCE_HACKER_DIRECTORY = 'resource_hacker';
const RESOURCE_HACKER_EXECUTABLE_NAME = 'ResourceHacker.exe';
const RESOURCE_HACKER_PATH = path.normalize(path.join(
	BUILD_TOOLS_PATH,
	RESOURCE_HACKER_DIRECTORY,
	RESOURCE_HACKER_EXECUTABLE_NAME
));

const desiredProjectName = 'Kipling';

const BRANDING_FILES_DIR = 'branding_files';
const BRANDING_FILES_PATH = path.normalize(path.join(startingDir, BRANDING_FILES_DIR));

// Figure out what OS we are building for
const buildOS = {
	'darwin': 'darwin',
	'win32': 'win32'
}[process.platform] || 'linux';

const enableDebugging = false;
function debugLog() {
	if(enableDebugging) {
		console.log.apply(console, arguments);
	}
}

function copyBrandingFiles(bundle) {
	const fromName = bundle.from;
	const toName = bundle.to;

	return new Promise((resolve, reject) => {
		const from = path.normalize(path.join(
			BRANDING_FILES_PATH,
			fromName
		));

		const to = path.normalize(path.join(
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
					console.error('Error copying file', err);
					reject(err);
				} else {
					resolve();
				}
			});
		});
	});
}

function getUpdateK3Version(bundle) {
	function updateK3Version() {
		return new Promise((resolve, reject) => {
			const fromName = bundle.from;
			const toName = bundle.to;
			const to = path.normalize(path.join(
				OUTPUT_PROJECT_FILES_PATH,
				toName,
				path.basename(path.normalize(fromName))
			));
			debugLog('Editing file', to);

			function editFileContents(data) {
				const template = handlebars.compile(data.toString());
				return template({ k3Version: k3VersionStr });
			}
			function editAndSaveFile(data) {
				const newData = editFileContents(data);
				fse.outputFile(to, newData, function(err) {
					if(err) {
						fse.outputFile(to, newData, function(err) {
							if(err) {
								reject();
							} else {
								resolve();
							}
						});
					} else {
						resolve();
					}
				});
			}
			fse.readFile(to, function(err, data) {
				if(err) {
					fse.readFile(to, function(err, data) {
						if(err) {
							reject(err);
						} else {
							editAndSaveFile(data);
						}
					});
				} else {
					editAndSaveFile(data);
				}
			});
		});
	}
	return updateK3Version;
}
function copyAndUpdateK3Version(bundle) {
	return new Promise((resolve, reject) => {
		return copyBrandingFiles(bundle)
			.then(getUpdateK3Version(bundle), function(err) {
				reject(err);
			});
	});
}

function renameFileBrandingOp(bundle) {
	return new Promise((resolve, reject) => {
		const fromName = bundle.from;
		const toName = bundle.to;

		const from = path.normalize(path.join(
			OUTPUT_PROJECT_FILES_PATH,
			fromName
		));

		const to = path.normalize(path.join(
			OUTPUT_PROJECT_FILES_PATH,
			toName
		));

		fs.rename(from, to, function fileRenamed(err) {
			if(err) {
				const fsOutput = fs.statSync(to);
				const isFile = fsOutput.isFile();
				const isDir = fsOutput.isDirectory();
				const exists = isFile || isDir;
				if(!exists) {
					console.error('Error renaming file', err);
					reject(err);
				} else {
					console.log('File already exists', to);
					resolve();
				}
			} else {
				resolve();
			}
		});
		resolve();
	});
}


function winExecuteResourceHacker(bundle) {
	return new Promise((resolve, reject) => {
		console.log('Executing resourceHacker');

		const buildScript = {
			'text': 'ResourceHacker.exe',
			'cmd': 'ls'
		};

		const from = path.normalize(path.join(
			OUTPUT_PROJECT_FILES_PATH,
			bundle.from
		));
		const to = path.normalize(path.join(
			OUTPUT_PROJECT_FILES_PATH,
			bundle.to
		));

		const icoFileName = bundle.icoFile;
		const icoFile = path.normalize(path.join(
			BRANDING_FILES_PATH,
			icoFileName
		));

		const execArgs = [
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
			child_process.execSync(buildScript.cmd);
			resolve();
		} catch(err) {
			console.log('Error Executing', buildScript.cmd, buildScript.text);
			console.log('Error: ', err);
			reject('Failed to execute: ' + buildScript.script);
		}
	});
}

const brandingOperationsMap = {
	'copy': copyBrandingFiles,
	'copyAndUpdateK3Version': copyAndUpdateK3Version,
	'rename': renameFileBrandingOp,
	'resHacker': winExecuteResourceHacker,
};


const darwinEHHelperName = 'Info-nwjs-helper-EH.plist';
const darwinNPHelperName = 'Info-nwjs-helper-NP.plist';
const darwinBaseHelperName = 'Info-nwjs-helper.plist';
const darwinEHHelperBasePath = 'nwjs.app/Contents/Frameworks/nwjs Helper EH.app/Contents';
const darwinNPHelperBasePath = 'nwjs.app/Contents/Frameworks/nwjs Helper NP.app/Contents';
const darwinBaseHelperBasePath = 'nwjs.app/Contents/Frameworks/nwjs Helper.app/Contents';
const darwinEHHelperPath = path.join(darwinEHHelperBasePath, darwinEHHelperName);
const darwinNPHelperPath = path.join(darwinNPHelperBasePath, darwinNPHelperName);
const darwinBaseHelperPath = path.join(darwinBaseHelperBasePath, darwinBaseHelperName);
const darwinEHHelperRenameToPath = path.join(darwinEHHelperBasePath, 'Info.plist');
const darwinNPHelperRenameToPath = path.join(darwinNPHelperBasePath, 'Info.plist');
const darwinBaseHelperRenameToPath = path.join(darwinBaseHelperBasePath, 'Info.plist');

const darwinBrandingOps = [
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

const win32BrandingOps = [
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

const linuxBrandingOps = [{
	'operation': 'rename',
	'from': 'nw',
	'to': desiredProjectName,
}];

const brandingOperations = {
	'darwin': darwinBrandingOps,
	'win32': win32BrandingOps,
	'linux': linuxBrandingOps,
}[buildOS];


function executeBrandingOperations(brandingOps) {
	return new Promise((resolve, reject) => {
		if(brandingOps.length > 0) {
			async.eachSeries(
				brandingOps,
				function iterator(item, callback) {
					const func = brandingOperationsMap[item.operation];
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
						reject(err);
					} else {
						resolve();
					}
				}
			);
		} else {
			console.error('No defined branding operations');
			reject('No defined branding operations');
		}
	});
}
// start project branding procedure
executeBrandingOperations(brandingOperations)
.then(function() {
	debugLog('Finished Branding');
}, function(err) {
	console.error('Error Performing Branding Operations', err);
	process.exit(1);
});

