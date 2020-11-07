'use strict';

const EventEmitter = require('events').EventEmitter;

const path = require('path');

const eventList = {
	OPENED_WINDOW: 'opened_window',
	LOADED_WINDOW: 'loaded_window',
	ALL_WINDOWS_CLOSED: 'all_windows_closed',
	PREVENTING_WINDOW_FROM_CLOSING: 'preventing_window_from_closing',
	ALL_WINDOWS_ARE_HIDDEN: 'all_windows_are_hidden',
	QUITTING_APPLICATION: 'quitting_application',
	CLOSED_PRIMARY_WINDOW: 'closed_primary_window',
	CLOSING_WINDOW: 'closing_window',
	CLOSED_WINDOW: 'closed_window'
};

const DEBUG_WINDOW_EVENT_LISTENERS = false;
const DEBUG_WINDOW_MANAGER = false;
const DEBUG_WINDOW_EVENT_LIST = false;
const DEBUG_PRINT_WINDOW_EVENT_DATA = false;

class WindowManager extends EventEmitter {

	constructor() {
		super();

		// Define default options
		this.options = {
			'allowWindowlessApp': false,
			'primaryWindowName': 'main',
			'gui': undefined
		};

		this.eventList = eventList;

		this.managedWindows = {};
	}

	configure(options) {
		// Transfer options to "self"
		const optionKeys = Object.keys(options);
		optionKeys.forEach((optionKey) => {
			this.options[optionKey] = options[optionKey];
		});
	}

	areAnyWindowsVisible() {
		let areWindowsVisible = false;
		const managedWindowKeys = Object.keys(this.managedWindows);
		managedWindowKeys.forEach((managedWindowKey) => {
			const managedWindow = this.managedWindows[managedWindowKey];
			if(managedWindow.isVisible) {
				areWindowsVisible = true;
			}
		});
		return areWindowsVisible;
	}

	numVisibleWindows() {
		let num = 0;
		const managedWindowKeys = Object.keys(this.managedWindows);
		managedWindowKeys.forEach((managedWindowKey) => {
			const managedWindow = this.managedWindows[managedWindowKey];
			if(managedWindow.isVisible) {
				num += 1;
			}
		});
		return num;
	}

	areAnyWindowsOpen() {
		let areWindowsOpen = false;
		const managedWindowKeys = Object.keys(this.managedWindows);
		for (const managedWindowKey of managedWindowKeys) {
			const managedWindow = this.managedWindows[managedWindowKey];
			if(managedWindow.isOpen) {
				areWindowsOpen = true;
			}
		}
		return areWindowsOpen;
	}

	numOpenWindows() {
		let num = 0;
		const managedWindowKeys = Object.keys(this.managedWindows);
		for (const managedWindowKey of managedWindowKeys) {
			const managedWindow = this.managedWindows[managedWindowKey];
			if(managedWindow.isOpen) {
				num += 1;
			}
		}
		return num;
	}

	getOpenWindows() {
		const openWindows = [];
		const managedWindowKeys = Object.keys(this.managedWindows);
		for (const managedWindowKey of managedWindowKeys) {
			const managedWindow = this.managedWindows[managedWindowKey];
			if(managedWindow.isOpen) {
				openWindows.push(managedWindowKey);
			}
		}
		return openWindows;
	}

	loadedListener(windowInfo) {
		const windowName = windowInfo.name;

		if (DEBUG_WINDOW_EVENT_LISTENERS) {
			console.log('  * Window Loaded', windowName);
		}

		// Set the window's title from the window's package.json reference.
		const win = this.managedWindows[windowName].win;
		const initialVisibility = this.managedWindows[windowName].initialVisibility;


		// Configure the window's title
		win.title = this.managedWindows[windowName].title;

		// Manage the other window attributes
		this.managedWindows[windowName].status = 'loaded';
		this.managedWindows[windowName].isOpen = true;
		this.managedWindows[windowName].isVisible = initialVisibility;

		// Determine if we should auto-show the window
		if (this.managedWindows[windowName].autoShow) {
			this.showWindow(windowName);
		}

		// console.log('Finished Loading Window', this.title, 'aka', windowName);
		this.emit(eventList.LOADED_WINDOW, windowInfo);
	}

