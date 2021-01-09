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
var directory = null;

var testPackages = require('./test_packages').testPackages;
const testUtils = require('./test_utils');
const cleanExtractionPath = testUtils.cleanExtractionPath;
const testSinglePackageUpdate = testUtils.testSinglePackageUpdate;

var testDurationTimes = [];
var currentTestStartTime;

async function reInitializeTest(assert) {
	// Erase the current data
	cleanExtractionPath(directory);

	// Clear the fired-events list
	capturedEvents = [];

	// add the staticFiles package to the packageManager
	await package_loader.loadPackage(testPackages.staticFiles);

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
		updatedPackages,
		'initialize',
		'directory',
		requiredEvents,
		capturedEvents
	);
}

describe('advanced extraction', function() {
	beforeEach(function (done) {
		package_loader.reset();
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
	it('configure the extraction path', async function () {
		directory = path.join(tmpDir, localFolder);

		package_loader.deleteAllManagedPackages();
		package_loader._loadedPackages = [];
		cleanExtractionPath(directory);

		await package_loader.setExtractionPath(directory);

		// add the staticFiles package to the packageManager
		await package_loader.loadPackage(testPackages.staticFiles);
	});
	it('Run old before new test', async function () {
		await reInitializeTest(assert);
		// Clear the fired-events list
		capturedEvents = [];

		// add the staticFiles package to the packageManager
		await package_loader.loadPackage(testPackages.staticFilesOldBeforeNew);

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
			updatedPackages,
			'existingPerformUpgrade',
			'directory',
			requiredEvents,
			capturedEvents
		);
	});
	it('Run std before new test', async function () {
		await reInitializeTest(assert);
		// Clear the fired-events list
		capturedEvents = [];

		// add the staticFiles package to the packageManager
		await package_loader.loadPackage(testPackages.staticFilesStdDirBeforeNewZip);

		// console.log('Running package manager');
		const updatedPackages = await package_loader.runPackageManager();

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
	});
	it('re-initialize data with zip', async function () {
		// Erase the current data
		cleanExtractionPath(directory);

		// Clear the fired-events list
		capturedEvents = [];

		// add the staticFiles package to the packageManager
		await package_loader.loadPackage(testPackages.staticFilesZipTest);

		const updatedPackages = await package_loader.runPackageManager();
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
	});
	it('No-Upgrades test', async function () {
		// Clear the fired-events list
		capturedEvents = [];

		// add the staticFiles package to the packageManager
		await package_loader.loadPackage(testPackages.staticFilesNoUpgrades);

		const updatedPackages = await package_loader.runPackageManager();
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
	});
	it('Bad Directories test', async function () {
		// Clear the fired-events list
		capturedEvents = [];

		// add the staticFiles package to the packageManager
		await package_loader.loadPackage(testPackages.staticFilesNotFoundUpgrades);

		const updatedPackages = await package_loader.runPackageManager();
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
	});
	it('Only upgrades w/ invalid dependencies test', async function () {
		// Clear the fired-events list
		capturedEvents = [];

		// add the staticFiles package to the packageManager
		await package_loader.loadPackage(testPackages.staticFilesInvalidDeps);

		const updatedPackages = await package_loader.runPackageManager();
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
	});
	it('No-Upgrades test w/ bad initialization', async function () {
		// Erase the current data
		cleanExtractionPath(directory);

		// Clear the fired-events list
		capturedEvents = [];

		// add the staticFiles package to the packageManager
		await package_loader.loadPackage(testPackages.staticFilesNoUpgrades);

		const updatedPackages = await package_loader.runPackageManager();
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
	});
	it('Bad Directories test w/ bad initialization', async function () {
		// Erase the current data
		package_loader.deleteAllManagedPackages();
		package_loader._loadedPackages = [];
		cleanExtractionPath(directory);

		// Clear the fired-events list
		capturedEvents = [];

		// add the staticFiles package to the packageManager
		await package_loader.loadPackage(testPackages.staticFilesNotFoundUpgrades);

		const updatedPackages = await package_loader.runPackageManager();
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
	});
	it('Bad Dependencies test w/ bad initialization', async function () {
		// Erase the current data
		cleanExtractionPath(directory);

		// Clear the fired-events list
		capturedEvents = [];

		// add the staticFiles package to the packageManager
		await package_loader.loadPackage(testPackages.staticFilesInvalidDeps);

		const updatedPackages = await package_loader.runPackageManager();
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
	});
	// Make tests where multiple packages are managed and one depends on a version
	//     of another that is currently being upgraded.  (de-async package-loading front-end).
});
