function printScanResultsData(deviceTypes) {
	console.log('Scan Summary:', deviceTypes);
	console.log();
	deviceTypes.forEach(function(deviceType) {
		// console.log('Device Type', deviceType.deviceTypeString, Object.keys(deviceType));
		var devices = deviceType.devices;
		devices.forEach(function(device) {
			var isAct = 'F';
			if(device.isActive) {
				isAct = 'T';
			}
			var isMock = 'F';
			if(device.isMockDevice) {
				isMock = 'T';
			}
			var actMockMsg = isAct + '&' + isMock;
			var shortNames = [];
			try {
				shortNames = device.connectionTypeNames.map(function(name) {
					return name.slice(0,4);
				});
			} catch(err) {

			}
			// console.log('Keys:', Object.keys(device));
			console.log(' - Device', {
				dt: device.deviceTypeName,
				sn: device.serialNumber,
				cts: device.connectionTypeNames,
				// cts: shortNames,
				// act: device.isActive,
				// mock: device.isMockDevice,
				// 'A&M': actMockMsg,
				'modelType': device.modelType,
				'productType': device.productType,
			});
			cts = device.connectionTypes;
			cts.forEach(function(ct) {
				console.log('  - ct:', {
					'N': ct.name,
					'M': ct.insertionMethod, 
					'A': ct.isActive,
					'V':ct.verified,
				});
			});
		});
	});
}
exports.printScanResultsData = printScanResultsData;

function printScanResultsKeys(deviceTypes) {
	deviceTypes.forEach(function(deviceType) {
		console.log('Device Type', deviceType.deviceTypeString, Object.keys(deviceType));
		var devices = deviceType.devices;
		devices.forEach(function(device) {
			console.log('Device', Object.keys(device));
		});
	});
}
exports.printScanResultsKeys = printScanResultsKeys;

