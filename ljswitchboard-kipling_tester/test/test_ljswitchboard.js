
console.log('in test_ljswitchboard');

// Load native UI library

this.test_ljswitchboard = {
	'open ljswitchboard': function(test) {
		test.ok(true, 'Started ljswitchboard');
		console.log('in open ljswitchboard test');
		try {
			var window_manager = global.require('ljswitchboard-window_manager');
			var loadedEvent = window_manager.eventList.LOADED_WINDOW;
			window_manager.on(loadedEvent, function(data) {
				console.log('Test Detected Load Event', data);
			});
			var managedKiplingWindow = window_manager.windowManager.managedWindows.kipling;
			var kiplingWin = managedKiplingWindow.win;
			var kiplingWindow = kiplingWin.window;
			var $ = kiplingWindow.$;
			var MODULE_LOADER = kiplingWindow.MODULE_LOADER;
			var MODULE_CHROME = kiplingWindow.MODULE_CHROME;
		} catch(err) {
			console.error('Error in test', err);
		}
		test.done();
	}, '2sec delay A': function(test) {
		setTimeout(function() {
			test.done();
		}, 2000);
	}, '2sec delay B': function(test) {
		setTimeout(function() {
			test.done();
		}, 2000);
	}, '2sec delay C': function(test) {
		setTimeout(function() {
			test.done();
		}, 2000);
	}, '2sec delay D': function(test) {
		setTimeout(function() {
			test.done();
		}, 2000);
	}, 'failed test': function(test) {
		test.ok(false, 'bb');
		test.done();
	},
};