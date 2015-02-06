
var EventEmitter = require('events').EventEmitter;
var util = require('util');

var mock_window = require('./mock_window');
var path = require('path');

var eventList = {
	OPENED_WINDOW: 'opened_window',
	LOADED_WINDOW: 'loaded_window',
	ALL_WINDOWS_CLOSED: 'all_windows_closed',
	PREVENTING_WINDOW_FROM_CLOSING: 'preventing_window_from_closing',
	CLOSED_PRIMARY_WINDOW: 'closed_primary_window'
};

function createWindowManager() {
	// Define default options
	this.options = {
		'allowWindowlessApp': false,
		'primaryWindowName': 'main',
		'gui': {
			'Window': mock_window
		}
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
	};
	this.numOpenWindows = function() {
		var num = false;
		var managedWindowKeys = Object.keys(self.managedWindows);
		managedWindowKeys.forEach(function(managedWindowKey) {
			var managedWindow = self.managedWindows[managedWindowKey];
			if(managedWindow.isOpen) {
				num += 1;
			}
		});
	};

	var getLoadedListener = function(windowInfo) {
		var windowName = windowInfo.name;

		var onLoadedListener = function() {

			// Set the window's title from the window's package.json reference.
			var win = self.managedWindows[windowName].win;
			var initialVisibility = self.managedWindows[windowName].initialVisibility;
			

			// Configure the window's title
			win.title = self.managedWindows[windowName].title;

			// Manage the other window attributes
			self.managedWindows[windowName].status = 'loaded';
			self.managedWindows[windowName].isOpen = true;
			self.managedWindows[windowName].isVisible = initialVisibility;
			// console.log('Finished Loading Window', this.title, 'aka', windowName);
			self.emit(eventList.LOADED_WINDOW, windowInfo);
		};
		return onLoadedListener;
	};
	var getCloseListener = function(windowInfo) {
		var windowName = windowInfo.name;

		var onCloseListener = function() {
			self.managedWindows[windowName].win.hide();

			// console.log('Closing Window...', this.title, 'aka', windowName);

			// Manage the other window attributes
			self.managedWindows[windowName].isVisible = false;
			

			if(self.managedWindows[windowName].isPrimary) {
				if(self.numOpenWindows() === 1) {
					console.log('Only one window left');
					if(!self.options.allowWindowlessApp) {
						self.managedWindows[windowName].status = 'closing';
						self.emit(eventList.CLOSING_WINDOW, windowInfo);
						self.managedWindows[windowName].win.close(true);
					} else {
						self.emit(eventList.PREVENTING_WINDOW_FROM_CLOSING, windowInfo);
					}
				} else {
					self.emit(eventList.PREVENTING_WINDOW_FROM_CLOSING, windowInfo);
				}
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

			// console.log('Closed Window...', this.title, 'aka', windowName);
			self.managedWindows[windowName].isOpen = false;
			self.managedWindows[windowName].status = 'closed';

			if(self.managedWindows[windowName].isPrimary) {
				self.emit(eventList.CLOSED_PRIMARY_WINDOW, windowInfo);
				self.emit(eventList.CLOSED_WINDOW, windowInfo);
			} else {
				self.emit(eventList.CLOSED_WINDOW, windowInfo);
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

		console.log('  - Adding new window', windowName);
		self.managedWindows[windowName] = windowInfo;
		self.managedWindows[windowName].status = 'loading';
		self.managedWindows[windowName].isOpen = false;
		self.managedWindows[windowName].isVisible = false;
		if(windowName === 'main') {
			self.managedWindows[windowName].isPrimary = true;
		} else {
			self.managedWindows[windowName].isPrimary = false;
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
		// Local reference to nw.gui
		var gui = self.options.gui;

		console.log('Reference to gui', Object.keys(gui));

		// Get the module's data that should be used when opening the new window
		var newWindowData;
		if(appData.window) {
			newWindowData = appData.window;
		}

		// Build the url and moduleData path
		var windowPath = 'file:///' + path.join(packageInfo.location, info.main);

		// Open a new window and save its reference
		console.log('Reference to gui', Object.keys(gui.Window));
		var newWindow = gui.Window.open(
			windowPath,
			newWindowData
		);

		// Emit an event indicating that a new window has been opened.
		self.emit(eventList.OPENED_WINDOW, packageInfo.name);

		return newWindow;
	};
	var self = this;
}
util.inherits(createWindowManager, EventEmitter);

var WINDOW_MANAGER = new createWindowManager();

exports.windowManager = WINDOW_MANAGER;
exports.open = WINDOW_MANAGER.openWindow;
exports.addWindow = WINDOW_MANAGER.addWindow;
exports.configure = WINDOW_MANAGER.configure;
exports.getWindows = WINDOW_MANAGER.getWindows;
exports.isManagedWindow = WINDOW_MANAGER.isManagedWindow;
exports.hideWindow = WINDOW_MANAGER.hideWindow;
exports.showWindow = WINDOW_MANAGER.showWindow;
exports.closeWindow = WINDOW_MANAGER.closeWindow;

exports.eventList = eventList;
