//NOT SURE IF THIS IS NEEDED
var driver_const = require('./driver_const');
var ref = require('ref');//http://tootallnate.github.io/ref/#types-double
var util = require('util');//
var driverLib = require('./driver');
var ffi = require('ffi');//
var ljm = require('./ljmDriver');
var fs = require('fs');//to load/save firmware
var http = require('http');//to download newest firmware versions form the internet


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
	this.deviceType = null;
	this.ljmDriver = new ljm.ljmDriver();
	
	console.log('!LJM_Version!'+this.ljmDriver.readLibrary('LJM_LIBRARY_VERSION'));

	this.firmwareVersions;//for upgrading the device
	
	//Variables for updating the device firmware (ONLY ON A T7!!!)
	this.firmwareFileBuffer;//buffered firmware file variable
	this.firmwareHeaderData;

	//Firmware Header Data
	this.fwHeader = 
	{
		headerKey:0x4C4A4658,
		intendedDevice:null,
		containedVersion:null,
		requiredUpgraderVersion:null,
		imageNumber:null,
		numImgInFile:null,
		startNextImg:null,
		lenOfImg:null,
		imgOffset:null,
		numBytesInSHA:null,
		options:null,
		encryptedSHA:null,
		unencryptedSHA:null,
		headerChecksum:null,
		deviceType:null,
		deviceTypeS:null,
	}
	
	//Firmware Update Procedure Step Counter, starts at 0 & on completion returns to 0.
	this.firmwareUpdateStep = 0;	

	//1 indicates firmware header as been parsed & is ready for step 2
	//0 indicates nothing has occured, its initialization value
	//-1 indicates problem with checking firmware header
	


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
							self.deviceType = deviceType;
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
							self.deviceType = deviceType;
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
				this.deviceType = deviceType;
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
		var ret = this.checkCallback(arguments);
		var useCallBacks = ret[0];
		var onError = ret[1];
		var onSuccess = ret[2];

		var errorResult;

		var devT = ref.alloc('int', 1);
		var conT = ref.alloc('int', 1);
		var sN = ref.alloc('int', 1);
		var ipAddr = ref.alloc('int', 1);
		var port = ref.alloc('int', 1);
		var maxB = ref.alloc('int', 1);
		
		if(useCallBacks)
		{
			errorResult = this.driver.LJM_GetHandleInfo.async(this.handle, devT, conT, sN, ipAddr, port, maxB, function (err, res){
				if(err) throw err;
				if(res == 0)
				{
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
							deviceType:devT.deref(),
							connectionType:conT.deref(),
							serialNumber:sN.deref(),
							ipAddress:ipStr,
							port:port.deref(),
							maxBytesPerMB:maxB.deref()
						}
					);
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
			errorResult = this.driver.LJM_GetHandleInfo(this.handle, devT, conT, sN, ipAddr, port, maxB);
		}
		if(errorResult != 0)
		{
			return errorResult;
		}
		return {
					deviceType:devT.deref(),
					connectionType:conT.deref(),
					serialNumber:sN.deref(),
					ipAddress:ipAddr.deref(),
					port:port.deref(),
					maxBytesPerMB:maxB.deref()
				};
	};
	this.readRaw = function(data)
	{
		this.checkStatus();

		var ret = this.checkCallback(arguments);
		var useCallBacks = ret[0];
		var onError = ret[1];
		var onSuccess = ret[2];

		var errorResult;
		try
		{
			if(data[0] != "number")
			{
				return -1;
			}
		}
		catch (e)
		{
			return -1;
		}
		var aData = new Buffer(data.length);
		aData.fill(0);

		if(useCallBacks)
		{
			errorResult = this.driver.LJM_ReadRaw.async(this.handle, aData, data.length, function (err, res){
				if(err) throw err;
				if(res == 0)
				{
					onSuccess(aData);
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
			errorResult = this.driver.LJM_ReadRaw(this.handle, aData, data.length);
		}
		if(errorResult != 0)
		{
			return errorResult;
		}
		return 0;
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
		var r


		if((typeof(address))=="string")
		{
			var info = this.constants.getAddressInfo(address, 'R');
			if((info.directionValid == 1) && (info.type != 98))
			{
				if(useCallBacks)
				{
					var self = this;
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
			else if((info.directionValid == 1) && (info.type == 98))
			{
				if(useCallBacks)
				{
					errorResult = this.readS(address, onError, onSuccess);
					return 0;
				}
				else
				{
					return this.readS(address);
				}
			}
			else
			{
				if(useCallBacks)
				{
					onError("Invalid Address");
					return driver_const.LJME_INVALID_ADDRESS;
				}
				else
				{
					throw new DriverInterfaceError("Invalid address");
				}
			}
		}
		else if((typeof(address))=="number")
		{
			//Get information necessary about the address requested
			var info = this.constants.getAddressInfo(address, 'R');
			if((info.directionValid == 1) && (info.type != 98))//Check validity to cleanly report error
			{
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
			else if((info.directionValid == 1) && (info.type == 98))
			{
				if(useCallBacks)
				{
					errorResult = this.readS(address, onError, onSuccess);
					return 0;
				}
				else
				{
					return this.readS(address);
				}
			}
			else
			{
				if(useCallBacks)
				{
					onError("Invalid Address");
					return driver_const.LJME_INVALID_ADDRESS;
				}
				else
				{
					throw new DriverInterfaceError("Invalid address");
				}
			}
		}
		else
		{
			//console.log('Address: ', address);
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
				errorResult = this.driver.LJM_eReadNameString.async(this.handle, address,strBuffer, function(err, res){
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
				errorResult = this.driver.LJM_eReadNameString(this.handle, address,strBuffer);
			}
		}
		else if((typeof(address))=="number")
		{
			if(useCallBacks)
			{
				errorResult = this.driver.LJM_eReadAddressString.async(this.handle, address,strBuffer, function(err, res){
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
				errorResult = this.driver.LJM_eReadAddressString(this.handle, address,strBuffer);
			}
		}
		else
		{
			console.log(typeof(address));
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
			for(i = 0; i < length; i++)
			{
				//console.log('Iteration: '+i);
				var buf = new Buffer(addresses[i].length+1);
				ref.writeCString(buf,0,addresses[i]);
				//console.log('Data: '+buf);
				ref.writePointer(aNames,i*8,buf);
			}
			
			//console.log('Length: '+addresses.length);
			//console.log('Length: '+addresses[0].length);
			//console.log('Length: '+aNames.length);
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
					var offset = 0;
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
						onError({retError:res, errFrame:errors.deref()});
					}
				});
				return 0;
			}
			else
			{
				errorResult = this.driver.LJM_eReadNames(this.handle, length, aNames, results, errors);
			}
			

			//ref.refType('string'),			//aNames (Registers to read from)

		}
		else if((typeof(addresses[0]))=="number")
		{
			var addrBuff = new Buffer(4*length);
			var addrTypeBuff = new Buffer(4*length);
			var inValidOperation = 0;

			//Integer Returned by .dll function
			var info;
			var offset=0;
			i = 0;

			for(i = 0; i < length; i++)
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
					if(useCallBacks)
					{
						onError("Invalid Address: "+addresses[i]+", Index: "+i);
						return driver_const.LJME_INVALID_ADDRESS;
					}
					else
					{
						throw new DriverInterfaceError("Invalid address");
					}
				}
			}
			if(useCallBacks)
			{
				errorResult = this.driver.LJM_eReadAddresses.async(this.handle, length, addrBuff, addrTypeBuff, results, errors, function(err, res){
					if(err) throw err;
					var offset = 0;
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
						onError({retError:res, errFrame:errors.deref()});
					}
				});
				return 0;
			}
			else
			{
				//Perform Device I/O function
				errorResult = this.driver.LJM_eReadAddresses(this.handle, length, addrBuff, addrTypeBuff, results, errors);
			}
		}
		else
		{
			throw new DriverInterfaceError("Invalid address type.");
		}
		if(errorResult == 0)
		{
			//return Result
			var offset = 0;
			for(i in addresses)
			{
				returnResults[i] = results.readDoubleLE(offset);
				offset += 8;
			}
			return returnResults;
		}
		else
		{
			//return Error
			//throw new DriverOperationError(errorResult);
			return {retError:errorResult, errFrame:errors.deref()}
		}
	};
	this.writeRaw = function(data)
	{
		this.checkStatus();

		var ret = this.checkCallback(arguments);
		var useCallBacks = ret[0];
		var onError = ret[1];
		var onSuccess = ret[2];

		var errorResult;
		try
		{
			if(data[0] != "number")
			{
				return -1;
			}
		}
		catch (e)
		{
			return -1;
		}
		var aData = new Buffer(data.length);
		aData.fill(0);
		for(var i = 0; i < data.length; i++)
		{
			aData.writeUInt8(data[i], i);
		}

		if(useCallBacks)
		{
			errorResult = this.driver.LJM_WriteRaw.async(this.handle, aData, data.length, function (err, res){
				if(err) throw err;
				if(res == 0)
				{
					onSuccess(aData);
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
			errorResult = this.driver.LJM_WriteRaw(this.handle, aData, data.length);
		}
		if(errorResult != 0)
		{
			return errorResult;
		}
		return 0;
	}
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
			var info = this.constants.getAddressInfo(address, 'W');
			if((info.directionValid == 1) && (info.type != 98))
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
			else if((info.directionValid == 1) && (info.type == 98))
			{
				if(useCallBacks)
				{
					errorResult = this.writeS(address, value, onError, onSuccess);
					return 0;
				}
				else
				{
					return this.writeS(address, value);
				}
			}
			else
			{
				if(useCallBacks)
				{
					onError("Invalid Address");
					return driver_const.LJME_INVALID_ADDRESS;
				}
				else
				{
					throw new DriverInterfaceError("Invalid address");
				}
			}
		}
		else if((typeof(address))=="number")
		{
			//Get information necessary type-info about the address requested
			var info = this.constants.getAddressInfo(address, 'W');
			if((info.directionValid == 1) && (info.type != 98))
			{
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
			else if((info.directionValid == 1) && (info.type == 98))
			{
				if(useCallBacks)
				{
					errorResult = this.writeS(address, value, onError, onSuccess);
					return 0;
				}
				else
				{
					return this.writeS(address, value);
				}
			}
			else
			{
				if(useCallBacks)
				{
					onError("Invalid Address");
					return driver_const.LJME_INVALID_ADDRESS;
				}
				else
				{
					throw new DriverInterfaceError("Invalid address");
				}
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
				errorResult = this.driver.LJM_eWriteNameString.async(this.handle, address,strBuffer, function(err, res){
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
				errorResult = this.driver.LJM_eWriteNameString(this.handle, address, strBuffer);
			}
		}
		else if((typeof(address))=="number")
		{
			if(useCallBacks)
			{
				errorResult = this.driver.LJM_eWriteAddressString.async(this.handle, address, strBuffer, function(err, res){
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
				errorResult = this.driver.LJM_eWriteAddressString(this.handle, address, strBuffer);
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
		var i = 0;
		while(strBuffer[i] != 0)
		{
			i++;
		}
		//return strBuffer.toString('utf8',0,i);
		return 0;
	}

	/**
	 * Function writes to multiple modbus addresses
	 *
	 * @params {number} address that you wish to read
	 * @params {number} value that you wish to write
	 * @return {number} number that was read or an error message
	 * 		NOTE: As long as the error messages are out of range +-10 this is ok.
	 */
	this.writeMany = function(addrs, vals)
	{
		var ret = this.checkCallback(arguments);
		var useCallBacks = ret[0];
		var onError = ret[1];
		var onSuccess = ret[2];
		var addresses;
		var values;
		if(((arguments.length == 1)&&(!useCallBacks)) || ((arguments.length == 3)&&(useCallBacks)))
		{
			try
			{
				var len = arguments[0].length;
				addresses = new Array();
				values = new Array();
				for(var i = 0; i < len; i++)
				{
					addresses.push(arguments[0][i].addr);
					values.push(arguments[0][i].val);	
				}
			}
			catch (e)
			{
				if(useCallBacks)
				{
					onError("Bad input args");
				}
				else
				{
					return -1;
				}
			}
		}
		else
		{
			addresses = addrs;
			values = vals;
		}
		//Get the number of addresses & values and make sure they are equal
		var length = addresses.length;
		if(length != values.length)
		{
			if(useCallBacks)
			{
				onError("length of addresses and values arrays don't match");
				return -1;
			}
			else
			{
				throw new DriverInterfaceError("length of addresses and values arrays don't match");
			}
		}

		this.checkStatus();

		var returnResults = Array();
		var aValues = new Buffer(8*length);
		var errors = new ref.alloc('int',1);
		errors[0]=0;

		var errorResult;

		if((typeof(addresses[0]))=="string")
		{
			var i;
			var offset = 0;
			var aNames = new Buffer(8*length);
			for(i = 0; i < length; i++)
			{
				aValues.writeDoubleLE(values[i],offset);
				var buf = new Buffer(addresses[i].length+1);
				ref.writeCString(buf,0,addresses[i]);
				ref.writePointer(aNames,offset,buf);
				offset+=8;
			}
			if(useCallBacks)
			{
				errorResult = this.driver.LJM_eWriteNames.async(this.handle, length, aNames, aValues, errors, function(err, res){
					if(err) throw err;
					if((res == 0))
					{
						onSuccess();
					}
					else
					{
						onError({retError:res, errFrame:errors.deref()});
					}
				});
				return 0;
			}
			else
			{
				//Perform Device I/O function
				errorResult = this.driver.LJM_eWriteNames(this.handle, length, aNames, aValues, errors);
			}
		}
		else if((typeof(addresses[0]))=="number")
		{
			var addrBuff = new Buffer(4*length);
			var addrTypeBuff = new Buffer(4*length);
			var inValidOperation = 0;

			//Integer Returned by .dll function
			var info;
			var offset=0;
			var offsetD = 0;
			i = 0;

			for(i = 0; i < length; i++)
			{
				info = this.constants.getAddressInfo(addresses[i], 'R');
				if(info.directionValid == 1)
				{
					addrTypeBuff.writeInt32LE(info.type,offset);
					addrBuff.writeInt32LE(addresses[i],offset);
					aValues.writeDoubleLE(values[i],offsetD);
					offset += 4;
					offsetD+=8;
				}
				else
				{
					if(useCallBacks)
					{
						onError("Invalid Address: "+addresses[i]+", Index: "+i);
						return driver_const.LJME_INVALID_ADDRESS;
					}
					else
					{
						throw new DriverInterfaceError("Invalid address");
					}
				}
			}
			if(useCallBacks)
			{
				errorResult = this.driver.LJM_eWriteAddresses.async(this.handle, length, addrBuff, addrTypeBuff, aValues, errors, function(err, res){
					if(err) throw err;
					if((res == 0))
					{
						onSuccess();
					}
					else
					{
						onError({retError:res, errFrame:errors.deref()});
					}
				});
				return 0;
			}
			else
			{
				//Perform Device I/O function
				errorResult = this.driver.LJM_eWriteAddresses(this.handle, length, addrBuff, addrTypeBuff, aValues, errors);
			}
		}
		else
		{
			if(useCallBacks)
			{
				onError("Invalid address type.");
				return -1;
			}
			else
			{
				throw new DriverInterfaceError("Invalid address type.");
			}
		}
		if(errorResult == 0)
		{
			return 0;
		}
		else
		{
			//return Error
			//throw new DriverOperationError(errorResult);
			return {retError:errorResult, errFrame:errors.deref()}
		}
	};
	this.resetConnection = function()
	{
		this.checkStatus();
		var ret = this.checkCallback(arguments);
		var useCallBacks = ret[0];
		var onError = ret[1];
		var onSuccess = ret[2];

		var errorResult;

		if(useCallBacks)
		{
			errorResult = this.driver.LJM_ResetConnection.async(this.handle, function (err, res) {
				if (err) throw err;
				if (res == 0)
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
			errorResult = this.driver.LJM_ResetConnection(this.handle);
		}
		if(errorResult != 0)
		{
			return errorResult;
		}
		return errorResult;

	}
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
			var self = this;
			output = this.driver.LJM_Close.async(this.handle, function (err, res) {
				if (err) throw err;
				if(res == 0)
				{
					self.handle = null;
					self.deviceType = null;
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
			this.deviceType = null;
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
	returns the index of the firmware constants
	**/
	this.getFirmwareVersionInfo = function(deviceType, versionNumber)
	{
		//Make sure the constants file is loaded
		this.checkFirmwareConstants();

		if((deviceType == 7) || (deviceType == "LJM_dtT7"))
		{
			for(var i = 0; i < this.firmwareVersions.T7.length; i++)
			{
				if(this.firmwareVersions.T7[i].versionNumber == versionNumber)
				{
					return this.firmwareVersions.T7[i];
				}
			}
		}
		else if((deviceType == 200) || (deviceType == "LJM_dtDIGIT"))
		{
			for(var i = 0; i < this.firmwareVersions.Digit.length; i++)
			{
				if(this.firmwareVersions.Digit[i].versionNumber == versionNumber)
				{
					return this.firmwareVersions.Digit[i];
				}
			}
		}
		return null;
	};
	/**
	retuns the file path for the .bin file requested 
	**/
	this.getFilePath = function(deviceType, versionNumber)
	{
		var info = this.getFirmwareVersionInfo(deviceType, versionNumber);
		if(info != null)
		{
			//Build file path
			if((deviceType == 7) || (deviceType == "LJM_dtT7"))
			{
				var filePath = "./downloadedFirmware/T7/";
				filePath += info.fileName;
				return filePath;
			}
			if((deviceType == 200) || (deviceType == "LJM_dtDIGIT"))
			{
				var filePath = "./downloadedFirmware/Digit/";
				filePath += info.fileName;
				return filePath;
			}
		}
		else
		{
			return null;
		}
	}
	/**
	This function loads the firmware versions constants file.  In it exists an array of available
	firmware versions for download from the labjack website.  It maps the available firmware version
	to a location where the .bin file can be downloaded.  The variable loaded here can then be used
	later to download the file/get a file name for a local file.  

	Function saves the firmware versions file to itself.  Doesn't return it to the caller.

	Args:
	(optional): filePath, a string location for the firmwareVersions.json file
	(optional): callbacks onError & onSuccess, determines functional vs OOP.

	Functional:
	Calls onSuccess when file is successfully loaded and parsed.  Doesn't return anything.

	OOP:
	returns 0 when successful
	returns 1 when not successful  
	**/
	this.loadFirmwareVersionsFile = function(filePath)
	{
		var ret = this.checkCallback(arguments);
		var useCallBacks = ret[0];
		var onError = ret[1];
		var onSuccess = ret[2];
		var fp;
		if(useCallBacks)
		{
			if(typeof(filePath)!="string")
			{
				fp = "./firmwareVersions.json";
			}
			else
			{
				fp = filePath;
			}
			var self = this;
			fs.readFile(fp,'utf8',function (err, data){
				if(err)
				{
					onError(err);
				}
				else
				{
					self.firmwareVersions = JSON.parse(data);
					//console.log("num versions available:",self.firmwareVersions.T7.length);
					//console.log("first versionNum:",self.firmwareVersions.T7[0].versionNumber);
					//console.log("first fileName:",self.firmwareVersions.T7[0].fileName);
					//console.log("first location:",self.firmwareVersions.T7[0].location);
					onSuccess();
				}
			});
			
		}
		if(!useCallBacks)
		{
			if(filePath == null)
			{
				fp = "./firmwareVersions.json";
			}
			else
			{
				fp = filePath;
			}
			try
			{
				var firmwareVersionsStr = fs.readFileSync(fp, 'utf8');
				this.firmwareVersions = JSON.parse(firmwareVersionsStr);
			}
			catch (e)
			{
				return 1;
			}
			//console.log("num versions available:",this.firmwareVersions.T7.length);
			//console.log("first versionNum:",this.firmwareVersions.T7[0].versionNumber);
			//console.log("first fileName:",this.firmwareVersions.T7[0].fileName);
			//console.log("first location:",this.firmwareVersions.T7[0].location);
			return 0;
		}
	};
	/**
	This function loads a firmware file located in the proper directory.

	Functional:
	onSuccess is called when finished successfully
	onError is called when failed, returns 1 or 2 based on its status

	OOP:
	Returns 0 if the file is successfully loaded
	Returns 1 if the file is not successfully loaded because it doesn't exist
	returns 2 if the file is not loaded because the firmwareVersion number isn't found

	**/
	this.loadFiwmareFile = function(deviceType, firmwareVersion)
	{
		//Make sure the constants file is loaded
		this.checkFirmwareConstants();

		//Check for functional vs OOP
		var ret = this.checkCallback(arguments);
		var useCallBacks = ret[0];
		var onError = ret[1];
		var onSuccess = ret[2];

		//Check to see if the requested firmware version is valid
		var filePath = this.getFilePath(deviceType, firmwareVersion);

		//Check for & report errors
		if(filePath == null)
		{
			if(useCallBacks)
			{
				onError(2);
				return 0;
			}
			else
			{
				return 2;
			}
		}

		//Open/Read file into buffer using functional/OOP methods
		if(useCallBacks)
		{
			var self = this;
			fs.readFile(filePath,function(err, data){
				if(err) 
				{
					onError(1);//Error for when file can't be opened because it doesn't exist
				}
				else
				{
					self.firmwareFileBuffer = data;
					onSuccess();
				}
			});
		}
		else
		{
			try
			{
				var ret = fs.readFileSync(filePath);
			}
			catch (e)
			{
				return 1;//Error for when file can't be opened because it doesn't exist
			}
			this.firmwareFileBuffer = ret;
			return 0;
		}
	};
	/**
	This function extracts the loaded firmware file info & stores the data into the fwHeader.
	**/
	this.extractLoadedFwHeaderInfo = function()
	{
		//Make sure there is a pre-buffered firmware file
		this.checkLoadedFirmware();

		//Check for functional vs OOP
		var ret = this.checkCallback(arguments);
		var useCallBacks = ret[0];
		var onError = ret[1];
		var onSuccess = ret[2];

		//console.log(this.fwHeader.headerKey);
		//console.log(this.firmwareFileBuffer.slice(0,128).length);

		var headerBuffer = new Buffer(this.firmwareFileBuffer.slice(0,128));
		//console.log(headerBuffer.length);
		//Check the header key
		if(this.fwHeader.headerKey != headerBuffer.readUInt32BE(0))
		{
			console.log("header key does not match");
			console.log(this.fwHeader.headerKey);
			console.log(headerBuffer.readUInt32BE(0));
			onError("Header Key Does Not Match, HK-read:",headerBuffer.readUInt32BE(0));	
		}
		this.fwHeader.intendedDevice = headerBuffer.readUInt32BE(4);
		this.fwHeader.containedVersion = headerBuffer.readFloatBE(8).toFixed(4);
		this.fwHeader.requiredUpgraderVersion = headerBuffer.readFloatBE(12).toFixed(4);
		this.fwHeader.imageNumber = headerBuffer.readUInt16BE(16);
		this.fwHeader.numImgInFile = headerBuffer.readUInt16BE(18);
		this.fwHeader.startNextImg = headerBuffer.readUInt32BE(20);
		this.fwHeader.lenOfImg = headerBuffer.readUInt32BE(24);
		this.fwHeader.imgOffset = headerBuffer.readUInt32BE(28);
		this.fwHeader.numBytesInSHA = headerBuffer.readUInt32BE(32);
		this.fwHeader.options = headerBuffer.readUInt32BE(72);
		this.fwHeader.encryptedSHA = headerBuffer.readUInt32BE(76);
		this.fwHeader.unencryptedSHA = headerBuffer.readUInt32BE(96);
		this.fwHeader.headerChecksum = headerBuffer.readUInt32BE(124);

		//console.log(this.fwHeader.intendedDevice);
		//console.log(this.fwHeader.requiredUpgraderVersion);
		//To Support New Device, Add It Here
		if((this.fwHeader.intendedDevice == driver_const.T7_TARGET_OLD)||(this.fwHeader.intendedDevice == driver_const.T7_TARGET))
		{
			this.fwHeader.deviceType = 7;
			this.fwHeader.deviceTypeS = "LJM_dtT7";
		}
		else if(this.fwHeader.intendedDevice == driver_const.DIGIT_TARGET)
		{
			this.fwHeader.deviceType = 200;
			this.fwHeader.deviceTypeS = "LJM_dtDIGIT";
		}
		else
		{
			this.fwHeader.deviceType = -1;
		}

		//console.log(this.fwHeader.lenOfImg/16.0);
		if(useCallBacks)
		{
			onSuccess();
		}
		else
		{
			return 0;
		}
	};
	this.getFirmwareVersions = function()
	{

	};
	this.getNewestFirmwareVersion = function()
	{

	};
	/**
	**/
	this.downloadAllFirmwareVersions = function()
	{
		//Make sure the constants file is loaded
		this.checkFirmwareConstants();

		//Check for functional vs OOP
		var ret = this.checkCallback(arguments);
		var useCallBacks = ret[0];
		var onError = ret[1];
		var onSuccess = ret[2];

		var numReq = this.firmwareVersions.Digit.length + this.firmwareVersions.T7.length;
		var doneCount = 0;
		this.isDone = false;
		var self = this;

		//console.log(this.firmwareVersions);
		if(useCallBacks)
		{
			for(var i = 0; i < this.firmwareVersions.Digit.length; i++)
			{
				var request = http.get(this.firmwareVersions.Digit[i].location, function(response) {
					if(response.statusCode == 200)
					{
						var strs = response.socket._httpMessage.path.split("/");
						var file = fs.createWriteStream("./downloadedFirmware/Digit/"+strs[strs.length-1]);
						response.pipe(file);
					}
					doneCount++;
					if(doneCount == numReq)
					{
						onSuccess();
					}
				});
			}
			for(var i = 0; i < this.firmwareVersions.T7.length; i++)
			{
				var request = http.get(this.firmwareVersions.T7[i].location, function(response) {
					if(response.statusCode == 200)
					{
						var strs = response.socket._httpMessage.path.split("/");
						var file = fs.createWriteStream("./downloadedFirmware/T7/"+strs[strs.length-1]);
						response.pipe(file);
					}
					doneCount++;
					if(doneCount == numReq)
					{
						onSuccess();
					}
				});
			}
		}	
		else
		{
			return "ONLY SUPPORTS FUNCTIONAL METHODS";
		}			
	};
	/**
	Downloads a single registered firmware version to the appropriate directory.

	returns 0 on success
	returns 1 on invalid versionNumber/deviceType pair
	**/
	this.downloadFirmwareVersion = function(deviceType, versionNumber)
	{
		var ret = this.checkCallback(arguments);
		var useCallBacks = ret[0];
		var onError = ret[1];
		var onSuccess = ret[2];

		var info = this.getFirmwareVersionInfo(deviceType,versionNumber);
		if(info == null)
		{
			if(useCallBacks)
			{
				onError(1);
				return 1;
			}
			return 1;
		}
		if(useCallBacks)
		{
			var self = this;
			var request = http.get(info.location, function(response) {
				if(response.statusCode==200)
				{
					var strs = info.location.split("/");
					var file = fs.createWriteStream(self.getFilePath(deviceType,versionNumber));
					response.pipe(file);
				}
				if(useCallBacks)
				{
					if(response.statusCode==200)
					{
						onSuccess();
					}
					else
					{
						onError("INVALID URL");
					}
				}
			});
		}
		else
		{
			return "ONLY SUPPORTS FUNCTIONAL METHODS";
		}
	};
	this.getDownloadedFirmwareVersions = function()
	{
		var ret = this.checkCallback(arguments);
		var useCallBacks = ret[0];
		var onError = ret[1];
		var onSuccess = ret[2];


		fs.existsSync("./downloadedFirmware/T7/")
	};
	this.checkFirmwareCompatability = function()
	{
		//Make sure the constants file is loaded
		this.checkFirmwareConstants();

		//Make sure there is an open device
		this.checkStatus();

		//Make sure the firmware file has been loaded & parsed
		this.checkLoadedFirmware();
		this.checkLoadedFirmwareParsed();

		//Check for functional vs OOP
		var ret = this.checkCallback(arguments);
		var useCallBacks = ret[0];
		var onError = ret[1];
		var onSuccess = ret[2];

		//Initialize firmware update step counter
		this.firmwareUpdateStep = 0;

		//Make sure the loaded firmware device type and currently open device type match
		if((this.deviceType != this.fwHeader.deviceType)&&(this.deviceType != this.fwHeader.deviceTypeS))
		{
			if(useCallBacks)
			{
				console.log(this.deviceType, this.fwHeader.deviceType);
				onError([-1,"Firmware File Does Not Match Opened Device"]);
				return 0;
			}
			else
			{
				return -1;
			}
			this.firmwareUpdateStep = -1;
		}

		//Update Step Counter to indicate loaded firmware & currently open device match
		this.firmwareUpdateStep = 1;

		if(useCallBacks)
		{
			onSuccess();
			return 0;
		}
		else
		{
			return 0;
		}
	};
	this.eraseFlash = function(step)
	{
		//Make sure the constants file is loaded
		this.checkFirmwareConstants();

		//Make sure there is an open device
		this.checkStatus();

		//Make sure the firmware file has been loaded & parsed
		this.checkLoadedFirmware();
		this.checkLoadedFirmwareParsed();

		//Check for functional vs OOP
		var ret = this.checkCallback(arguments);
		var useCallBacks = ret[0];
		var onError = ret[1];
		var onSuccess = ret[2];
		
		if(this.firmwareUpdateStep!=step)
		{
			if(useCallBacks)
			{
				onError("Skipped a Upgrade Step, err-eraseFlash");
				return -1;
			}
			else
			{
				return -1;
			}
		}
		if(useCallBacks)
		{
			if(this.fwHeader.deviceType == 7)
			{
				//Clear Stuff for T7
				/*
				Erase 120 pages of flash (a page is 4096 bytes). 
				Starting from the External Firmware Image Origin. 
				(Found in the Flash Addresses document)
				*/
				/*
				First attempt: following directly what kippling is doing....
				*/
				//1. Erase one page of flash
				var self = this;
				this.bulkEraseFlash(
					driver_const.T7_EFkey_ExtFirmwareImgInfo, 
					driver_const.T7_EFAdd_ExtFirmwareImgInfo, 
					driver_const.T7_HDR_FLASH_PAGE_ERASE, 
					function(err) //onError
					{
						//onError
					},
					function(res) //onSuccess
					{
						//on successful first erase, erase 120 pages.
						self.bulkEraseFlash(
							driver_const.T7_EFkey_ExtFirmwareImage, 
							driver_const.T7_EFAdd_ExtFirmwareImage, 
							driver_const.T7_IMG_FLASH_PAGE_ERASE, 
							function(err) //onError
							{
								//onError
							},
							function(res) //onSuccess
							{
								//onSuccess
								self.firmwareUpdateStep++;
								onSuccess();
							});
					});
			}
			else if(this.fwHeader.deviceType == 200)
			{
				//Clear Stuff for Digit
			}
		}
	};
	this.writeBinary = function()
	{
		//Make sure the constants file is loaded
		this.checkFirmwareConstants();

		//Make sure there is an open device
		this.checkStatus();

		//Make sure the firmware file has been loaded & parsed
		this.checkLoadedFirmware();
		this.checkLoadedFirmwareParsed();

		//Check for functional vs OOP
		var ret = this.checkCallback(arguments);
		var useCallBacks = ret[0];
		var onError = ret[1];
		var onSuccess = ret[2];
		
		if(this.firmwareUpdateStep!=2)
		{
			if(useCallBacks)
			{
				onError("Skipped a Upgrade Step, err-writeFlash");
				return -1;
			}
			else
			{
				return -1;
			}
		}
		if(useCallBacks)
		{
			if(this.fwHeader.deviceType == 7)
			{
				//Clear Stuff for T7
				//1. Write Flash
				var self = this;
				this.writeFlash(
					driver_const.T7_EFkey_ExtFirmwareImgInfo,
					driver_const.T7_EFAdd_ExtFirmwareImgInfo,
					0,
					driver_const.T7_IMG_HEADER_LENGTH,
					function(err){
						onError();
					},
					function(res){
						onSuccess();
					});
			}
			else if(this.fwHeader.deviceType == 200)
			{
				//Clear Stuff for Digit
			}
		}
	};
	this.bulkEraseFlash = function(key, address, noPages)
	{
		//Make sure there is an open device
		this.checkStatus();

		//Check for functional vs OOP
		var ret = this.checkCallback(arguments);
		var useCallBacks = ret[0];
		this.onError = ret[1];
		this.onSuccess = ret[2];
		this.numCalls = 0;
		var totalRequests = noPages;
		this.numErrs=0;
		var self = this;
		//var info = this.constants.getAddressInfo(driver_const.T7_MA_EXF_KEY, 'W');
		//console.log(info);
		//info = this.constants.getAddressInfo(driver_const.T7_MA_EXF_ERASE, 'W');
		//console.log(info);
		var i;
		console.log(key,address,noPages);
		for(i = 0; i < noPages; i++)
		{

			this.writeMany([driver_const.T7_MA_EXF_KEY,driver_const.T7_MA_EXF_ERASE],[key,address + i * 4096],
				function(err){//onError
					self.numCalls++;
					self.numErrs++;
					if(self.numCalls == totalRequests)
					{
						self.onError();
					}
				},
				function(res){//onSuccess
					self.numCalls++;
					if(self.numCalls == totalRequests)
					{
						if(self.numErrs != 0)
						{
							self.onError();
						}
						else
						{
							self.onSuccess();
						}
					}
				});
		}
		//console.log('1');
		//onSuccess();
	};
	this.writeFlash = function(flashKey, flashAdd, offset, length)
	{
		//Make sure firmware stuff is all loaded
		this.checkFirmwareConstants();
		this.checkLoadedFirmware();
		this.checkLoadedFirmwareParsed();

		//Make sure there is an open device
		this.checkStatus();

		//Check for functional vs OOP
		var ret = this.checkCallback(arguments);
		var useCallBacks = ret[0];
		var onError = ret[1];
		var onSuccess = ret[2];

		console.log(flashKey, flashAdd, offset, length);

		onSuccess();

	}

	this.updateFirmware = function(versionNumber)
	{
		//Make sure the constants file is loaded
		this.checkFirmwareConstants();

		//Make sure there is an open device
		this.checkStatus();

		//Check for functional vs OOP
		var ret = this.checkCallback(arguments);
		var useCallBacks = ret[0];
		var onError = ret[1];
		var onSuccess = ret[2];

		if(useCallBacks)
		{
			onSuccess();
		}
		else
		{
			//this.loadFiwmareFile
		}

		
	};
	this.checkStatus = function()
	{
		if((this.handle == null) && (this.deviceType == null))
		{
			throw new DriverInterfaceError("Device Never Opened");
		}
	};
	this.checkFirmwareConstants = function()
	{
		if(this.firmwareVersions == null)
		{
			throw new DriverInterfaceError("Firmware Versions File Not Loaded");
		}
	};
	this.checkLoadedFirmware = function()
	{
		if(this.firmwareFileBuffer == null)
		{
			throw new DriverInterfaceError("Firmware .bin File Not Loaded");
		}
	}
	this.checkLoadedFirmwareParsed = function()
	{
		if(this.fwHeader == null)
		{
			throw new DriverInterfaceError("Firmware .bin File Not Parsed");
		}
	}

	//********************* EXTRA ACCESSORY FUNCTIONS ********************


};