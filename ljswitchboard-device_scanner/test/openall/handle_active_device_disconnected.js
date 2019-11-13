// Legacy test for the old ListAll scan method. Expects to open real devices.

var deviceScanner;
var device_scanner = require('../../lib/ljswitchboard-device_scanner');
var test_util = require('../utils/test_util');
var printAvailableDeviceData = test_util.printAvailableDeviceData;
var printScanResultsData = test_util.printScanResultsData;
var printScanResultsKeys = test_util.printScanResultsKeys;
var verifyScanResults = test_util.verifyScanResults;
var testScanResults = test_util.testScanResults;

var expDeviceTypes = require('../utils/expected_devices').expectedDevices;
var reqDeviceTypes = require('../utils/required_devices').requiredDeviceTypes;

var device_curator = require('ljswitchboard-ljm_device_curator');


var ljn = require('labjack-nodejs');
var driver = ljn.driver();


var isDeviceConnected = false;
var innerReporter = undefined;
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
var device = undefined;
var expectedDeviceTypes = undefined;

exports.tests = {
	'Starting Basic Test': function(test) {
		console.log('');
		console.log('*** Starting Handle Active Device Disconnected test ***');
		console.log('*** 1x T7 needs to be connected via USB ***');

		deviceScanner = device_scanner.getDeviceScanner('open_all');

		test.done();
	},
	'enable device scanning': function(test) {

		deviceScanner.enableDeviceScanning()
		.then(function() {
			test.done();
		});
	},
	'clear cached scan results': function(test) {
		deviceScanner.clearCachedScanResults()
		.then(function() {
			test.done();
		});
	},
	'find USB device': function(test) {
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
				test.done();
			} else {
				numRetries = numRetries - 1;
				console.log('  - Connect a T7 via USB ('+numRetries.toString()+')');
				if(numRetries < 0) {
					test.ok(false, 'no T7 connected');
					test.done();
				}
			}
		}
		var intervalHandler = setInterval(deviceChecker, 1000);
	},
	/*
	 * This test determines what devices are currently available for other tests to compare results with.
	 */
	'perform initial scan': function(test) {
		deviceScanner.findAllDevices(devices, {scanUSB: true, scanEthernet:false, scanWiFi:false})
		.then(function(deviceTypes) {
			expectedDeviceTypes = deviceTypes;
			debugScanData('Finished initial scan, scan data', deviceTypes);
			printScanResultsData(deviceTypes);

			verifyScanResults(deviceTypes, test, {debug: false});
			test.done();
		}, function(err) {
			console.log('Scanning Error');
			test.ok(false, 'Scan should have worked properly');
			test.done();
		});
	},
	/*
	 * Now we need to open a device.  This device will need to be properly detected as
	 * a "connected" device by the cached scan in the next test.
	 */
	'open device': function(test) {
		device = new device_curator.device();
		device.on('DEVICE_DISCONNECTED', deviceDisconnectedHandler);
		device.on('DEVICE_RECONNECTED', deviceReconnectedHandler);

		devices.push(device);
		debugDeviceCon('  - Opening Device...');
		device.open('LJM_dtT7', 'LJM_ctUSB', 'LJM_idANY')
		.then(function() {
			isDeviceConnected = true;
			debugDeviceCon('Opened Device', device.savedAttributes.serialNumber);
			test.done();
		}, function() {
			debugDeviceCon('**** T7 Not detected ****');
			devices[0].destroy();
			devices = [];
			test.ok(false, 'Please connect a T7 via USB');
			test.done();
		});
	},
	'disconnect USB device': function(test) {
		var numRetries = 10;
		function deviceChecker() {
			if(!isDeviceConnected) {
				clearInterval(intervalHandler);
				test.done();
			} else {
				numRetries = numRetries - 1;
				console.log(' - Disconnect USB Device', device.savedAttributes.serialNumber, numRetries);
				if(numRetries < 0) {
					test.ok(false, 'device should have been disconnected, exiting.');
					test.done();
				}
			}
		}
		var intervalHandler = setInterval(deviceChecker, 1000);
	},
	/*
	 * This test determines what devices are currently available for other tests to compare results with.
	 */
	'perform secondary': function(test) {
		deviceScanner.findAllDevices(devices, {scanUSB: true, scanEthernet:false, scanWiFi:false})
		.then(function(deviceTypes) {
			// expectedDeviceTypes = deviceTypes;
			debugScanData('Finished initial scan, scan data', deviceTypes);
			console.log('! scan results:');
			printScanResultsData(deviceTypes);
			verifyScanResults(deviceTypes, test, {debug: false});
			test.done();
		}, function(err) {
			console.log('Scanning Error');
			test.ok(false, 'Scan should have worked properly');
			test.done();
		});
	},
	// 'perform cached scan': function(test) {
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

	// 		test.ok(appropriateDeviceTypeFound, 'appropriateDeviceTypeFound was not true.'),
	// 		test.ok(foundOpenDevice, 'foundOpenDevice was not true.'),
	// 		test.ok(foundDeviceConnectionType, 'foundDeviceConnectionType was not true.'),
	// 		test.ok(correctlyReportedDeviceAsOpen, 'correctlyReportedDeviceAsOpen was not true.'),
	// 		test.done();
	// 	}, function(err) {
	// 		console.log('Scanning Error');
	// 		test.ok(false, 'Scan should have worked properly');
	// 		test.done();
	// 	});
	// },
	're-connect USB device': function(test) {
		var numRetries = 10;
		function deviceChecker() {
			if(isDeviceConnected) {
				clearInterval(intervalHandler);
				test.done();
			} else {
				numRetries = numRetries - 1;
				console.log(' - Connect USB Device', device.savedAttributes.serialNumber, numRetries);
				if(numRetries < 0) {
					test.ok(false, 'device should have been re-connected, exiting.');
					test.done();
				}
			}
		}
		var intervalHandler = setInterval(deviceChecker, 1000);
	},
	
	'close device': function(test) {
		if(devices[0]) {
			devices[0].close()
			.then(function() {
				test.done();
			}, function() {
				test.done();
			});
		} else {
			test.done();
		}
	},
	'unload': function(test) {
		device_scanner.unload();
		test.done();
	},
};