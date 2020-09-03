/**
 * edit_package_keys.js
 *
 * Adds or replaces keys in a package.json.
 *
 * Expects to be called from cwd: labjack_kipling/ljswitchboard-builder
 */

var q = require('q');
var path = require('path');
var fse = require('fs-extra');

const labjackKiplingPackages = require('./get_labjack_kipling_packages.js');

var enableDebugging = false;
function debugLog() {
	if(enableDebugging) {
		console.log.apply(console, arguments);
	}
}

/** 
 * Adds or replaces keys in a package.json
 *
 * Param bundle must be an object with the keys:
 *   project_path - String path of the package directory.
 *   required_keys - object describing what package.json keys to add/overwrite
 *
 * Example:
 *
 * {
 *   project_path: '/Users/me/src/labjack_kipling/ljswitchboard-splash_screen',
 *   required_keys: 
 *    { topLevelKey: 
 *       { recursiveKey: 1,
 *         otherRecursiveKey: 'Hello',
 *         ... },
 *      otherTopLevelKey: true,
 *    }
 *  }
 * 
 * Param recursive is boolean describing if bundle.required_keys should be added
 * recursively or not.
 * Example: If bundle.required_keys is:
 *   "dependencies": {
 *     "thing": "../thing.tgz",
 *   }
 * And a package.json with:
 *   "dependencies": {
 *     "thing": "1.2.3",
 *     "other": "4.5.6"
 *   }
 *
 * If not recursive, it would get replaced as:
 *   "dependencies": {
 *     "thing": "../thing.tgz",
 *   }
 *
 * If recursive, would get set as:
 *   "dependencies": {
 *     "thing": "../thing.tgz",
 *     "other": "4.5.6"
 *   }
 */
function editPackageKeys(bundle, recursive=false) {
	// var defered = q.defer();

	var projectPackagePath = path.normalize(path.join(
		bundle.project_path,
		'package.json'
	));
	debugLog('Editing file', projectPackagePath);

	// Assumes same type between obj and reqKeys
	function recursiveSetKeys(key, obj, newObj) {
		// typeof will return 'object' for both objects and arrays
		if (typeof(obj[key]) == 'object' && typeof(newObj[key]) == 'object') {
			Object.keys(newObj[key]).forEach(function(deeperKey) {
				// console.log('go', deeperKey, newObj[deeperKey]);
				if (typeof(obj[key][deeperKey]) == 'object') {
					recursiveSetKeys(deeperKey, obj[key], newObj[key]);
				} else {
					obj[key][deeperKey] = newObj[key][deeperKey];
				}
			});
		} else {
			throw Error(`obj[key] (type: ${typeof obj[key]}) or newObj[key] (type: ${typeof newObj[key]}) is not an object`);
		}
	}

	function editFileContents(data) {
		var str = data.toString();
		var obj = JSON.parse(str);
		var reqKeys = bundle.required_keys;
		debugLog('Project Info', obj);
		debugLog('Required keys',reqKeys);

		// Replace info with required info.
		var keys = Object.keys(reqKeys);
		keys.forEach(function(key) {	
			if (recursive) {
				// console.log('recursiveSetKeys pre', obj, reqKeys)
				recursiveSetKeys(key, obj, reqKeys);
				// console.log('recursiveSetKeys pos', obj, reqKeys)
			} else {
				obj[key] = reqKeys[key];
			}
		});
		return obj;

		// var newStr = JSON.stringify(obj, null, 2);
		// debugLog('new str', newStr);

		// return newStr;
	}
	// function editAndSaveFile(data) {
	// 	var newData = editFileContents(data);
	// 	fse.outputFile(projectPackagePath, newData, function(err) {
	// 		if(err) {
	// 			defered.reject(err);
	// 		} else {
	// 			console.log('editAndSaveFile saved')
	// 			defered.resolve();
	// 		}
	// 	});
	// }
	const data = fse.readFileSync(projectPackagePath);
	const newData = editFileContents(data);
	fse.outputJSONSync(projectPackagePath, newData);
}

// function installLocalProductionDependencies(name, directory) {
// 	const pkgPath = path.join(directory, 'package.json');
// 	const pkgName = require(pkgPath).name;

// 	const graph = labjackKiplingPackages.getAdjacencyGraph();
// 	const packages = labjackKiplingPackages.getPackages();

// 	const packageDependencies = graph[pkgName];
// 	if (!packageDependencies) {
// 		throw new Error(`Could not find packageDependencies`);
// 	}

// 	packageDependencies.forEach(function(dependency) {
// 		if (dependency in graph) {
// 			const depInfo = Array.prototype.find.call(packages, function(package) {
// 				return (package.name == dependency)
// 			});
// 			const depPackageName = depInfo.name;
// 			const version = depInfo.version;
// 			const dependencyTar = path.join(
// 				'..','..','temp_pre_publish',`${depPackageName}-${version}.tgz`
// 			);
// 			var bundle = {
// 				'project_path': directory,
// 				'required_keys': {
// 					'dependencies': {
// 					},
// 				},
// 			};
// 			bundle.required_keys.dependencies[depPackageName] = dependencyTar;
// 			editPackageKeys(bundle, true);

// 			if(DEBUG_INSTALLATION) {
// 				console.log(`${pkgPath} now dependent on ${dependencyTar}`);
// 			}
// 			// execSync(`npm install --production ${dependencyTar}`, {
// 			// 	'cwd': directory,
// 			// });

// 		}
// 	})
// }

exports.editPackageKeys = editPackageKeys;
// exports.installLocalProductionDependencies = installLocalProductionDependencies;
