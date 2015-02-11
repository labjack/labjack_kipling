/*
node-webkit 0.11.6 process.versions:
chromium: "38.0.2125.104"
http_parser: "2.2"
modules: "14"
node: "0.11.13-pre"
node-webkit: "0.11.6"
nw-commit-id: "ec3b4f4-d8ecacd-e5d35ef-f2f89e2-d9a9d39-cdd879e"
openssl: "1.0.1f"
uv: "0.11.22"
v8: "3.28.71.2"
zlib: "1.2.5"

nw 0.12.0-alpha2 process.versions:
chromium: "41.0.2236.2"
http_parser: "2.3"
modules: "14"
node: "1.0.0"
node-webkit: "0.12.0-alpha2"
nw-commit-id: "e0d5ce6-d017875-34492e5-2e978ac-1116f2c-fd87c8d"
openssl: "1.0.1j"
uv: "1.2.0"
v8: "3.31.31"
zlib: "1.2.5"
*/

console.log('Starting K3, in testK3/index.js');

// Load native UI library
var gui = require('nw.gui');

// Get an instance of the startup window
var win = gui.Window.get();

// perform other requires
var path = require('path');
var q = require('q');

global.ljswitchboard = {};

function initIOManager() {
	var io_manager = require('../../ljswitchboard-io_manager');
	var io_interface = io_manager.io_interface();

	console.log(Object.keys(io_manager));
	console.log('initializing interface');
	io_interface.initialize()
	.then(function(res) {
		console.log('Initialized', res);
	}, function(err) {
		console.log('failed', err);
	});
}
// Require the package loader
// Load the local repository for development purposes
// console.log('Loading Dev version of the package_loader');
// var package_loader = require('../../ljswitchboard-package_loader');
// Load the library from the node_module dirctory:
var package_loader = require('ljswitchboard-package_loader');
var gns = package_loader.getNameSpace();



// Require persistent_data_manager
var persistent_data_manager = require('./persistent_data_manager');
var persistentDataManager;

// Require and initialize the window_manager
var window_manager = require('ljswitchboard-window_manager');
// Pass the window_manager a reference to the gui object
window_manager.configure({
	'gui': require('nw.gui')
});

// Add the -builder window to the window_manager to have it be managed.
var initialAppVisibility = false;
if(gui.App.manifest.window.show) {
	initialAppVisibility = true;
}
window_manager.addWindow({
	'name': 'main',
	'win': win,
	'initialVisibility': initialAppVisibility,
	'title': 'mainWindow'
});

// Attach to the "Quitting Application" event
window_manager.on(window_manager.eventList.QUITTING_APPLICATION, function() {
	console.log('Quitting Application');
	gui.App.quit();
});

var plEvents = package_loader.eventList;

// Attach various event listeners
// package_loader.on('opened_window', windowManager.addWindow);
package_loader.on('loaded_package', function(packageName) {
	// console.log('Loaded New Package', packageName);
});
package_loader.on('set_package', function(packageName) {
	// console.log('Saved New Package', packageName);
});

package_loader.on('starting_extraction', function(packageInfo) {
	console.log('Extracting package', packageInfo.name);
});
package_loader.on('finished_extraction', function(packageInfo) {
	console.log('Finished Extracting package', packageInfo.name);
});

var rootPackages = [{
		'name': 'req',
		'loadMethod': 'set',
		'ref': require('ljswitchboard-require')
	}, {
		'name': 'ljm_driver_checker',
		'loadMethod': 'set',
		'ref': require('ljswitchboard-ljm_driver_checker')
	}, {
		'name': 'win',
		'loadMethod': 'set',
		'ref': win
	}, {
		'name': 'gui',
		'loadMethod': 'set',
		'ref': require('nw.gui')
	}, {
		'name': 'window_manager',
		'loadMethod': 'set',
		'ref': window_manager
	}
];

