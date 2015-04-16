

var testOptions = {
	'forceLiveTest': true
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
var eventList;

var q;
try {
	q = require('q');
} catch(err) {
	q = global.require('q');
}

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
	'load the device_selector module': function(test) {
		MODULE_LOADER.once('MODULE_READY', function(res) {
			test.done();
		});
		var deviceSelectorTab = $('#device_selector-tab');
		deviceSelectorTab.trigger('click');
	},
	'save save device_selector information': function(test) {
		activeModule = kiplingWindow.activeModule;
		eventList = activeModule.eventList;
		test.done();
	},
	'disconnect from mock devices': function(test) {
		var buttonClasses = $('.disconnect_buttons_class');
		var num = buttonClasses.length;
		var i;
		var activeNums = [];
		var promises = [];
		var closeDevice = function(ele) {
			var testDefered = q.defer();
			var resolveFunc = function(updatedModules) {
				testDefered.resolve();
			};
			MODULE_CHROME.once(
				MODULE_CHROME.eventList.DEVICE_SELECTOR_DEVICE_CLOSED,
				resolveFunc);
			var disconnectButton = ele.find('.disconnect-button');
			setImmediate(function() {
				disconnectButton.trigger('click');
			});
			return testDefered.promise;
		}
		for(i = 0; i < num; i++) {
			if(buttonClasses.eq(i).css('display') !== 'none') {
				activeNums.push(i);
				promises.push(closeDevice(buttonClasses.eq(i)));
			}
		}
		q.allSettled(promises)
		.then(function() {
			console.log('Closed All Devices!');
			test.done();
		}, function(err) {
			console.log('ERror...', err);
		});
	},
	'Enable device scanning': function(test) {
		if(gui.App.manifest.performLiveTests || testOptions.forceLiveTest) {
			deviceController.disableMockDeviceScanning()
			.then(function() {
				test.done();
			});
		} else {
			test.done();
		}
	},
	'refresh device list - live': function(test) {
		if(gui.App.manifest.performLiveTests || testOptions.forceLiveTest) {
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
	'connect to T7 (USB)': function(test) {
		MODULE_CHROME.once(
			MODULE_CHROME.eventList.DEVICE_SELECTOR_DEVICE_OPENED,
			function(updatedModules) {
				console.log('Tabs updated (test)', updatedModules);
				test.done();
			});

		// Connect to the first found USB-T7
		var t7s = $('.DEVICE_TYPE_T7 .CONNECTION_TYPE_USB');
		if(t7s.length > 0) {
			var t7 = t7s.first();
			t7.trigger('click');
		} else {
			test.done();
		}
	},
	'load device info': function(test) {
		MODULE_LOADER.once('MODULE_READY', function(res) {
			test.done();
		});
		var deviceInfoTab = $('#device_info_fw-tab');
		deviceInfoTab.trigger('click');
	},
	'please disconnect T7': function(test) {
		test.done();
	}
};