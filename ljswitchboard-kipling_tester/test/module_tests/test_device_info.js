'use strict';

const package_loader = global.package_loader;
const gui = global.gui;
const window_manager = package_loader.getPackage('window_manager');

var assert = require('chai').assert;

var testOptions = {
	'forceLiveTest': true
};

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

describe('test_device_selector', function() {
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
	it('load the device_selector module', function (done) {
		MODULE_LOADER.once('MODULE_READY', function(res) {
			done();
		});
		var deviceSelectorTab = $('#device_selector-tab');
		deviceSelectorTab.trigger('click');
	});
	it('save save device_selector information', function (done) {
		activeModule = kiplingWindow.activeModule;
		eventList = activeModule.eventList;
		done();
	});
	it('disconnect from mock devices', function (done) {
		var buttonClasses = $('.disconnect_buttons_class');
		var num = buttonClasses.length;
		var i;
		var activeNums = [];
		var promises = [];
		var closeDevice = function(ele) {
			return new Promise((resolve, reject) => {
				MODULE_CHROME.once(
					MODULE_CHROME.eventList.DEVICE_SELECTOR_DEVICE_CLOSED,
					(updatedModules) => {
						resolve();
					});
				var disconnectButton = ele.find('.disconnect-button');
				setImmediate(function() {
					disconnectButton.trigger('click');
				});
			});
		};
		for(i = 0; i < num; i++) {
			if(buttonClasses.eq(i).css('display') !== 'none') {
				activeNums.push(i);
				promises.push(closeDevice(buttonClasses.eq(i)));
			}
		}
		Promise.allSettled(promises)
		.then(function() {
			console.log('Closed All Devices!');
			done();
		}, function(err) {
			console.log('ERror...', err);
		});
	});
	it('Enable device scanning', function (done) {
		if(gui.App.manifest.performLiveTests || testOptions.forceLiveTest) {
			deviceController.disableMockDeviceScanning()
			.then(function() {
				done();
			});
		} else {
			done();
		}
	});
	it('refresh device list - live', function (done) {
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
	it('connect to T7 (USB)', function (done) {
		MODULE_CHROME.once(
			MODULE_CHROME.eventList.DEVICE_SELECTOR_DEVICE_OPENED,
			function(updatedModules) {
				console.log('Tabs updated (test)', updatedModules);
				done();
			});

		// Connect to the first found USB-T7
		var t7s = $('.DEVICE_TYPE_T7 .CONNECTION_TYPE_USB');
		if(t7s.length > 0) {
			var t7 = t7s.first();
			t7.trigger('click');
		} else {
			done();
		}
	});
	it('load device info', function (done) {
		MODULE_LOADER.once('MODULE_READY', function(res) {
			done();
		});
		var deviceInfoTab = $('#device_info_fw-tab');
		deviceInfoTab.trigger('click');
	});
	it('please disconnect T7', function (done) {
		done();
	});
});
