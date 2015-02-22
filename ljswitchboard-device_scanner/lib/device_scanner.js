
var EventEmitter = require('events').EventEmitter;
var util = require('util');
var q = require('q');
var async = require('async');
var ljm = require('labjack-nodejs');
var driver_const = require('ljswitchboard-ljm_driver_constants');
var driver = ljm.driver();
var data_parser = require('ljswitchboard-data_parser');
var device = require('ljswitchboard-ljm_device_curator');

var requiredInformation = {};

var DEVICE_FOUND_EVENT = 'DEVICE_FOUND';

var SCAN_REQUEST_LIST = [
	{
        'deviceType': 'LJM_dtDIGIT',
        'connectionType': 'LJM_ctUSB',
        'addresses': ['DEVICE_NAME_DEFAULT','DGT_INSTALLED_OPTIONS']
    },
    {
        'deviceType': 'LJM_dtT7',
        'connectionType': 'LJM_ctUSB',
        'addresses': [
            'DEVICE_NAME_DEFAULT',
            'HARDWARE_INSTALLED',
            'ETHERNET_IP',
            'WIFI_STATUS',
            'WIFI_IP',
            'WIFI_RSSI'
        ]
    },
    {
        'deviceType': 'LJM_dtT7',
        'connectionType': 'LJM_ctTCP',
        'addresses': [
            'DEVICE_NAME_DEFAULT',
            'HARDWARE_INSTALLED',
            'ETHERNET_IP',
            'WIFI_STATUS',
            'WIFI_IP',
            'WIFI_RSSI',
            'FIRMWARE_VERSION'
        ]
    },
    // {
    //     'deviceType': 'LJM_dtANY',
    //     'connectionType': 'LJM_ctANY',
    //     'addresses': [
    //         'DEVICE_NAME_DEFAULT',
    //         'HARDWARE_INSTALLED',
    //         'ETHERNET_IP',
    //         'WIFI_STATUS',
    //         'WIFI_IP',
    //         'WIFI_RSSI',
    //         'FIRMWARE_VERSION'
    //     ]
    // }
];

var scanStrategies = [
	{'type': 'listAllExtended', 'enabled': true},
	{'type': 'listAll', 'enabled': true},
];


