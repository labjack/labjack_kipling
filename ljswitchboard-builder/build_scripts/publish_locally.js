/**
 * publish_locally.js
 *
 * See description in ljswitchboard-builder/README.md
 *
 * Expects to be called from cwd: labjack_kipling/ljswitchboard-builder
 */

const childProcess = require('child_process')
const path = require('path');

const fse = require('fs-extra');
const q = require('q');

const emptyDirectory = require('./empty_directory');
const getPackages = require('./get_labjack_kipling_packages.js').getPackages;

const execSync = require('child_process').execSync;
const labjackKiplingPackages = require('./get_labjack_kipling_packages.js');
const editPackageKeys = require('./edit_package_keys.js').editPackageKeys;


const startingDir = process.cwd();

const TEMP_STAGING_DIRECTORY = 'temp_staging';
const TEMP_STAGING_PATH = path.join(startingDir, TEMP_STAGING_DIRECTORY);

const TEMP_TAR_DIRECTORY = 'temp_tar';
const TEMP_TAR_PATH = path.join(startingDir, TEMP_TAR_DIRECTORY);

const GRAPH = labjackKiplingPackages.getAdjacencyGraph();
const PACKAGES = getAllPackagesExceptBuilder();

const DEBUG_PUBLISH = true;

function getAllPackagesExceptBuilder() {
	var packages = getPackages();
	const index = packages.findIndex(function(el) {
		return (el.name == 'ljswitchboard-builder')
	});
	packages.splice(index, 1);
	return packages;
}

function setLocalAbsoluteDependencies() {
	for (package in PACKAGES) {
		const packageFolder = path.basename(PACKAGES[package].location);
		const publishedPath = path.join(TEMP_STAGING_PATH, packageFolder);
		innerSetLocalAbsoluteDependencies(publishedPath);
	}
}

/**
 * For a packageDirectory containing a package.json, sets all internal
 * dependencies for that package.json to resolve to local-machine absolute
 * paths.
 */
function innerSetLocalAbsoluteDependencies(packageDirectory) {
	var defered = q.defer();

	const pkgPath = path.join(packageDirectory, 'package.json');
	const pkgName = require(pkgPath).name;

	if(DEBUG_PUBLISH) {
		console.log('innerSetLocalAbsoluteDependencies', pkgName);
	}

	const packageDependencies = GRAPH[pkgName];
	if (!packageDependencies) {
		throw new Error(`Could not find packageDependencies`);
	}

	function getTarPath(depPackageName, version) {
		return path.join(
			TEMP_TAR_PATH,`${depPackageName}-${version}.tgz`
		);
	}

	function getDependencyInfo(dependencyName) {
		return Array.prototype.find.call(PACKAGES, function(package) {
			return (package.name == dependencyName)
		});
	}

	packageDependencies.forEach(function(dependencyName) {
		if (dependencyName in GRAPH) {
			const depInfo = getDependencyInfo(dependencyName);
			const depPackageName = depInfo.name;
			const version = depInfo.version;
			const dependencyTar = getTarPath(depPackageName, version);
			var bundle = {
				'project_path': packageDirectory,
				'required_keys': {
					'dependencies': {
					},
				},
			};
			bundle.required_keys.dependencies[depPackageName] = `file:${dependencyTar}`;
			editPackageKeys(bundle, true);

			if(DEBUG_PUBLISH) {
				console.log(`${pkgPath} now dependent on ${dependencyTar}`);
			}
		}
	})

	// Implicit dependency (for now)
	if (pkgName == 'ljswitchboard-io_manager') {
		var bundle = {
			'project_path': packageDirectory,
			'required_keys': {
				'dependencies': {
				},
			},
		};
		const depInfo = getDependencyInfo('ljswitchboard-device_manager');
		const deviceManagerTar = getTarPath(depInfo.name, depInfo.version);
		bundle.required_keys.dependencies['ljswitchboard-device_manager'] = `file:${deviceManagerTar}`;
		editPackageKeys(bundle, true);
		if(DEBUG_PUBLISH) {
			console.log(`Added extra dependency: ${pkgPath} now dependent on ${deviceManagerTar}`);
		}
		// console.log(
		// 	execSync(`npm install ${deviceManagerPath} --production --loglevel silent`, {
		// 		'cwd': packageDirectory
		// 	}).toString('utf-8')
		// );
	}

	defered.resolve();
	return defered.promise;
}

/**
 * Copy all Kipling modules from their normal locations in labjack_kipling to
 * labjack_kipling/ljswitchboard-builder/temp_staging.
 */
function createStagingCopies() {
	emptyDirectory.emptyDirectoryOrDie(TEMP_STAGING_PATH);

	PACKAGES.forEach(function (pkg) {
		const packageFolder = path.basename(pkg.location);

		function filterFunc(src) {
			if (src.includes('node_modules')) {
				return false;
			}
			return true;
		}

		const dest = path.join(TEMP_STAGING_PATH, packageFolder);
		fse.copySync(pkg.location, dest, filterFunc);

		// This is a lot of nested empty directories.
		fse.removeSync(path.join(dest, 'node_modules'));
	});
}

/**
 * Generates tar files in temp_tar from the packages in temp_staging.
 */
function generateLocalTars() {
	emptyDirectory.emptyDirectoryOrDie(TEMP_TAR_PATH);

	PACKAGES.forEach(function (pkg) {
		const packageFolder = path.basename(pkg.location);
		const packageTempLocation = path.join(TEMP_STAGING_PATH, packageFolder)
		console.log(childProcess.execSync(`npm pack ${packageTempLocation} --loglevel silent`, {
			'cwd': TEMP_TAR_PATH
		}).toString('utf-8'));
	});
}

function publishLocally() {
	createStagingCopies();
	setLocalAbsoluteDependencies();
	generateLocalTars();
}

publishLocally();

