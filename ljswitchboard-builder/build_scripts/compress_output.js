require('./utils/error_catcher');
var path = require('path');
var async = require('async');

var fileOps = require('./utils/file_operations');
const {getBuildDirectory} = require('./utils/get_build_dir');

var startingDir = process.cwd();
var TEMP_PROJECT_FILES_PATH = path.join(getBuildDirectory(), 'temp_project_files');
var OUTPUT_PROJECT_FILES_PATH = path.join(getBuildDirectory(), 'output');

var kiplingPackagePath = path.join(TEMP_PROJECT_FILES_PATH, 'ljswitchboard-kipling', 'package.json');
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

if (process.env.OVERRIDE_BUILD_DATE) {
	dateStrPartial =process.env.OVERRIDE_BUILD_DATE + '_';
}

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
