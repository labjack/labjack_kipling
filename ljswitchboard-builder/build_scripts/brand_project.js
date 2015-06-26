
var errorCatcher = require('./error_catcher');
var fs = require('fs');
var q = require('q');
var path = require('path');
var fse = require('fs-extra');
var async = require('async');

var startingDir = process.cwd();

var TEMP_PROJECT_FILES_DIRECTORY = 'temp_project_files';
var TEMP_PROJECT_FILES_PATH = path.join(startingDir, TEMP_PROJECT_FILES_DIRECTORY);

var OUTPUT_PROJECT_FILES_DIRECTORY = 'output';
var OUTPUT_PROJECT_FILES_PATH = path.normalize(path.join(startingDir, OUTPUT_PROJECT_FILES_DIRECTORY));

var desiredProjectName = 'Kipling';

var BRANDING_FILES_DIR = 'branding_files';

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
		startingDir,
		BRANDING_FILES_DIR,
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
};

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
	})
	defered.resolve();
	return defered.promise;
}

var brandingOperationsMap = {
	'copy': copyBrandingFiles,
	'rename': renameFileBrandingOp,
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

var win32BrandingOps = [];

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

