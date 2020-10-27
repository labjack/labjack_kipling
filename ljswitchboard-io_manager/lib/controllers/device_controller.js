'use strict';

const EventEmitter = require('events').EventEmitter;
const constants = require('../common/constants');

const package_loader = global.lj_di_injector.get('package_loader');

const labjack_nodejs = require('labjack-nodejs');
const driver_constants = labjack_nodejs.driver_const;

const io_endpoint_key = constants.device_endpoint_key;

// device creators:
const ljm_device_creator = require('./device_helpers/ljm_device');
const t7_device_creator = require('./device_helpers/t7_device');
const t4_device_creator = require('./device_helpers/t4_device');
const t5_device_creator = require('./device_helpers/t5_device');
const digit_device_creator = require('./device_helpers/digit_device');

// Define a list of functions that aren't implemented by a device helper
// that shouldn't be automatically generated as a "beta" function.
const missing_funcs_to_ignore = [
	'getLatestDeviceErrorsSync', 'configureMockDeviceSync', 'getDevice',
	'declareDeviceDisconnected', 'haltBackgroundOperations',
	'getBufferDataSplitSize', 'waitForDeviceToInitialize',
	'open', 'simpleOpen', 'linkToHandle',
	// 'writeMultiple',
	// 'performMultipleWrites',
	'streamStart', 'streamRead', 'streamReadRaw', 'streamStop',
	'destroy', 'getUnsavedDefaults', 'clearUnsavedDefaults',
	// 'qReadArray',
	'retryFlashError', 'finishFirmwareUpdate', 'restartConnectionManager',
	'prepareForUpgrade', 'internalUpdateFirmware',
	// 'readFlash',
	'internalReadFlash',

	// Get information about the device.
	// 'getRecoveryFirmwareVersion', 'getPrimaryFirmwareVersion', 'getCalibrationStatus',

	// 'readAndEvaluate', ** A cool beta function **
	// 'writeReadAndEvaluate', ** A cool beta function **

	// Lua script functions
	// 'stopLuaScript', 'startLuaScript', 'loadLuaScript',

	// File I/O Functions
	// 'getCWD', 'readdir', 'changeDirectory',
	// 'getDiskInfo', 'readFile', 'getFilePreview', 'deleteFile',

	// More manufacturing info
	// 'readManufacturingInfo',

	// Digit functions
	'digitRead',
	'readHumidity',
	'readTempHumidityLight',
	'readTempLightHumidity',
	'getLogParams',
	'readDigitLoggedData',
	'createWatcher',
	'configureWatcher',
	'getWatchers',
	'stopWatcher',
	'stopAllWatchers'
];

class DeviceController extends EventEmitter {

	constructor() {
		super();

		this.link = null;
		this.devices = null;

		this.eventList = constants.deviceControllerEvents;

	}

	callFunc(func, args) {
		return this.innerCallFunc({
			'func': func,
			'isDeviceFunc': false
		}, args);
	}

	deviceCallFunc(deviceKey, func, args) {
		return this.innerCallFunc({
			'func': func,
			'isDeviceFunc': true,
			'deviceKey': deviceKey
		}, args);
	}

	deviceSendFunc(deviceKey, message) {
		this.send({
			'deviceKey': deviceKey,
			'message': message
		});
	}

	listener(m) {
		if (typeof(m.deviceKey) !== 'undefined'){
			if (this.devices[m.deviceKey]) {
				this.devices[m.deviceKey].oneWayListener(m.message);
			}
		} else if (typeof(m.eventName) !== 'undefined') {
			// console.log('Emitting device_controller event', m.eventName);
			this.emit(m.eventName, m.data);
		} else {
			// this.emit(DEVICE_CONTROLLER_DEVICE_OPENED, newDevice.savedAttributes);
			console.log('- device_controller in listener, message:', m);
		}
	}

	sendMessage(a, b) {
		return this.link.sendMessage(a, b);
	}

	innerCallFunc(a, b) {
		return this.link.callFunc(a, b);
	}

	sendReceive(a, b) {
		return this.link.sendReceive(a, b);
	}

	send(a, b) {
		return this.link.send(a, b);
	}

	async saveLink(link) {
		this.link = link;
	}