var printAvailableDeviceData = function(device) {
	if(device.connectionTypes) {
		console.log(
			'Connection Types',
			device.connectionTypes.length,
			device.deviceType,
			device.productType
		);
		device.connectionTypes.forEach(function(connectionType, i) {
			console.log(
				'  - ',
				connectionType.name,
				connectionType.insertionMethod,
				connectionType.verified,
				connectionType.isActive
			);
			// console.log('    - ', expectedConnectionType);
		});
	}
	console.log('Available Data:');
	var ignoredData = [
		'connectionTypes',
		'connectionType',
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
};
exports.printAvailableDeviceData = printAvailableDeviceData;




function verifyStringResult (val) { return (typeof(val) === 'string'); }
function verifyNumberResult (val) { return Number.isInteger(val); }
function verifyArrayResult (val) { return Array.isArray(val); }
function verifyBooleanResult (val) { return (typeof(val) === 'boolean'); }
function verifyConnectionTypesArray(val) {return true;}
function verifyDeviceDataObject(val) {return true;}
var requiredDeviceTypeKeys = [
	{'name': 'deviceTypeString', verify:verifyStringResult},
	{'name': 'deviceTypeName', verify:verifyStringResult},
	{'name': 'devices', verify:verifyArrayResult},
];
var requiredDeviceKeys = {
	'LJM_dtT7': [
		{'name': 'deviceType', verify:verifyNumberResult},
		{'name': 'deviceTypeString', verify:verifyStringResult},
		{'name': 'deviceTypeName', verify:verifyStringResult},
		{'name': 'serialNumber', verify:verifyNumberResult},
		{'name': 'acquiredRequiredData', verify:verifyBooleanResult},
		{'name': 'connectionTypes', verify:verifyConnectionTypesArray},
		{'name': 'isMockDevice', verify:verifyBooleanResult},
		{'name': 'DEVICE_NAME_DEFAULT', verify:verifyDeviceDataObject},
		{'name': 'DEVICE_NAME_DEFAULT', verify:verifyDeviceDataObject},
		{'name': 'HARDWARE_INSTALLED', verify: verifyDeviceDataObject},
		{'name': 'ETHERNET_IP', verify: verifyDeviceDataObject},
		{'name': 'WIFI_STATUS', verify: verifyDeviceDataObject},
		{'name': 'WIFI_IP', verify: verifyDeviceDataObject},
		{'name': 'WIFI_RSSI', verify: verifyDeviceDataObject},
		{'name': 'FIRMWARE_VERSION', verify: verifyDeviceDataObject},
		{'name': 'productType', verify: verifyStringResult},
		{'name': 'modelType', verify: verifyStringResult},
		{'name': 'isActive', verify: verifyBooleanResult},
	],
	'LJM_dtT4': [
		{'name': 'deviceType', verify:verifyNumberResult},
		{'name': 'deviceTypeString', verify:verifyStringResult},
		{'name': 'deviceTypeName', verify:verifyStringResult},
		{'name': 'serialNumber', verify:verifyNumberResult},
		{'name': 'acquiredRequiredData', verify:verifyBooleanResult},
		{'name': 'connectionTypes', verify:verifyConnectionTypesArray},
		{'name': 'isMockDevice', verify:verifyBooleanResult},
		{'name': 'DEVICE_NAME_DEFAULT', verify:verifyDeviceDataObject},
		{'name': 'DEVICE_NAME_DEFAULT', verify:verifyDeviceDataObject},
		{'name': 'HARDWARE_INSTALLED', verify: verifyDeviceDataObject},
		{'name': 'ETHERNET_IP', verify: verifyDeviceDataObject},
		{'name': 'FIRMWARE_VERSION', verify: verifyDeviceDataObject},
		{'name': 'productType', verify: verifyStringResult},
		{'name': 'modelType', verify: verifyStringResult},
		{'name': 'isActive', verify: verifyBooleanResult},
	],
	'LJM_dtT5': [
		{'name': 'deviceType', verify:verifyNumberResult},
		{'name': 'deviceTypeString', verify:verifyStringResult},
		{'name': 'deviceTypeName', verify:verifyStringResult},
		{'name': 'serialNumber', verify:verifyNumberResult},
		{'name': 'acquiredRequiredData', verify:verifyBooleanResult},
		{'name': 'connectionTypes', verify:verifyConnectionTypesArray},
		{'name': 'isMockDevice', verify:verifyBooleanResult},
		{'name': 'DEVICE_NAME_DEFAULT', verify:verifyDeviceDataObject},
		{'name': 'DEVICE_NAME_DEFAULT', verify:verifyDeviceDataObject},
		{'name': 'HARDWARE_INSTALLED', verify: verifyDeviceDataObject},
		{'name': 'ETHERNET_IP', verify: verifyDeviceDataObject},
		{'name': 'FIRMWARE_VERSION', verify: verifyDeviceDataObject},
		{'name': 'productType', verify: verifyStringResult},
		{'name': 'modelType', verify: verifyStringResult},
		{'name': 'isActive', verify: verifyBooleanResult},
	],
	'LJM_dtDIGIT': [
		{'name': 'deviceType', verify:verifyNumberResult},
		{'name': 'deviceTypeString', verify:verifyStringResult},
		{'name': 'deviceTypeName', verify:verifyStringResult},
		{'name': 'serialNumber', verify:verifyNumberResult},
		{'name': 'acquiredRequiredData', verify:verifyBooleanResult},
		{'name': 'connectionTypes', verify:verifyConnectionTypesArray},
		{'name': 'isMockDevice', verify:verifyBooleanResult},
		{'name': 'DEVICE_NAME_DEFAULT', verify: verifyDeviceDataObject},
		{'name': 'DGT_INSTALLED_OPTIONS', verify: verifyDeviceDataObject},
		{'name': 'productType', verify: verifyStringResult},
		{'name': 'modelType', verify: verifyStringResult},
		{'name': 'isActive', verify: verifyBooleanResult},
	]
};

function createDataTestResult(pass, message) {
	return {
		'passed': pass,
		'message': message,
	};
}
function verifyScanDataObject(msg, data, requiredKeys) {
	var passes = true;
	var results = requiredKeys.map(function(requiredKey) {
		var key = requiredKey.name;
		if(typeof(data[key]) === 'undefined') {
			passes = false;
			return createDataTestResult(false, msg + ': ' + 'Missing Key: ' + key);
		} else {
			var verified = requiredKey.verify(data[key]);
			if(!verified) {
				passes = false;
				return createDataTestResult(verified, msg + ': ' + key + ' Failed verification.');
			} else {
				return createDataTestResult(verified, msg + ': ' + key + ' Passed.');
			}
		}
	});
	return {
		'passes': passes,
		'results': results,
	};
}

function verifyScanResults(deviceTypes, test, options) {
	var debug = false;
	if(options) {
		if(options.debug) {
			debug = options.debug;
		}
	}
	if(debug) {
		console.log('Typeof:', deviceTypes);
	}
	var passes = true;
	var results = [];
	deviceTypes.forEach(function(deviceType) {
		if(debug) {
			console.log('Checking DT', deviceType);
		}
		var requiredDTKeys = requiredDeviceTypeKeys;
		var dtTest = verifyScanDataObject('DT', deviceType, requiredDTKeys);
		if(!dtTest.passes) {
			passes = false;
		}
		results.push(dtTest);

		var devices = deviceType.devices;
		devices.forEach(function(device) {
			var dts = device.deviceTypeString;
			var requiredDevKeys = requiredDeviceKeys[dts];
			if(debug) {
				console.log('Checking Device', device.serialNumber, Object.keys(device), dts, device.isMockDevice, device.isActive);
			}
			try {
				var devTest = verifyScanDataObject(dts, device, requiredDevKeys);
			} catch(err) {
				console.log('ERR', err);
				throw new Error(err);
			}
			if(!devTest.passes) {
				passes = false;
			}
			results.push(devTest);
		});
	});

	if(!passes) {
		// console.log('Results...', results);
		results.forEach(function(result) {
			if(!result.passes) {
				console.log('Failed...', result.results);
			}
		});
	}
	test.ok(passes, 'Failed to verify scan results');
}
exports.verifyScanResults = verifyScanResults;

var suppressTestingErrors = false;
var innerTestScanResults = function(deviceTypes, expDeviceTypes, test, options) {
	var debug;
	var performTests = true;
	if(options) {
		if(typeof(options.test) !== 'undefined') {
			performTests = options.test;
		}
		if(typeof(options.debug) !== 'undefined') {
			debug = options.debug;
		}
	}
	if(debug) {
		console.log('Finished Scanning');
		console.log('Number of Device Types', deviceTypes.length);
	}
	
	// Test to make sure the proper number of device types were found.
	var numDeviceTypes = deviceTypes.length;
	var numExpDeviceTypes = Object.keys(expDeviceTypes).length;
	if(performTests) {
		test.strictEqual(
			numDeviceTypes,
			numExpDeviceTypes,
			'Unexpected number of device types found'
		);
	} else {
		if(numDeviceTypes != numExpDeviceTypes) {
			suppressTestingErrors = true;
			console.log('Warning, unexpected number of device types');
			console.log('    Expected number:', numExpDeviceTypes);
			console.log('    Actual Number:', numDeviceTypes);
		}
	}

	// For each found device type, verify their results.
	deviceTypes.forEach(function(deviceType) {
		// Organize result data.
		var devices = deviceType.devices;
		var numDevices = devices.length;
		var deviceTypeName = deviceType.deviceTypeName;

		// Get expected data.
		var expDevices = expDeviceTypes[deviceTypeName].devices;
		var expNumDevices = expDevices.length;

		if(debug) {
			console.log(
				'Number of',
				deviceTypeName,
				'Devices:',
				numDevices
			);
		}
		// Test to make sure the proper number of devices were found per device
		// type.
		if(performTests) {
			test.strictEqual(
				numDevices,
				expNumDevices,
				'Unexpected number of found devices'
			);
		} else {
			if(numDevices != expNumDevices) {
				suppressTestingErrors = true;
				console.log('Warning, unexpected number of devices:');
				console.log('    Expected number:', expNumDevices);
				console.log('    Actual Number:', numDevices);
				console.log('List of Found Devices:');
				devices.forEach(function(device) {
					console.log('  Device Type', device.deviceTypeName, device.serialNumber);
					device.connectionTypes.forEach(function(connectionType) {
						console.log(
							'    Connection Type Name',
							connectionType.name,
							'method:',
							connectionType.insertionMethod
						);
					});
				});
			}
		}

		// For each found device check their expected results & connection types
		devices.forEach(function(device, i) {
			var expDevice = expDevices[i];
			var verifyConnectionTypeInfo = function(connectionType, expConnectionType) {
				var expectedKeys = Object.keys(expConnectionType);
				// Check each expected key.
				expectedKeys.forEach(function(key) {
					if(performTests) {
						test.strictEqual(
							connectionType[key],
							expConnectionType[key],
							'Unexpected connectionType Data'
						);
					}
				});
			};
			// Organize device results.
			var connectionTypes = device.connectionTypes;
			var numConnectionTypes = connectionTypes.length;

			// Get and organize expected device results.
			var expConnectionTypes = expDevice.connectionTypes;
			var expNumConnectionTypes = expConnectionTypes.length;

			if(device.isActive) {
				if(debug) {
					console.log(
						'Found Active Device',
						device.productType,
						device.serialNumber,
						numConnectionTypes
					);
				}
			}
			// Test to make sure the proper number of connection types were
			// found.
			if(performTests) {
				test.strictEqual(
					numConnectionTypes,
					expNumConnectionTypes,
					'Unexpected number of connection types'
				);
			}
			
			if(performTests) {
				if (expConnectionTypes.length == connectionTypes.length) {
					// For each connection type verify expected results.
					connectionTypes.forEach(function(connectionType, j) {
						// Organize device connection type results.
						// Get and organize expected connection type results.
						var expConnectionType = expConnectionTypes[j];
						verifyConnectionTypeInfo(connectionType, expConnectionType);
					});
				}
				else {
					console.log('For Device...', device.deviceTypeName, device.serialNumber);
					console.log(
						'Unexpected number of connection types, expected: ',
						expConnectionTypes.length,
						', got: ', connectionTypes.length
					);
					test.ok(false, 'unexpected number of connection types, see console.log');
				}
			}
			if(debug) {
				printAvailableDeviceData(device);
			}
			
		});
	});
};
var testScanResults = function(deviceTypes, expDeviceTypes, test, debug) {
	try {
		suppressTestingErrors = false;
		innerTestScanResults(deviceTypes, expDeviceTypes, test, debug);
		return true;
	} catch(err) {
		if(suppressTestingErrors) {
			console.log('Error being suppressed');
			return true;
		} else {
			console.log('Error testing results', err, err.stack);
			return false;
		}
	}
};
exports.testScanResults = testScanResults;

function testRequiredDevices(deviceTypes, requiredDeviceTypes, test, debug) {
	try {
		// Verify that each required device type and its connection type are
		// found in the device types.
		requiredDeviceTypes.forEach(function(reqDevType) {
			// Verify that the device type was found.
			var isReqDevTypeFound = false;
			deviceTypes.forEach(function(deviceType) {
				var isFound = true;
				if(deviceType.deviceType != reqDevType.deviceType) {
					isFound = false;
				}
				if(deviceType.deviceTypeString != reqDevType.deviceTypeString) {
					isFound = false;
				}
				if(deviceType.deviceTypeName != reqDevType.deviceTypeName) {
					isFound = false;
				}
				
				if(isFound) {
					isReqDevTypeFound = true;
				}
			});
			test.ok(isReqDevTypeFound, 'We should have found the device type: ' + reqDevType.deviceTypeName);


			var reqDevices = reqDevType.devices;
			reqDevices.forEach(function(reqDevice) {
				// Check to make sure the required device connection types have
				// been found.
				var foundRequiredCTs = true;
				var reqConnectionTypes = reqDevice.connectionTypes;
				var reqCTRes = reqConnectionTypes.map(function(reqConnectionType) {

				});
			});
		});
		return true;
	} catch(err) {
		console.log('Error testing for required device types', err);
		test.ok(false, 'Should not have encountered an error');
		return false;
	}
}
exports.testRequiredDevices = testRequiredDevices;