console.log("ljswitchboard-kipling index.js");

var gui = require('nw.gui');
var path = require('path');
var q = require('q');
var win = gui.Window.get();


var package_loader = require('ljswitchboard-package_loader');
var gns = package_loader.getNameSpace();
var window_manager = require('ljswitchboard-window_manager');
var startDir = global[gns].info.startDir;

var coreResourcesLoaded = false;
var localResourcesLoaded = false;
var loadResources = function(resources) {
	global[gns].static_files.loadResources(document, resources)
	.then(function(res) {
		coreResourcesLoaded = true;
	}, function(err) {
		console.error('Error Loading resources', err);
	});
};
var loadLocalResources = function(resources) {
	global[gns].static_files.loadResources(document, resources, true)
	.then(function(res) {
		localResourcesLoaded = true;
	}, function(err) {
		console.error('Error Loading resources', err);
	});
};

// setInterval(function(){
//	console.log(process.uptime());
// }, 2000);

var startIOManager = function(){
	var defered = q.defer();
	var io_interface = global[gns].io_manager.io_interface();
	global[gns].ljm = {};
	global[gns].ljm.io_interface = io_interface;
	io_interface.initialize()
	.then(defered.resolve, defered.reject);
	return defered.promise;
};

var showKiplingWindow = function() {
	var defered = q.defer();
	global[gns].splash_screen.update('Finished');
	global[gns].window_manager.hideWindow('core');
	global[gns].window_manager.hideWindow('main');
	global[gns].window_manager.showWindow('kipling');
	defered.resolve();
	return defered.promise;
};

var numLoadDelay = 0;
var startCoreApp = function() {
	if(coreResourcesLoaded && localResourcesLoaded) {
		win.showDevTools();
		// Start the application
		global[gns].splash_screen.update('Starting IO Manager');
		startIOManager()
		.then(MODULE_CHROME.loadModuleChrome)
		.then(showKiplingWindow);
		// .then(loadCorePackages);
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

window.onload = function(e) {
	setTimeout(startCoreApp, 10);
};

// gui.App.sharedData.appWindows.core.show();
// gui.App.sharedData.appWindows.core.showDevTools();