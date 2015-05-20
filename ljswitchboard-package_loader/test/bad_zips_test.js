

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
	'configure the extraction path (2)': function(test) {
		directory = path.join(process.cwd(), localFolder);
		
		cleanExtractionPath(test, directory);

		package_loader.setExtractionPath(directory);
		test.done();
	},
	'start extraction (corrupted .zip)': function(test){
		// Clear the fired-events list
		capturedEvents = [];

		// add the staticFiles package to the packageManager
		package_loader.loadPackage(testPackages.staticFilesBadZip);

		// Verify that the package was added to the managed packages list
		test.deepEqual(
			package_loader.getManagedPackages(),
			[testPackages.staticFilesBadZip.name]
		);

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
	'configure the extraction path (2)': function(test) {
		directory = path.join(process.cwd(), localFolder);
		
		cleanExtractionPath(test, directory);

		package_loader.setExtractionPath(directory);
		test.done();
	},
	'start extraction (corrupted .zip)': function(test){
		// Clear the fired-events list
		capturedEvents = [];

		// add the staticFiles package to the packageManager
		package_loader.loadPackage(testPackages.staticFilesBadZip);

		// Verify that the package was added to the managed packages list
		test.deepEqual(
			package_loader.getManagedPackages(),
			[testPackages.staticFilesBadZip.name]
		);

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
	// Check to make sure that the NEWEST valid upgrade option is selected, not just 'the first found'
	// Clear the saved files and do the same for .zip files
	// Make tests where files have dependencies
	// Make tests where multiple packages are managed and one depends on a version
	//     of another that is currently being upgraded.  (de-async package-loading front-end).
};

exports.tests = tests;