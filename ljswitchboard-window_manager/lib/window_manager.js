
var EventEmitter = require('events').EventEmitter;
var util = require('util');
var q = require('q');
var async = require('async');

var path = require('path');

var eventList = {
	OPENED_WINDOW: 'opened_window',
	LOADED_WINDOW: 'loaded_window',
	ALL_WINDOWS_CLOSED: 'all_windows_closed',
	PREVENTING_WINDOW_FROM_CLOSING: 'preventing_window_from_closing',
	ALL_WINDOWS_ARE_HIDDEN: 'all_windows_are_hidden',
	QUITTING_APPLICATION: 'quitting_application',
	CLOSED_PRIMARY_WINDOW: 'closed_primary_window'
};

var DEBUG_WINDOW_EVENT_LISTENERS = false;
var DEBUG_WINDOW_MANAGER = true;
var DEBUG_WINDOW_EVENT_LIST = false;
var DEBUG_PRINT_WINDOW_EVENT_DATA = false;

function createWindowManager() {
	// Define default options
	this.options = {
		'allowWindowlessApp': false,
		'primaryWindowName': 'main',
		'gui': undefined
	};

	this.configure = function(options) {
		// Transfer options to "self"
		var optionKeys = Object.keys(options);
		optionKeys.forEach(function(optionKey) {
			self.options[optionKey] = options[optionKey];
		});
	};

	// this.mainWindow = mainWindow;
	// this.mainWindowInitialState = 

	// mainWindow.on('close', function() {
	// 	var hideWindow = false;
	// 	if(global.ljswitchboard) {
	// 		if(global.ljswitchboard.tray) {
	// 			hideWindow = true;
	// 		}
	// 	}

	// 	if(hideWindow) {
	// 		mainWindow.hide();
	// 	} else {
	// 		this.close(true);
	// 	}
	// });
	this.managedWindows = {};

	this.areAnyWindowsVisible = function() {
		var areWindowsVisible = false;
		var managedWindowKeys = Object.keys(self.managedWindows);
		managedWindowKeys.forEach(function(managedWindowKey) {
			var managedWindow = self.managedWindows[managedWindowKey];
			if(managedWindow.isVisible) {
				areWindowsVisible = true;
			}
		});
		return areWindowsVisible;
	};
	this.numVisibleWindows = function() {
		var num = 0;
		var managedWindowKeys = Object.keys(self.managedWindows);
		managedWindowKeys.forEach(function(managedWindowKey) {
			var managedWindow = self.managedWindows[managedWindowKey];
			if(managedWindow.isVisible) {
				num += 1;
			}
		});
		return num;
	};
	this.areAnyWindowsOpen = function() {
		var areWindowsOpen = false;
		var managedWindowKeys = Object.keys(self.managedWindows);
		managedWindowKeys.forEach(function(managedWindowKey) {
			var managedWindow = self.managedWindows[managedWindowKey];
			if(managedWindow.isOpen) {
				areWindowsOpen = true;
			}
		});
		return areWindowsOpen;
	};
	this.numOpenWindows = function() {
		var num = 0;
		var managedWindowKeys = Object.keys(self.managedWindows);
		managedWindowKeys.forEach(function(managedWindowKey) {
			var managedWindow = self.managedWindows[managedWindowKey];
			if(managedWindow.isOpen) {
				num += 1;
			}
		});
		return num;
	};
	this.getOpenWindows = function() {
		var openWindows = [];
		var managedWindowKeys = Object.keys(self.managedWindows);
		managedWindowKeys.forEach(function(managedWindowKey) {
			var managedWindow = self.managedWindows[managedWindowKey];
			if(managedWindow.isOpen) {
				openWindows.push(managedWindowKey);
			}
		});
		return openWindows;
	};

	var getLoadedListener = function(windowInfo) {
		var windowName = windowInfo.name;

		var onLoadedListener = function() {
			if(DEBUG_WINDOW_EVENT_LISTENERS) {
				console.log('  * Window Loaded', windowName);
			}

			// Set the window's title from the window's package.json reference.
			var win = self.managedWindows[windowName].win;
			var initialVisibility = self.managedWindows[windowName].initialVisibility;
			

			// Configure the window's title
			win.title = self.managedWindows[windowName].title;

			// Manage the other window attributes
			self.managedWindows[windowName].status = 'loaded';
			self.managedWindows[windowName].isOpen = true;
			self.managedWindows[windowName].isVisible = initialVisibility;

			// Determine if we should auto-show the window
			if(self.managedWindows[windowName].autoShow) {
				self.showWindow(windowName);
			}
			
			// console.log('Finished Loading Window', this.title, 'aka', windowName);
			self.emit(eventList.LOADED_WINDOW, windowInfo);
		};
		return onLoadedListener;
	};
	var getCloseListener = function(windowInfo) {
		var windowName = windowInfo.name;

		var onCloseListener = function() {
			if(DEBUG_WINDOW_EVENT_LISTENERS) {
				console.log('  * Closing Window', windowName);
			}

			// Immediately hide the window for better user expereince.
			self.managedWindows[windowName].win.hide();

			// Manage the other window attributes
			self.managedWindows[windowName].isVisible = false;
			
			// If the window is enabled to run in the background, hide it and
			// prevent it from closing.
			if(self.managedWindows[windowName].runInBackground) {
				self.emit(eventList.PREVENTING_WINDOW_FROM_CLOSING, windowInfo);
				
				// if(self.numOpenWindows() === 1) {
				// 	console.log('Only one window left');
				// 	if(!self.options.allowWindowlessApp) {
				// 		self.managedWindows[windowName].status = 'closing';
				// 		self.emit(eventList.CLOSING_WINDOW, windowInfo);
				// 		self.managedWindows[windowName].win.close(true);
				// 	} else {
				// 		self.emit(eventList.PREVENTING_WINDOW_FROM_CLOSING, windowInfo);
				// 	}
				// } else {
				// 	self.emit(eventList.PREVENTING_WINDOW_FROM_CLOSING, windowInfo);
				// }
			} else {
				self.managedWindows[windowName].status = 'closing';
				self.emit(eventList.CLOSING_WINDOW, windowInfo);
				self.managedWindows[windowName].win.close(true);
			}
		};
		return onCloseListener;
	};
	var getClosedListener = function(windowInfo) {
		var windowName = windowInfo.name;

		var onClosedListener = function() {
			if(DEBUG_WINDOW_EVENT_LISTENERS) {
				console.log('  * Window Closed', windowName);
			}
			// console.log('Closed Window...', this.title, 'aka', windowName);
			self.managedWindows[windowName].isOpen = false;
			self.managedWindows[windowName].status = 'closed';

			if(self.managedWindows[windowName].isPrimary) {
				self.emit(eventList.CLOSED_PRIMARY_WINDOW, windowInfo);
				self.emit(eventList.CLOSED_WINDOW, windowInfo);
			} else {
				self.emit(eventList.CLOSED_WINDOW, windowInfo);
			}

			// Check to see if there aren't any more visible windows after
			// closing the window to see if the application should be allowed to
			// run in the background.  If not, exit the program
			if(self.numVisibleWindows() === 0) {
				if(self.options.allowWindowlessApp) {
					self.emit(eventList.ALL_WINDOWS_ARE_HIDDEN);
				} else {
					try {
						self.emit(eventList.QUITTING_APPLICATION);
					} catch(err) {
						// Error telling emitters that we are quitting.
					}
					
					var innerQuitApplication = function() {
						try {
							var openWindows = self.getOpenWindows();
							openWindows.forEach(function(openWindow) {
								self.managedWindows[openWindow].win.close();
							});
						} catch(err) {
							// Error informing each window to quit
						}

						try {
							self.options.gui.App.quit();
						} catch(err) {
							// Error quitting the application
						}


						// try {
						// 	process.exit();
						// } catch(err) {
						// 	// Error telling the process to exit.
						// }
					}
					setImmediate(innerQuitApplication);
					// // TODO: Not sure why but in the basic test which does a 
					// // crude timeout to check for the window exiting, it 
					// // finishes b/c this function gets called to early.  The
					// // event emitter for QUITTING_APPLICATION works but this one
					// // doesn't.  Also, it may be a good idea to let the app run 
					// // for a few ms after the last window closes anyways. 
					// // self.options.gui.App.quit(); 
				}
			}
		};
		return onClosedListener;
	};
	/**
	Example windowInfo object:
	windowInfo = {
		// User defined attributes
		'name': 'myNewWindow',
		'win': windowObject,
		'initialVisibility': initialVisibilityState,
		'title': 'myWindowTitle',
		'runInBackground': defaults to false.

		// Appended to object
		'isPrimary': undefined,
		'isVisible': undefined,
		'status': undefined,
		'isOpen': undefined
	};

	The windowManager automatically adds the 'status' and 'isOpen' attributes.

	The 'status' attribute can be any of the following:
	    'loading', 'loaded', 'closing', or 'closed'
	The 'isOpen' attribute is a boolean that is set to true after the 'loaded'
	    event and set to false when the close event gets triggered.
	**/
	this.addWindow = function(windowInfo) {
		var windowName = windowInfo.name;

		if(DEBUG_WINDOW_MANAGER) {
			console.log('  - Adding new window', windowName);
		}
		self.managedWindows[windowName] = windowInfo;
		self.managedWindows[windowName].status = 'loading';
		self.managedWindows[windowName].isOpen = false;
		self.managedWindows[windowName].isVisible = false;
		if(windowName === 'main') {
			self.managedWindows[windowName].isPrimary = true;
		} else {
			self.managedWindows[windowName].isPrimary = false;
		}

		if(windowInfo.runInBackground) {
			self.managedWindows[windowName].runInBackground = true;
		} else {
			self.managedWindows[windowName].runInBackground = false;
		}

		if(windowInfo.autoShow) {
			self.managedWindows[windowName].autoShow = true;
		} else {
			self.managedWindows[windowName].autoShow = false;
		}


		self.managedWindows[windowName].win.on(
			'loaded',
			getLoadedListener(windowInfo)
		);
		self.managedWindows[windowName].win.on(
			'close',
			getCloseListener(windowInfo)
		);
		self.managedWindows[windowName].win.on(
			'closed',
			getClosedListener(windowInfo)
		);
	};

	this.getWindows = function() {
		return Object.keys(self.managedWindows);
	};
	this.isManagedWindow = function(windowName) {
		var isManaged = false;
		var windowKeys = self.getWindows();
		if (windowKeys.indexOf(windowName) >= 0) {
			isManaged = true;
		}
		return isManaged;
	};
	this.hideWindow = function(windowName) {
		if(self.isManagedWindow(windowName)) {
			self.managedWindows[windowName].win.hide();
			self.managedWindows[windowName].isVisible = false;
		}
	};
	this.showWindow = function(windowName) {
		if(self.isManagedWindow(windowName)) {
			self.managedWindows[windowName].win.show();
			self.managedWindows[windowName].isVisible = true;
		}
	};
	this.closeWindow = function(windowName) {
		if(self.isManagedWindow(windowName)) {
			self.managedWindows[windowName].win.close();
		}
	};
	/*
	Required fields from packageInfo are:
	packageInfo.location

	Required fields from info are:
	info.main

	Required fields from appData which is essentially a node-webkit package.json
	appData.window

	All three of these are objects that get saved by the 
	ljswitchboard-package_loader project.
	*/
	this.openWindow = function(packageInfo, info, appData) {
		var defered = q.defer();
		// Make sure that the gui object is defined
		if(typeof(self.options.gui) === 'undefined') {
			throw new Error('Must configure the module_manager, gui is not defined');
		}
		if(typeof(self.options.gui.Window) === 'undefined') {
			throw new Error('Must configure the module_manager, gui.Window is not defined');
		}

		// Save a local reference to nw.gui
		var gui = self.options.gui;

		if(DEBUG_WINDOW_MANAGER) {
			console.log('Reference to gui', Object.keys(gui));
		}
		

		// Get the module's data that should be used when opening the new window
		var newWindowData = {};
		if(appData.window) {
			newWindowData = appData.window;
		}

		// Build the url and moduleData path
		var windowPath = 'file:///' + path.join(packageInfo.location, info.main);

		// Add a conditional debug message
		if(DEBUG_WINDOW_MANAGER) {
			console.log('Reference to gui.Window', Object.keys(gui.Window));
		}

		var asyncOpen = false;
		if(typeof(process.versions.nw) !== 'undefined') {
			// crude NW version check
			if(process.versions.nw > "0.12.3") {
				asyncOpen = true;
				if(typeof(newWindowData.toolbar) !== 'undefined') {
					delete newWindowData.toolbar;
					// TODO: This fails on NW 0.13++:
					// https://github.com/nwjs/nw.js/issues/4418
					// https://github.com/nwjs/nw.js/issues/6149
					// Can't open new windows & share objects between them.
					// Potentially worth adding (in the future, 10/21/2019, not working):
					// -- "chromium-args": "--enable-features=nw2"
					newWindowData.new_instance = true;
				}
			}
		}
		

		if(asyncOpen) {
			// Open a new window and save its reference, nw0.13++ uses an async "open" call.
			gui.Window.open(
				windowPath,
				newWindowData,
				function(win) {
					var initialVisibilityState = true;
					var windowTitle = '';

					if(newWindowData.title) {
						windowTitle = newWindowData.title;
					}
					if(typeof(newWindowData.show) !== 'undefined') {
						initialVisibilityState = newWindowData.show;
					}

					// Build the windowInfo object to be passed to the self.addWindow function
					var windowInfo = {
						'name': packageInfo.name,
						'win': win,
						'initialVisibility': initialVisibilityState,
						'title': windowTitle
					};
					self.addWindow(windowInfo);

					// Emit an event indicating that a new window has been opened.
					self.emit(eventList.OPENED_WINDOW, packageInfo.name);

					defered.resolve(win);
				}
			);
		} else {
			// Open a new window and save its reference
			var newWindow = gui.Window.open(
				windowPath,
				newWindowData
			);

			var initialVisibilityState = true;
			var windowTitle = '';

			if(newWindowData.title) {
				windowTitle = newWindowData.title;
			}
			if(typeof(newWindowData.show) !== 'undefined') {
				initialVisibilityState = newWindowData.show;
			}

			// Build the windowInfo object to be passed to the self.addWindow function
			var windowInfo = {
				'name': packageInfo.name,
				'win': newWindow,
				'initialVisibility': initialVisibilityState,
				'title': windowTitle
			};
			self.addWindow(windowInfo);

			// Emit an event indicating that a new window has been opened.
			self.emit(eventList.OPENED_WINDOW, packageInfo.name);

			defered.resolve(newWindow);
		}
		

		// return newWindow;
		return defered.promise;
	};
	this.openManagedApps = function(packages) {
		var defered = q.defer();
		var keys = Object.keys(packages);

		async.eachSeries(keys, function(key, cb) {
			try {
				// Open the found nwApp libraries
				var reqOpenWindow = false;
				if(packages[key].packageData) {
					var loadedAppData = packages[key].packageData;
					if(loadedAppData['ljswitchboard-main']) {
						var appFile = loadedAppData['ljswitchboard-main'];
						var appType = path.extname(appFile);
						if(appType === '.html') {
							var requiredInfo = {
								'main': appFile
							};
							reqOpenWindow = true;
							self.openWindow(
								packages[key].packageInfo,
								requiredInfo,
								packages[key].packageData
							).then(function(res) {
								cb();
							}, function(err) {
								cb(err);
							});
						} 
					}
				}
				if(!reqOpenWindow) {
					cb();
				}
			} catch (err) {
				console.error('Error Opening App', key, err);
			}
		}, function(err) {
			if(err) {
				defered.reject(err);
			} else {
				defered.resolve();
			}
		});

		return defered.promise;
	};
	var self = this;
}
util.inherits(createWindowManager, EventEmitter);

