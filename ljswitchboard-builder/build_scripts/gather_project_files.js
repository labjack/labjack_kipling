'use strict';

require('./utils/error_catcher');
const fs = require('fs');
const fse = require('fs-extra');
const path = require('path');

const {getBuildDirectory} = require('./utils/get_build_dir');

const buildData = require('../package.json');

const startingDir = process.cwd();
const TEMP_PROJECT_FILES_PATH = path.join(getBuildDirectory(), 'temp_project_files');

const DEBUG_FILE_COPYING = false;
const PROJECT_FILES_SEARCH_PATH = path.normalize(path.join(startingDir, '..'));

let isTest = false;
if(process.argv.length > 2) {
	if(process.argv[2] === 'test') {
		isTest = true;
	}
}

let requiredFiles = [].concat(buildData.kipling_dependencies);
if(isTest) {
	requiredFiles = requiredFiles.concat(buildData.kipling_test_dependencies);
}

// A list of files and folders to not copy
const filteredFilesAndFolders = [
	'outFile.txt',
	'.git',
	'.gitignore',
	'.npmignore',
	// 'test', // kipling_tester
	'test_binaries',
	// 'node_binaries/linux',
	// 'node_binaries/win32',
	// 'node_modules/nodeunit',

	// Filter out the node-webkit install
	// 'node_modules/nw',

	// Filter out all of the node_modules...
	'node_modules',

	// Filter out package-lock file.
	// 'package-lock.json',
];

const os = {
    'win32': 'win32',
    'darwin': 'darwin',
    'linux': 'linux',
    'freebsd': 'linux',
    'sunos': 'linux'
}[process.platform];

const nodejsBinaryVersions = [
	'0_10_33',
	'0_10_35',
	'0_12_1',
	'0_12_7',
	'1_2_0',
	'5_4_1',
	'5_6_0',
];
if(os === 'win32') {
	nodejsBinaryVersions.push('5_6_0');
	nodejsBinaryVersions.push('6_3_1');
}

const addNodeVersionExclusions = function(os, arch) {
	// Get the currently running node version
	const curVersion = process.versions.node.split('.').join('_');

	const versionsToDelete = [];
	nodejsBinaryVersions.forEach(function(nodejsBinaryVersion) {
		if(nodejsBinaryVersion !== curVersion) {
			versionsToDelete.push(nodejsBinaryVersion);
		}
	});
	versionsToDelete.forEach(function(versionToDelete) {
		filteredFilesAndFolders.push(
			'node_binaries/' +
			os + '/' +
			arch + '/' +
			versionToDelete
		);
	});
};
const addArchExclusions = function(os) {
	const curArch = process.arch;
	addNodeVersionExclusions(os, curArch);
	if(curArch !== 'x64') {
		filteredFilesAndFolders.push('node_binaries/' + os + '/x64');
	}
	if(curArch !== 'ia32') {
		filteredFilesAndFolders.push('node_binaries/' + os + '/ia32');
	}
	if(curArch !== 'arm') {
		filteredFilesAndFolders.push('node_binaries/' + os + '/arm');
	}
};
if(os === 'darwin') {
	filteredFilesAndFolders.push('node_binaries/linux');
	filteredFilesAndFolders.push('node_binaries/win32');
	addArchExclusions('darwin');
} else if(os === 'win32') {
	filteredFilesAndFolders.push('node_binaries/linux');
	filteredFilesAndFolders.push('node_binaries/darwin');
	addArchExclusions('win32');
} else if(os === 'linux') {
	filteredFilesAndFolders.push('node_binaries/win32');
	filteredFilesAndFolders.push('node_binaries/darwin');
	addArchExclusions('linux');
}

const copySingleFile = function(from, to) {
	return new Promise((resolve) => {
		if(fs.statSync(from).isDirectory()) {
			fse.ensureDirSync(to);
		}
		fse.copy(from, to, function() {
			resolve();
		});
	});
};

const copyStatus = {};
const startingTime = new Date();
const getFinishedFunc = function(savedKey) {
	return function () {
		copyStatus[savedKey] = true;
		printStatus();
	};
};
const addWorkingDir = function(dir) {
	for(let i = 0; i < 100; i++) {
		const savedKey = '[' + i.toString() + ']' + dir;
		if(typeof(copyStatus[savedKey]) === 'undefined') {
			copyStatus[savedKey] = false;
			printStatus();
			return getFinishedFunc(savedKey);
		}
	}

};
const fixNameStr = function(nameStr) {
	const minLength = 40;
	const splitName = nameStr.split(']');
	if(splitName.length > 0) {
		nameStr = splitName[1];
	}
	let outStr = nameStr;
	const numToAdd = minLength - outStr.length;

	for (let i = 0; i < numToAdd; i++) {
		outStr += ' ';
	}
	return outStr;
};
const getHeaderStr = function() {
	const outputText = [];
	const curTime = new Date();
	const curDuration = ((curTime - startingTime)/1000).toFixed(1);

	const keys = Object.keys(copyStatus);
	const num = keys.length;
	let numComplete = 0;
	keys.forEach(function(key) {
		if(copyStatus[key]) {
			numComplete += 1;
		}
	});
	const percentComplete = ((numComplete/num) * 100).toFixed(1);
	outputText.push('Status: ' + percentComplete + '%');
	outputText.push('Duration: '+ curDuration.toString() + ' seconds');
	return outputText;
};

