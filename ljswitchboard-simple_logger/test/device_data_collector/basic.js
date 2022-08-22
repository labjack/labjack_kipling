var assert = require('chai').assert;

/*
This file is the basic test for the device_data_collector object.

It tests for syntax errors (ability to properly require & use) as well as some
basic functionality.

*/
var q = require('q');

var device_data_collector;
var deviceDataCollectors = [];

/* Code that is required to load a logger-configuration */
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
	'serialNumber': '3',
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
var daqInterval = 5;

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
describe('device_data_collector', function() {
	it('Require device_data_collector', function (done) {
		try {
			device_data_collector = require('../../lib/device_data_collector');
			assert.isOk(true);
		} catch(err) {
			assert.isOk(false, 'error loading device_data_collector');
		}
		// done();
	});
	it('Open Devices', function (done) {
		mockDeviceManager.openDevices();
		done();
	});
	it('Verify Device Info', function (done) {
		mockDeviceManager.getDevicesInfo();
		done();
	});
	it('create deviceDataCollector objects', function (done) {
		var devices = mockDeviceManager.getDevices();

		deviceDataCollectors = required_data_collectors.map(function() {
			return device_data_collector.createDeviceDataCollector();
		});

		// Save data collectors to the test generator.
		loggerTestGenerator.setDataCollectors(deviceDataCollectors);
		done();
	});
	it('update device listings', function (done) {
		var promises = deviceDataCollectors.map(function(deviceDataCollector) {
			var keys = Object.keys(deviceDataCollector);
			// Update each deviceDataCollector with the available devices
			return deviceDataCollector.updateDeviceListing(
				mockDeviceManager.getDevices()
			);
		});

		q.allSettled(promises)
		.then(function() {
			done();
		});
	});
	it('link deviceDataCollectors to devices', function (done) {
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

				assert.equal(
					isFound,
					expectedIsFound,
					'Device is not properly found'
				);
			});
			done();
		});
	});
	it('attach data collectors', function (done) {
		deviceDataCollectors.forEach(function(deviceDataCollector, i) {
			// Attach to the new data event of each of the deviceDataCollectors.
			var newDataEvent = device_data_collector.EVENT_LIST.DATA;
			deviceDataCollector.on(newDataEvent, dataCollector);
		});
		done();
	});
	it('trigger read for dummy data', function (done) {
		triggerLoggerTest();
		done();
	});
	it('time delay...', function (done) {
		setTimeout(function() {
			done();
		}, 100);
	});
	it('test results', function (done) {
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
					assert.equals(resData.errorCode, expData.errorCode, 'Error Code does not match');

					// Check registers read
					assert.deepEqual(resData.registers, expData.registers, 'Registers list does not match');
				}
			} else {
				assert.isOk(false, 'result data lengths dont align');
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
		done();
	});
	it('Close Devices', function (done) {
		mockDeviceManager.closeDevices();
		done();
	});
});
