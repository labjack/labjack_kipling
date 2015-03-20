

var testOptions = {
	'forceLive': true
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
		MODULE_LOADER.loadModuleByName('device_selector')
		.then(function(res) {
			test.done();
		});
	},
	'save save device_selector information': function(test) {
		activeModule = kiplingWindow.activeModule;
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
};