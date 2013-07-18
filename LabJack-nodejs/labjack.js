//NOT SURE IF THIS IS NEEDED
var driver_const = require('./driver_const');
var ref = require('ref');
var util = require('util');
var driverLib = require('./driver');
var ffi = require('ffi');

// For problems encountered while in driver DLL
function DriverOperationError(code)
{
	this.code = code;
};

// For problem with using this layer
function DriverInterfaceError(description)
{
	this.description = description;
};


debugging = function(genDebugging, debugSystem)
{
	if(genDebugging != null)
	{	
		this.genDebug = genDebugging;
		if(debugSystem != null)
		{
			if((debugSystem&1) != 0)
			{
				this.open = 1;
			}
			if(debugSystem&2 != 0)
			{
				this.close = 1;
			}
			if(debugSystem&4 != 0)
			{
				//use fake device
				this.fakeDevice = 0;
			}
		}
		else
		{
			this.open=null;
		}
	}
	else
	{
		this.genDebug = null;
		this.open = null;
		this.close = null;
	}
};

var typeSizes = {
	UINT64: 8,
	INT32: 4,
	STRING: 50,
	UINT16: 2,
	BYTE: 1,
	UINT32: 4,
	FLOAT32: 4
}
function getTypeSize(typeName)
{
	var size = typeSizes[typeName];
	if(size === undefined)
		throw "Unknown type"; // TODO: Need better error
	return size;
};


/**
 * @constructor for a LabJack device in .js
 */
