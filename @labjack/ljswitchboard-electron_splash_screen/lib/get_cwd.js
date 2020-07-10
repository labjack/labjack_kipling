
var path = require('path');

var cwd = path.normalize(process.cwd());
var execDir = path.normalize(path.dirname(process.execPath));
var derivedCWD = path.resolve(path.join(execDir, '..','..','..'));

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
	// Check to see if the current working directory is w/in a *.app file
	if(cwd.indexOf('.app/Contents/Resources/') >= 0) { // (packaged & un-zipped)
		// In this case the startDir should be its cwd as any files needing to 
		// be un-packed will be in the /Contents/Resources/ directory next to
		// the app.nw file.
		var newDir = path.resolve(path.join(cwd, '..'));
		console.log('Project was started from a packaged & un-compressed .app');
		startDir = newDir;
		startMethod = 'un-packed app';
	} else if(cwd.indexOf('/private/var') >= 0) { // (packaged & ziped)
		// In this case the directory should be one directory back from the
		// derived CWD and in the Resources folder.
		console.log('Project was started from a packaged & un-compressed .app');
		var newDir = path.resolve(path.join(derivedCWD, '..', 'Resources'));
		startDir = newDir;
		startMethod = 'packed app';
	} else if(execDir.indexOf('/node_modules/') >= 0) { // (npm start)
		// In this case the app was started via npm start, hence its execDir
		// being in the projects node_modules directory.
		console.log('Project was started via npm start');
		startMethod = 'npm start';
		startDir = cwd;
	} else {
		// In the case of an error assume the package was started via npm start.
		console.error('Project was started via an un-known location (On Mac OS X)');
		console.log('cwd', cwd);
		console.log('derivedCWD', derivedCWD);
		console.log('execDir', execDir);
		console.log('sys info', {
			'os': os, 'platform': process.platform, 'arch': process.arch
		});
		startMethod = 'npm start';
		startDir = cwd;
	}
	/*
	 * Notes for MAC OS X: (packaged & Un-zipped) 
	 *   - cwd: "/Users/chrisjohn/git/ljswitchboard-project_manager/
	 *   ljswitchboard-builder/output/nwjs.app/Contents/Resources/app.nw"
	 *   - execDir: "/Users/chrisjohn/git/ljswitchboard-project_manager/
	 *   ljswitchboard-builder/output/nwjs.app/Contents/Frameworks/nwjs Helper.app/Contents/MacOS"
	 *   - derivedCWD: "/Users/chrisjohn/git/ljswitchboard-project_manager/
	 *   ljswitchboard-builder/output/nwjs.app/Contents/Frameworks"
	 *
	 * Notes for MAC OS X: (packaged & zipped)
	 *   - cwd: "/private/var/folders/vj/73p224w96012gvls7lc0n1140000gn/
	 *   T/.org.chromium.Chromium.thjWeG"
	 *   - execDir: "/Users/chrisjohnson/git/ljswitchboard-project_manager/
	 *   ljswitchboard-builder/output/nwjs.app/Contents/Frameworks/nwjs Helper.app/Contents/MacOS"
	 *   - derivedCWD: "/Users/chrisjohnson/git/ljswitchboard-project_manager/
	 *   ljswitchboard-builder/output/nwjs.app/Contents/Frameworks"
	 *
	 * Notes for MAC OS X: (un-packaged, start via npm start)
	 *   - cwd: "/Users/chrisjohnson/git/ljswitchboard-project_manager/
	 *   ljswitchboard-splash_screen"
	 *   - execDir: "/Users/chrisjohnson/git/ljswitchboard-project_manager/
	 *   ljswitchboard-splash_screen/node_modules/nw/nwjs/nwjs.app/Contents/Frameworks/nwjs Helper.app/Contents/MacOS"
	 *   - derivedCWD: "/Users/chrisjohnson/git/ljswitchboard-project_manager/
	 *   ljswitchboard-splash_screen/node_modules/nw/nwjs/nwjs.app/Contents/Frameworks"
	 */
	console.log('Mac OS Not Supported (Yet)', os, process.platform, process.arch);
	
} else if(os === 'linux') {
	console.log('Linux OS Not Supported (YET)', os, process.platform, process.arch);
	console.error('Project was started via an un-known location (On Linux)');
	console.log('cwd', cwd);
	console.log('derivedCWD', derivedCWD);
	console.log('execDir', execDir);
	console.log('sys info', {
		'os': os, 'platform': process.platform, 'arch': process.arch
	});
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

// startDir is the important directory that indicates where files that need to be extracted exist
exports.startDir = startDir;
exports.startInfo = startInfo;
exports.getPaths = function() {
	return global.module.paths;
};