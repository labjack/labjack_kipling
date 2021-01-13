'use strict';

const package_loader = global.package_loader;
const gui = global.gui;
const window_manager = package_loader.getPackage('window_manager');
const kiplingWin = window_manager.getWindow('kipling').win;

const {assert} = require('chai');

const testOptions = {
	'refreshDevices': false,
	'realRefresh': false
};

const io_manager = package_loader.getPackage('io_manager');
const io_interface = io_manager.io_interface();
const deviceController = io_interface.getDeviceController();

let MODULE_LOADER;
let activeModule;

const mockDevices = require('./mock_devices').mockDevices;
const deviceScannerConfigData = [];
const excludeKeys = ['deviceConfig'];
mockDevices.forEach(function(mockDevice) {
	const deviceData = {};
	const keys = Object.keys(mockDevice);
	keys.forEach(function(key) {
		if(excludeKeys.indexOf(key) < 0) {
			deviceData[key] = mockDevice[key];
		}
	});
	deviceScannerConfigData.push(deviceData);
});

describe('mock_device_selector', function() {
	it('initialize test', async function () {
		const injectScript = 'global.MODULE_LOADER;';
		MODULE_LOADER = await kiplingWin.webContents.executeJavaScript(injectScript.toString('utf-8'));
	});
	it('disable device scanning', async function () {
		while (!deviceController.link) {
			await new Promise(resolve => setTimeout(resolve, 100));
		}
		await deviceController.enableMockDeviceScanning();
	});
	it('Add mock devices', async function () {
		await deviceController.addMockDevices(deviceScannerConfigData);
	});
	it('load the device_selector module', async function () {
		await kiplingWin.webContents.executeJavaScript('MODULE_LOADER.loadModuleByName(\'device_selector\');Promise.resolve();');
	});
	it('wait for device selector module to start', async function () {
		let hasActiveModule = await kiplingWin.webContents.executeJavaScript('!!global.activeModule');
		while (!hasActiveModule) {
			await new Promise(resolve => setTimeout(resolve, 100));
			hasActiveModule = await kiplingWin.webContents.executeJavaScript('!!global.activeModule');
		}

		const injectScript = 'new Promise(resolve => global.activeModule.once(\'MODULE_STARTED\', (scanResults) => resolve(scanResults.length)));';
		const scanResultsLength = await kiplingWin.webContents.executeJavaScript(injectScript.toString('utf-8'));

		assert.strictEqual(scanResultsLength, 0, 'No results should currently be cached');
	});
	it('check page elements', async function () {
		const injectScript = '($(\'#labjack-logo-image\').height() === 49 && $(\'#labjack-logo-image\').width() === 290);';
		const isLogoValid = await kiplingWin.webContents.executeJavaScript(injectScript.toString('utf-8'));

		assert.isOk(isLogoValid, 'LabJack logo not displayed');
	});
	it('refresh device list', async function () {
		await kiplingWin.webContents.executeJavaScript('$(\'#usb_scan_enabled\').prop(\'checked\', true); Promise.resolve();');
		await kiplingWin.webContents.executeJavaScript('$(\'#ethernet_scan_enabled\').prop(\'checked\', true);Promise.resolve();');
		await kiplingWin.webContents.executeJavaScript('$(\'#wifi_scan_enabled\').prop(\'checked\', true);Promise.resolve();');

		if(testOptions.refreshDevices) {
			const injectScript = 'new Promise(resolve => {\n' +
				'\tlet startedScanEventCaught = false;\n' +
				'\tglobal.activeModule.once(\'DEVICE_SCAN_STARTED\', () => { startedScanEventCaught = true; });\n' +
				'\tglobal.activeModule.once(\'DEVICE_SCAN_COMPLETED\', (scanResults) => {\n' +
				'\t\tconsole.log(\'scanResults\', scanResults);\n' +
				'\t\tresolve(startedScanEventCaught);\n' +
				'\t});\n' +
				'});';
			const startedScanEventCaught =await kiplingWin.webContents.executeJavaScript(injectScript.toString('utf-8'));

			assert.isOk(startedScanEventCaught, 'should triggered scan started event');

			await kiplingWin.webContents.executeJavaScript('global.activeModule.viewGen.pageElements.refresh_devices_button.ref.trigger(\'click\'); Promise.resolve();');
		} else {
		}

		// await kiplingWin.webContents.executeJavaScript(injectScript.toString('utf-8'));
	});

	it('check displayed scan results', async function () {
		// Verify there being some number of found device types
		const deviceTypes = await kiplingWin.webContents.executeJavaScript('$(\'.device-type\').length;');
		assert.strictEqual(deviceTypes, 4, 'Unexpected number of device types');

		const devices = await kiplingWin.webContents.executeJavaScript('$(\'.device\').length;');
		assert.strictEqual(devices, 5, 'Unexpected number of devices');

		const digits = await kiplingWin.webContents.executeJavaScript('$(\'.DEVICE_TYPE_Digit .device\').length;');
		assert.strictEqual(digits, 1, 'Unexpected number of digits found');

		const t7s = await kiplingWin.webContents.executeJavaScript('$(\'.DEVICE_TYPE_T7 .device\').length;');
		assert.strictEqual(t7s, 2, 'Unexpected number of T7s found');

		const t4s = await kiplingWin.webContents.executeJavaScript('$(\'.DEVICE_TYPE_T4 .device\').length;');
		assert.strictEqual(t4s, 1, 'Unexpected number of T4s found');

		const t8s = await kiplingWin.webContents.executeJavaScript('$(\'.DEVICE_TYPE_T8 .device\');');
		assert.strictEqual(t8s.length, 1, 'Unexpected number of T8s found');
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
		if(gui.appManifest.performLiveTests || testOptions.realRefresh) {
			let startedScanEventCaught = false;
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
			const viewGen = activeModule.viewGen;
			const refreshButton = viewGen.pageElements.refresh_devices_button.ref;

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
	// 	const t7s = $('.DEVICE_TYPE_T7 .CONNECTION_TYPE_USB');
	// 	const t7 = t7s.first();
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
	// 	const t7s = $('.DEVICE_TYPE_T7 .disconnect-button');
	// 	const t7 = t7s.first();
	// 	t7.trigger('click');
	// },
});
