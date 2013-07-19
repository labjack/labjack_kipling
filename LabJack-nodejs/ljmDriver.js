//NOT SURE IF THIS IS NEEDED
var driver_const = require('./driver_const');
var ref = require('ref');//http://tootallnate.github.io/ref/#types-double
var util = require('util');//
var driverLib = require('./driver');
var ffi = require('ffi');//

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

exports.ljmDriver = function()
{
	this.driver = driverLib.getDriver();
	this.constants = driverLib.getConstants();

	/**
	 * checks to see if the function being called has function callback properties
	 * @param {args} arguments for the function
	 * @return {[boolean, onError, onSuccess]}
	 */
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
	this.listAll = function(deviceType, connectionType)
	{
		var ret = this.checkCallback(arguments);
		var useCallBacks = ret[0];
		var onError = ret[1];
		var onSuccess = ret[2];
		var errorResult;

		var devT;
		var conT;

		var numFound =  new ref.alloc('int',1);
		var aDeviceTypes = new Buffer(4*128);
		aDeviceTypes.fill(0);
		var aConnectionTypes = new Buffer(4*128);
		aConnectionTypes.fill(0);
		var aSerialNumbers = new Buffer(4*128);
		aSerialNumbers.fill(0);
		var aIPAddresses = new Buffer(4*128);
		aIPAddresses.fill(0);
		
		if(((useCallBacks)&&(arguments.length < 4))||((!useCallBacks)&&(arguments.length < 2)))
		{
			//Do something smart
			devT = "LJM_dtANY";
			conT = "LJM_ctANY";
		}
		else
		{
			devT = deviceType;
			conT = connectionType;
		}

		if((typeof(devT)=="string")&&(typeof(conT)=="string"))
		{
			if(useCallBacks)
			{
				errorResult = this.driver.LJM_ListAllS.async(devT, conT, numFound, aDeviceTypes, aConnectionTypes, aSerialNumbers, aIPAddresses, function (err, res){
					if(err) throw err;
					if(res == 0)
					{
						//console.log('NumFound: ',numFound.deref());
						var offset = 0;
						var devArray = new Array();
						for(var i = 0; i < numFound.deref(); i++)
						{
							var ipStr = "";
							ipStr += aIPAddresses.readUInt8(offset+3).toString();
							ipStr += ".";
							ipStr += aIPAddresses.readUInt8(offset+2).toString();
							ipStr += ".";
							ipStr += aIPAddresses.readUInt8(offset+1).toString();
							ipStr += ".";
							ipStr += aIPAddresses.readUInt8(offset).toString();

							//Build Dict-array							
							devArray.push({
								deviceType:aDeviceTypes.readInt32LE(offset),
								connectionType:aConnectionTypes.readInt32LE(offset),
								serialNumber:aSerialNumbers.readInt32LE(offset),
								ipAddress:ipStr
							});
							offset +=4;
						}
						onSuccess(devArray);
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
				errorResult = this.driver.LJM_ListAllS(devT, conT, numFound, aDeviceTypes, aConnectionTypes, aSerialNumbers, aIPAddresses);
			}
		}
		else if((typeof(devT)=="number")&&(typeof(conT)=="number"))
		{
			if(useCallBacks)
			{
				errorResult = this.driver.LJM_ListAll.async(devT, conT, numFound, aDeviceTypes, aConnectionTypes, aSerialNumbers, aIPAddresses, function (err, res){
					if(err) throw err;
					if(res == 0)
					{
						var offset = 0;
						var devArray = new Array();
						for(var i = 0; i < numFound.deref(); i++)
						{
							var ipStr = "";
							ipStr += aIPAddresses.readUInt8(offset+3).toString();
							ipStr += ".";
							ipStr += aIPAddresses.readUInt8(offset+2).toString();
							ipStr += ".";
							ipStr += aIPAddresses.readUInt8(offset+1).toString();
							ipStr += ".";
							ipStr += aIPAddresses.readUInt8(offset).toString();

							//Build Dict-array							
							devArray.push({
								deviceType:aDeviceTypes.readInt32LE(offset),
								connectionType:aConnectionTypes.readInt32LE(offset),
								serialNumber:aSerialNumbers.readInt32LE(offset),
								ipAddress:ipStr
							});
							offset +=4;
						}
						onSuccess(devArray);
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
				errorResult = this.driver.LJM_ListAll(devT, conT, numFound, aDeviceTypes, aConnectionTypes, aSerialNumbers, aIPAddresses);
			}
		}
		else
		{
			throw DriverInterfaceError("Invalid Input Parameter Types");
			return -1;
		}
		if(errorResult != 0)
		{
			return errorResult;
		}
		var offset = 0;
		var devArray = new Array();
		for(var i = 0; i < numFound.deref(); i++)
		{
			var ipStr = ""
			ipStr += aIPAddresses.readUInt8(offset+3).toString();
			ipStr += "."
			ipStr += aIPAddresses.readUInt8(offset+2).toString();
			ipStr += "."
			ipStr += aIPAddresses.readUInt8(offset+1).toString();
			ipStr += "."
			ipStr += aIPAddresses.readUInt8(offset).toString();

			//Build Dict-array							
			devArray.push({
				deviceType:aDeviceTypes.readInt32LE(offset),
				connectionType:aConnectionTypes.readInt32LE(offset),
				serialNumber:aSerialNumbers.readInt32LE(offset),
				ipAddress:ipStr
			});
			offset +=4;
		}
		return devArray;
	}
	this.errToStr = function(errNum)
	{
		if(typeof(errNum) != "number")
		{
			return -1;
		}
		var ret = this.checkCallback(arguments);
		var useCallBacks = ret[0];
		var onError = ret[1];
		var onSuccess = ret[2];

		var errorResult=0;

		var strRes = new Buffer(50);
		strRes.fill(0);
		if(useCallBacks)
		{
			errorResult = this.driver.LJM_ErrorToString.async(errNum, strRes, function (err, res){
				if(err) throw err;
				if(res == 0)
				{
					//console.log('strRes: ',ref.readCString(strRes,0));
					onSuccess('Num: '+errNum+', '+ref.readCString(strRes,0));
				}
				else
				{
					//console.log('BAD!',ref.readCString(strRes,0));
					onError('Num: '+errNum+', '+ref.readCString(strRes,0));
				}
			});
			return 0;
		}
		else
		{
			errorResult = this.driver.LJM_ErrorToString(errNum, strRes);
		}
		if(errorResult != 0)
		{
			return 'Num: '+errNum+', '+ref.readCString(strRes,0);
		}
		return 'Num: '+errNum+', '+ref.readCString(strRes,0);
	};
	this.loadConstants = function()
	{
		var ret = this.checkCallback(arguments);
		var useCallBacks = ret[0];
		var onError = ret[1];
		var onSuccess = ret[2];

		var errorResult;
		if(useCallBacks)
		{
			errorResult = this.driver.LJM_LoadConstants.async(function (err, res){
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
			errorResult = this.driver.LJM_LoadConstants();
		}
		if(errorResult != 0)
		{
			return errorResult;
		}
		return 0;
	}
	this.closeAll = function()
	{
		var ret = this.checkCallback(arguments);
		var useCallBacks = ret[0];
		var onError = ret[1];
		var onSuccess = ret[2];

		var errorResult;
		if(useCallBacks)
		{
			errorResult = this.driver.LJM_CloseAll.async(function (err, res){
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
			errorResult = this.driver.LJM_CloseAll();
		}
		if(errorResult != 0)
		{
			return errorResult;
		}
		return 0;
	}
	/**
	 */
	this.readLibrary = function(parameter)
	{
		var ret = this.checkCallback(arguments);
		var useCallBacks = ret[0];
		var onError = ret[1];
		var onSuccess = ret[2];

		if((typeof(parameter))=="string")
		{
			var errorResult = 0;
			//var returnVar =  new ref.alloc(ref.types.double,1);
			var returnVar = new ref.alloc('double', 1);
			if(useCallBacks)
			{
				errorResult = this.driver.LJM_ReadLibraryConfigS.async(parameter, returnVar, function (err, res){
					if(err) throw err;
					if(res == 0)
					{
						onSuccess(returnVar.deref())
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
				errorResult = this.driver.LJM_ReadLibraryConfigS(parameter, returnVar);
			}
			//Check for an error from driver & throw error
			if(errorResult != 0)
			{
				return errorResult
			}
			return returnVar.deref();
		}
		else
		{
			throw DriverInterfaceError("Invalid Input Parameter Type");
			return -1;
		}
	}
	this.readLibraryS = function (parameter)
	{
		var ret = this.checkCallback(arguments);
		var useCallBacks = ret[0];
		var onError = ret[1];
		var onSuccess = ret[2];
		throw "NOT IMPLEMENTED";
	}
	this.writeLibrary = function(parameter, value)
	{
		var ret = this.checkCallback(arguments);
		var useCallBacks = ret[0];
		var onError = ret[1];
		var onSuccess = ret[2];

		var errorResult;
		if((typeof(parameter) == "string")&&(typeof(value)=="number"))
		{
			if(useCallBacks)
			{
				errorResult = this.driver.LJM_WriteLibraryConfigS(parameter, value, function (err, res){
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
				errorResult = this.driver.LJM_WriteLibraryConfigS(parameter, value);
			}

		}
		else if((typeof(parameter) == "string")&&(typeof(value)=="string"))
		{
			if(useCallBacks)
			{
				errorResult = this.driver.LJM_WriteLibraryConfigStringS(parameter, value, function (err, res){
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
				errorResult = this.driver.LJM_WriteLibraryConfigStringS(parameter, value);
			}
		}
		else
		{
			throw DriverInterfaceError("Invalid Input Parameter Types");
			return -1;//Invalid types...
		}
		//Check for an error from driver & throw error
		if(errorResult != 0)
		{
			throw new DriverOperationError(errorResult);
			return errorResult;
		}
		else 
		{
			return 0;
		}
	}
	this.logS = function(level, str)
	{
		if((typeof(level)!= "number")||(typeof(str)!="string"))
		{
			return -1;
		}
		var ret = this.checkCallback(arguments);
		var useCallBacks = ret[0];
		var onError = ret[1];
		var onSuccess = ret[2];

		var errorResult;
		var strW = new Buffer(50);
		strW.fill(0);
		if(str.length < 50)
		{
			ref.writeCString(str);
		}
		else
		{
			return -1;
		}
		if(useCallBacks)
		{
			errorResult = this.driver.LJM_Log.async(level, number,function (err, res){
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
			errorResult = this.driver.LJM_Log(level, number);
		}
		if(errorResult != 0)
		{
			return errorResult;
		}
		return 0;
	}
	this.resetLog = function()
	{
		var ret = this.checkCallback(arguments);
		var useCallBacks = ret[0];
		var onError = ret[1];
		var onSuccess = ret[2];

		var errorResult;
		if(useCallBacks)
		{
			errorResult = this.driver.LJM_ResetLog.async(function (err, res){
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
			errorResult = this.driver.LJM_ResetLog();
		}
		if(errorResult != 0)
		{
			return errorResult;
		}
		return 0;
	}
	//Read the Driver Version number
	this.installedDriverVersion = this.readLibrary('LJM_LIBRARY_VERSION');
	if(this.installedDriverVersion!= driver_const.LJM_JS_VERSION)
	{
		console.log('The Supported Version for this driver is 0.0243, you are using: ', this.installedDriverVersion);
	}
	//Enable Logging
	//this.driver.LJM_WriteLibraryConfigS('LJM_LOG_MODE',2);
	//this.driver.LJM_WriteLibraryConfigS('LJM_LOG_LEVEL',2);
	//this.driver.LJM_Log(2,"LabJack-Device Enabled");
}