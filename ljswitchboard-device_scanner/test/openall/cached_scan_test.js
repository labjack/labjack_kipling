// Legacy test for the old ListAll scan method. Expects to open real devices.
var assert = require('chai').assert;

var deviceScanner;
var device_scanner = require('../../lib/ljswitchboard-device_scanner');
var test_util = require('../utils/test_util');
var printScanResultsData = test_util.printScanResultsData;
var verifyScanResults = test_util.verifyScanResults;

var device_curator = require('ljswitchboard-ljm_device_curator');

function getLogger(bool) {
    return function logger() {
        if(bool) {
            console.log.apply(console, arguments);
        }
    };
}

var DEBUG_SCAN_DATA = false;
var DEBUG_SCAN_TIME = false;
var debugScanData = getLogger(DEBUG_SCAN_DATA);
var debugScanTime = getLogger(DEBUG_SCAN_TIME);

var devices = [];
var expectedDeviceTypes;

describe('cached scan', function() {
	it('Starting Basic Test', function (done) {
		console.log('');
		console.log('*** Starting Basic (OpenAll) Test ***');

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
	it('perform initial cached read', function (done) {
		var startTime = new Date();
		console.log('  - Performing initial cached scan...');
		deviceScanner.getLastFoundDevices(devices)
		.then(function(deviceTypes) {
			// Due to this being called before a scan is performed, it should
			// return no devices.
			debugScanData('Finished initial cached scan', deviceTypes);
			printScanResultsData(deviceTypes);

			var endTime = new Date();
			debugScanTime('  - Duration'.cyan, (endTime - startTime)/1000);

			// Cerify that no devices were found.
			assert.deepEqual(deviceTypes, [], 'Initial Cached Device Types should be an empty array');

			done();
		}, function(err) {
			console.log('Scanning Error');
			assert.isOk(false, 'Scan should have worked properly');
			done();
		});
	});
	/*
	 * This test determines what devices are currently available for other tests to compare results with.
	 */
	it('perform initial scan', function (done) {
		var currentDeviceList = [];
		var startTime = new Date();
		console.log('  - Performing Initial scan...');
		deviceScanner.findAllDevices(devices)
		.then(function(deviceTypes) {
			expectedDeviceTypes = deviceTypes;
			debugScanData('Finished initial scan, scan data', deviceTypes);
			printScanResultsData(deviceTypes);

			verifyScanResults(deviceTypes, {debug: false});
			var endTime = new Date();
			// var testStatus = testScanResults(deviceTypes, expDeviceTypes, {'test': false, 'debug': false});
			// assert.isOk(testStatus, 'Unexpected test result');

			// var testStatus = testRequiredDevices(deviceTypes, reqDeviceTypes, test);
			// assert.isOk(testStatus, 'Unexpected test result');

			console.log('  - Duration'.cyan, (endTime - startTime)/1000);
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

		var device = new device_curator.device();
		devices.push(device);
		console.log('  - Opening Device...');
		console.log('**** Please connect a T7 via USB ****');
		device.open('LJM_dtT7', 'LJM_ctUSB', 'LJM_idANY')
		.then(function() {
			console.log('Opened Device', device.savedAttributes.serialNumber);
			done();
		}, function() {
			console.log('**** Please connect a T7 via USB ****');
			devices[0].destroy();
			devices = [];
			assert.isOk(false, 'Please connect a T7 via USB');
			done();
		});
	});
	it('perform cached scan', function (done) {
		if(!devices[0]) {
			done();
			return;
		}

		var device = devices[0];
		var startTime = new Date();
		console.log('  - Performing secondary cached scan...');
		deviceScanner.getLastFoundDevices(devices)
		.then(function(deviceTypes) {
			console.log('In cached scan');
			// Due to this being called before a scan is performed, it should
			// return no devices.
			debugScanData('Finished initial cached scan', deviceTypes);
			printScanResultsData(deviceTypes);

			var endTime = new Date();
			debugScanTime('  - Duration'.cyan, (endTime - startTime)/1000);

			function checkConnectionType(foundDevCT) {
				// console.log('FoundDevCT', foundDevCT);
				var ctn = device.savedAttributes.connectionTypeName;
				var fCTN = foundDevCT.connectionTypeName;


				if(ctn === fCTN){
					foundDeviceConnectionType = true;
					if(foundDevCT.insertionMethod === 'connected') {
						correctlyReportedDeviceAsOpen = true;
					}
				}
			}
			function checkFoundDevice(foundDevice) {
				// console.log('in checkFoundDevice', foundDevice.serialNumber, device.savedAttributes.serialNumber);
				if(foundDevice.serialNumber == device.savedAttributes.serialNumber) {
					// We found the correct device.
					foundOpenDevice = true;
					foundDevice.connectionTypes.forEach(checkConnectionType);
				}
			}
			function checkForDeviceType(deviceType) {
				// console.log('in checkForDeviceType');
				var dtn = device.savedAttributes.deviceTypeName;
				// console.log('dtn', dtn, 'd.dtn', deviceType.deviceTypeName);
				if(deviceType.deviceTypeName === dtn) {
					// We found the device type
					appropriateDeviceTypeFound = true;
					deviceType.devices.forEach(checkFoundDevice);
				}
			}

			// Verify that we found the currently open device.
			var appropriateDeviceTypeFound = false;
			var foundOpenDevice = false;
			var foundDeviceConnectionType = false;
			var correctlyReportedDeviceAsOpen = false;

			deviceTypes.forEach(checkForDeviceType);

			assert.isOk(appropriateDeviceTypeFound, 'appropriateDeviceTypeFound was not true.'),
			assert.isOk(foundOpenDevice, 'foundOpenDevice was not true.'),
			assert.isOk(foundDeviceConnectionType, 'foundDeviceConnectionType was not true.'),
			assert.isOk(correctlyReportedDeviceAsOpen, 'correctlyReportedDeviceAsOpen was not true.'),
			done();
		}, function(err) {
			console.log('Scanning Error');
			assert.isOk(false, 'Scan should have worked properly');
			done();
		});
	});

	// it('perform secondary cached read', function (done) {
	// 	var startTime = new Date();
	// 	deviceScanner.getLastFoundDevices(devices)
	// 	.then(function(deviceTypes) {
	// 		console.log('Finished cached scan', deviceTypes);
	// 		printScanResultsData(deviceTypes);

	// 		var endTime = new Date();
	// 		console.log('  - Duration'.cyan, (endTime - startTime)/1000);

	// 		done();
	// 	}, function(err) {
	// 		console.log('Scanning Error');
	// 		assert.isOk(false, 'Scan should have worked properly');
	// 		done();
	// 	});
	// });
	it('perform secondary scan', function (done) {
		// var currentDeviceList = [];
		// var startTime = new Date();
		// deviceScanner.findAllDevices(devices)
		// .then(function(deviceTypes) {
		// 	console.log('finished scanning, scan data', deviceTypes);
		// 	printScanResultsData(deviceTypes);
		// 	console.log('Finished printing scan results');
		// 	verifyScanResults(deviceTypes, {debug: false});
		// 	var endTime = new Date();
		// 	// var testStatus = testScanResults(deviceTypes, expDeviceTypes, {'test': false, 'debug': false});
		// 	// assert.isOk(testStatus, 'Unexpected test result');
		// 	console.log('  - Duration'.cyan, (endTime - startTime)/1000);
		// 	done();
		// }, function(err) {
		// 	console.log('Scanning Error');
		// 	assert.isOk(false, 'Scan should have worked properly');
		// 	done();
		// });
		if(!devices[0]) {
			done();
			return;
		}

		var device = devices[0];
		var startTime = new Date();
		console.log('  - Performing secondary scan...');
		deviceScanner.findAllDevices(devices)
		.then(function(deviceTypes) {
			console.log('In secondary scan');
			// Due to this being called before a scan is performed, it should
			// return no devices.
			debugScanData('Finished initial cached scan', deviceTypes);
			printScanResultsData(deviceTypes);

			var endTime = new Date();
			debugScanTime('  - Duration'.cyan, (endTime - startTime)/1000);


			function checkConnectionType(foundDevCT) {
				// console.log('FoundDevCT', foundDevCT);
				var ctn = device.savedAttributes.connectionTypeName;
				var fCTN = foundDevCT.connectionTypeName;


				if(ctn === fCTN){
					foundDeviceConnectionType = true;
					if(foundDevCT.insertionMethod === 'connected') {
						correctlyReportedDeviceAsOpen = true;
					}
				}
			}
			function checkFoundDevice(foundDevice) {
				// console.log('in checkFoundDevice', foundDevice.serialNumber, device.savedAttributes.serialNumber);
				if(foundDevice.serialNumber == device.savedAttributes.serialNumber) {
					// We found the correct device.
					foundOpenDevice = true;
					foundDevice.connectionTypes.forEach(checkConnectionType);
				}
			}
			function checkForDeviceType(deviceType) {
				// console.log('in checkForDeviceType');
				var dtn = device.savedAttributes.deviceTypeName;
				// console.log('dtn', dtn, 'd.dtn', deviceType.deviceTypeName);
				if(deviceType.deviceTypeName === dtn) {
					// We found the device type
					appropriateDeviceTypeFound = true;
					deviceType.devices.forEach(checkFoundDevice);
				}
			}

			// Verify that we found the currently open device.
			var appropriateDeviceTypeFound = false;
			var foundOpenDevice = false;
			var foundDeviceConnectionType = false;
			var correctlyReportedDeviceAsOpen = false;


			deviceTypes.forEach(checkForDeviceType);

			assert.isOk(appropriateDeviceTypeFound, 'appropriateDeviceTypeFound was not true.'),
			assert.isOk(foundOpenDevice, 'foundOpenDevice was not true.'),
			assert.isOk(foundDeviceConnectionType, 'foundDeviceConnectionType was not true.'),
			assert.isOk(correctlyReportedDeviceAsOpen, 'correctlyReportedDeviceAsOpen was not true.'),
			done();
		}, function(err) {
			console.log('Scanning Error');
			assert.isOk(false, 'Scan should have worked properly');
			done();
		});
	});
	// it('read device SERIAL_NUMBER', function (done) {
	// 	if(devices[0]) {
	// 		devices[0].iRead('SERIAL_NUMBER')
	// 		.then(function(res) {
	// 			console.log('  - SN Res:'.green, res.val);
	// 			done();
	// 		}, function(err) {
	// 			console.log('Failed to read SN:', err, devices[0].savedAttributes);
	// 			assert.isOk(false, 'Failed to read SN: ' + JSON.stringify(err));
	// 			done();
	// 		});
	// 	} else {
	// 		done();
	// 	}
	// });
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
