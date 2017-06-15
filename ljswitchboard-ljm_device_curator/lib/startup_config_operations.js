
var q = require('q');
var fs = require('fs');
var path = require('path');
var async = require('async');
var modbusMap = require('ljswitchboard-modbus_map').getConstants();
var driver_const = require('ljswitchboard-ljm_driver_constants');

var DEBUG_STARTUP_CONFIG_OPS = false;
var DEBUG_READ_CONFIG_OP = false;
var DEBUG_WRITE_CONFIG_OP = false;
var ENABLE_ERROR_OUTPUT = true;

// Set to true to perform device writes.  If it is false 
// the write functions will automatically resolve and not execute to prevent
// un-necessary flash chip wear.
var ENABLE_DEVICE_WRITES = true;

function getLogger(bool) {
	return function logger() {
		if(bool) {
			console.log.apply(console, arguments);
		}
	};
}

var debugSC = getLogger(DEBUG_STARTUP_CONFIG_OPS);
var debugRC = getLogger(DEBUG_READ_CONFIG_OP);
var debugWC = getLogger(DEBUG_WRITE_CONFIG_OP);
var errorLog = getLogger(ENABLE_ERROR_OUTPUT);

/*
 * Basic flash address keys, locations (offsets), and lengths are
 * documented on this basecamp page:
 * https://basecamp.com/1764385/projects/34645/documents/767398
 * 
 * Information that might be relevant to saving/restoring device settings:
 * StartupPowerSettings
 *     Address: 0x3BF000
 * Startup Settings
 *     Description:
 *     Key: 0x0D08CAEA
 *     Address: 0x3C0000
 *     Length: 0x001000
 * Device Config Settings
 *     Description:
 *     Key: 0x9CDD28F7
 *     Address: 0x3C1000
 *     Length: 0x001000
 * Comm Settings
 *     Description:
 *     Key: 0x2C69E1CE
 *     Address: 0x3C2000
 *     Length: 0x001000
 * Device Info
 *     Description:
 *     Key: 0x552684BA
 *     Address: 0x3C3000
 *     Length: 0x001000
 * 
*/

var validConfigOptions = [
	'RequiredInfo', // power_x_default registers
	'StartupSettings', // DIO states & directions, DIO_EF clock configs, DIO_EF configs, AIN settings, DAC Voltages
	'CommSettings', // Ethernet, WiFi, SSID settings.
	'AIN_EF_Settings', // AIN_EF settings.
];

var KEY_REGISTERS = {
	'T7': {
		'RequiredInfo': {			'registers': ['PRODUCT_ID', 'FIRMWARE_VERSION']},
		'StartupPowerSettings': {	'registers': ['POWER_ETHERNET_DEFAULT', 'POWER_WIFI_DEFAULT', 'POWER_AIN_DEFAULT', 'POWER_LED_DEFAULT']},
	},
	'T4': {
		'RequiredInfo': {			'registers': ['PRODUCT_ID', 'FIRMWARE_VERSION']},
		'StartupPowerSettings': {	'registers': ['POWER_ETHERNET_DEFAULT', 'POWER_WIFI_DEFAULT', 'POWER_AIN_DEFAULT', 'POWER_LED_DEFAULT']},
	}
};

