
var errorCatcher = require('./error_catcher');
var fs = require('fs');
var fse = require('fs-extra');
var path = require('path');
var q = require('q');
var archiver = require('archiver');

var fileOps = require('./file_operations');

var TEMP_PROJECT_FILES_DIRECTORY = 'temp_project_files';
var startingDir = process.cwd();
var TEMP_PROJECT_FILES_PATH = path.join(startingDir, TEMP_PROJECT_FILES_DIRECTORY);

var DEBUG_FILE_COPYING = false;
var OUTPUT_PROJECT_FILES_DIRECTORY = 'output';
var OUTPUT_PROJECT_FILES_PATH = path.normalize(path.join(startingDir, OUTPUT_PROJECT_FILES_DIRECTORY));

// Add a few extra paths if we are building for mac-osx
var buildOS = {
	'darwin': 'darwin',
	'win32': 'win32'
}[process.platform];
if(typeof(buildOS) === 'undefined') {
	buildOS = 'linux';
}
if(buildOS === 'darwin') {
	OUTPUT_PROJECT_FILES_PATH = path.normalize(path.join(
	 	OUTPUT_PROJECT_FILES_PATH,
	 	'nwjs.app',
	 	'Contents',
	 	'Resources'
	 ));
}

var buildData = require('../package.json');
var isTest = false;
// console.log('Args', process.argv);
if(process.argv.length > 2) {
	if(process.argv[2] === 'test') {
		isTest = true;
	}
}

var requiredFiles = [];
var primaryProject = buildData.kipling_primary_dependency;
var foldersToCompress = [];

function normalizeAndJoin(dirA, dirB) {
	console.log('HERE', dirA, dirB);
	return path.normalize(path.join.apply(this, arguments));
}
function addProjectFolder (folder) {
	if(folder !== primaryProject) {
		if(isTest) {
			requiredFiles.push({
				'from': normalizeAndJoin(TEMP_PROJECT_FILES_PATH, folder),
				'to': normalizeAndJoin(OUTPUT_PROJECT_FILES_PATH, folder),
			});
		} else {
			foldersToCompress.push({
				'from': normalizeAndJoin(TEMP_PROJECT_FILES_PATH, folder),
				'to': normalizeAndJoin(OUTPUT_PROJECT_FILES_PATH, folder + '.zip'),
			});
		}
	} else {
		requiredFiles.push({
			'from': normalizeAndJoin(TEMP_PROJECT_FILES_PATH, folder),
			'to': normalizeAndJoin(OUTPUT_PROJECT_FILES_PATH),
		});
	}
}
buildData.kipling_dependencies.forEach(addProjectFolder);

if(isTest) {
	// requiredFiles = requiredFiles.concat(buildData.kipling_test_dependencies);
	buildData.kipling_test_dependencies.forEach(addProjectFolder);
}









function organizeProjectFiles () {
	var defered = q.defer();

	var promises = [];
	promises.push(fileOps.compressFolders(foldersToCompress));
	promises.push(fileOps.copyFolders(requiredFiles));

	q.allSettled(promises)
	.then(function() {
		defered.resolve();
	});
	return defered.promise;
}

organizeProjectFiles()
.then(function() {
	console.log('Finished organizeProjectFiles');
});