	async init() {
		// Initialize the device keeper
		this.devices = {};

		const io_manager = package_loader.getPackage('io_manager');
		const io_interface = io_manager.io_interface();

		const link = await io_interface.establishLink(io_endpoint_key, (param) => this.listener(param));
		await this.saveLink(link);
	}

	testSendMessage() {
		console.log('- device_controller in testSendMessage');
		return this.sendMessage('device_controller sending test message via testSendMessage');
	}

	testSend() {
		console.log('- device_controller in testSend');
		return this.send('device_controller sending test message via testSend');
	}

	/**
	 * Return a commonly acquired set of device attributes commonly used to
	 * generate the header-box of various modules
	 *     isSelected
	 *     isActive
	 *     isLocked
	 *     serialNumber
	 *     deviceType
	 *     hardwareInstalled
	 *     deviceName
	 *     firmwareVersion
	 *     handleInfo (from getHandleInfo)
	 */
	async getDeviceListing(reqFilters, requestdAttributes) {
		try {
			const val = await this.callFunc('getDeviceListing', [reqFilters, requestdAttributes]);
			return val;
		} catch (err) {
		}
	}

	/**
	 * Get a list of devices currently visible by the caller.
	 * @return {Array} An array of found devices and various attributes.
	 */
	listAllDevices(options) {
		return this.callFunc('listAllDevices', [options]);
	}

	getListAllDevicesErrors() {
		return this.callFunc('getListAllDevicesErrors');
	}

	getCachedListAllDevices() {
		return this.callFunc('getCachedListAllDevices');
	}

	enableMockDeviceScanning() {
		return this.callFunc('enableMockDeviceScanning');
	}

	disableMockDeviceScanning() {
		return this.callFunc('disableMockDeviceScanning');
	}

	addMockDevices(deviceInfoArray) {
		return this.callFunc('addMockDevices', [deviceInfoArray]);
	}

	addMockDevice(deviceInfo) {
		return this.callFunc('addMockDevice', [deviceInfo]);
	}

	initializeLogger() {
		return this.callFunc('initializeLogger');
	}

	updateLoggerDeviceListing() {
		return this.callFunc('updateLoggerDeviceListing');
	}

	configureLogger() {
		return this.callFunc('configureLogger');
	}

	// This func configures logger with hard-coded configs for demo
	// purposes.
	configLoggerWithBasicConfigs(cwd, name) {
		return this.callFunc('configLoggerWithBasicConfigs', [cwd, name]);
	}

	startLogger() {
		return this.callFunc('startLogger');
	}

	stopLogger() {
		return this.callFunc('stopLogger');
	}

	getCachedDeviceObject(key) {
		return Promise.resolve(this.devices[key]);
	}

	getDeviceObject(deviceAttributes) {
		if (deviceAttributes.length > 0) {
			const key = deviceAttributes[0].device_comm_key;

			// Return the first found device;
			if (this.devices[key]) {
				return this.getCachedDeviceObject(key);
			} else {
				return this.createDeviceObject(key);
			}
		} else {
			return Promise.resolve();
		}
	}

	getDeviceObjects(deviceAttributes) {
		return new Promise((resolve) => {
			const keys = Object.keys(deviceAttributes);

			// Construct an array of devices
			const promises = deviceAttributes.map((device) => {
				const key = device.device_comm_key;
				if (this.devices[key]) {
					return this.getCachedDeviceObject(key);
				} else {
					return this.createDeviceObject(deviceAttributes[keys[0]]);
				}
			});
			Promise.allSettled(promises)
				.then((results) => {
					const devices = [];
					for (const result of results) {
						if (result.value) {
							devices.push(result.value);
						}
					}
					resolve(devices);
				});
		});
	}

	selectDevice(deviceSerialNumber) {
		// const selectedType = {
		//  'radio': 'Radio',
		//  'Radio': 'Radio',
		//  'RADIO': 'Radio',
		// }[type];
		// if (selectedType) {

		// } else {
		//  selectedType = 'Radio';
		// }
		// const selectType = 'isSelected-' + selectedType;
		const selectType = 'isSelected-Radio';
		const deviceKeys = Object.keys(this.devices);

		deviceKeys.forEach((deviceKey) => {
			const attributes = this.devices[deviceKey].savedAttributes;
			const serialNumber = attributes.serialNumber;
			const newVal = (serialNumber === deviceSerialNumber);
			this.devices[deviceKey].savedAttributes[selectType] = newVal;
		});
		return this.callFunc('selectDevice', [deviceSerialNumber]);
	}

