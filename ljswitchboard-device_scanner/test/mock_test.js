
var device_scanner = require('../lib/ljswitchboard-device_scanner').getDeviceScanner();

var deviceScanner;
exports.tests = {
	'create device scanner': function(test) {
		deviceScanner = new device_scanner.deviceScanner();
		test.done();
	},
	'disable device scanning': function(test) {
		deviceScanner.disableDeviceScanning()
		.then(function() {
			test.done();
		});
	},
	'Add mock devices': function(test) {
		deviceScanner.addMockDevices([
			{
				'deviceType': 'LJM_dtT7',
				'connectionType': 'LJM_ctUSB',
				'serialNumber': 1,
			},
			{
				'deviceType': 'LJM_dtT7',
				'connectionType': 'LJM_ctETHERNET',
				'serialNumber': 1,
			},
			{
				'deviceType': 'LJM_dtDIGIT',
				'connectionType': 'LJM_ctUSB'
			}
		])
		.then(function() {
			test.done();
		});
	},
	'mock test': function(test) {
		var currentDeviceList = {};
		var startTime = new Date();
		
		var expectedData = {
			'T7': {
				'devices': [
					{
						'connectionTypes': [{
							'name': 'USB',
							'insertionMethod': 'scan',
						},{
							'name': 'Ethernet',
							'insertionMethod': 'scan',
						},{
							'name': 'Wifi'
						}]
					},
				]
			},
			'Digit': {
				'devices': [
					{
						'connectionTypes': [{
							'name': 'USB',
							'insertionMethod': 'scan',
						}]
					},
				]
			},
		};
		deviceScanner.findAllDevices(currentDeviceList)
		.then(function(res) {
			var endTime = new Date();
			console.log('Finished Scanning');
			console.log('Number of Device Types', res.length);
			test.strictEqual(res.length, 2, 'Should have found some T7s and Digits');
			res.forEach(function(deviceType) {
				var numDevicesFound = deviceType.devices.length;
				var deviceTypeName = deviceType.deviceTypeName;
				var expectedDevicesData = expectedData[deviceTypeName].devices;
				console.log('Number of', deviceTypeName, 'Devices:', numDevicesFound);
				expectedNumDevices = expectedData[deviceTypeName].devices.length;
				test.strictEqual(numDevicesFound, expectedNumDevices, 'Unexpected number of found devices');
				deviceType.devices.forEach(function(device, i) {
					var expectedDeviceData = expectedDevicesData[i];
					var numConnectionTypes = device.connectionTypes.length;
					var expectedNumCTs = expectedDeviceData.connectionTypes.length;
					test.strictEqual(numConnectionTypes, expectedNumCTs, 'Unexpected number of connection types');
					console.log(
						'Connection Types',
						device.connectionTypes.length,
						device.deviceType,
						device.productType
					);

					device.connectionTypes.forEach(function(connectionType, i) {
						var expectedConnectionType = expectedDeviceData.connectionTypes[i];
						var expectedKeys = Object.keys(expectedConnectionType);

						console.log('  - ', connectionType.name, connectionType.insertionMethod, connectionType.verified);
						// console.log('    - ', expectedConnectionType);
						expectedKeys.forEach(function(key) {
							test.strictEqual(
								connectionType[key],
								expectedConnectionType[key],
								'Unexpected connectionType Data');
						})
					});
					console.log('Available Data:');
					var ignoredData = [
						'connectionTypes',
					];
					var availableKeys = Object.keys(device);
					availableKeys.forEach(function(key) {
						if(ignoredData.indexOf(key) < 0) {
							if(typeof(device[key].res) !== 'undefined') {
								console.log('  - ', key, '>>', device[key].val);
							} else {
								console.log('  - ', key, '>>', device[key]);
							}
						} else {
							console.log('  - ', key, '...');
						}
					});
				});
			});
			console.log('Duration', (endTime - startTime)/1000);
			test.done();
		}, function(err) {
			console.log('Scanning Error');
			test.done();
		});
	}
};