console.log("ljswitchboard-kipling index.js");

var gui = require('nw.gui');
var path = require('path');
var q = require('q');
var win = gui.Window.get();


var package_loader = require('ljswitchboard-package_loader');
var gns = package_loader.getNameSpace();
var window_manager = require('ljswitchboard-window_manager');
var GLOBAL_SUBPROCESS_REFERENCE;
var GLOBAL_ALLOW_SUBPROCESS_TO_RESTART = true;
var UPDATE_K3_WINDOW_VERSION_NUMBER_STR = function(str) {
	win.title = 'Kipling '+str;
};

var K3_ON_APPLICATION_EXIT_LISTENER = function() {
	GLOBAL_ALLOW_SUBPROCESS_TO_RESTART = false;

	io_interface.off(io_interface.eventList.PROCESS_CLOSE);
	// console.log(JSON.stringify(['Quitting Application', GLOBAL_ALLOW_SUBPROCESS_TO_RESTART, GLOBAL_SUBPROCESS_REFERENCE]));
	try {
		if(GLOBAL_SUBPROCESS_REFERENCE) {
			GLOBAL_SUBPROCESS_REFERENCE.kill('SIGHUP');
		}
	} catch(err) {
		console.log('Error quitting subprocess', err);
	}
	console.log('Quit sub-process');
};
window_manager.on(
	window_manager.eventList.QUITTING_APPLICATION,
	K3_ON_APPLICATION_EXIT_LISTENER
);

// Prevent application from auto-closing so that we can have an asynchronous hook
// aka close app manually.
window_manager.windowManager.managedWindows.kipling.runInBackground = true;

function restartIOInterface() {
	if(MODULE_LOADER) {
		MODULE_LOADER.loadModuleByName('crash_module');
	}
	// global[gns].ljm.io_interface.destroy()
	// .then(global[gns].ljm.io_interface.initialize)
	// .then(saveGlobalSubprocessReference)
	// .then(MODULE_CHROME.reloadModuleChrome);
	// // .then(startCoreApp)
	if(MODULE_LOADER) {
		MODULE_LOADER.loadModuleByName('crash_module');
	}
	// K3_ON_APPLICATION_EXIT_WINDOW_LISTENER(true)
	// .then(global[gns].ljm.io_interface.destroy)
	// .then(function() {
	// 	return ;
	// })
	global[gns].ljm.io_interface.destroy()
	.then(function() {
		window_manager.windowManager.managedWindows.kipling.win.reload();
	});
}
/*
SCRATCH PAD:
// Prevent app from closing
window_manager.windowManager.managedWindows.kipling.runInBackground = true;

// quit app.
window_manager.windowManager.managedWindows.kipling.win.close(true)
*/
var K3_EXIT_LISTENERS = {};
function ADD_K3_EXIT_LISTENER(name, func) {
	K3_EXIT_LISTENERS[name] = func;
}
function DELETE_K3_EXIT_LISTENER(name) {
	delete(K3_EXIT_LISTENERS[name]);
}
function GET_ALL_K3_EXIT_LISTENERS() {
	var listeners = [];
	var keys = Object.keys(K3_EXIT_LISTENERS);
	keys.forEach(function(key) {
		listeners.push(K3_EXIT_LISTENERS[key]);
	});
	return listeners;
}
function K3_ON_APPLICATION_EXIT_WINDOW_LISTENER(enablePromise) {
	var defered;
	if(enablePromise) {
		defered = q.defer();
	}
	var asyncProcesses = GET_ALL_K3_EXIT_LISTENERS();
	async.eachSeries(
		asyncProcesses,
		function closeAppAsyncProcess(process, cb) {
			try {
				process().then(function(res) {
					cb();
				}, function(err) {
					cb();
				}).catch(function(err) {
					cb();
				});
			} catch(err) {
				// Error...
				cb();
			}
		},
		function finishedClosingAsyncProcesses(err) {
			// Close app.
			// K3_ON_APPLICATION_EXIT_LISTENER();
			// window_manager.windowManager.managedWindows.kipling.win.close(true);
			closeApp();
		});

	function closeApp() {
		var interval;
		var numWaited = 0;
		var numToWait = 1;
		function waitToClose() {
			if(numWaited < numToWait) {
				numWaited += 1;
				console.log('Waiting to close.....', numWaited);
			} else {
				// Close app.
				try {
					if(enablePromise) {
						K3_ON_APPLICATION_EXIT_LISTENER();
					} else {
						defered.resolve();
					}
					
				} catch(err) {
					console.error('Error exiting things...', err);
				}
				window_manager.windowManager.managedWindows.kipling.win.close(true);
			}
		}
		interval = setInterval(waitToClose, 500);
	}
	if(enablePromise) {
		return defered.promise;
	}
}
window_manager.on(
	window_manager.eventList.PREVENTING_WINDOW_FROM_CLOSING,
	K3_ON_APPLICATION_EXIT_WINDOW_LISTENER
);
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

