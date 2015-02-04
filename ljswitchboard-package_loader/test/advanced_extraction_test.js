

var package_loader = require('../lib/ljswitchboard-package_loader');

var capturedEvents = [];

var saveEvent = function(name, info) {
	capturedEvents.push({'eventName': name, 'data': info});
};

// Attach listeners to all of the events defined by the package_loader
var eventList = package_loader.eventList;
var eventListKeys = Object.keys(eventList);
eventListKeys.forEach(function(eventKey) {
	var eventName = package_loader.eventList[eventKey];
	package_loader.on(eventName, function(data) {
		// console.log('Event Fired', eventName);
		saveEvent(eventName, data);
	});
});


var fs = require('fs.extra');
var path = require('path');
var localFolder = 'test_extraction_folder';
var directory = '';
// Switch to using a local minified version of semver
// var semver = require('semver');
var semver = require('../lib/semver_min');

var testPackages = require('./test_packages').testPackages;
var testUtils = require('./test_utils');
var cleanExtractionPath = testUtils.cleanExtractionPath;
var testSinglePackageUpdate = testUtils.testSinglePackageUpdate;




var testDurationTimes = [];
var currentTestStartTime;

var reInitializeTest = function(test) {
	// Erase the current data
	cleanExtractionPath(test, directory);

	// Clear the fired-events list
	capturedEvents = [];

	// add the staticFiles package to the packageManager
	package_loader.loadPackage(testPackages.staticFiles);

	package_loader.runPackageManager()
	.then(function(updatedPackages) {
		// Define the required event list
		var requiredEvents = [
			eventList.PACKAGE_MANAGEMENT_STARTED,
			eventList.VALID_UPGRADE_DETECTED,
			eventList.DETECTED_UNINITIALIZED_PACKAGE,
			eventList.STARTING_EXTRACTION,
			eventList.STARTING_DIRECTORY_EXTRACTION,
			eventList.FINISHED_EXTRACTION,
			eventList.FINISHED_DIRECTORY_EXTRACTION,
			eventList.LOADED_PACKAGE,
		];

		testSinglePackageUpdate(
			test,
			updatedPackages,
			'initialize',
			'directory',
			requiredEvents,
			capturedEvents
		);
		test.done();
	}, function(err) {
		test.ok(false, 'failed to run the packageManager');
		test.done();
	});
};
var tests = {
	'setUp': function(callback) {
		currentTestStartTime = new Date();
		callback();
	},
	'tearDown': function(callback) {
		var startTime = currentTestStartTime;
		var endTime = new Date();
		var duration = new Date(endTime - startTime);
		testDurationTimes.push({
			'startTime': startTime,
			'endTime': endTime,
			'duration': duration
		});
		package_loader.deleteAllManagedPackages();
		callback();
	},
	'configure the extraction path': function(test) {
		directory = path.join(process.cwd(), localFolder);
		
		cleanExtractionPath(test, directory);

		package_loader.setExtractionPath(directory);

		// add the staticFiles package to the packageManager
		package_loader.loadPackage(testPackages.staticFiles);
		test.done();
	}, 
	're-initialize extracted data to std option': reInitializeTest,
	'Run old before new test': function(test) {
		// Clear the fired-events list
		capturedEvents = [];

		// add the staticFiles package to the packageManager
		package_loader.loadPackage(testPackages.staticFilesOldBeforeNew);

		package_loader.runPackageManager()
		.then(function(updatedPackages) {
			// Define the required event list
			var requiredEvents = [
				eventList.PACKAGE_MANAGEMENT_STARTED,
				eventList.VALID_UPGRADE_DETECTED,
				eventList.RESETTING_PACKAGE,
				eventList.FINISHED_RESETTING_PACKAGE,
				eventList.STARTING_EXTRACTION,
				eventList.STARTING_DIRECTORY_EXTRACTION,
				eventList.FINISHED_EXTRACTION,
				eventList.FINISHED_DIRECTORY_EXTRACTION,
				eventList.LOADED_PACKAGE,
			];

			testSinglePackageUpdate(
				test,
				updatedPackages,
				'existingPerformUpgrade',
				'directory',
				requiredEvents,
				capturedEvents
			);
			test.done();
		}, function(err) {
			test.ok(false, 'failed to run the packageManager');
			test.done();
		});
	},
	're-initialize data for stdDir-newZip': reInitializeTest,
	'Run std before new test': function(test) {
		// Clear the fired-events list
		capturedEvents = [];

		// add the staticFiles package to the packageManager
		package_loader.loadPackage(testPackages.staticFilesStdDirBeforeNewZip);

		package_loader.runPackageManager()
		.then(function(updatedPackages) {
			// console.log('Results', updatedPackages);
			// Define the required event list
			var requiredEvents = [
				eventList.PACKAGE_MANAGEMENT_STARTED,
				eventList.VALID_UPGRADE_DETECTED,
				eventList.RESETTING_PACKAGE,
				eventList.FINISHED_RESETTING_PACKAGE,
				eventList.STARTING_EXTRACTION,
				eventList.STARTING_ZIP_FILE_EXTRACTION,
				eventList.FINISHED_EXTRACTION,
				eventList.FINISHED_ZIP_FILE_EXTRACTION,
				eventList.LOADED_PACKAGE,
			];

			testSinglePackageUpdate(
				test,
				updatedPackages,
				'existingPerformUpgrade',
				'.zip',
				requiredEvents,
				capturedEvents
			);
			test.done();
		}, function(err) {
			test.ok(false, 'failed to run the packageManager');
			test.done();
		});
	},
	're-initialize data with zip': function(test) {
		// Erase the current data
		cleanExtractionPath(test, directory);

		// Clear the fired-events list
		capturedEvents = [];

		// add the staticFiles package to the packageManager
		package_loader.loadPackage(testPackages.staticFilesZipTest);

		package_loader.runPackageManager()
		.then(function(updatedPackages) {
			// Define the required event list
			var requiredEvents = [
				eventList.PACKAGE_MANAGEMENT_STARTED,
				eventList.VALID_UPGRADE_DETECTED,
				eventList.DETECTED_UNINITIALIZED_PACKAGE,
				eventList.STARTING_EXTRACTION,
				eventList.STARTING_ZIP_FILE_EXTRACTION,
				eventList.FINISHED_EXTRACTION,
				eventList.FINISHED_ZIP_FILE_EXTRACTION,
				eventList.LOADED_PACKAGE,
			];

			testSinglePackageUpdate(
				test,
				updatedPackages,
				'initialize',
				'.zip',
				requiredEvents,
				capturedEvents
			);
			test.done();
		}, function(err) {
			test.ok(false, 'failed to run the packageManager');
			test.done();
		});
	},
	'No-Upgrades test': function(test) {
		// Clear the fired-events list
		capturedEvents = [];

		// add the staticFiles package to the packageManager
		package_loader.loadPackage(testPackages.staticFilesNoUpgrades);

		package_loader.runPackageManager()
		.then(function(updatedPackages) {
			// Define the required event list
			var requiredEvents = [
				eventList.PACKAGE_MANAGEMENT_STARTED,
				eventList.NO_VALID_UPGRADE_DETECTED,
				eventList.DETECTED_UP_TO_DATE_PACKAGE,
				eventList.SKIPPING_PACKAGE_RESET,
				eventList.SKIPPING_PACKAGE_UPGRADE,
				eventList.LOADED_PACKAGE,
			];

			testSinglePackageUpdate(
				test,
				updatedPackages,
				'noUpgradeOptions',
				'.zip',
				requiredEvents,
				capturedEvents
			);
			test.done();
		}, function(err) {
			test.ok(false, 'failed to run the packageManager');
			test.done();
		});
	},
	'Bad Directories test': function(test) {

		// Clear the fired-events list
		capturedEvents = [];

		// add the staticFiles package to the packageManager
		package_loader.loadPackage(testPackages.staticFilesNotFoundUpgrades);

		package_loader.runPackageManager()
		.then(function(updatedPackages) {
			// Define the required event list
			var requiredEvents = [
				eventList.PACKAGE_MANAGEMENT_STARTED,
				eventList.NO_VALID_UPGRADE_DETECTED,
				eventList.DETECTED_UP_TO_DATE_PACKAGE,
				eventList.SKIPPING_PACKAGE_RESET,
				eventList.SKIPPING_PACKAGE_UPGRADE,
				eventList.LOADED_PACKAGE,
			];

			testSinglePackageUpdate(
				test,
				updatedPackages,
				'noUpgradeOptions',
				'.zip',
				requiredEvents,
				capturedEvents
			);
			test.done();
		}, function(err) {
			test.ok(false, 'failed to run the packageManager');
			test.done();
		});
	},
	'Only upgrades w/ invalid dependencies test': function(test) {

		// Clear the fired-events list
		capturedEvents = [];

		// add the staticFiles package to the packageManager
		package_loader.loadPackage(testPackages.staticFilesInvalidDeps);

		package_loader.runPackageManager()
		.then(function(updatedPackages) {
			// Define the required event list
			var requiredEvents = [
				eventList.PACKAGE_MANAGEMENT_STARTED,
				eventList.NO_VALID_UPGRADE_DETECTED,
				eventList.DETECTED_UP_TO_DATE_PACKAGE,
				eventList.SKIPPING_PACKAGE_RESET,
				eventList.SKIPPING_PACKAGE_UPGRADE,
				eventList.LOADED_PACKAGE,
			];

			testSinglePackageUpdate(
				test,
				updatedPackages,
				'noUpgradeOptions',
				'.zip',
				requiredEvents,
				capturedEvents
			);
			test.done();
		}, function(err) {
			test.ok(false, 'failed to run the packageManager');
			test.done();
		});
	},
	'No-Upgrades test w/ bad initialization': function(test) {
		// Erase the current data
		cleanExtractionPath(test, directory);

		// Clear the fired-events list
		capturedEvents = [];

		// add the staticFiles package to the packageManager
		package_loader.loadPackage(testPackages.staticFilesNoUpgrades);

		package_loader.runPackageManager()
		.then(function(updatedPackages) {
			// Define the required event list
			var requiredEvents = [
				eventList.PACKAGE_MANAGEMENT_STARTED,
				eventList.NO_VALID_UPGRADE_DETECTED,
				eventList.SKIPPING_PACKAGE_RESET,
				eventList.SKIPPING_PACKAGE_UPGRADE,
				eventList.FAILED_TO_LOAD_MANAGED_PACKAGE,
			];

			testSinglePackageUpdate(
				test,
				updatedPackages,
				'upgradeFailed',
				'.zip',
				requiredEvents,
				capturedEvents
			);
			test.done();
		}, function(err) {
			test.ok(false, 'failed to run the packageManager');
			test.done();
		});
	},
	'Bad Directories test w/ bad initialization': function(test) {
		// Erase the current data
		cleanExtractionPath(test, directory);

		// Clear the fired-events list
		capturedEvents = [];

		// add the staticFiles package to the packageManager
		package_loader.loadPackage(testPackages.staticFilesNotFoundUpgrades);

		package_loader.runPackageManager()
		.then(function(updatedPackages) {
			// Define the required event list
			var requiredEvents = [
				eventList.PACKAGE_MANAGEMENT_STARTED,
				eventList.NO_VALID_UPGRADE_DETECTED,
				eventList.SKIPPING_PACKAGE_RESET,
				eventList.SKIPPING_PACKAGE_UPGRADE,
				eventList.FAILED_TO_LOAD_MANAGED_PACKAGE,
			];

			testSinglePackageUpdate(
				test,
				updatedPackages,
				'upgradeFailed',
				'.zip',
				requiredEvents,
				capturedEvents
			);
			test.done();
		}, function(err) {
			test.ok(false, 'failed to run the packageManager');
			test.done();
		});
	},
	'Bad Dependencies test w/ bad initialization': function(test) {
		// Erase the current data
		cleanExtractionPath(test, directory);

		// Clear the fired-events list
		capturedEvents = [];

		// add the staticFiles package to the packageManager
		package_loader.loadPackage(testPackages.staticFilesInvalidDeps);

		package_loader.runPackageManager()
		.then(function(updatedPackages) {
			// Define the required event list
			var requiredEvents = [
				eventList.PACKAGE_MANAGEMENT_STARTED,
				eventList.NO_VALID_UPGRADE_DETECTED,
				eventList.SKIPPING_PACKAGE_RESET,
				eventList.SKIPPING_PACKAGE_UPGRADE,
				eventList.FAILED_TO_LOAD_MANAGED_PACKAGE,
			];

			testSinglePackageUpdate(
				test,
				updatedPackages,
				'upgradeFailed',
				'.zip',
				requiredEvents,
				capturedEvents
			);
			test.done();
		}, function(err) {
			test.ok(false, 'failed to run the packageManager');
			test.done();
		});
	},
	'check test durations': function(test) {
		// console.log('Durations:', testDurationTimes);
		var testSteps = Object.keys(tests);
		test.strictEqual(testSteps.length - 1, testDurationTimes.length, 'not all times were logged');
		var i;
		for(i = 0; i < testDurationTimes.length; i++) {
			// console.log(testDurationTimes[i].endTime - testDurationTimes[i].startTime, testSteps[i]);
		}
		test.done();
	}
	// Make tests where multiple packages are managed and one depends on a version
	//     of another that is currently being upgraded.  (de-async package-loading front-end).
};

exports.tests = tests;