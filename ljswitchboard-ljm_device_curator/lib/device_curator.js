// Configure the number of max listeners on the process object to be infinity.
process.setMaxListeners(0);

var EventEmitter = require('events').EventEmitter;
var util = require('util');
var q = require('q');
var async = require('async');

var data_parser = require('ljswitchboard-data_parser');

// Requires & definitions involving the labjack-nodejs library
var ljm = require('labjack-nodejs');
var ljmDeviceReference = ljm.getDevice();
var modbusMap = ljm.modbusMap.getConstants();
var driver_const = require('ljswitchboard-ljm_driver_constants');
var ljm_ffi_req = require('ljm-ffi');
var ljm_ffi = ljm_ffi_req.load();

// Special T7 additional functions/operations
var lj_t7_flash_operations = require('./t7_flash_operations');
lj_t7_flash_operations.setDriverConst(ljm.driver_const);
var lj_t7_get_flash_fw_versions = require('./t7_get_flash_fw_versions');
var lj_t7_cal_operations = require('./t7_calibration_operations');

// Special TSeries additional functions/operations
var lj_tseries_upgrader = require('./labjack_tseries_upgrade');

// Special Digit additional functions/operations.
var digit_format_functions = require('./digit_format_functions');
var digit_io_helper = require('./digit_io_helper');

var register_watcher = require('./register_watcher');

/* Other helper functions */
var lua_script_operations = require('./lua_script_operations');
var device_value_checker = require('./device_value_checker');
var file_system_operations = require('./file_system_operations');
var manufacturing_info_operations = require('./manufacturing_info_operations');
var startup_config_operations = require('./startup_config_operations');
var dashboard_operations = require('./dashboard/dashboard_operations');
var external_application_operations = require('./external_app_operations');
var available_connections_operations = require('./available_connections_operations');

var device_events = driver_const.device_curator_constants;
exports.device_events = device_events;

var DEVICE_DISCONNECTED = device_events.DEVICE_DISCONNECTED;
var DEVICE_RECONNECTED = device_events.DEVICE_RECONNECTED;
var DEVICE_ERROR = device_events.DEVICE_ERROR;
var DEVICE_RECONNECTING = device_events.DEVICE_RECONNECTING;
var DEVICE_ATTRIBUTES_CHANGED = device_events.DEVICE_ATTRIBUTES_CHANGED;
var DEVICE_INITIALIZING = device_events.DEVICE_INITIALIZING;
var DASHBOARD_DATA_UPDATE = device_events.DASHBOARD_DATA_UPDATE;
var DEVICE_RELEASED = device_events.DEVICE_RELEASED; // Events thrown in the external_app_operations.js file
var DEVICE_ACQUIRED = device_events.DEVICE_ACQUIRED; // Events thrown in the external_app_operations.js file

// Break out various buffer constants to make them easier to use
// for buffer manipulation.
var ARCH_INT_NUM_BYTES = driver_const.ARCH_INT_NUM_BYTES;
var ARCH_DOUBLE_NUM_BYTES = driver_const.ARCH_DOUBLE_NUM_BYTES;
var ARCH_POINTER_SIZE = driver_const.ARCH_POINTER_SIZE;

var ljmMockDevice;
var use_mock_device = true;

var numCreatedDevices = 0;

