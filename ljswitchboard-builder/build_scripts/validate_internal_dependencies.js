// validate_internal_dependencies.js
//
// See "Command-line usage" below.
'use strict';


const child_process = require('child_process');
const fs = require('fs');
const path = require('path');

const labjackKiplingPackages = require('./get_labjack_kipling_packages.js');

const startingDir = process.cwd();

/**
 * Replacement for console.log that prepends the path of this file.
 */
function logWithPath() {
	console.log(`${path.basename(__filename)}, cwd: ${startingDir} - `, ...arguments);
}

/**
 * @param {string} versionedName - A versioned package name, like: labjack-nodejs@2.0.0
 * @return {string} - A non-versioned name, like: labjack-nodejs
 */
function getBaseName(versionedName) {
	var amperIndex = versionedName.indexOf('@');
	if (amperIndex === -1) {
		throw TypeError(`Expected versioned name, but got ${versionedName}`);
	}
	return versionedName.slice(0, amperIndex);
}

/**
 * Checks projectDir recursively for labjack_kipling internal dependencies.
 * Outputs to console information, and throws if there are multiple versions
 * internal deps.
 * @throws {Error} - Throws a generic error if there are duplicate internal deps.
 * @param {string} projectDir - The project root path, which should contain
 *   labjack_kipling internal dependencies, like ljswitchboard-kipling. Each
 *   internal dep should have had its own dependencies installed, but unmet
 *   dependencies (as reported by `npm ls`) are ignored.
 */
function validateInternalDependencies(projectDir) {
	var localCounts = {};
	// This will eventually look like:
	// {
	//    labjack-nodejs: [labjack-nodejs@2.0.0],
	//    ...
	// }
	// If an array contains multiple entries, there are duplicates of that
	// package.

	const ALL_LOCAL_PACKAGES = labjackKiplingPackages.getPackages();
	const contents = fs.readdirSync(projectDir);
	for (var item in contents) {
		function isInternalDepencency(name) {
			for (var pkg in ALL_LOCAL_PACKAGES) {
				if (name == ALL_LOCAL_PACKAGES[pkg].name) {
					return true;
				}
			}
			return false;
		};
		if (isInternalDepencency(contents[item])) {
			const depPath = path.join(projectDir, contents[item]);
			logWithPath(`Checking ${depPath}`);
			var npmLs;
			try {
				npmLs = child_process.execSync('npm ls --json', {
						'cwd': depPath
					}
				);
			} catch (error) {
				if (error.error) {
					throw error;
				}

				// If a package has unmet dependencies, an error is thrown.
				npmLs = error.stdout.toString('utf8');
			}
			var dependencyMap = JSON.parse(npmLs.toString('utf8'));

			function addLocalDependencies(dependencies, localCounts) {
				for (var depKey in dependencies) {
					if (isInternalDepencency(depKey)) {
						var depObj = dependencies[depKey];
						if (!localCounts[depKey]) {
							localCounts[depKey] = [];
						}
						var vers = depObj.version;
						if (!localCounts[depKey].includes(vers)) {
							localCounts[depKey].push(vers);
						}

						if (depObj['dependencies']) {
							addLocalDependencies(depObj['dependencies'], localCounts);
						}
					}
				}
			}

			if (dependencyMap['dependencies']) {
				addLocalDependencies(dependencyMap['dependencies'], localCounts);
			}
		}
	}

	logWithPath(`${Object.keys(localCounts).length} labjack_kipling internal dependencies found while parsing ${projectDir}`);

	var duplicates = [];
	for (var pkg in localCounts) {
		if (localCounts[pkg].length > 1) {
			duplicates.push(`${pkg}: ${localCounts[pkg].join(', ')}`);
		}
	}
	if (duplicates.length > 0) {
		var errMsg = `Duplicate packages found: ${duplicates.join('; ')}`;
		logWithPath(`  ${errMsg}`);
		throw new Error(errMsg);
	}
}

module.exports = validateInternalDependencies;


/**
 * Command-line usage:
 *   node validatate_internal_dependencies.js [PATH]
 *
 *   PATH - Absolute or relative path. Default: ./temp_project_files
 *          (This default is for conveniences when called from the
 *          ljswitchboard-builder build scripts.)
 */
if (require.main === module) {
	var args = process.argv.slice(2);
	var projectDir = '';
	if (args.length === 0) {
		projectDir = path.join(startingDir, 'temp_project_files');
	} else if (args.length === 1) {
		projectDir = args[0];
	} else {
		throw new Error(`Unexpected number of arguments. Expected 1 but got ${args.length}`);
	}

	logWithPath(`validateInternalDependencies: ${projectDir}`)
	validateInternalDependencies(projectDir);
}
