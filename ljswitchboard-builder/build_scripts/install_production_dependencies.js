
var errorCatcher = require('./error_catcher');
var fs = require('fs');
var fse = require('fs-extra');
var fsex = require('fs.extra');
var path = require('path');
var q = require('q');

var execSync = require('child_process').execSync;

const labjackKiplingPackages = require('./get_labjack_kipling_packages.js');
const editPackageKeys = require('./edit_package_keys.js').editPackageKeys;

var TEMP_PROJECT_FILES_DIRECTORY = 'temp_project_files';
var startingDir = process.cwd();
var TEMP_PROJECT_FILES_PATH = path.join(startingDir, TEMP_PROJECT_FILES_DIRECTORY);

const graph = labjackKiplingPackages.getAdjacencyGraph();
const packages = labjackKiplingPackages.getPackages();

var DEBUG_INSTALLATION = true;


var buildData = require('../package.json');

var projectDirectories = [];
kipling_dependencies = buildData.kipling_dependencies;

function normalizeAndJoin(dirA, dirB) {
	// console.log('HERE', dirA, dirB);
	return path.normalize(path.join.apply(this, arguments));
}

projectDirectories = kipling_dependencies.map(function(kipling_dependency) {
	var key = '';
	for(var i = 0; i < 50; i ++) {
		if(typeof(kipling_dependency[i]) === 'undefined') {
			key += ' ';
		} else {
			key += kipling_dependency[i];
		}
	}
	return {
		'name': kipling_dependency,
		'key': key,
		'directory': normalizeAndJoin(TEMP_PROJECT_FILES_PATH, kipling_dependency)
	};
});

var installStatus = {};
projectDirectories.forEach(function(dependency) {
	installStatus[dependency.key] = false;
});
var startingTime = new Date();
function getFinishedInstallFunc(dependency_key) {
	return function fininishedInstallFunc() {
		installStatus[dependency_key] = true;
		printStatus();
	};
}
function getHeaderStr() {
	var outputText = [];
	var startStr = 'Status:';

	var curTime = new Date();
	var curDuration = ((curTime - startingTime)/1000).toFixed(1);


	var keys = Object.keys(installStatus);
	var num = keys.length;
	var numComplete = 0;
	keys.forEach(function(key) {
		if(installStatus[key]) {
			numComplete += 1;
		}
	});
	var percentComplete = ((numComplete/num) * 100).toFixed(1);
	outputText.push('Status: ' + percentComplete + '%');
	outputText.push('Duration: '+ curDuration.toString() + ' seconds');
	return outputText;
}
var ENABLE_STATUS_UPDATES = false;
var printStatus = function() {
	if(ENABLE_STATUS_UPDATES) {
		console.log('');
		console.log('');
		console.log('');
		var outputText = [];
		outputText = outputText.concat(getHeaderStr());
		var keys = Object.keys(installStatus);
		outputText = outputText.concat(keys.map(function(key) {
			var outStr = key;
			outStr += '\t' + installStatus[key].toString();
			return outStr;
		}));
		outputText.forEach(function(outputStr) {
			console.log(outputStr);
		});
	}
};

function installLocalProductionDependencies(name, directory) {
	var defered = q.defer();
	if(DEBUG_INSTALLATION) {
		console.log('installLocalProductionDependencies', name);
	}

	const pkgPath = path.join(directory, 'package.json');
	const pkgName = require(pkgPath).name;

	const packageDependencies = graph[pkgName];
	if (!packageDependencies) {
		throw new Error(`Could not find packageDependencies`);
	}

	packageDependencies.forEach(function(dependency) {
		if (dependency in graph) {
			const depInfo = Array.prototype.find.call(packages, function(package) {
				return (package.name == dependency)
			});
			const depPackageName = depInfo.name;
			const version = depInfo.version;
			const dependencyTar = path.join(
				'..','..','temp_publish',`${depPackageName}-${version}.tgz`
			);
			var bundle = {
				'project_path': directory,
				'required_keys': {
					'dependencies': {
					},
				},
			};
			bundle.required_keys.dependencies[depPackageName] = dependencyTar;
			editPackageKeys(bundle, true);

			if(DEBUG_INSTALLATION) {
				console.log(`${pkgPath} now dependent on ${dependencyTar}`);
			}
			// execSync(`npm install --production ${dependencyTar}`, {
			// 	'cwd': directory,
			// });

		}
	})

	if (name == 'ljswitchboard-io_manager') {
		console.log(execSync(`npm install ../../temp_publish/ljswitchboard-device_manager-1.0.0.tgz --production --loglevel silent`, {
			'cwd': directory
		}).toString('utf-8'));
	}

	defered.resolve();
	return defered.promise;
}

function innerInstallProductionDependency(name, directory) {
	var defered = q.defer();
	if(DEBUG_INSTALLATION) {
		console.log('Directory', directory);
	}

	var exec = require('child_process').exec;
	exec('npm install --production', {
		'cwd': directory,
	}, function(error, stdout, stderr) {
		if(DEBUG_INSTALLATION) {
			console.log('Finished installing', name);
			console.log({
				'error': error,
				'stdout': stdout,
				'stderr': stderr,
			});
		}
		// exec('npm update', {
		// 	'cwd': directory,
		// }, function(error, stdout, stderr) {
		// 	if(DEBUG_INSTALLATION) {
		// 		console.log('Finished updating', name);
		// 		console.log({
		// 			'error': error,
		// 			'stdout': stdout,
		// 			'stderr': stderr,
		// 		});
		// 	}
		// 	defered.resolve();
		// });
		defered.resolve();
	});
	return defered.promise;
}

function installProductionDependency(dependency) {
	var defered = q.defer();
	var name = dependency.name;
	var key = dependency.key;
	var directory = dependency.directory;
	var finishedFunc = getFinishedInstallFunc(key);

	installLocalProductionDependencies(name, directory)
	.then(function() {
		innerInstallProductionDependency(name, directory)
	})
	.then(function() {
		finishedFunc();
		defered.resolve();
	});

	return defered.promise;
}

function installProductionDependencies() {
	printStatus();
	var promises = projectDirectories.map(installProductionDependency);

	q.allSettled(promises)
	.then(function() {
		console.log('Finished Installing production dependencies');
	});
}

installProductionDependencies();
