/**
 * Wraps an LJM handle with all LabJack device functionality.
 *
 * @author Chris Johnson (chrisjohn404, LabJack Corp.)
**/

const ref = require('ref-napi');
const util = require('util');
const driverLib = require('./driver_wrapper');

const ljnDriverLib = require('./driver');
const allocBuffer = require('allocate_buffer').allocBuffer;


const jsonConstants = require('ljswitchboard-modbus_map');
const driver_const = require('ljswitchboard-ljm_driver_constants');


// var ARCH_INT_NUM_BYTES = 4;
// var ARCH_DOUBLE_NUM_BYTES = 8;

// var ARCH_POINTER_SIZE = {
//     'ia32': 4,
//     'x64': 8,
//     'arm': 4
// }[process.arch]
var ARCH_INT_NUM_BYTES = driver_const.ARCH_INT_NUM_BYTES;
var ARCH_DOUBLE_NUM_BYTES = driver_const.ARCH_DOUBLE_NUM_BYTES;
var ARCH_POINTER_SIZE = driver_const.ARCH_POINTER_SIZE;


/**
 * Create a new DriverOperationError object.
 *
 * Create a new DriverOperationError which encapsulates the code of an error
 * encountered within driver code. This is an error thrown by LJM, not from
 * labjack-nodejs.
 *
 * @param {Number} code The raw / uinterpreted error code from LJM.
**/
function DriverOperationError(code)
{
	this.code = code;
	this.message = code;
}
util.inherits(DriverOperationError, Error);
DriverOperationError.prototype.name = 'Driver Operation Error - device';


/**
 * Create a new DriverInterfaceError object.
 *
 * Create a new DriverInterfaceError which encapsulates the code of an error
 * encountered while communicating with the driver. This is an error thrown by
 * labjack-nodejs, not within driver code.
 *
 * @param {String/Number} description The integer error code or string
 *		description of the error encountered.
**/
function DriverInterfaceError(description) {
	this.description = description;
	this.message = description;
}
util.inherits(DriverInterfaceError, Error);
DriverInterfaceError.prototype.name = 'Driver Interface Error - device';

// A numeric that keeps track of the number of devices that have been created;
let numCreatedDevices = 0;
exports.getNumCreatedDevices = function() {
	return numCreatedDevices;
};

/**
 * Create a new LabJack device handle wrapper.
 *
 * @constructor for a LabJack device in .js
 */
