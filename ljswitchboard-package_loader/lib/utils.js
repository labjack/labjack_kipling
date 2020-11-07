const path = require('path');
const fs = require('fs');
const semver = require('./semver_min');

const parse_with_yauzl = require('./parsers/parse_with_yauzl');
const parseWithYauzl = parse_with_yauzl.parseWithYauzl;

const DEBUG_PACKAGE_EXTRACTION_STEPS = false;
function debugSteps () {
    if(DEBUG_PACKAGE_EXTRACTION_STEPS) {
        console.log.apply(console, arguments);
    }
}
function debugPackageChecking () {
    if(DEBUG_PACKAGE_EXTRACTION_STEPS) {
        console.log.apply(console, arguments);
    }
}

function checkPackageValidity(packageInfo) {
    debugPackageChecking('in checkPackageValidity');
    return new Promise((resolve) => {
        if (packageInfo.exists) {
            if (packageInfo.type) {
                if (packageInfo.version) {
                    packageInfo.isValid = true;
                }
            }
        }
        resolve(packageInfo);
    });
}

function getPackageVersionOfZip(packageInfo) {
    // return parseWithUnzip(packageInfo);
    debugPackageChecking('in getPackageVersionOfZip', packageInfo);
    return parseWithYauzl(packageInfo);
}


function getPackageVersionOfDirectory(packageInfo) {
    return new Promise((resolve) => {
        const packageDataDir = path.join(packageInfo.location, 'package.json');
        const finishFunc = function (data) {
            try {
                const packageData = JSON.parse(data);
                if (packageData.version) {
                    if (semver.valid(packageData.version)) {
                        packageInfo.version = packageData.version;
                    }
                }
                if (packageData.ljswitchboardDependencies) {
                    packageInfo.dependencies = packageData.ljswitchboardDependencies;
                }
                resolve(packageInfo);
            } catch (jsonParseError) {
                resolve(packageInfo);
            }
        };
        fs.exists(packageDataDir, function (exists) {
            if (exists) {
                fs.readFile(packageDataDir, function (err, data) {
                    if (err) {
                        fs.readFile(packageDataDir, function (err, data) {
                            if (err) {
                                fs.readFile(packageDataDir, function (err, data) {
                                    if (err) {
                                        resolve(packageInfo);
                                    } else {
                                        finishFunc(data);
                                    }
                                });
                            } else {
                                finishFunc(data);
                            }
                        });
                    } else {
                        finishFunc(data);
                    }
                });
            } else {
                resolve(packageInfo);
            }
        });
    });
}

async function checkPackageVersion(packageInfo) {
    packageInfo.version = '';
    if (packageInfo.exists) {
        if (packageInfo.type === 'directory') {
            return await getPackageVersionOfDirectory(packageInfo);
        } else if (packageInfo.type === '.zip') {
            return await getPackageVersionOfZip(packageInfo);
        } else {
            return packageInfo;
        }
    } else {
        return packageInfo;
    }
}

function checkPackageType(packageInfo) {
    return new Promise((resolve) => {
        if (packageInfo.exists) {
            fs.stat(packageInfo.location, function (err, stats) {
                if (err) {
                    packageInfo.type = '';
                    resolve(packageInfo);
                } else {
                    var isFile = stats.isFile();
                    var isDirectory = stats.isDirectory();

                    packageInfo.type = '';
                    if (isFile) {
                        packageInfo.type = path.extname(packageInfo.location);
                    }
                    if (isDirectory) {
                        packageInfo.type = 'directory';
                    }
                    resolve(packageInfo);
                }
            });
        } else {
            packageInfo.type = '';
            resolve(packageInfo);
        }
    });
}

function checkForExistingDirectory(packageInfo) {
    packageInfo.debug = '1';
    return new Promise((resolve) => {
        fs.exists(packageInfo.location, (exists) => {
            packageInfo.exists = exists;
            resolve(packageInfo);
        });
    });
}

function checkForValidPackage(location) {
    debugPackageChecking('in checkForValidPackage', location);
    return new Promise((resolve) => {
        const packageInfo = {
            'location': location,
            'exists': null,
            'version': null,
            'type': null,
            'isValid': false,
            'dependencies': {}
        };

        checkForExistingDirectory(packageInfo)
            .then(checkPackageType)
            .then(checkPackageVersion)
            .then(checkPackageValidity)
            .then((info) => {
                resolve(info);
            });
    });
}

exports.debugSteps = debugSteps;
exports.checkForValidPackage = checkForValidPackage;
