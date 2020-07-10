
var errorCatcher = require('./error_catcher');
var fs = require('fs');
var fse = require('fs-extra');
var path = require('path');
var q = require('q');
var async = require('async');
var archiver = require('archiver');

var fileOps = require('./file_operations');

var TEMP_PROJECT_FILES_DIRECTORY = 'temp_project_files';
var startingDir = process.cwd();
var TEMP_PROJECT_FILES_PATH = path.join(startingDir, TEMP_PROJECT_FILES_DIRECTORY);

var DEBUG_FILE_COPYING = false;
var OUTPUT_PROJECT_FILES_DIRECTORY = 'output';
var OUTPUT_PROJECT_FILES_PATH = path.normalize(path.join(startingDir, OUTPUT_PROJECT_FILES_DIRECTORY));


var kiplingPackagePath = path.join(TEMP_PROJECT_FILES_PATH,'ljswitchboard-kipling','package.json');
var kiplingPackageInfo = require(kiplingPackagePath);
var k3Version = kiplingPackageInfo.version;

console.log('Compression info for k3', k3Version);


// Add a few extra paths if we are building for mac-osx
var buildOS = {
	'darwin': 'darwin',
	'win32': 'win32'
}[process.platform];
if(typeof(buildOS) === 'undefined') {
	buildOS = 'linux';
}

// Building file output string kipling.3.1.10.2017_10_17_mac64
var k3StrPartial = ['kipling', k3Version].join('.') + '.'; // kipling.3.1.10.

var date = new Date();
var year = date.getFullYear();
var yearStr = year.toString();
var month = date.getMonth() + 1;
var monthStr = month.toString();
if(monthStr.length < 2) {
	monthStr = '0' + monthStr;
}
var day = date.getDate();
var dayStr = day.toString();
if(dayStr.length < 2) {
	dayStr = '0' + dayStr;
}
var dateStrPartial = [yearStr,monthStr,dayStr].join('_') + '_';

var osForOutputFileName = {
	'darwin': 'mac',
	'win32': 'win',
	'linux': 'linux',
}[buildOS];

var archForOutputFileName = {
	'x64': '64',
	'ia32': '32',
}[process.arch];
var osStrPartial = osForOutputFileName + archForOutputFileName;


var outputFileName = k3StrPartial + dateStrPartial + osStrPartial;
var OUTPUT_FOLDER_PATH = path.join(startingDir, outputFileName);

console.log('target output name', outputFileName);

var buildData = require('../package.json');

// var operations = [
// {'op': 'rename_output', 'from': normalizeAndJoin('')}
// ];

var osOutputType = {
	'darwin': '.zip',
	'win32': '.zip',
	'linux': '.tar.gz'
}[buildOS];

var OUTPUT_COMPRESSED_PATH = path.join(startingDir, outputFileName+osOutputType);

console.log('Output compressed folder', OUTPUT_COMPRESSED_PATH);
var operations = [
	{'op': 'rename', 'from': OUTPUT_PROJECT_FILES_PATH, 'to': OUTPUT_FOLDER_PATH},
	{'op': 'compress', 'from': OUTPUT_PROJECT_FILES_PATH, 'to': OUTPUT_COMPRESSED_PATH, 'outputType': osOutputType}
];

async.eachSeries(
	operations,
	function(op, cb) {
		if(op.op === 'rename') {
			fileOps.copyFolder(op)
			.then(function() {
				cb();
			}, function(err) {
				console.error('error performing move op:', op, err);
				cb(err);
			});
		} else {
			fileOps.compressFolder(op)
			.then(function() {
				cb();
			}, function(err) {
				console.error('error performing compress op:', op, err);
				cb(err);
			});
		}
	},
	function(err) {
		console.log('Finished.');
	});

// console.log('operations', operations);

// var requiredFiles = [];
// var primaryProject = buildData.kipling_primary_dependency;
// var foldersToCompress = [];

// function normalizeAndJoin(dirA, dirB) {
// 	// console.log('HERE', dirA, dirB);
// 	return path.normalize(path.join.apply(this, arguments));
// }
// function addProjectFolder (folder) {
// 	if(folder !== primaryProject) {
// 		if(isTest) {
// 			requiredFiles.push({
// 				'from': normalizeAndJoin(TEMP_PROJECT_FILES_PATH, folder),
// 				'to': normalizeAndJoin(OUTPUT_PROJECT_FILES_PATH, folder),
// 			});
// 		} else {
// 			foldersToCompress.push({
// 				'from': normalizeAndJoin(TEMP_PROJECT_FILES_PATH, folder),
// 				'to': normalizeAndJoin(OUTPUT_PROJECT_FILES_PATH, folder + '.zip'),
// 			});
// 		}
// 	} else {
// 		if(buildOS !== 'darwin') {
// 			requiredFiles.push({
// 				'from': normalizeAndJoin(TEMP_PROJECT_FILES_PATH, folder),
// 				'to': normalizeAndJoin(OUTPUT_PROJECT_FILES_PATH),
// 			});
// 		} else {
// 			foldersToCompress.push({
// 				'from': normalizeAndJoin(TEMP_PROJECT_FILES_PATH, folder),
// 				'to': normalizeAndJoin(OUTPUT_PROJECT_FILES_PATH, 'app' + '.nw'),
// 			});
// 		}
// 	}
// }
// buildData.kipling_dependencies.forEach(addProjectFolder);

// if(isTest) {
// 	// requiredFiles = requiredFiles.concat(buildData.kipling_test_dependencies);
// 	buildData.kipling_test_dependencies.forEach(addProjectFolder);
// }









// function organizeProjectFiles () {
// 	var defered = q.defer();

// 	var promises = [];
// 	promises.push(fileOps.compressFolders(foldersToCompress));
// 	promises.push(fileOps.copyFolders(requiredFiles));

// 	q.allSettled(promises)
// 	.then(function() {
// 		defered.resolve();
// 	});
// 	return defered.promise;
// }

// organizeProjectFiles()
// .then(function() {
// 	console.log('Finished organizeProjectFiles');
// });


