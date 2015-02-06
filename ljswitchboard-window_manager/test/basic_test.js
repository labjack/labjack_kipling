

var window_manager = require('../lib/window_manager');
var mock_window = require('../lib/mock_window');

var eventList = mock_window.eventList;

var windows = {};

var tests = {
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
			'initialVisibility': false,
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
			console.log('  - Window Closed', this.title, events);
			test.deepEqual(
				events,
				['hidden', 'close', 'closed'],
				'required events were not fired'
				);
			test.done();
		});
		window_manager.closeWindow('firstWindow');
		// setTimeout(function() {
		// 	test.done();
		// }, 200);
	},
	'open window test': function(test) {
		var packageInfo = {
			'location': '',
		};
		var requiredInfo = {
			'main': '',
		};
		var appData = {};
		var openedWindow = window_manager.open(
			packageInfo,
			requiredInfo,
			appData
		);
		openedWindow.on(eventList.LOADED, function() {
			console.log('Window Opened!!');
			test.done();
		});
	},
	'delay for output': function(test) {
		setTimeout(function() {
			test.done();
		}, 2000);
	}
};

exports.tests = tests;