var saveGlobalSubprocessReference = function(bundle) {
	var defered = q.defer();
	GLOBAL_SUBPROCESS_REFERENCE = io_manager.io_interface().mp.masterProcess.getSubprocess();
	// console.log('subprocess pid', GLOBAL_SUBPROCESS_REFERENCE.pid);
	defered.resolve(bundle);
	return defered.promise;
};

var ioManagerMonitor = function(data) {
	if(GLOBAL_ALLOW_SUBPROCESS_TO_RESTART) {
		console.log('io_manager Close Event detected, restarting', data);
		var errorString = '<p>';
		errorString += 'Kipling\'s sub-process was closed or has crashed and ';
		errorString += 'is being restarted.';
		errorString += '</p>';
		errorString += '<p>';
		errorString += 'Current time is: ' + (new Date()).toString();
		errorString += '</p>';

		showCriticalAlert(errorString);
		console.log('Critical alert errorString', errorString);
		if(MODULE_LOADER) {
			MODULE_LOADER.loadModuleByName('crash_module');
		}
		global[gns].ljm.io_interface.initialize()
		.then(saveGlobalSubprocessReference)
		.then(MODULE_CHROME.reloadModuleChrome);
	} else {
		console.log('subprocess exited and not restarting');
	}
};

// Add monitors to the other error events.
// io_interface.on(io_interface.eventList.PROCESS_ERROR, getIOManagerListener('PROCESS_ERROR'));
// io_interface.on(io_interface.eventList.PROCESS_EXIT, getIOManagerListener('PROCESS_EXIT'));
// io_interface.on(io_interface.eventList.PROCESS_DISCONNECT, getIOManagerListener('PROCESS_DISCONNECT'));

function getIOManagerListener(eventName) {
	return function ioInterfaceProcessMonitor(data) {
		console.log('Recieved event from io_interface:', eventName, data, (new Date()).toString());
	};
}


var startIOManager = function(){
	var defered = q.defer();
	var io_interface = global[gns].io_manager.io_interface();
	global[gns].ljm = {};
	global[gns].ljm.io_interface = io_interface;

	var reportIOInitializationError = function(data) {
		console.error('io_interface.initialize error:', data);

		var remainingMessage = '';

		if(data.code === 'EPERM') {
			remainingMessage += ', Permissions';
		} else {
			console.log(typeof(data.code), data.code);
			remainingMessage += ', Subprocess Failed';
		}
		global[gns].splash_screen.update('Failed to initialize IO Manager' + remainingMessage);
	};
	// Attach monitor
	GLOBAL_ALLOW_SUBPROCESS_TO_RESTART = true;
	io_interface.on(io_interface.eventList.PROCESS_CLOSE, ioManagerMonitor);

	// Add monitors to the other error events.
	io_interface.on(io_interface.eventList.PROCESS_ERROR, getIOManagerListener('PROCESS_ERROR'));
	io_interface.on(io_interface.eventList.PROCESS_EXIT, getIOManagerListener('PROCESS_EXIT'));
	io_interface.on(io_interface.eventList.PROCESS_DISCONNECT, getIOManagerListener('PROCESS_DISCONNECT'));

	io_interface.initialize()
	.then(saveGlobalSubprocessReference,reportIOInitializationError)
	.then(defered.resolve, defered.reject);
	return defered.promise;
};