var WINDOW_MANAGER = new createWindowManager();

if(DEBUG_WINDOW_EVENT_LIST) {
	var eventKeys = Object.keys(eventList);
	eventKeys.forEach(function(key) {
		WINDOW_MANAGER.on(eventList[key], function(data) {
			if(DEBUG_PRINT_WINDOW_EVENT_DATA) {
				console.log(
					'  ! Event: ' + key + ', data: ' +
					JSON.stringify(data, null, 2)
				);
			} else {
				console.log('  ! Event: ' + key);
			}
		});
	});
}
exports.linkOutput = function(console) {
	global.console = console;
}
exports.windowManager = WINDOW_MANAGER;
exports.open = WINDOW_MANAGER.openWindow;
exports.openManagedApps = WINDOW_MANAGER.openManagedApps;
exports.addWindow = WINDOW_MANAGER.addWindow;
exports.configure = WINDOW_MANAGER.configure;
exports.getWindows = WINDOW_MANAGER.getWindows;
exports.isManagedWindow = WINDOW_MANAGER.isManagedWindow;
exports.hideWindow = WINDOW_MANAGER.hideWindow;
exports.showWindow = WINDOW_MANAGER.showWindow;
exports.closeWindow = WINDOW_MANAGER.closeWindow;
exports.numVisibleWindows = WINDOW_MANAGER.numVisibleWindows;
exports.numOpenWindows = WINDOW_MANAGER.numOpenWindows;
exports.getOpenWindows = WINDOW_MANAGER.getOpenWindows;
exports.on = function(eventName, func) {
	WINDOW_MANAGER.on(eventName, func);
};

exports.eventList = eventList;
