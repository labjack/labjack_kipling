var errorCatcher = require('./error_catcher');
var fs = require('fs');
var fse = require('fs-extra');
var fsex = require('fs.extra');
var path = require('path');
var q = require('q');
var cwd = process.cwd();
var rimraf = require('rimraf');
var async = require('lj_async_0_to_x_shim');
var colors = require('colors');

var projectBaseDir = path.join(__dirname, '..', '..');
var tempProjectFilesDir = path.join(__dirname, '..', 'temp_project_files');

function parseCheckDependencyOptions(options) {
	var bundle = {
		// Options

		// Bundled Variables
		currentProjectList: [], // A list of all of the project names
		currentProjectInfos: [], // A list of objects representing each project package.json

		coreProjectList: [],
		coreProjectInfos: [],
		coreProjectDepTree: [],
		coreProjectDepDbgStrs: [],

		/* 
		 * This is an array of objects with keys:
		 * {'coreProjectName': str, 'ljDep': str, 'name': str, 'version':}
		 */
		conflictingLibs: [],

		/*
		 * This is an array of objects with keys:
		 * {'coreProjectName':str, 'dependencyName':str, 'definedVersion':str, 'duplicatedVersion':str,}
		 */
		conflictingLibLocations: [],
		conflictingLibLocationsDbgStr: [],

		// error variables
		isError: false,
		errorObj: null,
		errorMessage: '',
		errorCode: 0,
	};
	return bundle;
}

function verifyAndAddProjectDir(bundle, directoryPath) {
	var defered = q.defer();

	var pathToCheck = path.join(projectBaseDir, directoryPath, 'package.json');
	fs.readFile(pathToCheck, function(err, data) {
		if(err) {
			// not a file... ignore... this should be done more gracefully.
			// just resolve & ignore the error b/c we are either trying to read
			// a file from a directory that doesn't exist or we had an issue reading
			// a file.
			defered.resolve(bundle);
		} else {
			// console.log('DBG: verifyAndAddProjectDir data for:', pathToCheck, typeof(data));
			var strData = data.toString();
			var jsonData = JSON.parse(strData);

			// Add the projects name to the list.
			bundle.currentProjectList.push(jsonData.name);
			bundle.currentProjectInfos.push(jsonData);
			defered.resolve(bundle);
		}
	});

	return defered.promise;
}


function getCurrentProjectsList(bundle) {
	var defered = q.defer();

	fs.readdir(projectBaseDir, function dirs(err, files) {
		if(err) {
			bundle.isError = true;
			bundle.errorObj = err;
			bundle.errorMessage = 'Error reading directory: ' + tempProjectFilesDir + '. Error: ' + err.toString();
		} else {
			async.eachSeries(files, function(file, cb) {
				verifyAndAddProjectDir(bundle, file)
				.then(function(res) {
					cb();
				}, function(err) {
					cb();
				});
			}, function(err) {
				defered.resolve(bundle);
			});
		}
	});

	return defered.promise;
}

function verifyAndAddProjectCoreLib(bundle, directoryPath) {
	var defered = q.defer();

	var pathToCheck = path.join(projectBaseDir, directoryPath, 'package.json');
	fs.readFile(pathToCheck, function(err, data) {
		if(err) {
			// not a file... ignore... this should be done more gracefully.
			// just resolve & ignore the error b/c we are either trying to read
			// a file from a directory that doesn't exist or we had an issue reading
			// a file.
			defered.resolve(bundle);
		} else {
			// console.log('DBG: verifyAndAddProjectCoreLib data for:', pathToCheck, typeof(data));
			var strData = data.toString();
			var jsonData = JSON.parse(strData);

			// Add the projects name to the list.
			bundle.coreProjectList.push(jsonData.name);
			bundle.coreProjectInfos.push(jsonData);
			defered.resolve(bundle);
		}
	});

	return defered.promise;
}

function getTemporaryProjectFilesList(bundle) {
	var defered = q.defer();

	fs.readdir(tempProjectFilesDir, function dirs(err, files) {
		if(err) {
			bundle.isError = true;
			bundle.errorObj = err;
			bundle.errorMessage = 'Error reading directory: ' + projectBaseDir + '. Error: ' + err.toString();
		} else {
			async.eachSeries(files, function(file, cb) {
				verifyAndAddProjectCoreLib(bundle, file)
				.then(function(res) {
					cb();
				}, function(err) {
					cb();
				});
			}, function(err) {
				defered.resolve(bundle);
			});
		}
	});

	return defered.promise;
}

