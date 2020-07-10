
var EventEmitter = require('events').EventEmitter;
var util = require('util');

var eventList = {
	ALL_WINDOWS_CLOSED: 'all_windows_closed',
	CLOSED_PRIMARY_WINDOW: 'closed_primary_window'
};

function createWindowManager() {
	// Define default options
	this.options = {
		'allowWindowlessApp': false,
		'primaryWindowName': 'main'
	};

	this.configure = function(options) {
		// Transfer options to "self"
		var optionKeys = Object.keys(options);
		optionKeys.forEach(function(optionKey) {
			this.options[optionKey] = options[optionKey];
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

	this.getLoadedListener = function(windowInfo) {
		var windowName = windowInfo.windowName;

		var onLoadedListener = function() {
			// Set the window's title from the window's package.json reference.
			var win = self.managedWindows[windowName].win;
			var initialVisibility = self.managedWindowKeys[windowName].initialVisibility;
			
			// Configure the window's title
			win.title = self.managedWindows[windowName].title;

			// Manage the other window attributes
			self.managedWindows[windowName].status = 'loaded';
			self.managedWindows[windowName].isOpen = true;
			self.managedWindows[windowName].isVisible = initialVisibility;
			console.log('Finished Loading Window', this.title, 'aka', windowName);
		};
		return onLoadedListener;
	};
	this.getCloseListener = function(windowInfo) {
		var windowName = windowInfo.windowName;

		var onCloseListener = function() {
			self.managedWindows[windowName].win.hide();

			console.log('Closing Window...', this.title, 'aka', windowName);

			// Manage the other window attributes
			self.managedWindows[windowName].isVisible = false;
			

			if(self.managedWindows[windowName].isPrimary) {
				if(self.numOpenWindows() === 1) {
					console.log('Only one window left');
					if(!self.options.allowWindowlessApp) {
						self.managedWindows[windowName].status = 'closing';
						self.managedWindows[windowName].win.close(true);
					}
				}
			} else {
				self.managedWindows[windowName].status = 'closing';
				self.managedWindows[windowName].win.close(true);
			}
		};
		return onCloseListener;
	};
	this.getClosedListener = function(windowInfo) {
		var windowName = windowInfo.windowName;

		var onClosedListener = function() {

			console.log('Closed Window...', this.title, 'aka', windowName);
			self.managedWindows[windowName].isOpen = false;
			self.managedWindows[windowName].status = 'closed';

			if(self.managedWindows[windowName].isPrimary) {
				self.emit(eventList.CLOSED_PRIMARY_WINDOW, windowInfo);
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
		var windowName = windowInfo.windowName;

		console.log('Adding new window', windowName);
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
	var self = this;
}
util.inherits(createIOInterface, EventEmitter);

var WINDOW_MANAGER = new createWindowManager();

exports.windowManager = WINDOW_MANAGER;
exports.addWindow = WINDOW_MANAGER.addWindow;
exports.configure = WINDOW_MANAGER.configure;

exports.eventList = eventList;