	selectDevices(deviceSerialNumbers) {
		const selectType = 'isSelected-CheckBox';
		const deviceKeys = Object.keys(this.devices);

		// console.log('in selectDevices', deviceSerialNumbers);
		// Update whether the device is selected or not. (locally)
		deviceKeys.forEach((deviceKey) => {
			const attributes = this.devices[deviceKey].savedAttributes;
			const serialNumber = attributes.serialNumber;
			const serialNumberStr = serialNumber.toString();
			// console.log('in selectDevices updating sn', serialNumber, deviceSerialNumbers.indexOf(serialNumberStr));
			const newVal = (deviceSerialNumbers.indexOf(serialNumberStr) >= 0 );
			this.devices[deviceKey].savedAttributes[selectType] = newVal;
		});

		// Update whether the device is selected or not (in the sub-process).
		return this.callFunc('selectDevices', [deviceSerialNumbers]);
	}

	/**
	 * Get first found active device.
	 */
	getSelectedDevice(options) {
		return new Promise((resolve, reject) => {

			const filters = options ? options : {};
			filters['isSelected-Radio'] = true;
			this.getDeviceListing([filters])
				.then(deviceAttributes => this.getDeviceObject(deviceAttributes))
				.then((res) => {
					if (res) {
						resolve(res);
					} else {
						this.getDeviceListing()
							.then(devicesAttributes => this.getDeviceObjects(devicesAttributes))
							.then((res) => {
								if (res.length > 0) {
									// Mark first device as current/active
									const firstSN = res[0].savedAttributes.serialNumber;
									this.selectDevice(firstSN)
										.then(() => {
											this.getDeviceListing([filters])
												.then(deviceAttributes => this.getDeviceObject(deviceAttributes))
												.then(resolve);
										});
								} else {
									// No connected devices
									resolve([]);
								}
							});
					}
				}, reject);
		});
	}

	getSelectedDevices(options) {
		return new Promise((resolve, reject) => {

			const filters = options ? options : {};
			filters['isSelected-CheckBox'] = true;
			this.getDeviceListing([filters])
				.then(devicesAttributes => this.getDeviceObjects(devicesAttributes))
				.then((res) => {
					if (res.length > 0) {
						resolve(res);
					} else {
						this.getDeviceListing()
							.then(devicesAttributes => this.getDeviceObjects(devicesAttributes))
							.then((res) => {
								if (res.length > 0) {
									// Mark first device as current/active
								} else {
									// No connected devices
									resolve([]);
								}
							});
					}
				}, reject);
		});
	}

	/**
	 * Gets the first found device that meets the filters.
	 */
	getDevice(options) {
		return this.getDeviceListing(options)
				.then(deviceAttributes => this.getDeviceObject(deviceAttributes));
	}

	/**
	 * Create several device objects that can be used to talk with the device
	 * manager.
	 */
	getDevices(options) {
		return this.getDeviceListing(options)
			.then(devicesAttributes => this.getDeviceObjects(devicesAttributes));
	}

	/**
	 * Figure out how many devices are currently open
	 */
	getNumDevices() {
		return this.callFunc('getNumDevices');
	}