var execDir = path.normalize(path.dirname(process.execPath));
var derivedCWD = path.resolve(path.join(execDir, '..','..','..'));
var cwd = path.normalize(process.cwd());
var startMethod = '';
var isCompressed = false;
var startDir = cwd;
if(cwd === derivedCWD) {
	console.log('Project was started via npm start');
	startMethod = 'npm start';
	startDir = cwd;
}

if(cwd === execDir) {
	console.log('Project was started via un-packed .exe');
	startDir = cwd;
	startMethod = 'un-packed exe';
} else {
	if(startMethod === '') {
		console.log('Project was started via compressed .exe');
		isCompressed = true;
		startDir = execDir;
		startMethod = 'packed exe';
	}
}

console.log('Started project via: ' + startMethod);
var startInfo = {
	'isCompressed': isCompressed,
	'startDir': startDir,
	'execDir': execDir,
	'derivedCWD': derivedCWD,
	'cwd': cwd
};
console.log('Start info', startInfo);

var secondaryPackages = [
	{
		// 'name': 'ljswitchboard-static_files',
		'name': 'static_files',
		'folderName': 'ljswitchboard-static_files',
		'loadMethod': 'managed',
		'forceRefresh': false,
		'directLoad': true,
		'locations': [
			// Add path to files for development purposes, out of a repo.
			path.join(startDir, '..', 'ljswitchboard-static_files'),

			// If those files aren't found, check the node_modules directory of
			// the current application for upgrades.
			path.join(startDir, 'node_modules', 'ljswitchboard-static_files'),

			// For non-development use, check the LabJack folder/K3/downloads
			// file for upgrades.
			// TODO: Add this directory

			// If all fails, check the starting directory of the process for the
			// zipped files originally distributed with the application.
			path.join(startDir, 'ljswitchboard-static_files.zip')
		]
	},
	{
		// 'name': 'ljswitchboard-core',
		'name': 'core',
		'folderName': 'ljswitchboard-core',
		'loadMethod': 'managed',
		'forceRefresh': false,
		'startApp': false,
		'showDevTools': true,
		'directLoad': true,
		'locations': [
			// Add path to files for development purposes, out of a repo.
			path.join(startDir, '..', 'ljswitchboard-core'),

			// If those files aren't found, check the node_modules directory of
			// the current application for upgrades.
			path.join(startDir, 'node_modules', 'ljswitchboard-core'),

			// For non-development use, check the LabJack folder/K3/downloads
			// file for upgrades.
			// TODO: Add this directory

			// If all fails, check the starting directory of the process for the
			// zipped files originally distributed with the application.
			path.join(startDir, 'ljswitchboard-core.zip')
		]
	}
];

var errorMessage = {
	'core': "Make sure that you download and installed the LabJack's main installer",
	'persistentData': "Failed to initialize or re-initialize K3's persistent data"
};

var errorHandler = function(err) {
	var defered = q.defer();
	console.log('Error encountered', err);
	defered.reject(err);
	return defered.promise;
};


var initializeProgram = function() {
	var defered = q.defer();

	// Show the window's dev tools
	win.showDevTools();

	// Perform synchronous loading of modules:
	rootPackages.forEach(function(packageInfo) {
		package_loader.loadPackage(packageInfo);
	});

	// Perform async operations
	global.ljswitchboard.ljm_driver_checker.verifyCoreInstall()
	.then(function(res) {
		console.log('Core Req Check', res);
		// Make sure that the LabJack directory has been created
		if(res.overallResult) {
			var lj_folder_path = res['LabJack folder'].path;

			// Save to the global scope
			global.ljswitchboard.labjackFolderPath = lj_folder_path;
			persistentDataManager = new persistent_data_manager.create(
				lj_folder_path,
				gui.App.manifest.persistentDataFolderName,
				gui.App.manifest.persistentDataVersion
			);

			// Save the path to the global scope
			global.ljswitchboard.appDataPath = persistentDataManager.getPath();
			var forceRefresh = gui.App.manifest.forceRefreshOfPersistentData;
			persistentDataManager.init(forceRefresh)
			.then(function(res) {
				console.log('Re-Initialized Data:', res);
				defered.resolve();
			}, function(err) {
				console.log('Failed to initialize data', err);
				defered.reject({'code': 'persistentData', 'data': err});
			});
		} else {
			defered.reject({'code': 'core', 'data': res});
		}
	});
	return defered.promise;
};

