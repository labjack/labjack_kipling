

/*
This file is the basic test for the device_data_collector object.

It tests for syntax errors (ability to properly require & use) as well as some
basic functionality.

*/
var path = require('path');
var q = require('q');
var async = require('async');

var device_data_collector;
var deviceDataCollectors = [];

/* Code that is required to load a logger-configuration */
var config_loader = require('../../lib/config_loader');
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
required_data_collectors = [
{
	'serialNumber': 1,
	'isFound': true,
},
{
	'serialNumber': 2,
	'isFound': true,
},
{
	'serialNumber': 3,
	'isFound': false,
}
];

var dataToRead = ['AIN0'];

var collectedData = {};
var dataCollector = function(data) {
	if(collectedData[data.serialNumber]) {
		collectedData[data.serialNumber].push(data.results);
	} else {
		collectedData[data.serialNumber] = [data.results];
	}
};

var numReads = 100;
var daqInterval = 10;

/*
Function that creates a trigger logger test to run N number of triggers that
cause data to get read.
*/

var loggerTestGenerator = require('./loggerTestGenerator');
var getTriggerLoggerTest = loggerTestGenerator.getTriggerLoggerTest;
var triggerLoggerTest = getTriggerLoggerTest(numReads, daqInterval, dataToRead);



/*
Begin defining test cases.
*/
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

		// Save data collectors to the test generator.
		loggerTestGenerator.setDataCollectors(deviceDataCollectors);
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
	'attach data collectors': function(test) {
		deviceDataCollectors.forEach(function(deviceDataCollector, i) {
			// Attach to the new data event of each of the deviceDataCollectors.
			var newDataEvent = device_data_collector.EVENT_LIST.DATA;
			deviceDataCollector.on(newDataEvent, dataCollector);
		});
		test.done();
	},
	'trigger read for dummy data': triggerLoggerTest,
	'time delay...': function(test) {
		setTimeout(function() {
			test.done();
		}, 100);
	},
	'test results': function(test) {
		var expectedResults = {};

		var keys = Object.keys(required_data_collectors);
		keys.forEach(function(key) {
			var requiredDataCollector = required_data_collectors[key];

			var sn = requiredDataCollector.serialNumber;
			expectedResults[sn] = [];
			
			var isFound = requiredDataCollector.isFound;
			var reqErrorCode = 0;
			if(!isFound) {
				reqErrorCode = device_data_collector.errorCodes.DEVICE_NOT_VALID;
			}

			for(var i = 0; i < numReads; i++) {
				expectedResults[sn].push({
					'registers': dataToRead,
					'errorCode': reqErrorCode
				});
			}
		});

		keys.forEach(function(key) {
			var requiredDataCollector = required_data_collectors[key];
			var sn = requiredDataCollector.serialNumber;

			var deviceData = collectedData[sn];
			var expectedData = expectedResults[sn];

			if(deviceData.length == expectedData.length) {
				for(var i = 0; i < deviceData.length; i++) {
					var resData = deviceData[i];
					var expData = expectedData[i];

					// Check error codes
					test.equals(resData.errorCode, expData.errorCode, 'Error Code does not match');

					// Check registers read
					test.deepEqual(resData.registers, expData.registers, 'Registers list does not match');
				}
			} else {
				test.ok(false, 'result data lengths dont align');
			}
		});
		// console.log('Results...');
		// console.log('Timing Stats: ', 'I', 'Dur.    ', 'Int.');
		// collectedData['1'].forEach(function(result) {
		// 	console.log('Timing Stats: ', result.index, result.duration, result.interval, result.errorCode, result.results);
		// });
		// console.log(JSON.stringify(collectedData['1'], null, 2));
		// console.log('Expected Results');
		// console.log(JSON.stringify(expectedResults['1'], null, 2));
		test.done();
	},
	'Close Devices':mockDeviceManager.closeDevices,
};