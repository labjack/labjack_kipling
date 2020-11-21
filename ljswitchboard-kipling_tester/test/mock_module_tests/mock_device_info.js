'use strict';

const package_loader = global.package_loader;
const window_manager = package_loader.getPackage('window_manager');

// Window Objects
var testerWin;
var kiplingWin;

// Kipling Application Objects
var kiplingWindow;
var $;
var MODULE_LOADER;
var MODULE_CHROME;
var io_manager;
var io_interface;
var deviceController;

const {mockDevices} = require('./mock_devices');

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

var configureMockDevice = function(deviceIndex) {
	var defered = q.defer();
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
	return defered.promise;
};

describe('mock_device_info', function() {
	it('initialize test', function (done) {
		var managedTesterWindow = window_manager.windowManager.managedWindows.kipling_tester;
		testerWin = managedTesterWindow.win;

		var managedKiplingWindow = window_manager.windowManager.managedWindows.kipling;
		kiplingWin = managedKiplingWindow.win;

		kiplingWindow = kiplingWin.window;
		$ = kiplingWindow.$;
		MODULE_LOADER = kiplingWindow.MODULE_LOADER;
		MODULE_CHROME = kiplingWindow.MODULE_CHROME;


		io_manager = global.require('ljswitchboard-io_manager');
		io_interface = io_manager.io_interface();
		deviceController = io_interface.getDeviceController();
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
		kiplingWin.showDevTools();

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
