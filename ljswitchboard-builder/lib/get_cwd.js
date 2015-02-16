
var path = require('path');

var execDir = path.normalize(path.dirname(process.execPath));
var derivedCWD = path.resolve(path.join(execDir, '..','..','..'));
var cwd = path.normalize(process.cwd());
var startMethod = '';
var isCompressed = false;
var startDir = cwd;
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