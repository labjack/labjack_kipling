// clean_temp_files.js

// Requirements
var path = require('path');
var child_process = require('child_process');

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

var toDelete = path.join(localK3FilesPath, '*');
var installOutput = child_process.execSync(`rm -rf ${toDelete}`);
