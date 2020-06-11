

var window_manager = require('../lib/window_manager');
var mock_window = require('../lib/mock_window');

var eventList = mock_window.eventList;

var windows = {};
var guiAppQuitDetected = false;
var tests = {
	'verify lack of configuration': function(test) {
		var packageInfo = {
			'location': '',
		};
		var requiredInfo = {
			'main': '',
		};
		var appData = {};
		try {
			var openedWindow = window_manager.open(
				packageInfo,
				requiredInfo,
				appData
			);
			test.ok(false, 'An error should have been thrown');
		} catch(err) {
			test.done();
		}
	},
	'configure window_manager': function(test) {
		window_manager.configure({
			'gui': {
				'Window': mock_window,
				'App': {
					'quit': function() {
						guiAppQuitDetected = true;
					}
				}
			}
		});
		test.done();
	},
	'create new window': function(test) {
		var newWindow = mock_window.open();
		newWindow.on(eventList.LOADED, function() {
			// console.log('Window Loaded', Object.keys(this));
			test.done();
		});
	},
	// 'inspect window_manager': function(test) {
	// 	console.log(Object.keys(window_manager));
	// 	test.done();
	// },
	'insert window into window_manager': function(test) {
		var primaryWindow = mock_window.open();
		windows.primary = primaryWindow;
		window_manager.addWindow({
			'name': 'main',
			'win': primaryWindow,
			'initialVisibility': true,
			'title': 'mainWindow'
		});
		var newWindow = mock_window.open();
		windows.first = newWindow;
		window_manager.addWindow({
			'name': 'firstWindow',
			'win': newWindow,
			'initialVisibility': true,
			'title': 'firstWindowTitle'
		});

		var numLoaded = 0;
		var finishFunc = function() {
			numLoaded += 1;
			if(numLoaded == 2) {
				test.done();
			}
		};
		primaryWindow.on(eventList.LOADED, finishFunc);
		newWindow.on(eventList.LOADED, finishFunc);
		// setTimeout(function() {
		// 	test.done();
		// }, 2000);
	},
	'close first window': function(test) {
		var events = [];
		windows.first.on(eventList.HIDDEN, function() {
			events.push(eventList.HIDDEN);
		});
		windows.first.on(eventList.CLOSE, function() {
			events.push(eventList.CLOSE);
		});
		windows.first.on(eventList.CLOSED, function() {
			events.push(eventList.CLOSED);

			// make sure the "firstWindow" title is passed back.
			test.strictEqual(this.title, 'firstWindowTitle', 'wrong window title');

			// Make sure that the window has been hidden, issued a close req. 
			// and ultimately closed via the events list.
			test.deepEqual(
				events,
				['hidden', 'close', 'closed']
			);
			
			test.deepEqual(
				events,
				['hidden', 'close', 'closed'],
				'required events were not fired'
				);
			test.done();
		});

		// Close the first window and let  the event listener detect & finish 
		// the test.
		window_manager.closeWindow('firstWindow');
	},
	'open window test': function(test) {
		var packageInfo = {
			'name': 'MyWindow',
			'location': '',
		};
		var requiredInfo = {
			'main': '',
		};
		var appData = {};
		window_manager.open(
			packageInfo,
			requiredInfo,
			appData
		).then(function(openedWindow) {
			// Wait for the on LOADED event to finish the test indicating that a 
			// new window has opened.
			openedWindow.on(eventList.LOADED, function() {
				test.done();
			});
		});
	},
	'check the number of visible and open windows': function(test) {
		// make sure the main window can be shown and have the results indicate
		// it.
		window_manager.hideWindow('main');
		test.strictEqual(window_manager.numVisibleWindows(), 1);
		test.strictEqual(window_manager.numOpenWindows(), 2);
		window_manager.showWindow('main');
		test.strictEqual(window_manager.numVisibleWindows(), 2);
		test.strictEqual(window_manager.numOpenWindows(), 2);
		
		// Establish a quitting_application event listener to save results.
		var receivedQuitEvent = false;
		var quitListener = function() {
			receivedQuitEvent = true;
		};
		
		// Register the QUIT_APPLICATION event listener
		window_manager.on(eventList.QUITTING_APPLICATION, quitListener);

		// Hide the main window and close the secondary window
		window_manager.hideWindow('main');
		window_manager.closeWindow('MyWindow');

		// Right after these functions are called, the window should be hidden
		// but it takes a few loops in the event loop for the window to be
		// closed.
		test.strictEqual(window_manager.numVisibleWindows(), 1, 'visible');
		test.strictEqual(window_manager.numOpenWindows(), 2, 'open');
		
		// Wait for app to exit:
		var waitForQuit = function() {
			if(guiAppQuitDetected) {
				test.ok(receivedQuitEvent, 'did not receive the QUITTING_APPLICATION event');
				test.strictEqual(window_manager.numVisibleWindows(), 0, 'visible');
				test.strictEqual(window_manager.numOpenWindows(), 0, 'numOpenWindows');
				test.deepEqual(window_manager.getOpenWindows(), []);
				test.done();
			} else {
				setTimeout(waitForQuit, 100);
			}
		};
		setTimeout(waitForQuit, 100);
	},
	'delay for output': function(test) {
		// setTimeout(function() {
		// 	test.done();
		// }, 2000);
		test.done();
	}
};

exports.tests = tests;