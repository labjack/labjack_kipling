// Legacy test for the old ListAll scan method. Expects to open real devices.
var assert = require('chai').assert;

var deviceScanner;
var device_scanner = require('../../lib/ljswitchboard-device_scanner');
var test_util = require('../utils/test_util');
var printScanResultsData = test_util.printScanResultsData;
var verifyScanResults = test_util.verifyScanResults;

var device_curator = require('ljswitchboard-ljm_device_curator');

var ljn = require('labjack-nodejs');
var driver = ljn.driver();


var isDeviceConnected = false;
var innerReporter;
function deviceDisconnectedHandler(info) {
	isDeviceConnected = false;
}
function deviceReconnectedHandler(info) {
	isDeviceConnected = true;
}
function getLogger(bool) {
    return function logger() {
        if(bool) {
            console.log.apply(console, arguments);
        }
    };
}

var DEBUG_SCAN_DATA = false;
var DEBUG_DEVICE_CONNECTION = false;
var debugScanData = getLogger(DEBUG_SCAN_DATA);
var debugDeviceCon = getLogger(DEBUG_DEVICE_CONNECTION);

var devices = [];
var device;
var expectedDeviceTypes;

describe('handle active device disconnected', function() {
	it('Starting Basic Test', function (done) {
		console.log('');
		console.log('*** Starting Handle Active Device Disconnected test ***');
		console.log('*** 1x T7 needs to be connected via USB ***');

		deviceScanner = device_scanner.getDeviceScanner('open_all');

		done();
	});
	it('enable device scanning', function (done) {

		deviceScanner.enableDeviceScanning()
		.then(function() {
			done();
		});
	});
	it('clear cached scan results', function (done) {
		deviceScanner.clearCachedScanResults()
		.then(function() {
			done();
		});
	});
	it('find USB device', function (done) {
		var numRetries = 10;
		function deviceChecker() {
			var foundDevices = driver.listAllSync('LJM_dtT7', 'LJM_ctUSB');
			var foundUSBDevice = false;
			for (var i = 0; i < foundDevices.length; i++) {
				if(foundDevices[i].connectionType == 1) {
					foundUSBDevice = true;
				}
			}

			if(foundUSBDevice) {
				clearInterval(intervalHandler);
				done();
			} else {
				numRetries = numRetries - 1;
				console.log('  - Connect a T7 via USB ('+numRetries.toString()+')');
				if(numRetries < 0) {
					assert.isOk(false, 'no T7 connected');
					done();
				}
			}
		}
		var intervalHandler = setInterval(deviceChecker, 1000);
	});
	/*
	 * This test determines what devices are currently available for other tests to compare results with.
	 */
	it('perform initial scan', function (done) {
		deviceScanner.findAllDevices(devices, {scanUSB: true, scanEthernet:false, scanWiFi:false})
		.then(function(deviceTypes) {
			expectedDeviceTypes = deviceTypes;
			debugScanData('Finished initial scan, scan data', deviceTypes);
			printScanResultsData(deviceTypes);

			verifyScanResults(deviceTypes, test, {debug: false});
			done();
		}, function(err) {
			console.log('Scanning Error');
			assert.isOk(false, 'Scan should have worked properly');
			done();
		});
	});
	/*
	 * Now we need to open a device.  This device will need to be properly detected as
	 * a "connected" device by the cached scan in the next test.
	 */
	it('open device', function (done) {
		if (process.env.SKIP_HARDWARE_TEST) {
			done();
			return;
		}

		device = new device_curator.device();
		device.on('DEVICE_DISCONNECTED', deviceDisconnectedHandler);
		device.on('DEVICE_RECONNECTED', deviceReconnectedHandler);

		devices.push(device);
		debugDeviceCon('  - Opening Device...');
		device.open('LJM_dtT7', 'LJM_ctUSB', 'LJM_idANY')
		.then(function() {
			isDeviceConnected = true;
			debugDeviceCon('Opened Device', device.savedAttributes.serialNumber);
			done();
		}, function() {
			debugDeviceCon('**** T7 Not detected ****');
			devices[0].destroy();
			devices = [];
			assert.isOk(false, 'Please connect a T7 via USB');
			done();
		});
	});
	it('disconnect USB device', function (done) {
		var numRetries = 10;
		function deviceChecker() {
			if(!isDeviceConnected) {
				clearInterval(intervalHandler);
				done();
			} else {
				numRetries = numRetries - 1;
				console.log(' - Disconnect USB Device', device.savedAttributes.serialNumber, numRetries);
				if(numRetries < 0) {
					assert.isOk(false, 'device should have been disconnected, exiting.');
					done();
				}
			}
		}
		var intervalHandler = setInterval(deviceChecker, 1000);
	});
	/*
	 * This test determines what devices are currently available for other tests to compare results with.
	 */
	it('perform secondary', function (done) {
		deviceScanner.findAllDevices(devices, {scanUSB: true, scanEthernet:false, scanWiFi:false})
		.then(function(deviceTypes) {
			// expectedDeviceTypes = deviceTypes;
			debugScanData('Finished initial scan, scan data', deviceTypes);
			console.log('! scan results:');
			printScanResultsData(deviceTypes);
			verifyScanResults(deviceTypes, test, {debug: false});
			done();
		}, function(err) {
			console.log('Scanning Error');
			assert.isOk(false, 'Scan should have worked properly');
			done();
		});
	});
	// it('perform cached scan', function (done) {
	// 	var device = devices[0];
	// 	var startTime = new Date();
	// 	console.log('  - Performing secondary cached scan...');
	// 	deviceScanner.getLastFoundDevices(devices)
	// 	.then(function(deviceTypes) {
	// 		console.log('In cached scan');
	// 		// Due to this being called before a scan is performed, it should
	// 		// return no devices.
	// 		debugScanData('Finished initial cached scan', deviceTypes);
	// 		printScanResultsData(deviceTypes);

	// 		var endTime = new Date();
	// 		debugScanTime('  - Duration'.cyan, (endTime - startTime)/1000);


	// 		function checkConnectionType(foundDevCT) {
	// 			// console.log('FoundDevCT', foundDevCT);
	// 			var ctn = device.savedAttributes.connectionTypeName;
	// 			var fCTN = foundDevCT.connectionTypeName;


	// 			if(ctn === fCTN){
	// 				foundDeviceConnectionType = true;
	// 				if(foundDevCT.insertionMethod === 'connected') {
	// 					correctlyReportedDeviceAsOpen = true;
	// 				}
	// 			}
	// 		}
	// 		function checkFoundDevice(foundDevice) {
	// 			// console.log('in checkFoundDevice', foundDevice.serialNumber, device.savedAttributes.serialNumber);
	// 			if(foundDevice.serialNumber == device.savedAttributes.serialNumber) {
	// 				// We found the correct device.
	// 				foundOpenDevice = true;
	// 				foundDevice.connectionTypes.forEach(checkConnectionType);
	// 			}
	// 		}
	// 		function checkForDeviceType(deviceType) {
	// 			// console.log('in checkForDeviceType');
	// 			var dtn = device.savedAttributes.deviceTypeName;
	// 			// console.log('dtn', dtn, 'd.dtn', deviceType.deviceTypeName);
	// 			if(deviceType.deviceTypeName === dtn) {
	// 				// We found the device type
	// 				appropriateDeviceTypeFound = true;
	// 				deviceType.devices.forEach(checkFoundDevice);
	// 			}
	// 		}

	// 		// Verify that we found the currently open device.
	// 		var appropriateDeviceTypeFound = false;
	// 		var foundOpenDevice = false;
	// 		var foundDeviceConnectionType = false;
	// 		var correctlyReportedDeviceAsOpen = false;


	// 		deviceTypes.forEach(checkForDeviceType);

	// 		assert.isOk(appropriateDeviceTypeFound, 'appropriateDeviceTypeFound was not true.'),
	// 		assert.isOk(foundOpenDevice, 'foundOpenDevice was not true.'),
	// 		assert.isOk(foundDeviceConnectionType, 'foundDeviceConnectionType was not true.'),
	// 		assert.isOk(correctlyReportedDeviceAsOpen, 'correctlyReportedDeviceAsOpen was not true.'),
	// 		done();
	// 	}, function(err) {
	// 		console.log('Scanning Error');
	// 		assert.isOk(false, 'Scan should have worked properly');
	// 		done();
	// 	});
	// });
	it('re-connect USB device', function (done) {
		var numRetries = 10;
		function deviceChecker() {
			if(isDeviceConnected) {
				clearInterval(intervalHandler);
				done();
			} else {
				numRetries = numRetries - 1;
				console.log(' - Connect USB Device', device.savedAttributes.serialNumber, numRetries);
				if(numRetries < 0) {
					assert.isOk(false, 'device should have been re-connected, exiting.');
					done();
				}
			}
		}
		var intervalHandler = setInterval(deviceChecker, 1000);
	});

	it('close device', function (done) {
		if(devices[0]) {
			devices[0].close()
			.then(function() {
				done();
			}, function() {
				done();
			});
		} else {
			done();
		}
	});
	it('unload', function (done) {
		device_scanner.unload();
		done();
	});
});
