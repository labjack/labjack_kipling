

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
var testWin;
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

this.test_device_selector = {
	'initialize test': function(test) {
		package_loader = global.require('ljswitchboard-package_loader');
		gns = package_loader.getNameSpace();
		gui = global[gns].gui;
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
		test.done();
	},
	'disable device scanning': function(test) {
		deviceController.enableMockDeviceScanning()
		.then(function() {
			test.done();
		});
	},
	'Add mock devices': function(test) {
		deviceController.addMockDevices(deviceScannerConfigData)
		.then(function() {
			test.done();
		});
	},
	'load the device_selector module': function(test) {
		MODULE_LOADER.loadModuleByName('device_selector')
		.then(function(res) {
			test.done();
		});
	},
	'save save device_selector information': function(test) {
		activeModule = kiplingWindow.activeModule;
		viewGen = activeModule.viewGen;
		eventList = activeModule.eventList;
		test.done();
	},
	'wait for device selector module to start': function(test) {
		activeModule.once(eventList.MODULE_STARTED, function(scanResults) {
			var numResults = scanResults.length = 0;
			test.strictEqual(numResults, 0, 'No results should currently be cached');
			test.done();
		});
	},
	'check page elements': function(test) {
		var labjackLogo = $('#labjack-logo-image');
		var isLogoValid = true;
		if(labjackLogo.height() != 43) {
			isLogoValid = false;
		}
		if(labjackLogo.width() != 224) {
			isLogoValid = false;
		}
		test.ok(isLogoValid, 'LabJack logo not displayed');
		var labjackLink = $('#lj-link-text');
		// labjackLink.trigger('click');

		test.done();
	},
	'refresh device list': function(test) {
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
					test.ok(startedScanEventCaught, 'should triggered scan started event');
					console.log('scanResults', scanResults);
					test.done();
				});
			var viewGen = activeModule.viewGen;
			var refreshButton = viewGen.pageElements.refresh_devices_button.ref;

			// Trigger the click event for the refresh button and make sure the scan
			// happens.
			refreshButton.trigger('click');
			// test.done();
		} else {
			test.done();
		}
	},

	'check displayed scan results': function(test) {
		// Verify there being some number of found device types
		var deviceTypes = $('.device-type');
		test.strictEqual(deviceTypes.length, 4, 'Unexpected number of device types');

		var devices = $('.device');
		test.strictEqual(devices.length, 5, 'Unexpected number of devices');

		var digits = $('.DEVICE_TYPE_Digit .device');
		test.strictEqual(digits.length, 1, 'Unexpected number of digits found');

		var t7s = $('.DEVICE_TYPE_T7 .device');
		test.strictEqual(t7s.length, 2, 'Unexpected number of T7s found');

		var t4s = $('.DEVICE_TYPE_T4 .device');
		test.strictEqual(t4s.length, 1, 'Unexpected number of T4s found');

		var t5s = $('.DEVICE_TYPE_T5 .device');
		test.strictEqual(t5s.length, 1, 'Unexpected number of T5s found');

		test.done();
	},
	'Enable device scanning': function(test) {
		if(testOptions.realRefresh) {
			deviceController.disableMockDeviceScanning()
			.then(function() {
				test.done();
			});
		} else {
			test.done();
		}
	},
	'refresh device list - live': function(test) {
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
					test.ok(startedScanEventCaught, 'should triggered scan started event');
					console.log('scanResults', scanResults);
					test.done();
				});
			var viewGen = activeModule.viewGen;
			var refreshButton = viewGen.pageElements.refresh_devices_button.ref;
			
			// Trigger the click event for the refresh button and make sure the scan
			// happens.
			refreshButton.trigger('click');
		} else {
			test.done();
		}
	},
	// 'connect to T7': function(test) {
	// 	MODULE_CHROME.once(
	// 		MODULE_CHROME.eventList.DEVICE_SELECTOR_DEVICE_OPENED,
	// 		function(updatedModules) {
	// 			console.log('Tabs updated (test)', updatedModules);
	// 			test.done();
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
	// 			test.done();
	// 		});

	// 	// Connect to the first found USB-T7
	// 	var t7s = $('.DEVICE_TYPE_T7 .disconnect-button');
	// 	var t7 = t7s.first();
	// 	t7.trigger('click');
	// },
};