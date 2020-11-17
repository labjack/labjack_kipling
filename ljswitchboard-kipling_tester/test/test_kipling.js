var assert = require('chai').assert;

var path = require('path');

// Generic Application Objects
var package_loader;
var gns;
var gui;
var screens;
var window_manager;

// Window Objects
var testerWin;
var kiplingWin;

// Kipling Application Objects
var kiplingWindow;
var $;
var MODULE_LOADER;
var MODULE_CHROME;

describe('test_kipling', function() {
	it('Adjust Window Positions', function (done) {
		assert.isOk(true, 'Started ljswitchboard');
		try {

			package_loader = global.require('ljswitchboard-package_loader');
			gns = package_loader.getNameSpace();
			gui = global.gui;
			screens = gui.Screen.Init();
			var baseScreen = screens.screens[0];
			var bounds = baseScreen.bounds;
			var winHeight = bounds.height-35;
			var winWidth = bounds.width/2;
			var testWinPos = 0;
			var kiplingWinPos = winWidth;

			window_manager = global.require('ljswitchboard-window_manager');
			var loadedEvent = window_manager.eventList.LOADED_WINDOW;
			// window_manager.on(loadedEvent, function(data) {
			// 	console.log('Test Detected Load Event', data);
			// });

			var managedTesterWindow = window_manager.windowManager.managedWindows.kipling_tester;
			testerWin = managedTesterWindow.win;
			testerWin.resizeTo(winWidth, winHeight);
			testerWin.moveTo(testWinPos,0);

			var managedKiplingWindow = window_manager.windowManager.managedWindows.kipling;
			kiplingWin = managedKiplingWindow.win;
			kiplingWin.resizeTo(winWidth+300, winHeight);
			kiplingWin.moveTo(kiplingWinPos-300,0);
			kiplingWin.closeDevTools();
			kiplingWin.focus();


			kiplingWindow = kiplingWin.window;
			$ = kiplingWindow.$;
			MODULE_LOADER = kiplingWindow.MODULE_LOADER;
			MODULE_CHROME = kiplingWindow.MODULE_CHROME;
		} catch(err) {
			console.error('Error in test', err);
		}
		done();
	});
	it('Check Extraction Path', function (done) {
		var extractionPath = package_loader.getExtractionPath();
		var basename = path.basename(extractionPath);
		var msg = 'Extraction Path should not be the default extraction path';
		assert.notStrictEqual(basename, 'K3', msg);
		// testerWin.showDevTools();
		// console.log('Dev Tools shown');
		done();
	});
	it('Wait for module chrome to start', function (done) {
		var numLoadDelay = 0;
		var waitForStart = function() {
			if(MODULE_CHROME.moduleChromeStarted) {
				assert.isOk(MODULE_CHROME.moduleChromeStarted, 'module chrome has not started');
				done();
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
	});
});
