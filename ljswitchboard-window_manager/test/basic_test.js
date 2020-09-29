var assert = require('chai').assert;

var window_manager = require('../lib/window_manager');
var mock_window = require('../lib/mock_window');

var eventList = mock_window.eventList;

var windows = {};
var guiAppQuitDetected = false;

describe('basic_test', function() {
	it('verify lack of configuration', function (done) {
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
			assert.isOk(false, 'An error should have been thrown');
		} catch(err) {
			done();
		}
	});
	it('configure window_manager', function (done) {
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
		done();
	});
	it('create new window', function (done) {
		var newWindow = mock_window.open();
		newWindow.on(eventList.LOADED, function() {
			// console.log('Window Loaded', Object.keys(this));
			done();
		});
	});
	// 'inspect window_manager': function(test) {
	// 	console.log(Object.keys(window_manager));
	// 	done();
	// },
	it('insert window into window_manager', function (done) {
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
				done();
			}
		};
		primaryWindow.on(eventList.LOADED, finishFunc);
		newWindow.on(eventList.LOADED, finishFunc);
		// setTimeout(function() {
		// 	done();
		// }, 2000);
	});
	it('close first window', function (done) {
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
			assert.strictEqual(this.title, 'firstWindowTitle', 'wrong window title');

			// Make sure that the window has been hidden, issued a close req.
			// and ultimately closed via the events list.
			assert.deepEqual(
				events,
				['hidden', 'close', 'closed']
			);

			assert.deepEqual(
				events,
				['hidden', 'close', 'closed'],
				'required events were not fired'
				);
			done();
		});

		// Close the first window and let  the event listener detect & finish
		// the assert.
		window_manager.closeWindow('firstWindow');
	});
	it('open window test', function (done) {
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
				done();
			});
		});
	});
	it('check the number of visible and open windows', function (done) {
		// make sure the main window can be shown and have the results indicate
		// it.
		window_manager.hideWindow('main');
		assert.strictEqual(window_manager.numVisibleWindows(), 1);
		assert.strictEqual(window_manager.numOpenWindows(), 2);
		window_manager.showWindow('main');
		assert.strictEqual(window_manager.numVisibleWindows(), 2);
		assert.strictEqual(window_manager.numOpenWindows(), 2);

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
		assert.strictEqual(window_manager.numVisibleWindows(), 1, 'visible');
		assert.strictEqual(window_manager.numOpenWindows(), 2, 'open');

		// Wait for app to exit:
		var waitForQuit = function() {
			if(guiAppQuitDetected) {
				assert.isOk(receivedQuitEvent, 'did not receive the QUITTING_APPLICATION event');
				assert.strictEqual(window_manager.numVisibleWindows(), 0, 'visible');
				assert.strictEqual(window_manager.numOpenWindows(), 0, 'numOpenWindows');
				assert.deepEqual(window_manager.getOpenWindows(), []);
				done();
			} else {
				setTimeout(waitForQuit, 100);
			}
		};
		setTimeout(waitForQuit, 100);
	});
	it('delay for output', function (done) {
		// setTimeout(function() {
		// 	done();
		// }, 2000);
		done();
	});
});