exports.labjack = function (genDebuggingEnable, debugSystem)
{
	this.debug = new debugging(genDebuggingEnable, debugSystem);
	this.driver = driverLib.getDriver();
	this.handle = null;

	//Saves the Constants object
	this.constants = driverLib.getConstants();

	//console.log("dictionary Dump: "+ this.constants.getAddressInfo(0, 7, 1));
	this.constants.search(0);
	//this.constants.getAddressInfo(0);
	//this.constants.getSizeOfAddress(0);
	if(this.debug.genDebug==1)
	{
		console.log('initialized');
	}
	this.saveHandle = function(handle)
	{
		this.handle = handle;
	}
	this.checkCallback = function(args)
	{
		//console.log(typeof(args[args.length-1]));
		//console.log(typeof(args[args.length-2]));
		var bool;
		if(args.length >= 2)
		{
			if((typeof(args[args.length-1])=='function')&&(typeof(args[args.length-2])=='function'))
			{
				bool = true;
				var oE = args[args.length-2];
				var oS = args[args.length-1];
				return [bool, oE, oS];
			}
		}
		bool = false;
		return [bool, null, null];
	}
	/**
	 * Opens a new devDriverInterfaceErrorice if it isn't already connected
	 *
	 * @this {device}
	 * @param {number/string} dt (deviceType) number from driver_const.js file
	 * @param {number/string} ct (connectionType) number from driver_const.js file
	 * @param {number/string} id (identifier) that allows selective opening of a device, 
	 * 		either string IP address or number serialNumber
	 * @param {function} onE (onError) function Callback for error-case
	 * @param {function} onS (onSuccess) function Callback for success-case
	 * @return {number(when no callbacks)} 
	 */
	this.open = function(dt, ct, id, onE, onS)
	{
		var ret = this.checkCallback(arguments);
		var useCallBacks = ret[0];
		var onError = ret[1];
		var onSuccess = ret[2];
		
		var deviceType;
		var connectionType;
		var identifier;

		//var onError;
		//var onSuccess;

		//Save callbacks if they exist
		//if(useCallBacks)
		//{
		//	onError = arguments[arguments.length-2];	//Always the second to last arg.
		//	onSuccess = arguments[arguments.length-1];	//Always the last argument
		//}

		//if no arguments given, open first found
		if((arguments.length == 0)||((arguments.length == 2)&&useCallBacks))
		{
			deviceType = "LJM_dtANY";
			connectionType = "LJM_ctANY";
			identifier = "LJM_idANY";
		}
		else
		{
			deviceType = dt;
			connectionType = ct;
			identifier = id;
		}

		//Make sure we aren't already connected to a device
		var self = this;
		if(this.handle == null)
		{
			var aDeviceHandle = new ref.alloc(ref.types.int,1);
			var output;

			if((typeof(deviceType)=="number")&&(typeof(connectionType)=="number")&&(typeof(identifier)=="string"))
			{
				if(useCallBacks)
				{
					//Call the driver function
					output = this.driver.LJM_Open.async(deviceType, connectionType, identifier, aDeviceHandle, function(err, res) {
						if (err) throw err;
						if(res == 0)
						{
							self.handle = aDeviceHandle[0];
							onSuccess();//Return handle to success callback
						}
						else
						{
							onError(res);
						}
					});
					return 0;
				}
				else
				{
					output = this.driver.LJM_Open(deviceType, connectionType, identifier, aDeviceHandle);
				}
			}
			else if((typeof(deviceType)=="string")&&(typeof(connectionType)=="string")&&(typeof(identifier)=="string"))
			{
				//Call the driver function
				if(useCallBacks)
				{
					output = this.driver.LJM_OpenS.async(deviceType, connectionType, identifier, aDeviceHandle, function(err, res) {
						if (err) throw err;
						if(res == 0)
						{
							self.handle = aDeviceHandle[0];
							onSuccess();
						}
						else
						{
							onError(res);
						}
					});
					return 0;
				}
				else
				{
					output = this.driver.LJM_OpenS(deviceType, connectionType, identifier, aDeviceHandle);
				}
			}
			else
			{
				throw new DriverInterfaceError("Un-Handled Variable Types");
			}
			if(output == 0)
			{
				this.handle = aDeviceHandle[0];
				return output;
			}
			else
			{
				throw new DriverOperationError(output);
				return output;
			}
		}
		else
		{
			return driver_const.LJME_DEVICE_ALREADY_OPEN;
		}
	};
	//this.open(0,0,driver_const.LJME_CANNOT_OPEN_DEVICE);
	/**
	 * Function updates the device information loaded during an open call.
	 * Does not initiate any communication with the device.
	 */
	this.getHandleInfo = function()
	{
		this.checkStatus();
	};
	this.readRaw = function(data)
	{
		var ret = this.checkCallback(arguments);
		var useCallBacks = ret[0];
		var onError = ret[1];
		var onSuccess = ret[2];

		var aResult = new ref.alloc('char', data.length);

		if(useCallBacks)
		{
			return 0;
		}
		else
		{
			return 0;
		}
	};
	/**
	 * Function reads a single modbus address
	 *
	 * @params {number} address that you wish to read
	 * @return {number} number that was read or an error message
	 * 		NOTE: As long as the error messages are out of range +-10 this is ok.
	 */
	this.read = function(address)
	{
		this.checkStatus();

		var ret = this.checkCallback(arguments);
		var useCallBacks = ret[0];
		var onError = ret[1];
		var onSuccess = ret[2];

		var output;
		var addressNum = 0;
		
		var errorResult;
		var result = new ref.alloc('double',1);


		if((typeof(address))=="string")
		{
			if(useCallBacks)
			{
				errorResult = this.driver.LJM_eReadName.async(this.handle, address, result, function(err, res) {
					if (err) throw err;
					//console.log("mycall returned: " + res + ", Value: " + result.deref());
					if(res == 0)
					{
						onSuccess(result.deref());
					}
					else
					{
						onError(res);
					}
				});
				return 0;
			}
			else
			{
				errorResult = this.driver.LJM_eReadName(this.handle, address, result);
			}
		}
		else if((typeof(address))=="number")
		{
			//Get information necessary about the address requested
			var info = this.constants.getAddressInfo(address, 'R');
			if(useCallBacks)
			{
				errorResult = this.driver.LJM_eReadAddress.async(this.handle, address, info.type, result, function(err, res) {
					if (err) throw err;
					if(res == 0)
					{
						onSuccess(result.deref());
					}
					else
					{
						onError(res);
					}
				});
				return 0;
			}
			else
			{
				errorResult = this.driver.LJM_eReadAddress(this.handle, address, info.type, result);
			}
		}
		else
		{
			throw new DriverInterfaceError("Invalid address type.");
		}
		//Check for an error from driver & throw error
		if(errorResult != 0)
		{
			throw new DriverOperationError(errorResult);
		}
		return result.deref();
	};

	/**
	 * Function reads a single string-based modbus address
	 *
	 * @params {number/string} address that you wish to read
	 * @return {string} number that was read or an error message
	 * 		NOTE: As long as the error messages are out of range +-10 this is ok.
	 */
	this.readS = function(address)
	{
		this.checkStatus();

		var ret = this.checkCallback(arguments);
		var useCallBacks = ret[0];
		var onError = ret[1];
		var onSuccess = ret[2];

		var errorResult;
		var strBuffer = new Buffer(50);//max string size
		strBuffer.fill(0);
		if((typeof(address))=="string")
		{
			if(useCallBacks)
			{
				errorResult = this.driver.LJM_eReadString.async(this.handle, address,strBuffer, function(err, res){
					if (err) throw err;
					if(res == 0)
					{
						//console.log('Length: '+strBuffer.length);
						//console.log('Ans: '+strBuffer.toString());
						//Calculate the size of the string...
						var i = 0;
						while(strBuffer[i] != 0)
						{
							i++;
						}
						//console.log(strBuffer.toString('utf8',0,i).length);
						onSuccess(strBuffer.toString('utf8',0,i));
					}
					else
					{
						onError(res);
					}
				});
				return 0;
			}
			else
			{
				errorResult = this.driver.LJM_eReadString(this.handle, address,strBuffer);
			}
		}
		else if((typeof(address))=="number")
		{
			throw new DriverInterfaceError("NOT IMPLEMENTED");
		}
		else
		{
			throw new DriverInterfaceError("Invalid address type.");
		}
		//Check for an error from driver & throw error
		if(errorResult != 0)
		{
			throw new DriverOperationError(errorResult);
		}
		var i = 0;
		while(strBuffer[i] != 0)
		{
			i++;
		}
		return strBuffer.toString('utf8',0,i);
	}

	/**
	 * Function reads from multiple modbus addresses
	 *
	 * @params {number} addresses that you wish to read
	 * @return {numbers} numbers that were read or appropriate error messages.
	 * 		NOTE: As long as the error messages are out of range +-10 this is ok.
	 */
	this.readMany = function(addresses)
	{
		this.checkStatus();

		var ret = this.checkCallback(arguments);
		var useCallBacks = ret[0];
		var onError = ret[1];
		var onSuccess = ret[2];

		var length = addresses.length;

		var returnResults = Array();
		var results = new Buffer(8*length);
		var errors = new ref.alloc('int',1);
		errors[0]=0;

		var errorResult;

		if((typeof(addresses[0]))=="string")
		{
			//Create String Array for names
			var i;
			//var aNames = Array();
			//var aNames = new Buffer(ref.sizeof.pointer * length); //50(maximum str. length) * numAddresses
			//aNames[0] = new Buffer(addresses[0]);
			//aNames[1] = new Buffer(addresses[1]);

			//ref: http://tootallnate.github.io/ref/
			var aNames = new Buffer(8*length);
			console.log('here');
			for(i = 0; i < length; i++)
			{
				console.log('Iteration: '+i);
				var buf = new Buffer(addresses[i].length+1);
				ref.writeCString(buf,0,addresses[i]);
				console.log('Data: '+buf);
				ref.writePointer(aNames,i*8,buf);
			}
			
			console.log('Length: '+addresses.length);
			console.log('Length: '+addresses[0].length);
			console.log('Length: '+aNames.length);
			//console.log('Data: '+ ref.readPointer(aNames,0));
			
			//console.log('Length: '+ref.readPointer(aNames,0,8);
			//var t = new ffi.Array('string', length);
			//Copy Strings into buffer
			//for(i = 0; i < length; i++)
			//{
			//	aNames.writeUint32LE(addresses[i], i*4);
			//}
			if(useCallBacks)
			{
				errorResult = this.driver.LJM_eReadNames.async(this.handle, length, aNames, results, errors, function(err, res){
					if(err) throw err;
					var errorOffset = 0;
					offset = 0;
					console.log('Err Frame Num: '+errors.deref());
					for(i in addresses)
					{
						returnResults[i] = results.readDoubleLE(offset);
						offset += 8;
					}
					if((res == 0))
					{
						onSuccess(returnResults);
					}
					else
					{
						console.log(returnResults);
						onError(res);
					}
				});
				return 0;
			}
			else
			{
				errorResult = this.driver.LJM_eReadNames(this.handle, length, addresses, results, errors);
			}
			

			//ref.refType('string'),			//aNames (Registers to read from)

		}
		if((typeof(addresses[0]))=="number")
		{
			var addrBuff = new Buffer(4*length);
			var addrTypeBuff = new Buffer(4*length);
			
			
			//clear the error array:
			for(i=0;i<(length*4); i++)
			{
				errors.writeInt8(0,i);
			}

			var inValidOperation = 0;

			//Integer Returned by .dll function
			var info;
			var offset=0;
			for(i in addresses)
			{
				info = this.constants.getAddressInfo(addresses[i], 'R');
				if(info.directionValid == 1)
				{
					addrTypeBuff.writeInt32LE(info.type,offset);
					addrBuff.writeInt32LE(addresses[i],offset);
					offset += 4;
				}
				else
				{
					inValidOperation = 1;
					throw new DriverInterfaceError("Trying to read a register that can't be read");
				}
			}
			if(inValidOperation != 1)
			{
				//Perform Device I/O function
				errorResult = this.driver.LJM_eReadAddresses(this.handle, length, addrBuff, addrTypeBuff, results, errors);

				//Check to see if there were any .dll errors
				if(errorResult == 0)
				{
					//Now we need to check for individual address errors & save the results
					//in a manner more sutable for javascript (make it not a type buffer)
					var errorOffset = 0;
					offset = 0;
					for(i in addresses)
					{
						returnResults[i] = results.readDoubleLE(offset);
						if(errors.readInt32LE(errorOffset)!=0)
						{
							//console.log('Error: ' + errors.readInt32LE(errorOffset) + ' at: ' + i);
							throw new DriverOperationError(errors.readInt32LE(errorOffset));
						}
						offset += 8;
						errorOffset += 4;
					}
				}
				else
				{
					throw new DriverOperationError(errorResult);
				}
					
			}
			//We have acquired the data successfully, yay! return it!
			return returnResults;
		}
		else
		{
			throw new DriverInterfaceError("Invalid address type.");
		}
	};

	/**
	 * Function writes to a single modbus address
	 *
	 * @params {number} address that you wish to read
	 * @params {number} value that you wish to write
	 * @return {number} number that was read or an error message
	 * 		NOTE: As long as the error messages are out of range +-10 this is ok.
	 */
	this.write = function(address, value)
	{
		this.checkStatus();
		var ret = this.checkCallback(arguments);
		var useCallBacks = ret[0];
		var onError = ret[1];
		var onSuccess = ret[2];

		var errorResult;

		if((typeof(address))=="string")
		{
			if(useCallBacks)
			{
				errorResult = this.driver.LJM_eWriteName.async(this.handle, address, value, function(err, res){
					if(err) throw err;
					if(res == 0)
					{
						onSuccess();
					}
					else
					{
						onError(res);
					}
				});
				return 0;
			}
			else
			{
				errorResult = this.driver.LJM_eWriteName(this.handle, address, value);
			}
		}
		else if((typeof(address))=="number")
		{
			//Get information necessary type-info about the address requested
			var info = this.constants.getAddressInfo(address, 'W');
			if(useCallBacks)
			{
				errorResult = this.driver.LJM_eWriteAddress.async(this.handle, address, info.type, value, function(err, res){
					if(err) throw err;
					if(res == 0)
					{
						onSuccess();
					}
					else
					{
						onError(res);
					}
				});
				return 0;
			}
			else
			{
				//According to LabJackM.h: int Handle, int Address, int Type, double * Value
				errorResult = this.driver.LJM_eWriteAddress(this.handle, address, info.type, value);
			}
		}
		else
		{
			throw new DriverInterfaceError("Invalid address type.");
		}
		//Check for an error from driver & throw error
		if(errorResult != 0)
		{
			throw new DriverOperationError(errorResult);
		}
		//Return the value written to the labjack device
		return errorResult;
	};
	/**
	 * Function reads a single string-based modbus address
	 *
	 * @params {number/string} address that you wish to read
	 * @params {string} the string to be written
	 * @return {number} 0 if successful, error message if not
	 * 		NOTE: As long as the error messages are out of range +-10 this is ok.
	 */
	this.writeS = function(address, strIn)
	{
		this.checkStatus();

		var ret = this.checkCallback(arguments);
		var useCallBacks = ret[0];
		var onError = ret[1];
		var onSuccess = ret[2];

		var errorResult;
		var strBuffer = new Buffer(50);//max string size
		strBuffer.fill(0);
		strBuffer.write(strIn, 0, strIn.length, 'utf8');
		if((typeof(address))=="string")
		{
			if(useCallBacks)
			{
				errorResult = this.driver.LJM_eWriteString.async(this.handle, address,strBuffer, function(err, res){
					if (err) throw err;
					if(res == 0)
					{
						//console.log('Length: '+strBuffer.length);
						//console.log('Ans: '+strBuffer.toString());
						//Calculate the size of the string...
						var i = 0;
						while(strBuffer[i] != 0)
						{
							i++;
						}
						//console.log(strBuffer.toString('utf8',0,i).length);
						onSuccess();
					}
					else
					{
						onError(res);
					}
				});
				return 0;
			}
			else
			{
				errorResult = this.driver.LJM_eWriteString(this.handle, address,strBuffer);
			}
		}
		else if((typeof(address))=="number")
		{
			throw new DriverInterfaceError("NOT IMPLEMENTED");
		}
		else
		{
			throw new DriverInterfaceError("Invalid address type.");
		}
		//Check for an error from driver & throw error
		if(errorResult != 0)
		{
			throw new DriverOperationError(errorResult);
		}
		var i = 0;
		while(strBuffer[i] != 0)
		{
			i++;
		}
		return strBuffer.toString('utf8',0,i);
	}

	/**
	 * Function writes to multiple modbus addresses
	 *
	 * @params {number} address that you wish to read
	 * @params {number} value that you wish to write
	 * @return {number} number that was read or an error message
	 * 		NOTE: As long as the error messages are out of range +-10 this is ok.
	 */
	this.writeRegisters = function(addresses, values)
	{
		//Get the number of addresses & values and make sure they are equal
		var length = addresses.length;
		if(length == values.length)
		{
			this.checkStatus();
			if((typeof(addresses[0]))=="string")
			{

			}
			if((typeof(addresses[0]))=="number")
			{
				//create an array where the results can be placed
				var returnResults = Array();

				//Allocate buffer's that will be used to pass information to and from a labjack device
				var addrBuff = new Buffer(4*length);
				var addrTypeBuff = new Buffer(4*length);
				var results = new Buffer(8*length);
				var errors = new Buffer(4*length);

				//Create offset values
				var offsetFloat = 0;
				var offsetInt = 0;

				//Create variables to get address information & check for errors
				var info;
				var directionTypeError = 0;
				var errorResult = 0;

				//Initialize Array's
				for(i in addresses)
				{
					info = this.constants.getAddressInfo(addresses[i], 'W');
					if(info.directionValid == 1)
					{
						addrBuff.writeInt32LE(addresses[i],offsetInt);
						addrTypeBuff.writeInt32LE(info.type,offsetInt);
						results.writeDoubleLE(values[i], offsetFloat);
						errors.writeInt32LE(0,offsetInt);
						offsetInt += 4;
						offsetFloat += 8;
					}
					else
					{
						directionTypeError = 1;
						throw new DriverInterfaceError("trying to write to a register that can't be written to");
					}
				}
				//Array's are now initialized, they can be passed into the dll writeAddresses function now
				if(directionTypeError != 1)
				{
					//Perform Device I/O function
					errorResult = this.driver.LJM_eWriteAddresses(this.handle, length, addrBuff, addrTypeBuff, results, errors);

					//Check to see if there were any .dll errors
					if(errorResult == 0)
					{
						//Now we need to check for individual address errors & save the results
						//in a manner more sutable for javascript (make it not a type buffer)
						offsetInt = 0;
						offsetFloat = 0;
						for(i in addresses)
						{
							returnResults[i] = results.readDoubleLE(offsetFloat);
							if(errors.readInt32LE(offsetInt)!=0)
							{
								throw new DriverOperationError(errors.readInt32LE(offsetInt));
							}
							offsetFloat += 8;
							offsetInt += 4;
						}
					}
					else
					{
						throw new DriverOperationError(errorResult);
					}
						
				}
				//We have acquired the data successfully, yay! return it!
				return returnResults;
			}
			else
			{
				throw new DriverInterfaceError("Invalid address type.");
			}
		}
		else
		{
			throw new DriverInterfaceError("length of addresses and values arrays don't match");
		}
	};

	/**
	 * Closes the device if it is currently open
	 *
	 * @return {number} 
	 */
	this.close = function()
	{
		this.checkStatus();
		var ret = this.checkCallback(arguments);
		var useCallBacks = ret[0];
		var onError = ret[1];
		var onSuccess = ret[2];

		var output;
	
		if(useCallBacks)
		{
			//Call the driver function
			output = this.driver.LJM_Close.async(this.handle, function(err, res) {
				if (err) throw err;
				if(res == 0)
				{
					onSuccess();
				}
				else
				{
					onError(res);
				}
			});
			return 0;
		}
		else
		{
			output = this.driver.LJM_Close(this.handle);
		}
		if(output == 0)
		{
			this.handle = null;
			//REPORT NO ERROR HAS OCCURED
			return output;
		}
		else
		{
			//REPORT CLOSING ERROR HAS OCCURED
			if(this.debug.close == 1)
			{
				console.log('Device Failed Close');
			}
			throw new DriverInterfaceError("Closing Device Error");
			return output;
		}
	};
	/**
	 * Closes the device if it is currently open
	 *
	 * @return {number} 
	 */
	this.readLibrary = function(parameter)
	{
		if((typeof(parameter))=="string")
		{
			var errorResult = 0;
			//var returnVar =  new ref.alloc(ref.types.double,1);
			var returnVar = new ref.alloc('double', 1);
			errorResult = this.driver.LJM_ReadLibraryConfigS(parameter, returnVar);
			//Check for an error from driver & throw error
			if(errorResult != 0)
			{
				throw new DriverOperationError(errorResult);
			}
			return returnVar.deref();
		}
		else
		{
			throw DriverInterfaceError("Invalid Type");
		}
	}
	//Read the Driver Version number
	this.installedDriverVersion = this.readLibrary('LJM_LIBRARY_VERSION');
	if(this.installedDriverVersion!= driver_const.LJM_JS_VERSION)
	{
		console.log('The Supported Version for this driver is 0.0243, you are using: ', this.installedDriverVersion);
	}
	//Enable Logging
	this.driver.LJM_WriteLibraryConfigS('LJM_LOG_MODE',2);
	this.driver.LJM_WriteLibraryConfigS('LJM_LOG_LEVEL',2);
	this.driver.LJM_Log(2,"Hello!");
	
	this.checkStatus = function()
	{
		if(this.handle == null)
		{
			if(this.debug.close == 1)
			{
				console.log('Device Handle is Null');
			}
			throw new DriverInterfaceError("Device Never Opened")
		}
	}

	//********************* EXTRA ACCESSORY FUNCTIONS ********************


};