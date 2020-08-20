console.log("ljswitchboard-core index.js");

var gui = require('nw.gui');
var path = require('path');
var q = require('q');
var win = gui.Window.get();


// Show the window's dev tools
// win.showDevTools();

var package_loader = require('ljswitchboard-package_loader');
var gns = package_loader.getNameSpace();
var window_manager = require('ljswitchboard-window_manager');

var coreResourcesLoaded = false;

// Use the req require tool to load files to prevent from cluttering up the
// require namespace & adding everything there.
console.log('Requiring message_formatter');
var req = global[gns].req.require;
var message_formatter = req('message_formatter');

var loadResources = function(resources) {
	global[gns].static_files.loadResources(document, resources)
	.then(function(res) {
		coreResourcesLoaded = true;
	}, function(err) {
		console.error('Error Loading resources', err);
	});
};
var startDir = global[gns].info.startDir;
var corePackages = [
	{
		// 'name': 'ljswitchboard-static_files',
		'name': 'io_manager',
		'folderName': 'ljswitchboard-io_manager',
		'loadMethod': 'managed',
		'forceRefresh': false,
		'directLoad': true,
		'locations': [
			// Add path to files for development purposes, out of a repo.
			path.join(startDir, '..', 'ljswitchboard-io_manager'),

			// If those files aren't found, check the node_modules directory of
			// the current application for upgrades.
			path.join(startDir, 'node_modules', 'ljswitchboard-io_manager'),

			// For non-development use, check the LabJack folder/K3/downloads
			// file for upgrades.
			// TODO: Add this directory

			// If all fails, check the starting directory of the process for the
			// zipped files originally distributed with the application.
			path.join(startDir, 'ljswitchboard-io_manager.zip')
		]
	},
	{
		// 'name': 'ljswitchboard-static_files',
		'name': 'module_manager',
		'folderName': 'ljswitchboard-module_manager',
		'loadMethod': 'managed',
		'forceRefresh': false,
		'directLoad': true,
		'locations': [
			// Add path to files for development purposes, out of a repo.
			path.join(startDir, '..', 'ljswitchboard-module_manager'),

			// If those files aren't found, check the node_modules directory of
			// the current application for upgrades.
			path.join(startDir, 'node_modules', 'ljswitchboard-module_manager'),

			// For non-development use, check the LabJack folder/K3/downloads
			// file for upgrades.
			// TODO: Add this directory

			// If all fails, check the starting directory of the process for the
			// zipped files originally distributed with the application.
			path.join(startDir, 'ljswitchboard-module_manager.zip')
		]
	},
	{
		// 'name': 'ljswitchboard-core',
		'name': 'kipling',
		'folderName': 'ljswitchboard-kipling',
		'loadMethod': 'managed',
		'forceRefresh': false,
		'startApp': false,
		'directLoad': true,
		'locations': [
			// Add path to files for development purposes, out of a repo.
			path.join(startDir, '..', 'ljswitchboard-kipling'),

			// If those files aren't found, check the node_modules directory of
			// the current application for upgrades.
			path.join(startDir, 'node_modules', 'ljswitchboard-kipling'),

			// For non-development use, check the LabJack folder/K3/downloads
			// file for upgrades.
			// TODO: Add this directory

			// If all fails, check the starting directory of the process for the
			// zipped files originally distributed with the application.
			path.join(startDir, 'ljswitchboard-kipling.zip')
		]
	}
];


if(!!process.env.TEST_MODE || gui.App.manifest.test) {
	console.log('Adding kipling_tester');
	corePackages.splice(2,0,{
		'name': 'kipling_tester',
		'folderName': 'ljswitchboard-kipling_tester',
		'loadMethod': 'managed',
		'forceRefresh': false,
		'startApp': false,
		'directLoad': true,
		'locations': [
			// Add path to files for development purposes, out of a repo.
			path.join(startDir, '..', 'ljswitchboard-kipling_tester'),
			path.join(startDir, 'node_modules', 'ljswitchboard-kipling_tester'),
			path.join(startDir, 'ljswitchboard-kipling_tester.zip')
		]
	});
}

var checkRequirements = function() {
	var defered = q.defer();
	global[gns].splash_screen.update('Verifing LJM Installation');
	global[gns].ljm_driver_checker.verifyLJMInstallation()
	.then(function(res) {
		global[gns].splash_screen.update('Finished Verifying LJM Installation');
		console.log('result...', res);
		var resultText = 'failed';
		if(res.overallResult) {
			resultText = 'passed';
		}
		// Display that the window has been initialized
		message_formatter.renderTemplate({
			'result': resultText,
			'step': 'Verified LJM Installation',
			'message': 'LJM Version: ' + res.ljmVersion,
			'code': JSON.stringify(res, undefined, 2)
		});
		defered.resolve(res);
	}, function(err) {
		console.log('err...', err);
		var resultText = 'failed';
		if(err.overallResult) {
			resultText = 'passed';
		}
		// Display that the window has been initialized
		message_formatter.renderTemplate({
			'result': resultText,
			'step': 'Verifying LJM Installation',
			'message': 'LJM Version: ' + err.ljmVersion,
			'code': JSON.stringify(err, undefined, 2)
		});
		defered.reject(err);
	});

	return defered.promise;
};

var mp = package_loader.getManagedPackages();
var loadCorePackages = function() {
	var defered = q.defer();
	global[gns].splash_screen.update('Loading Packages');

	corePackages.forEach(function(corePackage) {
		package_loader.loadPackage(corePackage);
	});
	package_loader.runPackageManager()
	.then(function(managedPackages) {
		console.log('Managed Packages', managedPackages);
		var keys = Object.keys(managedPackages);
		if(!!process.env.TEST_MODE || gui.App.manifest.test) {

			var isKiplingTesterManaged = keys.indexOf('kipling_tester');
			console.log('kipling_tester required', isKiplingTesterManaged);
		}
		var continueLaunch = true;
		keys.forEach(function(key) {
			var resultText = 'passed';
			var curPackage = managedPackages[key];
			if(curPackage.isError) {
				resultText = 'failed';
				continueLaunch = false;
			}

			message_formatter.renderTemplate({
				'result': resultText,
				'step': 'Loading ' + curPackage.name,
				'messages': [
					'Version: ' + curPackage.packageInfo.version,
					'Location: ' + curPackage.packageInfo.location
					],
				'code': JSON.stringify(curPackage.packageInfo, undefined, 2)
			});
		});
		global[gns].splash_screen.update('Launching Kipling');

		// Instruct the window_manager to open any managed nwApps
		window_manager.openManagedApps(managedPackages);
		defered.resolve();
	});
	return defered.promise;
};

var startCoreApp = function() {
	if(coreResourcesLoaded) {

		// Start the application

		// Configure the message_formatter
		message_formatter.configure($, $('#loadSteps'));

		// Display that the window has been initialized
		message_formatter.renderTemplate({
			'result': 'passed',
			'step': 'Initialized'
		});

		checkRequirements()
		.then(loadCorePackages);
	} else {
		setTimeout(startCoreApp, 10);
	}
};

window.onload = function(e) {
	setTimeout(startCoreApp, 10);
};




// win.shared.tFunc()
// .then(function(d) {
// 	console.log('ljswitchboard-core:', d);
// });
