/**
 * publish_locally.js
 *
 * See description in ljswitchboard-builder/README.md
 *
 * Expects to be called from cwd: labjack_kipling/ljswitchboard-builder
 */

require('./utils/error_catcher');

const childProcess = require('child_process');
const path = require('path');

const emptyDirectory = require('./utils/empty_directory');
const {getPackages} = require('./utils/get_labjack_kipling_packages.js');
const {getBuildDirectory} = require('./utils/get_build_dir');

const TEMP_PUBLISH_PATH = path.join(getBuildDirectory(), 'temp_publish');

function getAllPackagesExceptBuilder() {
	const packages = getPackages();
	const index = packages.findIndex(function(el) {
		return (el.name === 'ljswitchboard-builder');
	});
	packages.splice(index, 1);
	return packages;
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
		}).toString('utf-8').trim());
	});
}

localPublish();
