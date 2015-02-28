console.log("ljswitchboard-kipling_tester index.js");

var gui = require('nw.gui');
var path = require('path');
var q = require('q');
var win = gui.Window.get();

var cwd = path.dirname(document.URL.split('file:///').join(''));

var nodeunit = require(path.normalize(path.join(cwd, '../node_modules/nodeunit')));
var nodeunit_recorder = require(path.normalize(path.join(cwd, 'nodeunit_recorder')));

var testFiles = [
	'../test/test_ljswitchboard.js'
];
for(var i = 0; i < testFiles.length; i++) {
	testFiles[i] = path.normalize(path.join(cwd, testFiles[i]));
}


var package_loader = require('ljswitchboard-package_loader');
var gns = package_loader.getNameSpace();
var window_manager = require('ljswitchboard-window_manager');
var startDir = global[gns].info.startDir;

/*
	Function called to load the application's core resources.
	The resources are loaded from the ljswitchboard-static_files/static
	directory.
*/
var coreResourcesLoaded = false;
var loadCoreResources = function(resources) {
	global[gns].static_files.loadResources(document, resources)
	.then(function(res) {
		coreResourcesLoaded = true;
	}, function(err) {
		console.error('Error Loading resources', err);
	});
};

/*
	Function called to load the application's local resources.
	The resources are loaded starting from the directory of the 
	index.html/index.js file aka the cwd of the window.
*/
var localResourcesLoaded = false;
var loadLocalResources = function(resources) {
	global[gns].static_files.loadResources(document, resources, true)
	.then(function(res) {
		localResourcesLoaded = true;
	}, function(err) {
		console.error('Error Loading resources', err);
	});
};

var loadResources = function(resources, isLocal) {
	var defered = q.defer();
	global[gns].static_files.loadResources(document, resources, isLocal)
	.then(function(res) {
		defered.resolve();
	}, function(err) {
		console.error('Error Loading resources', err);
		defered.reject(err);
	});
	return defered.promise;
};

var runTests = function() {
	console.log('in runTests');
	try {
	var outputHTML = nodeunit_recorder.run(testFiles, {}, function() {
		var savedText = nodeunit_recorder.getSavedText();
		var testDiv = $('#nodeunit_test_results');
		testDiv.html(savedText);
	},function(err) {
		if(err) {
			console.log('Error Running Test');
		} else {
			console.log('Finished running test', savedText);
		}
	});
} catch(err) {
	console.error('Error running tests', err);
}
};

var numLoadDelay = 0;
var startCoreApp = function() {
	if(coreResourcesLoaded && localResourcesLoaded) {
		// win.showDevTools();
	} else {
		numLoadDelay += 1;
		if(numLoadDelay > 5) {
			win.showDevTools();
			console.log('numLoadDelay', numLoadDelay);
			setTimeout(startCoreApp, 100);
		} else {
			setTimeout(startCoreApp, 10);
		}
	}
};

/*
	When the window finishes loading start the core application.

	The application is started in a timeout-loop because some of the resources
	are asynchronously loaded upon start.  The application attempts to start
	every 10ms until those resources are loaded.
*/
window.onload = function(e) {
	setTimeout(startCoreApp, 10);
};

// gui.App.sharedData.appWindows.core.show();
// gui.App.sharedData.appWindows.core.showDevTools();