
/* jshint esversion: 6, undef: true, unused: true, undef: true */
/* global global, require, console, MODULE_LOADER, MODULE_CHROME, createDeviceSelectorViewGenerator */
/* exported activeModule */

// console.log('in device_selector, controller.js');

const EventEmitter = require('events').EventEmitter;
const util = require('util');

const package_loader = global.package_loader;
const io_manager = package_loader.getPackage('io_manager');
const module_manager = package_loader.getPackage('module_manager');
const driver_const = require('ljswitchboard-ljm_driver_constants');
const modbus_map = require('ljswitchboard-modbus_map').getConstants();

const createModuleInstance = function() {
	this.runRedraw = function() {
		document.body.style.display = 'none';
		document.body.style.display = 'block';
	};
	const io_interface = io_manager.io_interface();
	const driver_controller = io_interface.getDriverController();
	const device_controller = io_interface.getDeviceController();

	const getCachedListAllDevices = device_controller.getCachedListAllDevices;
	const listAllDevices = device_controller.listAllDevices;
	const getListAllDevicesErrors = device_controller.getListAllDevicesErrors;

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
	const forwardedViewGenEvents = {
		DEVICE_OPENED: 'VIEW_GEN_DEVICE_OPENED',
		DEVICE_FAILED_TO_OPEN: 'VIEW_GEN_DEVICE_FAILED_TO_OPEN',
		DEVICE_CLOSED: 'VIEW_GEN_DEVICE_CLOSED',
		DEVICE_FAILED_TO_CLOSE: 'VIEW_GEN_DEVICE_FAILED_TO_CLOSE',
	};

	const eventsToForwardToModuleChrome = {
		DEVICE_OPENED: 'DEVICE_SELECTOR_DEVICE_OPENED',
		// DEVICE_FAILED_TO_OPEN: 'VIEW_GEN_DEVICE_FAILED_TO_OPEN',
		DEVICE_CLOSED: 'DEVICE_SELECTOR_DEVICE_CLOSED',
		// DEVICE_FAILED_TO_CLOSE: 'VIEW_GEN_DEVICE_FAILED_TO_CLOSE',
	};
	this.debug = false;

	// Create a new viewGen object
	this.viewGen = new createDeviceSelectorViewGenerator();

	let allowDeviceControl = true;
	this.enableDeviceControl = function() {
		allowDeviceControl = true;
	};
	this.disableDeviceControl = function() {
		allowDeviceControl = false;
	};
	const verifyLJMSpecialAddresses = function(scanData) {
		self.emit(self.eventList.VERIFY_LJM_SPECIAL_ADDRESSES, {});
		return Promise.resolve(scanData);
	};
	this.verifyLJMSpecialAddressesExt = function() {
		driver_controller.readLibraryS('LJM_SPECIAL_ADDRESSES_STATUS')
		.then(function(res) {
			console.log('Result:', res);
		}, function(err) {
			const errInfo = modbus_map.getErrorInfo(err);
			console.log('Err:', errInfo);
		});
	};
	this.GetLJMSpecialAddressesLocationExt = function() {
		driver_controller.readLibraryS('LJM_SPECIAL_ADDRESSES_FILE')
			.then(function(res) {
				console.log('Result:', res);
			}, function(err) {
				const errInfo = modbus_map.getErrorInfo(err);
				console.log('Err:', errInfo);
			});
	};
	this.refreshLJMSpecialAddressesExt = function() {
		driver_controller.readLibraryS('LJM_SPECIAL_ADDRESSES_FILE')
			.then(function(res) {
				console.log('Result:', res);
			}, function(err) {
				const errInfo = modbus_map.getErrorInfo(err);
				console.log('Err:', errInfo);
			});
	};
	const reportScanStarted = function(scanData) {
		self.emit(self.eventList.DEVICE_SCAN_STARTED, scanData);
		return Promise.resolve(scanData);
	};
	const reportScanFinished = function(scanData) {
		self.runRedraw();
		self.emit(self.eventList.DEVICE_SCAN_COMPLETED, scanData);
		return Promise.resolve(scanData);
	};

	// Saves the visibility state of the advanced scan options to the variable
	// used to save to start-up data.
	this.saveAdvancedScanOptionsState = function(data) {
		return new Promise((resolve) => {
		self.advancedScanOptions = data.isExpanded;
		resolve();
		});
	};
	this.saveShowDirectConnectOptionsState = function(data) {
		return new Promise((resolve, reject) => {
		self.showDirectConnectOptions = data.isExpanded;
		resolve();
		});
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
		return new Promise((resolve) => {

		// console.log("attempting direct connection", data);
		const missingValues = [];

		const dt = driver_const.deviceTypes[data.openParams.dt.toUpperCase()];
		const ct = driver_const.connectionTypes[data.openParams.ct.toUpperCase()];
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
			let errStr = 'The following connection parameter';
			if(missingValues.length > 1) {
				errStr += 's are not valid';
			} else {
				errStr += ' is not valid';
			}
			errStr += '. Please try again.';
			errStr += '<br><br>';
			errStr += missingValues.join('<br>');
			showInfoMessageNoTimeout(errStr);
		} else {
			// Define data for the connection process.
			const connectData = {
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
				internalConnectToDevice(connectData).then(() => {
					// MODULE_LOADER.loadModuleByName(MODULE_LOADER.current_module_data.name);
					// self.performDeviceScan();
					getCachedListAllDevices()
						.then(self.viewGen.displayScanResults)
						.then(resolve, resolve);
				}, function(err) {
					function onDisplayed() {
						if(typeof(err.errorMessage) !== 'undefined') {
							if(err.errorMessage.indexOf('device object already created for handle') >= 0) {
								self.blinkDevice(err.deviceInfo.serialNumber);
							}
						} else {
							// showAlert('Failed to open the desired device');
						}
						resolve();
					}

					getCachedListAllDevices()
					.then(self.viewGen.displayScanResults, self.viewGen.displayScanResults)
					.then(onDisplayed, onDisplayed);


					// showAlert('Failed to open the desired device');
				});
			}
		}


		});
	};
	this.getDeviceElement = function(sn) {
		const deviceElements = $('.device');
		let ele;
		for(let i = 0; i < deviceElements.length; i++) {
			const classList = deviceElements[i].classList;
			for(let j = 0; j < classList.length; j++) {
				if(classList[j].indexOf(sn.toString()) >= 0) {
					ele = $(deviceElements[i]);
					break;
				}
			}
		}
		return ele;
	};
	this.blinkDevice = function(sn) {
		const ele = self.getDeviceElement(sn);
		const timeout = 500;
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
		return new Promise((resolve, reject) => {

		let scanResults = [];
		function getListAllDevices() {
			return new Promise((resolve) => {
				// Update and save the scan selections
				updateAndSaveScanSelections();

				// In parallel, scan for devices.
				listAllDevices(self.scanOptions)
					.then(function(res) {
						scanResults = res;
						resolve();
					}, function(err) {
						console.error('Error scanning for devices', err);
						scanResults = [];
						resolve();
					});
			});
		}
		let scanErrors = [];
		function getScanErrors() {
			return new Promise((resolve) => {
				getListAllDevicesErrors()
					.then(function(res) {
						scanErrors = res;
						resolve();
					}, function(err) {
						console.error('Error getting errors...', err);
						scanErrors = [];
						resolve();
					});
			});
		}

		const promises = [];
		promises.push(self.viewGen.displayScanInProgress());
		promises.push(
			reportScanStarted()
			.then(getListAllDevices)
			.then(getScanErrors)
		);

		Promise.allSettled(promises)
			.then(function() {
				// const scanResults = res[1].value; // the second result (1st element);
				console.log('Scan Results', scanResults);
				console.log('Scan Errors', scanErrors);
				self.viewGen.displayScanResults(scanResults, scanErrors)
				.then(reportScanFinished)
				.then(resolve);
			}, reject);
		});
	};
	const buttonEventHandlers = {
		'REFRESH_DEVICES': this.performDeviceScan,
		'DIRECT_OPEN_DEVICE': this.attemptDirectConnection,
		'TOGGLE_ADVANCED_SCAN_OPTIONS': this.saveAdvancedScanOptionsState,
		'TOGGLE_DIRECT_CONNECT_OPTIONS': this.saveShowDirectConnectOptionsState,
	};

	// Attach to viewGen events
	const getViewGenEventListener = function(eventName) {
		const viewGenEventListener = function(eventData) {
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
	const viewGenEvents = this.viewGen.eventList;
	const viewGenEventKeys = Object.keys(viewGenEvents);
	for (let i = 0; i < viewGenEventKeys.length; i++) {
		const viewGenEventKey = viewGenEventKeys[i];
		const eventKey = viewGenEvents[viewGenEventKey];
		this.viewGen.on(
			eventKey,
			getViewGenEventListener(eventKey)
		);
	}

	const handleInitialDisplayScanResults = function(cachedScanResults) {
		return new Promise((resolve, reject) => {
		if(cachedScanResults.length > 0) {
			resolve();
		} else {
			if(self.debug) {
				console.log('Performing Device Scan');
			}
			self.performDeviceScan()
			.then(resolve, reject);
		}
		});
	};
	const internalConnectToDevice = function(data) {
		return new Promise((resolve, reject) => {
		// const device = data.device;
		// const connectionType = data.connectionType;
		if(self.debug) {
			console.log('Connecting to a device', data);
		}
		const dt = data.connectionType.dt;
		const ct = data.connectionType.ct;

		let id;
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
		const openParams = {
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
					resolve(data);
				});
			}, function(err) {
				const handledReject = false;

				if(typeof(err) === 'number') {
					// Handle LJM Error codes.
					console.log('HERE', modbus_map, modbus_map.getErrorInfo);
					const errorInfo = modbus_map.getErrorInfo(err);
					const numStr = errorInfo.error.toString();
					let errorText = 'Failed to connect to the selected device';
					let description = '';
					if(errorInfo.description) {
						description = errorInfo.description.toLowerCase();
						errorText += ', ' + description;
					} else {
						errorText += '.';
					}
					const errorMessage = '<p>' + errorText + '<br>' +
						'LabJack error code: ' +
						errorInfo.string + ' (' + numStr + ')</p>';
					global.showAlertNoTimeout(errorMessage);
				} else {
					// Handle error objects that can be returned if the same
					// handle number has been detected.
					if(typeof(err.errorMessage) !== 'undefined') {
						reject(err);
					} else {
						console.error('Open Error', err, openParams);
					}
				}
				if(!handledReject) {
					reject(err);
				}
			});
		} else {
			resolve(data);
		}
		});
	};
	const connectToDevice = function(data) {
		return new Promise((resolve, reject) => {

		internalConnectToDevice(data)
		.then(resolve, reject);
		});
	};
	this.connectToDevice = connectToDevice;
	const internalDisconnectFromDevice = function(data) {
		return new Promise((resolve) => {
		// const device = data.device;
		// const connectionType = data.connectionType;
		if(self.debug) {
			console.log('Disconnecting from a device', data);
		}
		if(allowDeviceControl) {
			const dt = data.device.deviceType;
			const sn = data.device.serialNumber;
			const options = {
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
						resolve(data);
					});
				} else {
					console.error('Can not find device to close', options);
					resolve(data);
				}
			});
		} else {
			resolve(data);
		}
		});
	};
	const disconnectFromDevice = function(data) {
		return new Promise((resolve, reject) => {

		internalDisconnectFromDevice(data)
		.then(resolve, reject);
		});
	};

	this.scanOptions = {
		'scanUSB': true,
		'scanEthernet': true,
		'scanWiFi': false,
		'scanEthernetTCP': false,
		'scanWiFiTCP': false,
		'enableDemoMode': false,
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
		self.scanOptions.enableDemoMode = $("#demo_scan_enabled").is(':checked');
		// After updating these variables, update the persistent data
		return innerSaveStartupData();
		// .then(function(res) {
		// 	console.log('innerSaveStartupData success', res);
		// }, function(err) {
		// 	console.log('innerSaveStartupData err', err);
		// });
	}
	function innerSaveStartupData() {
		let dt = 'ANY';
		let ct = 'ANY';
		let id = 'ANY';
		try {
			dt = self.viewGen.pageElements.device_type_input.ref.val();
			ct = self.viewGen.pageElements.connection_type_input.ref.val();
			id = self.viewGen.pageElements.identifier_input.ref.val();
		} catch(err) {
			console.error('Error getting ref...',err);
		}
		const startupData = {
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
		// console.log('Loaded Startup Data', startupData);
		self.scanOptions = startupData.scanOptions;
		self.advancedScanOptions = startupData.advancedScanOptions;
		self.directConnectParams = startupData.directConnectParams;
		self.showDirectConnectOptions = startupData.showDirectConnectOptions;
		return Promise.resolve();
	}
	function getDefaultStartupData() {
		const defaultStartupData = {
			'scanOptions': {
				'scanUSB': true,
				'scanEthernet': true,
				'scanWiFi': false,
				'scanEthernetTCP': false,
				'scanWiFiTCP': false,
				'enableDemoMode': false,
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
		return new Promise((resolve, reject) => {
		let isValid = true;

		try {
			// verify the startup data..
			const primaryKeys = Object.keys(startupData);
			const requiredPrimaryKeys = ['scanOptions','advancedScanOptions', 'directConnectParams','showDirectConnectOptions'];
			requiredPrimaryKeys.forEach(function(requiredPrimaryKey) {
				if(primaryKeys.indexOf(requiredPrimaryKey) < 0) {
					isValid = false;
				}

				if(requiredPrimaryKey === requiredPrimaryKeys[0]) {
					const secondaryKeys = Object.keys(startupData[requiredPrimaryKey]);
					const reqSecondaryKeys = ['scanUSB', 'scanEthernet', 'scanWiFi','scanEthernetTCP', 'scanWiFiTCP', 'enableDemoMode'];
					reqSecondaryKeys.forEach(function(reqSecondaryKey) {
						if(secondaryKeys.indexOf(reqSecondaryKey) < 0) {
							isValid = false;
						}
					});
				}

				if(requiredPrimaryKey === requiredPrimaryKeys[2]) {
					const secondaryKeys = Object.keys(startupData[requiredPrimaryKey]);
					const reqSecondaryKeys = ['dt','ct','id','isMockDevice'];
					reqSecondaryKeys.forEach(function(reqSecondaryKey) {
						if(secondaryKeys.indexOf(reqSecondaryKey) < 0) {
							isValid = false;
						}
					});
				}
			});

			if(isValid) {
				// console.log('startupData is valid', startupData);
				resolve(startupData);
			} else {
				// console.warn('startupData is invalid', startupData);
				innerRevertModuleStartupData()
				.then(innerGetStartupData)
				.then(resolve, reject);
			}
		} catch(err) {
			// console.log('ERROR', err);
			innerRevertModuleStartupData()
			.then(innerGetStartupData)
			.then(resolve, () => {
				resolve(getDefaultStartupData());
			});
		}
		});
	}
	function handleGetStartupDataError() {
		const defaultStartupData = getDefaultStartupData();
		return Promise.resolve(defaultStartupData);
	}
	function getStartupData() {
		return innerGetStartupData()
			.then(verifyStartupData, handleGetStartupDataError)
			.then(saveStartupData);
	}

	async function startModule(newModule) {
		// console.log('device_selector starting', newModule.name, newModule.id);
		self.moduleData = newModule.data;

		// Cache the page elements
		self.viewGen.cachePageControlElements(newModule.data);

		// save device connection functions
		self.viewGen.saveDeviceControlFunctions(
			connectToDevice,
			disconnectFromDevice
		);

		try {
			// Load the startup-data
			// getStartupData()

			// Load and display cached device scan results
			// .then(getCachedListAllDevices)
			const cachedScanResults = await getCachedListAllDevices();
			await self.viewGen.displayScanResults(cachedScanResults);

			// Don't load and display the cached device scan results because they
			// don't currently  display devices that are open.  Force it to refresh.

			const scanResults = await handleInitialDisplayScanResults(cachedScanResults);
			self.emit(self.eventList.MODULE_STARTED, scanResults);
			const data = {
				'name': self.moduleData.name,
			};
			global.MODULE_CHROME.emit('MODULE_READY', data);
			global.MODULE_LOADER.emit('MODULE_READY', data);
		} catch (err) {
			console.error('device_selector failed to start', err);
		}
	}
	const stopModule = function() {
		// console.log('device_selector stopped');
		self.emit(self.eventList.MODULE_STOPPED);
	};

	function preLoadStep(newModule) {
		return getStartupData()
			.then(() => {
				newModule.context.scanOptions = self.scanOptions;
				newModule.context.advancedScanOptions = self.advancedScanOptions;
				newModule.context.directConnectParams = self.directConnectParams;
				newModule.context.showDirectConnectOptions = self.showDirectConnectOptions;
				// console.log('Finished preLoadStep', newModule.context);
				return newModule;
			});
	}
	MODULE_LOADER.addPreloadStep(preLoadStep);

	function unloadStep() {
		return updateAndSaveScanSelections();
	}
	MODULE_LOADER.addUnloadStep(unloadStep);
	// Attach to MODULE_LOADER events that indicate to the module about what to
	// do.  (start/stop).
	const mlEvents = MODULE_LOADER.eventList;
	MODULE_LOADER.on(mlEvents.VIEW_READY, startModule);
	MODULE_LOADER.on(mlEvents.UNLOAD_MODULE, stopModule);
	const self = this;
};
util.inherits(createModuleInstance, EventEmitter);

global.activeModule = new createModuleInstance();
