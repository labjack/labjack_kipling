'use strict';

require('./utils/error_catcher');

const path = require('path');

const {getBuildDirectory} = require('./utils/get_build_dir');
const fileOps = require('./utils/file_operations');

const TEMP_PROJECT_FILES_PATH = path.join(getBuildDirectory(), 'temp_project_files');

// Add a few extra paths if we are building for mac-osx
const buildOS = {
	'darwin': 'darwin',
	'win32': 'win32'
}[process.platform] || 'linux';

// const OUTPUT_PROJECT_FILES_PATH = (buildOS === 'darwin') ?
// 	path.join(getBuildDirectory(), 'output', 'nwjs.app', 'Contents', 'Resources')
// 	: path.join(getBuildDirectory(), 'output');

const OUTPUT_PROJECT_FILES_PATH = path.join(getBuildDirectory(), 'output');

const buildData = require('../package.json');
let isTest = false;
if(process.argv.length > 2) {
	if(process.argv[2] === 'test') {
		isTest = true;
	}
}

const requiredFiles = [];
const primaryProject = buildData.kipling_primary_dependency;
const foldersToCompress = [];

function normalizeAndJoin() {
	return path.normalize(path.join(...arguments));
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
	const promises = [];
	promises.push(fileOps.compressFolders(foldersToCompress));
	promises.push(fileOps.copyFolders(requiredFiles));

	return Promise.allSettled(promises);
}

organizeProjectFiles()
	.then(function() {
		console.log('Finished organizeProjectFiles');
	});