function device(useMockDevice) {
	this.curatedDeviceInt = numCreatedDevices;
	numCreatedDevices += 1;

	var ljmDevice;
	// These upgraders aren't needed, see tseries
	// var t7_device_upgrader = new lj_t7_upgrader.createT7Upgrader();
	// var t4_device_upgrader = new lj_t4_upgrader.createT4Upgrader();
	var tseries_device_upgrader = new lj_tseries_upgrader.createTSeriesUpgrader();

	this.isMockDevice = false;
	this.allowReconnectManager = false;
	this.allowConnectionManager = false;
	this.deviceConnectionSuspended = false;

	this.deviceErrors = [];
	this.maxNumErrors = 20;
	this.numLatestErrors = 5;

	this.cachedValues = {};

	this.getDeviceErrors = function() {
		var defered = q.defer();
		defered.resolve(self.deviceErrors);
		return defered.promise;
	};
	this.getLatestDeviceErrorsSync = function() {
		var errors = [];
		var i;
		var maxNum = self.numLatestErrors;
		var numErrors = self.deviceErrors.length;
		if(numErrors < maxNum) {
			for(i = 0; i < numErrors; i++) {
				errors.push(self.deviceErrors[i]);
			}
		} else {
			for(i = 0; i < maxNum; i++) {
				errors.push(self.deviceErrors[i]);
			}
		}

		var data = {
			'numErrors': numErrors,
			'errors': errors,
		};
		return data;
	};
	this.getLatestDeviceErrors = function() {
		var defered = q.defer();
		defered.resolve(self.getLatestDeviceErrorsSync());
		return defered.promise;
	};

	this.clearDeviceErrors = function() {
		var defered = q.defer();
		self.deviceErrors = [];
		defered.resolve();
		return defered.promise;
	};

	if(useMockDevice) {
		ljmMockDevice = require('./mocks/device_mock');
		ljmDevice = new ljmMockDevice.device();
		this.isMockDevice = true;
	} else {
		ljmDevice = new ljmDeviceReference();
	}
	this.configureMockDeviceSync = function(deviceInfo) {
		if(self.isMockDevice) {
			try {
				ljmDevice.configureMockDeviceSync(deviceInfo);
			} catch(err) {
				// Error...
			}
		}
	};
	this.configureMockDevice = function(deviceInfo) {
		var defered = q.defer();
		if(self.isMockDevice) {
			ljmDevice.configureMockDevice(deviceInfo)
			.then(defered.resolve);
		} else {
			defered.resolve();
		}
		return defered.promise;
	};
	this.getDevice = function() {
		return ljmDevice;
	};

	this.connectionCheckInterval = 1000;
	this.verifiedDeviceConnection = false;
	var connectionManagerSuccess = function(res) {
		if(self.allowConnectionManager) {
			startConnectionManager();
		}
	};
	var connectionManagerError = function(err) {
		if(self.allowConnectionManager) {
			var exitCodes = [
				1221,		// LJME_UNKNOWN_ERROR
				1223,		// LJME_INVALID_HANDLE
				1224,		// LJME_DEVICE_NOT_OPEN
				1230,		// LJME_COULD_NOT_CLAIM_DEVICE
				1233,		// LJME_SOCKET_LEVEL_ERROR
				1237,		// LJME_CANNOT_DISCONNECT
				1238,		// LJME_WINSOCK_FAILURE
			];
			if(exitCodes.indexOf(err) < 0) {
				startConnectionManager();
			}
		}
	};
	var runConnectionManager = function() {
		if(self.allowConnectionManager) {
			if(!self.verifiedDeviceConnection) {
				self.read('PRODUCT_ID')
				.then(connectionManagerSuccess, connectionManagerError);
			} else {
				startConnectionManager();
			}
		}
	};
	this.connectionManagerTimeout;
	var startConnectionManager = function() {
		self.verifiedDeviceConnection = false;
		self.connectionManagerTimeout = setTimeout(
			runConnectionManager,
			self.connectionCheckInterval
		);
	};
	var stopConnectionManager = function() {
		clearTimeout(self.connectionManagerTimeout);
	};
	var allowExecution = function() {
		self.verifiedDeviceConnection = true;
		var allowLJMFunctionExecution = true;
		if(self.allowReconnectManager) {
			if(self.savedAttributes) {
				if(!self.savedAttributes.isConnected) {
					allowLJMFunctionExecution = false;
				}
			}
		}
		if(self.deviceConnectionSuspended) {
			allowLJMFunctionExecution = false;
		}
		return allowLJMFunctionExecution;
	};

	var refreshDeviceConnectionStatus = function() {
		var refreshDefered = q.defer();
		self.emit(DEVICE_RECONNECTING, self.savedAttributes);
		ljmDevice.read(
			'PRODUCT_ID',
			function(err) {
				captureDeviceError('reconnecting', err, {'address': 'PRODUCT_ID'});
				refreshDefered.reject(err);
			},
			refreshDefered.resolve
		);
		return refreshDefered.promise;
	};
	this.reconnectManagerTimeout = undefined;
	var stopReconnectManager = function() {
		clearTimeout(self.reconnectManagerTimeout);
	};
	this.declareDeviceDisconnected = function() {
		self.savedAttributes.isConnected = false;
		internalClearCachedCalAndHWInfo() // Force Cal/HW info to be re-read on next attempt.
		self.emit(DEVICE_DISCONNECTED, self.savedAttributes);
	};
	var declareDeviceReconnected = function() {
		self.savedAttributes.isConnected = true;
		self.emit(DEVICE_RECONNECTED, self.savedAttributes);
	};
	this.extDeclareDeviceReconnected = function() {
		declareDeviceReconnected();
	};
	var handleReconnectHardwareInstalledError = function(err) {
		// console.error(
		// 	'(device_curator), handleReconnnectHardwareInstalledError',
		// 	err
		// );
		captureDeviceError('failed-Reconnecting', err, {'address': 'PRODUCT_ID&HARDWARE_INSTALLED'});
		handleFailedReconnectionAttemptRead();
	};
	var handleSuccessfulReconnectionAttemptRead = function() {
		// Declare the device to be re-connected
		declareDeviceReconnected();

		// Wait for the device to initialize before updating the devices saved
		// attributes.
		self.waitForDeviceToInitialize()
		.then(
			self.updateSavedAttributes,
			handleReconnectHardwareInstalledError
		);
	};
	var handleFailedReconnectionAttemptRead = function() {
		self.reconnectManagerTimeout = setTimeout(
			reconnectManager,
			1000
		);
	};
	var reconnectManager = function() {
		if(self.allowReconnectManager) {
			if(!self.savedAttributes.isConnected) {
				refreshDeviceConnectionStatus()
				.then(
					handleSuccessfulReconnectionAttemptRead,
					handleFailedReconnectionAttemptRead
				);
			}
		}
	};
	this.haltBackgroundOperations = function() {
		stopConnectionManager();
		stopReconnectManager();
	};
	var capitalizeString = function(s) {
		return s.replace( /(^|\s)([a-z])/g , function(m,p1,p2){
			return p1+p2.toUpperCase();
		});
	};
	var filterErrorStringText = function(s) {
		if(s !== 'LJME') {
			return s.toLowerCase();
		} else {
			return s;
		}
	};
	var transformErrorString = function(s) {
		try {
			return capitalizeString(
				s.split('_')
				.map(filterErrorStringText)
				.join(' ')
			);
		} catch(err) {
			return s.toString();
		}
	};


	var appendDeviceError = function(errData) {
		if(self.deviceErrors.length < self.maxNumErrors) {
			// Insert error into the top of the array
			self.deviceErrors.unshift(errData);
		} else {
			self.deviceErrors.pop();
			self.deviceErrors.unshift(errData);
		}

		// Report that a new error has occured.
		var errorData = {};
		var errKeys = Object.keys(errData);
		for(var i = 0; i < errKeys.length; i++) {
			errorData[errKeys[i]] = errData[errKeys[i]];
		}
		errorData.deviceInfo = self.savedAttributes;
		self.emit(DEVICE_ERROR, errorData);
	};
	var innerSaveDeviceError = function(funcName, err, data, rawError) {
		var jsonData = modbusMap.getErrorInfo(err);
		if(isNaN(err)){
			err = -1;
		}
		var errorData = {
			'code': err,
			'string': jsonData.string,
			'name': transformErrorString(jsonData.string),
			'operation': funcName,
			'data': data,
			'rawError': rawError
		};
		// console.log('Info', errorData);

		appendDeviceError(errorData);
	};
	var saveDeviceError = function(funcName, err, data, rawError) {
		if(funcName === 'reconnecting') {
			var addReconnectingError = true;
			var i;
			var num = self.deviceErrors.length;
			for(i = 0; i < num; i++) {
				if(self.deviceErrors[i].operation === 'reconnecting') {
					addReconnectingError = false;
					break;
				}
			}

			if(addReconnectingError) {
				innerSaveDeviceError(funcName, err, data, rawError);
			}
		} else {
			innerSaveDeviceError(funcName, err, data, rawError);
		}
	};

	var captureDeviceError = function(funcName, err, data) {
		// console.log('device_curator error detected', funcName, err);
		var errCode;
		if(isNaN(err)) {
			errCode = err.retError;
		} else {
			errCode = err;
		}

		if(errCode === 1239) {
			if(self.savedAttributes.isConnected) {
				self.declareDeviceDisconnected();
				self.updateSavedAttributes();
				setImmediate(reconnectManager);
			}
		}
		saveDeviceError(funcName, errCode, data, err);
	};

	this.savedAttributes = {
		isShared: false,
		sharedAppName: '',
	};
	var getVersionNumberParser = function(reg) {
		var parser = function(res, isErr, errData) {
			var dt = self.savedAttributes.deviceType;
			return data_parser.parseResult(reg, res, dt).val;
		};
		return parser;
	};

	var customAttributes = {
		'BOOTLOADER_VERSION': getVersionNumberParser('BOOTLOADER_VERSION'),
		'DEVICE_NAME_DEFAULT': null,
		'FIRMWARE_VERSION': getVersionNumberParser('FIRMWARE_VERSION'),
	};
	var deviceCustomAttributes = {
		'8': {
			'WIFI_VERSION': getVersionNumberParser('WIFI_VERSION'),
			'HARDWARE_INSTALLED': function(res, isErr, errData) {
				var retResult = {};
				var dt = self.savedAttributes.deviceType;
				var parsedResult = data_parser.parseResult('HARDWARE_INSTALLED', res, dt);

				// Save results
				var parsedResultKeys = Object.keys(parsedResult);
				parsedResultKeys.forEach(function(key) {
					retResult[key] = parsedResult[key];
				});
				// Save results
				// retResult.highResADC = parsedResult.highResADC;
				// retResult.wifi = parsedResult.wifi;
				// retResult.rtc = parsedResult.rtc;
				// retResult.sdCard = parsedResult.sdCard;

				self.savedAttributes.subclass = parsedResult.subclass;
				self.savedAttributes.isPro = parsedResult.isPro;
				self.savedAttributes.productType = parsedResult.productType;

				return retResult;
			},
		},
		'7': {
			'WIFI_VERSION': getVersionNumberParser('WIFI_VERSION'),
			'HARDWARE_INSTALLED': function(res, isErr, errData) {
				var retResult = {};
				var dt = self.savedAttributes.deviceType;
				var parsedResult = data_parser.parseResult('HARDWARE_INSTALLED', res, dt);

				// Save results
				var parsedResultKeys = Object.keys(parsedResult);
				parsedResultKeys.forEach(function(key) {
					retResult[key] = parsedResult[key];
				});
				// Save results
				// retResult.highResADC = parsedResult.highResADC;
				// retResult.wifi = parsedResult.wifi;
				// retResult.rtc = parsedResult.rtc;
				// retResult.sdCard = parsedResult.sdCard;

				self.savedAttributes.subclass = parsedResult.subclass;
				self.savedAttributes.isPro = parsedResult.isPro;
				self.savedAttributes.productType = parsedResult.productType;

				return retResult;
			},
		},
		'5': {
			'HARDWARE_INSTALLED': function(res, isErr, errData) {
				var retResult = {};
				var dt = self.savedAttributes.deviceType;
				var parsedResult = data_parser.parseResult('HARDWARE_INSTALLED', res, dt);

				// Save results
				var parsedResultKeys = Object.keys(parsedResult);
				parsedResultKeys.forEach(function(key) {
					retResult[key] = parsedResult[key];
				});

				self.savedAttributes.subclass = parsedResult.subclass;
				self.savedAttributes.productType = parsedResult.productType;

				return retResult;
			}
		},
		'4': {
			'HARDWARE_INSTALLED': function(res, isErr, errData) {
				var retResult = {};
				var dt = self.savedAttributes.deviceType;
				var parsedResult = data_parser.parseResult('HARDWARE_INSTALLED', res, dt);

				// Save results
				var parsedResultKeys = Object.keys(parsedResult);
				parsedResultKeys.forEach(function(key) {
					retResult[key] = parsedResult[key];
				});

				self.savedAttributes.subclass = parsedResult.subclass;
				self.savedAttributes.productType = parsedResult.productType;

				return retResult;
			}
		},
		'200': {
			'DGT_INSTALLED_OPTIONS': function(res, isErr, errData) {
				self.savedAttributes.subclass = '';
				if(res === 2) {
					self.savedAttributes.subclass = '-TL';

				} else if (res === 3) {
					self.savedAttributes.subclass = '-TLH';
				}
				var dc = self.savedAttributes.deviceClass;
				var sc = self.savedAttributes.subclass;
				self.savedAttributes.productType = dc + sc;
			},
			'DGT_BATTERY_INSTALL_DATE':null,
			'DGT_HUMIDITY_CAL_OFFSET': null,
			'DGT_HUMIDITY_CAL_SLOPE': null,
			'DGT_HUMIDITY_CAL_T_SLOPE': null,
		},
	};
	var saveCustomAttributes = function(addresses, dt, formatters) {
		var defered = q.defer();
		if(self.savedAttributes.isConnected) {
			self.readMultiple(addresses)
			.then(function(results) {
				results.forEach(function(res) {
					var hasFormatter = false;
					if(formatters[res.address]) {
						hasFormatter = true;
					}
					var info = modbusMap.getAddressInfo(res.address);
					// to get IF-STRING, info.typeString
					if(hasFormatter) {
						var output;
						if(res.isErr) {
							var argA;
							if(info.typeString === 'STRING') {
								argA = '';
							} else {
								argA = 0;
							}
							output = formatters[res.address](argA, res.isErr, res.data);
						} else {
							output = formatters[res.address](res.data, res.isErr);
						}
						self.savedAttributes[res.address] = output;
					} else {
						if(res.isErr) {
							if(info.typeString === 'STRING') {
								self.savedAttributes[res.address] = '';
							} else {
								self.savedAttributes[res.address] = 0;
							}
						} else {
							self.savedAttributes[res.address] = res.data;
						}
					}

					// Save values to cache:
					if(!res.isErr) {
						updateDeviceValueCacheSingle(res.address, res.data);
					}
				});
				defered.resolve(self.savedAttributes);
			}, function(err) {
				defered.resolve(self.savedAttributes);
			});
		} else {
			defered.resolve(self.savedAttributes);
		}
		return defered.promise;
	};
	var innerUpdateSavedAttributes = function() {
		var defered = q.defer();
		var attributes = [];
		var formatters = {};
		var dt = self.savedAttributes.deviceType;
		var customAttributeKeys = Object.keys(customAttributes);
		customAttributeKeys.forEach(function(key) {
			attributes.push(key);
			formatters[key] = customAttributes[key];
		});

		var devCustKeys;
		if(deviceCustomAttributes[dt]) {
			devCustKeys = Object.keys(deviceCustomAttributes[dt]);
			attributes = customAttributeKeys.concat(devCustKeys);
			devCustKeys.forEach(function(key) {
				formatters[key] = deviceCustomAttributes[dt][key];
			});
		}
		saveCustomAttributes(attributes, dt, formatters)
		.then(defered.resolve);
		return defered.promise;
	};
	this.updateSavedAttributes = function() {
		var defered = q.defer();
		innerUpdateSavedAttributes()
		.then(function(updatedAttributes) {
			self.emit(DEVICE_ATTRIBUTES_CHANGED, updatedAttributes);
			defered.resolve(updatedAttributes);
		});
		return defered.promise;
	};

	// Initialize the data object indicating how to split buffer arrays.
	this.bufferDataSplitSizes = {
		1: 1,
		2: 1,
		4: 1,
	};
	this.getBufferDataSplitSize = function(registerType) {
		var splitSize = 1;
		var dataSizeInBytes = driver_const.typeSizes[registerType];

		if(dataSizeInBytes) {
			if(self.bufferDataSplitSizes[dataSizeInBytes]) {
				splitSize = self.bufferDataSplitSizes[dataSizeInBytes];
			}
		}
		return splitSize;
	};
	var getMinimumValue = function(values) {
		var minVal = 9999;
		if(values.length > 0) {
			values.forEach(function(value) {
				if(value < minVal) {
					minVal = value;
				}
			});
		} else {
			minVal = 1;
		}
		return minVal;
	};
	var calculateBufferDataSplitSizes = function() {
		var ct = self.savedAttributes.connectionType;
		var maxBytesPerMB = self.savedAttributes.maxBytesPerMB;

		var keys = Object.keys(self.bufferDataSplitSizes);
		keys.forEach(function(key) {
			var numBytes = parseInt(key, 10);

			var standardValue = Math.floor((maxBytesPerMB - 12)/numBytes);



			// Ratio to convert bytes to numRegisters, each register is 16bits
			// of data vs 8bits.
			var registerSizeMultiple = 0.5;
			var numAddresses = numBytes * registerSizeMultiple;

			// Defined here:
			// https://labjack.com/support/modbus/protocol-details
			// Max "Modbus Feedback" frame size.
			var maxRegistersPerFrame = 255;

			// Un-optomized min-valu for ethernet.
			var hardCapSplitSize = Math.floor((maxRegistersPerFrame / numAddresses));


			var possibleValues = [standardValue, hardCapSplitSize];
			var minVal = getMinimumValue(possibleValues);

			self.bufferDataSplitSizes[key] = minVal;
		});
	};
	var saveAndLoadAttributes = function(openParameters) {
		var saveAndLoad = function() {
			var defered = q.defer();
			self.deviceErrors = [];
			self.savedAttributes = {};
			self.cachedValues = {};
			self.savedAttributes.handle = ljmDevice.handle;
			self.savedAttributes.isMockDevice = self.isMockDevice;
			self.savedAttributes.isConnected = true;
			this.allowReconnectManager = false;

			self.getHandleInfo()
			.then(function(info) {
				var infoKeys = Object.keys(info);
				infoKeys.forEach(function(key) {
					self.savedAttributes[key] = info[key];
				});
				self.savedAttributes.openParameters = openParameters;

				var dt = self.savedAttributes.deviceType;
				var ct = self.savedAttributes.connectionType;
				var dts = driver_const.DRIVER_DEVICE_TYPE_NAMES[dt];
				var dtn = driver_const.DEVICE_TYPE_NAMES[dt];
				var deviceClass = driver_const.DEVICE_TYPE_NAMES[dt];
				var cts = driver_const.DRIVER_CONNECTION_TYPE_NAMES[ct];
				var connectionTypeName = driver_const.CONNECTION_TYPE_NAMES[ct];
				self.savedAttributes.deviceTypeString = dts;
				self.savedAttributes.deviceTypeName = dtn;
				self.savedAttributes.deviceClass = deviceClass;
				self.savedAttributes.connectionTypeString = cts;
				self.savedAttributes.connectionTypeName = connectionTypeName;


				var ids = null;
				if(cts === 'LJM_ctUSB') {
					ids = self.savedAttributes.serialNumber.toString();
				} else {
					ids = self.savedAttributes.ipAddress;
				}
				self.savedAttributes.identifierString = ids;

				// Get and save device specific attributes
				var otherAttributeKeys = [];
				var customAttributeKeys = Object.keys(customAttributes);
				var devCustKeys;
				var formatters = {};
				customAttributeKeys.forEach(function(key) {
					formatters[key] = customAttributes[key];
				});
				if(deviceCustomAttributes[dt]) {
					devCustKeys = Object.keys(deviceCustomAttributes[dt]);
					otherAttributeKeys = customAttributeKeys.concat(devCustKeys);
					devCustKeys.forEach(function(key) {
						formatters[key] = deviceCustomAttributes[dt][key];
					});
				}

				try {
					// Update the buffer data split sizes
					calculateBufferDataSplitSizes();
				} catch(err) {
					console.log('Error updating bufferDataSplitSizes', err, err.stack);
				}

				saveCustomAttributes(otherAttributeKeys, dt, formatters)
				.then(defered.resolve);
			}, defered.reject);
			return defered.promise;
		};
		return saveAndLoad;
	};
	var getAndSaveCalibration = function(bundle) {
		var defered = q.defer();

		self.getCalibrationStatus()
		.then(function(res) {
			self.savedAttributes.calibrationStatus = res;
			defered.resolve(self.savedAttributes);
		}, function(err) {
			console.error('failed to get Calibration', err);
			self.savedAttributes.calibrationStatus = err;
			defered.resolve(self.savedAttributes);
		});
		return defered.promise;
	};
	var dummyGetAndSaveCalibration = function(bundle) {
		var defered = q.defer();
		// self.savedAttributes.calibrationStatus = {};
		defered.resolve(self.savedAttributes);
		return defered.promise;
	};
	var finalizeOpenProcedure = function(bundle) {
		var defered = q.defer();
		self.allowReconnectManager = true;
		self.allowConnectionManager = true;
		startConnectionManager();
		defered.resolve(bundle);
		return defered.promise;
	};

	var waitForT7ProToInitialize = function(result) {
		var defered = q.defer();
		var numAttempts = 0;
		var numSeconds = 10;
		var refreshRate = 500;
		var maxNumAttempts = numSeconds * 1000/refreshRate;
		var handleHardwareInstalled = function(newResults) {
			// console.log('Waiting for T7-Pro to initialize...', numAttempts);
			self.emit(DEVICE_INITIALIZING, numAttempts);
			var wifiFound = false;
			var validWiFiVersion = false;
			newResults.forEach(function(res) {
				if(res.name === 'HARDWARE_INSTALLED') {
					wifiFound = res.wifi;
				} else if(res.name === 'WIFI_VERSION') {
					if(res.val >= 3.12) {
						validWiFiVersion = true;
					}
				}
			});
			numAttempts += 1;
			if(numAttempts > maxNumAttempts) {
				defered.resolve();
			} else {
				if(wifiFound && validWiFiVersion) {
					defered.resolve();
				} else {
					setTimeout(refreshResults, refreshRate);
				}
			}
		};

		var refreshResults = function() {
			self.iReadMany(['HARDWARE_INSTALLED','WIFI_VERSION'])
			.then(handleHardwareInstalled, defered.reject);
		};
		// Force data to be re-read.
		if(result.wifi && false) {
			defered.resolve();
		} else {
			setTimeout(refreshResults, refreshRate);
		}

		return defered.promise;
	};
	var factoryFirmwareVersions = [
		0.6602,
		0.6604,
		1.0069,
		1.0007,
		1.0100,
	];
	function isFactoryFWVersion(fwToCheck) {
		return factoryFirmwareVersions.some(function(factoryFW) {
			if(factoryFW == fwToCheck) {
				return true;
			} else {
				return false;
			}
		});
	}
	var waitForT7ToInitialize = function() {
		var defered = q.defer();

		var handleHardwareInstalled = function(result) {
			if(result.isPro) {
				// If we have a T7-Pro then we need to wait for wifi to
				// initialize.
				self.iRead('FIRMWARE_VERSION')
				.then(function(firmwareVersion) {
					if(firmwareVersion.val < 1) {
						defered.resolve();
					} else if(!isFactoryFWVersion(firmwareVersion.val)) {
						waitForT7ProToInitialize(result)
						.then(defered.resolve, defered.reject);
					} else {
						defered.resolve();
					}
				}, function(err) {
					// We encountered an error reading the firmware version.
					defered.resolve();
				});
			} else {
				// If we have a standard T7 we don't need to wait for wifi
				// to initialize.
				defered.resolve();
			}
		};
		self.iRead('HARDWARE_INSTALLED')
		.then(handleHardwareInstalled, defered.reject);
		return defered.promise;
	};
	var waitForDigitToInitialize = function() {
		var defered = q.defer();
		defered.resolve();
		return defered.promise;
	};
	this.waitForDeviceToInitialize = function() {
		var defered = q.defer();
		var numAttempts = 0;
		var productID;
		var hardwareInstalled;
		var handleError = function(err) {
			var innerDefered = q.defer();
			console.log('device_curator error waiting to initialize', err);
			innerDefered.reject(err);
			return innerDefered.promise;
		};
		var handleProductID = function(productID) {
			var innerDefered = q.defer();
			if(productID == 7) {
				// If we have opened a T7 we need to see if it is a Pro/non-pro
				waitForT7ToInitialize()
				.then(innerDefered.resolve, innerDefered.reject);
			} else {
				// If we have opened a digit then we don't need to wait for it
				// to initialize.
				waitForDigitToInitialize()
				.then(innerDefered.resolve, innerDefered.reject);
			}
			return innerDefered.promise;
		};

		self.read('PRODUCT_ID')
		.then(handleProductID, handleError)
		.then(defered.resolve, defered.reject);
		return defered.promise;
	};
	var privateOpen = function(openParameters, knownDevices) {
		var defered = q.defer();
		function onSuccess(res) {
			var curHandle = ljmDevice.handle;
			var numSameHandles = 0;

			if(typeof(knownDevices) !== 'undefined') {
				var devKeys = Object.keys(knownDevices);
				devKeys.forEach(function(devKey) {
					var ljmDev = knownDevices[devKey].getDevice();
					var handle = ljmDev.handle;

					if(handle == curHandle) {
						numSameHandles += 1;
					}
				});

				if(numSameHandles > 1) {
					var devInfo = ljmDevice.getHandleInfoSync();
					devInfo.deviceTypeName = driver_const.DEVICE_TYPE_NAMES[devInfo.deviceType];
					devInfo.connectionTypeName = driver_const.CONNECTION_TYPE_NAMES[devInfo.connectionType];

					var openParams = {
						'dt': ljmDevice.deviceType,
						'ct': ljmDevice.connectionType,
						'id': ljmDevice.identifier,
					}

					// Clear referenced ljmDevice...
					ljmDevice.handle = null;
					ljmDevice.deviceType = null;
					ljmDevice.connectionType = null;
					ljmDevice.identifier = null;
					ljmDevice.isHandleValid = false;

					defered.reject({
						'isError': true,
						'errorMessage': 'device object already created for handle: ' + curHandle.toString(),
						'message': 'device object already created for handle: ' + curHandle.toString(),
						'description': 'device object already created for handle: ' + curHandle.toString(),
						'errorLocation': 'device_curator::privateOpen',
						'deviceInfo': devInfo,
						'openParameters': openParams,
					});
				} else {
					defered.resolve(res);
				}
			} else {
				defered.resolve(res);
			}
		}
		function onError(err) {
			defered.reject(err);
		}
		ljmDevice.open(
			openParameters.deviceType,
			openParameters.connectionType,
			openParameters.identifier,
			onError,
			onSuccess
		);
		return defered.promise;
	};
	/*
	 * This function requires the following information:
	 * deviceType: 'T7', 'ANY', 7
	 * connectionType: 'USB', 'ANY', 1
	 * identifier: 'ANY', [SN], [Device Name], [ipAddress]
	 * knownDevices: *optionalArg* {'0': curatedDevice, '1': curatedDevice, .. }
	 */
	this.open = function(deviceType, connectionType, identifier, knownDevices) {
		var defered = q.defer();
		var getOnError = function(msg) {
			return function(err) {
				var innerDefered = q.defer();
				// console.log("device_curator.js - Open Failed", err);
				innerDefered.reject(err);
				return innerDefered.promise;
			};
		};


		var openParameters = {
			'deviceType': deviceType,
			'connectionType': connectionType,
			'identifier': identifier,
		};

		privateOpen(openParameters, knownDevices)
		.then(self.waitForDeviceToInitialize, getOnError('openStep'))
		.then(saveAndLoadAttributes(openParameters), getOnError('hardwareInitialization'))
		// .then(getAndSaveCalibration, getOnError('saveAndLoadAttrs'))
		// .then(finalizeOpenProcedure, getOnError('getAndSaveCalibration')) // Removed loading of cal constants on device open.
		.then(dummyGetAndSaveCalibration, getOnError('saveAndLoadAttrs'))
		.then(finalizeOpenProcedure, getOnError('dummyGetAndSaveCalibration'))
		.then(defered.resolve, defered.reject);
		return defered.promise;
	};

	this.simpleOpen = function(deviceType, connectionType, identifier, knownDevices) {
		var defered = q.defer();
		var getOnError = function(msg) {
			return function(err) {
				var innerDefered = q.defer();
				// console.log("device_curator.js - Open Failed", err);
				innerDefered.reject(err);
				return innerDefered.promise;
			};
		};
		var openParameters = {
			'deviceType': deviceType,
			'connectionType': connectionType,
			'identifier': identifier
		};

		privateOpen(openParameters, knownDevices)
		.then(saveAndLoadAttributes(openParameters), getOnError('openStep'))
		.then(finalizeOpenProcedure, getOnError('saveAndLoadAttrs'))
		.then(defered.resolve, defered.reject);
		return defered.promise;
	};

	function linkLJMHandle(openParameters) {
		var defered = q.defer();

		// Save attributes to the ljmDevice object
		ljmDevice.handle = openParameters.deviceHandle;
		ljmDevice.deviceType = openParameters.deviceType;
		ljmDevice.connectionType = openParameters.connectionType;
		ljmDevice.identifier = openParameters.identifier;

		// Inform the ljmDevice object that the handle is valid.
		ljmDevice.isHandleValid = true;

		defered.resolve();
		return defered.promise;
	}

	/*
	 * This function allows users to generate a LJM device handle and then create a curated device object with it.
	*/
	this.linkToHandle = function(deviceHandle, deviceType, connectionType, identifier) {
		var defered = q.defer();
		var getOnError = function(msg) {
			return function(err) {
				var innerDefered = q.defer();
				// console.log("device_curator.js - Open Failed", err);
				innerDefered.reject(err);
				return innerDefered.promise;
			};
		};
		var openParameters = {
			'deviceHandle': deviceHandle,
			'deviceType': deviceType,
			'connectionType': connectionType,
			'identifier': identifier
		};

		linkLJMHandle(openParameters)
		.then(saveAndLoadAttributes(openParameters), getOnError('openStep'))
		.then(finalizeOpenProcedure, getOnError('saveAndLoadAttrs'))
		.then(defered.resolve, defered.reject);
		return defered.promise;
	};
	this.getHandleInfo = function() {
		var defered = q.defer();
		if(allowExecution()) {
			ljmDevice.getHandleInfo(
			function(err) {
				captureDeviceError('getHandleInfo', err, {});
				defered.reject(err);
			}, defered.resolve);
		} else {
			setImmediate(function() {
				defered.reject(driver_const.LJN_DEVICE_NOT_CONNECTED);
			});
		}

		return defered.promise;
	};
	this.getDeviceAttributes = function() {
		var defered = q.defer();
		defered.resolve(self.savedAttributes);
		return defered.promise;
	};
	this.readRaw = function(data) {
		var defered = q.defer();
		if(allowExecution()) {
			ljmDevice.readRaw(
				data,
				function(err) {
					captureDeviceError('readRaw', err, {'data': data});
					defered.reject(err);
				},
				defered.resolve
			);
		} else {
			setImmediate(function() {
				defered.reject(driver_const.LJN_DEVICE_NOT_CONNECTED);
			});
		}
		return defered.promise;
	};
	this.read = function(address) {
		var defered = q.defer();
		if(allowExecution()) {
			var operation = 'read';
			// Perform special read operation for UINT64 type addresses.
			var info = modbusMap.getAddressInfo(address);
			if(info.type >= 0) {
				if(info.typeString === 'UINT64') {
					operation = 'readUINT64';
				}
			}
			ljmDevice[operation](
				address,
				function(err) {
					captureDeviceError(operation, err, {'address': address});
					defered.reject(err);
				},
				defered.resolve
			);
		} else {
			setImmediate(function() {
				defered.reject(driver_const.LJN_DEVICE_NOT_CONNECTED);
			});
		}
		return defered.promise;
	};
	var innerReadArray = function(address, numReads) {
		var defered = q.defer();
		if(allowExecution()) {
			ljmDevice.readArray(
				address,
				numReads,
				function(err) {
					captureDeviceError('readArray', err, {'address': address});
					defered.reject(err);
				},
				defered.resolve
			);
		} else {
			setImmediate(function() {
				defered.reject({
					retError:driver_const.LJN_DEVICE_NOT_CONNECTED,
					errFrame:0}
				);
			});
		}
		return defered.promise;
	};
	this.readArray = function(address, numReads, options) {
		var defered = q.defer();
		var reads = [];
		var readData = [];
		var readError;
		var isError = false;

		var updateFunc;
		if(options) {
			if(options.update) {
				if(typeof(options.update) === 'function') {
					updateFunc = options.update;
				}
			}
		}

		// Prepare reads
		var info = modbusMap.getAddressInfo(address);
		var splitSize = self.getBufferDataSplitSize(info.typeString);

		var numFullPackets = Math.floor(numReads / splitSize);
		for(var i = 0; i < numFullPackets; i++) {
			reads.push({'address': address, 'numValues': splitSize});
		}
		var remainder = numReads % splitSize;
		if(remainder !== 0) {
			reads.push({'address': address, 'numValues': remainder});
		}

		// console.log('- readArray info', numReads, splitSize, numFullPackets, remainder);
		// console.log('types...', {
		// 	'numReads': typeof(numReads),
		// 	'splitSize': typeof(splitSize),
		// 	'numFullPackets': typeof(numFullPackets),
		// 	'remainder': typeof(remainder),
		// });

		if(remainder !== 0) {
			numFullPackets += 1;
		}
		var curRead = 0;
		var lastUpdateValue = 0;
		function updateUser() {
			var percent = parseInt((curRead / numFullPackets * 100).toFixed(0));
			if(lastUpdateValue != percent) {
				if(updateFunc) {
					updateFunc(percent);
				}
				lastUpdateValue = percent;
			} else {
				lastUpdateValue = percent;
			}

		}
		// Perform reads
		async.eachSeries(reads, function(singleRead, callback) {
			innerReadArray(singleRead.address, singleRead.numValues)
			.then(function(newReadData) {
				for(var i = 0; i < newReadData.length; i++) {
					readData.push(newReadData[i]);
				}
				curRead += 1;
				updateUser();
				callback();
			}, function(readArrayError) {
				readError = readArrayError;
				isError = true;
				callback(readError);
			});
		},function(err) {
			if(err) {
				defered.reject(err);
			} else {
				defered.resolve(readData);
			}
		});

		return defered.promise;
	};
	/**
	 * Performs several single reads to get individual error codes.
	**/
	this.readMultiple = function(addresses) {
		var defered = q.defer();
		var results = [];
		var performRead = function(address, callback) {
			self.qRead(address)
			.then(function(res) {
				results.push({'address': address, 'isErr': false, 'data': res});
				callback();
			}, function(err) {
				results.push({'address': address, 'isErr': true, 'data': err});
				callback();
			});
		};
		var finishRead = function(err) {
			defered.resolve(results);
		};
		async.eachSeries(
			addresses,
			performRead,
			finishRead
		);
		return defered.promise;
	};
	// An experimental implementation of the readMultiple function that doesn't
	// use the async library.
	var performMultipleReads = function(addresses) {
		var defered = q.defer();
		var currentStep = 0;
		var numSteps = addresses.length;
		var results = [];

		var handleReadSuccess = function(res) {
			results.push({'address': addresses[currentStep], 'isErr': false, 'data': res});
			if(currentStep < numSteps) {
				currentStep += 1;
				performRead();
			} else {
				defered.resolve(results);
			}
		};
		var handleReadError = function(err) {
			results.push({'address': addresses[currentStep], 'isErr': true, 'data': err});
			if(currentStep < numSteps) {
				currentStep += 1;
				performRead();
			} else {
				defered.resolve(results);
			}
		};
		var performRead = function() {
			self.qRead(addresses[currentStep])
			.then(handleReadSuccess, handleReadError);
		};

		performRead();

		return defered.promise;
	};

	/**
	 * Performs several reads in a single packet.
	**/
	this.readMany = function(addresses) {
		var defered = q.defer();
		if(allowExecution()) {
			ljmDevice.readMany(
				addresses,
				function(err) {
					captureDeviceError('readMany', err, {'addresses': addresses});
					defered.reject(err);
				},
				defered.resolve
			);
		} else {
			setImmediate(function() {
				defered.reject({
					retError:driver_const.LJN_DEVICE_NOT_CONNECTED,
					errFrame:0}
				);
			});
		}
		return defered.promise;
	};
	this.writeRaw = function(data) {
		var defered = q.defer();
		if(allowExecution()) {
			ljmDevice.writeRaw(
				data,
				function(err) {
					captureDeviceError('writeRaw', err, {'data': data});
					defered.reject(err);
				},
				defered.resolve
			);
		} else {
			setImmediate(function() {
				defered.reject(driver_const.LJN_DEVICE_NOT_CONNECTED);
			});
		}
		return defered.promise;
	};
	this.write = function(address, value) {
		var defered = q.defer();
		if(allowExecution()) {
			ljmDevice.write(
				address,
				value,
				function(err) {
					captureDeviceError('write', err, {
						'address': address, 'value': value
					});
					defered.reject(err);
				},
				defered.resolve
			);
		} else {
			setImmediate(function() {
				defered.reject(driver_const.LJN_DEVICE_NOT_CONNECTED);
			});
		}
		return defered.promise;
	};
	var innerWriteArray = function(address, writeData) {
		var defered = q.defer();
		if(allowExecution()) {
			ljmDevice.writeArray(
				address,
				writeData,
				function(err) {
					captureDeviceError('writeArray', err, {'address': address});
					defered.reject(err);
				},
				defered.resolve
			);
		} else {
			setImmediate(function() {
				defered.reject({
					retError:driver_const.LJN_DEVICE_NOT_CONNECTED,
					errFrame:0}
				);
			});
		}
		return defered.promise;
	};
	this.writeArray = function(address, writeData) {
		var defered = q.defer();
		var writes = [];
		var writeError;
		var isError = false;

		// Prepare writes
		var info = modbusMap.getAddressInfo(address);
		var splitSize = self.getBufferDataSplitSize(info.typeString);
		var numWrites = 0;

		var isDataValid = false;
		var message = '';
		var i;

		var numFullPackets = 0;
		var remainder = 0;

		if(Buffer.isBuffer(writeData)) {
			isDataValid = false;
			message = 'Buffer type is not supported.';
		} else if(Array.isArray(writeData)) {
			isDataValid = true;
			numWrites = writeData.length;
			numFullPackets = Math.floor(numWrites / splitSize);
			for(i = 0; i < numFullPackets; i++) {
				// .splice returns a new array with the old data removed from
				// the original data.
				writes.push({
					'address': address,
					'writeData': writeData.splice(0, splitSize),
				});
			}

			remainder = numWrites % splitSize;
			if(remainder !== 0) {
				writes.push({
					'address': address,
					'writeData': writeData.splice(0, remainder),
				});
			}

			if(writeData.length !== 0) {
				console.warn('Did not separate all of the data into writes', writeData);
			}
		} else if((typeof(writeData === 'string') || writeData instanceof String)) {
			isDataValid = true;
			numWrites = writeData.length;
			numFullPackets = Math.floor(numWrites / splitSize);
			for(i = 0; i < numFullPackets; i++) {
				writes.push({
					'address': address,
					'writeData': writeData.slice(i, i + splitSize),
				});
			}

			remainder = numWrites % splitSize;
			if(remainder !== 0) {
				writes.push({
					'address': address,
					'writeData': writeData.slice(numWrites - remainder, numWrites),
				});
			}
		} else {
			isDataValid = false;
			message = 'Invalid data type being written: ' + typeof(writeData) + '.';
		}

		// console.log('- writeArray info', numWrites, splitSize, numFullPackets, remainder, isDataValid, message);

		// Perform reads
		if(isDataValid) {
			async.eachSeries(writes, function(singleWrite, callback) {
				innerWriteArray(singleWrite.address, singleWrite.writeData)
				.then(function(writeResult) {
					callback();
				}, function(writeArrayError) {
					writeError = writeArrayError;
					isError = true;
					callback(writeError);
				});
			}, function(err) {
				if(err) {
					defered.reject(err);
				} else {
					// No data needs to be returned for successful writes.
					defered.resolve();
				}
			});
		} else {
			defered.reject(message);
		}
		return defered.promise;
	};
	this.writeMany = function(addresses, values) {
		var defered = q.defer();
		if(allowExecution()) {
		ljmDevice.writeMany(
			addresses,
			values,
			function(err) {
				captureDeviceError('writeMany', err, {
					'addresseses': addresses, 'values': values
				});
				defered.reject(err);
			},
			defered.resolve
		);
		} else {
			setImmediate(function() {
				defered.reject({
					retError:driver_const.LJN_DEVICE_NOT_CONNECTED,
					errFrame:0}
				);
			});
		}
		return defered.promise;
	};
	/**
	 * Performs several single reads to get individual error codes.
	**/
	this.writeMultiple = function(addresses, values) {
		var defered = q.defer();
		var writes = [];
		var i;
		for(i = 0; i < addresses.length; i ++) {
			writes.push({'address': addresses[i],'val':values[i]});
		}
		self.performMultipleWrites(writes)
		.then(defered.resolve, defered.reject);
		return defered.promise;
	};
	this.performMultipleWrites = function(writeRequests) {
		var defered = q.defer();
		var results = [];
		var performWrite = function(writeData, callback) {
			self.qWrite(writeData.address,writeData.val)
			.then(function(res) {
				results.push({'address': writeData.address, 'isErr': false, 'data': res});
				callback();
			}, function(err) {
				results.push({'address': writeData.address, 'isErr': true, 'data': err});
				callback();
			});
		};
		var finishWrite = function(err) {
			defered.resolve(results);
		};
		async.eachSeries(
			writeRequests,
			performWrite,
			finishWrite
		);
		return defered.promise;
	};

	this.rwMany = function(addresses, directions, numValues, values) {
		var defered = q.defer();
		ljmDevice.rwMany(
			addresses,
			directions,
			numValues,
			values,
			function(err) {
				captureDeviceError('rwMany', err);
				defered.reject(err);
			},
			defered.resolve
		);
		return defered.promise;
	};
	this.readUINT64 = function(type) {
		var defered = q.defer();
		if(allowExecution()) {
			ljmDevice.readUINT64(
				type,
				function(err) {
					captureDeviceError('readUINT64', err, {'type': type});
					defered.reject(err);
				},
				defered.resolve
			);
		} else {
			setImmediate(function() {
				defered.reject(driver_const.LJN_DEVICE_NOT_CONNECTED);
			});
		}
		return defered.promise;
	};
	this.streamStart = function(scansPerRead, scanList, scanRate) {
		var defered = q.defer();
		if(allowExecution()) {
			ljmDevice.streamStart(
				scansPerRead,
				scanList,
				scanRate,
				function(err) {
					captureDeviceError('streamStart', err, {
						'scansPerRead': scansPerRead,
						'scanList': scanList,
						'scanRate': scanRate,
					});
					defered.reject(err);
				},
				defered.resolve
			);
		} else {
			setImmediate(function() {
				defered.reject(driver_const.LJN_DEVICE_NOT_CONNECTED);
			});
		}
		return defered.promise;
	};
	/**
	 * The goal of this function is to transpose & pull out information, and
	 * calculate a timestamp for each stream data point given that the buffer
	 * object that gets populated by the streamRead function as "rawData"
	 * in the format:
	 *     [x1, y1, x2, y2, ... ]
	 * to:
	 *     [[timeStamp, x1, y1], [timeStamp, x2, y2], ... ]
	 * and save that new javascript object to the data object as "data".
	 *
	 * This format was chosen because the created "data_buffer.js" file in
	 * Kipling and the "flot" graphing program prefer data to be organized in
	 * similar ways to this.  It also cut down on the number of loops required
	 * to parse the data into one full pass-through of the data.
	**/
	var parseStreamData = function(data) {
		var defered = q.defer();

		var numValues = data.numVals;
		var numAddresses = data.numAddresses;
		var numResults = data.scansPerRead;

		data.data = [];
		data.autoRecoveryDetected = false;
		var i, j = 0;

		// Initialize variables to build a timestamp.
		var time = data.time;
		var timeIncrement = data.timeIncrement;

		// Initialize variables to control a data pointer.
		var pointerIncrement = ARCH_DOUBLE_NUM_BYTES;
		var pointer = 0;

		// Read and save data from the strea data (dta.rawData) buffer object.
		for (i = 0; i < numResults; i++) {
			var dataStore = [];
			dataStore.push(time);
			time += timeIncrement;
			for (j = 0; j < numAddresses; j++) {
				var val = data.rawData.readDoubleLE(pointer);
				if(val == -9999) {
					data.autoRecoveryDetected = true;
				}
				dataStore.push(val);
				pointer += pointerIncrement;
			}
			data.data.push(dataStore);
		}
		data.rawData = null;
		delete data.rawData;

		defered.resolve(data);
		return defered.promise;
	};
	this.streamRead = function() {
		var defered = q.defer();
		if(allowExecution()) {
			ljmDevice.streamRead(
				function(err) {
					captureDeviceError('streamRead', err, {});
					defered.reject(err);
				},
				function(data) {
					try {
						parseStreamData(data)
						.then(defered.resolve, defered.reject);
					} catch(err) {
						defered.reject('Error parsing stream data');
					}
				}
			);
		} else {
			setImmediate(function() {
				defered.reject(driver_const.LJN_DEVICE_NOT_CONNECTED);
			});
		}
		return defered.promise;
	};
	this.streamReadRaw = function() {
		var defered = q.defer();
		if(allowExecution()) {
			ljmDevice.streamRead(
				function(err) {
					captureDeviceError('streamReadRaw', err, {});
					defered.reject(err);
				},
				defered.resolve
			);
		} else {
			setImmediate(function() {
				defered.reject(driver_const.LJN_DEVICE_NOT_CONNECTED);
			});
		}
		return defered.promise;
	};
	this.streamStop = function() {
		var defered = q.defer();
		if(allowExecution()) {
			ljmDevice.streamStop(
				function(err) {
					captureDeviceError('streamStop', err, {});
					defered.reject(err);
				},
				defered.resolve
			);
		} else {
			setImmediate(function() {
				defered.reject(driver_const.LJN_DEVICE_NOT_CONNECTED);
			});
		}
		return defered.promise;
	};

	this.isAuthorized = function() {
		var defered = q.defer();
		if(allowExecution()) {
			ljmDevice.isAuthorized(
				function(err) {
					captureDeviceError('isAuthorized', err, {});
					defered.reject(err);
				},
				defered.resolve
			);
		} else {
			setImmediate(function() {
				defered.reject(driver_const.LJN_DEVICE_NOT_CONNECTED);
			});
		}
		return defered.promise;
	};


	function removeProcessListeners() {
		// Remove the connected process listeners.
		// console.log('Removing process interrupts', self.curatedDeviceInt);
		process.removeListener('exit', handleProcessExitInterrupt);
		process.removeListener('SIGINT', handleSIGINTInterrupt);
	}

	function prepareToCloseDevice() {
		// Clear cached device values
		self.cachedValues = undefined;
		self.cachedValues = {};

		// Disable various background operations.
		self.haltBackgroundOperations();

		// Disable the connection & reconnection managers.
		self.allowReconnectManager = false;
		self.allowConnectionManager = false;

		// Clear the reconnect manager & connection manager timers
		clearTimeout(self.reconnectManagerTimeout);
		stopReconnectManager();

		clearTimeout(self.connectionManagerTimeout);
		stopConnectionManager();

		removeProcessListeners();
	}

	this.close = function() {
		var defered = q.defer();

		prepareToCloseDevice();

		// Close the LJM device.
		ljmDevice.close(
			function(err) {
				defered.reject(err);
			}, function(res) {
				defered.resolve(res);
			}
		);
		return defered.promise;
	};



	function handleProcessExitInterrupt(code) {
		console.log('Exiting... event not removed.. Call device\'s ".destroy()" function.', self.curatedDeviceInt);
		process.removeListener('SIGINT', handleSIGINTInterrupt);
		prepareToCloseDevice();
	}
	function handleSIGINTInterrupt(code) {
		console.log('Got SIGINT. Exiting...', self.curatedDeviceInt);

		prepareToCloseDevice();
		process.exit();
	}
	// console.log('Attaching to process interrupts', this.curatedDeviceInt);
	process.on('exit', handleProcessExitInterrupt);
	process.on('SIGINT', handleSIGINTInterrupt);

	this.destroy = function() {
		prepareToCloseDevice();
	};

	/**
	 * Begin _DEFAULT safe and _DEFAULT status-saving functions
	**/
	var unsavedDefaults = {};

	this.getUnsavedDefaults = function() {
		var defered = q.defer();
		defered.resolve(unsavedDefaults);
		return defered.promise;
	};

	this.clearUnsavedDefaults = function() {
		var defered = q.defer();
		unsavedDefaults = {};
		defered.resolve();
		return defered.promise;
	};

	var checkSingleAddressForDefaults = function(address, val) {
		try {
			var info = modbusMap.getAddressInfo(address);
			var addr = info.data.name;
			if(addr.indexOf('_DEFAULT') >= 0) {
				unsavedDefaults[addr] = val;
			}
		} catch(err) {
			// console.error(
			// 	'Dev_curator checkSingleAddressForDefaults',
			// 	err, address, info
			// );
		}
	};

	var checkManyAddressesForDefaults = function(addresses, values) {
		try {
			var i;
			var numAddresses = addresses.length;
			var addr;
			var searchTerm = '_DEFAULT';
			for(i = 0; i < numAddresses; i ++) {
				addr = modbusMap.getAddressInfo(addresses[i]).data.name;
				if(addr.indexOf(searchTerm) >= 0) {
					unsavedDefaults[addr] = values[i];
				}
			}
		} catch(err) {
			// console.error(
			// 	'Dev_curator checkMultipleAddressesForDefaults',
			// 	err
			// );
		}
	};
	var checkRWManyForDefaults = function(addresses, directions, numValues, values) {
		try {
			var i;
			var numAddresses = addresses.length;
			var addr;
			var searchTerm = '_DEFAULT';
			var valOffset = 0;
			for(i = 0; i < numAddresses; i ++) {
				if(directions[i] == driver_const.LJM_WRITE) {
					addr = modbusMap.getAddressInfo(addresses[i]).data.name;
					if(addr.indexOf(searchTerm) >= 0) {
						unsavedDefaults[addr] = values[valOffset];
					}
				}
				valOffset += numValues[i];
			}
		} catch(err) {
			console.error('Dev_curator checkRWManyForDefaults', err);
		}
	};

	/*
	Intelligent Read/Write Functions.  These functions have automatic parsing/
	encoding/caching additions and all use the q functions for stability &
	reliability.
	*/
	var updateDeviceValueCacheSingle = function(address, value) {
		self.cachedValues[address] = value;
	};
	var updateDeviceValueCacheArray = function(addresses, values) {
		var i;
		var num = addresses.length;
		for(i = 0; i < num; i++) {
			self.cachedValues[addresses[i]] = values[i];
		}
	};
	this.iRead = function(address) {
		var defered = q.defer();
		self.qRead(address)
		.then(function(res) {
			// Cache the results
			updateDeviceValueCacheSingle(address, res);

			// Parse the results
			defered.resolve(data_parser.parseResult(
				address,
				res,
				self.savedAttributes.deviceType
			));
		}, function(err) {
			defered.reject(data_parser.parseError(
				address,
				err,
				{'valueCache': self.cachedValues}
			));
		});
		return defered.promise;
	};
	this.iReadMany = function(addresses) {
		var defered = q.defer();
		self.qReadMany(addresses)
		.then(function(res) {
			// Cache the results
			updateDeviceValueCacheArray(addresses, res);

			// Parse the results
			var results = data_parser.parseResults(
				addresses,
				res,
				self.savedAttributes.deviceType
			);
			defered.resolve(results);
		}, function(err) {
			defered.reject(data_parser.parseErrorMultiple(
				addresses,
				err,
				{'valueCache': self.cachedValues}
			));
		});
		return defered.promise;
	};

	/*
	 * This function intelligently re-tries the iReadMany function call to build
	 * a "best possible" result object organized by register name.  This function
	 * uses the iReadMany function call for efficiency and will collect errors
	 * for each individual register.
	*/
	this.irReadMany = function(addresses) {
		var defered = q.defer();
		defered.resolve();
		return defered.promise;
	};

	this.iReadMultiple = function(addresses) {
		var defered = q.defer();
		// this.readMultiple uses the qRead command to automatically retry _DEFAULT registers.
		self.readMultiple(addresses)
		.then(function(results) {
			var i;
			var tError;
			for(i = 0; i < results.length; i ++) {
				if(!results[i].isErr) {
					// Cache the results
					updateDeviceValueCacheSingle(
						results[i].address,
						results[i].data
					);

					// Parse the results
					results[i].data = data_parser.parseResult(
						results[i].address,
						results[i].data,
						self.savedAttributes.deviceType
					);
				} else {
					tError = results[i].data;
					results[i].data = data_parser.parseError(
						results[i].address,
						tError,
						{'valueCache': self.cachedValues}
					);
				}
			}
			defered.resolve(results);
		}, function(err) {
			defered.reject(err);
		});
		return defered.promise;
	};

	this.iWrite = function(address, value) {
		var defered = q.defer();
		var encodedVal = data_parser.encodeValue(address, value);
		self.qWrite(address, encodedVal)
		.then(function(res) {
			// If the write happens successfully then update the device cache
			updateDeviceValueCacheSingle(address, value);
			defered.resolve(res);
		}, defered.reject);
		return defered.promise;
	};
	this.iWriteMany = function(addresses, values) {
		var defered = q.defer();
		var encodedValues = values.map(function(value, i) {
			return data_parser.encodeValue(addresses[i], value);
		});
		self.qWriteMany(addresses, encodedValues)
		.then(function(res) {
			// If the write happens successfully then update the device cache
			updateDeviceValueCacheArray(addresses, values);
			defered.resolve(res);
		}, defered.reject);
		return defered.promise;
	};

	this.iWriteMultiple = function(addresses, values) {
		var defered = q.defer();
		var encodedValues = values.map(function(value, i) {
			return data_parser.encodeValue(addresses[i], value);
		});
		self.writeMultiple(addresses, encodedValues)
		.then(function(results) {
			var i, tError;
			for(i = 0; i < results.length; i++) {
				if(!results[i].isErr) {
					// If the write happens successfully then update the device
					// cache
					updateDeviceValueCacheSingle(addresses[i], values[i]);
				} else {
					tError = results[i].data;
					results[i].data = data_parser.parseError(
						results[i].address,
						tError
					);
				}
			}
			defered.resolve(results);
		}, defered.reject);
		return defered.promise;
	};

	/*
	 * The "s" functions always resolve successfully.
	 * They either resolve with the latest value or an
	 * old cached value.
	 */
	this.sRead = function(address) {
		var defered = q.defer();
		self.iRead(address)
		.then(defered.resolve,
			function(err) {
				defered.resolve(err.lastValue);
		});
		return defered.promise;
	};
	this.sReadMany = function(addresses) {
		var defered = q.defer();
		self.iReadMany(addresses)
		.then(defered.resolve,
			function(readResults) {
				var retData = [];
				readResults.data.forEach(function(data) {
					retData.push(data.lastValue);
				});
				defered.resolve(retData);
		});
		return defered.promise;
	};
	this.sReadMultiple = function(addresses) {
		var defered = q.defer();
		self.iReadMultiple(addresses)
		.then(function(results) {
			var i;
			for(i = 0; i < results.length; i++) {
				if(results[i].isErr) {
					results[i].isErr = false;
					results[i].data = results[i].data.lastValue;
				}
			}
			defered.resolve(results);
		});
		return defered.promise;
	};

	this.qRead = function(address) {
		return self.retryFlashError('qRead', address);
	};
	this.qReadMany = function(addresses) {
		return self.retryFlashError('qReadMany', addresses);
	};
	this.qReadArray = function(address, numReads, options) {
		return self.retryFlashError('qReadArray', address, numReads, options);
	};
	this.qWrite = function(address, value) {
		checkSingleAddressForDefaults(address, value);
		return self.retryFlashError('qWrite', address, value);
	};
	this.writeDeviceName = function(deviceName) {
		var defered = q.defer();
		self.iWrite('DEVICE_NAME_DEFAULT', deviceName)
		.then(function() {
			self.savedAttributes.DEVICE_NAME_DEFAULT = deviceName;
			self.emit(DEVICE_ATTRIBUTES_CHANGED, self.savedAttributes);
			defered.resolve();
		}, function(err) {
			defered.reject(err);
		});
		return defered.promise;
	};
	this.qWriteMany = function(addresses, values) {
		checkManyAddressesForDefaults(addresses, values);
		return self.retryFlashError('qWriteMany', addresses, values);
	};
	this.qrwMany = function(addresses, directions, numValues, values) {
		checkRWManyForDefaults(addresses, directions, numValues, values);
		return self.retryFlashError('qrwMany', addresses, directions, numValues, values);
	};
	this.qReadUINT64 = function(type) {
		return self.retryFlashError('qReadUINT64', type);
	};
	var errorValuesToRetry = [2358];
	var shouldPerformErrorRetry = function(errType, err) {
		var shouldRetry = false;

		if(errType === 'value') {
			if(errorValuesToRetry.indexOf(err) >= 0) {
				shouldRetry = true;
			}
		} else if(errType === 'object') {
			if(errorValuesToRetry.indexOf(err.retError) >= 0) {
				shouldRetry = true;
			}
		}

		return shouldRetry;
	};
	this.retryFlashError = function(cmdType, arg0, arg1, arg2, arg3, arg4, arg5) {
		var rqControlDeferred = q.defer();
		var device = self;
		var numRetries = 0;
		var ioNumRetry = 50;
		var ioDelay = 100;

		// Associate functions to the functions that should be re-tried
		// on flash error.
		var type={
			'qRead':'read',
			'qReadMany':'readMany',
			'qWrite':'write',
			'qWriteMany':'writeMany',
			'qrwMany':'rwMany',
			'qReadUINT64':'readUINT64',
			'readFlash':'internalReadFlash',
			'qReadArray': 'readArray',
			'writeFlash':'internalWriteFlash',
			'eraseFlash':'internalEraseFlash',
			// 'updateFirmware': 'internalUpdateFirmware'
		}[cmdType];
		var errType = {
			'qRead': 'value',
			'qReadMany': 'object',
			'qWrite':'value',
			'qWriteMany':'object',
			'qrwMany':'object',
			'qReadUINT64':'value',
			'readFlash':'value',
			'qReadArray': 'object',
			'writeFlash':'value',
			'eraseFlash':'value',
			// 'updateFirmware': 'value'
		}[cmdType];
		var supportedFunctions = [
			'qRead',
			'qReadMany',
			'qWrite',
			'qWriteMany',
			'qrwMany',
			'qReadUINT64',
			'readFlash',
			'qReadArray',
			'writeFlash',
			'eraseFlash',
			// 'updateFirmware'
		];

		var control = function() {
			// console.log('in dRead.read');
			var ioDeferred = q.defer();
			device[type](arg0,arg1,arg2,arg3, arg4)
			.then(function(result){
				// console.log('Read Succeded',result);
				ioDeferred.resolve({isErr: false, val:result});
			}, function(err) {
				// console.log('Read Failed',err);
				ioDeferred.reject({isErr: true, val:err});
			});
			return ioDeferred.promise;
		};
		var delayAndRead = function() {
			var iotimerDeferred = q.defer();
			var innerControl = function() {
				// console.log('in dRead.read');
				var innerIODeferred = q.defer();
				device[type](arg0,arg1,arg2,arg3,arg4)
				.then(function(result){
					innerIODeferred.resolve({isErr: false, val:result});
				}, function(err) {
					if(shouldPerformErrorRetry(errType, err)) {
						innerIODeferred.reject({isErr: true, val:err});
					} else {
						innerIODeferred.resolve({isErr: true, val:err});
					}
				});
				return innerIODeferred.promise;
			};
			var qDelayErr = function() {
				var eTimerDeferred = q.defer();
				eTimerDeferred.resolve('read-timeout occured');
				return eTimerDeferred.promise;
			};
			var qDelay = function() {
				// console.log('in dRead.qDelay');
				var timerDeferred = q.defer();
				if(numRetries < ioNumRetry) {
					// console.log('Re-trying');
					setTimeout(timerDeferred.resolve,1000);
				} else {
					timerDeferred.reject();
				}
				return timerDeferred.promise;
			};
			// console.log('in delayAndRead');
			if(arg5) {
				console.log('Attempting to Recover from 2358 Error');
				console.log('Function Arguments',type,arg0,arg1,arg2,arg3,arg4);
			}
			qDelay()
			.then(innerControl,qDelayErr)
			.then(function(res){
				if(!res.isErr) {
					iotimerDeferred.resolve(res.val);
				} else {
					iotimerDeferred.reject(res.val);
				}
			},delayAndRead)
			.then(iotimerDeferred.resolve,iotimerDeferred.reject);
			return iotimerDeferred.promise;
		};


		if(supportedFunctions.indexOf(cmdType) >= 0) {
			control()
			.then(function(res) {
				// success case for calling function
				rqControlDeferred.resolve(res.val);
			},function(res) {
				// console.log('in retryFlashError', errType, res, cmdType, arg0, arg1)
				// error case for calling function
				var innerDeferred = q.defer();
				if(shouldPerformErrorRetry(errType, res.val)) {
					delayAndRead()
					.then(innerDeferred.resolve,innerDeferred.reject);
				} else {
					innerDeferred.reject(res.val);
				}
				return innerDeferred.promise;
			})
			.then(function(res) {
				// console.log('Read-Really-Finished',arg0,res);
				rqControlDeferred.resolve(res);
			},function(err) {
				// console.error('DC rqControl',err);
				rqControlDeferred.reject(err);
			});
		} else {
			console.log(cmdType,type,supportedFunctions.indexOf(type));
			throw 'device_controller.rqControl Error!';
		}
		return rqControlDeferred.promise;
	};

	/**
	 * Begin T7 specific functions:
	**/
	var UpgradeProgressListener = function (percentListener, stepListener) {
		this.previousPercent = 0;
		// Function gets updated and has a percentage value.
		this.updatePercentage = function (value, callback) {
			var newVal = Math.floor(parseFloat(value.toFixed(1)));
			if(newVal !== upgradeProgressListener.previousPercent) {
				if (callback !== undefined) {
					percentListener(newVal)
					.then(callback);
				}
				upgradeProgressListener.previousPercent = newVal;
			}
		};

		// Function gets updated during various steps of the update procedure.
		// Text: 1. "", "", ""
		this.updateStepName = function (value, callback) {
			if (callback !== undefined) {
				stepListener(value)
				.then(callback);
			}
		};
		var upgradeProgressListener = this;
	};
	var getDeviceTypeMessage = function(dt) {
		return "Function not supported for deviceType: " + dt.toString();
	};
	this.updateFirmware = function(firmwareFileLocation, percentListener, stepListener) {
		// TODO: Not using retryFlashError for updater atm.  Need to handle errors better.
		// return self.retryFlashError('updateFirmware', firmwareFileLocation, percentListener, stepListener);
		return self.internalUpdateFirmware(firmwareFileLocation, percentListener, stepListener);
	};
	this.checkAuthAndUpdateFirmware = function(firmwareFileLocation, percentListener, stepListener) {
		var defered = q.defer();

		function onSuccess(res) {
			console.log('In isAuthorized onSuccess', res)
			if(res) { // If the device is authorized...
				self.updateFirmware(firmwareFileLocation, percentListener, stepListener)
				.then(defered.resolve, defered.reject);
			} else {
				defered.reject("Device is not Authorized");
			}
		}
		function onError(err) {
			console.log('In isAuthorized onError');
			defered.reject(err);
		}

		self.isAuthorized()
		.then(onSuccess, onError);

		return defered.promise;
	};

	this.suspendDeviceConnection = function() {
		var defered = q.defer();

		// Disable LJM Function Calls
        self.deviceConnectionSuspended = true;

        // Declare device Disconnected
        self.declareDeviceDisconnected();

        // Disconnect from device & declare device to be disconnected.
        var device = self.getDevice();
		var handle = device.handle;
        var dt = device.deviceType;
		var ct = device.connectionType;
		var id = device.identifier;
        device.close(function(err) {
            defered.reject();
        }, function() {
			// Temporarily restore handle & other device info...
            device.handle = handle;
			device.deviceType = dt;
			device.connectionType = ct;
			device.identifier = id;

			defered.resolve();
        });
		return defered.promise;
	};

	this.resumeDeviceConnection = function() {
		var defered = q.defer();



		 var dt = self.savedAttributes.openParameters.deviceType;
		 var ct = self.savedAttributes.openParameters.connectionType;
		 var id = self.savedAttributes.openParameters.identifier;

		 var device = self.getDevice();

		 var numAttempts = 0;
        function onError(err) {
            numAttempts += 1;
            if(numAttempts < 4) {
                device.open(dt, ct, id, onError, onSuccess);
            } else {
                bundle.isError = true;
                bundle.error = err;
                bundle.errorStep = 'resumeDeviceConnection';
                defered.resolve(bundle);
            }
        }
        function onSuccess() {
            var handleInitializeError = function() {
				var innerDeferred = q.defer();
				innerDeferred.reject();
				return innerDeferred.promise;
			};
			var finishFunc = function() {
				defered.resolve();
			};

			// Enable LJM Function Calls
        	self.deviceConnectionSuspended = false;

			// Declare the device to be re-connected
			declareDeviceReconnected();

			self.restartConnectionManager();

			// Wait for the device to initialize before updating the devices saved
			// attributes.
			self.waitForDeviceToInitialize()
			.then(
				self.updateSavedAttributes,
				handleInitializeError
			).then(finishFunc, finishFunc);
        }
		device.handle = null;
        device.open(dt, ct, id, onError, onSuccess);

		return defered.promise;
	};
	this.finishFirmwareUpdate = function(results) {
		var defered = q.defer();
		var handleInitializeError = function() {
			var innerDeferred = q.defer();
			innerDeferred.reject();
			return innerDeferred.promise;
		};
		var finishFunc = function() {
			defered.resolve(results);
		};
		// Declare the device to be re-connected
		declareDeviceReconnected();

		self.restartConnectionManager();

		// Wait for the device to initialize before updating the devices saved
		// attributes.
		self.waitForDeviceToInitialize()
		.then(
			self.updateSavedAttributes,
			handleInitializeError
		).then(finishFunc, finishFunc);
		return defered.promise;
	};
	this.restartConnectionManager = function() {
		self.allowReconnectManager = true;
		self.allowConnectionManager = true;
		startConnectionManager();
	};
	this.prepareForUpgrade = function() {
		self.haltBackgroundOperations();
		self.allowReconnectManager = false;
		self.allowConnectionManager = false;
	};
	this.internalUpdateFirmware = function(firmwareFileLocation, percentListener, stepListener) {
		var dt = self.savedAttributes.deviceType;
		var percentListenerObj;
		var stepListenerObj;
		var defaultListener = function(value) {
			var defered = q.defer();
			defered.resolve();
			return defered.promise;
		};
		if(percentListener) {
			percentListenerObj = percentListener;
		} else {
			percentListenerObj = defaultListener;
		}
		if(stepListener) {
			stepListenerObj = stepListener;
		} else {
			stepListenerObj = defaultListener;
		}
		var defered = q.defer();
		if(dt === 7) {
			var progressListener = new UpgradeProgressListener(
				percentListenerObj,
				stepListenerObj
			);
			self.prepareForUpgrade();
			tseries_device_upgrader.updateFirmware(
				self,
				ljmDevice,
				firmwareFileLocation,
				self.savedAttributes.connectionTypeString,
				progressListener
			).then(function(results){
				var resultDevice = results.getDevice();
				ljmDevice.handle = resultDevice.handle;
				self.savedAttributes.handle = resultDevice.handle;
				ljmDevice.deviceType = resultDevice.deviceType;
				ljmDevice.isHandleValid = resultDevice.isHandleValid;
				// console.info('Updated savedAttributes');
				// defered.resolve(results);
				self.finishFirmwareUpdate(results)
				.then(defered.resolve);
			}, function(err) {
				self.restartConnectionManager();
				defered.reject(err);
			});
		} else if (dt === 4) {
			var progressListener = new UpgradeProgressListener(
				percentListenerObj,
				stepListenerObj
			);
			self.prepareForUpgrade();
			tseries_device_upgrader.updateFirmware(
				self,
				ljmDevice,
				firmwareFileLocation,
				self.savedAttributes.connectionTypeString,
				progressListener
			).then(function(results){
				var resultDevice = results.getDevice();
				ljmDevice.handle = resultDevice.handle;
				self.savedAttributes.handle = resultDevice.handle;
				ljmDevice.deviceType = resultDevice.deviceType;
				ljmDevice.isHandleValid = resultDevice.isHandleValid;
				// console.info('Updated savedAttributes');
				// defered.resolve(results);
				self.finishFirmwareUpdate(results)
				.then(defered.resolve);
			}, function(err) {
				self.restartConnectionManager();
				defered.reject(err);
			});
		} else if (dt === 8) {
			var progressListener = new UpgradeProgressListener(
				percentListenerObj,
				stepListenerObj
			);
			self.prepareForUpgrade();
			tseries_device_upgrader.updateFirmware(
				self,
				ljmDevice,
				firmwareFileLocation,
				self.savedAttributes.connectionTypeString,
				progressListener
			).then(function(results){
				var resultDevice = results.getDevice();
				ljmDevice.handle = resultDevice.handle;
				self.savedAttributes.handle = resultDevice.handle;
				ljmDevice.deviceType = resultDevice.deviceType;
				ljmDevice.isHandleValid = resultDevice.isHandleValid;
				// console.info('Updated savedAttributes');
				// defered.resolve(results);
				self.finishFirmwareUpdate(results)
				.then(defered.resolve);
			}, function(err) {
				self.restartConnectionManager();
				defered.reject(err);
			});
		} else {
			defered.reject(getDeviceTypeMessage(dt));
		}
		return defered.promise;
	};
	this.readFlash = function(startAddress, length) {
		return self.retryFlashError('readFlash', startAddress, length);
	};
	this.internalReadFlash = function(startAddress, length) {
		var dt = self.savedAttributes.deviceType;
		if(dt === driver_const.LJM_DT_T7) {
			return lj_t7_flash_operations.readFlash(ljmDevice, startAddress, length);
		} else if(dt === driver_const.LJM_DT_T4) {
			return lj_t7_flash_operations.readFlash(ljmDevice, startAddress, length);
		} else if(dt === driver_const.LJM_DT_T5) {
			return lj_t7_flash_operations.readFlash(ljmDevice, startAddress, length);
		} else if(dt === driver_const.LJM_DT_T8) {
			return lj_t7_flash_operations.readFlash(ljmDevice, startAddress, length);
		} else if(dt === driver_const.LJM_DT_DIGIT) {
			var digitDefered = q.defer();
			digitDefered.resolve();
			return digitDefered.promise;
		} else {
			var defered = q.defer();
			defered.resolve();
			return defered.promise;
		}
	};
	this.writeFlash = function(startAddress, length, size, key, data) {
		return self.retryFlashError('writeFlash', startAddress, length, size, key, data);
	};
	this.internalWriteFlash = function(startAddress, length, size, key, data) {
		var dt = self.savedAttributes.deviceType;
		if(dt === driver_const.LJM_DT_T7) {
			return lj_t7_flash_operations.writeFlash(ljmDevice, startAddress, length, size, key, data);
		} else if(dt === driver_const.LJM_DT_T4) {
			return lj_t7_flash_operations.writeFlash(ljmDevice, startAddress, length, size, key, data);
		} else if(dt === driver_const.LJM_DT_T5) {
			return lj_t7_flash_operations.writeFlash(ljmDevice, startAddress, length, size, key, data);
		} else if(dt === driver_const.LJM_DT_T8) {
			return lj_t7_flash_operations.writeFlash(ljmDevice, startAddress, length, size, key, data);
		} else if(dt === driver_const.LJM_DT_DIGIT) {
			var digitDefered = q.defer();
			digitDefered.resolve();
			return digitDefered.promise;
		} else {
			var defered = q.defer();
			defered.resolve();
			return defered.promise;
		}
	};
	this.eraseFlash = function(startAddress, numPages, key) {
		return self.retryFlashError('eraseFlash', startAddress, numPages, key);
	};
	this.internalEraseFlash = function(startAddress, numPages, key) {
		var dt = self.savedAttributes.deviceType;
		if(dt === driver_const.LJM_DT_T7) {
			return lj_t7_flash_operations.eraseFlash(ljmDevice, startAddress, numPages, key);
		} else if(dt === driver_const.LJM_DT_T4) {
			return lj_t7_flash_operations.eraseFlash(ljmDevice, startAddress, numPages, key);
		} else if(dt === driver_const.LJM_DT_T5) {
			return lj_t7_flash_operations.eraseFlash(ljmDevice, startAddress, numPages, key);
		} else if(dt === driver_const.LJM_DT_T8) {
			return lj_t7_flash_operations.eraseFlash(ljmDevice, startAddress, numPages, key);
		} else if(dt === driver_const.LJM_DT_DIGIT) {
			var digitDefered = q.defer();
			digitDefered.resolve();
			return digitDefered.promise;
		} else {
			var defered = q.defer();
			defered.resolve();
			return defered.promise;
		}
	};

	var cachedFlashFWInfo = {
		recoveryFW: null,
		primaryFW: null,
		internalFW: null,
	};
	this.getRecoveryFirmwareVersion = function() {
		var defered = q.defer();
		if(self.savedAttributes.isConnected) {
			lj_t7_get_flash_fw_versions.getRecoveryFWVersion(self)
			.then(function(res) {
				cachedFlashFWInfo.recoveryFW = res;
				defered.resolve(res);
			}, defered.reject);
		} else {
			var defRes = 0;
			if(cachedFlashFWInfo.recoveryFW) {
				defRes = cachedFlashFWInfo.recoveryFW;
			}
			defered.resolve(defRes);
		}
		return defered.promise;
	};
	this.getPrimaryFirmwareVersion = function() {
		var defered = q.defer();
		if(self.savedAttributes.isConnected) {
			lj_t7_get_flash_fw_versions.getPrimaryFWVersion(self)
			.then(function(res) {
				cachedFlashFWInfo.primaryFW = res;
				defered.resolve(res);
			}, defered.reject);
		} else {
			var defRes = 0;
			if(cachedFlashFWInfo.primaryFW) {
				defRes = cachedFlashFWInfo.primaryFW;
			}
			defered.resolve(defRes);
		}
		return defered.promise;
	};
	this.getInternalFWVersion = function() {
		var defered = q.defer();
		if(self.savedAttributes.isConnected) {
			lj_t7_get_flash_fw_versions.getInternalFWVersion(self)
			.then(function(res) {
				cachedFlashFWInfo.internalFW = res;
				defered.resolve(res);
			}, defered.reject);
		} else {
			var defRes = 0;
			if(cachedFlashFWInfo.internalFW) {
				defRes = cachedFlashFWInfo.internalFW;
			}
			defered.resolve(defRes);
		}
		return defered.promise;
	};
	var cachedCalAndHWInfo = {
		calStatusValid: false,
		calStatusInfo: null,

		hwIssuesValid: false,
		hwIssuesInfo: null,
	};
	function internalClearCachedCalAndHWInfo() {
		cachedCalAndHWInfo.calStatusValid = false;
		cachedCalAndHWInfo.hwIssuesValid = false;
	}
	this.clearCachedCalAndHWInfo = function() {
		var defered = q.defer();
		cachedCalAndHWInfo.calStatusValid = false;
		cachedCalAndHWInfo.hwIssuesValid = false;
		defered.resolve();
		return defered.promise;
	};
	this.getCalibrationStatus = function() {
		var dt = self.savedAttributes.deviceType;
		var defered = q.defer();
		if(self.isMockDevice) {
			defered.resolve({
				'overall': true,
				'flashVerification': true,
				'ainVerification': false
			});
		} else {
			if(cachedCalAndHWInfo.hwIssuesValid) {
				defered.resolve(cachedCalAndHWInfo.hwIssuesInfo);
			} else if(dt === 7) {
				lj_t7_cal_operations.getDeviceCalibrationStatus(self)
				.then(function(res) {
					if(self.savedAttributes.isConnected) {
						cachedCalAndHWInfo.calStatusValid = true;
						cachedCalAndHWInfo.calStatusInfo = res;
						self.savedAttributes.calibrationStatus = res;
					}
					defered.resolve(res);
				}, defered.reject);
			} else if(dt === 4) {
				lj_t7_cal_operations.getDeviceCalibrationStatus(self)
				.then(function(res) {
					if(self.savedAttributes.isConnected) {
						cachedCalAndHWInfo.calStatusValid = true;
						cachedCalAndHWInfo.calStatusInfo = res;
						self.savedAttributes.calibrationStatus = res;
					}
					defered.resolve(res);
				}, defered.reject);
			} else {
				defered.resolve({'overall': false});
			}
		}
		return defered.promise;
	};
	this.checkForHardwareIssues = function() {
		var dt = self.savedAttributes.deviceType;
		var defered = q.defer();
		if(cachedCalAndHWInfo.hwIssuesValid) {
			defered.resolve(cachedCalAndHWInfo.hwIssuesInfo);
		} else if(dt === 7 && self.savedAttributes.isConnected) {
			lj_t7_cal_operations.checkForHardwareIssues(self)
			.then(function(res) {
				if(self.savedAttributes.isConnected) {
					cachedCalAndHWInfo.hwIssuesValid = true;
					cachedCalAndHWInfo.hwIssuesInfo = res;
				}
				defered.resolve(res);
			}, defered.reject);
		} else if(dt === 4 && self.savedAttributes.isConnected) {
			lj_t7_cal_operations.checkForHardwareIssues(self)
			.then(function(res) {
				if(self.savedAttributes.isConnected) {
					cachedCalAndHWInfo.hwIssuesValid = true;
					cachedCalAndHWInfo.hwIssuesInfo = res;
				}
				defered.resolve(res);
			}, defered.reject);
		} else {
			var fakeResults = {
		        overallResult: true,
		        overallMessage: 'Skipping Test',
		        shortMessage: 'Skipping Test',

		        calibrationInfo: [],
		        calibrationInfoValid: false,
		        testResults: {},
		    };
		    defered.resolve(fakeResults);
		}
		return defered.promise;
	};

	var i;

	/**
	 * Device functions that allow for waiting...
	**/
    var deviceValueChecker = new device_value_checker.get(this);
    var deviceValueCheckerKeys = Object.keys(deviceValueChecker);
    for(i = 0; i < deviceValueCheckerKeys.length; i++) {
		this[deviceValueCheckerKeys[i]] = deviceValueChecker[deviceValueCheckerKeys[i]];
	}

	/**
	 * Lua Script functions:
	**/
	var luaScriptOperations = new lua_script_operations.get(this);
	var luaScriptOperationKeys = Object.keys(luaScriptOperations);
	for(i = 0; i < luaScriptOperationKeys.length; i++) {
		this[luaScriptOperationKeys[i]] = luaScriptOperations[luaScriptOperationKeys[i]];
	}

	/**
	 * File System functions:
	**/
	var fileSystemOperations = new file_system_operations.get(this);
	var fileSystemOperationKeys = Object.keys(fileSystemOperations);
	for(i = 0; i < fileSystemOperationKeys.length; i++) {
		this[fileSystemOperationKeys[i]] = fileSystemOperations[fileSystemOperationKeys[i]];
	}

	/**
	 * Loading of Manufacturing Info functions:
	**/
	var manufacturingInfoOperations = new manufacturing_info_operations.get(this);
	var manufacturingInfoKeys = Object.keys(manufacturingInfoOperations);
	for(i = 0; i < manufacturingInfoKeys.length; i++) {
		this[manufacturingInfoKeys[i]] = manufacturingInfoOperations[manufacturingInfoKeys[i]];
	}

	/**
	 * Loading of Start-up configuration functions:
	**/
	var startupConfigOperations = new startup_config_operations.get(this);
	var startupConfigKeys = Object.keys(startupConfigOperations);
	for(i = 0; i < startupConfigKeys.length; i++) {
		this[startupConfigKeys[i]] = startupConfigOperations[startupConfigKeys[i]];
	}

	/**
	 * Dashboard back-end functions:
	**/
	var dashboardOperations = new dashboard_operations.get(this);
	var dashboardOperationKeys = Object.keys(dashboardOperations);
	for(i = 0; i < dashboardOperationKeys.length; i++) {
		this["dashboard_" + dashboardOperationKeys[i]] = dashboardOperations[dashboardOperationKeys[i]];
	}
	// This shouldn't be necessary since we pass "this" into the dashboard_operations object.
	// dashboardOperations.on(DASHBOARD_DATA_UPDATE, function dashboardDataUpdate(data) {
	// 	console.log('!! Received data update from dashboard', data);
	// 	self.emit(DASHBOARD_DATA_UPDATE, data);
	// });

	/**
	 * External application operations.
	 */
	var externalApplicationOperations = new external_application_operations.get(this);
	var externalApplicationOperationKeys = Object.keys(externalApplicationOperations);
	for(i = 0; i < externalApplicationOperationKeys.length; i++) {
		this[externalApplicationOperationKeys[i]] = externalApplicationOperations[externalApplicationOperationKeys[i]];
	}

	/**
	 * Get available device connection types.
	 */
	var availableConnectionsOperations = new available_connections_operations.get(this);
	var availableConnectionsOperationKeys = Object.keys(availableConnectionsOperations);
	for(i = 0; i < availableConnectionsOperationKeys.length; i++) {
		this[availableConnectionsOperationKeys[i]] = availableConnectionsOperations[availableConnectionsOperationKeys[i]];
	}

	/* cRead functions return cached values first and then attempt to read if they don't exist. */
	this.cRead = function(address) {
		var defered = q.defer();
		var info = modbusMap.getAddressInfo(address);
		var regName = info.data.name;
		if(self.cachedValues[regName]) {
			var res = data_parser.parseResult(
				address,
				self.cachedValues[regName],
				self.savedAttributes.deviceType
			);
			defered.resolve(res);
		} else {
			self.sRead(address)
			.then(defered.resolve, defered.reject);
			// defered.resolve({});
		}
		return defered.promise;
	};
	this.cReadMany = function(addresses) {
		var defered = q.defer();
		var orderedRegs = [];
		var results = [];
		var missingResults = [];
		var resultsObj = {};

		function mapResultsAndReturn() {
			orderedRegs.forEach(function(reg) {
				results.push(resultsObj[reg]);
			});
			defered.resolve(results);
		}
		addresses.forEach(function(address) {
			var info = modbusMap.getAddressInfo(address);
			var regName = info.data.name;
			orderedRegs.push(regName);
			if(self.cachedValues[regName]) {
				var res = data_parser.parseResult(
					address,
					self.cachedValues[regName],
					self.savedAttributes.deviceType
				);
				resultsObj[regName] = res;
			} else {
				missingResults.push(regName);
			}
		});
		if(missingResults.length === 0) {
			mapResultsAndReturn();
		} else {
			self.sReadMany(missingResults)
			.then(function(results) {
				results.forEach(function(result) {
					resultsObj[result.name] = result;
				});
				mapResultsAndReturn();
			}, function(err) {
				mapResultsAndReturn();
			});
		}
		return defered.promise;
	}
	this.getCachedValue = function(address) {
		var defered = q.defer();
		var info = modbusMap.getAddressInfo(address);
		var regName = info.data.name;
		if(self.cachedValues[regName]) {
			var res = data_parser.parseResult(
				address,
				self.cachedValues[regName],
				self.savedAttributes.deviceType
			);
			defered.resolve(res);
		} else {
			defered.resolve({});
		}
		return defered.promise;
	}
	function internalGetCachedValue (address) {
		var info = modbusMap.getAddressInfo(address);
		var regName = info.data.name;
		if(self.cachedValues[regname]) {
			var res = data_parser.parseResult(
				address,
				self.cachedValues[regname],
				self.savedAttributes.deviceType
			);
			return res;
		} else {
			return {};
		}
	}

	/**
	 * Digit Specific functions:
	**/
	this.digitRead = function(address) {
		var dt = self.savedAttributes.deviceType;
		var defered = q.defer();
		if(dt === 200) {
			var calibrateVal = function(res) {
				defered.resolve(res);
			};
			self.read(address)
			.then(calibrateVal, defered.reject);
		} else {
			defered.reject(getDeviceTypeMessage(dt));
		}
		return defered.promise;
	};
	this.readHumidity = function() {
		return self.digitRead('DGT_HUMIDITY_RAW');
	};

	var applyDigitFormatterFunctions = function(newData) {
		// console.log('New Data', newData);
		var coercedData = [];
		newData.forEach(function(dataPoint) {
			if(typeof(dataPoint.isErr) !== 'undefined') {
				coercedData.push(dataPoint.data);
			} else {
				coercedData.push(dataPoint);
			}
		});
		return digit_format_functions.applyFormatters(self, coercedData);
	};
	this.readTempHumidityLight = function() {
		var dt = self.savedAttributes.deviceType;
		var digitDeviceNum = driver_const.deviceTypes.digit;
		var defered = q.defer();
		var startTime = new Date();
		function finishedSuccessfully(data) {
			var endTime = new Date();
			var duration = endTime - startTime;
			console.log('LJM-DC duration', duration, data);
			defered.resolve(data);
		}
		if(dt === digitDeviceNum) {
			self.iReadMultiple([
				'DGT_TEMPERATURE_LATEST_RAW',
				'DGT_HUMIDITY_RAW',
				'DGT_LIGHT_RAW',

			])
			.then(applyDigitFormatterFunctions, defered.reject)
			.then(finishedSuccessfully, defered.reject);
		} else {
			defered.reject(getDeviceTypeMessage(dt));
		}
		return defered.promise;
	};
	this.readTempLightHumidity = function() {
		var dt = self.savedAttributes.deviceType;
		var digitDeviceNum = driver_const.deviceTypes.digit;
		var defered = q.defer();
		if(dt === digitDeviceNum) {
			self.iReadMultiple([
				'DGT_TEMPERATURE_LATEST_RAW',
				'DGT_LIGHT_RAW',
				'DGT_HUMIDITY_RAW',
			])
			.then(applyDigitFormatterFunctions, defered.reject)
			.then(defered.resolve, defered.reject);
		} else {
			defered.reject(getDeviceTypeMessage(dt));
		}
		return defered.promise;
	};
	var applyDigitFormatterFunctions = function(newData) {
		// console.log('New Data', newData);
		var coercedData = [];
		newData.forEach(function(dataPoint) {
			if(typeof(dataPoint.isErr) !== 'undefined') {
				coercedData.push(dataPoint.data);
			} else {
				coercedData.push(dataPoint);
			}
		});
		return digit_format_functions.applyFormatters(self, coercedData);
	};
	this.getLogParams = function() {
		var dt = self.savedAttributes.deviceType;
		var digitDeviceNum = driver_const.deviceTypes.digit;

		if(dt === digitDeviceNum) {
			return digit_io_helper.getLogParams(self);
		} else {
			var defered = q.defer();
			defered.reject(getDeviceTypeMessage(dt));
			return defered.promise;
		}
	};
	this.readDigitLoggedData = function(options) {
		var dt = self.savedAttributes.deviceType;
		var digitDeviceNum = driver_const.deviceTypes.digit;

		if(dt === digitDeviceNum) {
			return digit_io_helper.readDigitLoggedData(self, options);
		} else {
			var defered = q.defer();
			defered.reject(getDeviceTypeMessage(dt));
			return defered.promise;
		}
	};

	/**
	 * Begin extending the device with the register watcher system.
	**/
	var registerWatcher = new register_watcher.createRegisterWatcher(self);
	this.createWatcher = function(watcherName, callback) {
		return registerWatcher.createWatcher(watcherName, callback);
	};
	this.configureWatcher = function(watcherName, config) {
		return registerWatcher.configureWatcher(watcherName, config);
	};
	this.getWatchers = function() {
		return registerWatcher.getWatchers();
	};
	this.stopWatcher = function(watcherName) {
		return registerWatcher.stopWatcher(watcherName);
	};
	this.stopAllWatchers = function() {
		return registerWatcher.stopAllWatchers();
	};

	/**
	 * Utility function that indicates what functions are implemented.
	**/
	var STRIP_COMMENTS = /((\/\/.*$)|(\/\*[\s\S]*?\*\/))/mg;
	var ARGUMENT_NAMES = /([^\s,]+)/g;
	function getFuncParamNames(func) {
		var fnStr = func.toString().replace(STRIP_COMMENTS, '');
		var result = fnStr.slice(fnStr.indexOf('(')+1, fnStr.indexOf(')')).match(ARGUMENT_NAMES);
		if(result === null) {
			result = [];
		}
		return result;
	}
	this.getFunctions = function() {
		var defered = q.defer();

		var listOfAttributes = Object.keys(self);
		var listOfFunctions = [];
		listOfAttributes.forEach(function(attributeName) {
			var attr = self[attributeName];
			var attrType = typeof(attr);
			var funcName = attributeName;
			var numArgs = 0;
			var argNames = [];
			var validFunc = false;
			if(attrType === 'function') {
				try {
					numArgs = attr.length;
					argNames = getFuncParamNames(attr);
					validFunc = true;
				} catch(err) {
					// Just catch the error...
				}
			}
			if(validFunc) {
				listOfFunctions.push({
					'name': funcName,
					'numArgs': numArgs,
					'argNames': argNames,
				});
			}
		});

		defered.resolve(listOfFunctions);
		return defered.promise;
	};

	var self = this;
}
util.inherits(device, EventEmitter);

exports.device = device;
