
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

var BUILDER_PACKAGE_FILE_PATH = path.join(startingDir,'package.json');
var builder_package_data;
var requiredSplashScreenKeys = {};
try {
	builder_package_data = require(BUILDER_PACKAGE_FILE_PATH);
	requiredSplashScreenKeys = builder_package_data.splash_screen_build_keys;
} catch(err) {
	console.error('Error getting Builder package info', err);
}

var OUTPUT_PROJECT_FILES_DIRECTORY = 'output';
var OUTPUT_PROJECT_FILES_PATH = path.normalize(path.join(startingDir, OUTPUT_PROJECT_FILES_DIRECTORY));

var BUILD_TOOLS_DIRECTORY = 'build_tools';
var BUILD_TOOLS_PATH = path.normalize(path.join(startingDir, BUILD_TOOLS_DIRECTORY));

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

// function copyBrandingFiles(bundle) {
// 	var fromName = bundle.from;
// 	var toName = bundle.to;

// 	var defered = q.defer();
// 	var from = path.normalize(path.join(
// 		// BRANDING_FILES_PATH,
// 		fromName
// 	));

// 	var to = path.normalize(path.join(
// 		OUTPUT_PROJECT_FILES_PATH,
// 		toName,
// 		path.basename(path.normalize(fromName))
// 	));

// 	debugLog('Copying File from', from);
// 	debugLog('Copying File to', to);
// 	// If the file already exists, remove it.
	
// 	// Copy the desired file
	
// 	fse.remove(to, function fileRemoved(err) {
// 		if(err) {
// 			console.log('Error removing', err);
// 		}
// 		fse.copy(from, to, function fileCoppied(err) {
// 			if(err) {
// 				console.error('Error coppying file', err);
// 				defered.reject(err);
// 			} else {
// 				defered.resolve();
// 			}
// 		});
// 	});
// 	return defered.promise;
// }

// function getEditSplashscreenPackageKeys(bundle) {
// 	function editSplashscreenPackageKeys() {
// 		var defered = q.defer();

// 		var toName = bundle.to;
// 		var to = path.normalize(path.join(
// 			TEMP_PROJECT_FILES_PATH,
// 			toName,
// 			path.basename(path.normalize(fromName))
// 		));
// 		debugLog('Editing file', to);

// 		function editFileContents(data) {
// 			var template = handlebars.compile(data);
// 			var compiledData = template({k3Version:k3VersionStr});
// 			console.log('We have opened a file!', data);
// 			console.log('it is now',compiledData);
// 			return compiledData;
// 		}
// 		function editAndSaveFile(data) {
// 			var newData = editFileContents(data);
// 			fse.outputFile(to, newData, function(err) {
// 				if(err) {
// 					fse.outputFile(to, newData, function(err) {
// 						if(err) {
// 							defered.reject();
// 						} else {
// 							defered.resolve();
// 						}
// 					});
// 				} else {
// 					defered.resolve();
// 				}
// 			});
// 		}
// 		fse.readFile(to, function(err, data) {
// 			if(err) {
// 				fse.readFile(to, function(err, data) {
// 					if(err) {
// 						defered.reject(err);
// 					} else {
// 						editAndSaveFile(data);
// 					}
// 				});
// 			} else {
// 				editAndSaveFile(data);
// 			}
// 		});
// 		return defered.promise;
// 	}
// 	return editSplashscreenPackageKeys;
// }
function editPackageKeys(bundle) {
	var defered = q.defer();

	var packageName = bundle.project_part;
	var projectPackagePath = path.normalize(path.join(
		TEMP_PROJECT_FILES_PATH,
		packageName,
		'package.json'
	));
	debugLog('Editing file', projectPackagePath);

	function editFileContents(data) {
		var str = data.toString();
		var obj = JSON.parse(str);
		var reqKeys = bundle.required_keys;
		debugLog('Project Info', obj);
		debugLog('Required keys',reqKeys);

		// Replace info with required info.
		var keys = Object.keys(reqKeys);
		keys.forEach(function(key) {
			obj[key] = reqKeys[key];
		});

		var newStr = JSON.stringify(obj, null, 2);
		debugLog('new str', newStr);
		

		// var template = handlebars.compile(data);
		// var compiledData = template({k3Version:k3VersionStr});
		// console.log('We have opened a file!', data);
		// console.log('it is now',compiledData);
		return newStr;
	}
	function editAndSaveFile(data) {
		var newData = editFileContents(data);
		fse.outputFile(projectPackagePath, newData, function(err) {
			if(err) {
				fse.outputFile(projectPackagePath, newData, function(err) {
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
	fse.readFile(projectPackagePath, function(err, data) {
		if(err) {
			fse.readFile(projectPackagePath, function(err, data) {
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


var brandingOperationsMap = {
	'editPackageKeys': editPackageKeys,
};

var genericBrandingOps = [{
	'operation': 'editPackageKeys',
	'project_part': 'ljswitchboard-splash_screen',
	'required_keys': requiredSplashScreenKeys,
}];

var brandingOperations = {
	'darwin': genericBrandingOps,
	'win32': genericBrandingOps,
	'linux': genericBrandingOps,
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
						console.error('Error Executing Operation', err);
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
	debugLog('Finished Running Edit Startup Settings Operations');
}, function(err) {
	console.error('Error Running Edit Startup Settings Operations', err);
	process.exit(1);
});

