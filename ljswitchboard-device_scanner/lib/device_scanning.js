
var EventEmitter = require('events').EventEmitter;
var util = require('util');
var q = require('q');
var async = require('async');
var ljm = require('labjack-nodejs');
var driver_const = ljm.driver_const;
var driver = ljm.driver();

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
    }
];


var deviceScanner = function() {

	this.scanResults = [];
	this.currentDeviceList = null;

	var isNewDevice = function(newScanResult) {
		var isNew = true;
		self.scanResults.forEach(function(scanResult) {
			if(scanResult.serialNumber == newScanResult.serialNumber) {
				isNew = false;
			}
		});
		return isNew;
	};

	var saveResult = function(newScanResult) {
		// console.log('Saving Result', newScanResult.serialNumber);
		if(isNewDevice(newScanResult)) {
			console.log('New Device Found');
			var deviceInfo = {
				'serialNumber': newScanResult.serialNumber,
			};
			console.log('data', newScanResult);
			newScanResult.data.forEach(function(res) {
				deviceInfo[res.name] = res.val;
			});

			self.scanResults.push(deviceInfo);
		} else {
			
		}
	};
	var saveResults = function(scanRequest, newScanResults) {
		console.log('Number of devices found:', newScanResults.length, scanRequest.connectionType);
		newScanResults.forEach(saveResult);
	};

	var printDuration = function(startTime, msg) {
		var stopTime = new Date();
		console.log(msg, stopTime - startTime);
	};

	var listAllExtended = function(scanRequest) {
		var defered = q.defer();
		var deviceType = scanRequest.deviceType;
		var connectionType = scanRequest.connectionType;
		var addresses = scanRequest.addresses;
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
					saveResults(scanRequest, res);
					defered.resolve(res);
				});
		});
		return defered.promise;
	};

	var listAll = function(scanRequest) {
		var defered = q.defer();
		var deviceType = scanRequest.deviceType;
		var connectionType = scanRequest.connectionType;
		setImmediate(function() {
			driver.listAll(
				deviceType,
				connectionType,
				function(err) {
					defered.reject(err);
				}, function(res) {
					defered.resolve(res);
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
		promises.push(listAllExtended(scanRequest));

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
			var promises = [];

			SCAN_REQUEST_LIST.forEach(function(scanRequest) {
				promises.push(scanForDevices(scanRequest));
			});

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
		return defered.promise;
	};
	this.findAllDevices = function(currentDeviceList) {
		var defered = q.defer();

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
		.then(returnResults, getOnError('getFindAllDevices'))
		.then(defered.resolve, defered.reject);
		return defered.promise;
	};

	var self = this;
};
util.inherits(deviceScanner, EventEmitter);

exports.deviceScanner = deviceScanner;