var FLASH_ADDRESSES = {
	'T7': {
		'UserAndWebSpace': {		'address': 0x000000,	'key': 0x6615E336,	'length': 0x200000,		},
		'ExtFirmwareImage': {		'address': 0x200000,	'key': 0x6A0902B5,	'length': 0x080000,		},
		'ExtFirmwareImgInfo': {		'address': 0x380000,	'key': 0xDCA6AD50,	'length': 0x001000,		},
		'IntFirmwareImgInfo': {		'address': 0x381000,	'key': 0xF0B17AC5,	'length': 0x001000,		},
		'EmerFirmwareImgInfo': {	'address': 0x382000,	'key': 0xB6337A1E,	'length': 0x001000,		},
		'UpgradeLog': {				'address': 0x383000,	'key': 0x5877D2EF,	'length': 0x001000,		},
		// 'StartupPowerSettings': {	'address': 0x3BF000,	'key': 0x0,			'length': 0x001000,		}, // Not writeable via standard flash writes.
		'StartupSettings': {		'address': 0x3C0000,	'key': 0x0D08CAEA,	'length': 0x001000,		},
		'DeviceConfig': {			'address': 0x3C1000,	'key': 0x9CDD28F7,	'length': 0x001000,		},
		'CommSettings': {			'address': 0x3C2000,	'key': 0x2C69E1CE,	'length': 0x001000,		},
		'DeviceInfo': {				'address': 0x3C3000,	'key': 0x552684BA,	'length': 0x001000,		},
		'CalValues': {				'address': 0x3C4000,	'key': 0xA7863777,	'length': 0x001000,		},
		'SWDTSettings': {			'address': 0x3C5000,	'key': 0x94D42492,	'length': 0x001000,		},
		'ManufacturingInfo': {		'address': 0x3C6000,	'key': 0x258E3701,	'length': 0x001000,		}, // 8*8 ints. Only uses 0x100.
		'CalibrationInfo': {		'address': 0x3C7000,	'key': 0x43A24C42,	'length': 0x001000,		},
		// 'DeviceName': {				'address': 0x3C8000,	'key': 0x1CE2FB72,	'length': 0x001000,		}, // Not writeable via standard flash writes.
		//S1W_DEV_Settings
		'NTP_Settings': {			'address': 0x3CC000,	'key': 0x6D9DFA03,	'length': 0x001000,		},
		'AIN_EF_Settings': {		'address': 0x3CD000,	'key': 0x27EB26E7,	'length': 0x002000,		},
		// 'Lua_Script': {				'address': 0x3D0000,	'key': 0x0,			'length': 0x010000,		}, // Not writeable via standard flash writes.
		'EmerFirmwareImage': {		'address': 0x3E0000,	'key': 0xCD3D7F15,	'length': 0x020000,		},
	},
	'T4': {
		'UserAndWebSpace': {		'address': 0x000000,	'key': 0x6615E336,	'length': 0x200000,		},
		'ExtFirmwareImage': {		'address': 0x200000,	'key': 0x6A0902B5,	'length': 0x080000,		},
		'ExtFirmwareImgInfo': {		'address': 0x380000,	'key': 0xDCA6AD50,	'length': 0x001000,		},
		'IntFirmwareImgInfo': {		'address': 0x381000,	'key': 0xF0B17AC5,	'length': 0x001000,		},
		'EmerFirmwareImgInfo': {	'address': 0x382000,	'key': 0xB6337A1E,	'length': 0x001000,		},
		'UpgradeLog': {				'address': 0x383000,	'key': 0x5877D2EF,	'length': 0x001000,		},
		// 'StartupPowerSettings': {	'address': 0x3BF000,	'key': 0x0,			'length': 0x001000,		}, // Not writeable via standard flash writes.
		'StartupSettings': {		'address': 0x3C0000,	'key': 0x0D08CAEA,	'length': 0x001000,		},
		'DeviceConfig': {			'address': 0x3C1000,	'key': 0x9CDD28F7,	'length': 0x001000,		},
		'CommSettings': {			'address': 0x3C2000,	'key': 0x2C69E1CE,	'length': 0x001000,		},
		'DeviceInfo': {				'address': 0x3C3000,	'key': 0x552684BA,	'length': 0x001000,		},
		'CalValues': {				'address': 0x3C4000,	'key': 0xA7863777,	'length': 0x001000,		},
		'SWDTSettings': {			'address': 0x3C5000,	'key': 0x94D42492,	'length': 0x001000,		},
		'ManufacturingInfo': {		'address': 0x3C6000,	'key': 0x258E3701,	'length': 0x001000,		},
		'CalibrationInfo': {		'address': 0x3C7000,	'key': 0x43A24C42,	'length': 0x001000,		},
		// 'DeviceName': {				'address': 0x3C8000,	'key': 0x1CE2FB72,	'length': 0x001000,		},
		//S1W_DEV_Settings
		'NTP_Settings': {			'address': 0x3CC000,	'key': 0x6D9DFA03,	'length': 0x001000,		},
		'AIN_EF_Settings': {		'address': 0x3CD000,	'key': 0x27EB26E7,	'length': 0x002000,		},
		// 'Lua_Script': {				'address': 0x3D0000,	'key': 0x0,			'length': 0x010000,		}, // Not writeable via standard flash writes.
		'EmerFirmwareImage': {		'address': 0x3E0000,	'key': 0xCD3D7F15,	'length': 0x020000,		},
	}
};

function calcNumPagesFromLength (length) {
	var numPages = Math.ceil(length/driver_const.T7_FLASH_PAGE_SIZE);
	return numPages;
}

