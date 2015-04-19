
var path = require('path');

var execDir = path.normalize(path.dirname(process.execPath));
var derivedCWD = path.resolve(path.join(execDir, '..','..','..'));
var cwd = path.normalize(process.cwd());
var startMethod = '';
var isCompressed = false;
var startDir = cwd;

var os = {
    'win32': 'win32',
    'darwin': 'darwin',
    'linux': 'linux',
    'freebsd': 'linux',
    'sunos': 'linux'
}[process.platform];

if(os === 'win32') {
	if(cwd === derivedCWD) {
		console.log('Project was started via npm start');
		startMethod = 'npm start';
		startDir = cwd;
	}

	if(cwd === execDir) {
		console.log('Project was started via un-packed .exe');
		startDir = cwd;
		startMethod = 'un-packed exe';
	} else {
		if(startMethod === '') {
			console.log('Project was started via compressed .exe');
			isCompressed = true;
			startDir = execDir;
			startMethod = 'packed exe';
		}
	}
} else if(os === 'darwin') {
	console.log('Mac OS Not Supported (Yet)', os, process.platform, process.arch);
	console.log('cwd', cwd);
	console.log('derivedCWD', derivedCWD);
	console.log('execDir', execDir);
} else if(os === 'linux') {
	console.log('Linux OS Not Supported (YET)', os, process.platform, process.arch);
} else {
	console.log('OS Not Supported', os, process.platform, process.arch);
}

console.log('Started project via: ' + startMethod);
var startInfo = {
	'isCompressed': isCompressed,
	'startDir': startDir,
	'execDir': execDir,
	'derivedCWD': derivedCWD,
	'cwd': cwd
};
console.log('Start info', startInfo);

exports.startDir = startDir;
exports.startInfo = startInfo;
exports.getPaths = function() {
	return global.module.paths;
};