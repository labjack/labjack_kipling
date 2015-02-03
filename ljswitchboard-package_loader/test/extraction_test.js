

var package_loader = require('../lib/ljswitchboard-package_loader');

var capturedEvents = [];

var saveEvent = function(name, info) {
	capturedEvents.push({'eventName': name, 'data': info});
};

// Attach various event listeners
package_loader.on('opened_window', function(packageName) {
	saveEvent('opened_window', packageName);
});
package_loader.on('loaded_package', function(packageName) {
	// console.log('Loaded New Package', packageName);
	saveEvent('loaded_package', packageName);
});
package_loader.on('set_package', function(packageName) {
	// console.log('Saved New Package', packageName);
	saveEvent('set_package', packageName);
});
package_loader.on('starting_extraction', function(packageName) {
	// console.log('Extracting package', packageName);
	saveEvent('starting_extraction', packageName);
});
package_loader.on('finished_extraction', function(packageName) {
	saveEvent('finished_extraction', packageName);
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
		// add the staticFiles package to the packageManager
		package_loader.loadPackage(testPackages.staticFiles);

		// Verify that the package was added to the managed packages list
		test.deepEqual(
			package_loader.getManagedPackages(),
			[testPackages.staticFiles.name]
		);
		package_loader.runPackageManager()
		.then(function(updatedPackages) {
			console.log('Updated Packages', updatedPackages);
			test.done();
		}, function(err) {
			test.done();
		});
	}
};