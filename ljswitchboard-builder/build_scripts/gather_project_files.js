

var fs = require('fs');
var fse = require('fs-extra');
var path = require('path');
var q = require('q');

var TEMP_PROJECT_FILES_DIRECTORY = 'temp_project_files';
var startingDir = process.cwd();
var TEMP_PROJECT_FILES_PATH = path.join(startingDir, TEMP_PROJECT_FILES_DIRECTORY);

var DEBUG_FILE_COPYING = false;
// Because not all projects are on npm yet, simply get data from their github
// projects.
var PROJECT_FILES_SEARCH_PATH = path.normalize(path.join(startingDir, '..'));

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
// console.log('Args', process.argv);
if(process.argv.length > 2) {
	if(process.argv[2] === 'test') {
		isTest = true;
	}
}

var requiredFiles = [];
requiredFiles = requiredFiles.concat(buildData.kipling_dependencies);
if(isTest) {
	requiredFiles = requiredFiles.concat(buildData.kipling_test_dependencies);
}

// requiredFiles = [
// 	'ljswitchboard-io_manager'
// ];
// console.log('Project Files', requiredFiles);

// A list of files and folders to not copy
var filteredFilesAndFolders = [
	'.git',
	'.gitignore',
	'.npmignore',
	'test',
	'test_binaries',
	// 'node_binaries/linux',
	// 'node_binaries/win32',
	'node_modules/q',
	'node_modules/nodeunit',
];

var os = {
    'win32': 'win32',
    'darwin': 'darwin',
    'linux': 'linux',
    'freebsd': 'linux',
    'sunos': 'linux'
}[process.platform];
var addArchExclusions = function(os) {
	if(process.arch !== 'x64') {
		filteredFilesAndFolders.push('node_binaries/' + os + '/x64');
	}
	if(process.arch !== 'ia32') {
		filteredFilesAndFolders.push('node_binaries/' + os + '/ia32');
	}
	if(process.arch !== 'arm') {
		filteredFilesAndFolders.push('node_binaries/' + os + '/arm');
	}
}
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

var copySingleFile = function(from, to) {
	var defered = q.defer();
	if(fs.statSync(from).isDirectory()) {
		fse.ensureDirSync(to);
	}
	// console.log('in copySingleFile', from, to);
	fse.copy(from, to, function(isErr) {
		// console.log('Finished copying', from, to);
		defered.resolve();
	});
	return defered.promise;
};

var copyStatus = {};
var startingTime = new Date();
var getFinishedFunc = function(savedKey) {
	var finishWorkingDir = function() {
		copyStatus[savedKey] = true;
		printStatus();
	};
	return finishWorkingDir;
};
var addWorkingDir = function(dir) {
	var incrementalOffset = 0;
	var i;

	var savedKey = '';
	for(i = 0; i < 100; i++) {
		savedKey = '[' + i.toString() + ']' + dir;
		if(typeof(copyStatus[savedKey]) === 'undefined') {
			copyStatus[savedKey] = false;
			printStatus();
			return getFinishedFunc(savedKey);
		}
	}
	
}
var fixNameStr = function(nameStr) {
	var minLength = 40;
	var splitName = nameStr.split(']');
	var i;
	if(splitName.length > 0) {
		nameStr = splitName[1];
	}
	var outStr = '';
	outStr += nameStr;
	var numToAdd = minLength - outStr.length;
	
	for(i = 0; i < numToAdd; i++) {
		outStr += ' ';
	}
	return outStr;
}
var getHeaderStr = function() {
	var outputText = [];
	var startStr = 'Status:';

	var str = fixNameStr('status');
	var curTime = new Date();
	var curDuration = ((curTime - startingTime)/1000).toFixed(1);
	
	
	var keys = Object.keys(copyStatus);
	var num = keys.length;
	var numComplete = 0;
	keys.forEach(function(key) {
		if(copyStatus[key]) {
			numComplete += 1;
		}
	});
	var percentComplete = ((numComplete/num) * 100).toFixed(1);
	outputText.push('Status: ' + percentComplete + '%');
	outputText.push('Duration: '+ curDuration.toString() + ' seconds');
	return outputText;
};
var innerPrintStatus = function() {
	console.log('');
	console.log('');
	console.log('');
	var outputText = [];
	outputText = outputText.concat(getHeaderStr());
	var keys = Object.keys(copyStatus);
	outputText = outputText.concat(keys.map(function(key) {
		var outStr = fixNameStr(key);
		outStr += '\t' + copyStatus[key].toString();
		return outStr;
	}));
	outputText.forEach(function(outputStr) {
		console.log(outputStr);
	});
}
var printStatus = function() {
	var printStatus = true;

	requiredFiles.forEach(function(requiredFile) {
		if(typeof(copyStatus['[0]'+requiredFile]) === 'undefined') {
			printStatus = false;
		}
	});
	if(printStatus) {
		innerPrintStatus();
	}
}
var copyRelevantFiles = function(from, to, filters) {
	
	var fileListing = fs.readdirSync(from);
	var promises = [];
	var defered = q.defer();

	if(DEBUG_FILE_COPYING) {
		console.log('in copyRelevantFiles:', from);
		console.log('Filters:',filters);
		console.log('Files in dir', fileListing);
	} else {
		// console.log('Working on:', path.parse(from).base);
	}
	var finishedFunc = addWorkingDir(path.parse(from).base);
	fileListing.forEach(function(file) {
		if(DEBUG_FILE_COPYING) {
			console.log('Checking File', file);
		}
		var source_path = path.normalize(path.join(from, file));
		var destination_path = path.normalize(path.join(to, file));

		var copyFile = true;
		var recurseInto = false;
		var secondaryFilters = [];

		filters.forEach(function(filter) {
			var splitFilter = filter.split('/');
			var folderFilter = splitFilter.shift();
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
	q.allSettled(promises).then(
		function() {
			// finishWorkingDir(path.parse(from).base);
			finishedFunc();
			defered.resolve();
		}, defered.reject);
	return defered.promise;
};

var copyRequiredFiles = function() {
	var promises = requiredFiles.map(function(required_file) {
		// console.log('Copying:', required_file);
		var source_path = path.normalize(path.join(
			PROJECT_FILES_SEARCH_PATH,
			required_file
		));
		var destination_path = path.normalize(path.join(
			TEMP_PROJECT_FILES_PATH,
			required_file
		));
		fs.mkdirSync(destination_path);
		// fse.copySync(source_path, destination_path);
		// console.log('Calling...',required_file, source_path, destination_path);
		return copyRelevantFiles(source_path, destination_path, filteredFilesAndFolders);
	});
	return q.allSettled(promises);
};
copyRequiredFiles()
.then(function() {
	console.log('Finished Copying required files');
});



// console.log('Preparing node-webkit version:', nwjs_version);
