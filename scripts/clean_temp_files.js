// clean_temp_files.js

// Requirements
var path = require('path');
var child_process = require('child_process');

var fse = require('fs-extra');

var buildOS = {
	'darwin': 'darwin',
	'win32': 'win32'
}[process.platform];
if(typeof(buildOS) === 'undefined') {
	buildOS = 'linux';
}

var localK3FilesPath = {
	win32: 'C:\\ProgramData\\LabJack\\K3',
	darwin: '/usr/local/share/LabJack/K3',
	linux:  '/usr/local/share/LabJack/K3',
}[buildOS];

fse.emptyDirSync(localK3FilesPath);
