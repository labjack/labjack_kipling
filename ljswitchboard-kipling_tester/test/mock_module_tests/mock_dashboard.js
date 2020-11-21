'use strict';

const package_loader = global.package_loader;
const gui = global.gui;
const window_manager = package_loader.getPackage('window_manager');

// Window Objects
var testerWin;
var kiplingWin;

// Kipling Application Objects
var kiplingWindow;
var $;
var MODULE_LOADER;
var MODULE_CHROME;
var deviceController;

var mockDevices;
try {
	mockDevices = require('./mock_devices').mockDevices;
} catch(err) {
	mockDevices = [];
}
var deviceScannerConfigData = [];
var excludeKeys = ['deviceConfig'];
mockDevices.forEach(function(mockDevice) {
	var deviceData = {};
	var keys = Object.keys(mockDevice);
	keys.forEach(function(key) {
		if(excludeKeys.indexOf(key) < 0) {
			deviceData[key] = mockDevice[key];
		}
	});
	deviceScannerConfigData.push(deviceData);
});

describe('mock_dashboard', function() {
	it('initialize test', function (done) {
		var managedTesterWindow = window_manager.windowManager.managedWindows.kipling_tester;
		testerWin = managedTesterWindow.win;

		var managedKiplingWindow = window_manager.windowManager.managedWindows.kipling;
		kiplingWin = managedKiplingWindow.win;

		kiplingWindow = kiplingWin.window;
		$ = kiplingWindow.$;
		MODULE_LOADER = kiplingWindow.MODULE_LOADER;
		MODULE_CHROME = kiplingWindow.MODULE_CHROME;


		const io_manager = package_loader.getPackage('io_manager');
		const io_interface = io_manager.io_interface();
		deviceController = io_interface.getDeviceController();
		done();
	});
	it('load device info', function (done) {
		MODULE_LOADER.once('MODULE_READY', function(res) {
			done();
		});
		var deviceInfoTab = $('#dashboard-tab');
		deviceInfoTab.trigger('click');
		// MODULE_LOADER.loadModuleByName('device_info_fw')
		// .then(function(res) {
		// 	// Device selector isn't quite loaded yet.  Just ready for
		// 	// other async tasks.  Must wait for the "MODULE_READY" event.
		// });
	});
	it('load analog inputs', function (done) {
		MODULE_LOADER.once('MODULE_READY', function(res) {
			done();
		});
		var deviceInfoTab = $('#analog_inputs_fw-tab');
		deviceInfoTab.trigger('click');
	});
	it('load lua script debugger', function (done) {
		MODULE_LOADER.once('MODULE_READY', function(res) {
			done();
		});
		var deviceInfoTab = $('#lua_script_debugger-tab');
		deviceInfoTab.trigger('click');
	});
	it('load network settings', function (done) {
		MODULE_LOADER.once('MODULE_READY', function(res) {
			done();
		});
		var deviceInfoTab = $('#network_settings-tab');
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
	// 	var t7s = $('.DEVICE_TYPE_T7 .disconnect-button');
	// 	var t7 = t7s.first();
	// 	t7.trigger('click');
	// },
});