exports.labjack = function (ljmOverride) {
	if(typeof(ljmOverride) !== 'undefined') {
		this.ljm = ljmOverride;
	} else {
		this.ljm = driverLib.getDriver();
	}
	this.ljnd = new ljnDriverLib.ljmDriver(this.ljm);
	numCreatedDevices += 1;
	this.handle = null;
	this.deviceType = null;

	//Saves the Constants object
	this.constants = jsonConstants.getConstants();
    this.errors = this.constants.errorsByName;

	this.isHandleValid = false;

	function wrapUserFunction(userFunction) {
		function persistentFunction(a, b, c, d) {
			try {
				if(self.isHandleValid) {
					if(userFunction) {
						userFunction(a, b, c, d);
					} else {
						console.error('function not defined', arguments);
					}
				} else {
					console.error('Preventing execution of callback when handle is not valid,', typeof(userFunction));
					console.trace();
				}
			} catch(err) {
				console.error('Error calling userFunction', err);
			}
		};
		return persistentFunction;
	};

	function wrapOpenCloseCallbacks(userFunction) {
		function persistentFunction(a, b, c, d) {
			if(userFunction) {
				userFunction(a, b, c, d);
			} else {
				console.error('function not defined', arguments);
			}
		};
		return persistentFunction;
	};

//******************************************************************************
//************************* Opening A Device ***********************************
//******************************************************************************

	/**
	 * Opens a new devDriverInterfaceErrorice if it isn't already connected.
	 *
	 * @param {Number/String} deviceType Optional integer or String parameter
	 *		from driver_const.js file defining which model of LabJack to open.
	 *		If not specified, defaults to "LJM_dtANY".
	 * @param {Number/String} connectionType Optional integer or String
	 *		parameter from driver_const.js file defining how to connect to
	 *		the device (ex: USB, Ethernet, WiFi). If not specified, defaults to
	 *		"LJ_ctANY".
	 * @param {String} identifier Optional parameter that allows selective
	 *		opening of a device based on a unique identifier (either string IP
	 *		address or integer serialNumber). If not specified, defaults to
	 *		"LJM_idANY".
	 * @param {function} onError function Callback for error-case.
	 * @param {function} onSuccess function Callback for success-case.
	 * @throws {DriverInterfaceError} if there are any un-recoverable errors
	**/
	this.open = function() {
		//Variables to save information to allowing for open(onError, onSuccess)
		let deviceType, connectionType, identifier, onError, onSuccess;

		//Determine how open() was used
		if(arguments.length == 2) {
			//If there are two args, aka open(onError, onSuccess) call

			let argA = typeof(arguments[0]);
			let argB = typeof(arguments[1]);

			//Make sure the first two arg's are onError and onSuccess
			if((argA == "function") && (argB == "function")) {
				deviceType = "LJM_dtANY";
				connectionType = "LJM_ctANY";
				identifier = "LJM_idANY";
				onError = arguments[0];//move the onError function
				onSuccess = arguments[1];//move the onSuccess function
			} else {
				throw new DriverInterfaceError("Invalid Open Call");
			}
		}
		else if(arguments.length == 5) {
			//Save the various input parameters
			deviceType = arguments[0];
			connectionType = arguments[1];
			identifier = arguments[2];
			onError = arguments[3];
			onSuccess = arguments[4];
		} else {
			throw new DriverInterfaceError("Invalid Open Call");
		}

		onError = wrapOpenCloseCallbacks(onError);
		onSuccess = wrapOpenCloseCallbacks(onSuccess);

		//Complete Asynchronous function-call,
		//Make sure we aren't already connected to a device
		if(self.handle === null) {
			//Create variables for the ffi call
			let refDeviceHandle = new ref.alloc(ref.types.int,1);
			let output;

			//Get the type's of the inputs
			let dtType = isNaN(deviceType);
			let ctType = isNaN(connectionType);
			let idType = isNaN(identifier);

			if(dtType) {
				dtType = "string";
			} else {
				deviceType = parseInt(deviceType, 10);
				dtType = "number";
			}
			if(ctType) {
				ctType = "string";
			} else {
				connectionType = parseInt(connectionType, 10);
				ctType = "number";
			}
			if(idType) {
				idType = "string";
			} else {
				// Handle the serial number being parsed as a number
				identifier = identifier.toString();
				idType = "string";
			}

			//Function for handling the ffi callback
			function handleResponse(err, res) {
				if(err) {
					return onError('Weird Error open', err);
				}
				//Check for no errors
				if(res === 0) {
					//Save the handle & other information to the 
					//	device class
					self.handle = refDeviceHandle.readInt32LE(0);
					self.deviceType = deviceType;
					self.connectionType = connectionType;
					self.identifier = identifier;
					self.isHandleValid = true;
					return onSuccess();
				} else {
					//Make sure that the handle, deviceType 
					//		& connectionType are still null
					self.handle = null;
					self.deviceType = null;
					self.connectionType = null;
					self.identifier = null;
					return onError(res);
				}
			};

			//Determine which LJM function to call
			if((dtType=="number")&&(ctType=="number")&&(idType=="string")) {
				//call LJM_Open() using the ffi async call
				output = self.ljm.LJM_Open.async(
					deviceType,
					connectionType,
					identifier,
					refDeviceHandle,
					handleResponse
				);
			} else if((dtType=="number")&&(ctType=="string")&&(idType=="string")) {
				// convert connectionType to a number
				connectionType = driver_const.connectionTypes[connectionType];
				//call LJM_OpenS() using the ffi async call
				output = self.ljm.LJM_Open.async(
					deviceType,
					connectionType,
					identifier,
					refDeviceHandle,
					handleResponse
				);
			} else if((dtType=="string")&&(ctType=="number")&&(idType=="string")) {
				// convert deviceType to a number
				deviceType = driver_const.deviceTypes[deviceType];
				//call LJM_OpenS() using the ffi async call
				output = self.ljm.LJM_Open.async(
					deviceType,
					connectionType,
					identifier,
					refDeviceHandle,
					handleResponse
				);
			} else if((dtType=="string")&&(ctType=="string")&&(idType=="string")) {
				//call LJM_OpenS() using the ffi async call
				output = self.ljm.LJM_OpenS.async(
					deviceType,
					connectionType,
					identifier,
					refDeviceHandle,
					handleResponse
				);
			} else {
				//If there were no applicable LJM function calls, throw an error
				throw new DriverInterfaceError("Un-Handled Variable Types: "+dtType+ctType+idType+deviceType.toString()+connectionType.toString()+identifier.toString());
			}
		} else {
			setImmediate(function() {
				onError(driver_const.LJME_DEVICE_ALREADY_OPEN);
			});
		}
	};

	/**
	 * Opens a new devDriverInterfaceErrorice if it isn't already connected.
	 *
	 * @param {Number/String} deviceType Optional integer or String parameter
	 *		from driver_const.js file defining which model of LabJack to open.
	 *		If not specified, defaults to "LJM_dtANY".
	 * @param {Number/String} connectionType Optional integer or String
	 *		parameter from driver_const.js file defining how to connect to
	 *		the device (ex: USB, Ethernet, WiFi). If not specified, defaults to
	 *		"LJ_ctANY".
	 * @param {String} identifier Optional parameter that allows selective
	 *		opening of a device based on a unique identifier (either string IP
	 *		address or integer serialNumber). If not specified, defaults to
	 *		"LJM_idANY".
	 * @return {number} 0 on success, LJM_ Error Number on error.
	 * @throws {DriverInterfaceError} If there is a driver wrapper-error
	 * @throws {DriverOperationError} If there is an LJM reported error
	**/
	this.openSync = function(deviceType, connectionType, identifier) {

		//Determine how open() was used
		if(arguments.length === 0) {
			//If there are two args, aka open() call
			deviceType = "LJM_dtANY";
			connectionType = "LJM_ctANY";
			identifier = "LJM_idANY";
		} else if(arguments.length == 3) {
			//Save the various input parameters
			deviceType = arguments[0];
			connectionType = arguments[1];
			identifier = arguments[2];
		} else {
			throw new DriverInterfaceError("Invalid Open Call");
		}

		//Complete Synchronous function-call,
		//Make sure we aren't already connected to a device
		if(self.handle === null) {
			//Create variables for the ffi call
			var refDeviceHandle = new ref.alloc(ref.types.int,1);
			var output;

			//Get the type's of the inputs
			var dtType = isNaN(deviceType);
			var ctType = isNaN(connectionType);
			var idType = isNaN(identifier);

			if(dtType) {
				dtType = "string";
			} else {
				deviceType = parseInt(deviceType, 10);
				dtType = "number";
			}
			if(ctType) {
				ctType = "string";
			} else {
				connectionType = parseInt(connectionType, 10);
				ctType = "number";
			}
			if(idType) {
				idType = "string";
			} else {
				// Handle the serial number being parsed as a number
				identifier = identifier.toString();
				idType = "string";
			}

			//Determine which LJM function to call
			if((dtType=="number")&&(ctType=="number")&&(idType=="string")) {
				//call LJM_Open() using the ffi async call
				output = self.ljm.LJM_Open(
					deviceType,
					connectionType,
					identifier,
					refDeviceHandle
				);
			} else if((dtType=="number")&&(ctType=="string")&&(idType=="string")) {
				// Convert connectionType to a number
				connectionType = driver_const.connectionTypes[connectionType];
				//call LJM_OpenS() using the ffi async call
				output = self.ljm.LJM_Open(
					deviceType,
					connectionType,
					identifier,
					refDeviceHandle,
					handleResponse
				);
			} else if((dtType=="string")&&(ctType=="number")&&(idType=="string")) {
				// convert deviceType to a number
				deviceType = driver_const.deviceTypes[deviceType];
				//call LJM_OpenS() using the ffi async call
				output = self.ljm.LJM_Open(
					deviceType,
					connectionType,
					identifier,
					refDeviceHandle,
					handleResponse
				);
			} else if((dtType=="string")&&(ctType=="string")&&(idType=="string"))  {
				//call LJM_OpenS() using the ffi async call
				output = self.ljm.LJM_OpenS(
					deviceType,
					connectionType,
					identifier,
					refDeviceHandle
				);
			} else {
				//If there were no applicable LJM function calls, throw an error
				throw new DriverInterfaceError("Un-Handled Variable Types: "+dtType+ctType+idType+deviceType.toString()+connectionType.toString()+identifier.toString());
			}

			//Determine whether or not the Open call was successful
			if(output === 0) {
				//Save the handle & other information to the 
				//	device class
				self.handle = refDeviceHandle.readInt32LE(0);
				self.deviceType = deviceType;
				self.connectionType = connectionType;
				self.identifier = identifier;
				self.isHandleValid = true;
				return output;
			} else {
				//Make sure that the handle, deviceType 
				//		& connectionType are still null
				self.handle = null;
				self.deviceType = null;
				self.connectionType = null;
				self.identifier = null;

				//Report an error
				throw new DriverOperationError(output);
				return output;
			}
		} else {
			return driver_const.LJME_DEVICE_ALREADY_OPEN;
		}
	};

//******************************************************************************
//****************** Communicating With  A Device ******************************
//******************************************************************************

	/**
	 * Retrieves device information about this device.
	 *
	 * Retrieves device metadata information about the device whose handle this
	 * object encapsulates. Returns a DeviceInfo object with the following
	 * structure:
	 * 
	 * { 
	 *		deviceType {number} A device model type corresponding to a constant
	 *			in LabJackM.h. 
	 *		connectionType {number} A constant from LabJackM.h that defines
	 *			connection medium the driver is using to communicate with the
	 *			device.
	 *		serialNumber {number} The device unique integer serial number.
	 *		ipAddress {string} The IP address the device is located at. Defaults
	 *			to all zeros if not connected by the network (0.0.0.0).
	 *		port {number} The port at which the device is connected.
	 *		maxBytesPerMB {number} The maximum payload in bytes that the
	 *			driver can send to the device over the current connection
	 *			medium.
	 * }
	 * 
	 * @param {function} onError function Callback for error-case that takes a
	 *		single number or String argument.
	 * @param {function} onSuccess function Callback for success-case that takes
	 *		a single Object argument.
	 * @return {Object} DeviceInfo
	**/
	this.getHandleInfo = function(onError, onSuccess) {

		//Check to make sure a device has been opened
		if(self.checkStatus(onError)) { return 1;}
		// Wrap user onError and onSuccess functions to prevent un-wanted
		// callback executions.
		onError = wrapUserFunction(onError);
		onSuccess = wrapUserFunction(onSuccess);

		return self.ljnd.LJM_GetHandleInfo(self.handle, onError, onSuccess);
	};

	/**
	 * Retrieves device information about this device.
	 *
	 * Retrieves device metadata information about the device whose handle this
	 * object encapsulates. Returns a DeviceInfo object with the following
	 * structure:
	 * 
	 * { 
	 *		deviceType {number} A device model type corresponding to a constant
	 *			in LabJackM.h. 
	 *		connectionType {number} A constant from LabJackM.h that defines
	 *			connection medium the driver is using to communicate with the
	 *			device.
	 *		serialNumber {number} The device unique integer serial number.
	 *		ipAddress {string} The IP address the device is located at. Defaults
	 *			to all zeros if not connected by the network (0.0.0.0).
	 *		port {number} The port at which the device is connected.
	 *		maxBytesPerMB {number} The maximum payload in bytes that the
	 *			driver can send to the device over the current connection
	 *			medium.
	 * }
	 *
	 * @return {Object/Number} Object conforming to the DeviceInfo structure as
	 *		defined above.
	 * @throws {Error} Thrown if any errors are discovered.
	**/
	this.getHandleInfoSync = function() {
		console.log('Calling getHandleInfo sync')
		//Check to make sure a device has been opened
		self.checkStatus();

		return self.ljnd.LJM_GetHandleInfoSync(self.handle);
	};

	/**
	 * Performs an asynchronous LJM_ReadRaw function call with the LJM driver.
	 *
	 * Reads the value of a modbus register without interpreting that value
	 * before returning.
	 * 
	 * @param {Array} data An appropriately sized number array indicating how
	 *		many bytes should be received from the LJM driver.
	 * @param {function} onError function to be called when successful.
	 * @param {function} onSuccess function to be called when an error occurs.
	**/
	this.readRaw = function(data, onError, onSuccess) {
		//Check to make sure a device has been opened
		if (self.checkStatus(onError)) { return; }
		// Wrap user onError and onSuccess functions to prevent un-wanted
		// callback executions.
		onError = wrapUserFunction(onError);
		onSuccess = wrapUserFunction(onSuccess);

		return self.ljnd.LJM_ReadRaw(self.handle, data, onError, onSuccess);
	};

	/**
	 * The synchronous version of readRaw.
	 * 
	 * @param {Array} data an appropriately sized number array indicating how
	 *		many bytes should be received from the LJM driver.
	 * @return {Array} Number Array of data returned from the LJM_ReadRaw
	 *		function.
	 * @throws {DriverInterfaceError} If input args aren't correct.
	 * @throws {DriverOperationError} If an LJM error occurs.
	 */
	this.readRawSync = function(data) {
		//Check to make sure a device has been opened
		self.checkStatus();

		return self.ljnd.LJM_ReadRawSync(self.handle, data);
	};


	/**
	 * Asynchronously reads a single modbus address.
	 *
	 * @param {Number/String} address Either an integer register address or a 
	 *		String name compatible with self.LJM.
	 * @param {function} onError Takes a single argument represenging
	 *		the LJM-Error, either an integer error number or a String.
	 * @param {Number/String} onSuccess Callback taking a single argument: an
	 *		array containging data (as number or string elements based on data
	 *		type) requested from the device.
	 * @throws {DriverInterfaceError} If the input args aren't correct.
	 */
	this.read = function(address, onError, onSuccess) {
		//Check to make sure a device has been opened
		if (self.checkStatus(onError)) { return; }
		// Wrap user onError and onSuccess functions to prevent un-wanted
		// callback executions.
		onError = wrapUserFunction(onError);
		onSuccess = wrapUserFunction(onSuccess);

		return self.ljnd.LJN_Read(self.handle, address, onError, onSuccess);
	};
	
	/**
	 * Function synchronously reads a single modbus address.
	 *
	 * @param {number / String} address LJM-address or name to read.
	 * @return {number / String} Data retrieved from device or error code.
	 * @throws {DriverInterfaceError} If input args aren't correct
	 * @throws {DriverOperationError} If an LJM error occurs
	 */
	this.readSync = function(address) {
		//Check to make sure a device has been opened
		self.checkStatus();

		return self.ljnd.LJN_ReadSync(self.handle, address);
	};

	/**
	 * Asynchronously reads a single modbus buffer address.
	 *
	 * @param {Number/String} address Either an integer register address or a 
	 *		String name compatible with self.LJM.
	 * @param {Number} number The number of bytes to read from the device.
	 * @param {function} onError Takes a single argument represenging
	 *		the LJM-Error, either an integer error number or a String.
	 * @param {Number/String} onSuccess Callback taking a single argument: an
	 *		array containging data (as number or string elements based on data
	 *		type) requested from the device.
	 * @throws {DriverInterfaceError} If the input args aren't correct.
	**/
	this.readArray = function(address, numReads, onError, onSuccess) {

		//Check to make sure a device has been opened
		if (self.checkStatus(onError)) { return; }
		// Wrap user onError and onSuccess functions to prevent un-wanted
		// callback executions.
		onError = wrapUserFunction(onError);
		onSuccess = wrapUserFunction(onSuccess);

		return self.ljnd.LJN_readArray(self.handle, address, numReads, onError, onSuccess);
	};

	/**
	 * Synchronously reads a single modbus buffer address.
	 *
	 * @param {Number/String} address Either an integer register address or a 
	 *		String name compatible with LJM.
	 * @param {Number} number The number of bytes to read from the device.
	 * @throws {DriverInterfaceError} If the input args aren't correct.
	**/
	this.readArraySync = function(address, numReads) {
		//Check to make sure a device has been opened
		self.checkStatus();
		
		return self.ljnd.LJN_readArraySync(self.handle, address, numReads);
	};
	/**
	 * Read many addresses asynchronously.
	 *
	 * Function performs LJM_eReadNames and LJM_eReadAddresses driver calls
	 * when given certain arguments.  If addresses is type: number-array then it
	 * calls LJM_eReadAddresses and, if addresses is type string-array, then it 
	 * calls LJM_eReadNames.
	 *  
	 * @param {Array} addresses Collection of names or addresses to read.
	 *		An Array of String elements will be interepreted as a collection
	 *		of names while an Array of Number elements will be interepreted
	 *		as a collection of addresses.
	 * @param {function} onError Function to call if an error is encountered
	 *		while performing the read. Should take a single string parameter
	 *		describing the error encountered.
	 * @param {function} onSuccess Function to call if this operation completes
	 *		successfully. Not called if an error is encountered. This function
	 *		should take a single arugment of type array containing elements of
	 *		type number.
	 * @throws {DriverInterfaceError} Thrown if addresses argument is not an
	 *		Array containing at least 1 element.
	**/
	this.readMany = function(addresses, onError, onSuccess) {
		// TODO: Clean this up.
		//Check to make sure a device has been opened
		if ( self.checkStatus(onError) ) { return; }
		// Wrap user onError and onSuccess functions to prevent un-wanted
		// callback executions.
		onError = wrapUserFunction(onError);
		onSuccess = wrapUserFunction(onSuccess);

		return self.ljnd.readMany(self.handle, addresses, onError, onSuccess);
	};

	/**
	 * Read many addresses. Synchronous version of readMany.
	 *
	 * Function performs LJM_eReadNames and LJM_eReadAddresses driver calls
	 * when given certain arguments.  If addresses is type: number-array then it
	 * calls LJM_eReadAddresses and, if addresses is type string-array, then it 
	 * calls LJM_eReadNames.
	 *  
	 * @param {Array} addresses Collection of names or addresses to read.
	 *		An Array of String elements will be interepreted as a collection
	 *		of names while an Array of Number elements will be interepreted
	 *		as a collection of addresses.
	 * @return {Array} Array of double register values.
	 * @throws {DriverInterfaceError} Thrown if addresses argument is not an
	 *		Array containing at least 1 element.
	**/
	this.readManySync = function(addresses) {
		//Check to make sure a device has been opened
		self.checkStatus();

		return self.ljnd.readManySync(self.handle, addresses);
	};

	/**
	 * Writes a request to the device without interpretation.
	 * 
	 * @param {Array} data The data (Array of double) to write to the device.
	 * @param {function} onError Function to call if an error is encountered
	 *		during operation. Should take a single parameter describing the
	 *		error encountered.
	 * @param {function} onSuccess Function tao call after the operation
	 *		finishes. Called with a single parameter: Buffer of double.
	 */
	this.writeRaw = function(data, onError, onSuccess) {
		//Check to make sure a device has been opened
		if ( self.checkStatus(onError) ) { return; }
		// Wrap user onError and onSuccess functions to prevent un-wanted
		// callback executions.
		onError = wrapUserFunction(onError);
		onSuccess = wrapUserFunction(onSuccess);
		
		if ( typeof(data[0]) != "number" ) {
			console.log('WriteRaw-Err, data not a number-array');
		}

		var aData = allocBuffer(data.length);

		for ( var i = 0; i < data.length; i++ ) {
			aData.writeUInt8(data[i], i);
		}

		errorResult = self.ljm.LJM_WriteRaw.async(
			self.handle,
			aData,
			data.length,
			function (err, res){
				if(err) {
					return onError('Weird Error writeRaw', err);
				}
				if ( res === 0 ) {
					return onSuccess(aData);
				} else {
					return onError(res);
				}
			}
		);
	};

	/**
	 * This function performs an synchronous writeRaw LJM function.
	 * 
	 * @param  {array} data Data to be written to the device. Should be an array
	 *		of number.
	 * @return {array} The data read from the device, should be an array of
	 *		number.
	 * @throws {DriverInterfaceError} If input args aren't correct
	 * @throws {DriverOperationError} If an LJM error occurs
	 */
	this.writeRawSync = function(data) {
		//Check to make sure a device has been opened
		self.checkStatus();

		if ( typeof(data[0] ) != "number" ) {
			console.log('WriteRaw-Err, data not a number-array');
		}

		//Define data buffer
		var aData = allocBuffer(data.length);

		for ( var i = 0; i < data.length; i++ ) {
			aData.writeUInt8(data[i], i);
		}

		errorResult = self.ljm.LJM_WriteRaw(
			self.handle,
			aData,
			data.length
		);
		if ( errorResult === 0 ) {
			return aData;
		} else {
			throw new DriverInterfaceError(res);
		}
	};

	/**
	 * Writes a single modbus register.
	 *
	 * Function performs an asynchronous write command using either the 
	 * LJM_eWriteName, LJM_eWriteAddress, LJM_eWriteNameString, or 
	 * LJM_eWriteAddressString function.
	 * 
	 * @param {String/number} address The register being written to. The
	 *		function interprets a number as an address and a string as a
	 *		register name.
	 * @param {String/number} value The data to write to the selected register.
	 * @param {function} onError Function called when an error occurs. Should
	 *		take a single argument: a string description of the error
	 *		encountered.
	 * @param {function} onSuccess Function called upon finishing successfully.
	 */
	this.write = function(address, value, onError, onSuccess) {
		//Check to make sure a device has been opened
		if ( self.checkStatus(onError) ) { return; }
		// Wrap user onError and onSuccess functions to prevent un-wanted
		// callback executions.
		onError = wrapUserFunction(onError);
		onSuccess = wrapUserFunction(onSuccess);
		
		var strBuffer;
		var info;

		//Decision making for address type (string or number)
		if ( isNaN(address) ) {
			info = self.constants.getAddressInfo(address, 'W');

			//Decision making for LJM-address return type, number or string
			if ( (info.directionValid == 1) && (info.type != 98) ) {
				//Execute LJM command
				errorResult = self.ljm.LJM_eWriteName.async(
					self.handle,
					address,
					value,
					function(err, res) {
						if(err) {
							return onError('Weird Error write-1', err);
						}
						if ( res === 0 ) {
							return onSuccess();
						} else {
							return onError(res);
						}
					}
				);
				return 0;
			} else if ( (info.directionValid == 1) && (info.type == 98) ) {
				//Allocate space for the string to be written
				strBuffer = allocBuffer(driver_const.LJM_MAX_STRING_SIZE);

				//Fill the write-string
				if ( value.length <= driver_const.LJM_MAX_STRING_SIZE ) {
					strBuffer.write(value, 0, value.length, 'utf8');
				} else {
					onError("String is to long");
					return 0;
				}

				//Execute LJM command
				errorResult = self.ljm.LJM_eWriteNameString.async(
					self.handle,
					address,
					strBuffer,
					function(err, res){
						if(err) {
							return onError('Weird Error write-2', err);
						}
						if ( res === 0 ) {
							return onSuccess();
						} else {
							return onError(res);
						}
					}
				);
				return 0;
			} else {
				//ERROR!! address is not valid, wrong direction or invalid addr.
				if ( info.type == -1 ) {
					return onError("Invalid Address");
				} else if (info.directionValid === 0) {
					return onError("Invalid Write Attempt");
				}
			}
		} else if (!isNaN(address)) {
			info = self.constants.getAddressInfo(address, 'W');
			if ( (info.directionValid == 1) && (info.type != 98) ) {
				//Execute LJM command
				errorResult = self.ljm.LJM_eWriteAddress.async(
					self.handle,
					address,
					info.type,
					value,
					function(err, res){
						if(err) {
							return onError('Weird Error write-3', err);
						}
						if ( res === 0 ) {
							return onSuccess();
						} else {
							return onError(res);
						}
					}
				);
				return 0;
			} else if ( (info.directionValid == 1) && (info.type == 98) ) {
				//Allocate space for the string to be written
				strBuffer = allocBuffer(driver_const.LJM_MAX_STRING_SIZE);

				//Fill the write-string
				if(value.length <= driver_const.LJM_MAX_STRING_SIZE) {
					strBuffer.write(value, 0, value.length, 'utf8');
				} else {
					onError("String is to long");
					return 0;
				}

				//Execute LJM command
				errorResult = self.ljm.LJM_eWriteAddressString.async(
					self.handle,
					address,
					strBuffer,
					function(err, res){
						if(err) {
							return onError('Weird Error write', err);
						}
						if ( res === 0 ) {
							return onSuccess();
						} else {
							return onError(res);
						}
					}
				);
				return 0;
			} else {
				//ERROR!! address is not valid, wrong direction or invalid addr.
				if(info.type == -1) {
					return onError("Invalid Address");
				} else if (info.directionValid === 0) {
					return onError("Invalid Write Attempt");
				}
			}
		} else {
			return onError("Invalid Arguments");
		}
	};

	/**
	 * Synchronous version of write.
	 *
	 * Function performs a synchronous write command using either the 
	 * LJM_eWriteName, LJM_eWriteAddress, LJM_eWriteNameString, or 
	 * LJM_eWriteAddressString function.
	 * 
	 * @param {String/number} address The register being written to. The
	 *		function interprets a number as an address and a string as a
	 *		register name.
	 * @param {String/number} value The data to write to the selected register.
	 * @return {String/number} Will return 0 on error and, on success, the data
	 *		provided by the device as a number or string.
	 * @throws {DriverInterfaceError} If an error has been detected before 
	 *		calling the LJM function.
	 * @throws {DriverOperationError} If LJM reports an error has occured.
	 */
	this.writeSync = function (address, value) {
		//Check to make sure a device has been opened
		self.checkStatus();

		var errorResult;
		var strBuffer;
		var info;
		//Decision making for address type (string or number)
		if ( isNaN(address) ) {
			info = self.constants.getAddressInfo(address, 'W');
			
			//Decision making for LJM-address return type, number or string
			if ( (info.directionValid == 1) && (info.type != 98) ) {
				//Execute LJM command
				errorResult = self.ljm.LJM_eWriteName(
					self.handle,
					address,
					value
				);
			} else if( (info.directionValid == 1) && (info.type == 98) ) {
				//Allocate space for the string to be written
				strBuffer = allocBuffer(driver_const.LJM_MAX_STRING_SIZE);

				//Fill the write-string
				if ( value.length <= driver_const.LJM_MAX_STRING_SIZE ) {
					strBuffer.write(value, 0, value.length, 'utf8');
				} else {
					throw new DriverInterfaceError("String is to long");
					return "string is to long";
				}
				
				//Execute LJM command
				errorResult = self.ljm.LJM_eWriteNameString(
					self.handle,
					address,
					strBuffer
				);
			} else {
				//ERROR!! address is not valid, wrong direction or invalid addr.
				if ( info.type == -1 ) {
					throw new DriverInterfaceError("Invalid Address");
					return "Invalid Address";
				} else if (info.directionValid === 0) {
					throw new DriverInterfaceError("Invalid Write Attempt");
					return "Invalid Write Attempt";
				}
			}
		} else if( !isNaN(address) ) {
			info = self.constants.getAddressInfo(address, 'W');
			if ( (info.directionValid == 1) && (info.type != 98) ) {
				//Execute LJM command
				errorResult = self.ljm.LJM_eWriteAddress(
					self.handle,
					address,
					info.type,
					value
				);
			} else if ( (info.directionValid == 1) && (info.type == 98) ) {
				//Allocate space for the string to be written
				strBuffer = allocBuffer(driver_const.LJM_MAX_STRING_SIZE);

				//Fill the write-string
				if ( value.length <= driver_const.LJM_MAX_STRING_SIZE ) {
					strBuffer.write(value, 0, value.length, 'utf8');
				} else {
					throw new DriverInterfaceError("String is to long");
					return "string is to long";
				}

				//Execute LJM command
				errorResult = self.ljm.LJM_eWriteAddressString(
					self.handle,
					address,
					strBuffer
				);
			} else {
				//ERROR!! address is not valid, wrong direction or invalid addr.
				if ( info.type == -1 ) {
					throw new DriverInterfaceError("Invalid Address");
					return "Invalid Address";
				} else if ( info.directionValid === 0 ) {
					throw new DriverInterfaceError("Invalid Write Attempt");
					return "Invalid Write Attempt";
				}
			}
		} else {
			throw new DriverInterfaceError("Invalid Arguments");
			return "Invalid Arguments";
		}
		if ( errorResult === 0 ) {
			return errorResult;
		} else {
			throw new DriverOperationError(errorResult);
			return errorResult;
		}
	};

	/**
	 * A helper function for the writeArray and writeArraySync function to parse
	 * or interpret the data to be written.
	 */
	var innerFormatAndValidateArrayData = function(address, writeData) {
		var writeInfo = {
			'isValid': false,
			'message': 'Unknown Reason',

			// Data to be written
			'address': undefined,
			'type': undefined,
			'numValues': undefined,
			'aValues': undefined,
			'errorAddress': undefined,
		};

		var info = self.constants.getAddressInfo(address, 'W');
		var isDirectionValid = info.directionValid == 1;
		var isBufferRegister = false;
		if(info.data) {
			if(info.data.isBuffer) {
				isBufferRegister = true;
			}
		}

		if (isDirectionValid && isBufferRegister) {
			writeInfo.isValid = true;

			// Save info
			writeInfo.address = info.address;
			writeInfo.type = info.type;

			var errorVal = new ref.alloc('int',1);
			errorVal.fill(0);
			
			writeInfo.errorAddress = errorVal;

			// Variable declarations:
			var aValues, offset, i;

			// Check to see if the input-data is of the type "buffer"
			if(Buffer.isBuffer(writeData)) {
				writeInfo.isValid = false;
				writeInfo.message = 'Buffer type is not supported';
			} else if(Array.isArray(writeData)) {
				writeInfo.numValues = writeData.length;
				aValues = allocBuffer(writeData.length * ARCH_DOUBLE_NUM_BYTES);
				offset = 0;
				for(i = 0; i < writeData.length; i++) {
					aValues.writeDoubleLE(writeData[i], offset);
					offset += ARCH_DOUBLE_NUM_BYTES;
				}
				writeInfo.aValues = aValues;
			} else if((typeof(writeData) === 'string') || (writeData instanceof String)) {
				writeInfo.numValues = writeData.length;
				aValues = allocBuffer(writeData.length * ARCH_DOUBLE_NUM_BYTES);
				offset = 0;
				for(i = 0; i < writeData.length; i++) {
					aValues.writeDoubleLE(writeData.charCodeAt(i), offset);
					offset += ARCH_DOUBLE_NUM_BYTES;
				}
				writeInfo.aValues = aValues;
			} else {
				// Un-supported type
				writeInfo.isValid = false;
				writeInfo.message = 'Invalid data type being written: ' + typeof(writeData) + '.';
			}
			writeInfo.numValues = writeData.length;
		} else {
			writeInfo.isValid = false;
			if (info.type == -1) {
				writeInfo.message = 'Invalid Address';
			} else if (info.directionValid === 0) {
				writeInfo.message = 'Invalid Read Attempt';
			} else if (!isBufferRegister) {
				writeInfo.message = 'Tried to read an array from a register that is not a buffer';
			}
		}
		return writeInfo;
	};
	/**
	 * Asynchronously write a single modbus buffer address.
	 *
	 * @param {Number/String} address Either an integer register address or a 
	 *		String name compatible with LJM.
	 * @param {Number} number The number of bytes to read from the device.
	 * @param {function} onError Takes a single argument represenging
	 *		the LJM-Error, either an integer error number or a String.
	 * @param {Number/String} onSuccess Callback taking a single argument: an
	 *		array containging data (as number or string elements based on data
	 *		type) requested from the device.
	 * @throws {DriverInterfaceError} If the input args aren't correct.
	**/
	this.writeArray = function(address, writeData, onError, onSuccess) {
		//Check to make sure a device has been opened
		if (self.checkStatus(onError)) { return; }
		// Wrap user onError and onSuccess functions to prevent un-wanted
		// callback executions.
		onError = wrapUserFunction(onError);
		onSuccess = wrapUserFunction(onSuccess);

		var writeInfo = innerFormatAndValidateArrayData(address, writeData);

		if(writeInfo.isValid) {
			// Return Variable
			var errorResult;

			var writeAddress = writeInfo.address;
			var type = writeInfo.type;
			var numValues = writeInfo.numValues;
			var aValues = writeInfo.aValues;
			var errorAddress = writeInfo.errorAddress;
			// Call the LJM function
			errorResult = self.ljm.LJM_eWriteAddressArray.async(
				self.handle,
				writeAddress,
				type,
				numValues,
				aValues,
				errorAddress,
				function(err, res) {
					if(err) {
						return onError('Weird Error readAddress', err);
					}
					if ( (res === 0) ) {
						return onSuccess();
					} else {
						return onError({retError: res, errFrame: errorAddress.deref()});
					}
				}
			);
		} else {
			onError(writeInfo.message);
			return -1;
		}
	};

	/**
	 * Synchronously reads a single modbus buffer address.
	 *
	 * @param {Number/String} address Either an integer register address or a 
	 *		String name compatible with LJM.
	 * @param {Number} number The number of bytes to read from the device.
	 * @throws {DriverInterfaceError} If the input args aren't correct.
	**/
	this.writeArraySync = function(address, writeData) {
		//Check to make sure a device has been opened
		self.checkStatus();

		var output;
		var retData;
		var writeInfo = innerFormatAndValidateArrayData(address, writeData);

		if(writeInfo.isValid) {
			var writeAddress = writeInfo.address;
			var type = writeInfo.type;
			var numValues = writeInfo.numValues;
			var aValues = writeInfo.aValues;
			var errorAddress = writeInfo.errorAddress;

			// Call the LJM function
			output = self.ljm.LJM_eWriteAddressArray(
				self.handle,
				writeAddress,
				type,
				numValues,
				aValues,
				errorAddress
			);
			if (output === 0) {
				// Read was successful.
			}
		} else {
			throw new DriverInterfaceError(writeInfo.message);
		}
		if (output === 0) {
			return retData;
		} else {
			throw new DriverOperationError(output);
		}
	};

	/**
	 * Writes values to many registers at once.
	 *
	 * Asynchronously calls the LJM functions: LJM_eWriteAddresses and 
	 * LJM_eWriteNames given appropriate input variables.
	 * 
	 * @param {array} addresses Array of registers to write to. This function
	 *		interprets a collection of numbers as a collection of addresses
	 *		but interprets a string as a collection of register names.
	 * @param {array} values An array of values to write. Should
	 *		correspond one to one with the registers idenified in addresses.
	 *		Only number values allowed in this array and client code should use
	 *		write / writeSync if needing to write a String.
	 * @param {function} onError Function called when finished with an error.
	 *		Should take an object with attributes retError (with a string
	 *		error message) and errorFrame (counter indicating on which frame
	 *		the error was encountered).
	 * @param {function} onSuccess Function called when finished successfully.
	 *		This function will not pass any arugments to this callback.
	 */
	this.writeMany = function (addresses, values, onError, onSuccess) {
		//Check to make sure a device has been opened
		if ( self.checkStatus(onError) ) { return; }
		// Wrap user onError and onSuccess functions to prevent un-wanted
		// callback executions.
		onError = wrapUserFunction(onError);
		onSuccess = wrapUserFunction(onSuccess);
		
		//Check to make sure the two array's are of the same length
		if ( addresses.length != values.length ) {
			onError('Length of addresses & values must be equal');
			return;
		}

		//Check to make sure that the values array is filled with numbers
		if ( typeof(values[0]) != 'number' ) {
			onError('values must be of type number-array');
			return;
		}

		//Perform universal buffer allocations.
		var length = addresses.length;
		var aValues = allocBuffer(ARCH_DOUBLE_NUM_BYTES * length);
		var errors = new ref.alloc('int',1);

		//Clear the buffers
		errors.fill(0);

		var errorResult;
		var i = 0;
		var offset;
		var dataOffset;

		//Decide whether to perform address-number or address-name operation.
		if ( isNaN(addresses[0]) ) {
			//Perform necessary string buffer allocations.
			offset = 0;
			dataOffset = 0;

			//Declare aNames array buffer
			var aNames = allocBuffer(ARCH_POINTER_SIZE * length);

			for ( i = 0; i < length; i++ ) {
				//Append the value to the aValues array
				aValues.writeDoubleLE(values[i], dataOffset);

				//Declare buffer for string-address
				var buf = allocBuffer(addresses[i].length + 1);

				//Save the string to the buffer
				ref.writeCString(buf, 0, addresses[i]);

				//Write the pointer of the buffer to the aNames array
				ref.writePointer(aNames, offset, buf);

				//Increment the offset counter
				offset+=ARCH_POINTER_SIZE;
				dataOffset+=ARCH_DOUBLE_NUM_BYTES;
			}

			//Execute LJM command.
			errorResult = self.ljm.LJM_eWriteNames.async(
				self.handle,
				length,
				aNames,
				aValues,
				errors,
				function(err, res){
					if(err) {
						return onError('Weird Error writeMany-1', err);
					}
					if ( (res === 0) ) {
						return onSuccess();
					} else {
						return onError({retError:res, errFrame:errors.deref()});
					}
				}
			);
			return 0;
		} else if ( !isNaN(addresses[0]) ) {
			//Perform necessary number buffer allocations.
			var addrBuff = allocBuffer(ARCH_INT_NUM_BYTES * length);
			var addrTypeBuff = allocBuffer(ARCH_INT_NUM_BYTES * length);
			var inValidOperation = 0;

			var info;
			offset = 0;
			var offsetD = 0;

			for ( i = 0; i < length; i++ ) {
				info = self.constants.getAddressInfo(addresses[i], 'W');
				if ( info.directionValid == 1 ) {
					addrTypeBuff.writeInt32LE(info.type,offset);
					addrBuff.writeInt32LE(addresses[i],offset);
					aValues.writeDoubleLE(values[i],offsetD);
					offset += ARCH_INT_NUM_BYTES;
					offsetD += ARCH_DOUBLE_NUM_BYTES;
				}
				else {
					if ( info.type == -1 ) {
						onError({retError:"Invalid Address", errFrame:i});
					} else if (info.directionValid === 0) {
						onError({retError:"Invalid Read Attempt", errFrame:i});
					} else {
						onError({retError:"Unexpected Error", errFrame:i});
					}
					return;
				}
			}

			//Execute LJM command.
			errorResult = self.ljm.LJM_eWriteAddresses.async(
				self.handle,
				length,
				addrBuff,
				addrTypeBuff,
				aValues,
				errors,
				function(err, res){
					if(err) {
						return onError('Weird Error writeMany-2', err);
					}
					if ( (res === 0) ) {
						return onSuccess();
					}
					else {
						return onError({retError:res, errFrame:errors.deref()});
					}
				}
			);
			return 0;
		} else {
			onError('Invalid Array-type, must be number-array or string-array');
			return;
		}
	};

	/**
	 * Synchronous version of writeMany.
	 *
	 * Synchronously calls the LJM functions: LJM_eWriteAddresses and 
	 * LJM_eWriteNames given appropriate input variables.
	 * 
	 * @param {array} addresses Array of registers to write to. This function
	 *		interprets a collection of numbers as a collection of addresses
	 *		but interprets a string as a collection of register names.
	 * @param {array} values An array of values to write. Should
	 *		correspond one to one with the registers idenified in addresses.
	 *		Only number values allowed in this array and client code should use
	 *		write / writeSync if needing to write a String.
	 * @return {number/String} 0 on success, string on error.
	 * @throws {DriverInterfaceError} Thrown if there is an error produced 
	 *		before calling the LJM function.
	 * @throws {DriverOperationError} Thrown if there is an error produced
	 *		during the LJM driver function.
	 */
	this.writeManySync = function (addresses, values) {
		//Check to make sure a device has been opened.
		self.checkStatus();

		//Check to make sure the two array's are of the same length
		if ( addresses.length != values.length ) {
			throw new DriverInterfaceError(
				'Length of Addresses & Values must be equal'
			);
			return 'Length of Addresses & Values must be equal';
		}

		//Check to make sure that the values array is filled with numbers
		if ( typeof(values[0]) != 'number' ) {
			throw new DriverInterfaceError(
				'Values must be of type number-array'
			);
			return 'Values must be of type number-array';
		}

		//Perform universal buffer allocations.
		var length = addresses.length;
		var aValues = allocBuffer(ARCH_DOUBLE_NUM_BYTES * length);
		var errors = new ref.alloc('int',1);

		//Clear the buffers
		errors.fill(0);

		var errorResult;
		var i;
		var offset;

		//Decide whether to perform address-number or address-name operation.
		if ( isNaN(addresses[0]) ) {
			//Perform necessary string buffer allocations.
			i = 0;
			offset = 0;
			var dataOffset = 0;

			//Declare aNames array buffer
			var aNames = allocBuffer(ARCH_POINTER_SIZE * length);

			for ( i = 0; i < length; i++ ) {
				//Append the value to the aValues array
				aValues.writeDoubleLE(values[i], dataOffset);

				//Declare buffer for string-address
				var buf = allocBuffer(addresses[i].length + 1);

				//Save the string to the buffer
				ref.writeCString(buf, 0, addresses[i]);

				//Write the pointer of the buffer to the aNames array
				ref.writePointer(aNames, offset, buf);

				//Increment the offset counter
				offset+=ARCH_POINTER_SIZE;
				dataOffset+=ARCH_DOUBLE_NUM_BYTES;
			}

			//Execute LJM function.
			errorResult = self.ljm.LJM_eWriteNames(
				self.handle,
				length,
				aNames,
				aValues,
				errors
			);

		} else if (!isNaN(addresses[0])) {
			//Perform necessary number buffer allocations.
			var addrBuff = allocBuffer(ARCH_INT_NUM_BYTES * length);
			var addrTypeBuff = allocBuffer(ARCH_INT_NUM_BYTES * length);
			var inValidOperation = 0;

			var info;
			offset=0;
			var offsetD = 0;
			i = 0;

			for ( i = 0; i < length; i++ ) {
				info = self.constants.getAddressInfo(addresses[i], 'W');
				if ( info.directionValid == 1 ) {
					addrTypeBuff.writeInt32LE(info.type,offset);
					addrBuff.writeInt32LE(addresses[i],offset);
					aValues.writeDoubleLE(values[i],offsetD);
					offset += ARCH_INT_NUM_BYTES;
					offsetD += ARCH_DOUBLE_NUM_BYTES;
				}
				else {
					if ( info.type == -1 ) {
						throw new DriverInterfaceError(
							{
								retError:"Invalid Address",
								errFrame:i
							}
						);
						return {retError:"Invalid Address", errFrame:i};
					} else if (info.directionValid === 0) {
						throw new DriverInterfaceError(
							{
								retError:"Invalid Write Attempt",
								errFrame:i
							}
						);
						return {retError:"Invalid Write Attempt", errFrame:i};
					} else {
						throw new DriverInterfaceError(
							{
								retError:"Unexpected Error",
								errFrame:i
							}
						);
						return {retError:"Unexepcted Error", errFrame:i};
					}
				}
			}

			//Execute LJM command.
			errorResult = self.ljm.LJM_eWriteAddresses(
				self.handle,
				length,
				addrBuff,
				addrTypeBuff,
				aValues,
				errors
			);
		} else {
			throw new DriverInterfaceError(
				'Invalid Array-type, must be number-array or string-array'
			);
			return 'Invalid Array-type, must be number-array or string-array';
		}
		if(errorResult === 0) {
			return errorResult;
		} else {
			throw new DriverOperationError(
				{
					retError:errorResult,
					errFrame:errors.deref()}
			);
			return {retError:errorResult, errFrame:errors.deref()};
		}
	};

	/**
	 * Helper function for building an array of data read from the driver.
	 *
	 * Helper function for returning the proper array of data when using the 
	 * rwMany function call. Throws out written data & builds an array of only 
	 * data read by the driver.
	 * 
	 * @param {number} numFrames  the number of frames sent.
	 * @param {array} numValues The values array provided by the user. All
	 *		elements should be number.
	 * @param {array} directions Array of read/write directions. Each element
	 *		should be a number indicating the direction of the operation (read
	 *		or write).
	 * @param {Buffer} aValues Data passed back by the LJM driver.
	 * @return {array} Array of data that was read back from the driver.
	 */
	this.populateRWManyArray = function (numFrames, numValues, directions,
		aValues) {
		var returnArray = [];
		var offset = 0;
		for (var i = 0; i < numFrames; i++) {
			for (var j = 0; j < numValues[i]; j++) {
				if (directions[i] == driver_const.LJM_READ) {
					returnArray.push(aValues.readDoubleLE(offset));
				}
				offset += ARCH_DOUBLE_NUM_BYTES;
			}
		}
		return returnArray;
	};

	/**
	 * [rwMany description]
	 * @param  {[type]} numFrames  [description]
	 * @param  {[type]} addresses  [description]
	 * @param  {[type]} directions [description]
	 * @param  {[type]} numValues  [description]
	 * @param  {[type]} values     [description]
	 * @param  {[type]} onError    [description]
	 * @param  {[type]} onSuccess  [description]
	 */
	this.rwMany = function(addresses,directions,numValues,values,onError,onSuccess) {
		//Check to make sure a device has been opened
		if (self.checkStatus(onError)) { return; }
		// Wrap user onError and onSuccess functions to prevent un-wanted
		// callback executions.
		onError = wrapUserFunction(onError);
		onSuccess = wrapUserFunction(onSuccess);
		
		var i,j;
		var numFrames = addresses.length;
		var value;
		var offsetD, offsetI;
		
		//Return variable
		var errorResult;


		//Perform function wide buffer allocations:
		var aDirections = allocBuffer(numFrames * ARCH_INT_NUM_BYTES);//Array of directions
		var aNumWrites = allocBuffer(numFrames * ARCH_INT_NUM_BYTES);//Array of ops. per frame
		var aValues = allocBuffer(values.length * 8);//Array of doubles
		var errorVal = allocBuffer(ARCH_INT_NUM_BYTES); //Array the size of one UInt32 for err

		if (isNaN(addresses[0])) {
			//Allocate space for the aNames array
			var aNames = allocBuffer(numFrames * ARCH_POINTER_SIZE);//Array of C-String pointers

			var offsetP = 0;
			offsetD = 0;
			offsetI = 0;
			
			//Populate the array's with data
			for ( i = 0; i < numFrames; i++ ) {
				//Fill aDirections array
				aDirections.writeUInt32LE(directions[i], offsetI);

				//Fill aNumWrites array
				aNumWrites.writeUInt32LE(numValues[i], offsetI);

				//Fill aNames array
				var buf = allocBuffer(addresses[i].length + 1);

				ref.writeCString(buf, 0, addresses[i]);
				ref.writePointer(aNames, offsetP, buf);

				//Increment pointers
				offsetP += ARCH_POINTER_SIZE;
				offsetI += ARCH_INT_NUM_BYTES;
			}

			//Increment & fill the values array separately because it may be of
			//different length then the rest.
			offsetD = 0;
			for ( i = 0; i < values.length; i++ ) {
				value = values[i];
				if ( typeof(value) == 'number' ) {
					aValues.writeDoubleLE(value, offsetD);
				} else {
					aValues.writeDoubleLE(0, offsetD);
				}
				offsetD += ARCH_DOUBLE_NUM_BYTES;
			}

			//Call the LJM function
			errorResult = self.ljm.LJM_eNames.async(
				self.handle,
				numFrames,
				aNames,
				aDirections,
				aNumWrites,
				aValues,
				errorVal,
				function(err,res) {
					if(err) {
						return onError('Weird Error rwMany-1', err);
					}
					if ( res === 0 ) {
						return onSuccess(
							self.populateRWManyArray(
								numFrames,
								numValues,
								directions,
								aValues
							)
						);
					} else {
						return onError(res);
					}
				}
			);
		} else if(!isNaN(addresses[0])) {
			//Allocate space for the aNames array
			var aAddresses = allocBuffer(numFrames * ARCH_INT_NUM_BYTES);//Array of addresses
			var aTypes = allocBuffer(numFrames * ARCH_INT_NUM_BYTES);//Array of types

			offsetD = 0;
			offsetI = 0;

			var overwriteNumValues = false;
			var newNumValues;

			//Populate the array's with data
			for(i = 0; i < numFrames; i++) {
				//Fill aDirections array
				aDirections.writeUInt32LE(directions[i],offsetI);

				//Fill aAddresses array
				aAddresses.writeUInt32LE(addresses[i],offsetI);

				//Fill aTypes array
				var info;
				if(directions[i] == driver_const.LJM_READ) {
					info = self.constants.getAddressInfo(addresses[i], 'R');
				} else if (directions[i] == driver_const.LJM_WRITE) {
					info = self.constants.getAddressInfo(addresses[i], 'W');
				} else {
					//Report Error:
					return onError(
						{
							retError:"Invalid Direction",
							errFrame:i
						}
					);
				}
				if(info.directionValid == 1)
				{
					if(info.type !== driver_const.LJM_UINT64) {
						aTypes.writeUInt32LE(info.type, offsetI);
					} else {
						aTypes.writeUInt32LE(driver_const.LJM_BYTE, offsetI);
						overwriteNumValues = true;
						newNumValues = info.size;
					}
				}
				else
				{
					//Report Error:
					if(info.type == -1) {
						return onError(
							{
								retError:"Invalid Address",
								errFrame:i
							}
						);
					} else if (info.directionValid === 0) {
						return onError(
							{
								retError:"Invalid Write Attempt",
								errFrame:i
							}
						);
					} else {
						return onError(
							{
								retError:"Weird-Error",
								errFrame:i
							}
						);
					}
				}

				//Fill aNumWrites array
				if(overwriteNumValues){
					aNumWrites.writeUInt32LE(newNumValues, offsetI);
				} else {
					aNumWrites.writeUInt32LE(numValues[i], offsetI);
				}

				//Increment pointers
				offsetD +=ARCH_DOUBLE_NUM_BYTES;
				offsetI += ARCH_INT_NUM_BYTES;
			}

			//Increment & fill the values array separately because it may be of
			//different length then the rest.
			offsetD = 0;
			for ( i = 0; i < values.length; i++ ) {
				value = values[i];
				if(typeof(value) == 'number') {
					aValues.writeDoubleLE(value,offsetD);
				} else {
					aValues.writeDoubleLE(0,offsetD);
				}
				offsetD += ARCH_DOUBLE_NUM_BYTES;
			}

			//Call the LJM function
			errorResult = self.ljm.LJM_eAddresses.async(
				self.handle,
				numFrames,
				aAddresses,
				aTypes,
				aDirections,
				aNumWrites,
				aValues,
				errorVal,
				function(err,res) {
					if(err) {
						return onError('Weird Error rwMany-2', err);
					}
					if(res === 0) {
						return onSuccess(
							self.populateRWManyArray(
								numFrames,
								numValues,
								directions,
								aValues
							)
						);
					} else {
						return onError(res);
					}
				}
			);
		} else {
			return onError("Address is not a number or string array");
		}
	};

	/**
	 * [rwManySync description]
	 * @param  {[type]} numFrames  [description]
	 * @param  {[type]} addresses  [description]
	 * @param  {[type]} directions [description]
	 * @param  {[type]} numValues  [description]
	 * @param  {[type]} values     [description]
	 * @return {[type]}            [description]
	 *								LJM driver
	 * @throws {DriverOperationError} If there is an error produced by calling 
	 *								the LJM driver
	 */
	this.rwManySync = function(addresses,directions,numValues,values) {
		var i,j;
		var numFrames = addresses.length;
		//Check to make sure a device has been opened.
		self.checkStatus();

		//Return variable
		var errorResult;

		//Perform function wide buffer allocations:
		var aDirections = allocBuffer(numFrames * ARCH_INT_NUM_BYTES);			//Array of directions
		var aNumWrites = allocBuffer(numFrames * ARCH_INT_NUM_BYTES);			//Array of ops. per frame
		var aValues = allocBuffer(values.length * ARCH_DOUBLE_NUM_BYTES);		//Array of doubles
		var errorVal = allocBuffer(ARCH_INT_NUM_BYTES);							//Array the size of one UInt32 for err

		var offsetP = 0;
		var offsetD = 0;
		var offsetI = 0;

		// Declare other variables
		var value;

		if ( isNaN(addresses[0]) ) {
			//Allocate space for the aNames array
			var aNames = allocBuffer(numFrames * ARCH_POINTER_SIZE);				//Array of C-String pointers

			offsetP = 0;
			offsetD = 0;
			offsetI = 0;

			//Populate the array's with data
			for ( i = 0; i < numFrames; i++ ) {
				//Fill aDirections array
				aDirections.writeUInt32LE(directions[i], offsetI);

				//Fill aNumWrites array
				aNumWrites.writeUInt32LE(numValues[i], offsetI);

				//Fill aNames array
				var buf = allocBuffer(addresses[i].length+1);

				ref.writeCString(buf, 0, addresses[i]);
				ref.writePointer(aNames, offsetP, buf);
				//Increment pointers
				offsetP += ARCH_POINTER_SIZE;
				offsetI += ARCH_INT_NUM_BYTES;
			}

			//Increment & fill the values array separately because it may be of
			//different length then the rest.
			offsetD = 0;
			for ( i = 0; i < values.length; i++ ) {
				value = values[i];
				if ( typeof(value) === 'number' ) {
					aValues.writeDoubleLE(value,offsetD);
				} else {
					aValues.writeDoubleLE(0,offsetD);
				}
				offsetD += ARCH_DOUBLE_NUM_BYTES;
			}
			//Call the LJM function
			errorResult = self.ljm.LJM_eNames(
				self.handle,
				numFrames,
				aNames,
				aDirections,
				aNumWrites,
				aValues,
				errorVal
			);

		} else if(!isNaN(addresses[0])) {
			//Allocate space for the aNames array
			var aAddresses = allocBuffer(numFrames * ARCH_INT_NUM_BYTES);		//Array of addresses
			var aTypes = allocBuffer(numFrames * ARCH_INT_NUM_BYTES);			//Array of types

			offsetD = 0;
			offsetI = 0;

			var overwriteNumValues = false;
			var newNumValues;

			//Populate the array's with data
			for ( i = 0; i < numFrames; i++ ) {
				//Fill aDirections array
				aDirections.writeUInt32LE(directions[i], offsetI);

				//Fill aAddresses array
				aAddresses.writeUInt32LE(addresses[i], offsetI);

				//Fill aTypes array
				var info;
				if(directions[i] == driver_const.LJM_READ) {
					info = self.constants.getAddressInfo(addresses[i], 'R');
				} else if (directions[i] == driver_const.LJM_WRITE) {
					info = self.constants.getAddressInfo(addresses[i], 'W');
				} else {
					//Report Error:
					throw new DriverInterfaceError(
						{
							retError:"Invalid Direction",
							errFrame:i
						}
					);
				}
				if(info.directionValid == 1)
				{
					if(info.type !== driver_const.LJM_UINT64) {
						aTypes.writeUInt32LE(info.type, offsetI);
					} else {
						aTypes.writeUInt32LE(driver_const.LJM_BYTE, offsetI);
						overwriteNumValues = true;
						newNumValues = info.size;
					}
				}
				else
				{
					//Report Error:
					if ( info.type == -1 ) {
						throw new DriverInterfaceError(
							{
								retError:"Invalid Address",
								errFrame:i
							}
						);
						return {retError:"Invalid Address", errFrame:i};
					} else if (info.directionValid === 0) {
						throw new DriverInterfaceError(
							{
								retError:"Invalid Write Attempt",
								errFrame:i
							}
						);
						return {retError:"Invalid Write Attempt", errFrame:i};
					} else {
						throw new DriverInterfaceError(
							{
								retError:"Weird-Error",
								errFrame:i
							}
						);
						return {retError:"Weird-Error", errFrame:i};
					}
				}

				//Fill aNumWrites array
				if(overwriteNumValues){
					aNumWrites.writeUInt32LE(newNumValues, offsetI);
				} else {
					aNumWrites.writeUInt32LE(numValues[i], offsetI);
				}

				//Increment pointers
				offsetD +=ARCH_DOUBLE_NUM_BYTES;
				offsetI += ARCH_INT_NUM_BYTES;
			}

			//Increment & fill the values array separately because it may be of
			//different length then the rest.
			offsetD = 0;
			for ( i = 0; i < values.length; i++ ) {
				value = values[i];
				if(typeof(value) == 'number') {
					aValues.writeDoubleLE(value, offsetD);
				} else {
					aValues.writeDoubleLE(0, offsetD);
				}
				offsetD += ARCH_DOUBLE_NUM_BYTES;
			}

			//Call the LJM function
			errorResult = self.ljm.LJM_eAddresses(
				self.handle,
				numFrames,
				aAddresses,
				aTypes,
				aDirections,
				aNumWrites,
				aValues,
				errorVal
			);
		} else {
			throw new DriverInterfaceError(
				"Address is not a number or string array"
			);
			return "Address is not a number or string array";
		}
		if(errorResult === 0) {
			return self.populateRWManyArray(
						numFrames,
						numValues,
						directions,
						aValues
					);
		} else {
			throw new DriverOperationError(errorResult);
			return errorResult;
		}
	};

	this.readUINT64 = function(type, onError, onSuccess) {
		//Check to make sure a device has been opened.
		if(self.checkStatus(onError)) {return;}
		// Wrap user onError and onSuccess functions to prevent un-wanted
		// callback executions.
		onError = wrapUserFunction(onError);
		onSuccess = wrapUserFunction(onSuccess);

		var regType = {
			ethernet:0,
			ETHERNET:0,
			Ethernet:0,
			ETHERNET_MAC:0,
			wifi:1,
			WiFi:1,
			Wifi:1,
			WIFI_MAC:1
		};
		
		//Return variable
		var errorResult;

		//Perform function wide buffer allocations:
		var aAddresses = allocBuffer(1 * ARCH_INT_NUM_BYTES);
		var aTypes = allocBuffer(1 * ARCH_INT_NUM_BYTES);
		var aWrites = allocBuffer(1 * ARCH_INT_NUM_BYTES);			//Array of directions
		var aNumValues = allocBuffer(1 * ARCH_INT_NUM_BYTES);		//Array of ops. per frame
		var aValues = allocBuffer(8 * ARCH_DOUBLE_NUM_BYTES);		//Array of doubles
		var errorVal = allocBuffer(ARCH_INT_NUM_BYTES);				//Array the size of one UInt32 for err


		var numFrames = 1;
		var numValues = 8;
		var direction = [0];

		var macAddress = 0;
		if(regType[type] === 0) {
			macAddress = 60020;
		} else if (regType[type] === 1) {
			macAddress = 60024;
		}
		aAddresses.writeInt32LE(macAddress,0);
		aTypes.writeInt32LE(driver_const.LJM_BYTE,0);
		aNumValues.writeInt32LE(driver_const.typeSizes.UINT64,0);
		// console.log('in rwManySync, eAddress Data:');
		// console.log('NumFrames',numFrames);
		// console.log('aAddresses',aAddresses);
		// console.log('aTypes',aTypes);
		// console.log('aWrites',aWrites);
		// console.log('aNumValues',aNumValues);
		// console.log('aValues',aValues);

		//Call the LJM function
		errorResult = self.ljm.LJM_eAddresses.async(
			self.handle,
			numFrames,
			aAddresses,
			aTypes,
			aWrites,
			aNumValues,
			aValues,
			errorVal,
			function(err,res) {
				if(err) {
					return onError('Weird Error readUINT64', err);
				}
				if(res === 0) {
					// console.log('readMac Async Success',aValues);
					var i;
					var macStr = '';
					var tVar;
					for(i = 2; i < driver_const.typeSizes.UINT64-1; i++) {
						tVar = aValues.readDoubleLE(i*driver_const.typeSizes.UINT64).toString(16);
						if(tVar.length < 2) {
							tVar = '0' + tVar;
						}
						macStr += tVar;
						macStr += ':';
					}
					tVar = aValues.readDoubleLE(7*driver_const.typeSizes.UINT64).toString(16);
					if(tVar.length < 2) {
						tVar = '0' + tVar;
					}
					macStr += tVar;
					// console.log('mac address:',macStr);
					return onSuccess(macStr);
				} else {
					return onError(res);
				}
			}
		);
	};
	this.readUINT64Sync = function(type) {
		//Check to make sure a device has been opened.
		self.checkStatus();

		var regType = {
			ethernet:0,
			ETHERNET:0,
			Ethernet:0,
			ETHERNET_MAC:0,
			wifi:1,
			WiFi:1,
			Wifi:1,
			WIFI_MAC:1
		};

		//Return variable
		var errorResult;

		//Perform function wide buffer allocations:
		var aAddresses = allocBuffer(1 * ARCH_INT_NUM_BYTES);
		var aTypes = allocBuffer(1 * ARCH_INT_NUM_BYTES);
		var aWrites = allocBuffer(1 * ARCH_INT_NUM_BYTES);			//Array of directions
		var aNumValues = allocBuffer(1 * ARCH_INT_NUM_BYTES);		//Array of ops. per frame
		var aValues = allocBuffer(8 * ARCH_DOUBLE_NUM_BYTES);		//Array of doubles
		var errorVal = allocBuffer(ARCH_INT_NUM_BYTES);				//Array the size of one UInt32 for err


		var numFrames = 1;
		var numValues = 8;
		var direction = [0];

		var macAddress = 0;
		if(regType[type] === 0) {
			macAddress = 60020;
		} else if (regType[type] === 1) {
			macAddress = 60024;
		}
		aAddresses.writeInt32LE(macAddress,0);
		aTypes.writeInt32LE(driver_const.LJM_BYTE,0);
		aNumValues.writeInt32LE(driver_const.typeSizes.UINT64,0);
		// console.log('in rwManySync, eAddress Data:');
		// console.log('NumFrames',numFrames);
		// console.log('aAddresses',aAddresses);
		// console.log('aTypes',aTypes);
		// console.log('aWrites',aWrites);
		// console.log('aNumValues',aNumValues);
		// console.log('aValues',aValues);

		//Call the LJM function
		errorResult = self.ljm.LJM_eAddresses(
			self.handle,
			numFrames,
			aAddresses,
			aTypes,
			aWrites,
			aNumValues,
			aValues,
			errorVal
		);
		if(errorResult === 0) {
			// console.log('readMac Async Success',aValues);
			var i;
			var macStr = '';
			var tVar;

			for(i = 2; i < driver_const.typeSizes.UINT64-1; i++) {
				tVar = aValues.readDoubleLE(i*driver_const.typeSizes.UINT64).toString(16);
				if(tVar.length < 2) {
					tVar = '0' + tVar;
				}
				macStr += tVar;
				macStr += ':';
			}
			tVar = aValues.readDoubleLE(7*driver_const.typeSizes.UINT64).toString(16);
			if(tVar.length < 2) {
				tVar = '0' + tVar;
			}
			macStr += tVar;
			// console.log('mac address:',macStr);
			return macStr;
		} else {
			throw new DriverOperationError(errorResult);
			return errorResult;
		}
	};

	this.streamSettings = {};
	var getHRDiff = function(starting, ending) {
		var res = [0,0];
		startMS = starting[0] * 1000 + starting[1]/1000000;
		endMS = ending[0] * 1000 + ending[1]/1000000;
		return (endMS - startMS).toFixed(3);
	};
	this.streamStart = function(scansPerRead, scanList, scanRate, onError, onSuccess) {
		//Check to make sure a device has been opened.
		if(self.checkStatus(onError)) {return;}
		// Wrap user onError and onSuccess functions to prevent un-wanted
		// callback executions.
		onError = wrapUserFunction(onError);
		onSuccess = wrapUserFunction(onSuccess);
		
		var argsValid = true;
		if((typeof(scansPerRead) === 'undefined') || (typeof(scansPerRead) === 'null')) {
			argsValid = false;
		}
		if((typeof(scanList) === 'undefined') || (typeof(scanList) === 'null')) {
			argsValid = false;
		}
		if((typeof(scanRate) === 'undefined') || (typeof(scanRate) === 'null')) {
			argsValid = false;
		}
		if((typeof(onError) === 'undefined') || (typeof(onError) === 'null')) {
			argsValid = false;
		}
		if((typeof(onSuccess) === 'undefined') || (typeof(onSuccess) === 'null')) {
			argsValid = false;
		}
		if(!argsValid) {
			if(onError) {
				onError('streamStart function call invalid args');
			} else {
				throw new DriverInterfaceError('streamStart function call invalid args');
			}
			return;
		}
		// Check to see if a stream is already running
		if(Object.keys(self.streamSettings).length > 0) {
			onError('streamStart: stream already running');
			return;
		}

		var numAddresses = scanList.length;

		// Allocate buffer space:
		var aScanList = allocBuffer(numAddresses * ARCH_INT_NUM_BYTES);	//Array of integers
		var pScanRate = allocBuffer(ARCH_DOUBLE_NUM_BYTES);			//Pointer to a double

		//Write data to the buffers
		var i = 0;
		var offsetD = 0;
		var isScanListInvalid = false;
		var scanListAddresses = [];
		var invalidRegisters = [];

		// Parse the scanList for numeric addresses to allow for names and 
		// populate the aScanList buffer
		for(i = 0; i < numAddresses; i++) {
			var info = self.constants.getAddressInfo(scanList[i], 'R');
			var expectedReturnType = info.type;
			var resolvedAddress = info.address;

			// Make sure the registers are streamable
			isScanListInvalid = isScanListInvalid || (!info.data.streamable);

			// If they aren't add the data to the array
			if(!info.data.streamable) {
				invalidRegisters.push({
					'address': resolvedAddress,
					'name': info.name
				});
			}

			scanListAddresses.push(resolvedAddress);
			aScanList.writeInt32LE(resolvedAddress, offsetD);
			offsetD += ARCH_INT_NUM_BYTES;
		}

		// Populate the pScanRate buffer
		pScanRate.writeDoubleLE(scanRate, 0);

		
		if(isScanListInvalid) {
			// Report errors
			onError({
				'message': 'Not all registers are streamable',
				'info': invalidRegisters
			});
		} else {
			// Save the stream settings & calculate how much data to receive on
			// during each read.
			self.streamSettings = {
				'scanRate': scanRate,
				'scansPerRead': scansPerRead,
				'numValues': scansPerRead * numAddresses,
				'readBufferSize': scansPerRead * numAddresses * ARCH_DOUBLE_NUM_BYTES,
				'scanList': scanList,
				'aScanList': scanListAddresses,
				'numAddresses': scanList.length,
				'actualScanRate': null,
				'streamActive': false,
				'startingDate': null,
				'startingTime': null,
				'timeIncrement': null,
				'blockTimeIncrement': null,
				'startingHRTime': null,
				'startedHRTime': null,
				'startupDuration': null,
				'calculatedStartTime': null,
				'numReads': 0,
				'currentReadTime': null,
			};
			var newDate = new Date();
			self.streamSettings.startingDate = newDate;
			self.streamSettings.startingTime = newDate.getTime();
			self.streamSettings.currentReadTime = newDate.getTime();
			self.streamSettings.startingHRTime = process.hrtime();
			self.ljm.LJM_eStreamStart.async(
				self.handle,
				scansPerRead,
				numAddresses,
				aScanList,
				pScanRate,
				function(err,res) {
					if(err) {
						return onError('Weird Error streamStart' + JSON.stringify(err), err);
					}
					if(res === 0) {
						self.streamSettings.startedHRTime = process.hrtime();
						var startupDuration = getHRDiff(
							self.streamSettings.startingHRTime,
							self.streamSettings.startedHRTime
						);
						self.streamSettings.startupDuration = startupDuration;
						var actualScanRate = pScanRate.readDoubleLE(0);
						var timeIncrement = 1/actualScanRate*1000;
						self.streamSettings.timeIncrement  = timeIncrement;
						self.streamSettings.blockTimeIncrement = timeIncrement * scansPerRead;
						self.streamSettings.currentReadTime += startupDuration/2;
						self.streamSettings.calculatedStartTime = self.streamSettings.currentReadTime;
						self.streamSettings.actualScanRate = actualScanRate;
						self.streamSettings.streamActive = true;
						return onSuccess(self.streamSettings);
					} else {
						return onError(res);
					}
				}
			);
		}
	};
	this.streamStartSync = function(scansPerRead, numChannels, scanList, scanRate) {
		//Check to make sure a device has been opened.
		self.checkStatus();
		throw new DriverOperationError("Closing Device Error", 'Not Implemented');
	};

	this.streamRead = function(onError, onSuccess) {
		//Check to make sure a device has been opened.
		if(self.checkStatus(onError)) {return;}
		// Wrap user onError and onSuccess functions to prevent un-wanted
		// callback executions.
		onError = wrapUserFunction(onError);
		onSuccess = wrapUserFunction(onSuccess);
		
		var readBufferSize = self.streamSettings.readBufferSize;

		// Allocate buffer space:
		var aData = allocBuffer(readBufferSize);					//Array of integers
		var deviceScanBacklog = allocBuffer(ARCH_INT_NUM_BYTES);	//Pointer to an integer
		var ljmScanBacklog = allocBuffer(ARCH_INT_NUM_BYTES);	//Pointer to an integer

		// Call the ljm eStreamRead function
		self.ljm.LJM_eStreamRead.async(
			self.handle,
			aData,
			deviceScanBacklog,
			ljmScanBacklog,
			function(err,res) {
				if(err) {
					return onError('Weird Error streamRead' + JSON.stringify(err), err);
				}
				if(res === 0) {
					var curReadTime = self.streamSettings.currentReadTime;
					var numVals = self.streamSettings.numValues;
					var newReadTime = curReadTime + self.streamSettings.blockTimeIncrement;
					self.streamSettings.currentReadTime = newReadTime;
					var numReads = self.streamSettings.numReads;
					self.streamSettings.numReads += 1;
					var deviceBacklog = deviceScanBacklog.readInt32LE(0);
					var ljmBacklog = ljmScanBacklog.readInt32LE(0);
					return onSuccess({
						'rawData': aData,
						'deviceBacklog': deviceBacklog,
						'ljmBacklog': ljmBacklog,
						'numVals': numVals,
						'scansPerRead': self.streamSettings.scansPerRead,
						'dataOffset': numReads,
						'time': curReadTime,
						'timeIncrement': self.streamSettings.timeIncrement,
						'numAddresses': self.streamSettings.numAddresses,
						'scanList': self.streamSettings.scanList
					});
				} else {
					return onError(res);
				}
			}
		);
	};
	// this.flotStreamRead = function(onError, onSuccess) {
	//	self.streamRead(onError, function(data) {
	//		var dBuffer = data.data;
	//		var elapsedTime = data.time - self.streamSettings.calculatedStartTime;
	//		console.log("HERE!", data.time, elapsedTime, data.ljmBacklog);
	//		onSuccess(data);
	//	});
	// };
	this.streamReadSync = function() {
		//Check to make sure a device has been opened.
		self.checkStatus();
		throw new DriverOperationError("Closing Device Error", 'Not Implemented');
	};

	this.streamStop = function(onError, onSuccess) {
		//Check to make sure a device has been opened.
		if(self.checkStatus(onError)) {return;}
		// Wrap user onError and onSuccess functions to prevent un-wanted
		// callback executions.
		onError = wrapUserFunction(onError);
		onSuccess = wrapUserFunction(onSuccess);
		
		// Call the ljm eStreamStop function
		self.ljm.LJM_eStreamStop.async(
			self.handle,
			function(err, res) {
				if(err) {
					return onError('Weird Error streamStop: ' + JSON.stringify(err), err);
				}
				if(res === 0) {
					// Save indication that stream stopped
					self.streamSettings.streamActive = false;

					// Save the stream settings to a new variable
					var finalSettings = {};
					var keys = Object.keys(self.streamSettings);
					keys.forEach(function(key) {
						finalSettings[key] = self.streamSettings[key];
					});

					// Clear the stream settings:
					self.streamSettings = {};
					return onSuccess(finalSettings);
				} else {
					return onError(res);
				}
			});
	};
	this.streamStopSync = function() {
		//Check to make sure a device has been opened.
		self.checkStatus();
		throw new DriverOperationError("Closing Device Error", 'Not Implemented');
	};
	

	/**
	 * Checks to see if a device is authorized.
	 * 
	 * @param {function} onError function called when finishing with an error.
	 * @param {function} onSuccess Function called when finishing successfully.
	 *		Should take a single parameter: a boolean set to true if the device
	 *		is authorized or false if the device is not authorized.
	 */
	this.isAuthorized = function(onError, onSuccess) {
		//Check to make sure a device has been opened.
		if(self.checkStatus(onError)) {return;}
		// Wrap user onError and onSuccess functions to prevent un-wanted
		// callback executions.
		onError = wrapUserFunction(onError);
		onSuccess = wrapUserFunction(onSuccess);

		// Allocate buffer space:
		var isAuthorized = allocBuffer(ARCH_INT_NUM_BYTES);	//Pointer to an integer

		// Call the ljm IsAuth function
		self.ljm.LJM_IsAuth.async(
			self.handle,
			isAuthorized,
			function(err,res) {
				if(err) {
					return onError('Weird Error isAuthorized' + JSON.stringify(err), err);
				}
				if(res === 0) {
					var isAuthVal = isAuthorized.readInt32LE(0);
					var isAuth = false;
					if(isAuthVal == 1) {
						isAuth = true;
					}
					return onSuccess(isAuth);
				} else {
					//Error
					return onError(res);
				}
			}
		);
	};
	this.isAuthorizedSync = function() {
		//Check to make sure a device has been opened
		self.checkStatus();

		// Allocate buffer space:
		var isAuthorized = allocBuffer(ARCH_INT_NUM_BYTES);	//Pointer to an integer
		
		var isAuth = false;
		
		output = self.ljm.LJM_IsAuth(
			self.handle,
			isAuthorized
		);
		if (output === 0) {
			var isAuthVal = isAuthorized.readInt32LE(0);
			isAuth = false;
			if(isAuthVal == 1) {
				isAuth = true;
			}
		}

		if (output === 0) {
			return isAuth;
		} else {
			throw new DriverOperationError(output);
		}
	};

	/**
	 * Closes the device if it is currently open asynchronously.
	 *
	 * @param {function} onError function called when finishing with an error.
	 * @param {function} onSuccess Function called when finishing successfully.
	 *		Should take a single parameter: a boolean set to true if the device
	 *		was closed or false if the device was already closed.
	 */
	this.close = function(onError, onSuccess) {
		//Make sure that a device is open
		if(self.checkStatusCloseOnly(onError)) {return;}

		// After calling close, calling any other function will result in an
		// error until a device is re-opened, even if the close fails.
		self.isHandleValid = false;

		//Call the driver function
		output = self.ljm.LJM_Close.async(self.handle, function (err, res) {
			if(err) {
				return onError('Weird Error close', err);
			}
			if ( res === 0 ) {
				self.handle = null;
				self.deviceType = null;
				self.connectionType = null;
				self.identifier = null;
				return onSuccess(true);
			} else {
				return onError(res);
			}
		});
	};

	/**
	 * Closes the device if it is currently open synchronously.
	 *
	 * @throws {DriverInterfaceError} If there isn't an open device to close
	 * @throws {DriverOperationError} If there has been a closing-error
	 */
	this.closeSync = function() {
		//Make sure that a device is open
		self.checkStatusCloseOnly();

		// After calling close, calling any other function will result in an
		// error until a device is re-opened, even if the close fails.
		self.isHandleValid = false;

		output = self.ljm.LJM_Close(self.handle);

		if ( output === 0 ) {
			//REPORT NO ERROR HAS OCCURED
			self.handle = null;
			self.deviceType = null;
			self.connectionType = null;
			self.identifier = null;
		} else {
			//REPORT CLOSING ERROR HAS OCCURED
			throw new DriverOperationError("Closing Device Error", output);
		}
	};
	
	/**
	 * Check if a device has basic information loaded.
	 *
	 * Utility function to ensure that the device has been opened, has a valid
	 * handle, and a valid device type.
	 *
	 * @param onError: Optional function to call if this test fails. If this
	 *		callback is provided, no errors are thrown.
	 * @throws DriverInterfaceError: Thrown if no onError callback is provided
	 *		but the device was never opened, was assigned an invalid handle, or
	 *		has an invalid deviceType.
	**/
	this.checkStatus = function(onError) {
		if (!self.isHandleValid) {
			if ( (self.handle === null) && (self.deviceType === null) ) {
				if ( onError === null ) {
					throw new DriverInterfaceError("Device Never Opened");
					return true;
				} else {
					onError("Device Never Opened");
					return true;
				}
			} else {
				console.trace(
					'Weird labjack-nodejs state',
					self.isHandleValid,
					self.handle,
					self.deviceType
				);
				if(onError) {
					onError("Weird labjack-nodejs state");
					return true;
				} else {
					throw new DriverInterfaceError("Device Never Opened");
					return true;
				}
			}
			
		} else {
			if ( (self.handle === null) && (self.deviceType === null) ) {
				if ( onError === null ) {
					throw new DriverInterfaceError("Device Never Opened");
					return true;
				} else {
					onError("Device Never Opened");
					return true;
				}
			}
		}
	};
	this.checkStatusCloseOnly = function(onError) {
		if ( (self.handle === null) && (self.deviceType === null) ) {
			if ( onError === null ) {
				throw new DriverInterfaceError("Device Never Opened");
				return true;
			} else {
				onError("Device Never Opened");
				return true;
			}
		}
	};



	//********************* EXTRA ACCESSORY FUNCTIONS ********************

	var self = this;
};