'use strict';

const package_loader = global.package_loader;
const gui = global.gui;
const window_manager = package_loader.getPackage('window_manager');

// Window Objects
const kiplingWin;

// Kipling Application Objects
const kiplingWindow;
const MODULE_LOADER;

describe('mock file browser', function() {
	it('initialize test', function (done) {
		const managedKiplingWindow = window_manager.windowManager.managedWindows.kipling;
		kiplingWin = managedKiplingWindow.win;

		kiplingWindow = kiplingWin.window;
		MODULE_LOADER = kiplingWindow.MODULE_LOADER;

		done();
	});
	it('load register_matrix_fw', function (done) {
		MODULE_LOADER.once('MODULE_READY', function(res) {
			done();
		});
		const deviceInfoTab = $('#demo_file_browser-tab');
		deviceInfoTab.trigger('click');
	});
});
