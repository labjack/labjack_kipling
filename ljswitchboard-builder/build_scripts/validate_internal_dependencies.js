// validate_internal_dependencies.js
//
// See "Command-line usage" below.
'use strict';

require('./utils/error_catcher');
const child_process = require('child_process');
const fs = require('fs');
const path = require('path');
const util = require('util');
const {getBuildDirectory} = require('./utils/get_build_dir');

const labjackKiplingPackages = require('./utils/get_labjack_kipling_packages.js');

/**
 * Replacement for console.log that prepends the path of this file.
 */
function logWithInfo() {
	console.log(`${path.basename(__filename)}: `, ...arguments);
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
	logWithInfo(`validateInternalDependencies. Parsing: ${projectDir}`);

	const localCounts = {};
	// This will eventually look like:
	// {
	//    labjack-nodejs: [labjack-nodejs@2.0.0],
	//    ...
	// }
	// If an array contains multiple entries, there are duplicates of that
	// package.

	const ALL_LOCAL_PACKAGES = labjackKiplingPackages.getPackages();
	const contents = fs.readdirSync(projectDir);

	function addLocalDependencies(dependencies, localCounts) {
		for (let depKey in dependencies) {
			if (!dependencies.hasOwnProperty(depKey)) continue;

			if (isInternalDependency(depKey)) {
				const depObj = dependencies[depKey];
				if (!localCounts[depKey]) {
					localCounts[depKey] = [];
				}
				const version = depObj.version;
				if (!!version && !localCounts[depKey].find((obj) => obj.version === version)) {
					localCounts[depKey].push(depObj);
				}

				if (depObj.dependencies) {
					addLocalDependencies(depObj.dependencies, localCounts);
				}
			}
		}
	}

	function isInternalDependency(name) {
		for (let pkg in ALL_LOCAL_PACKAGES) {
			if (!ALL_LOCAL_PACKAGES.hasOwnProperty(pkg)) continue;

			if (name === ALL_LOCAL_PACKAGES[pkg].name) {
				return true;
			}
		}
		return false;
	}

	for (let item in contents) {
		if (isInternalDependency(contents[item])) {
			const depPath = path.join(projectDir, contents[item]);
			logWithInfo(`Checking ${depPath}`);
			let npmLs;
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
			const dependencyMap = JSON.parse(npmLs.toString('utf8'));

			if (dependencyMap.dependencies) {
				addLocalDependencies(dependencyMap.dependencies, localCounts);
			}
		}
	}

	logWithInfo(`${Object.keys(localCounts).length} labjack_kipling internal dependencies found while parsing ${projectDir}`);

	const duplicatesMsgs = [];
	const duplicatesObjs = [];
	for (let pkg in localCounts) {
		if (localCounts[pkg].length > 1) {
			const versions = localCounts[pkg].map(function(pkgInst) {
				return pkgInst.version;
			});
			duplicatesMsgs.push(`${pkg}: ${versions.join(', ')}`);
			const toPush = {};
			toPush[pkg] = localCounts[pkg];
			duplicatesObjs.push(toPush);
		}
	}
	if (duplicatesMsgs.length > 0) {
		for (let obj in duplicatesObjs) {
			if (!duplicatesObjs.hasOwnProperty(obj)) continue;

			const lines = util.inspect(duplicatesObjs[obj]).split('\n');
			// The default of depth=2 avoids recursing into ['dependencies'],
			// which would be too much info to output. To see the ['problems']
			// or other additional info, use `npm ls`.

			for (let i in lines) {
				logWithInfo(lines[i]);
			}
		}
		const errMsg = `Duplicate packages found: ${duplicatesMsgs.join('; ')}. See stdout or stderr for more details.`;
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
	const args = process.argv.slice(2);
	let projectDir = '';
	if (args.length === 0) {
		projectDir = path.join(getBuildDirectory(), 'temp_project_files');
	} else if (args.length === 1) {
		projectDir = args[0];
	} else {
		throw new Error(`Unexpected number of arguments. Expected 1 but got ${args.length}`);
	}

	try {
		validateInternalDependencies(projectDir);
	} catch (err) {
		console.error(err.message);
		process.exit(1);
	}
}
