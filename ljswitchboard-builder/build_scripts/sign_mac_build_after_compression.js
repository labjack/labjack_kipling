
console.log('sign_mac_build_after_compression');

var errorCatcher = require('./error_catcher');
var fs = require('fs');
var fse = require('fs-extra');
var fsex = require('fs.extra');
var path = require('path');
var q = require('q');
var async = require('async')
var child_process = require('child_process');


// Figure out what OS we are building for
var buildOS = {
	'darwin': 'darwin',
	'win32': 'win32'
}[process.platform];
if(typeof(buildOS) === 'undefined') {
	buildOS = 'linux';
}

var pathToKiplingAppPartials = [
	__dirname,
	'..',
	'output',
	'Kipling.app'
].join(path.sep);

var pathToParentPListPartials = [
	__dirname,
	'..',
	'branding_files',
	'kipling_parent.plist'
].join(path.sep);

var pathToChildPListPartials = [
	__dirname,
	'..',
	'branding_files',
	'kipling_child.plist'
].join(path.sep);

var pathToKiplingApp = path.resolve(path.join(pathToKiplingAppPartials))
var pathToParentPList = path.resolve(path.join(pathToParentPListPartials))
var pathToChildPList = path.resolve(path.join(pathToChildPListPartials))


if(typeof(process.argv) !== 'undefined') {
	var cliArgs = process.argv;
	if(process.argv.length == 4) {
		// Get rid of the first two arguments
		cliArgs = cliArgs.slice(2, cliArgs.length);

		pathToKiplingApp = cliArgs[0].split('"').join();
	}
}


var buildScripts = [{
	'script': ['codesign --sign "LabJack Corporation" --force --timestamp --options runtime',
		'--deep --entitlements "'+pathToChildPList+'"',
		'"'+pathToKiplingApp+'/Contents/Frameworks/crash_inspector"'].join(' '),
	'text': 'crash_inspector',
}, {
	'script': ['codesign --sign "LabJack Corporation" --force --timestamp --options runtime',
		'--deep --entitlements "'+pathToChildPList+'"',
		'"'+pathToKiplingApp+'/Contents/Frameworks/nwjs Framework.framework/nwjs Framework"'].join(' '),
	'text': 'nwjs Framework',
}, {
	'script': ['codesign --sign "LabJack Corporation" --force --timestamp --options runtime',
		'--deep --entitlements "'+pathToChildPList+'"',
		'"'+pathToKiplingApp+'/Contents/Frameworks/nwjs Framework.framework/Libraries/ffmpegsumo.so"'].join(' '),
	'text': 'ffmpegsumo.so lib',
}, {
	'script': ['codesign --sign "LabJack Corporation" --force --timestamp --options runtime',
		'--deep --entitlements "'+pathToChildPList+'"',
		'"'+pathToKiplingApp+'/Contents/Frameworks/nwjs Helper EH.app/Contents/MacOS/nwjs Helper EH"'].join(' '),
	'text': 'nwjs Helper EH',
}, {
	'script': ['codesign --sign "LabJack Corporation" --force --timestamp --options runtime',
		'--deep --entitlements "'+pathToChildPList+'"',
		'"'+pathToKiplingApp+'/Contents/Frameworks/nwjs Helper NP.app/Contents/MacOS/nwjs Helper NP"'].join(' '),
	'text': 'nwjs Helper NP',
}, {
	'script': ['codesign --sign "LabJack Corporation" --force --timestamp --options runtime',
		'--deep --entitlements "'+pathToChildPList+'"',
		'"'+pathToKiplingApp+'/Contents/Frameworks/nwjs Helper.app/Contents/MacOS/nwjs Helper"'].join(' '),
	'text': 'nwjs Helper',
}, {
	'script': ['codesign --sign "LabJack Corporation" --force --timestamp --options runtime',
		'--deep --entitlements "'+pathToChildPList+'"',
		'"'+pathToKiplingApp+'/Contents/Frameworks/nwjs Helper.app"'].join(' '),
	'text': 'nwjs Helper.app',
}, {
	'script': ['codesign --sign "LabJack Corporation" --force --timestamp --options runtime',
		'--deep --entitlements "'+pathToChildPList+'"',
		'"'+pathToKiplingApp+'/Contents/MacOS/nwjs"'].join(' '),
	'text': 'nwjs',
}, {
	'script': ['codesign --sign "LabJack Corporation" --force --timestamp --options runtime',
		'--deep --entitlements "'+pathToParentPList+'"',
		'"'+pathToKiplingApp+'"'].join(' '),
	'text': 'Kipling.app',
}]

buildScripts.forEach(function(buildScript) {
	buildScript.cmd = buildScript.script;
	buildScript.isFinished = false;
	buildScript.isSuccessful = false;
});

async.eachSeries(
	buildScripts,
	function(buildScript, cb) {
		console.log('Starting Step:', buildScript.text);
		child_process.exec(buildScript.cmd, function(error, stdout, stderr) {
			if (error) {
				console.error('Error Executing', error);
				console.error(buildScript.script, buildScript.text);
				cb(error);
			}
			console.log('stdout: ',stdout);
			console.log('stderr: ',stderr);
			cb();
		})
	},
	function(err) {
		if(err) {
			console.log('Error Executing Build Scripts...', err);
			process.exit(1);
		}
	});

// buildScripts.forEach(function(buildScript) {
// 	try {
// 		console.log('Starting Step:', buildScript.text);
// 		var execOutput = child_process.execSync(buildScript.cmd);
// 		console.log('execOutput: ' , execOutput.toString());
// 	} catch(err) {
// 		console.log('Error Executing', buildScript.script, buildScript.text);
// 		process.exit(1);
// 	}
// });