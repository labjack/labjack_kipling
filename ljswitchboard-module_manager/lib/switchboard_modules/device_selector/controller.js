
/* jshint undef: true, unused: true, undef: true */
/* global global, require, console, MODULE_LOADER, MODULE_CHROME, createDeviceSelectorViewGenerator, module_manager */
/* exported activeModule */

// console.log('in device_selector, controller.js');

var EventEmitter = require('events').EventEmitter;
var util = require('util');

var package_loader;
var q;
var gns;
var io_manager;
var driver_const;
try {
	package_loader = global.require.main.require('ljswitchboard-package_loader');
	q = global.require.main.require('q');
	gns = package_loader.getNameSpace();
	io_manager = global.require.main.require('ljswitchboard-io_manager');
	driver_const = global.require('ljswitchboard-ljm_driver_constants');
} catch(err) {
	package_loader = require.main.require('ljswitchboard-package_loader');
	q = require.main.require('q');
	gns = package_loader.getNameSpace();
	io_manager = require.main.require('ljswitchboard-io_manager');
	driver_const = require.main.require('ljswitchboard-ljm_driver_constants');
}

var createModuleInstance = function() {
	this.runRedraw = function() {
		document.body.style.display='none';
		var h = document.body.offsetHeight; // no need to store this anywhere, the reference is enough
		document.body.style.display='block';
	};
	// var io_manager = global[gns].io_manager;
	var io_interface = io_manager.io_interface();
	var driver_controller = io_interface.getDriverController();
	var device_controller = io_interface.getDeviceController();

	var getCachedListAllDevices = device_controller.getCachedListAllDevices;
	var listAllDevices = device_controller.listAllDevices;
	var getListAllDevicesErrors = device_controller.getListAllDevicesErrors;

	this.getCachedListAllDevicesFunc = getCachedListAllDevices;
	this.listAllDevicesFunc = listAllDevices;
	this.device_controller = device_controller;
	this.driver_controller = driver_controller;

	this.moduleData = {};
	this.eventList = {
		'MODULE_STARTED': 'MODULE_STARTED',
		'MODULE_STOPPED': 'MODULE_STOPPED',
		'DEVICE_SCAN_STARTED': 'DEVICE_SCAN_STARTED',
		'DEVICE_SCAN_COMPLETED': 'DEVICE_SCAN_COMPLETED',
		'DEVICE_OPENED': 'DEVICE_OPENED',
		'DEVICE_CLOSED': 'DEVICE_CLOSED',
		'VIEW_GEN_DEVICE_OPENED': 'VIEW_GEN_DEVICE_OPENED',
		'VIEW_GEN_DEVICE_FAILED_TO_OPEN': 'VIEW_GEN_DEVICE_FAILED_TO_OPEN',
		'VIEW_GEN_DEVICE_CLOSED': 'VIEW_GEN_DEVICE_CLOSED',
		'VIEW_GEN_DEVICE_FAILED_TO_CLOSE': 'VIEW_GEN_DEVICE_FAILED_TO_CLOSE',
	};
	var forwardedViewGenEvents = {
		DEVICE_OPENED: 'VIEW_GEN_DEVICE_OPENED',
		DEVICE_FAILED_TO_OPEN: 'VIEW_GEN_DEVICE_FAILED_TO_OPEN',
		DEVICE_CLOSED: 'VIEW_GEN_DEVICE_CLOSED',
		DEVICE_FAILED_TO_CLOSE: 'VIEW_GEN_DEVICE_FAILED_TO_CLOSE',
	};

	var eventsToForwardToModuleChrome = {
		DEVICE_OPENED: 'DEVICE_SELECTOR_DEVICE_OPENED',
		// DEVICE_FAILED_TO_OPEN: 'VIEW_GEN_DEVICE_FAILED_TO_OPEN',
		DEVICE_CLOSED: 'DEVICE_SELECTOR_DEVICE_CLOSED',
		// DEVICE_FAILED_TO_CLOSE: 'VIEW_GEN_DEVICE_FAILED_TO_CLOSE',
	};
	this.debug = false;

	// Create a new viewGen object
	this.viewGen = new createDeviceSelectorViewGenerator();

	var allowDeviceControl = true;
	this.enableDeviceControl = function() {
		allowDeviceControl = true;
	};
	this.disableDeviceControl = function() {
		allowDeviceControl = false;
	};
	var verifyLJMSpecialAddresses = function(scanData) {
		var defered = q.defer();
		self.emit(self.eventList.VERIFY_LJM_SPECIAL_ADDRESSES, {});
		defered.resolve(scanData);
		return defered.promise;
	};
	this.verifyLJMSpecialAddressesExt = function() {
		driver_controller.readLibraryS('LJM_SPECIAL_ADDRESSES_STATUS')
		.then(function(res) {
			console.log('Result:', res);
		}, function(err) {
			var errInfo = modbus_map.getErrorInfo(err);
			console.log('Err:', errInfo);
		});
	};
	this.GetLJMSpecialAddressesLocationExt = function() {
		driver_controller.readLibraryS('LJM_SPECIAL_ADDRESSES_FILE')
		.then(function(res) {
			console.log('Result:', res);
		}, function(err) {
			var errInfo = modbus_map.getErrorInfo(err);
			console.log('Err:', errInfo);
		});
	};
	this.refreshLJMSpecialAddressesExt = function() {
		driver_controller.readLibraryS('LJM_SPECIAL_ADDRESSES_FILE')
		.then(function(res) {
			console.log('Result:', res);
		}, function(err) {
			var errInfo = modbus_map.getErrorInfo(err);
			console.log('Err:', errInfo);
		});
	};
	var reportScanStarted = function(scanData) {
		var defered = q.defer();
		self.emit(self.eventList.DEVICE_SCAN_STARTED, scanData);
		defered.resolve(scanData);
		return defered.promise;
	};
	var reportScanFinished = function(scanData) {
		var defered = q.defer();
		self.runRedraw();
		self.emit(self.eventList.DEVICE_SCAN_COMPLETED, scanData);
		defered.resolve(scanData);
		return defered.promise;
	};

	// Saves the visibility state of the advanced scan options to the variable
	// used to save to start-up data.
	this.saveAdvancedScanOptionsState = function(data) {
		var defered = q.defer();
		self.advancedScanOptions = data.isExpanded;
		defered.resolve();
		return defered.promise;
	};
	this.saveShowDirectConnectOptionsState = function(data) {
		var defered = q.defer();
		self.showDirectConnectOptions = data.isExpanded;
		defered.resolve();
		return defered.promise;
	};
	function getHRMissingDirectConnectKey(key, enteredVal) {
		if(key === 'dt') {
			return 'LJM Device Type, entered as: \"' + enteredVal + '\". Should be: ANY, T4, T7';
		} else if(key === 'ct') {
			return 'LJM Connection Type, entered as: \"' + enteredVal + '\". Should be: ANY, USB, Ethernet, WiFi';
		} else if(key === 'id') {
			return 'LJM Identifier, entered as: \"' + enteredVal + '\". Should be: ANY, an IP Address, a serial number, or a device name';
		} else {
			return 'Unknown';
		}
	}
	this.attemptDirectConnection = function(data) {
		var defered = q.defer();

		// console.log("attempting direct connection", data);
		var missingValues = [];

		var keys = Object.keys(data.openParams);

		var dt = driver_const.deviceTypes[data.openParams.dt.toUpperCase()];
		var ct = driver_const.connectionTypes[data.openParams.ct.toUpperCase()];
		if(typeof(dt) ==='undefined') {
			missingValues.push(getHRMissingDirectConnectKey('dt', data.openParams.dt));
		} else {
			self.directConnectParams.dt = data.openParams.dt;
		}
		if(typeof(ct) ==='undefined') {
			missingValues.push(getHRMissingDirectConnectKey('ct', data.openParams.ct));
		} else {
			self.directConnectParams.ct = data.openParams.ct;
		}
		if(typeof(data.openParams.id) === 'undefined' || data.openParams.id === '') {
			missingValues.push(getHRMissingDirectConnectKey('id', data.openParams.id));
		} else {
			self.directConnectParams.id = data.openParams.id;
		}

		

		if(missingValues.length > 0) {
			var errStr = 'The following connection parameter';
			if(missingValues.length > 1) {
				errStr += 's are not valid';
			} else {
				errStr += ' is not valid'
			}
			errStr += '. Please try again.'
			errStr += '<br><br>'
			errStr += missingValues.join('<br>');
			showInfoMessageNoTimeout(errStr);
		} else {
			// Define data for the connection process.
			var connectData = {
				'connectionType':{
					'dt':dt,
					'ct':ct,
					'id': data.openParams.id,
				},
				device:{'isMockDevice':false}
			};

			// Render & Display the connecting to devices template.
			self.viewGen.displayConnectingToDevice(data.openParams)
			.then(performConnection);

			// Connection logic needs to happen after elements have been hidden...
			function performConnection() {
				// Attempt to connect to a device.
				internalConnectToDevice(connectData).then(function(res) {
					// MODULE_LOADER.loadModuleByName(MODULE_LOADER.current_module_data.name);
					// self.performDeviceScan();
					getCachedListAllDevices()
					.then(self.viewGen.displayScanResults)
					.then(defered.resolve, defered.resolve);

				}, function(err) {
					function onDisplayed() {
						if(typeof(err.errorMessage) !== 'undefined') {
							if(err.errorMessage.indexOf('device object already created for handle') >= 0) {
								self.blinkDevice(err.deviceInfo.serialNumber);
							}
						} else {
							// showAlert('Failed to open the desired device');
						}
						defered.resolve();
					}

					getCachedListAllDevices()
					.then(self.viewGen.displayScanResults, self.viewGen.displayScanResults)
					.then(onDisplayed, onDisplayed);
					
					
					// showAlert('Failed to open the desired device');
				});
			}
		}

		
		return defered.promise;
	};
	this.getDeviceElement = function(sn) {
		var deviceElements = $('.device');
		var ele;
		var i,j = 0;
		for(i = 0; i<deviceElements.length; i++) {
			var classList = deviceElements[i].classList;
			for(j = 0; j<classList.length; j++) {
				if(classList[j].indexOf(sn.toString()) >= 0) {
					ele = $(deviceElements[i]);
					break;
				}
			}
		}
		return ele;
	};
	this.blinkDevice = function(sn) {
		var ele = self.getDeviceElement(sn);
		var timeout = 500;
		ele.addClass('black-border');
		setTimeout(function() {
			ele.removeClass('black-border');
			setTimeout(function() {
				ele.addClass('black-border');
				setTimeout(function() {
					ele.removeClass('black-border');
					setTimeout(function() {
						ele.addClass('black-border');
						setTimeout(function() {
							ele.removeClass('black-border');
						},timeout);
					},timeout);
				},timeout);
			},timeout);
		},timeout);
	};
	this.performDeviceScan = function() {
		var defered = q.defer();

		var scanResults = [];
		function getListAllDevices() {
			var innerDefered = q.defer();
			
			// Update and save the scan selections
			updateAndSaveScanSelections();

			// In parallel, scan for devices.
			listAllDevices(self.scanOptions)
			.then(function(res) {
				scanResults = res;
				innerDefered.resolve();
			}, function(err) {
				console.error('Error scanning for devices', err);
				scanResults = [];
				innerDefered.resolve();
			});
			return innerDefered.promise;
		}
		var scanErrors = [];
		function getScanErrors() {
			var innerDefered = q.defer();
			getListAllDevicesErrors()
			.then(function(res) {
				scanErrors = res;
				innerDefered.resolve();
			}, function(err) {
				console.error('Error getting errors...', err);
				scanErrors = [];
				innerDefered.resolve();
			});
			return innerDefered.promise;
		}

		var promises = [];
		promises.push(self.viewGen.displayScanInProgress());
		promises.push(
			reportScanStarted()
			.then(getListAllDevices)
			.then(getScanErrors)
		);

		q.allSettled(promises)
		.then(function(res) {
			// var scanResults = res[1].value; // the second result (1st element);
			console.log('Scan Results', scanResults);
			console.log('Scan Errors', scanErrors);
			self.viewGen.displayScanResults(scanResults, scanErrors)
			.then(reportScanFinished)
			.then(defered.resolve);
		}, defered.reject);
		return defered.promise;
	};
	var buttonEventHandlers = {
		'REFRESH_DEVICES': this.performDeviceScan,
		'DIRECT_OPEN_DEVICE': this.attemptDirectConnection,
		'TOGGLE_ADVANCED_SCAN_OPTIONS': this.saveAdvancedScanOptionsState,
		'TOGGLE_DIRECT_CONNECT_OPTIONS': this.saveShowDirectConnectOptionsState,
	};

	// Attach to viewGen events
	var getViewGenEventListener = function(eventName) {
		var viewGenEventListener = function(eventData) {
			// console.log('viewGen event', eventName, eventData);
			// If the event has some valid data, call its event handler.
			if(eventData.type) {
				if(eventData.type === 'button') {
					if(buttonEventHandlers[eventName]) {
						buttonEventHandlers[eventName](eventData);
					}
				}
			}

			// If the event should be forwarded, then forward it.
			if(forwardedViewGenEvents[eventName]) {
				self.emit(forwardedViewGenEvents[eventName], eventData);
			}

			if(eventsToForwardToModuleChrome[eventName]) {
				MODULE_CHROME.emit(
					eventsToForwardToModuleChrome[eventName],
					eventData
				);
			}
		};
		return viewGenEventListener;
	};
	var viewGenEvents = this.viewGen.eventList;
	var viewGenEventKeys = Object.keys(viewGenEvents);
	var i;
	for(i = 0; i < viewGenEventKeys.length; i++) {
		var viewGenEventKey = viewGenEventKeys[i];
		var eventKey = viewGenEvents[viewGenEventKey];
		this.viewGen.on(
			eventKey,
			getViewGenEventListener(eventKey)
		);
	}

	var handleInitialDisplayScanResults = function(cachedScanResults) {
		var defered = q.defer();
		if(cachedScanResults.length > 0) {
			defered.resolve();
		} else {
			if(self.debug) {
				console.log('Performing Device Scan');
			}
			self.performDeviceScan()
			.then(defered.resolve, defered.reject);
		}
		return defered.promise;
	};
	var internalConnectToDevice = function(data) {
		var defered = q.defer();
		// var device = data.device;
		// var connectionType = data.connectionType;
		if(self.debug) {
			console.log('Connecting to a device', data);
		}
		var dt = data.connectionType.dt;
		var ct = data.connectionType.ct;

		var id;
		if(ct === driver_const.LJM_CT_USB) {
			if(typeof(data.device.serialNumber) !== 'undefined') {
				id = data.device.serialNumber;
			} else if(typeof(data.connectionType.id) !== 'undefined') {
				id = data.connectionType.id;
			} else {
				id = 'ANY';
			}
			// id = data.device.serialNumber;
		} else if(typeof(data.connectionType.ipAddress) != 'undefined') {
			id = data.connectionType.ipAddress;
		} else {
			id = data.connectionType.id;
		}

		if(typeof(data.device) === 'undefined') {
			data.device = {
				isMockDevice: false,
			};
		}
		if(typeof(data.device.isMockDevice) === 'undefined') {
			data.device.isMockDevice = false;
		}
		var openParams = {
			'deviceType': driver_const.DRIVER_DEVICE_TYPE_NAMES[dt],
			'connectionType': driver_const.DRIVER_CONNECTION_TYPE_NAMES[ct],
			'identifier': id,
			'mockDevice': data.device.isMockDevice
		};
		if(data.device.isMockDevice) {
			openParams.mockDeviceConfig = data.device;
		}

		if(allowDeviceControl) {
			console.log('Opening Device...', openParams);
			device_controller.openDevice(openParams)
			.then(function(res) {
				if(self.debug) {
					console.log('Open Success', res);
				}
				device_controller.getDeviceListing()
				.then(function(deviceTypes) {
					if(self.debug) {
						console.log('Device Listing after open', deviceTypes);
					}
					self.emit(self.eventList.DEVICE_OPENED, data);
					defered.resolve(data);
				});
			}, function(err) {
				var handledReject = false;

				if(typeof(err) === 'number') {
					// Handle LJM Error codes.
					console.log('HERE');
					var errorInfo = modbus_map.getErrorInfo(err);
					var numStr = errorInfo.error.toString();
					var errorText = 'Failed to connect to the selected device';
					var description = '';
					if(errorInfo.description) {
						description = errorInfo.description.toLowerCase();
						errorText += ', ' + description;
					} else {
						errorText += '.';
					}
					var errorMessage = '<p>' + errorText + '<br>';
					errorMessage += 'LabJack error code: ';
					errorMessage += errorInfo.string + ' (' + numStr + ')</p>';
					showAlertNoTimeout(errorMessage);
				} else {
					// Handle error objects that can be returned if the same
					// handle number has been detected.
					if(typeof(err.errorMessage) !== 'undefined') {
						handeledReject = true;
						defered.reject(err);
					} else {
						console.error('Open Error', err, openParams);
					}
				}
				if(!handledReject) {
					defered.reject(err);
				}
			});
		} else {
			defered.resolve(data);
		}
		return defered.promise;
	};
	var connectToDevice = function(data) {
		var defered = q.defer();

		internalConnectToDevice(data)
		.then(defered.resolve, defered.reject);
		return defered.promise;
	};
	this.connectToDevice = connectToDevice;
	var internalDisconnectFromDevice = function(data) {
		var defered = q.defer();
		// var device = data.device;
		// var connectionType = data.connectionType;
		if(self.debug) {
			console.log('Disconnecting from a device', data);
		}
		if(allowDeviceControl) {
			var dt = data.device.deviceType;
			var sn = data.device.serialNumber;
			var options = {
				'deviceType': dt,
				'serialNumber': sn,
			};
			device_controller.getDevice(options)
			.then(function(device) {
				if(device) {
					if(self.debug) {
						console.log('HERE, Closing device');
					}
					device.close()
					.then(function() {
						if(self.debug) {
							console.log('HERE, Closed Device');
						}
						self.emit(self.eventList.DEVICE_CLOSED, data);
						defered.resolve(data);
					});
				} else {
					console.error('Can not find device to close', options);
					defered.resolve(data);
				}
			});
		} else {
			defered.resolve(data);
		}
		return defered.promise;
	};
	var disconnectFromDevice = function(data) {
		var defered = q.defer();

		internalDisconnectFromDevice(data)
		.then(defered.resolve, defered.reject);
		return defered.promise;
	};

	this.scanOptions = {
		'scanUSB': true,
		'scanEthernet': true,
		'scanWiFi': false,
		'scanEthernetTCP': false,
		'scanWiFiTCP': false,
	};
	this.advancedScanOptions = false;
	this.directConnectParams = {
		dt: "ANY",
		ct: "ANY",
		id: "ANY",
		isMockDevice: false,
	};
	this.showDirectConnectOptions = false;

	function updateAndSaveScanSelections() {
		/* This is SUPER bad practice!!! */
		self.scanOptions.scanUSB = $("#usb_scan_enabled").is(':checked');
		self.scanOptions.scanEthernet = $("#ethernet_scan_enabled").is(':checked');
		self.scanOptions.scanWiFi = $("#wifi_scan_enabled").is(':checked');
		self.scanOptions.scanEthernetTCP = $("#ethernet_tcp_scan_enabled").is(':checked');
		self.scanOptions.scanWiFiTCP = $("#wifi_tcp_scan_enabled").is(':checked');
		// After updating these variables, update the persistent data
		return innerSaveStartupData();
		// .then(function(res) {
		// 	console.log('innerSaveStartupData success', res);
		// }, function(err) {
		// 	console.log('innerSaveStartupData err', err);
		// });
	}
	function innerSaveStartupData() {
		var dt = 'ANY';
		var ct = 'ANY';
		var id = 'ANY';
		try {
			dt = self.viewGen.pageElements.device_type_input.ref.val();
			ct = self.viewGen.pageElements.connection_type_input.ref.val();
			id = self.viewGen.pageElements.identifier_input.ref.val();
		} catch(err) {
			console.error('Error getting ref...',err);
		}
		var startupData = {
			'scanOptions': self.scanOptions,
			'advancedScanOptions': self.advancedScanOptions,
			'directConnectParams': {
				dt: dt,
				ct: ct,
				id: id,
				isMockDevice: false,
			},
			'showDirectConnectOptions': self.showDirectConnectOptions,
		};
		return module_manager.saveModuleStartupData('device_selector', startupData);
	}
	function innerGetStartupData() {
		return module_manager.getModuleStartupData('device_selector');
	}
	function innerRevertModuleStartupData() {
		return module_manager.revertModuleStartupData('device_selector');
	}
	function saveStartupData(startupData) {
		var defered = q.defer();

		// console.log('Loaded Startup Data', startupData);
		self.scanOptions = startupData.scanOptions;
		self.advancedScanOptions = startupData.advancedScanOptions;
		self.directConnectParams = startupData.directConnectParams;
		self.showDirectConnectOptions = startupData.showDirectConnectOptions;
		defered.resolve();
		return defered.promise;
	}
	function getDefaultStartupData() {
		var defaultStartupData = {
			'scanOptions': {
				'scanUSB': true,
				'scanEthernet': true,
				'scanWiFi': false,
				'scanEthernetTCP': false,
				'scanWiFiTCP': false,
			},
			'advancedScanOptions': false,
			'directConnectParams': {
				dt: "ANY",
				ct: "ANY",
				id: "ANY",
				isMockDevice: false,
			},
			'showDirectConnectOptions': false,
		};
		return defaultStartupData;
	}
	
	function verifyStartupData(startupData) {
		var defered = q.defer();
		var isValid = true;
		// console.log('In verifyStartupData', startupData);
		try {
			// verify the startup data..
			var primaryKeys = Object.keys(startupData);
			var requiredPrimaryKeys = ['scanOptions','advancedScanOptions', 'directConnectParams','showDirectConnectOptions'];
			requiredPrimaryKeys.forEach(function(requiredPrimaryKey) {
				if(primaryKeys.indexOf(requiredPrimaryKey) < 0) {
					isValid = false;
				}

				if(requiredPrimaryKey === requiredPrimaryKeys[0]) {
					var secondaryKeys = Object.keys(startupData[requiredPrimaryKey]);
					var reqSecondaryKeys = ['scanUSB', 'scanEthernet', 'scanWiFi','scanEthernetTCP', 'scanWiFiTCP'];
					reqSecondaryKeys.forEach(function(reqSecondaryKey) {
						if(secondaryKeys.indexOf(reqSecondaryKey) < 0) {
							isValid = false;
						}
					});
				}

				if(requiredPrimaryKey === requiredPrimaryKeys[2]) {
					var secondaryKeys = Object.keys(startupData[requiredPrimaryKey]);
					var reqSecondaryKeys = ['dt','ct','id','isMockDevice'];
					reqSecondaryKeys.forEach(function(reqSecondaryKey) {
						if(secondaryKeys.indexOf(reqSecondaryKey) < 0) {
							isValid = false;
						}
					});
				}
			});

			if(isValid) {
				// console.log('startupData is valid', startupData);
				defered.resolve(startupData);
			} else {
				// console.warn('startupData is invalid', startupData);
				innerRevertModuleStartupData()
				.then(innerGetStartupData)
				.then(defered.resolve, defered.reject);
			}
		} catch(err) {
			// console.log('ERROR', err);
			innerRevertModuleStartupData()
			.then(innerGetStartupData)
			.then(defered.resolve, function(err) {
				defered.resolve(getDefaultStartupData());
			});
		}
		return defered.promise;
	}
	function handleGetStartupDataError(err) {
		var defered = q.defer();
		var defaultStartupData = getDefaultStartupData();
		defered.resolve(defaultStartupData);
		return defered.promise;
	}
	function getStartupData() {
		var defered = q.defer();

		innerGetStartupData()
		.then(verifyStartupData, handleGetStartupDataError)
		.then(saveStartupData)
		.then(defered.resolve, defered.reject);
		return defered.promise;
	}

	var startModule = function(newModule) {
		// console.log('device_selector starting', newModule.name, newModule.id);
		self.moduleData = newModule.data;
		
		// Cache the page elements
		self.viewGen.cachePageControlElements(newModule.data);

		// save device connection functions
		self.viewGen.saveDeviceControlFunctions(
			connectToDevice,
			disconnectFromDevice
		);

		// Load the startup-data
		// getStartupData()

		// Load and display cached device scan results
		// .then(getCachedListAllDevices)
		getCachedListAllDevices()
		.then(self.viewGen.displayScanResults)

		// Don't load and display the cached device scan results because they
		// don't currently  display devices that are open.  Force it to refresh.
		// self.viewGen.displayScanResults([])
		.then(handleInitialDisplayScanResults)
		.then(function(scanResults) {
			// console.log('device_selector started');
			self.emit(self.eventList.MODULE_STARTED, scanResults);
			var data = {
				'name': self.moduleData.name,
			};
			MODULE_CHROME.emit('MODULE_READY', data);
			MODULE_LOADER.emit('MODULE_READY', data);
		}, function(err) {
			console.error('device_selector failed to start', err);
		})
		.catch(function(err) {
			console.error('device selector failed to start', err);
		});
	};
	var stopModule = function() {
		// console.log('device_selector stopped');
		self.emit(self.eventList.MODULE_STOPPED);
	};

	function preLoadStep(newModule) {
		var defered = q.defer();
		// console.log('Starting preLoadStep');
		getStartupData()
		.then(function() {
			newModule.context.scanOptions = self.scanOptions;
			newModule.context.advancedScanOptions = self.advancedScanOptions;
			newModule.context.directConnectParams = self.directConnectParams;
			newModule.context.showDirectConnectOptions = self.showDirectConnectOptions;
			// console.log('Finished preLoadStep', newModule.context);
			defered.resolve(newModule);
		});
		
		return defered.promise;
	}
	MODULE_LOADER.addPreloadStep(preLoadStep);

	function unloadStep() {
		// var defered = q.defer();
		// return defered.promise;
		return updateAndSaveScanSelections();
	}
	MODULE_LOADER.addUnloadStep(unloadStep);
	// Attach to MODULE_LOADER events that indicate to the module about what to
	// do.  (start/stop).
	var mlEvents = MODULE_LOADER.eventList;
	MODULE_LOADER.on(mlEvents.VIEW_READY, startModule);
	MODULE_LOADER.on(mlEvents.UNLOAD_MODULE, stopModule);
	var self = this;
};
util.inherits(createModuleInstance, EventEmitter);

var activeModule = new createModuleInstance();