function getStartupConfigOperations(self) {

	function getReadOptionOperation(option) {
		debugRC('in getReadOptionOperation', self.savedAttributes.deviceTypeName);
		var dt = self.savedAttributes.deviceTypeName;
		var isValid = false;
		if(validConfigOptions.indexOf(option) >= 0) {
			isValid = true;
		}
		// readFlash(startAddress, length)
		// iRead(address)
		// iReadMany(addresses)
		var operation = {
			'isValid': isValid,
			'operationName': option,
			'type': '',
			'functionName': '',
			'args': [],
			'isError': false,
			'error': undefined,
			'errorCode': 0,
			'result': undefined,
		};
		if(isValid) {
			// Check to see if the option should be read from/written to using flash operations.
			if(typeof(FLASH_ADDRESSES[dt][option]) !== 'undefined') {
				operation.type = 'flash';
				operation.functionName = 'readFlash';
				var flashAddress = FLASH_ADDRESSES[dt][option].address;
				var flashLength = FLASH_ADDRESSES[dt][option].length/4;
				operation.args = [flashAddress, flashLength];
			} else if(typeof(KEY_REGISTERS[dt][option]) !== 'undefined') {
				operation.type = 'registers';
				operation.functionName = 'iReadMany';
				operation.args = [KEY_REGISTERS[dt][option].registers];
			} else {
				operation.isValid = false;
			}
		}
		return operation;
	}
	
	function createReadConfigsBundle(options) {
		var bundle = {
			'readOperations': [],
			'validResults': [],
			'isError': false,
			'errorStep': '',
			'error': undefined,
			'errorCode': 0,
		};

		if(typeof(options) !== 'undefined') {
			options.forEach(function(option) {
				var readOperation = getReadOptionOperation(option);
				if(readOperation.isValid) {
					bundle.readOperations.push(readOperation);
				}
			});
		}
		debugRC('read operations:', bundle.readOperations.length);
		bundle.readOperations.forEach(function(op) {
			debugRC(' - ', op.operationName);
		});
		return bundle;
	}

	function innerReadConfigs(bundle) {
		var defered = q.defer();
		debugRC(' in innerReadConfigs');
		async.eachSeries(
			bundle.readOperations,
			function executeReadOps (operation, cb) {
				debugRC('Executing operation', operation.operationName, operation.type, operation.isValid);
				var func = operation.functionName;
				var args = operation.args;

				function onSuccess(data) {
					if(func === 'readFlash') {
						debugRC('Executed operation (flash)', operation.operationName, func);
						operation.result = data.results;
					} else if(func === 'iReadMany') {
						debugRC('Executed operation (regs)', operation.operationName, func);
						var results = data;
						var dataToSave = [];
						results.forEach(function(result) {
							dataToSave.push({'reg': result.name, 'res': result.val});
						});
						operation.result = dataToSave;
					}
					cb();
				}
				function onError(err) {
					debugRC('! Error Executing operation', operation.operationName);
					operation.isError = true;
					operation.error = err;
					bundle.errorStep = 'executingWriteOperations-' + operation.operationName;
					// TODO: Populate operation.errorCode to be a non-zero value.
					cb();
				}
				try{
					self[func].apply(undefined, args)
					.then(onSuccess)
					.catch(onError);
				} catch(err) {
					console.error('Error executing function...', err);
					bundle.isError = true;
					bundle.errorStep = 'executeWriteOperations-funcExec';
					bundle.error = err;
					bundle.errorCode = 0;
					cb();
				}
			},
			function finishedReadOps (err) {
				// debugRC('Executed all operations', bundle.readOperations);

				// Organize results and determine if overall operation was successful.
				bundle.readOperations.forEach(function(operation) {
					if(operation.isError) {
						// We detected an error.  Indicate that the overall operation failed.
						bundle.isError = true;
						bundle.errorStep = operation.operationName;
						bundle.error = operation.error;
						bundle.errorCode = operation.errorCode;
					} else {
						bundle.validResults.push({
							'group': operation.operationName,
							'type': operation.type,
							'data': operation.result,
						});
					}
				});
				var numOperations = bundle.readOperations.length;
				var numSuccessOperations = bundle.validResults.length;
				debugRC('Executed all operations % successful:', (numSuccessOperations/numOperations*100).toFixed(2));
				defered.resolve(bundle);
			}
		);
		return defered.promise;
	}

	/*
	 * Options: Array of strings.  Each string is a flash address name that correlates to what needs to be read
	 * from flash.
	 * 
	 * ex: var options = ['UserAndWebSpace', 'DeviceConfig, 'DeviceInfo'];
	*/
	this.readConfigs = function(userOptions) {
		debugSC('in readConfigs');
		var defered = q.defer();

		var options = ['RequiredInfo'];
		userOptions.forEach(function(userOption) {
			if(userOption !== 'RequiredInfo') {
				options.push(userOption);
			}
		});

		var bundle = createReadConfigsBundle(options);
		function onSuccess(resBundle) {
			debugSC('in readConfigs onSuccess');
			if(resBundle.isError) {
				defered.reject({
					'isError': resBundle.isError,
					'errorStep': resBundle.errorStep,
					'error': resBundle.error,
					'errorCode': resBundle.errorCode,
				})
			} else {
				defered.resolve(resBundle.validResults);
			}
		}
		function onError(errBundle) {
			debugSC('in readConfigs onError');
			defered.reject({
				'isError': errBundle.isError,
				'errorStep': errBundle.errorStep,
				'error': errBundle.error,
				'errorCode': errBundle.errorCode,
			})
		}

		innerReadConfigs(bundle)
		.then(onSuccess)
		.catch(onError);

		return defered.promise;
	};

	/*
	 * option is an object with three properties (ref: "finishedReadOps"):
	 * group: (string) that indicates the operation name reference these defined variables:
	 *     validConfigOptions, KEY_REGISTERS, FLASH_ADDRESSES
	 * type: (string) that indicates the operation type "flash" or "registers".
	 *     Ref. function "getReadOptionOperation"
	 * data: array of numbers (uint32 sized) or object that is: {'reg': result.name, 'res': result.val}
	*/
	function getWriteOptionOperation(option) {
		debugWC('in getWriteOptionOperation', self.savedAttributes.deviceTypeName);
		var dt = self.savedAttributes.deviceTypeName;
		var isValid = false;
		if(validConfigOptions.indexOf(option.group) >= 0) {
			isValid = true;
		}
		
		var operationName = option.group;
		var operationType = option.type;
		var operationData = option.data;


		// writeFlash(startAddress, length, size, key, data)
		// iWrite(address, value)
		// iWriteMany(addresses, values)
		// eraseFlash(startAddress, numPages, key)
		var operation = {
			'isValid': isValid,
			'operationName': option.group,
			'type': '',
			'functionName': '',
			'args': [],
			'executeEraseOp': false,
			'eraseFuncName': '',
			'eraseArgs': [],
			'isError': false,
			'error': undefined,
			'errorCode': 0,
			'result': undefined,
		};

		if(isValid) {
			// Check to see if the option should be read from/written to using flash operations.
			if(typeof(FLASH_ADDRESSES[dt][operationName]) !== 'undefined') {
				debugWC('Detected a flash write operation');
				operation.type = 'flash';
				operation.functionName = 'writeFlash';
				var flashAddress = FLASH_ADDRESSES[dt][operationName].address;
				var flashWriteSize = driver_const.T7_FLASH_BLOCK_WRITE_SIZE;
				var flashKey = FLASH_ADDRESSES[dt][operationName].key;
				var expectedLength = FLASH_ADDRESSES[dt][operationName].length/4;
				var actualLength = operationData.length;
				if(expectedLength != actualLength) {
					console.log('HERE!!!',expectedLength, actualLength);
					// If the expected length isn't the actual length of the data being
					// written then we likely have issues with this data....
					operation.isValid = false;
					operation.isError = true;
					operation.error = 'Data being written to "' + operationName + '" is invalid.  ';
					operation.error += 'Expected Length: ' + expectedLength.toString() + '.  ';
					operation.error += 'Actual Length: ' + actualLength.toString() + '.  ';
				}
				operation.args = [flashAddress, expectedLength, flashWriteSize, flashKey, option.data];

				// Add data for flash erase operation.
				operation.executeEraseOp = true;
				operation.eraseFuncName = 'eraseFlash';
				var numPages = calcNumPagesFromLength(expectedLength);
				operation.eraseArgs = [flashAddress, numPages, flashKey];

				debugWC('Created a flash write operation', flashAddress.toString(16), expectedLength, flashWriteSize, flashKey.toString(16), option.data.length);
			} else if(typeof(KEY_REGISTERS[dt][operationName]) !== 'undefined') {
				debugWC('Detected a register write operation');
				operation.type = 'registers';
				operation.functionName = 'iWriteMany';
				var registers = [];
				var values = [];
				operationData.forEach(function(registerObj) {
					registers.push(registerObj.reg);
					values.push(registerObj.res);
				});
				operation.args = [registers, values];
				debugWC('Created a register write operation');
			} else {
				debugWC('Operation is not found!', dt, operationName);
				operation.isValid = false;
			}
		}
		debugWC('Created a write operation', operation.operationName, operation.type, operation.isValid);
		if(!operation.isValid) {
			debugWC('Error info', operation.isError, operation.error);
		}
		return operation;
	}

	function getEraseFlashOperation(writeFlashOperation) {
		var operation = {
			'isValid': writeFlashOperation.isValid,
			'operationName': writeFlashOperation.operationName,
			'type': writeFlashOperation.type,
			'functionName': writeFlashOperation.eraseFuncName,
			'args': writeFlashOperation.eraseArgs,
			'isError': false,
			'error': undefined,
			'errorCode': 0,
			'result': undefined,
		};
		return operation;
	}

	function createWriteConfigsBundle(deviceConfigs) {
		debugWC('in createWriteConfigsBundle', self.savedAttributes.deviceTypeName);

		var bundle = {
			// Variables used to determine if data should be written to device.
			'requiredProductID': 0,
			'requiredFirmwareVersion': 0,
			'currentProductID': 99,
			'currentFirmwareVersion': 99,
			'writeDataToDevice': false,

			// Variables used to store data being written to device & results.
			'writeOperations': [],
			'validResults': [],

			// Variables used to determine if write was successful.
			'isError': false,
			'errorStep': '',
			'error': undefined,
			'errorCode': 0,
		};

		if(typeof(deviceConfigs) !== 'undefined') {
			deviceConfigs.forEach(function(config) {
				// check to see if the config is 'RequiredInfo' which contains the
				// required Product ID and FW version.
				if(config.group === 'RequiredInfo') {
					debugWC('Organizing required info');
					config.data.forEach(function(registerData) {
						if(registerData.reg === 'FIRMWARE_VERSION') {
							bundle.requiredFirmwareVersion = registerData.res;
						} else if(registerData.reg === 'PRODUCT_ID') {
							bundle.requiredProductID = registerData.res;
						}
					});
				} else {
					debugWC('Executing getWriteOptionOperation');
					// Parse the configuration into a write operation & make sure it is valid.
					var writeOperation = getWriteOptionOperation(config);

					// Only add the operation if it is valid.
					if(writeOperation.isValid) {
						if(writeOperation.type === 'flash') {
							var eraseOperation = getEraseFlashOperation(writeOperation);
							bundle.writeOperations.push(eraseOperation);
						}
						bundle.writeOperations.push(writeOperation);
					}
				}
			});
		}

		debugWC('Write Operations:', bundle.writeOperations.length);
		bundle.writeOperations.forEach(function(op) {
			debugWC(' - op.operationName');
		});
		return bundle;
	}

	function readRequiredDeviceInfo(bundle) {
		var defered = q.defer();
		debugWC('in readRequiredDeviceInfo');
		function onSuccess(registers) {
			registers.forEach(function(register) {
				if(register.name === 'FIRMWARE_VERSION') {
					bundle.currentFirmwareVersion = register.val;
				} else if(register.name === 'PRODUCT_ID') {
					bundle.currentProductID = register.val;
				}
			});
			defered.resolve(bundle);
		}
		function onError(err) {
			bundle.isError = true;
			bundle.errorStep = 'readRequiredDeviceInfo';
			bundle.error = err;
			bundle.errorCode = 0;
			defered.resolve(bundle);
		}

		var dt = self.savedAttributes.deviceTypeName;
		var requiredRegisters = KEY_REGISTERS[dt].RequiredInfo.registers;
		self.iReadMany(requiredRegisters)
		.then(onSuccess)
		.catch(onError);
		return defered.promise;
	}
	function validateProductIDAndFirmware(bundle) {
		var defered = q.defer();
		var infoIsValid = true;
		debugWC('in validateProductIDAndFirmware');
		if(bundle.currentFirmwareVersion != bundle.requiredFirmwareVersion) {
			infoIsValid = false;
			bundle.error = 'Configs are intended for FW version: ' + bundle.requiredFirmwareVersion.toString();
		}
		if(bundle.currentProductID != bundle.requiredProductID) {
			infoIsValid = false;
			bundle.error = 'Configs are intended for PRODUCT_ID version: ' + bundle.requiredProductID.toString();
		}

		if(!infoIsValid) {
			bundle.isError = true;
			bundle.errorStep = 'validateProductIDAndFirmware-funcExec';
			bundle.errorCode = 0;
		}
		bundle.writeDataToDevice = infoIsValid;
		defered.resolve(bundle);
		return defered.promise;
	}
	function executeWriteOperations(bundle) {
		var defered = q.defer();
		debugWC('in executeWriteOperations');

		if(bundle.writeDataToDevice) {
			debugWC('Device Info',
				bundle.currentFirmwareVersion,
				bundle.requiredFirmwareVersion,
				bundle.currentProductID,
				bundle.requiredProductID
			);
			async.eachSeries(
				bundle.writeOperations,
				function executeWriteOps (operation, cb) {
					var func = operation.functionName;
					var args = operation.args;
					debugWC('Executing write operation', operation.operationName, func);
					
					function onSuccess(data) {
						debugWC('Finished write operation', operation.operationName);
						bundle.validResults.push({
							'operation': operation.operationName,
							'result': data
						});
						cb();
					}
					function onError(err) {
						debugWC('Failed write operation', operation.operationName, err);
						errorLog('Failed write operation', operation.operationName, err);
						bundle.isError = true;
						bundle.errorStep = 'executingWriteOperations-' + operation.operationName;
						bundle.error = err;
						cb();
					}

					try {
						if(!ENABLE_DEVICE_WRITES) {
							console.log('NOT WRITING DATA, TEST MODE!! will call func:', func);
							onSuccess({'testResult': 1});
						} else {
							self[func].apply(undefined, args)
							.then(onSuccess)
							.catch(onError);
							// if(func === 'writeFlash') {
							// 	self.writeFlash(args[0], args[1], args[2], args[3], args[4])
							// 	.then(onSuccess)
							// 	.catch(onError);
							// } else {
							// 	self[func].apply(undefined, args)
							// 	.then(onSuccess)
							// 	.catch(onError);
							// }
						}
					} catch(err) {
						console.error('Error executing function...', err);
						bundle.isError = true;
						bundle.errorStep = 'executeWriteOperations-funcExec';
						bundle.error = err;
						bundle.errorCode = 0;
						cb();
					}
				},
				function finishedWriteOps (err) {
					debugWC('Finished All Write Operations');
					var numSuccessfulOperations = bundle.validResults.length;
					var numOperations = bundle.writeOperations.length;
					debugWC('Executed all operations % successful:', (numSuccessfulOperations/numOperations*100).toFixed(2));
					defered.resolve(bundle);
				}
			);
		} else {
			debugWC('Invalid Required Device Info',
				bundle.currentFirmwareVersion,
				bundle.requiredFirmwareVersion,
				bundle.currentProductID,
				bundle.requiredProductID
			);
			defered.resolve(bundle);
		}
		return defered.promise;
	}

	function innerWriteConfigs(bundle) {
		debugWC('in innerWriteConfigs', self.savedAttributes.deviceTypeName);

		/*
		 * In order to write data we must do the following:
		 * 1. Read the device to check its Product ID and FW currentFirmwareVersion.
		 * 2. Check to make sure that the P-ID & FW are the same as saved in the data being
		 * uploaded.
		 * 3. Write data to the device.
		 */
		 return readRequiredDeviceInfo(bundle)
		.then(validateProductIDAndFirmware)
		.then(executeWriteOperations);
	}

	

	/* 
	 * data: Array of objects that need to be written to the device.
	 * [{'group': [groupName], 'type': 'flash'/'registers', 'data': [array of ints]/[array of objects Reg & value]}]
	*/
	this.writeConfigs = function(deviceConfigs) {
		debugSC('in writeConfigs');
		var defered = q.defer();
		var bundle = createWriteConfigsBundle(deviceConfigs);

		function onSuccess(resBundle) {
			debugSC('in writeConfigs onSuccess');
			if(resBundle.isError) {
				defered.reject({
					'isError': resBundle.isError,
					'errorStep': resBundle.errorStep,
					'error': resBundle.error,
					'errorCode': resBundle.errorCode,
				});
			} else {
				defered.resolve(resBundle.validResults);
			}
		}
		function onError(errBundle) {
			debugSC('in writeConfigs onError');
			defered.reject({
				'isError': errBundle.isError,
				'errorStep': errBundle.errorStep,
				'error': errBundle.error,
				'errorCode': errBundle.errorCode,
			})
		}

		innerWriteConfigs(bundle)
		.then(onSuccess)
		.catch(onError);

		return defered.promise;
	};

	

	
}

module.exports.get = getStartupConfigOperations;