function buildCoreProjectDependencyTree(bundle) {
	var defered = q.defer();

	async.eachSeries(bundle.coreProjectList, function(coreProjectName, cb) {
		var libInfoPath = path.join(tempProjectFilesDir, coreProjectName, 'package.json');
		var libModulesDir = path.join(tempProjectFilesDir, coreProjectName, 'node_modules');
		var libInfoStr = fs.readFileSync(libInfoPath);
		var libInfo = JSON.parse(libInfoStr);

		var libDeps = [];
		if(typeof(libInfo.dependencies) !== 'undefined') {
			libDeps = Object.keys(libInfo.dependencies);
		}

		var ljDeps = [];
		libDeps.forEach(function(libDep) {
			if(bundle.currentProjectList.indexOf(libDep) >= 0) {
				ljDeps.push(libDep);
			}
		});

		var ljDepsDbgStr = [];

		var ljDepModulesDir = ljDeps.map(function(ljDep) {
			var ljDepInfoPath = path.join(libModulesDir, ljDep, 'package.json');
			var ljDepInfoStr = fs.readFileSync(ljDepInfoPath);
			var ljDepInfo = JSON.parse(ljDepInfoStr);

			var ljDepModulesPath = path.join(libModulesDir, ljDep, 'node_modules');
			var modules = [];
			var moduleInfos = []
			try {
				modules = fs.readdirSync(ljDepModulesPath);
				ljDepsDbgStr.push('!! - ' + coreProjectName
					+ ' -- ' + ljDep
					+ ': ' + ljDepInfo.version
				);
				moduleInfos = modules.map(function getModuleInfo(module) {
					var modulePkgPath = path.join(ljDepModulesPath,module,'package.json');
					var pkgInfoStr = fs.readFileSync(modulePkgPath);
					var pkgInfo = JSON.parse(pkgInfoStr);


					var retObj = {'name': pkgInfo.name, 'version': pkgInfo.version};
					ljDepsDbgStr.push('!! - ' + coreProjectName
						+ ' -- ' + ljDep
						+ ' -- ' + pkgInfo.name
						+ ': ' + pkgInfo.version
					);

					bundle.conflictingLibs.push({
						'coreProjectName': coreProjectName,
						'ljDep': ljDep,
						'name': pkgInfo.name,
						'version': pkgInfo.version
					});
					return retObj;
				});
			} catch(err) {
				// Caught an error, so the node_modules directory doesn't exist.
				// This is good and the "modules" array should remain empty.

				ljDepsDbgStr.push('   - ' + coreProjectName
					+ ' -- ' + ljDep
					+ ': ' + ljDepInfo.version
				);
			}
		});

		bundle.coreProjectDepDbgStrs.push(ljDepsDbgStr);
		cb();

	}, function(err) {
		defered.resolve(bundle);
	});

	return defered.promise;
}

/*
 * This function prints out where each dependency is defined
 * if there are any LJ written/mantained dependencies 


This is an array of objects with keys:
{'coreProjectName':str, 'dependencyName':str, 'definedVersion':str, 'duplicatedVersion':str,}

conflictingLibLocations: [],

 */
function findDefinedConflictingLibDefinitions(bundle) {
	var defered = q.defer();

	if(bundle.conflictingLibs.length > 0) {

		bundle.currentProjectInfos.forEach(function(ljProjectInfo) {
			var dependencyKeys = [];
			if(typeof(ljProjectInfo.dependencies) !== 'undefined') {
				dependencyKeys = Object.keys(ljProjectInfo.dependencies);
			}

			dependencyKeys.forEach(function(dependencyKey) {
				var dependencyVersion = ljProjectInfo.dependencies[dependencyKey];


				bundle.conflictingLibs.forEach(function(conflictingLib) {
					if(conflictingLib.name === dependencyKey) {
						bundle.conflictingLibLocationsDbgStr.push(
							dependencyKey + '(' + (conflictingLib.version).green + '): '
							+ 'defined in: ' + (ljProjectInfo.name).green
							+ ', def version: ' + (dependencyVersion).green
							// + ', found version: ' + conflictingLib.version
						);
					}
				});

				bundle.conflictingLibLocations.push({
					coreProjectName: ljProjectInfo,
					dependencyName: dependencyKey,
					definedVersion: dependencyVersion,
					// dduplicatedVersion:
				})
			});
		});
	}

	defered.resolve(bundle);
	return defered.promise;
}
function checkDependencies(options) {
	var defered = q.defer();

	var bundle = parseCheckDependencyOptions(options);

	function getErrorHandler(step) {
		return function errorHandler(bundle) {
			var innerDefered = q.defer();
			innerDefered.reject(bundle);
			return innerDefered.promise;
		}
	};
	getCurrentProjectsList(bundle)
	.then(getTemporaryProjectFilesList, getErrorHandler('getCurrentProjectsList'))
	.then(buildCoreProjectDependencyTree, getErrorHandler('getTemporaryProjectFilesList'))
	.then(findDefinedConflictingLibDefinitions, getErrorHandler('buildCoreProjectDependencyTree'))
	.then(defered.resolve, getErrorHandler('findDefinedConflictingLibDefinitions'))
	.then(defered.resolve, defered.reject);
	return defered.promise;
}

checkDependencies()
.then(function(res) {
	console.log('Result', Object.keys(res));
	// console.log('Result', res.currentProjectList);
	// console.log('Result', res.coreProjectList); // Print the list of core K3 project parts.
	// console.log('Deps:', res.coreProjectDepDbgStrs); // Print a list of LJ dependencies of K3 project parts & whether or not they are flat.
	console.log('Deps:', res.conflictingLibs);
	console.log('Dep Location strs:\n', res.conflictingLibLocationsDbgStr.join('\n'));
}, function(err) {
	console.log('Err', err);
});



