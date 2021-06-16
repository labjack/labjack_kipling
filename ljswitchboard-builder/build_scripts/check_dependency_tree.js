require('./utils/error_catcher');
const fs = require('fs');
const path = require('path');
const async = require('lj_async_0_to_x_shim');
const {getBuildDirectory} = require('./utils/get_build_dir');

const projectBaseDir = path.join(__dirname, '..', '..');
const tempProjectFilesDir = path.join(getBuildDirectory(), 'temp_project_files');

function parseCheckDependencyOptions(options) {
	const bundle = {
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
	return new Promise((resolve, reject) => {
		const pathToCheck = path.join(projectBaseDir, directoryPath, 'package.json');
		fs.readFile(pathToCheck, function(err, data) {
			if(err) {
				// not a file... ignore... this should be done more gracefully.
				// just resolve & ignore the error b/c we are either trying to read
				// a file from a directory that doesn't exist or we had an issue reading
				// a file.
				resolve(bundle);
			} else {
				// console.log('DBG: verifyAndAddProjectDir data for:', pathToCheck, typeof(data));
				const strData = data.toString();
				const jsonData = JSON.parse(strData);

				// Add the projects name to the list.
				bundle.currentProjectList.push(jsonData.name);
				bundle.currentProjectInfos.push(jsonData);
				resolve(bundle);
			}
		});

	});
}


function getCurrentProjectsList(bundle) {
	return new Promise((resolve, reject) => {

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
					resolve(bundle);
				});
			}
		});

	});
}

function verifyAndAddProjectCoreLib(bundle, directoryPath) {
	return new Promise((resolve, reject) => {

		const pathToCheck = path.join(projectBaseDir, directoryPath, 'package.json');
		fs.readFile(pathToCheck, function(err, data) {
			if(err) {
				// not a file... ignore... this should be done more gracefully.
				// just resolve & ignore the error b/c we are either trying to read
				// a file from a directory that doesn't exist or we had an issue reading
				// a file.
				resolve(bundle);
			} else {
				// console.log('DBG: verifyAndAddProjectCoreLib data for:', pathToCheck, typeof(data));
				const strData = data.toString();
				const jsonData = JSON.parse(strData);

				// Add the projects name to the list.
				bundle.coreProjectList.push(jsonData.name);
				bundle.coreProjectInfos.push(jsonData);
				resolve(bundle);
			}
		});

	});
}

function getTemporaryProjectFilesList(bundle) {
	return new Promise((resolve, reject) => {

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
					resolve(bundle);
				});
			}
		});

	});
}

function buildCoreProjectDependencyTree(bundle) {
	return new Promise((resolve, reject) => {

		async.eachSeries(bundle.coreProjectList, function(coreProjectName, cb) {
			const libInfoPath = path.join(tempProjectFilesDir, coreProjectName, 'package.json');
			const libModulesDir = path.join(tempProjectFilesDir, coreProjectName, 'node_modules');
			const libInfoStr = fs.readFileSync(libInfoPath);
			const libInfo = JSON.parse(libInfoStr);

			let libDeps = [];
			if(typeof(libInfo.dependencies) !== 'undefined') {
				libDeps = Object.keys(libInfo.dependencies);
			}

			const ljDeps = [];
			libDeps.forEach(function(libDep) {
				if(bundle.currentProjectList.indexOf(libDep) >= 0) {
					ljDeps.push(libDep);
				}
			});

			const ljDepsDbgStr = [];

			ljDeps.map(function(ljDep) {
				const ljDepInfoPath = path.join(libModulesDir, ljDep, 'package.json');
				const ljDepInfoStr = fs.readFileSync(ljDepInfoPath);
				const ljDepInfo = JSON.parse(ljDepInfoStr);

				const ljDepModulesPath = path.join(libModulesDir, ljDep, 'node_modules');
				let modules = [];
				try {
					modules = fs.readdirSync(ljDepModulesPath);
					ljDepsDbgStr.push('!! - ' + coreProjectName +
						' -- ' + ljDep +
						': ' + ljDepInfo.version
					);
					modules.map(function getModuleInfo(module) {
						const modulePkgPath = path.join(ljDepModulesPath,module,'package.json');
						const pkgInfoStr = fs.readFileSync(modulePkgPath);
						const pkgInfo = JSON.parse(pkgInfoStr);


						const retObj = {'name': pkgInfo.name, 'version': pkgInfo.version};
						ljDepsDbgStr.push('!! - ' + coreProjectName +
							' -- ' + ljDep +
							' -- ' + pkgInfo.name +
							': ' + pkgInfo.version
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

					ljDepsDbgStr.push('   - ' + coreProjectName +
						' -- ' + ljDep +
						': ' + ljDepInfo.version
					);
				}
			});

			bundle.coreProjectDepDbgStrs.push(ljDepsDbgStr);
			cb();

		}, function(err) {
			resolve(bundle);
		});

	});
}

/*
 * This function prints out where each dependency is defined
 * if there are any LJ written/mantained dependencies


This is an array of objects with keys:
{'coreProjectName':str, 'dependencyName':str, 'definedVersion':str, 'duplicatedVersion':str,}

conflictingLibLocations: [],

 */
function findDefinedConflictingLibDefinitions(bundle) {
	return new Promise((resolve, reject) => {

		if(bundle.conflictingLibs.length > 0) {

			bundle.currentProjectInfos.forEach(function(ljProjectInfo) {
				let dependencyKeys = [];
				if(typeof(ljProjectInfo.dependencies) !== 'undefined') {
					dependencyKeys = Object.keys(ljProjectInfo.dependencies);
				}

				dependencyKeys.forEach(function(dependencyKey) {
					const dependencyVersion = ljProjectInfo.dependencies[dependencyKey];


					bundle.conflictingLibs.forEach(function(conflictingLib) {
						if(conflictingLib.name === dependencyKey) {
							bundle.conflictingLibLocationsDbgStr.push(
								dependencyKey + '(' + (conflictingLib.version).green + '): ' +
								'defined in: ' + (ljProjectInfo.name).green +
								', def version: ' + (dependencyVersion).green
							);
						}
					});

					bundle.conflictingLibLocations.push({
						coreProjectName: ljProjectInfo,
						dependencyName: dependencyKey,
						definedVersion: dependencyVersion,
						// dduplicatedVersion:
					});
				});
			});
		}

		resolve(bundle);
	});
}
function checkDependencies(options) {
	return new Promise((resolve, reject) => {
		const bundle = parseCheckDependencyOptions(options);

		function getErrorHandler(step) {
			return function errorHandler(bundle) {
				return Promise.reject(bundle);
			};
		}
		getCurrentProjectsList(bundle)
		.then(getTemporaryProjectFilesList, getErrorHandler('getCurrentProjectsList'))
		.then(buildCoreProjectDependencyTree, getErrorHandler('getTemporaryProjectFilesList'))
		.then(findDefinedConflictingLibDefinitions, getErrorHandler('buildCoreProjectDependencyTree'))
		.then(resolve, getErrorHandler('findDefinedConflictingLibDefinitions'))
		.then(resolve, reject);
	});
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