var performRemainingInitializationRoutines = function() {
	var defered = q.defer();

	var managers = {
		'keyboard': KEYBOARD_EVENT_HANDLER,
		'mouse': MOUSE_EVENT_HANDLER,
		'zoom': WINDOW_ZOOM_MANAGER,
	};

	function finalize() {
		defered.resolve();
	}
	
	KEYBOARD_EVENT_HANDLER.init(managers)
	.then(WINDOW_ZOOM_MANAGER.init)
	.then(MOUSE_EVENT_HANDLER.init)
	.then(finalize, defered.reject);

	return defered.promise;
};

var showKiplingWindow = function() {
	var defered = q.defer();
	global[gns].splash_screen.update('Finished');
	global[gns].window_manager.hideWindow('core');
	// global[gns].window_manager.showWindow('core');
	global[gns].window_manager.hideWindow('main');
	global[gns].window_manager.showWindow('kipling');

	// Try and execute tests
	var isKiplingTester = false;
	var windows = global[gns].window_manager.getWindows();
	windows.forEach(function(win) {
		if(win === 'kipling_tester') {
			isKiplingTester = true;
		}
	});
	if(isKiplingTester) {
		global[gns].window_manager.showWindow('kipling_tester');
		var testerWin = global[gns].window_manager.windowManager.managedWindows.kipling_tester;
		testerWin = testerWin.win;
		testerWin.focus();
		var testerWindow = testerWin.window;
		testerWindow.runTests();
	}
	defered.resolve();
	return defered.promise;
};

var getHandleError = function(msg) {
	var handleError = function(err) {
		var reportError = true;
		if(err) {
			if(err.loadError) {
				reportError = false;
			}
		}

		var defered = q.defer();
		if(reportError) {
			console.error('Error on step', msg);
			defered.reject({
				'loadError': true,
				'message': 'Error on step: ' + msg.toString(),
				'errorInfo': err,
			});
		} else {
			defered.reject(reportError);
		}
		return defered.promise;
	};
	return handleError;
};
var numLoadDelay = 0;
var startCoreApp = function() {
	var defered = q.defer();
	if(coreResourcesLoaded && localResourcesLoaded) {
		// win.showDevTools();
		// Start the application
		global[gns].splash_screen.update('Starting IO Manager');

		// Start the  IO Manager
		startIOManager()

		// Perform other initialization routines
		.then(performRemainingInitializationRoutines, getHandleError('startIOManager'))

		// Render the module chrome window
		.then(MODULE_CHROME.loadModuleChrome, getHandleError('performRemainingInitializationRoutines'))

		// Initialize the file browser utility
		.then(FILE_BROWSER.initialize, getHandleError('MODULE_CHROME.loadModuleChrome'))

		// Hide the splash screen & core windows & display the kipling window
		.then(showKiplingWindow, getHandleError('FILE_BROWSER.initialize'))

		// Load Kipling background tasks
		.then(TASK_LOADER.loadTasks, getHandleError('showKiplingWindow'))

		// Report remaining errors
		.then(defered.resolve, getHandleError('TASK_LOADER.loadTasks'))
		.then(defered.resolve, defered.resolve);

	} else {
		numLoadDelay += 1;
		if(numLoadDelay > 10) {
			if(numLoadDelay > 2000) {
				win.showDevTools();
			}
			console.log('numLoadDelay', numLoadDelay);
			setTimeout(startCoreApp, 100);
		} else {
			setTimeout(startCoreApp, 10);
		}
	}
	return defered.promise;
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