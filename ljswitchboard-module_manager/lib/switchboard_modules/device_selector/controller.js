'use strict';

/* jshint esversion: 6, undef: true, unused: true, undef: true */
/* global global, require, console, MODULE_LOADER, MODULE_CHROME, createDeviceSelectorViewGenerator */
/* exported activeModule */

const EventEmitter = require('events').EventEmitter;

const package_loader = global.package_loader;
const io_manager = package_loader.getPackage('io_manager');
const module_manager = package_loader.getPackage('module_manager');
const driver_const = require('ljswitchboard-ljm_driver_constants');
const modbus_map = require('ljswitchboard-modbus_map').getConstants();

class ModuleInstance extends EventEmitter {

	constructor(props) {
		super(props);

		const io_interface = io_manager.io_interface();
		const driver_controller = io_interface.getDriverController();
		const device_controller = io_interface.getDeviceController();

		this.getListAllDevicesErrors = device_controller.getListAllDevicesErrors;
		this.getCachedListAllDevices = device_controller.getCachedListAllDevices;
		this.listAllDevices = device_controller.listAllDevices;
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
		this.forwardedViewGenEvents = {
			DEVICE_OPENED: 'VIEW_GEN_DEVICE_OPENED',
			DEVICE_FAILED_TO_OPEN: 'VIEW_GEN_DEVICE_FAILED_TO_OPEN',
			DEVICE_CLOSED: 'VIEW_GEN_DEVICE_CLOSED',
			DEVICE_FAILED_TO_CLOSE: 'VIEW_GEN_DEVICE_FAILED_TO_CLOSE',
		};

		this.eventsToForwardToModuleChrome = {
			DEVICE_OPENED: 'DEVICE_SELECTOR_DEVICE_OPENED',
			// DEVICE_FAILED_TO_OPEN: 'VIEW_GEN_DEVICE_FAILED_TO_OPEN',
			DEVICE_CLOSED: 'DEVICE_SELECTOR_DEVICE_CLOSED',
			// DEVICE_FAILED_TO_CLOSE: 'VIEW_GEN_DEVICE_FAILED_TO_CLOSE',
		};
		this.debug = false;

		// Create a new viewGen object
		this.viewGen = new createDeviceSelectorViewGenerator();

		this.allowDeviceControl = true;

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

		const viewGenEvents = this.viewGen.eventList;
		const viewGenEventKeys = Object.keys(viewGenEvents);
		for (let i = 0; i < viewGenEventKeys.length; i++) {
			const viewGenEventKey = viewGenEventKeys[i];
			const eventKey = viewGenEvents[viewGenEventKey];
			this.viewGen.on(
				eventKey,
				(data) => this.getViewGenEventListener(eventKey)(data)
			);
		}

		MODULE_LOADER.addPreloadStep(param => this.preLoadStep(param));
		MODULE_LOADER.addUnloadStep(() => this.unloadStep());
		// Attach to MODULE_LOADER events that indicate to the module about what to
		// do.  (start/stop).
		const mlEvents = MODULE_LOADER.eventList;
		MODULE_LOADER.on(mlEvents.VIEW_READY, param => this.startModule(param));
		MODULE_LOADER.on(mlEvents.UNLOAD_MODULE, () => this.stopModule());
	}

	runRedraw() {
		document.body.style.display = 'none';
		document.body.style.display = 'block';
	}

	reportScanStarted(scanData) {
		this.emit(this.eventList.DEVICE_SCAN_STARTED, scanData);
		return Promise.resolve(scanData);
	}

	// Saves the visibility state of the advanced scan options to the variable
	// used to save to start-up data.
	saveAdvancedScanOptionsState(data) {
		return new Promise((resolve) => {
		this.advancedScanOptions = data.isExpanded;
		resolve();
		});
	}

	saveShowDirectConnectOptionsState(data) {
		return new Promise((resolve) => {
			this.showDirectConnectOptions = data.isExpanded;
				resolve();
			});
	}

