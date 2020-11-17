var assert = require('chai').assert;

var testOptions = {
	'refreshDevices': false,
	'realRefresh': false
};

// Generic Application Objects
var package_loader;
var gns;
var gui;
var window_manager;

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
var activeModule;
var viewGen;
var eventList;

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

describe('mock_device_selector', function() {
	it('initialize test', function (done) {
		package_loader = global.require('ljswitchboard-package_loader');
		gns = package_loader.getNameSpace();
		gui = global.gui;
		window_manager = global.require('ljswitchboard-window_manager');

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
	it('disable device scanning', function (done) {
		deviceController.enableMockDeviceScanning()
		.then(function() {
			done();
		});
	});
	it('Add mock devices', function (done) {
		deviceController.addMockDevices(deviceScannerConfigData)
		.then(function() {
			done();
		});
	});
	it('load the device_selector module', function (done) {
		MODULE_LOADER.loadModuleByName('device_selector')
		.then(function(res) {
			done();
		});
	});
	it('save save device_selector information', function (done) {
		activeModule = kiplingWindow.activeModule;
		viewGen = activeModule.viewGen;
		eventList = activeModule.eventList;
		done();
	});
	it('wait for device selector module to start', function (done) {
		activeModule.once(eventList.MODULE_STARTED, function(scanResults) {
			var numResults = scanResults.length = 0;
			assert.strictEqual(numResults, 0, 'No results should currently be cached');
			done();
		});
	});
	it('check page elements', function (done) {
		var labjackLogo = $('#labjack-logo-image');
		var isLogoValid = true;
		if(labjackLogo.height() != 49) {
			isLogoValid = false;
		}
		if(labjackLogo.width() != 290) {
			isLogoValid = false;
		}
		assert.isOk(isLogoValid, 'LabJack logo not displayed');
		var labjackLink = $('#lj-link-text');
		// labjackLink.trigger('click');

		done();
	});
	it('refresh device list', function (done) {
		function ensureChecked(elName) {
			var checkbox = $(elName);
			checkbox.prop('checked', true);
		}
		ensureChecked('#usb_scan_enabled');
		ensureChecked('#ethernet_scan_enabled');
		ensureChecked('#wifi_scan_enabled');

		if(testOptions.refreshDevices) {
			var startedScanEventCaught = false;
			activeModule.once(
				eventList.DEVICE_SCAN_STARTED,
				function() {
					startedScanEventCaught = true;
				});
			activeModule.once(
				eventList.DEVICE_SCAN_COMPLETED,
				function(scanResults) {
					assert.isOk(startedScanEventCaught, 'should triggered scan started event');
					console.log('scanResults', scanResults);
					done();
				});
			var viewGen = activeModule.viewGen;
			var refreshButton = viewGen.pageElements.refresh_devices_button.ref;

			// Trigger the click event for the refresh button and make sure the scan
			// happens.
			refreshButton.trigger('click');
			// done();
		} else {
			done();
		}
	});

	it('check displayed scan results', function (done) {
		// Verify there being some number of found device types
		var deviceTypes = $('.device-type');
		assert.strictEqual(deviceTypes.length, 4, 'Unexpected number of device types');

		var devices = $('.device');
		assert.strictEqual(devices.length, 5, 'Unexpected number of devices');

		var digits = $('.DEVICE_TYPE_Digit .device');
		assert.strictEqual(digits.length, 1, 'Unexpected number of digits found');

		var t7s = $('.DEVICE_TYPE_T7 .device');
		assert.strictEqual(t7s.length, 2, 'Unexpected number of T7s found');

		var t4s = $('.DEVICE_TYPE_T4 .device');
		assert.strictEqual(t4s.length, 1, 'Unexpected number of T4s found');

		var t5s = $('.DEVICE_TYPE_T5 .device');
		assert.strictEqual(t5s.length, 1, 'Unexpected number of T5s found');

		done();
	});
	it('Enable device scanning', function (done) {
		if(testOptions.realRefresh) {
			deviceController.disableMockDeviceScanning()
			.then(function() {
				done();
			});
		} else {
			done();
		}
	});
	it('refresh device list - live', function (done) {
		if(gui.App.manifest.performLiveTests || testOptions.realRefresh) {
			var startedScanEventCaught = false;
			activeModule.once(
				eventList.DEVICE_SCAN_STARTED,
				function() {
					startedScanEventCaught = true;
				});
			activeModule.once(
				eventList.DEVICE_SCAN_COMPLETED,
				function(scanResults) {
					assert.isOk(startedScanEventCaught, 'should triggered scan started event');
					console.log('scanResults', scanResults);
					done();
				});
			var viewGen = activeModule.viewGen;
			var refreshButton = viewGen.pageElements.refresh_devices_button.ref;

			// Trigger the click event for the refresh button and make sure the scan
			// happens.
			refreshButton.trigger('click');
		} else {
			done();
		}
	});
	// 'connect to T7': function(test) {
	// 	MODULE_CHROME.once(
	// 		MODULE_CHROME.eventList.DEVICE_SELECTOR_DEVICE_OPENED,
	// 		function(updatedModules) {
	// 			console.log('Tabs updated (test)', updatedModules);
	// 			done();
	// 		});

	// 	// Connect to the first found USB-T7
	// 	var t7s = $('.DEVICE_TYPE_T7 .CONNECTION_TYPE_USB');
	// 	var t7 = t7s.first();
	// 	t7.trigger('click');
	// },
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
