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


var fs = require('fs.extra');
var path = require('path');
var os = require('os');
var localFolder = 'test_extraction_folder';

var tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'labjack-test-'));
var directory = path.join(tmpDir, localFolder);

var testPackages = require('./test_packages').testPackages;
var testUtils = require('./test_utils');
var cleanExtractionPath = testUtils.cleanExtractionPath;
var testSinglePackageUpdate = testUtils.testSinglePackageUpdate;




var testDurationTimes = [];
var currentTestStartTime;

describe('extraction', function() {
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
		done();
	});
	it('start extraction', async function () {
		// Clear the fired-events list
		capturedEvents = [];

		// add the staticFiles package to the packageManager
		await package_loader.loadPackage(testPackages.staticFiles);

		// Verify that the package was added to the managed packages list
		assert.deepEqual(
			package_loader.getManagedPackages(),
			[testPackages.staticFiles.name]
		);

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
		];

		testSinglePackageUpdate(
			assert,
			package_loader,
			updatedPackages,
			'initialize',
			'directory',
			requiredEvents,
			capturedEvents
		);
	});

	it('execution w/ existing data and same version upgrade', async function () {
		// Clear the fired-events list
		capturedEvents = [];

		// add the staticFiles package to the packageManager
		await package_loader.loadPackage(testPackages.staticFiles);

		const updatedPackages = await package_loader.runPackageManager();
		// Define the required event list
		var requiredEvents = [
			eventList.PACKAGE_MANAGEMENT_STARTED,
			eventList.VALID_UPGRADE_DETECTED,
			eventList.DETECTED_UP_TO_DATE_PACKAGE,
			eventList.SKIPPING_PACKAGE_RESET,
			eventList.SKIPPING_PACKAGE_UPGRADE,
			eventList.LOADED_PACKAGE,
		];

		testSinglePackageUpdate(
			assert,
			package_loader,
			updatedPackages,
			'existingSkipUpgrade',
			'directory',
			requiredEvents,
			capturedEvents
		);
	});
	it('execution w/ existing data and older upgrade', async function () {
		// Clear the fired-events list
		capturedEvents = [];

		// Overwrite the staticFiles package to the packageManager
		await package_loader.loadPackage(testPackages.staticFilesOldOnly);

		const updatedPackages = await package_loader.runPackageManager();
		// Define the required event list
		var requiredEvents = [
			eventList.PACKAGE_MANAGEMENT_STARTED,
			eventList.VALID_UPGRADE_DETECTED,
			eventList.DETECTED_UP_TO_DATE_PACKAGE,
			eventList.SKIPPING_PACKAGE_RESET,
			eventList.SKIPPING_PACKAGE_UPGRADE,
			eventList.LOADED_PACKAGE,
		];

		testSinglePackageUpdate(
			assert,
			package_loader,
			updatedPackages,
			'existingSkipUpgrade',
			'directory',
			requiredEvents,
			capturedEvents
		);
	});
	it('execution w/ existing data and newer upgrade', async function () {
		// Clear the fired-events list
		capturedEvents = [];

		// Overwrite the staticFiles package to the packageManager
		await package_loader.loadPackage(testPackages.staticFilesNew);

		const updatedPackages = await package_loader.runPackageManager();
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
			package_loader,
			updatedPackages,
			'existingPerformUpgrade',
			'directory',
			requiredEvents,
			capturedEvents
		);
	});
	// Check to make sure that the NEWEST valid upgrade option is selected, not just 'the first found'
	// Clear the saved files and do the same for .zip files
	// Make tests where files have dependencies
	// Make tests where multiple packages are managed and one depends on a version
	//     of another that is currently being upgraded.  (de-async package-loading front-end).
});
