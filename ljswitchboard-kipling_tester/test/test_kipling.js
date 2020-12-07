'use strict';

const package_loader = global.package_loader;

const {assert} = require('chai');
const path = require('path');

// let MODULE_CHROME;

describe('test_kipling', function() {
	it('Check Extraction Path', function (done) {
		const extractionPath = package_loader.getExtractionPath();
		const basename = path.basename(extractionPath);
		const msg = 'Extraction Path should not be the default extraction path';
		assert.notStrictEqual(basename, 'K3', msg);
		// testerWin.showDevTools();
		// console.log('Dev Tools shown');
		done();
	});
/*	it('Wait for module chrome to start', function (done) {
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
	});*/
});
