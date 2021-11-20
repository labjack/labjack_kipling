var assert = require('chai').assert;

const PackageLoader = require('../lib/ljswitchboard-package_loader').PackageLoader;
const package_loader = new PackageLoader();

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

var path = require('path');
var fs = require('fs');
var os = require('os');
var localFolder = 'test_extraction_folder';

var tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'labjack-test-'));
var directory = null;
// Switch to using a local minified version of semver
// var semver = require('semver');
var semver = require('../lib/semver_min');

var testPackages = require('./test_packages').testPackages;
var testUtils = require('./test_utils');
var cleanExtractionPath = testUtils.cleanExtractionPath;
var testSinglePackageUpdate = testUtils.testSinglePackageUpdate;




var testDurationTimes = [];
var currentTestStartTime;

describe('force refresh', function() {
	beforeEach(function (done) {
		currentTestStartTime = new Date();
		package_loader.reset();
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
		done();
	});
	it('start extraction', async function () {
		// Clear the fired-events list
		capturedEvents = [];

		// add the staticFiles package to the packageManager
		await package_loader.loadPackage(testPackages.staticFiles);
		// add the staticFiles package to the packageManager
		await package_loader.loadPackage(testPackages.core);

		const updatedPackages = await package_loader.runPackageManager();
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
			eventList.PACKAGE_MANAGEMENT_STARTED,
			eventList.VALID_UPGRADE_DETECTED,
			eventList.DETECTED_UNINITIALIZED_PACKAGE,
			eventList.STARTING_EXTRACTION,
			eventList.STARTING_DIRECTORY_EXTRACTION,
			eventList.FINISHED_EXTRACTION,
			eventList.FINISHED_DIRECTORY_EXTRACTION,
			eventList.LOADED_PACKAGE,
		];

		// Test to make sure the staticFiles were loaded
		testSinglePackageUpdate(
			assert,
			package_loader,
			updatedPackages,
			'initialize',
			'directory',
			requiredEvents,
			capturedEvents
		);

		// Test to make sure the core library was loaded
		testSinglePackageUpdate(
			assert,
			package_loader,
			updatedPackages,
			'initialize',
			'directory',
			requiredEvents,
			capturedEvents,
			1
		);
	});
	it('Force upgrade if greater than/equal to current extraction', async function () {
		// Clear the fired-events list
		capturedEvents = [];

		// add the staticFiles package to the packageManager
		await package_loader.loadPackage(testPackages.staticFiles);
		// add the staticFiles package to the packageManager
		await package_loader.loadPackage(testPackages.forceRefreshCore);

		const updatedPackages = await package_loader.runPackageManager();
		// Define the required event list
		var requiredEvents = [
			eventList.PACKAGE_MANAGEMENT_STARTED,
			eventList.VALID_UPGRADE_DETECTED,
			eventList.DETECTED_UP_TO_DATE_PACKAGE,
			eventList.SKIPPING_PACKAGE_RESET,
			eventList.SKIPPING_PACKAGE_UPGRADE,
			eventList.LOADED_PACKAGE,
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
		try {
			testSinglePackageUpdate(
				assert,
				package_loader,
				updatedPackages,
				'existingSkipUpgrade',
				'directory',
				requiredEvents,
				capturedEvents
			);
			testSinglePackageUpdate(
				assert,
				package_loader,
				updatedPackages,
				'existingPerformUpgrade',
				'directory',
				requiredEvents,
				capturedEvents,
				1
			);
		} catch (err) {
			console.log('error', err);
		}
	});
	// 'check test durations': function(test) {
	// 	// console.log('Durations:', testDurationTimes);
	// 	var testSteps = Object.keys(tests);
	// 	assert.strictEqual(testSteps.length - 1, testDurationTimes.length, 'not all times were logged');
	// 	var i;
	// 	for(i = 0; i < testDurationTimes.length; i++) {
	// 		// console.log(testDurationTimes[i].endTime - testDurationTimes[i].startTime, testSteps[i]);
	// 	}
	// 	done();
	// }
	// Check to make sure that the NEWEST valid upgrade option is selected, not just 'the first found'
	// Clear the saved files and do the same for .zip files
	// Make tests where files have dependencies
	// Make tests where multiple packages are managed and one depends on a version
	//     of another that is currently being upgraded.  (de-async package-loading front-end).
});