	/**
	 * This function creates a new device object (T4/T7/Digit) and adds it to the
	 * device_controller device management system.
	**/
	createDeviceObject(deviceInfo) {
		return new Promise((resolve) => {

			const comKey = deviceInfo.device_comm_key;

			let newDevice;
			let deviceCreator;
			// Create device object based on what type of device we just opened
			if (deviceInfo.deviceType === driver_constants.deviceTypes.t7) {
				deviceCreator = t7_device_creator;
			} else if (deviceInfo.deviceType === driver_constants.deviceTypes.t4) {
				deviceCreator = t4_device_creator;
			} else if (deviceInfo.deviceType === driver_constants.deviceTypes.t5) {
				deviceCreator = t5_device_creator;
			} else if (deviceInfo.deviceType === driver_constants.deviceTypes.digit) {
				deviceCreator = digit_device_creator;
			} else {
				console.warn('Creating a non-standard ljm device object', deviceInfo);
				deviceCreator = ljm_device_creator;
			}

			newDevice = new deviceCreator.createDevice(
				deviceInfo,
				(deviceKey, func, args) => this.deviceCallFunc(deviceKey, func, args),
				(deviceKey, message) => this.deviceSendFunc(deviceKey, message),
				(device_comm_key) => this.closeDevice(device_comm_key)
			);

			this.devices[comKey] = newDevice;

			this.devices[comKey].getFunctions()
				.then((functionList) => {
					// print out the functions that are implemented by the device
					// curator.
					// console.log('Created a new device, List of implemented functions!', functionList);
					const missingFunctions = [];
					functionList.forEach((implementedFunction) => {
						const name = implementedFunction.name;
						const attrType = typeof (newDevice[name]);
						if (attrType === 'function') {
							// The function is implemented properly.  I hope...
						} else {
							if (missing_funcs_to_ignore.indexOf(name) < 0) {
								missingFunctions.push(name);

								// Since the function isn't defined, we need to
								// Define the function.
								// We need to generate a string that looks like this:
								// "return this.callFunc('writeDeviceName', [newName]);"
								// According to the docs: http://www.bryanbraun.com/2014/11/27/every-possible-way-to-define-a-javascript-function
								// Hint: Search "Function Constructor w/apply".

								// Function argument names
								const argNames = implementedFunction.argNames;

								// Generate function string
								const funcStr = 'return this.callFunc(\'' + name + '\', [' + argNames.join(',') + ']);';

								// Populate array to construct function with.
								const funcConstructorArray = [];
								argNames.forEach((argName) => {
									funcConstructorArray.push(argName);
								});
								funcConstructorArray.push(funcStr);

								// Create the function
								this.devices[comKey][name] = Function.apply(this.devices[comKey], funcConstructorArray);
							}
						}
					});

					// Print out the list of functions that are being automatically
					// defined.
					// console.log('Created a new device, missing functions are', missingFunctions);
					resolve(newDevice);
				}, () => {
					resolve(newDevice);
				});
			// resolve(newDevice);
		});
	}

	/**
	 * Open a connection to a device, pass an options object containing:
	 * @options {object}
	 *          'deviceType': 'LJM_dtANY',
	 *          'connectionType': 'LJM_ctANY',
	 *          'identifier': 'LJM_idANY'
	 */
	async openDevice(options) {
		const deviceInfo = await this.callFunc('openDevice', [options]);
		return await this.createDeviceObject(deviceInfo);
	}

	/**
	 * Close a connection to a device. Uses deleteDeviceReference helper
	 * function to do the actual deleting of the device reference.
	 */
	deleteDeviceReference(closeResult) {
		return new Promise((resolve, reject) => {
			const device_comm_key = closeResult.comKey;
			if (this.devices[device_comm_key]) {
				// Delete the device reference from the local devices listing.
				this.devices[device_comm_key] = null;
				this.devices[device_comm_key] = undefined;
				delete this.devices[device_comm_key];
				resolve(closeResult);
			} else {
				reject('invalid device_comm_key dev_con dDR');
			}
		});
	}

	closeDeviceRef(device) {
		const comKey = device.savedAttributes.device_comm_key;
		return this.closeDevice(comKey);
	}

	closeDevice(device_comm_key) {
		return new Promise((resolve, reject) => {

			// Make sure that the device being closed is actually a device.
			if (this.devices[device_comm_key]) {
				// Send the close command to the sub-process.
				this.deviceCallFunc(device_comm_key, 'close')
					.then(closeResult => this.deleteDeviceReference(closeResult), closeResult => this.deleteDeviceReference(closeResult))
					.then(resolve, reject);
			} else {
				reject('invalid device_comm_key dev_con cD');
			}
		});
	}

	/**
	 * Closes all connected devices.
	 */
	closeAllDevices() {
		return new Promise((resolve) => {
			this.callFunc('closeAllDevices')
				.then((res) => {
					const keys = Object.keys(this.devices);
					keys.forEach(closeResult => this.deleteDeviceReference(closeResult));
					resolve(res);
				});
		});
	}
}

exports.createNewDeviceController = DeviceController;
