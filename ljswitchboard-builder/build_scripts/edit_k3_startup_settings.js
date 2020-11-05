require('./utils/error_catcher');

const path = require('path');
const async = require('async');

const editPackageKeys = require('./utils/edit_package_keys.js').editPackageKeys;
const {getBuildDirectory} = require('./utils/get_build_dir');

const TEMP_PROJECT_FILES_PATH = path.join(getBuildDirectory(), 'temp_project_files');

const builder_package_data = require('../package.json');
const requiredSplashScreenKeys = builder_package_data.splash_screen_build_keys;

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

const brandingOperationsMap = {
	'editPackageKeys': editPackageKeys,
};

const genericBrandingOps = [{
	'operation': 'editPackageKeys',
	'project_path': path.join(TEMP_PROJECT_FILES_PATH, 'ljswitchboard-electron_main'),
	'required_keys': requiredSplashScreenKeys,
},
{
	'operation': 'editPackageKeys',
	'project_path': path.join(TEMP_PROJECT_FILES_PATH, 'ljswitchboard-electron_splash_screen'),
	'required_keys': requiredSplashScreenKeys,
}];

const brandingOperations = {
	'darwin': genericBrandingOps,
	'win32': genericBrandingOps,
	'linux': genericBrandingOps,
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
						func(item);
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
	debugLog('Finished Running Edit Startup Settings Operations');
}, function(err) {
	console.error('Error Running Edit Startup Settings Operations', err);
	process.exit(1);
});