var deviceScanner = function() {

	this.scanResults = [];
	this.currentDeviceList = null;
	this.scanInProgress = false;

	var isNewDevice = function(newScanResult) {
		var isNew = true;
		self.scanResults.forEach(function(scanResult) {
			if(scanResult.serialNumber == newScanResult.serialNumber) {
				isNew = false;
			}
		});
		return isNew;
	};
	var getInitialConnectionTypeData = function(ct, method) {
		var insertionMethod = 'scan';
		var foundByAttribute = false;
		if(method) {
			if(method === 'attribute') {
				insertionMethod = 'attribute';
				foundByAttribute = true;
			}
		}
		return {
			'ct': ct,
			'connectionType': ct,
			'str': driver_const.DRIVER_CONNECTION_TYPE_NAMES[ct],
			'name': driver_const.CONNECTION_TYPE_NAMES[ct],
			'verified': false,
			'foundByAttribute': foundByAttribute,
			'insertionMethod': insertionMethod
		};
	};
	var saveResult = function(newScanResult) {
		var ct;
		var virtualCT;
		if(isNewDevice(newScanResult)) {
			ct = newScanResult.connectionType;
			var deviceInfo = {
				'serialNumber': newScanResult.serialNumber,
				'acquiredRequiredData': false,
				'connectionTypes': [getInitialConnectionTypeData(ct)],
			};
			deviceInfo.acquiredRequiredData = false;
			if(newScanResult.data) {
				deviceInfo.acquiredRequiredData = true;
				newScanResult.data.forEach(function(res) {
					deviceInfo[res.name] = data_parser.parseResult(
						res.name,
						res.val
					);
				});

				// Add extra connection types based off attributes.
				if(newScanResult.data.ETHERNET_IP) {
					if(newScanResult.data.ETHERNET_IP.str) {
						virtualCT = driver_const.connectionTypes('Ethernet');
						deviceInfo.connectionTypes.push(
							getInitialConnectionTypeData(virtualCT, 'attribute')
						);
					}
				}
				if(newScanResult.data.WIFI_IP) {
					if(newScanResult.data.WIFI_IP.str) {
						virtualCT = driver_const.connectionTypes('Ethernet');
						deviceInfo.connectionTypes.push(
							getInitialConnectionTypeData(virtualCT, 'attribute')
						);
					}
				}
			}
			

			self.scanResults.push(deviceInfo);
		} else {
			// If the device already exists then add information to the
			// object.
			var i;
			for(i = 0; i < self.scanResults.length; i++) {
				var sr = self.scanResults[i];
				if(sr.serialNumber == newScanResult.serialNumber) {
					var j;
					// Determine if the new scanResult's connection type
					// has already been added, if not, add it.
					ct = newScanResult.connectionType;
					var addCT = true;
					for(j = 0; j < sr.connectionTypes.length; j++) {
						if(ct == sr.connectionTypes[j].ct) {
							addCT = false;
						}
					}
					if(addCT) {
						sr.connectionTypes.push(
							getInitialConnectionTypeData(ct)
						);
					}
					// If data has already been saved for this device, don't
					// save it.
					if(!sr.acquiredRequiredData) {
						if(newScanResult.data) {
							sr.acquiredRequiredData = true;
							for(j = 0; j < newScanResult.data.length; j++) {
								var res = newScanResult.data[j];
								sr[res.name] = data_parser.parseResult(
									res.name,
									res.val
								);
							}

							// Add extra connection types based off attributes.
							if(newScanResult.data.ETHERNET_IP) {
								if(newScanResult.data.ETHERNET_IP.str) {
									virtualCT = driver_const.connectionTypes('Ethernet');
									sr.connectionTypes.push(
										getInitialConnectionTypeData(virtualCT, 'attribute')
									);
								}
							}
							if(newScanResult.data.WIFI_IP) {
								if(newScanResult.data.WIFI_IP.str) {
									virtualCT = driver_const.connectionTypes('Ethernet');
									sr.connectionTypes.push(
										getInitialConnectionTypeData(virtualCT, 'attribute')
									);
								}
							}
						}
					}
				}
			}
		}
	};
	var saveResults = function(scanRequest, newScanResults) {
		// printDuration(scanRequest);
		// console.log(
		// 'Number of devices found:',
		// newScanResults.length,
		// scanRequest.connectionType,
		// scanRequest.scanNum
		// );
		newScanResults.forEach(saveResult);
	};
	var initializeData = function(scanRequest, scanResult) {
		var data = {
			'device': new device.device(),
			'scanRequest': scanRequest,
			'scanResult': scanResult
		};
	};
	var openScannedDevice = function(data) {
		
	};

	var getAcquireInformationFromDevice = function(scanRequest) {
		var acquireInformationFromDevice = function(scanResult) {
			var defered = q.defer();
			var data = initializeData(scanRequest, scanResult);
			defered.resolve(data);
			return defered.promise;
		};
		return acquireInformationFromDevice;
	};
	var getRemainingDeviceInfo = function(scanRequest, newScanResults) {
		var defered = q.defer();
		printDuration(scanRequest);
		console.log('Devices found by listAll', newScanResults.length);
		var promises = newScanResults.map(
			getAcquireInformationFromDevice(scanRequest)
		);

		q.allSettled(promises)
		.then(function(res) {
			defered.resolve(newScanResults);
		}, function(err) {
			defered.reject(newScanResults);
		});
		return defered.promise;
	};

	var printDuration = function(scanRequest) {
		var stopTime = new Date();
		console.log(
			scanRequest.scanType,
			scanRequest.connectionType,
			// scanRequest.startTime, // All times are equal for each request.
			// aka they are being made in parallel and LJM is blocking the
			// requests.
			scanRequest.stopTime - scanRequest.startTime
		);
	};

	var finalizeScanResult = function(scanResult) {
		var defered = q.defer();
		console.log('Num Connection Types', scanResult.connectionTypes.length);
		defered.resolve();
		return defered.promise;
	};
	var finalizeScanResults = function(scanRequest) {
		var defered = q.defer();
		var numDevices = self.scanResults.length;
		console.log('Finishing Collecting info for x devices', numDevices);
		var promises = self.scanResults.map(finalizeScanResult);

		q.allSettled(promises)
		.then(function(res) {
			defered.resolve(scanRequest);
		}, function(err) {
			defered.reject(scanRequest);
		});
		return defered.promise;
	};

	var listAllExtended = function(scanRequest) {
		var defered = q.defer();
		var deviceType = scanRequest.deviceType;
		var connectionType = scanRequest.connectionType;
		var addresses = scanRequest.addresses;
		scanRequest.startTime = new Date();
		setImmediate(function() {
			// var scanStartTime = new Date();
			console.log('Starting Scan', [deviceType, connectionType]);
			driver.listAllExtended(
				deviceType,
				connectionType,
				addresses,
				function(err) {
					// printDuration(scanStartTime, [deviceType, connectionType]);
					console.log('listAllExtended err', err);
					defered.reject(err);
				}, function(res) {
					// printDuration(scanStartTime, [deviceType, connectionType]);
					// console.log('listAllExtended success', [deviceType, connectionType]);
					scanRequest.stopTime = new Date();
					saveResults(scanRequest, res);
					scanRequest.scanNum += 1;
					finalizeScanResults()
					.then(defered.resolve, defered.reject);
				});
		});
		return defered.promise;
	};

	var listAll = function(scanRequest) {
		var defered = q.defer();
		var deviceType = scanRequest.deviceType;
		var connectionType = scanRequest.connectionType;
		scanRequest.startTime = new Date();
		setImmediate(function() {
			driver.listAll(
				deviceType,
				connectionType,
				function(err) {
					defered.reject(err);
				}, function(res) {
					scanRequest.stopTime = new Date();
					saveResults(scanRequest, res);
					scanRequest.scanNum += 1;
					finalizeScanResults()
					.then(defered.resolve, defered.reject);
				});
		});
		return defered.promise;
	};

	var customWiFiScan = function(scanRequest) {
		var defered = q.defer();
		var deviceType = scanRequest.deviceType;
		var connectionType = scanRequest.connectionType;
		var addresses = scanRequest.addresses;

		var results = [];
		setImmediate(function() {
			defered.resolve(results);
		});
		return defered.promise;
	};
	var customEthernetScan = function(scanRequest) {
		var defered = q.defer();
		var deviceType = scanRequest.deviceType;
		var connectionType = scanRequest.connectionType;
		var addresses = scanRequest.addresses;

		var results = [];
		setImmediate(function() {
			defered.resolve(results);
		});
		return defered.promise;
	};
	var customUSBScan = function(scanRequest) {
		var defered = q.defer();
		var deviceType = scanRequest.deviceType;
		var connectionType = scanRequest.connectionType;
		var addresses = scanRequest.addresses;

		var results = [];
		setImmediate(function() {
			defered.resolve(results);
		});
		return defered.promise;
	};

	var scanForDevices = function(scanRequest) {
		var defered = q.defer();
		var promises = [];
		scanRequest.scanNum = 0;
		scanRequest.scanTypes = [];
		scanStrategies.forEach(function(scanStrategy) {
			if(scanStrategy.enabled) {
				if(scanStrategy.type === 'listAllExtended') {
					scanRequest.scanTypes.push('listAllExtended');
					promises.push(listAllExtended(scanRequest));
				} else if(scanStrategy.type === 'listAll') {
					scanRequest.scanTypes.push('listAll');
					promises.push(listAll(scanRequest));
				}
			}
		});

		q.allSettled(promises)
		.then(function(results) {
			// console.log("singleScan success", self.scanResults);
			defered.resolve();
		}, function(err) {
			console.log("singleScan error", err);
			defered.reject();
		});
		return defered.promise;
	};
	var getFindAllDevices = function(currentDeviceList) {
		var findAllDevices = function() {
			var defered = q.defer();
			var promises = SCAN_REQUEST_LIST.map(scanForDevices);

			q.allSettled(promises)
			.then(function(res) {
				defered.resolve(self.scanResults);
			}, function(err) {
				// console.log("scan error", err);
				defered.reject(self.scanResults);
			});

			console.log('Finding Devices');
			
			return defered.promise;
		};
		return findAllDevices;
	};

	this.originalOldfwState = 0;
	var saveDriverOldfwState = function() {
		var defered = q.defer();
		driver.readLibrary(
			'LJM_OLD_FIRMWARE_CHECK',
			function(err) {
				defered.reject(err);
			}, function(res) {
				self.originalOldfwState = res;
				defered.resolve();
			});
		
		return defered.promise;
	};
	var disableDriverOldfwState = function() {
		var defered = q.defer();
		driver.writeLibrary(
			'LJM_OLD_FIRMWARE_CHECK',
			0,
			function(err) {
				defered.reject(err);
			}, function() {
				defered.resolve();
			});
		return defered.promise;
	};
	var restoreDriverOldfwState = function() {
		var defered = q.defer();
		driver.writeLibrary(
			'LJM_OLD_FIRMWARE_CHECK',
			self.originalOldfwState,
			function(err) {
				defered.reject(err);
			}, function() {
				defered.resolve();
			});
		return defered.promise;
	};
	var returnResults = function() {
		var defered = q.defer();
		defered.resolve(self.scanResults);
		self.scanInProgress = false;
		return defered.promise;
	};
	this.findAllDevices = function(currentDeviceList) {
		var defered = q.defer();
		if(!self.scanInProgress) {
			self.scanInProgress = true;
			self.scanResults = [];

			var getOnError = function(msg) {
				return function(err) {
					console.log('An Error', err, msg);
					var errDefered = q.defer();
					errDefered.reject(err);
					return errDefered.promise;
				};
			};
			saveDriverOldfwState()
			.then(disableDriverOldfwState, getOnError('saveDriverOldfwState'))
			.then(getFindAllDevices(currentDeviceList), getOnError('disableDriverOldfwState'))
			.then(restoreDriverOldfwState, getOnError('getFindAllDevices'))
			.then(returnResults, getOnError('restoreDriverOldfwState'))
			.then(defered.resolve, defered.reject);
		} else {
			defered.reject('Scan in progress');
		}
		return defered.promise;
	};

	var self = this;
};
util.inherits(deviceScanner, EventEmitter);

exports.deviceScanner = deviceScanner;