const ENABLE_STATUS_UPDATES = false;
const innerPrintStatus = function() {
	if(ENABLE_STATUS_UPDATES) {
		console.log('');
		console.log('');
		console.log('');
		let outputText = [];
		outputText = outputText.concat(getHeaderStr());
		const keys = Object.keys(copyStatus);
		outputText = outputText.concat(keys.map(function(key) {
			return fixNameStr(key) + '\t' + copyStatus[key].toString();
		}));
		outputText.forEach(function(outputStr) {
			console.log(outputStr);
		});
	}
};
const printStatus = function() {
	let printStatus = true;

	requiredFiles.forEach(function(requiredFile) {
		if(typeof(copyStatus['[0]'+requiredFile]) === 'undefined') {
			printStatus = false;
		}
	});
	if(printStatus) {
		innerPrintStatus();
	}
};
const copyRelevantFiles = function(from, to, filters) {

	const fileListing = fs.readdirSync(from);
	const promises = [];
	return new Promise((resolve, reject) => {

		if(DEBUG_FILE_COPYING) {
			console.log('in copyRelevantFiles:', from);
			console.log('Filters:',filters);
			console.log('Files in dir', fileListing);
		} else {
			// console.log('Working on:', path.parse(from).base);
		}
		const finishedFunc = addWorkingDir(path.parse(from).base);
		fileListing.forEach(function(file) {
			if(DEBUG_FILE_COPYING) {
				console.log('Checking File', file);
			}
			const source_path = path.normalize(path.join(from, file));
			const destination_path = path.normalize(path.join(to, file));

			let copyFile = true;
			let recurseInto = false;
			const secondaryFilters = [];

			filters.forEach(function(filter) {
				const splitFilter = filter.split('/');
				const folderFilter = splitFilter.shift();
				// determine if the folder should be recursed into instead of
				// coppied.
				// Check to see if there is data to be recursed into.
				if(splitFilter.length > 0) {
					// If there is data to be recursed into then check to see if
					// the folder matches the specified filter.
					if(file === folderFilter) {
						copyFile = false;
						recurseInto = true;
						secondaryFilters.push(splitFilter.join('/'));
					}
				} else {
					if(file === folderFilter) {
						if(DEBUG_FILE_COPYING) {
							console.log('Not Copying', file, path.parse(from).base);
						}
						copyFile = false;
					}
				}
			});
			if(copyFile) {
				if(DEBUG_FILE_COPYING) {
					console.log('Copying file', file, path.parse(from).base);
				}
				promises.push(copySingleFile(source_path, destination_path));
			}
			if(recurseInto) {
				if(DEBUG_FILE_COPYING) {
					console.log('Recursing into...', file);
					console.log('With filters', secondaryFilters);
				}
				promises.push(copyRelevantFiles(
					source_path,
					destination_path,
					secondaryFilters
				));
			}
		});
		Promise.allSettled(promises).then(
			function() {
				// finishWorkingDir(path.parse(from).base);
				finishedFunc();
				resolve();
			}, reject);
	});
};

const copyRequiredFiles = function() {
	const promises = requiredFiles.map(function(required_file) {
		try {
			// console.log('Copying:', required_file);
			const source_path = path.normalize(path.join(
				PROJECT_FILES_SEARCH_PATH,
				required_file
			));
			const destination_path = path.normalize(path.join(
				TEMP_PROJECT_FILES_PATH,
				required_file
			));
			fs.mkdirSync(destination_path);

			// const projectInfo = require(path.normalize(path.join(
			// 	PROJECT_FILES_SEARCH_PATH,
			// 	required_file,
			// 	'package.json'
			// )));

			// Dev dependency list
			// const devFilters = [];
			// if(projectInfo.devDependencies) {
			// 	const devDeps = Object.keys(projectInfo.devDependencies);
			// 	devFilters = devDeps.map(function(devDep) {
			// 		return 'node_modules/' + devDep;
			// 	});
			// }

			const folderFilters = [];

			filteredFilesAndFolders.forEach(function(filter) {
				folderFilters.push(filter);
			});
			// devFilters.forEach(function(filter) {
			// 	folderFilters.push(filter);
			// });
			// fse.copySync(source_path, destination_path);
			// console.log('Calling...',required_file, source_path, destination_path);
			return copyRelevantFiles(source_path, destination_path, folderFilters);
		} catch(err) {
			console.log('Error...', err);
		}
	});
	return Promise.allSettled(promises);
};
copyRequiredFiles()
.then(function() {
	console.log('Finished Copying required files');
});