	getHRMissingDirectConnectKey(key, enteredVal) {
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

	async attemptDirectConnection(data) {
		// console.log("attempting direct connection", data);
		const missingValues = [];

		const dt = driver_const.deviceTypes[data.openParams.dt.toUpperCase()];
		const ct = driver_const.connectionTypes[data.openParams.ct.toUpperCase()];
		if(typeof(dt) ==='undefined') {
			missingValues.push(this.getHRMissingDirectConnectKey('dt', data.openParams.dt));
		} else {
			this.directConnectParams.dt = data.openParams.dt;
		}
		if(typeof(ct) ==='undefined') {
			missingValues.push(this.getHRMissingDirectConnectKey('ct', data.openParams.ct));
		} else {
			this.directConnectParams.ct = data.openParams.ct;
		}
		if(typeof(data.openParams.id) === 'undefined' || data.openParams.id === '') {
			missingValues.push(this.getHRMissingDirectConnectKey('id', data.openParams.id));
		} else {
			this.directConnectParams.id = data.openParams.id;
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
			global.showInfoMessageNoTimeout(errStr);
		} else {
			// Define data for the connection process.
			const connectData = {
				'connectionType':{
					'dt':dt,
					'ct':ct,
					'id': data.openParams.id,
				},
				device:{'isMockDevice': false}
			};

			// Render & Display the connecting to devices template.
			await this.viewGen.displayConnectingToDevice(data.openParams);
			// Connection logic needs to happen after elements have been hidden...
			// Attempt to connect to a device.

			try {
				await this.connectToDevice(connectData);
				await this.getCachedListAllDevices();
				this.viewGen.displayScanResults();
			} catch (err) {
				try {
					await this.getCachedListAllDevices();
				} finally {
					this.viewGen.displayScanResults();
					if(typeof(err.errorMessage) !== 'undefined') {
						if(err.errorMessage.indexOf('device object already created for handle') >= 0) {
							this.blinkDevice(err.deviceInfo.serialNumber);
						}
					} else {
						// showAlert('Failed to open the desired device');
					}
				}
			}
		}
	}

	getDeviceElement(sn) {
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
	}

	async blinkDevice(sn) {
		const ele = this.getDeviceElement(sn);
		const timeout = 500;
		ele.addClass('black-border');

		await new Promise(resolve => setTimeout(resolve, timeout));
		ele.removeClass('black-border');
		await new Promise(resolve => setTimeout(resolve, timeout));
		ele.addClass('black-border');
		await new Promise(resolve => setTimeout(resolve, timeout));
		ele.removeClass('black-border');
		await new Promise(resolve => setTimeout(resolve, timeout));
		ele.addClass('black-border');
		await new Promise(resolve => setTimeout(resolve, timeout));
		ele.removeClass('black-border');
		await new Promise(resolve => setTimeout(resolve, timeout));
	}

	async performDeviceScan() {
		let scanResults = [];
		let scanErrors = [];

		await this.viewGen.displayScanInProgress();

		await this.reportScanStarted()
				.then(() => {
					return new Promise((resolve) => {
						// Update and save the scan selections
						this.updateAndSaveScanSelections();

						// In parallel, scan for devices.
						this.listAllDevices(this.scanOptions)
							.then((res) => {
								scanResults = res;
								resolve();
							}, (err) => {
								console.error('Error scanning for devices', err);
								resolve();
							});
					});
				})
				.then(() => {
					return new Promise((resolve) => {
						this.getListAllDevicesErrors()
							.then((res) => {
								scanErrors = res;
								resolve();
							}, (err) => {
								console.error('Error getting errors...', err);
								resolve();
							});
					});
				});

		// const scanResults = res[1].value; // the second result (1st element);
		console.log('Scan Results', scanResults);
		console.log('Scan Errors', scanErrors);
		const scanData = await this.viewGen.displayScanResults(scanResults, scanErrors);

		this.runRedraw();
		this.emit(this.eventList.DEVICE_SCAN_COMPLETED, scanData);

		return scanData;
	}

	// Attach to viewGen events
	getViewGenEventListener(eventName) {
		const buttonEventHandlers = {
			'REFRESH_DEVICES': (data) => this.performDeviceScan(data),
			'DIRECT_OPEN_DEVICE': (data) => this.attemptDirectConnection(data),
			'TOGGLE_ADVANCED_SCAN_OPTIONS': (data) => this.saveAdvancedScanOptionsState(data),
			'TOGGLE_DIRECT_CONNECT_OPTIONS': (data) => this.saveShowDirectConnectOptionsState(data),
		};

		const viewGenEventListener = (eventData) => {
			// console.log('viewGen event', eventName, eventData);
			// If the event has some valid data, call its event handler.

			if (eventData.type) {
				if (eventData.type === 'button') {
					if (buttonEventHandlers[eventName]) {
						buttonEventHandlers[eventName](eventData);
					}
				}
			}

			// If the event should be forwarded, then forward it.
			if(this.forwardedViewGenEvents[eventName]) {
				this.emit(this.forwardedViewGenEvents[eventName], eventData);
			}

			if(this.eventsToForwardToModuleChrome[eventName]) {
				MODULE_CHROME.emit(
					this.eventsToForwardToModuleChrome[eventName],
					eventData
				);
			}
		};
		return viewGenEventListener;
	}

	handleInitialDisplayScanResults(cachedScanResults) {
		if (cachedScanResults.length > 0) {
			return Promise.resolve();
		} else {
			if(this.debug) {
				console.log('Performing Device Scan');
			}
			return this.performDeviceScan();
		}
	}

	connectToDevice(data) {
		return new Promise((resolve, reject) => {
			if(this.debug) {
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

			if(this.allowDeviceControl) {
				console.log('Opening Device...', openParams);
				this.device_controller.openDevice(openParams)
				.then((res) => {
					if(this.debug) {
						console.log('Open Success', res);
					}
					this.device_controller.getDeviceListing()
					.then((deviceTypes) => {
						if(this.debug) {
							console.log('Device Listing after open', deviceTypes);
						}
						this.emit(this.eventList.DEVICE_OPENED, data);
						resolve(data);
					});
				}, (err) => {
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
	}

	async disconnectFromDevice(data) {
		if (this.debug) {
			console.log('Disconnecting from a device', data);
		}
		if (this.allowDeviceControl) {
			const dt = data.device.deviceType;
			const sn = data.device.serialNumber;
			const options = {
				'deviceType': dt,
				'serialNumber': sn,
			};
			const device = await this.device_controller.getDevice(options);
			if (device) {
				if(this.debug) {
					console.log('HERE, Closing device');
				}
				await device.close();
				if(this.debug) {
					console.log('HERE, Closed Device');
				}
				this.emit(this.eventList.DEVICE_CLOSED, data);
				return data;
			} else {
				console.error('Can not find device to close', options);
			}
		}
		return data;
	}

	updateAndSaveScanSelections() {
		/* This is SUPER bad practice!!! */
		this.scanOptions.scanUSB = $("#usb_scan_enabled").is(':checked');
		this.scanOptions.scanEthernet = $("#ethernet_scan_enabled").is(':checked');
		this.scanOptions.scanWiFi = $("#wifi_scan_enabled").is(':checked');
		this.scanOptions.scanEthernetTCP = $("#ethernet_tcp_scan_enabled").is(':checked');
		this.scanOptions.scanWiFiTCP = $("#wifi_tcp_scan_enabled").is(':checked');
		this.scanOptions.enableDemoMode = $("#demo_scan_enabled").is(':checked');
		// After updating these variables, update the persistent data

		let dt = 'ANY';
		let ct = 'ANY';
		let id = 'ANY';
		try {
			dt = this.viewGen.pageElements.device_type_input.ref.val();
			ct = this.viewGen.pageElements.connection_type_input.ref.val();
			id = this.viewGen.pageElements.identifier_input.ref.val();
		} catch(err) {
			console.error('Error getting ref...',err);
		}
		const startupData = {
			'scanOptions': this.scanOptions,
			'advancedScanOptions': this.advancedScanOptions,
			'directConnectParams': {
				dt: dt,
				ct: ct,
				id: id,
				isMockDevice: false,
			},
			'showDirectConnectOptions': this.showDirectConnectOptions,
		};
		return module_manager.saveModuleStartupData('device_selector', startupData);
	}

	saveStartupData(startupData) {
		// console.log('Loaded Startup Data', startupData);
		this.scanOptions = startupData.scanOptions;
		this.advancedScanOptions = startupData.advancedScanOptions;
		this.directConnectParams = startupData.directConnectParams;
		this.showDirectConnectOptions = startupData.showDirectConnectOptions;
	}

	getDefaultStartupData() {
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

	async verifyStartupData(startupData) {
		let isValid = true;

		try {
			// verify the startup data..
			const primaryKeys = Object.keys(startupData);
			const requiredPrimaryKeys = ['scanOptions','advancedScanOptions', 'directConnectParams','showDirectConnectOptions'];
			requiredPrimaryKeys.forEach((requiredPrimaryKey) => {
				if(primaryKeys.indexOf(requiredPrimaryKey) < 0) {
					isValid = false;
				}

				if(requiredPrimaryKey === requiredPrimaryKeys[0]) {
					const secondaryKeys = Object.keys(startupData[requiredPrimaryKey]);
					const reqSecondaryKeys = ['scanUSB', 'scanEthernet', 'scanWiFi','scanEthernetTCP', 'scanWiFiTCP', 'enableDemoMode'];
					reqSecondaryKeys.forEach((reqSecondaryKey) => {
						if(secondaryKeys.indexOf(reqSecondaryKey) < 0) {
							isValid = false;
						}
					});
				}

				if(requiredPrimaryKey === requiredPrimaryKeys[2]) {
					const secondaryKeys = Object.keys(startupData[requiredPrimaryKey]);
					const reqSecondaryKeys = ['dt','ct','id','isMockDevice'];
					reqSecondaryKeys.forEach((reqSecondaryKey) => {
						if(secondaryKeys.indexOf(reqSecondaryKey) < 0) {
							isValid = false;
						}
					});
				}
			});

			if (isValid) {
				// console.log('startupData is valid', startupData);
				return startupData;
			} else {
				// console.warn('startupData is invalid', startupData);
				await module_manager.revertModuleStartupData('device_selector');
				return await module_manager.getModuleStartupData('device_selector');
			}
		} catch(err) {
			// console.log('ERROR', err);
			await module_manager.revertModuleStartupData('device_selector')
			try {
				return await module_manager.getModuleStartupData('device_selector');
			} catch (err) {
				return this.getDefaultStartupData();
			}
		}
	}

	async getStartupData() {
		const startupData = await module_manager.getModuleStartupData('device_selector');
		try {
			await this.verifyStartupData(startupData);
			this.saveStartupData(startupData);
		} catch (err) {
			return this.getDefaultStartupData();
		}
	}

	async startModule(newModule) {
		// console.log('device_selector starting', newModule.name, newModule.id);
		this.moduleData = newModule.data;

		// Cache the page elements
		this.viewGen.cachePageControlElements(newModule.data);

		this.viewGen.onConnect = (param) => this.connectToDevice(param);
		this.viewGen.onDisconnect = (param) => this.disconnectFromDevice(param);

		try {
			// Load the startup-data
			// getStartupData()

			// Load and display cached device scan results
			const cachedScanResults = await this.getCachedListAllDevices();
			await this.viewGen.displayScanResults(cachedScanResults);

			// Don't load and display the cached device scan results because they
			// don't currently  display devices that are open.  Force it to refresh.

			const scanResults = await this.handleInitialDisplayScanResults(cachedScanResults);
			this.emit(this.eventList.MODULE_STARTED, scanResults);
			const data = {
				'name': this.moduleData.name,
			};
			global.MODULE_CHROME.emit('MODULE_READY', data);
			global.MODULE_LOADER.emit('MODULE_READY', data);
		} catch (err) {
			console.error('device_selector failed to start', err);
		}
	}
	stopModule() {
		// console.log('device_selector stopped');
		this.emit(this.eventList.MODULE_STOPPED);
	}

	preLoadStep(newModule) {
		return this.getStartupData()
			.then(() => {
				newModule.context.scanOptions = this.scanOptions;
				newModule.context.advancedScanOptions = this.advancedScanOptions;
				newModule.context.directConnectParams = this.directConnectParams;
				newModule.context.showDirectConnectOptions = this.showDirectConnectOptions;
				// console.log('Finished preLoadStep', newModule.context);
				return newModule;
			});
	}

	unloadStep() {
		return this.updateAndSaveScanSelections();
	}

}

global.activeModule = new ModuleInstance();
