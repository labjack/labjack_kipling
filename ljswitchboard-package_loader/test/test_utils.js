var assert = require('chai').assert;

var fs = require('fs.extra');
var path = require('path');
// Switch to using a local minified version of semver
// var semver = require('semver');
var semver = require('../lib/semver_min');

const PackageLoader = require('../lib/ljswitchboard-package_loader').PackageLoader;
const package_loader = new PackageLoader();

var cleanExtractionPath = function(directory) {
	try {
		// Re-initialize directory
		if(fs.existsSync(directory)) {
			fs.rmrfSync(directory);
			fs.mkdirSync(directory);
		} else {
			fs.mkdirSync(directory);
		}
	} catch(err) {
		console.log('Non-Critical error, please restart test', err);
		assert.isOk(false, 'Failed to initialize directory, restart test');
		process.exit();
	}
};
exports.cleanExtractionPath = cleanExtractionPath;

var testSinglePackageUpdate = function(assert, updatedPackages, step, upgradeType, requiredEvents, capturedEvents, index) {
	var i = 0;
	if(typeof(index) !== 'undefined') {
		i = index;
	}
	var packageKeys = Object.keys(updatedPackages);
	var packageData = updatedPackages[packageKeys[i]];
	var startingPackageInfo = packageData.currentPackage;
	var chosenUpgrade = packageData.chosenUpgrade;

	var testConditions = {
		'semverValidity': true,
		'upgradeValidity': true,
		'upgradeType': upgradeType,
		'upgradedPackage': true,
		'validUpgradeObj': true,
		'shouldHaveFailed': false,
	};
	if(step === 'initialize') {
		testConditions.semverValidity = false;
		testConditions.upgradeValidity = false;
	} else if(step === 'existingSkipUpgrade') {
		testConditions.upgradedPackage = false;
	} else if(step === 'existingPerformUpgrade') {
		// Use defaults
	} else if(step === 'noUpgradeOptions') {
		testConditions.validUpgradeObj = false;
		testConditions.upgradedPackage = false;
	} else if(step === 'upgradeFailed') {
		testConditions.semverValidity = false;
		testConditions.validUpgradeObj = false;
		testConditions.upgradedPackage = false;
		testConditions.shouldHaveFailed = true;
	}

	var isVersionValid;
	if(testConditions.semverValidity) {
		// Verify that the packageInfo object has a valid semver version
		isVersionValid = semver.valid(
			updatedPackages[packageKeys[0]].packageInfo.version
		);
		assert.isOk(isVersionValid, 'invalid initial version detected');
		assert.isOk(startingPackageInfo.isValid, 'initial package should exist');
	} else {
		// Verify that the packageInfo object does not have a valid semver
		// version indicating that it wasn't found.
		isVersionValid = semver.valid(startingPackageInfo.version);
		assert.isOk(!isVersionValid, 'invalid initial version detected');
		assert.isOk(!startingPackageInfo.isValid, 'initial package should not exist');
	}

	// Verify upgrade choice & actions
	if(testConditions.validUpgradeObj) {
		assert.strictEqual(chosenUpgrade.type, testConditions.upgradeType, 'Chosen upgrade is not a ' + testConditions.upgradeType.toString());
		assert.isOk(chosenUpgrade.isValid, 'Chosen upgrade is not valid');
	} else {
		assert.strictEqual(typeof(chosenUpgrade), 'undefined', 'chosenUpgrade should not be defined');

	}

	// Verify operation conditions
	if(testConditions.upgradedPackage) {
		assert.isOk(packageData.resetPackage, 'Should have chosen to reset the package');
		assert.isOk(packageData.performUpgrade, 'Should have chosen to upgrade the package');
	} else {
		// Reset & upgrade should not have been performed
		assert.isOk(!packageData.resetPackage, 'Should have chosen not to reset the package');
		assert.isOk(!packageData.performUpgrade, 'Should have chosen not to upgrade the package');
	}

	// Check overall errors
	if(testConditions.shouldHaveFailed) {
		assert.isOk(packageData.isError, 'Should have an error');
		assert.isOk(!packageData.overallResult, 'Should not have passed');
	} else {
		assert.isOk(!packageData.isError, 'Should not have an error');
		assert.isOk(packageData.overallResult, 'Should have passed');
	}

	var emittedEvents = [];
	capturedEvents.forEach(function(capturedEvent) {
		emittedEvents.push(capturedEvent.eventName);
	});

	var msg = 'Required events not fired';
	assert.deepEqual(emittedEvents, requiredEvents, msg);

	var requiredLibKeys = [];
	if(!testConditions.shouldHaveFailed) {
		requiredLibKeys.push('ljswitchboard-static_files');
	}
	requiredLibKeys.forEach(function(requiredLibKey) {
		if(package_loader.hasPackage(requiredLibKey)) {
			assert.isOk(true, 'found required key');
		} else {
			assert.isOk(false, 'did not find required key: ' + requiredLibKey);
		}
	});
};
exports.testSinglePackageUpdate = testSinglePackageUpdate;

