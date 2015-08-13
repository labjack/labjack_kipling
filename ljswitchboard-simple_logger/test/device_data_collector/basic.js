

/*
This file is the basic test for the device_data_collector object.

It tests for syntax errors (ability to properly require & use) as well as some
basic functionality.

*/
var path = require('path');
var q = require('q');

var device_data_collector;
var deviceDataCollectors = [];

/* Code that is required to load a logger-configuration */
var config_loader = require('../../lib/device_data_collector');
var cwd = process.cwd();
var logger_config_files_dir = path.join(cwd, 'test', 'logger_config_files');
var basic_config = undefined;

var mock_device_manager = require('../mock_device_manager');
var mockDeviceManager = mock_device_manager.createDeviceManager();

var driver_const = require('ljswitchboard-ljm_driver_constants');

/* Configure what devices to open/create */
mockDeviceManager.configure([{
	'deviceType': driver_const.LJM_DT_T7,
	'serialNumber': 1,
	'connectionType': driver_const.LJM_CT_USB,
}, {
	'deviceType': driver_const.LJM_DT_T7,
	'serialNumber': 2,
	'connectionType': driver_const.LJM_CT_USB,
}]);

/* What devices should be logged from */
required_data_collectors = [{
	'serialNumber': 1,
	'isFound': true,
}, {
	'serialNumber': 2,
	'isFound': true,
}, {
	'serialNumber': 3,
	'isFound': false,
}];

var dataToRead = ['AIN0'];

exports.basic_tests = {
	'Require device_data_collector': function(test) {
		try {
			device_data_collector = require('../../lib/device_data_collector');
			test.ok(true);
		} catch(err) {
			test.ok(false, 'error loading device_data_collector');
		}
		test.done();
	},
	'Open Devices': mockDeviceManager.openDevices,
	'Verify Device Info': mockDeviceManager.getDevicesInfo,
	'create deviceDataCollector objects': function(test) {
		var devices = mockDeviceManager.getDevices();

		deviceDataCollectors = required_data_collectors.map(function() {
			return device_data_collector.createDeviceDataCollector();
		});
		test.done();
	},
	'update device listings': function(test) {
		var promises = deviceDataCollectors.map(function(deviceDataCollector) {
			var keys = Object.keys(deviceDataCollector);
			// Update each deviceDataCollector with the available devices
			return deviceDataCollector.updateDeviceListing(
				mockDeviceManager.getDevices()
			);
		});

		q.allSettled(promises)
		.then(function() {
			test.done();
		});
	},
	'link deviceDataCollectors to devices': function(test) {
		var promises = deviceDataCollectors.map(function(deviceDataCollector, i) {
			// Configure the deviceDataCollector with the desired serial number.
			return deviceDataCollector.linkToDevice(
				required_data_collectors[i].serialNumber
			);
		});

		q.allSettled(promises)
		.then(function() {
			deviceDataCollectors.forEach(function(deviceDataCollector, i) {
				var expectedIsFound = required_data_collectors[i].isFound;
				var isFound = deviceDataCollector.isValidDevice;
				
				test.equal(
					isFound,
					expectedIsFound,
					'Device is not properly found'
				);
			});
			test.done();
		});
	},
	'trigger read for dummy data': function(test) {
		var promises = deviceDataCollectors.map(function(deviceDataCollector, i) {
			// trigger the deviceDataCollector to start a new read for dummy data.
			return deviceDataCollector.startNewRead(dataToRead);
		});

		q.allSettled(promises)
		.then(function() {
			test.done();
		});
	},
	'Close Devices':mockDeviceManager.closeDevices,
};