	closeListener(windowInfo) {
		const windowName = windowInfo.name;
		if (!this.managedWindows[windowName]) {
			return;
		}

		if (DEBUG_WINDOW_EVENT_LISTENERS) {
			console.log('  * Closing Window', windowName);
		}

		// Immediately hide the window for better user experience.
		this.managedWindows[windowName].win.hide();

		// Manage the other window attributes
		this.managedWindows[windowName].isVisible = false;

		// If the window is enabled to run in the background, hide it and
		// prevent it from closing.
		if (this.managedWindows[windowName].runInBackground) {
			this.emit(eventList.PREVENTING_WINDOW_FROM_CLOSING, windowInfo);

			// if(this.numOpenWindows() === 1) {
			// 	console.log('Only one window left');
			// 	if(!this.options.allowWindowlessApp) {
			// 		this.managedWindows[windowName].status = 'closing';
			// 		this.emit(eventList.CLOSING_WINDOW, windowInfo);
			// 		this.managedWindows[windowName].win.close(true);
			// 	} else {
			// 		this.emit(eventList.PREVENTING_WINDOW_FROM_CLOSING, windowInfo);
			// 	}
			// } else {
			// 	this.emit(eventList.PREVENTING_WINDOW_FROM_CLOSING, windowInfo);
			// }
		} else {
			this.managedWindows[windowName].status = 'closing';
			this.emit(eventList.CLOSING_WINDOW, windowInfo);
			this.managedWindows[windowName].win.close(true);
		}
	}

	closedListener(windowInfo) {
		const windowName = windowInfo.name;
		if (!this.managedWindows[windowName]) {
			return;
		}

		if (DEBUG_WINDOW_EVENT_LISTENERS) {
			console.log('  * Window Closed', windowName);
		}
		// console.log('Closed Window...', this.title, 'aka', windowName);
		this.managedWindows[windowName].isOpen = false;
		this.managedWindows[windowName].status = 'closed';

		if (this.managedWindows[windowName].isPrimary) {
			this.emit(eventList.CLOSED_PRIMARY_WINDOW, windowInfo);
			this.emit(eventList.CLOSED_WINDOW, windowInfo);
		} else {
			this.emit(eventList.CLOSED_WINDOW, windowInfo);
		}

		// Check to see if there aren't any more visible windows after
		// closing the window to see if the application should be allowed to
		// run in the background.  If not, exit the program
		if (this.numVisibleWindows() === 0) {
			if (this.options.allowWindowlessApp) {
				this.emit(eventList.ALL_WINDOWS_ARE_HIDDEN);
			} else {
				try {
					this.emit(eventList.QUITTING_APPLICATION);
				} catch (err) {
					// Error telling emitters that we are quitting.
				}

				const innerQuitApplication = () => {
					try {
						const openWindows = this.getOpenWindows();
						openWindows.forEach((openWindow) => {
							this.managedWindows[openWindow].win.close();
						});
					} catch (err) {
						// Error informing each window to quit
					}

					try {
						this.options.gui.App.quit();
					} catch (err) {
						// Error quitting the application
					}


					// try {
					// 	process.exit();
					// } catch(err) {
					// 	// Error telling the process to exit.
					// }
				};
				setImmediate(innerQuitApplication);
				// // TODO: Not sure why but in the basic test which does a
				// // crude timeout to check for the window exiting, it
				// // finishes b/c this function gets called to early.  The
				// // event emitter for QUITTING_APPLICATION works but this one
				// // doesn't.  Also, it may be a good idea to let the app run
				// // for a few ms after the last window closes anyways.
				// // this.options.gui.App.quit();
			}
		}
	}

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
	addWindow(windowInfo) {
		const windowName = windowInfo.name;

		if(DEBUG_WINDOW_MANAGER) {
			console.log('  - Adding new window', windowName);
		}
		this.managedWindows[windowName] = windowInfo;
		this.managedWindows[windowName].status = 'loading';
		this.managedWindows[windowName].isOpen = false;
		this.managedWindows[windowName].isVisible = false;

		this.managedWindows[windowName].isPrimary = windowName === 'main';
		this.managedWindows[windowName].runInBackground = windowInfo.runInBackground;
		this.managedWindows[windowName].autoShow = windowInfo.autoShow;

		this.managedWindows[windowName].win.on(
			'loaded',
			windowInfo => this.loadedListener(windowInfo)
		);
		this.managedWindows[windowName].win.on(
			'close',
			windowInfo => this.closeListener(windowInfo)
		);
		this.managedWindows[windowName].win.on(
			'closed',
			windowInfo => this.closedListener(windowInfo)
		);
	}

	getWindows() {
		return Object.keys(this.managedWindows);
	}

	getWindow(name) {
		if (!this.managedWindows[name]) {
			throw 'Window not found: ' + name;
		}

		return this.managedWindows[name];
	}

	async setWindowVariable(winName, key, value) {
		if (!this.managedWindows[winName]) {
			throw 'Window not found: ' + winName;
		}

		const win = this.managedWindows[winName].win;
		await win.webContents.executeJavaScript('global.' + key + ' = ' + JSON.stringify(value)+';');
	}

	isManagedWindow(windowName) {
		let isManaged = false;
		const windowKeys = this.getWindows();
		if (windowKeys.indexOf(windowName) >= 0) {
			isManaged = true;
		}
		return isManaged;
	}