var loadSecondaryPackages = function() {
	var defered = q.defer();
	console.log('Loading Secondary Packages');

	// Get the appDataPath
	var appDataPath = global.ljswitchboard.appDataPath;

	// Configure the package_loader with this path
	package_loader.setExtractionPath(appDataPath);

	secondaryPackages.forEach(function(packageInfo) {
		package_loader.loadPackage(packageInfo);
	});
	package_loader.runPackageManager()
	.then(function(packages) {
		console.log('Managed Packages', packages);
		var managedPackageKeyss = Object.keys(packages);
		managedPackageKeyss.forEach(function(managedPackageKey) {
			// Add the managed packages root locations to the req library.
			var dirToAdd = packages[managedPackageKey].packageInfo.location;
			global.ljswitchboard.req.addDirectory(dirToAdd);

			try {
				// Open the found nwApp libraries
				console.log('HH', packages[managedPackageKey].packageData);
				if(packages[managedPackageKey].packageData) {
					var loadedAppData = packages[managedPackageKey].packageData;
					if(loadedAppData['ljswitchboard-main']) {
						var appFile = loadedAppData['ljswitchboard-main'];
						var appType = path.extname(appFile);
						if(appType === '.html') {
							console.log('Opening .html', appFile, appType);
							var requiredInfo = {
								'main': appFile
							};
							console.log(packages[managedPackageKey].packageInfo,
								requiredInfo,
								packages[managedPackageKey].packageData
							);
							var openedWindow = window_manager.open(
								packages[managedPackageKey].packageInfo,
								requiredInfo,
								packages[managedPackageKey].packageData
							);
						}
					}
				}
			} catch(err) {
				console.log('Error...', err);
			}
		});

		// Execute test function to proove that io_manager can be used.
		// global.require('../../test.js').runProgram();

	});

	return defered.promise;
};


win.on('loaded', function() {
	console.log('LJSwitchboard Window Loaded!');
	initializeProgram()
	.then(loadSecondaryPackages, errorHandler);
});







// Load the ljswitchboard-core
// var ljswitchboard_core = require('../ljswitchboard-core');
// console.log(ljswitchboard_core);


if(false) {
// Perform a switch based on if this is a test or not.
if(gui.App.manifest.test) {
	// If set to 'test', perform testing code

	// Load the testing window
	// win.window.location = './test/test_ljswitchboard.html';
	console.log('This is a test, starting test window');
	var test_ljswitchboard = gui.Window.open('test_index.html', {
		position: 'center',
		width: 900,
		height: 900
	});

	test_ljswitchboard.on('closed', function() {
		win = null;
	});


	// Detect when a user closes the test_window
	test_ljswitchboard.on('close', function() {
		// Hide the test_ljswitchboard window for improved user feedback.
		this.hide();

		if(win !== null) {
			// Also close the startup window
			win.close(true);
		}

		// After closing the main window, close the test_ljswitchboard window
		this.close(true);
	});
	win.on('close', function() {
		console.log('Close captured');
		// Hide the startup window for improved user feedback.
		this.hide();

		// If the test_ljswitchboard window is still open then close it.
		if(test_ljswitchboard !== null) {
			test_ljswitchboard.close(true);
		}

		// After closing the startup window, close the test_ljswitchboard.
		this.close(true);
	});

} else {
	// If this isn't a test then start ljswitchboard
	var start_ljswitchboard = require('./lib/start_ljswitchboard');
}

}