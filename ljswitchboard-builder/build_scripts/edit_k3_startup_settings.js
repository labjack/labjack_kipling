
var errorCatcher = require('./error_catcher');
var fs = require('fs');
var q = require('q');
var path = require('path');
var fse = require('fs-extra');
var async = require('async');
var child_process = require('child_process');
var handlebars = require('handlebars');

const editPackageKeys = require('./edit_package_keys.js').editPackageKeys;

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


var brandingOperationsMap = {
	'editPackageKeys': editPackageKeys,
};

var genericBrandingOps = [{
	'operation': 'editPackageKeys',
	'project_path': path.join(TEMP_PROJECT_FILES_PATH, 'ljswitchboard-splash_screen'),
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
					func(item);
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

