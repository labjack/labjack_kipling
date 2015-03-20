

var path = require('path');
var fs = require('fs');

// Generic Application Objects
var package_loader;
var gns;
var gui;
var screens;
var window_manager;

// Window Objects
var testWin;
var kiplingWin;

// Kipling Application Objects
var kiplingWindow;
var $;
var MODULE_LOADER;
var MODULE_CHROME;

this.test_kipling = {
	'Adjust Window Positions': function(test) {
		test.ok(true, 'Started ljswitchboard');
		try {
			
			package_loader = global.require('ljswitchboard-package_loader');
			gns = package_loader.getNameSpace();
			gui = global[gns].gui;
			screens = gui.Screen.Init();
			var baseScreen = screens.screens[0];
			var bounds = baseScreen.bounds;
			var winHeight = bounds.height-35;
			var winWidth = bounds.width/2;
			var testWinPos = 0;
			var kiplingWinPos = winWidth;

			window_manager = global.require('ljswitchboard-window_manager');
			var loadedEvent = window_manager.eventList.LOADED_WINDOW;
			window_manager.on(loadedEvent, function(data) {
				console.log('Test Detected Load Event', data);
			});

			var managedTesterWindow = window_manager.windowManager.managedWindows.kipling_tester;
			testerWin = managedTesterWindow.win;
			testerWin.resizeTo(winWidth, winHeight);
			testerWin.moveTo(testWinPos,0);

			var managedKiplingWindow = window_manager.windowManager.managedWindows.kipling;
			kiplingWin = managedKiplingWindow.win;
			kiplingWin.resizeTo(winWidth, winHeight);
			kiplingWin.moveTo(kiplingWinPos,0);
			kiplingWin.closeDevTools();


			kiplingWindow = kiplingWin.window;
			$ = kiplingWindow.$;
			MODULE_LOADER = kiplingWindow.MODULE_LOADER;
			MODULE_CHROME = kiplingWindow.MODULE_CHROME;
		} catch(err) {
			console.error('Error in test', err);
		}
		test.done();
	},
	'Check Extraction Path': function(test) {
		var extractionPath = package_loader.getExtractionPath();
		var basename = path.basename(extractionPath);
		var msg = 'Extraction Path should not be the default extraction path';
		test.notStrictEqual(basename, 'K3', msg);
		// testerWin.showDevTools();
		// console.log('Dev Tools shown');
		test.done();
	},
	'Wait for module chrome to start': function(test) {
		var numLoadDelay = 0;
		var waitForStart = function() {
			if(MODULE_CHROME.moduleChromeStarted) {
				test.ok(MODULE_CHROME.moduleChromeStarted, 'module chrome has not started');
				test.done();
			} else {
				numLoadDelay += 1;
				if(numLoadDelay > 5) {
					console.log('numLoadDelay', numLoadDelay);
					setTimeout(waitForStart, 100);
				} else {
					setTimeout(waitForStart, 10);
				}
			}
		};
		setTimeout(waitForStart, 1);
	}
};