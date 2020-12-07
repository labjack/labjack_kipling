'use strict';

const package_loader = global.package_loader;
const window_manager = package_loader.getPackage('window_manager');

// Window Objects
const kiplingWin;

// Kipling Application Objects
const kiplingWindow;
const MODULE_LOADER;

const configureMockDevice = function(deviceIndex) {
	const deviceData = {};
	if(mockDevices[deviceIndex]) {
		deviceData = mockDevices[deviceIndex];
	}
	const filters = {};
	const filterKeys = ['serialNumber', 'deviceType', 'connectionType'];
	const deviceConfig = {};
	const keys = Object.keys(deviceData);
	keys.forEach(function(key) {
		if(filterKeys.indexOf(key) >= 0) {
			filters[key] = deviceData[key];
		}
		if(key === 'deviceConfig') {
			deviceConfig = deviceData.deviceConfig;
		}
	});
};

describe('test_device_info', function() {
	it('initialize test', function (done) {
		const managedKiplingWindow = window_manager.windowManager.managedWindows.kipling;
		kiplingWin = managedKiplingWindow.win;

		kiplingWindow = kiplingWin.window;
		MODULE_LOADER = kiplingWindow.MODULE_LOADER;

		done();
	});
	it('reload device selector', function (done) {
		MODULE_LOADER.once('MODULE_READY', function(res) {
			done();
		});

		const settingsTab = $('#settings-tab');
		settingsTab.trigger('click');
		// MODULE_LOADER.loadModuleByName('device_selector')
		// .then(function(res) {
		// 	// Device selector isn't quite loaded yet.  Just ready for
		// 	// other async tasks.  Must wait for the "MODULE_READY" event.
		// });
	});
	// 'connect to T7 (USB)': function(test) {
	// 	MODULE_CHROME.once(
	// 		MODULE_CHROME.eventList.DEVICE_SELECTOR_DEVICE_OPENED,
	// 		function(updatedModules) {
	// 			console.log('Tabs updated (test)', updatedModules);
	// 			done();
	// 		});

	// 	// Connect to the first found USB-T7
	// 	const t7s = $('.DEVICE_TYPE_T7 .CONNECTION_TYPE_USB');
	// 	const t7 = t7s.first();
	// 	t7.trigger('click');
	// },
	// 'connect to T7 (Ethernet)': function(test) {
	// 	MODULE_CHROME.once(
	// 		MODULE_CHROME.eventList.DEVICE_SELECTOR_DEVICE_OPENED,
	// 		function(updatedModules) {
	// 			console.log('Tabs updated (test)', updatedModules);
	// 			done();
	// 		});

	// 	// Connect to the second found Ethernet-T7
	// 	const t7s = $('.DEVICE_TYPE_T7 .CONNECTION_TYPE_Ethernet');
	// 	const t7 = t7s.eq(1);
	// 	t7.trigger('click');
	// },
	// 'connect to Digit (USB)': function(test) {
	// 	MODULE_CHROME.once(
	// 		MODULE_CHROME.eventList.DEVICE_SELECTOR_DEVICE_OPENED,
	// 		function(updatedModules) {
	// 			console.log('Tabs updated (test)', updatedModules);
	// 			done();
	// 		});

	// 	// Connect to the first found USB-Digit
	// 	const t7s = $('.DEVICE_TYPE_Digit .CONNECTION_TYPE_USB');
	// 	const t7 = t7s.first();
	// 	t7.trigger('click');
	// },
	// 'load device info': function(test) {
	// 	kiplingWin.showDevTools();

	// 	MODULE_LOADER.once('MODULE_READY', function(res) {
	// 		done();
	// 	});
	// 	const deviceInfoTab = $('#device_info_fw-tab');
	// 	deviceInfoTab.trigger('click');
	// 	// MODULE_LOADER.loadModuleByName('device_info_fw')
	// 	// .then(function(res) {
	// 	// 	// Device selector isn't quite loaded yet.  Just ready for
	// 	// 	// other async tasks.  Must wait for the "MODULE_READY" event.
	// 	// });
	// },
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
