'use strict';

const {remote} = require('electron');
const {testClick} = require('../ui');
const package_loader = global.package_loader;
const window_manager = package_loader.getPackage('window_manager');
const kiplingWin = window_manager.getWindow('kipling').win;

// Kipling Application Objects
// const MODULE_LOADER;
// const deviceController;

describe('mock_dashboard', function() {
	it('initialize test', function (done) {
		// MODULE_LOADER = kiplingWindow.MODULE_LOADER;

		const io_manager = package_loader.getPackage('io_manager');
		const io_interface = io_manager.io_interface();
		// deviceController = io_interface.getDeviceController();
		done();
	});
	it('load device info', async function () {
		console.log('LLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLL', remote);
		// MODULE_LOADER.once('MODULE_READY', function(res) {
		// 	done();
		// });
		// const MODULE_LOADER = remote.getGlobal('MODULE_LOADER');

		// const injectScript = fs.readFileSync(path.join(path.dirname(module.filename), 'preload.js'));
		// const injectScript = 'console.log("BBBBBBBBBBBBBBBBBBBBBB");return global.MODULE_LOADER;';
		// const injectScript = 'global.MODULE_LOADER;';

		const injectScript = 'new Promise(resolve => MODULE_LOADER.once("MODULE_READY", resolve))';

		const promise = kiplingWin.webContents.executeJavaScript(injectScript.toString('utf-8'));
		// MODULE_LOADER.once('MODULE_READY', function(res) {
		// 	console.log('MODULE_READY');
		// 	// done();
		// });

		testClick(kiplingWin, '#dashboard-tab');

		await promise;

		// const deviceInfoTab = $('#dashboard-tab');
		// deviceInfoTab.trigger('click');
		// MODULE_LOADER.loadModuleByName('device_info_fw')
		// .then(function(res) {
		// 	// Device selector isn't quite loaded yet.  Just ready for
		// 	// other async tasks.  Must wait for the "MODULE_READY" event.
		// });
	});
	it('load analog inputs', function (done) {
		// MODULE_LOADER.once('MODULE_READY', function(res) {
		// 	done();
		// });
		const deviceInfoTab = $('#analog_inputs_fw-tab');
		deviceInfoTab.trigger('click');
	});
	it('load lua script debugger', function (done) {
		// MODULE_LOADER.once('MODULE_READY', function(res) {
		// 	done();
		// });
		const deviceInfoTab = $('#lua_script_debugger-tab');
		deviceInfoTab.trigger('click');
	});
	it('load network settings', function (done) {
		// MODULE_LOADER.once('MODULE_READY', function(res) {
		// 	done();
		// });
		const deviceInfoTab = $('#network_settings-tab');
		deviceInfoTab.trigger('click');
	});
	// 'disconnect from T7': function(test) {
	// 	MODULE_CHROME.once(
	// 		MODULE_CHROME.eventList.DEVICE_SELECTOR_DEVICE_CLOSED,
	// 		function(updatedModules) {
	// 			console.log('Tabs updated (test)', updatedModules);
	// 			done();
	// 		});

	// 	// Connect to the first found USB-T7
	// 	const t7s = $('.DEVICE_TYPE_T7 .disconnect-button');
	// 	const t7 = t7s.first();
	// 	t7.trigger('click');
	// },
});
