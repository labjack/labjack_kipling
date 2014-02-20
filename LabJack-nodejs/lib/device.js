/**
 * Wraps an LJM handle with all LabJack device functionality.
 *
 * @author Chris Johnson (chrisjohn404, LabJack Corp.)
**/

//NOT SURE IF THIS IS NEEDED
var driver_const = require('./driver_const');
var ref = require('ref');// http://tootallnate.github.io/ref/#types-double
var util = require('util');
var driverLib = require('./driver_wrapper');
var ffi = require('ffi');
//var ljm = require('./ljmDriver');
var fs = require('fs'); // To load/save firmware
var http = require('http');// To download newest firmware versions form the
						   // internet
var ljmDriver = require('./driver.js');


var ARCH_INT_NUM_BYTES = 4;
var ARCH_DOUBLE_NUM_BYTES = 8;

var ARCH_POINTER_SIZE = {
    'ia32': 4,
    'x64': 8,
    'arm': 4
}[process.arch]


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
};
util.inherits(DriverOperationError, Error);
DriverOperationError.prototype.name = 'Driver Operation Error';


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
function DriverInterfaceError(description)
{
	this.description = description;
	this.message = description;
};
util.inherits(DriverInterfaceError, Error);
DriverInterfaceError.prototype.name = 'Driver Interface Error';



/**
 * Create a new LabJack device handle wrapper.
 *
 * @constructor for a LabJack device in .js
 */
