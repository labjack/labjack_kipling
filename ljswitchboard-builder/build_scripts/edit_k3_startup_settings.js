require('./utils/error_catcher');

const path = require('path');

const editPackageKeys = require('./utils/edit_package_keys.js').editPackageKeys;
const {getBuildDirectory} = require('./utils/get_build_dir');

const TEMP_PROJECT_FILES_PATH = path.join(getBuildDirectory(), 'temp_project_files');

const builder_package_data = require('../package.json');

const enableDebugging = true;
function debugLog() {
	if(enableDebugging) {
		console.log.apply(console, arguments);
	}
}

const genericBrandingOps = [{
	'project_path': path.join(TEMP_PROJECT_FILES_PATH, 'ljswitchboard-electron_main'),
	'required_keys': [],
},
{
	'project_path': path.join(TEMP_PROJECT_FILES_PATH, 'ljswitchboard-electron_splash_screen'),
	'required_keys': [],
}];

function executeBrandingOperations(brandingOps) {
	return new Promise((resolve, reject) => {
		if(brandingOps.length > 0) {
			for (const item of brandingOps) {
				editPackageKeys(item);
			}
			resolve();
		} else {
			console.error('No defined branding operations');
			reject('No defined branding operations');
		}
	});
}
// start project branding procedure
executeBrandingOperations(genericBrandingOps)
	.then(function() {
		debugLog('Finished Running Edit Startup Settings Operations');
	}, function(err) {
		console.error('Error Running Edit Startup Settings Operations', err);
		process.exit(1);
	});

