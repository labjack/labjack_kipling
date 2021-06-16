'use strict';

const path = require('path');
const fs = require('fs');
const semver = require('./semver_min');
const {parseWithYauzl} = require('./parsers/parse_with_yauzl');

async function checkPackageValidity(packageInfo) {
    if (packageInfo.exists) {
        if (packageInfo.type) {
            if (packageInfo.version) {
                return true;
            }
        }
    }
    return false;
}

function getPackageVersionOfZip(packageInfo) {
    return parseWithYauzl(packageInfo);
}


async function getPackageVersionOfDirectory(packageInfo) {
    const packageDataDir = path.join(packageInfo.location, 'package.json');
    const exists = fs.existsSync(packageDataDir);

    if (exists) {
        try {
            const data = fs.readFileSync(packageDataDir);
            const packageData = JSON.parse(data);
            if (packageData.version) {
                if (semver.valid(packageData.version)) {
                    packageInfo.version = packageData.version;
                }
            }
            if (packageData.ljswitchboardDependencies) {
                packageInfo.dependencies = packageData.ljswitchboardDependencies;
            }
            return packageInfo;
        } catch (err) {
        }
    }
    return packageInfo;
}

async function checkPackageVersion(packageInfo) {
    if (packageInfo.exists) {
        if (packageInfo.type === 'directory') {
            const packageInfo2 = await getPackageVersionOfDirectory(packageInfo);
            return packageInfo2.version;
        } else if (packageInfo.type === '.zip') {
            const packageInfo2 = await getPackageVersionOfZip(packageInfo);
            return packageInfo2.version;
        }
    } else {
        return '';
    }
}

async function checkPackageType(packageInfo) {
    if (packageInfo.exists) {
        const stats = fs.statSync(packageInfo.location);
        const isFile = stats.isFile();
        const isDirectory = stats.isDirectory();

        if (isFile) {
            return path.extname(packageInfo.location);
        }
        if (isDirectory) {
            return 'directory';
        }
    }
}

async function checkForExistingDirectory(packageInfo) {
    return fs.existsSync(packageInfo.location);
}

async function checkForValidPackage(location) {
    const packageInfo = {
        'location': location,
        'exists': null,
        'version': null,
        'type': '',
        'isValid': false,
        'dependencies': {},
        'debug': '1',
    };

    packageInfo.exists = await checkForExistingDirectory(packageInfo);
    packageInfo.type = await checkPackageType(packageInfo);
    packageInfo.version = await checkPackageVersion(packageInfo);
    packageInfo.isValid = await checkPackageValidity(packageInfo);

    return packageInfo;
}

exports.checkForValidPackage = checkForValidPackage;