exports.labjack = function ()
{
	this.ljm = driverLib.getDriver();
	this.handle = null;
	this.deviceType = null;

	//Saves the Constants object
	this.constants = driverLib.getConstants();

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
	 * 		opening of a device based on a unique identifier (either string IP
	 *		address or integer serialNumber). If not specified, defaults to
	 *		"LJM_idANY".
	 * @param {function} onError function Callback for error-case.
	 * @param {function} onSuccess function Callback for success-case.
	 * @throws {DriverInterfaceError} if there are any un-recoverable errors
	**/
	this.open = function()
	{	
		//Variables to save information to allowing for open(onError, onSuccess)
		var deviceType, connectionType, identifier, onError, onSuccess;

		//Determine how open() was used
		if(arguments.length == 2) {
			//If there are two args, aka open(onError, onSuccess) call

			var argA = typeof(arguments[0]);
			var argB = typeof(arguments[1]);

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

		//Complete Asynchronous function-call,
		//Make sure we aren't already connected to a device
		if(this.handle == null) {
			//Create variables for the ffi call
			var refDeviceHandle = new ref.alloc(ref.types.int,1);
			var output;

			//Get the type's of the inputs
			var dtType = typeof(deviceType);
			var ctType = typeof(connectionType);
			var idType = typeof(identifier);

			var self = this;
			//Function for handling the ffi callback
			var handleResponse = function(err, res) {
				if (err) throw err;
				//Check for no errors
				if(res == 0) {
					//Save the handle & other information to the 
					//	device class
					self.handle = refDeviceHandle[0];
					self.deviceType = deviceType;
					self.connectionType = connectionType;
					self.identifier = identifier;
					onSuccess();
				} else {
					//Make sure that the handle, deviceType 
					//		& connectionType are still null
					self.handle = null;
					self.deviceType = null;
					self.connectionType = null;
					self.identifier = null;
					onError(res);
				}
			};

			//Determine which LJM function to call
			if((dtType=="number")&&(ctType=="number")&&(idType=="string")) {
				//call LJM_Open() using the ffi async call
				output = this.ljm.LJM_Open.async(
					deviceType, 
					connectionType, 
					identifier, 
					refDeviceHandle, 
					handleResponse
				);
			}
			else if((dtType=="string")&&(ctType=="string")&&(idType=="string"))
			{
				//call LJM_OpenS() using the ffi async call
				output = this.ljm.LJM_OpenS.async(
					deviceType, 
					connectionType, 
					identifier, 
					refDeviceHandle, 
					handleResponse
				);
			} else {
				//If there were no applicable LJM function calls, throw an error
				throw new DriverInterfaceError("Un-Handled Variable Types");
			}
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
	 * 		opening of a device based on a unique identifier (either string IP
	 *		address or integer serialNumber). If not specified, defaults to
	 *		"LJM_idANY".
	 * @return {number} 0 on success, LJM_ Error Number on error.
	 * @throws {DriverInterfaceError} If there is a driver wrapper-error
	 * @throws {DriverOperationError} If there is an LJM reported error
	**/
	this.openSync = function(deviceType, connectionType, identifier)
	{
		//Variables to save information to allowing for open()
		var deviceType, connectionType, identifier;

		//Determine how open() was used
		if(arguments.length == 0) {
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
		if(this.handle == null) {
			//Create variables for the ffi call
			var refDeviceHandle = new ref.alloc(ref.types.int,1);
			var output;

			//Get the type's of the inputs
			var dtType = typeof(deviceType);
			var ctType = typeof(connectionType);
			var idType = typeof(identifier);

			//Determine which LJM function to call
			if((dtType=="number")&&(ctType=="number")&&(idType=="string")) {
				//call LJM_Open() using the ffi async call
				output = this.ljm.LJM_Open(
					deviceType,
					connectionType,
					identifier,
					refDeviceHandle
				);
			}
			else if((dtType=="string")&&(ctType=="string")&&(idType=="string")) 
			{
				//call LJM_OpenS() using the ffi async call
				output = this.ljm.LJM_OpenS(
					deviceType,
					connectionType,
					identifier,
					refDeviceHandle
				);
			} else {
				//If there were no applicable LJM function calls, throw an error
				throw new DriverInterfaceError("Un-Handled Variable Types");
			}

			//Determine whether or not the Open call was successful
			if(output == 0) {
				//Save the handle & other information to the 
				//	device class
				this.handle = refDeviceHandle[0];
				this.deviceType = deviceType;
				this.connectionType = connectionType;
				this.identifier = identifier;
				return output;
			} else {
				//Make sure that the handle, deviceType 
				//		& connectionType are still null
				this.handle = null;
				this.deviceType = null;
				this.connectionType = null;
				this.identifier = null;

				//Report an error
				throw new DriverOperationError(output);
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
	 * 		deviceType {number} A device model type corresponding to a constant
	 *			in LabJackM.h. 
	 * 		connectionType {number} A constant from LabJackM.h that defines
	 *			connection medium the driver is using to communicate with the
	 *			device.
	 * 		serialNumber {number} The device unique integer serial number.
	 * 		ipAddress {string} The IP address the device is located at. Defaults
	 *			to all zeros if not connected by the network (0.0.0.0).
	 * 		port {number} The port at which the device is connected.
	 * 		maxBytesPerMB {number} The maximum payload in bytes that the
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
		if(this.checkStatus(onError)) { return 1;};

		var errorResult;

		var deviceType = ref.alloc('int', 1);
		var connectionType = ref.alloc('int', 1);
		var serialNumber = ref.alloc('int', 1);
		var ipAddr = ref.alloc('int', 1);
		var port = ref.alloc('int', 1);
		var maxBytesPerMessage = ref.alloc('int', 1);

		errorResult = this.ljm.LJM_GetHandleInfo.async(
			this.handle, 
			deviceType, 
			connectionType, 
			serialNumber, 
			ipAddr, 
			port, 
			maxBytesPerMessage, 
			function (err, res) {
				if (err) throw err;
				if (res == 0) {
					var ipStr = "";
					
					ipStr += ipAddr.readUInt8(3).toString();
					ipStr += ".";
					ipStr += ipAddr.readUInt8(2).toString();
					ipStr += ".";
					ipStr += ipAddr.readUInt8(1).toString();
					ipStr += ".";
					ipStr += ipAddr.readUInt8(0).toString();
					
					onSuccess(
						{
							deviceType: deviceType.deref(),
							connectionType: connectionType.deref(),
							serialNumber: serialNumber.deref(),
							ipAddress: ipStr,
							port: port.deref(),
							maxBytesPerMB: maxBytesPerMessage.deref()
						}
					);
				} else {
					onError(res);
				}
			}
		);
		return errorResult;
	};

	/**
	 * Retrieves device information about this device.
	 *
	 * Retrieves device metadata information about the device whose handle this
	 * object encapsulates. Returns a DeviceInfo object with the following
	 * structure:
     * 
	 * { 
	 * 		deviceType {number} A device model type corresponding to a constant
	 *			in LabJackM.h. 
	 * 		connectionType {number} A constant from LabJackM.h that defines
	 *			connection medium the driver is using to communicate with the
	 *			device.
	 * 		serialNumber {number} The device unique integer serial number.
	 * 		ipAddress {string} The IP address the device is located at. Defaults
	 *			to all zeros if not connected by the network (0.0.0.0).
	 * 		port {number} The port at which the device is connected.
	 * 		maxBytesPerMB {number} The maximum payload in bytes that the
	 *			driver can send to the device over the current connection
	 *			medium.
	 * }
	 *
	 * @return {Object/Number} Object conforming to the DeviceInfo structure as
	 *		defined above.
	 * @throws {Error} Thrown if any errors are discovered.
	**/
	this.getHandleInfoSync = function() {
		//Check to make sure a device has been opened
		this.checkStatus();

		var errorResult;

		var devT = ref.alloc('int', 1);
		var conT = ref.alloc('int', 1);
		var sN = ref.alloc('int', 1);
		var ipAddr = ref.alloc('int', 1);
		var port = ref.alloc('int', 1);
		var maxB = ref.alloc('int', 1);

		//Perform device I/O Operation
		errorResult = this.ljm.LJM_GetHandleInfo(
			this.handle, 
			devT, 
			conT, 
			sN,
			ipAddr, 
			port, 
			maxB
		);
		
		//Check to see if there were any errors
		if (errorResult != 0) {
			throw new DriverOperationError(errorResult);
		}

		var returnVariable = {
			deviceType: devT.deref(),
			connectionType: conT.deref(),
			serialNumber: sN.deref(),
			ipAddress: ipAddr.deref(),
			port: port.deref(),
			maxBytesPerMB: maxB.deref()
		};
		return returnVariable;
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
		if (this.checkStatus(onError)) { return; };

		//Make sure the data is valid
		if (typeof(data[0]) != "number") {
			onError("Data is not a number array");
		}

		//Create a blank array for data to be saved to & returned
		var aData = new Buffer(data.length);
		aData.fill(0);

		errorResult = this.ljm.LJM_ReadRaw.async(
			this.handle, 
			aData, 
			data.length, 
			function (err, res) {
				if (err) throw err;
				if (res == 0) {
					onSuccess(aData);
				} else {
					onError(res);
				}
		});
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
		this.checkStatus();

		//Make sure the data is valid, a number array
		if (typeof(data[0]) != "number") {
			throw new DriverInterfaceError("Data is not a number array");
		}

		//Create a blank array for data to be saved to & returned
		var bufferData = new Buffer(data.length);
		bufferData.fill(0);

		errorResult = this.ljm.LJM_ReadRaw(this.handle, bufferData,
			data.length);

		//Check for an error
		if (errorResult != 0) {
			throw new DriverOperationError(errorResult);
		}
		return bufferData;
	};

	/**
	 * Asynchronously reads a single modbus address.
	 *
	 * @param {Number/String} address Either an integer register address or a 
	 *		String name compatible with LJM.
	 * @param {function} onError Takes a single argument represenging
	 *		the LJM-Error, either an integer error number or a String.
	 * @param {Number/String} onSuccess Callback taking a single argument: an
	 *		array containging data (as number or string elements based on data
	 *		type) requested from the device.
	 * @throws {DriverInterfaceError} If the input args aren't correct.
	 */
	this.read = function(address, onError, onSuccess) {

		//Check to make sure a device has been opened
		if (this.checkStatus(onError)) { return; };

		var output;
		var addressNum = 0;
		var result = new ref.alloc('double',1);
		var info = this.constants.getAddressInfo(address, 'R');
		var expectedReturnType = info.type;
		var isReturningString = expectedReturnType == driver_const.LJM_STRING;
		var isDirectionValid = info.directionValid == 1;
		var resolvedAddress = info.address;
		if (isDirectionValid && !isReturningString) {
			//Perform a eReadName operation
			
			//Allocate space for a read value
			var result = new ref.alloc('double',1);
			this.ljm.LJM_eReadAddress.async(
				this.handle, 
				resolvedAddress, 
				info.type, 
				result,
				function(err, res) {
					if (err) throw err;
					if ( res == 0 ) {
						//Success
						onSuccess(result.deref());
					} else {
						//Error
						onError(res);
					}
				});
		
		} else if (isDirectionValid && isReturningString) {
			//Perform a eReadAddressString operation
			
			//Allocate space for the result
			var strBuffer = new Buffer(driver_const.LJM_MAX_STRING_SIZE);
			strBuffer.fill(0);

			//Perform LJM Async function call
			this.ljm.LJM_eReadAddressString.async(
				this.handle, 
				resolvedAddress, 
				strBuffer, 
				function(err, res) {
					if (err) throw err;
					if ( res == 0 ) {
						//Calculate the length of the string
						var i = 0;
						while ( strBuffer[i] != 0 ) {
							i++;
						}
						onSuccess(strBuffer.toString('utf8', 0, i));
					} else {
						onError(res);
					}
				}
			);
		
		} else {
			if (info.type == -1) {
				onError('Invalid Address');
			} else if (info.directionValid == 0) {
				onError('Invalid Read Attempt');
			}
			return -1;
		}
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
		this.checkStatus();

		var info = this.constants.getAddressInfo(address, 'R');
		var expectedReturnType = info.type;
		var isReturningString = expectedReturnType == driver_const.LJM_STRING;
		var isDirectionValid = info.directionValid == 1;
		var resolvedAddress = info.address;

		var output;
		var addressNum = 0;
		var result;
		
		if (isDirectionValid && !isReturningString) {
			//Perform a eReadName operation
			
			//Allocate space for a read value
			result = new ref.alloc('double',1);
			output = this.ljm.LJM_eReadAddress(
				this.handle, 
				resolvedAddress, 
				info.type, 
				result
			);
			if(output == 0) {
				result = result.deref();
			}

		} else if (isDirectionValid && isReturningString) {
			//Perform a eReadNumberString operation
			
			//Allocate space for the result
			var strBuffer = new Buffer(driver_const.LJM_MAX_STRING_SIZE);
			strBuffer.fill(0);

			output = this.ljm.LJM_eReadAddressString(
				this.handle, 
				resolvedAddress, 
				strBuffer
			);
			if(output == 0) {
				var i=0;
				while(strBuffer[i] != 0) {
					i++;
				}
				result = strBuffer.toString('utf8',0,i);
			}
		
		} else {
			if(info.type == -1) {
				throw new DriverInterfaceError('Invalid Address');
			} else if (info.directionValid == 0) {
				throw new DriverInterfaceError('Invalid Read Attempt');
			}
			
			throw new DriverInterfaceError('Unexpected error.');
		}

		if (output == 0) {
			return result;
		} else {
			throw new DriverOperationError(output);
		}
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
		if ( this.checkStatus(onError) ) { return; };

		//Get important info & allocate argument variables
		var length = addresses.length;
		var returnResults = Array();
		var results = new Buffer(ARCH_DOUBLE_NUM_BYTES * length);
		var errors = new ref.alloc('int',1);
		var addressInformation;
		errors.fill(0);
		var output;

		if(length < 1) {
			throw new DriverInterfaceError("Addresses array must contain data");
			onError("Addresses array must contain data");
		}

		var addrBuff = new Buffer(ARCH_INT_NUM_BYTES*length);
		var addrTypeBuff = new Buffer(ARCH_INT_NUM_BYTES*length);
		var inValidOperation = 0;

		//Integer Returned by .dll function
		var info;
		var offset=0;
		var constants = this.constants;
		for ( var i=0; i<length; i++ ) {
			var address = addresses[i];

			info = constants.getAddressInfo(address, 'R');
			if (info.directionValid == 1) {
				addrTypeBuff.writeInt32LE(info.type,offset);
				addrBuff.writeInt32LE(info.address,offset);
				offset += ARCH_INT_NUM_BYTES;
			} else {
				if(info.type == -1) {
					onError({retError:"Invalid Address", errFrame:i});
				} else if (info.directionValid == 0) {
					onError({retError:"Invalid Read Attempt", errFrame:i});
				} else {
					onError({retError:"Unexpected error", errFrame:i});
				}
				return -1;
			}
		}
		errorResult = this.ljm.LJM_eReadAddresses.async(
			this.handle, 
			length, 
			addrBuff, 
			addrTypeBuff, 
			results, 
			errors, 
			function(err, res) {
				if (err) throw err;
				var offset = 0;
				for (i in addresses) {
					returnResults[i] = results.readDoubleLE(offset);
					offset += ARCH_DOUBLE_NUM_BYTES;
				}
				if ((res == 0)) {
					onSuccess(returnResults);
				} else {
					onError({retError:res, errFrame:errors.deref()});
				}
			}
		);
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
		this.checkStatus();

		//Get important info & allocate argument variables
		var length = addresses.length;
		var returnResults = Array();

		//Define buffers
		var results = new Buffer(ARCH_DOUBLE_NUM_BYTES * length);
		var errors = new ref.alloc('int',1);

		//Make sure buffers are empty
		results.fill(0);
		errors.fill(0);

		var output;

		if ( length < 1 ) {
			throw new DriverInterfaceError("Addresses array must contain data");
		}
		if ( typeof(addresses[0]) == 'string' ) {
			var i;
			//ref: http://tootallnate.github.io/ref/
			var aNames = new Buffer(ARCH_POINTER_SIZE*length);
			aNames.fill(0);

			for(i = 0; i < length; i++) {
				var buf = new Buffer(addresses[i].length+1);
				buf.fill(0);
				ref.writeCString(buf,0,addresses[i]);
				ref.writePointer(aNames,i*ARCH_POINTER_SIZE,buf);
			}

			//Execute LJM command
			errorResult = this.ljm.LJM_eReadNames(
				this.handle, 
				length, 
				aNames, 
				results, 
				errors
			);

		} else if ( typeof(addresses[0] ) == 'number') {
			var addrBuff = new Buffer( ARCH_INT_NUM_BYTES * length);
			var addrTypeBuff = new Buffer( ARCH_INT_NUM_BYTES * length);
			var inValidOperation = 0;

			//Integer Returned by .dll function
			var info;
			var offset=0;
			i = 0;
			for ( i = 0; i < length; i++ ) {
				info = this.constants.getAddressInfo(addresses[i], 'R');
				if ( info.directionValid == 1 ) {
					addrTypeBuff.writeInt32LE(info.type,offset);
					addrBuff.writeInt32LE(addresses[i],offset);
					offset += ARCH_INT_NUM_BYTES;
				}
				else {
					if ( info.type == -1 ) {
						throw new DriverInterfaceError(
							{
								retError:"Invalid Address", 
								errFrame:i
							}
						);
					} else if (info.directionValid == 0) {
						throw new DriverInterfaceError(
							{
								retError:"Invalid Read Attempt", 
								errFrame:i
							}
						);
					} else {
						throw new DriverInterfaceError(
							{
								retError:"Unexpected Error", 
								errFrame:i
							}
						);
					}
				}
			}

			//Execute LJM command
			errorResult = this.ljm.LJM_eReadAddresses(
				this.handle, 
				length, 
				addrBuff, 
				addrTypeBuff, 
				results, 
				errors
			);
		} else {
			//Error!! input arguments aren't of proper type.
			throw new DriverInterfaceError("Invalid Arguments");
		}
		if(errorResult == 0) {
			var i;
			var offset = 0;
			for(i in addresses) {
				returnResults[i] = results.readDoubleLE(offset);
				offset += ARCH_DOUBLE_NUM_BYTES;
			}
			return returnResults;
		} else {
			throw new DriverInterfaceError(
				{
					retError:errorResult, 
					errFrame:errors.deref()
				}
			);
		}
		return 0;
	};

	/**
	 * Writes a request to the device without interpretation.
	 * 
	 * @param {Array} data The data (Array of double) to write to the device.
	 * @param {function} onError Function to call if an error is encountered
	 * 		during operation. Should take a single parameter describing the
	 *		error encountered.
	 * @param {function} onSuccess Function tao call after the operation
	 *		finishes. Called with a single parameter: Buffer of double.
	 */
	this.writeRaw = function(data, onError, onSuccess) {
		//Check to make sure a device has been opened
		if ( this.checkStatus(onError) ) { return; };

		if ( typeof(data[0]) != "number" ) {
			console.log('WriteRaw-Err, data not a number-array');
		}

		var aData = new Buffer(data.length);
		aData.fill(0);

		for ( var i = 0; i < data.length; i++ ) {
			aData.writeUInt8(data[i], i);
		}

		errorResult = this.ljm.LJM_WriteRaw.async(
			this.handle, 
			aData, 
			data.length, 
			function (err, res){
				if (err) throw err;
				if ( res == 0 ) {
					onSuccess(aData);
				} else {
					onError(res);
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
		this.checkStatus();

		if ( typeof(data[0] ) != "number" ) {
			console.log('WriteRaw-Err, data not a number-array');
		}

		//Define data buffer
		var aData = new Buffer(data.length);
		//Clear data buffer
		aData.fill(0);
		for ( var i = 0; i < data.length; i++ ) {
			aData.writeUInt8(data[i], i);
		}

		errorResult = this.ljm.LJM_WriteRaw(
			this.handle, 
			aData, 
			data.length
		);
		if ( errorResult == 0 ) {
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
		if ( this.checkStatus(onError) ) { return; };

		//Decision making for address type (string or number)
		if ( typeof(address) == 'string' ) {
			var info = this.constants.getAddressInfo(address, 'W');

			//Decision making for LJM-address return type, number or string
			if ( (info.directionValid == 1) && (info.type != 98) ) {
				//Execute LJM command
				errorResult = this.ljm.LJM_eWriteName.async(
					this.handle, 
					address, 
					value, 
					function(err, res) {
						if (err) throw err;
						if ( res == 0 ) {
							onSuccess();
						} else {
							onError(res);
						}
					}
				);
				return 0;
			} else if ( (info.directionValid == 1) && (info.type == 98) ) {
				//Allocate space for the string to be written
				var strBuffer = new Buffer(driver_const.LJM_MAX_STRING_SIZE);
				strBuffer.fill(0);

				//Fill the write-string
				if ( value.length <= driver_const.LJM_MAX_STRING_SIZE ) {
					strBuffer.write(value, 0, value.length, 'utf8');
				} else {
					onError("String is to long");
					return 0;
				}

				//Execute LJM command
				errorResult = this.ljm.LJM_eWriteNameString.async(
					this.handle, 
					address,
					strBuffer, 
					function(err, res){
						if (err) throw err;
						if ( res == 0 ) {
							onSuccess();
						} else {
							onError(res);
						}
					}
				);
				return 0;
			} else {
				//ERROR!! address is not valid, wrong direction or invalid addr.
				if ( info.type == -1 ) {
					onError("Invalid Address");
				} else if (info.directionValid == 0) {
					onError("Invalid Write Attempt");
				}
			}
		} else if (typeof(address) == 'number') {
			var info = this.constants.getAddressInfo(address, 'W');
			if ( (info.directionValid == 1) && (info.type != 98) ) {
				//Execute LJM command
				errorResult = this.ljm.LJM_eWriteAddress.async(
					this.handle, 
					address, 
					info.type, 
					value, 
					function(err, res){
						if (err) throw err;
						if ( res == 0 ) {
							onSuccess();
						} else {
							onError(res);
						}
					}
				);
				return 0;
			} else if ( (info.directionValid == 1) && (info.type == 98) ) {
				//Allocate space for the string to be written
				var strBuffer = new Buffer(driver_const.LJM_MAX_STRING_SIZE);
				strBuffer.fill(0);

				//Fill the write-string
				if(value.length <= driver_const.LJM_MAX_STRING_SIZE) {
					strBuffer.write(value, 0, value.length, 'utf8');
				} else {
					onError("String is to long");
					return 0;
				}

				//Execute LJM command
				errorResult = this.ljm.LJM_eWriteAddressString.async(
					this.handle, 
					address,
					strBuffer, 
					function(err, res){
						if (err) throw err;
						if ( res == 0 ) {
							onSuccess();
						} else {
							onError(res);
						}
					}
				);
				return 0;
			} else {
				//ERROR!! address is not valid, wrong direction or invalid addr.
				if(info.type == -1) {
					onError("Invalid Address");
				} else if (info.directionValid == 0) {
					onError("Invalid Write Attempt");
				}
			}
		} else {
			onError("Invalid Arguments");
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
		this.checkStatus();

		var errorResult;

		//Decision making for address type (string or number)
		if ( typeof(address) == 'string' ) {
			var info = this.constants.getAddressInfo(address, 'W');
			
			//Decision making for LJM-address return type, number or string
			if ( (info.directionValid == 1) && (info.type != 98) ) {
				//Execute LJM command
				errorResult = this.ljm.LJM_eWriteName(
					this.handle, 
					address, 
					value
				);
			} else if( (info.directionValid == 1) && (info.type == 98) ) {
				//Allocate space for the string to be written
				var strBuffer = new Buffer(driver_const.LJM_MAX_STRING_SIZE);
				strBuffer.fill(0);

				//Fill the write-string
				if ( value.length <= driver_const.LJM_MAX_STRING_SIZE ) {
					strBuffer.write(value, 0, value.length, 'utf8');
				} else {
					throw new DriverInterfaceError("String is to long");
					return "string is to long";
				}
				
				//Execute LJM command
				errorResult = this.ljm.LJM_eWriteNameString(
					this.handle, 
					address,
					strBuffer
				);
			} else {
				//ERROR!! address is not valid, wrong direction or invalid addr.
				if ( info.type == -1 ) {
					throw new DriverInterfaceError("Invalid Address");
					return "Invalid Address";
				} else if (info.directionValid == 0) {
					throw new DriverInterfaceError("Invalid Write Attempt");
					return "Invalid Write Attempt";
				}
			}
		} else if(typeof(address) == 'number') {
			var info = this.constants.getAddressInfo(address, 'W');
			if ( (info.directionValid == 1) && (info.type != 98) ) {
				//Execute LJM command
				errorResult = this.ljm.LJM_eWriteAddress(
					this.handle, 
					address, 
					info.type, 
					value
				);
			} else if ( (info.directionValid == 1) && (info.type == 98) ) {
				//Allocate space for the string to be written
				var strBuffer = new Buffer(driver_const.LJM_MAX_STRING_SIZE);
				strBuffer.fill(0);

				//Fill the write-string
				if ( value.length <= driver_const.LJM_MAX_STRING_SIZE ) {
					strBuffer.write(value, 0, value.length, 'utf8');
				} else {
					throw new DriverInterfaceError("String is to long");
					return "string is to long";
				}

				//Execute LJM command
				errorResult = this.ljm.LJM_eWriteAddressString(
					this.handle, 
					address,
					strBuffer
				);
			} else {
				//ERROR!! address is not valid, wrong direction or invalid addr.
				if ( info.type == -1 ) {
					throw new DriverInterfaceError("Invalid Address");
					return "Invalid Address";
				} else if ( info.directionValid == 0 ) {
					throw new DriverInterfaceError("Invalid Write Attempt");
					return "Invalid Write Attempt";
				}
			}
		} else {
			throw new DriverInterfaceError("Invalid Arguments");
			return "Invalid Arguments";
		}
		if ( errorResult == 0 ) {
			return errorResult;
		} else {
			throw new DriverOperationError(errorResult);
			return errorResult;
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
		if ( this.checkStatus(onError) ) { return; };

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
		var aValues = new Buffer(ARCH_DOUBLE_NUM_BYTES * length);
		var errors = new ref.alloc('int',1);

		//Clear the buffers
		aValues.fill(0);
		errors.fill(0);

		var errorResult;

		//Decide whether to perform address-number or address-name operation.
		if ( typeof(addresses[0]) == 'string' ) {
			//Perform necessary string buffer allocations.
			var i;
			var offset = 0;

			//Declare aNames array buffer
			var aNames = new Buffer(ARCH_POINTER_SIZE * length);

			//Clear aNames buffer
			aNames.fill(0);

			for ( i = 0; i < length; i++ ) {
				//Append the value to the aValues array
				aValues.writeDoubleLE(values[i], offset);

				//Declare buffer for string-address
				var buf = new Buffer(addresses[i].length + 1);

				//Clear the buffer
				buf.fill(0)

				//Save the string to the buffer
				ref.writeCString(buf, 0, addresses[i]);

				//Write the pointer of the buffer to the aNames array
				ref.writePointer(aNames, offset, buf);

				//Increment the offset counter
				offset+=ARCH_POINTER_SIZE;
			}

			//Execute LJM command.
			errorResult = this.ljm.LJM_eWriteNames.async(
				this.handle, 
				length, 
				aNames, 
				aValues, 
				errors, 
				function(err, res){
					if (err) throw err;
					if ( (res == 0) ) {
						onSuccess();
					} else {
						onError({retError:res, errFrame:errors.deref()});
					}
				}
			);
			return 0;
		} else if ( typeof(addresses[0]) == 'number' ) {
			//Perform necessary number buffer allocations.
			var addrBuff = new Buffer(ARCH_INT_NUM_BYTES * length);
			var addrTypeBuff = new Buffer(ARCH_INT_NUM_BYTES * length);
			var inValidOperation = 0;

			var info;
			var offset=0;
			var offsetD = 0;
			i = 0;

			for ( i = 0; i < length; i++ ) {
				info = this.constants.getAddressInfo(addresses[i], 'W');
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
					} else if (info.directionValid == 0) {
						onError({retError:"Invalid Read Attempt", errFrame:i});
					} else {
						onError({retError:"Unexpected Error", errFrame:i});
					}
					return;
				}
			}

			//Execute LJM command.
			errorResult = this.ljm.LJM_eWriteAddresses.async(
				this.handle, 
				length, 
				addrBuff, 
				addrTypeBuff, 
				aValues, 
				errors, 
				function(err, res){
					if ( err ) throw err;
					if ( (res == 0) ) {
						onSuccess();
					}
					else {
						onError({retError:res, errFrame:errors.deref()});
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
	 * 		before calling the LJM function.
	 * @throws {DriverOperationError} Thrown if there is an error produced
	 *		during the LJM driver function.
	 */
	this.writeManySync = function (addresses, values) {
		//Check to make sure a device has been opened.
		this.checkStatus();

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
		var aValues = new Buffer(ARCH_DOUBLE_NUM_BYTES * length);
		var errors = new ref.alloc('int',1);

		//Clear the buffers
		aValues.fill(0);
		errors.fill(0);

		var errorResult;

		//Decide whether to perform address-number or address-name operation.
		if ( typeof(addresses[0]) == 'string' ) {
			//Perform necessary string buffer allocations.
			var i;
			var offset = 0;
			//Declare aNames array buffer
			var aNames = new Buffer(ARCH_POINTER_SIZE * length);
			
			//Clear aNames buffer
			aNames.fill(0);

			for ( i = 0; i < length; i++ ) {
				//Append the value to the aValues array
				aValues.writeDoubleLE(values[i], offset);

				//Declare buffer for string-address
				var buf = new Buffer(addresses[i].length + 1);

				//Clear the buffer
				buf.fill(0)

				//Save the string to the buffer
				ref.writeCString(buf, 0, addresses[i]);

				//Write the pointer of the buffer to the aNames array
				ref.writePointer(aNames, offset, buf);

				//Increment the offset counter
				offset+=ARCH_POINTER_SIZE;
			}

			//Execute LJM function.
			errorResult = this.ljm.LJM_eWriteNames(
				this.handle, 
				length, 
				aNames, 
				aValues, 
				errors
			);

		} else if (typeof(addresses[0]) == 'number') {
			//Perform necessary number buffer allocations.
			var addrBuff = new Buffer(ARCH_INT_NUM_BYTES * length);
			var addrTypeBuff = new Buffer(ARCH_INT_NUM_BYTES * length);
			var inValidOperation = 0;

			var info;
			var offset=0;
			var offsetD = 0;
			i = 0;

			for ( i = 0; i < length; i++ ) {
				info = this.constants.getAddressInfo(addresses[i], 'W');
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
					} else if (info.directionValid == 0) {
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
			errorResult = this.ljm.LJM_eWriteAddresses(
				this.handle, 
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
		if(errorResult == 0) {
			return errorResult;
		} else {
			throw new DriverOperationError(
				{
					retError:errorResult, 
					errFrame:errors.deref()}
			);
			return {retError:errorResult, errFrame:errors.deref()};
		}
	}

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
	}
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
		if (this.checkStatus(onError)) { return; };

		var i,j;
		var numFrames = addresses.length;
		var value;
		
		//Return variable
		var errorResult;


		//Perform function wide buffer allocations:
		var aDirections = new Buffer(numFrames * ARCH_INT_NUM_BYTES);//Array of directions
		var aNumWrites = new Buffer(numFrames * ARCH_INT_NUM_BYTES);//Array of ops. per frame
		var aValues = new Buffer(values.length * 8);//Array of doubles
		var errorVal = new Buffer(ARCH_INT_NUM_BYTES); //Array the size of one UInt32 for err

		//Clear all the arrays
		aDirections.fill(0);
		aNumWrites.fill(0);
		aValues.fill(0);
		errorVal.fill(0);

		if ( typeof(addresses[0]) == 'string' ) {
			//Allocate space for the aNames array
			var aNames = new Buffer(numFrames * ARCH_POINTER_SIZE);//Array of C-String pointers
			aNames.fill(0);

			var offsetD = 0;
			var offsetI = 0;
			
			//Populate the array's with data
			for ( i = 0; i < numFrames; i++ ) {
				//Fill aDirections array
				aDirections.writeUInt32LE(directions[i], offsetI);

				//Fill aNumWrites array
				aNumWrites.writeUInt32LE(numValues[i], offsetI);

				//Fill aNames array
				var buf = new Buffer(addresses[i].length + 1);
				buf.fill(0);

				ref.writeCString(buf, 0, addresses[i]);
				ref.writePointer(aNames, offsetD, buf);

				//Increment pointers
				offsetD += ARCH_POINTER_SIZE;
				offsetI += ARCH_INT_NUM_BYTES;
			}

			//Increment & fill the values array separately because it may be of
			//different length then the rest.
			offsetD = 0;
			for ( i = 0; i < values.length; i++ ) {
				var value = values[i];
				if ( typeof(value) == 'number' ) {
					aValues.writeDoubleLE(value, offsetD);
				} else {
					aValues.writeDoubleLE(0, offsetD);
				}
				offsetD += ARCH_DOUBLE_NUM_BYTES;
			}

			//Call the LJM function
			var self = this;
			errorResult = this.ljm.LJM_eNames.async(
				this.handle,
				numFrames,
				aNames,
				aDirections,
				aNumWrites,
				aValues,
				errorVal,
				function(err,res) {
					if (err) throw err;
					if ( res == 0 ) {
						onSuccess(
							self.populateRWManyArray(
								numFrames, 
								numValues, 
								directions, 
								aValues
							)
						);
					} else {
						onError(res);
					}
				}
			);
		} else if(typeof(addresses[0]) == 'number') {
			//Allocate space for the aNames array
			var aAddresses = new Buffer(numFrames * ARCH_INT_NUM_BYTES);//Array of addresses
			var aTypes = new Buffer(numFrames * ARCH_INT_NUM_BYTES);//Array of types

			var offsetD = 0;
			var offsetI = 0;

			//Populate the array's with data
			for(i = 0; i < numFrames; i++) {
				//Fill aDirections array
				aDirections.writeUInt32LE(directions[i],offsetI);

				//Fill aNumWrites array
				aNumWrites.writeUInt32LE(numValues[i],offsetI);

				//Fill aAddresses array
				aAddresses.writeUInt32LE(addresses[i],offsetI);

				//Fill aTypes array
				var info;
				if(directions[i] == driver_const.LJM_READ) {
					info = this.constants.getAddressInfo(addresses[i], 'R');
				} else if (directions[i] == driver_const.LJM_WRITE) {
					info = this.constants.getAddressInfo(addresses[i], 'W');
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
					aTypes.writeUInt32LE(info.type,offsetI);
				}
				else
				{
					//Report Error:
					if(info.type == -1) {
						throw new DriverInterfaceError(
							{
								retError:"Invalid Address", 
								errFrame:i
							}
						);
						return {retError:"Invalid Address", errFrame:i};
					} else if (info.directionValid == 0) {
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

				//Increment pointers
				offsetD +=ARCH_DOUBLE_NUM_BYTES;
				offsetI += ARCH_INT_NUM_BYTES;
			}

			//Increment & fill the values array separately because it may be of
			//different length then the rest.
			offsetD = 0;
			for ( i = 0; i < values.length; i++ ) {
				var value = values[i];
				if(typeof(value) == 'number') {
					aValues.writeDoubleLE(value,offsetD);
				} else {
					aValues.writeDoubleLE(0,offsetD);
				}
				offsetD += ARCH_DOUBLE_NUM_BYTES;
			}

			//Call the LJM function
			var self = this;
			errorResult = this.ljm.LJM_eAddresses.async(
				this.handle,
				numFrames,
				aAddresses,
				aTypes,
				aDirections,
				aNumWrites,
				aValues,
				errorVal,
				function(err,res) {
					if(err) throw err;
					if(res == 0) {
						onSuccess(
							self.populateRWManyArray(
								numFrames, 
								numValues, 
								directions, 
								aValues
							)
						);
					} else {
						onError(res);
					}
				}
			);
		} else {
			onError("Address is not a number or string array");
		}
	}
	/**
	 * [rwManySync description]
	 * @param  {[type]} numFrames  [description]
	 * @param  {[type]} addresses  [description]
	 * @param  {[type]} directions [description]
	 * @param  {[type]} numValues  [description]
	 * @param  {[type]} values     [description]
	 * @return {[type]}            [description]
	 *         							LJM driver
	 * @throws {DriverOperationError} If there is an error produced by calling 
	 *         							the LJM driver
	 */
	this.rwManySync = function(addresses,directions,numValues,values) {
		var i,j;
		var numFrames = addresses.length;
		//Check to make sure a device has been opened.
		this.checkStatus();

		//Return variable
		var errorResult;

		//Perform function wide buffer allocations:
		var aDirections = new Buffer(numFrames * ARCH_INT_NUM_BYTES);			//Array of directions
		var aNumWrites = new Buffer(numFrames * ARCH_INT_NUM_BYTES);			//Array of ops. per frame
		var aValues = new Buffer(values.length * ARCH_DOUBLE_NUM_BYTES);		//Array of doubles
		var errorVal = new Buffer(ARCH_INT_NUM_BYTES); 							//Array the size of one UInt32 for err

		//Clear all the arrays
		aDirections.fill(0);
		aNumWrites.fill(0);
		aValues.fill(0);
		errorVal.fill(0);
		if ( typeof(addresses[0]) == 'string' ) {
			//Allocate space for the aNames array
			var aNames = new Buffer(numFrames * ARCH_POINTER_SIZE);				//Array of C-String pointers
			aNames.fill(0);

			var offsetD = 0;
			var offsetI = 0;

			//Populate the array's with data
			for ( i = 0; i < numFrames; i++ ) {
				//Fill aDirections array
				aDirections.writeUInt32LE(directions[i], offsetI);

				//Fill aNumWrites array
				aNumWrites.writeUInt32LE(numValues[i], offsetI);

				//Fill aNames array
				var buf = new Buffer(addresses[i].length+1);
				buf.fill(0);

				ref.writeCString(buf, 0, addresses[i]);
				ref.writePointer(aNames, offsetD, buf);
				//Increment pointers
				offsetD += ARCH_POINTER_SIZE;
				offsetI += ARCH_INT_NUM_BYTES;
			}

			//Increment & fill the values array separately because it may be of
			//different length then the rest.
			offsetD = 0;
			for ( i = 0; i < values.length; i++ ) {
				var value = values[i];
				if ( typeof(value) === 'number' ) {
					aValues.writeDoubleLE(value,offsetD);
				} else {
					aValues.writeDoubleLE(0,offsetD);
				}
				offsetD += ARCH_DOUBLE_NUM_BYTES;
			}
			//Call the LJM function
			errorResult = this.ljm.LJM_eNames(
				this.handle,
				numFrames,
				aNames,
				aDirections,
				aNumWrites,
				aValues,
				errorVal
			);

		} else if(typeof(addresses[0]) == 'number') {
			//Allocate space for the aNames array
			var aAddresses = new Buffer(numFrames * ARCH_INT_NUM_BYTES);		//Array of addresses
			var aTypes = new Buffer(numFrames * ARCH_INT_NUM_BYTES);			//Array of types

			var offsetD = 0;
			var offsetI = 0;

			//Populate the array's with data
			for ( i = 0; i < numFrames; i++ ) {
				//Fill aDirections array
				aDirections.writeUInt32LE(directions[i], offsetI);

				//Fill aNumWrites array
				aNumWrites.writeUInt32LE(numValues[i], offsetI);

				//Fill aAddresses array
				aAddresses.writeUInt32LE(addresses[i], offsetI);

				//Fill aTypes array
				var info;
				if(directions[i] == driver_const.LJM_READ) {
					info = this.constants.getAddressInfo(addresses[i], 'R');
				} else if (directions[i] == driver_const.LJM_WRITE) {
					info = this.constants.getAddressInfo(addresses[i], 'W');
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
					aTypes.writeUInt32LE(info.type, offsetI);
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
					} else if (info.directionValid == 0) {
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
			errorResult = this.ljm.LJM_eAddresses(
				this.handle,
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
		if(errorResult == 0) {
			return this.populateRWManyArray(
						numFrames, 
						numValues, 
						directions, 
						aValues
					);
		} else {
			throw new DriverOperationError(errorResult);
			return errorResult;
		}
	}
	/**
	 * Read and write many addresses in a single driver call.
	 *
	 * @param {array} addresses Array of registers to write to. This function
	 *		interprets a collection of numbers as a collection of addresses
	 *		but interprets a string as a collection of register names.
	 * @param {array} directions Array of read/write directions. Each element
	 *		should be a number indicating the direction of the operation (read
	 *		or write).
	 * @param {array} values An array of values to send to the device. The array
	 *		size should be the size of the addresses array. The input data type
	 *		of each value is a double (number), and they will be converted into
	 *		the data type passed in types.
	 * @param {fuction} onError Function to call if an error is encountered
	 *		during this operation.
	 * @param {funcion} onSuccess Function to call after this operation
	 *		completes.
	 */
	
	/**
	 * Synchronous version of rwMany.
	 *
	 * @param {array} addresses Array of registers to write to. This function
	 *		interprets a collection of numbers as a collection of addresses
	 *		but interprets a string as a collection of register names.
	 * @param {array} directions Array of read/write directions. Each element
	 *		should be a number indicating the direction of the operation (read
	 *		or write).
	 * @param {array} values An array of values to send to the device. The array
	 *		size should be the size of the addresses array. The input data type
	 *		of each value is a double (number), and they will be converted into
	 *		the data type passed in types.
	 * @throws {DriverOperationError} If there is an error produced by calling 
	 * 		the LJM driver
	 * @return {array} Array of number read from the device during this
	 *		operation. While floating point values are interepreted, string
	 *		values are not.
	 */
	

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
		if(this.checkStatus(onError)) { 
			//onSuccess(false);
			return;
		};

		//Call the driver function
		var self = this;
		output = this.ljm.LJM_Close.async(this.handle, function (err, res) {
			if (err) throw err;
			if ( res == 0 ) {
				self.handle = null;
				self.deviceType = null;
				self.connectionType = null;
				self.identifier = null;
				onSuccess(true);
			} else {
				onError(res);
			}
		});
	}

	/**
	 * Closes the device if it is currently open synchronously.
	 *
	 * @throws {DriverInterfaceError} If there isn't an open device to close
	 * @throws {DriverOperationError} If there has been a closing-error
	 */
	this.closeSync = function() {
		//Make sure that a device is open
		this.checkStatus();

		output = this.ljm.LJM_Close(this.handle);

		if ( output == 0 ) {
			//REPORT NO ERROR HAS OCCURED
			this.handle = null;
			this.deviceType = null;
			this.connectionType = null;
			this.identifier = null;
		} else {
			//REPORT CLOSING ERROR HAS OCCURED
			throw new DriverOperationError("Closing Device Error", output);
		}
	}
	
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
		if ( (this.handle === null) && (this.deviceType === null) ) {
			if ( onError === null ) {
				throw new DriverInterfaceError("Device Never Opened");
				return true;
			} else {
				onError("Device Never Opened");
				return true;
			}
		}
	};

	/**
	 * Check that firmware constants have been loaded.
	 *
	 * @throws DriverInterfaceError: Thrown if the firmware constants have not
	 *		been loaded yet.
	**/
	this.checkFirmwareConstants = function() {
		if ( this.firmwareVersions == null ) {
			throw new DriverInterfaceError("Firmware Versions File Not Loaded");
		}
	};

	/**
	 * Check that a firmware binary is present and accessbile.
	 *
	 * @throws DriverInterfaceError: Thrown if the firmware binary has not been
	 *		loaded, is not present, or is not accessible.
	**/
	this.checkLoadedFirmware = function() {
		if ( this.firmwareFileBuffer == null ) {
			throw new DriverInterfaceError("Firmware .bin File Not Loaded");
		}
	};

	/**
	 * Check that a firmware binary has been parsed successfully.
	 *
	 * @throws DriverInterfaceError: Thrown if the fimware binary could not
	 *		be successfully parsed.
	**/
	this.checkLoadedFirmwareParsed = function() {
		if ( this.fwHeader == null ) {
			throw new DriverInterfaceError("Firmware .bin File Not Parsed");
		}
	}

	//********************* EXTRA ACCESSORY FUNCTIONS ********************


};