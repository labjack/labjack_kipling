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


var mockDevices = require('./mock_devices').mockDevices;
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

describe('mock register matrix', function() {
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
	it('load register_matrix_fw', function (done) {
		MODULE_LOADER.once('MODULE_READY', function(res) {
			done();
		});
		var deviceInfoTab = $('#register_matrix_fw-tab');
		deviceInfoTab.trigger('click');
	});
});
