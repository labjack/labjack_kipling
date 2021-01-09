'use strict';

const package_loader = global.package_loader;
const window_manager = package_loader.getPackage('window_manager');

// Window Objects
var kiplingWin;

// Kipling Application Objects
var kiplingWindow;
var MODULE_LOADER;
var MODULE_CHROME;

var configureMockDevice = function(deviceIndex) {
	var deviceData = {};
	if(mockDevices[deviceIndex]) {
		deviceData = mockDevices[deviceIndex];
	}
	var filters = {};
	var filterKeys = ['serialNumber', 'deviceType', 'connectionType'];
	var deviceConfig = {};
	var keys = Object.keys(deviceData);
	keys.forEach(function(key) {
		if(filterKeys.indexOf(key) >= 0) {
			filters[key] = deviceData[key];
		}
		if(key === 'deviceConfig') {
			deviceConfig = deviceData.deviceConfig;
		}
	});
};

describe('mock_device_info', function() {
	it('initialize test', function (done) {
		var managedKiplingWindow = window_manager.windowManager.managedWindows.kipling;
		kiplingWin = managedKiplingWindow.win;

		kiplingWindow = kiplingWin.window;
		MODULE_LOADER = kiplingWindow.MODULE_LOADER;
		MODULE_CHROME = kiplingWindow.MODULE_CHROME;

		done();
	});
	it('reload device selector', function (done) {
		MODULE_LOADER.once('MODULE_READY', function(res) {
			done();
		});

		var deviceSelectorTab = $('#device_selector-tab');
		deviceSelectorTab.trigger('click');
		// MODULE_LOADER.loadModuleByName('device_selector')
		// .then(function(res) {
		// 	// Device selector isn't quite loaded yet.  Just ready for
		// 	// other async tasks.  Must wait for the "MODULE_READY" event.
		// });
	});
	it('change slide-time', function (done) {
		var activeModule = kiplingWin.window.activeModule;
		var viewGen = activeModule.viewGen;
		viewGen.slideDuration = 10;
		done();
	});
	it('connect to T7 (USB)', function (done) {
		MODULE_CHROME.once(
			MODULE_CHROME.eventList.DEVICE_SELECTOR_DEVICE_OPENED,
			function(updatedModules) {
				console.log('Tabs updated (test)', updatedModules);
				done();
			});

		// Connect to the first found USB-T7
		var t7s = $('.DEVICE_TYPE_T7 .CONNECTION_TYPE_USB');
		var t7 = t7s.first();
		t7.trigger('click');
	});
	it('connect to T7 (Ethernet)', function (done) {
		MODULE_CHROME.once(
			MODULE_CHROME.eventList.DEVICE_SELECTOR_DEVICE_OPENED,
			function(updatedModules) {
				console.log('Tabs updated (test)', updatedModules);
				done();
			});

		// Connect to the second found Ethernet-T7
		var t7s = $('.DEVICE_TYPE_T7 .CONNECTION_TYPE_Ethernet');
		var t7 = t7s.eq(1);
		t7.trigger('click');
	});
	it('connect to Digit (USB)', function (done) {
		MODULE_CHROME.once(
			MODULE_CHROME.eventList.DEVICE_SELECTOR_DEVICE_OPENED,
			function(updatedModules) {
				console.log('Tabs updated (test)', updatedModules);
				done();
			});

		// Connect to the first found USB-Digit
		var t7s = $('.DEVICE_TYPE_Digit .CONNECTION_TYPE_USB');
		var t7 = t7s.first();
		t7.trigger('click');
	});
	it('load device info', function (done) {
		kiplingWin.openDevTools();

		MODULE_LOADER.once('MODULE_READY', function(res) {
			done();
		});
		var deviceInfoTab = $('#device_info_fw-tab');
		deviceInfoTab.trigger('click');
		// MODULE_LOADER.loadModuleByName('device_info_fw')
		// .then(function(res) {
		// 	// Device selector isn't quite loaded yet.  Just ready for
		// 	// other async tasks.  Must wait for the "MODULE_READY" event.
		// });
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
