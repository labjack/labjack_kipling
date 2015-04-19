
var fs = require('fs');
var fse = require('fs-extra');
var path = require('path');

var TEMP_PROJECT_FILES_DIRECTORY = 'temp_project_files';
var TEMP_PROJECT_FILES_PATH = path.join(process.cwd(), TEMP_PROJECT_FILES_DIRECTORY);

// Empty the output directory
try {
	console.log('Cleaning temp project files directory');
	fse.emptyDirSync(TEMP_PROJECT_FILES_PATH);
} catch(err) {
	console.log('Failed to empty the temp project files directory', err);
	process.exit(1);
}

var buildData = require('../package.json');
var isTest = false;
console.log('Args', process.argv);
if(process.argv.length > 2) {
	if(process.argv[2] === 'test') {
		isTest = true;
	}
}

var reqFiles = [];
reqFiles = reqFiles.concat(buildData.kipling_dependencies);
if(isTest) {
	reqFiles = reqFiles.concat(buildData.kipling_test_dependencies);
}


console.log('Project Files', reqFiles);


// console.log('Preparing node-webkit version:', nwjs_version);
