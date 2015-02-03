

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

var testPackages = {
	'core': {
		'name': 'ljswitchboard_core',
		'loadMethod': 'require', 
		'location': path.join(process.cwd(), '..', 'ljswitchboard-core')
	},
	'staticFiles': {
		'name': 'ljswitchboard_static_files',
		'folderName': 'ljswitchboard-static_files',
		'loadMethod': 'managed',
		'locations': [
			path.join(process.cwd(), '..', 'ljswitchboard-static_files'),
			path.join(process.cwd(), 'test_extraction_data', 'ljswitchboard-static_files.zip'),
			path.join(process.cwd(), '..', 'ljswitchboard-static_files'),
		]
	}
};

exports.tests = {
	'configure the extraction path': function(test) {
		directory = path.join(process.cwd(), localFolder);
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

		package_loader.setExtractionPath(directory);
		test.done();
	}, 
	'start extraction': function(test){
		// Clear the fired-events list
		capturedEvents = [];

		// add the staticFiles package to the packageManager
		package_loader.loadPackage(testPackages.staticFiles);

		// Verify that the package was added to the managed packages list
		test.deepEqual(
			package_loader.getManagedPackages(),
			[testPackages.staticFiles.name]
		);

		console.log('  - Running the Package Manager');
		package_loader.runPackageManager()
		.then(function(updatedPackages) {

			var requiredEvents = [
				eventList.VALID_UPGRADE_DETECTED,
				eventList.DETECTED_UNINITIALIZED_PACKAGE,
				eventList.STARTING_EXTRACTION,
				eventList.STARTING_DIRECTORY_EXTRACTION,
				eventList.FINISHED_EXTRACTION,
				eventList.FINISHED_DIRECTORY_EXTRACTION,
				eventList.LOADED_PACKAGE,
			];

			var emittedEvents = [];
			capturedEvents.forEach(function(capturedEvent) {
				emittedEvents.push(capturedEvent.eventName);
			});
			var msg = 'Required events not fired';
			test.deepEqual(emittedEvents, requiredEvents, msg);
			// console.log('Updated Packages', updatedPackages);

			var cns = package_loader.getNameSpace();
			// Check to make sure that the library was properly loaded
			var loadedLibKeys = Object.keys(global[cns]);
			console.log('Loaded Libraries', loadedLibKeys);
			
			// Test to make sure that the package has been loaded into memory
			test.done();
		}, function(err) {
			test.done();
		});
	},
	'check for valid events being fired': function(test) {
		test.done();
	},
	'execution w/ existing data and same version upgrade': function(test) {
		test.done();
	},
	'execution w/ existing data and older upgrade': function(test) {
		test.done();
	},
	'execution w/ existing data and newer upgrade': function(test) {
		test.done();
	},
	// Clear the saved files and do the same for .zip files
	// Make tests where files have dependencies
	// Make tests where multiple packages are managed and one depends on a version
	//     of another that is currently being upgraded.  (de-async package-loading front-end).
};