	hideWindow(windowName) {
		if(this.isManagedWindow(windowName)) {
			this.managedWindows[windowName].win.hide();
			this.managedWindows[windowName].isVisible = false;
		}
	}

	showWindow(windowName) {
		if(this.isManagedWindow(windowName)) {
			this.managedWindows[windowName].win.show();
			this.managedWindows[windowName].isVisible = true;
		}
	}

	closeWindow(windowName) {
		if(this.isManagedWindow(windowName)) {
			this.managedWindows[windowName].win.close();
		}
	}
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
	openWindow(packageInfo, info, appData) {
		return new Promise((resolve, reject) => {
			// Make sure that the gui object is defined
			if (typeof (this.options.gui) === 'undefined') {
				throw new Error('Must configure the module_manager, gui is not defined');
			}
			if (typeof (this.options.gui.Window) === 'undefined') {
				throw new Error('Must configure the module_manager, gui.Window is not defined');
			}

			// Save a local reference to nw.gui
			const gui = this.options.gui;

			if (DEBUG_WINDOW_MANAGER) {
				console.log('Reference to gui', Object.keys(gui));
			}


			// Get the module's data that should be used when opening the new window
			const newWindowData = appData.window ? appData.window : {};

			// Build the url and moduleData path
			const windowPath = 'file:///' + path.join(packageInfo.location, info.main);

			// Add a conditional debug message
			if (DEBUG_WINDOW_MANAGER) {
				console.log('Reference to gui.Window', Object.keys(gui.Window));
			}

			let asyncOpen = false;
			if (typeof (process.versions.nw) !== 'undefined') {
				// crude NW version check
				if (process.versions.nw > "0.12.3") {
					asyncOpen = true;
					if (typeof (newWindowData.toolbar) !== 'undefined') {
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


			if (asyncOpen) {
				// Open a new window and save its reference, nw0.13++ uses an async "open" call.

				gui.Window.open(
					windowPath,
					Object.assign({}, newWindowData, {
						webPreferences: {
							additionalArguments: [
								'--packageName=' + packageInfo.name
							]
						}
					}),
					(win) => {
						const windowTitle = newWindowData.title ? newWindowData.title : '';
						const initialVisibilityState = (typeof (newWindowData.show) !== 'undefined') ? newWindowData.show : true;

						// Build the windowInfo object to be passed to the this.addWindow function
						const windowInfo = {
							'name': packageInfo.name,
							'win': win,
							'initialVisibility': initialVisibilityState,
							'title': windowTitle
						};
						this.addWindow(windowInfo);

						// Emit an event indicating that a new window has been opened.
						this.emit(eventList.OPENED_WINDOW, packageInfo.name);

						resolve(win);
					}
				);
			} else {
				// Open a new window and save its reference

				const newWindow = gui.Window.open(
					windowPath, Object.assign({}, newWindowData, {
						webPreferences: {
							additionalArguments: [
								'--packageName=' + packageInfo.name
							]
						}
					})
				);

				const windowTitle = newWindowData.title ? newWindowData.title : '';
				const initialVisibilityState = (typeof (newWindowData.show) !== 'undefined') ? newWindowData.show : true;

				// Build the windowInfo object to be passed to the this.addWindow function
				const windowInfo = {
					'name': packageInfo.name,
					'win': newWindow,
					'initialVisibility': initialVisibilityState,
					'title': windowTitle
				};
				this.addWindow(windowInfo);

				// Emit an event indicating that a new window has been opened.
				this.emit(eventList.OPENED_WINDOW, packageInfo.name);

				resolve(newWindow);
			}

		});
	}

	async openManagedApps(packages) {
		const keys = Object.keys(packages);

		for (const key of keys) {
			try {
				console.log('openManagedApp', key);
				// Open the found nwApp libraries
				let reqOpenWindow = false;
				if (packages[key].packageData) {
					const loadedAppData = packages[key].packageData;
					if (loadedAppData['ljswitchboard-main']) {
						const appFile = loadedAppData['ljswitchboard-main'];
						const appType = path.extname(appFile);
						if (appType === '.html') {
							const requiredInfo = {
								'main': appFile
							};
							reqOpenWindow = true;

							await this.openWindow(
								packages[key].packageInfo,
								requiredInfo,
								packages[key].packageData
							);
						}
					}
				}
			} catch (err) {
				console.error('Error Opening App', key, err);
				throw err;
			}
		}
	}

	linkOutput(console) {
		// global.console = console;
	}
}

exports.eventList = eventList;
exports.WindowManager = WindowManager;

// const WINDOW_MANAGER = new WindowManager();

/*
if(DEBUG_WINDOW_EVENT_LIST) {
	const eventKeys = Object.keys(eventList);
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
exports.windowManager = WINDOW_MANAGER;
exports.linkOutput = WINDOW_MANAGER.linkOutput;
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

*/
