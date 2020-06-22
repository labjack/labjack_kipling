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

const startingDir = process.cwd();

const TEMP_PUBLISH_DIRECTORY = 'temp_publish';
const TEMP_PUBLISH_PATH = path.join(startingDir, TEMP_PUBLISH_DIRECTORY);

const TEMP_PRE_PUBLISH_DIRECTORY = 'temp_pre_publish';
const TEMP_PRE_PUBLISH_PATH = path.join(startingDir, TEMP_PRE_PUBLISH_DIRECTORY);

function getAllPackagesExceptBuilder() {
	var packages = getPackages();
	const index = packages.findIndex(function(el) {
		return (el.name == 'ljswitchboard-builder')
	});
	packages.splice(index, 1);
	return packages;
}

function setLocalTarDependencies() {

}

function localPublish() {
	emptyDirectory.emptyDirectoryOrDie(TEMP_PUBLISH_PATH);

	const packages = getAllPackagesExceptBuilder();
	packages.forEach(function (pkg) {
		// const packageName = path.dirname(pkg.location);
		// const prePublishPackage = path.join(TEMP_PRE_PUBLISH_DIRECTORY, packageName);
		// fse.ensureDirSync(prePublishPackage)
		// fse.copySync(pkg.location, prePublishPackage);

		console.log(childProcess.execSync(`npm pack ${pkg.location} --loglevel silent`, {
			'cwd': TEMP_PUBLISH_PATH
		}).toString('utf-8'));
	});
}

localPublish();
