var assert = require('chai').assert;

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
var os = require('os');
var localFolder = 'test_extraction_folder';

var tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'labjack-test-'));
var directory = null;

var testPackages = require('./test_packages').testPackages;
var testUtils = require('./test_utils');
var cleanExtractionPath = testUtils.cleanExtractionPath;
var testSinglePackageUpdate = testUtils.testSinglePackageUpdate;

var testDurationTimes = [];
var currentTestStartTime;

var reInitializeTest = function(assert, done) {
	// Erase the current data
	cleanExtractionPath(directory);

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
			assert,
			updatedPackages,
			'initialize',
			'directory',
			requiredEvents,
			capturedEvents
		);
		done();
	}, function(err) {
		assert.isOk(false, 'failed to run the packageManager');
		done();
	});
};

describe('advanced extraction', function() {
	beforeEach(function (done) {
		currentTestStartTime = new Date();
		done();
	});
	afterEach(function (done) {
		var startTime = currentTestStartTime;
		var endTime = new Date();
		var duration = new Date(endTime - startTime);
		testDurationTimes.push({
			'startTime': startTime,
			'endTime': endTime,
			'duration': duration
		});
		package_loader.deleteAllManagedPackages();
		done();
	});
	it('configure the extraction path', function (done) {
		directory = path.join(tmpDir, localFolder);

		cleanExtractionPath(directory);

		package_loader.setExtractionPath(directory);

		// add the staticFiles package to the packageManager
		package_loader.loadPackage(testPackages.staticFiles);
		done();
	});
	it('re-initialize extracted data to std option', function (done) {
		reInitializeTest(assert, done);
	});
	it('Run old before new test', function (done) {
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
				assert,
				updatedPackages,
				'existingPerformUpgrade',
				'directory',
				requiredEvents,
				capturedEvents
			);
			done();
		}, function(err) {
			console.error(err);
			assert.isOk(false, 'failed to run the packageManager');
			done();
		});
	});
	it('re-initialize data for stdDir-newZip', function (done) {
		reInitializeTest(assert, done);
	});
	it('Run std before new test', function (done) {
		// Clear the fired-events list
		capturedEvents = [];

		// add the staticFiles package to the packageManager
		package_loader.loadPackage(testPackages.staticFilesStdDirBeforeNewZip);

		// console.log('Running package manager');
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
				assert,
				updatedPackages,
				'existingPerformUpgrade',
				'.zip',
				requiredEvents,
				capturedEvents
			);
			done();
		}, function(err) {
			assert.isOk(false, 'failed to run the packageManager');
			done();
		});
	});
	it('re-initialize data with zip', function (done) {
		// Erase the current data
		cleanExtractionPath(directory);

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
				assert,
				updatedPackages,
				'initialize',
				'.zip',
				requiredEvents,
				capturedEvents
			);
			done();
		}, function(err) {
			assert.isOk(false, 'failed to run the packageManager');
			done();
		});
	});
	it('No-Upgrades test', function (done) {
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
				assert,
				updatedPackages,
				'noUpgradeOptions',
				'.zip',
				requiredEvents,
				capturedEvents
			);
			done();
		}, function(err) {
			assert.isOk(false, 'failed to run the packageManager');
			done();
		});
	});
	it('Bad Directories test', function (done) {
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
				assert,
				updatedPackages,
				'noUpgradeOptions',
				'.zip',
				requiredEvents,
				capturedEvents
			);
			done();
		}, function(err) {
			assert.isOk(false, 'failed to run the packageManager');
			done();
		});
	});
	it('Only upgrades w/ invalid dependencies test', function (done) {
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
				assert,
				updatedPackages,
				'noUpgradeOptions',
				'.zip',
				requiredEvents,
				capturedEvents
			);
			done();
		}, function(err) {
			assert.isOk(false, 'failed to run the packageManager');
			done();
		});
	});
	it('No-Upgrades test w/ bad initialization', function (done) {
		// Erase the current data
		cleanExtractionPath(directory);

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
				assert,
				updatedPackages,
				'upgradeFailed',
				'.zip',
				requiredEvents,
				capturedEvents
			);
			done();
		}, function(err) {
			assert.isOk(false, 'failed to run the packageManager');
			done();
		});
	});
	it('Bad Directories test w/ bad initialization', function (done) {
		// Erase the current data
		cleanExtractionPath(directory);

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
				assert,
				updatedPackages,
				'upgradeFailed',
				'.zip',
				requiredEvents,
				capturedEvents
			);
			done();
		}, function(err) {
			assert.isOk(false, 'failed to run the packageManager');
			done();
		});
	});
	it('Bad Dependencies test w/ bad initialization', function (done) {
		// Erase the current data
		cleanExtractionPath(directory);

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
				assert,
				updatedPackages,
				'upgradeFailed',
				'.zip',
				requiredEvents,
				capturedEvents
			);
			done();
		}, function(err) {
			assert.isOk(false, 'failed to run the packageManager');
			done();
		});
	});
	// Make tests where multiple packages are managed and one depends on a version
	//     of another that is currently being upgraded.  (de-async package-loading front-end).
});
