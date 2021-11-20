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

var testPackages = require('./test_packages').testPackages;
var testUtils = require('./test_utils');
var cleanExtractionPath = testUtils.cleanExtractionPath;
var testSinglePackageUpdate = testUtils.testSinglePackageUpdate;

var testDurationTimes = [];
var currentTestStartTime;

describe('multiple package', function() {
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

	it('Initialize directory with two dependent packages', async function () {
		// Erase the current data
		cleanExtractionPath(directory);

		// Clear the fired-events list
		capturedEvents = [];

		// add the staticFiles package to the packageManager
		await package_loader.loadPackage(testPackages.staticFiles);

		// Also add the core package to the packageManager
		await package_loader.loadPackage(testPackages.core);

		const updatedPackages = await package_loader.runPackageManager();
		// Define the required event list
		var requiredEvents = [
		];
		var singleProcessEvents = [
			eventList.PACKAGE_MANAGEMENT_STARTED,
			eventList.VALID_UPGRADE_DETECTED,
			eventList.DETECTED_UNINITIALIZED_PACKAGE,
			eventList.STARTING_EXTRACTION,
			eventList.STARTING_DIRECTORY_EXTRACTION,
			eventList.FINISHED_EXTRACTION,
			eventList.FINISHED_DIRECTORY_EXTRACTION,
			eventList.LOADED_PACKAGE,
		];
		singleProcessEvents.forEach(function(singleEvent) {
			requiredEvents.push(singleEvent);
		});
		singleProcessEvents.forEach(function(singleEvent) {
			requiredEvents.push(singleEvent);
		});

		// Test first package being extracted properly
		testSinglePackageUpdate(
			assert,
			package_loader,
			updatedPackages,
			'initialize',
			'directory',
			requiredEvents,
			capturedEvents
		);

		// Test second package being extracted properly
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
	it('Initialize directory with two dependent packages, 2nd fails', async function () {
		// Erase the current data
		cleanExtractionPath(directory);

		// Clear the fired-events list
		capturedEvents = [];

		// add the staticFiles package to the packageManager
		await package_loader.loadPackage(testPackages.staticFiles);

		// Also add the core package to the packageManager
		await package_loader.loadPackage(testPackages.invalidCore);

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
			eventList.NO_VALID_UPGRADE_DETECTED,
			eventList.SKIPPING_PACKAGE_RESET,
			eventList.SKIPPING_PACKAGE_UPGRADE,
			eventList.FAILED_TO_LOAD_MANAGED_PACKAGE,
		];

		// Test first package being extracted properly
		testSinglePackageUpdate(
			assert,
			package_loader,
			updatedPackages,
			'initialize',
			'directory',
			requiredEvents,
			capturedEvents
		);

		// Test second package being extracted properly
		// console.log(updatedPackages['ljswitchboard-core']);
		testSinglePackageUpdate(
			assert,
			package_loader,
			updatedPackages,
			'upgradeFailed',
			'directory',
			requiredEvents,
			capturedEvents,
			1
		);
	});

	// Make tests where multiple packages are managed and one depends on a version
	//     of another that is currently being upgraded.  (de-async package-loading front-end).
});
