
var fs = require('fs.extra');
var path = require('path');
// Switch to using a local minified version of semver
// var semver = require('semver');
var semver = require('../lib/semver_min');

var package_loader = require('../lib/ljswitchboard-package_loader');

var cleanExtractionPath = function(test, directory) {
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
		test.ok(false, 'Failed to initialize directory, restart test');
		process.exit();
	}
};
exports.cleanExtractionPath = cleanExtractionPath;

var testSinglePackageUpdate = function(test, updatedPackages, step, upgradeType, requiredEvents, capturedEvents, index) {
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
		test.ok(isVersionValid, 'invalid initial version detected');
		test.ok(startingPackageInfo.isValid, 'initial package should exist');
	} else {
		// Verify that the packageInfo object does not have a valid semver 
		// version indicating that it wasn't found.
		isVersionValid = semver.valid(startingPackageInfo.version);
		test.ok(!isVersionValid, 'invalid initial version detected');
		test.ok(!startingPackageInfo.isValid, 'initial package should not exist');
	}
	
	// Verify upgrade choice & actions
	if(testConditions.validUpgradeObj) {
		test.strictEqual(chosenUpgrade.type, testConditions.upgradeType, 'Chosen upgrade is not a ' + testConditions.upgradeType.toString());
		test.ok(chosenUpgrade.isValid, 'Chosen upgrade is not valid');
	} else {
		test.strictEqual(typeof(chosenUpgrade), 'undefined', 'chosenUpgrade should not be defined');
		
	}
	
	// Verify operation conditions
	if(testConditions.upgradedPackage) {
		test.ok(packageData.resetPackage, 'Should have chosen to reset the package');
		test.ok(packageData.performUpgrade, 'Should have chosen to upgrade the package');
	} else {
		// Reset & upgrade should not have been performed
		test.ok(!packageData.resetPackage, 'Should have chosen not to reset the package');
		test.ok(!packageData.performUpgrade, 'Should have chosen not to upgrade the package');
	}
	
	// Check overall errors
	if(testConditions.shouldHaveFailed) {
		test.ok(packageData.isError, 'Should have an error');
		test.ok(!packageData.overallResult, 'Should not have passed');
	} else {
		test.ok(!packageData.isError, 'Should not have an error');
		test.ok(packageData.overallResult, 'Should have passed');
	}
	
	var emittedEvents = [];
	capturedEvents.forEach(function(capturedEvent) {
		emittedEvents.push(capturedEvent.eventName);
	});
	
	// console.log(emittedEvents.length, requiredEvents.length);
	// emittedEvents.forEach(function(emittedEvent, i) {
	// 	console.log(emittedEvent,' : ', requiredEvents[i]);
	// });
	var msg = 'Required events not fired';
	test.deepEqual(emittedEvents, requiredEvents, msg);
	
	// Check to make sure that the library was properly loaded into the
	// global[cns] aka global.labjackswitchboardData name space.
	var cns = package_loader.getNameSpace();
	var loadedLibKeys = Object.keys(global[cns]);

	var requiredLibKeys = [];
	if(!testConditions.shouldHaveFailed) {
		requiredLibKeys.push('@labjack/ljswitchboard-static_files');
	}
	requiredLibKeys.forEach(function(requiredLibKey) {
		if(loadedLibKeys.indexOf(requiredLibKey) >= 0) {
			test.ok(true, 'found required key');
			// console.log('Required Data', global[cns][requiredLibKey]);
		} else {
			test.ok(false, 'did not find required key: ' + requiredLibKey);
			console.log('loadedLibKeys', loadedLibKeys);
		}
	});	
};
exports.testSinglePackageUpdate = testSinglePackageUpdate;

