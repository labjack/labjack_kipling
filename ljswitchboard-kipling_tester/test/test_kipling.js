'use strict';

const package_loader = global.package_loader;
const gui = global.gui;
const window_manager = package_loader.getPackage('window_manager');

const {assert} = require('chai');
const path = require('path');

let MODULE_LOADER;
let MODULE_CHROME;

describe('test_kipling', function() {
	it('Adjust Window Positions', function (done) {
		assert.isOk(true, 'Started ljswitchboard');
		try {
			const screens = gui.Screen.Init();
			const baseScreen = screens.screens[0];
			const bounds = baseScreen.bounds;
			const winHeight = bounds.height-35;
			const winWidth = bounds.width/2;
			const testWinPos = 0;
			const kiplingWinPos = winWidth;

			const managedTesterWindow = window_manager.windowManager.managedWindows.kipling_tester;
			const testerWin = managedTesterWindow.win;
			testerWin.resizeTo(winWidth, winHeight);
			testerWin.moveTo(testWinPos,0);

			const managedKiplingWindow = window_manager.windowManager.managedWindows.kipling;
			let kiplingWin = managedKiplingWindow.win;
			kiplingWin.resizeTo(winWidth+300, winHeight);
			kiplingWin.moveTo(kiplingWinPos-300,0);
			kiplingWin.closeDevTools();
			kiplingWin.focus();

			const kiplingWindow = kiplingWin.window;
			MODULE_LOADER = kiplingWindow.MODULE_LOADER;
			MODULE_CHROME = kiplingWindow.MODULE_CHROME;
		} catch(err) {
			console.error('Error in test', err);
		}
		done();
	});
	it('Check Extraction Path', function (done) {
		const extractionPath = package_loader.getExtractionPath();
		const basename = path.basename(extractionPath);
		const msg = 'Extraction Path should not be the default extraction path';
		assert.notStrictEqual(basename, 'K3', msg);
		// testerWin.showDevTools();
		// console.log('Dev Tools shown');
		done();
	});
	it('Wait for module chrome to start', function (done) {
		let numLoadDelay = 0;
		const waitForStart = function() {
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
