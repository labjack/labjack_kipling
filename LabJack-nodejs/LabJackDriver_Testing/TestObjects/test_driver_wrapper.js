/**
 * This file contains the test-driver object for performing unit tests.
 *
 * @author Chris Johnson (chrisjohn404)
 *
 * Module Dependencies:
 * json_constants_parser, should be located relatively 
 * 		"./LabJackDriver/json_constants_parser"
 */

var ljmJsonManager = require('ljswitchboard-modbus_map');
var driver_const = require('ljswitchboard-ljm_driver_constants');

var fakeDriverB
{
	this.open = function(deviceType, connectionType, identifier)
	{
		this.async = function(deviceType, connectionType, identifier, callback)
		{
			console.log("Async-Open Function Called");
		}
		console.log
	}
};
function createCallableObject (defaultFunction, asyncFunction) {
    var retFunction = function () {
        return defaultFunction.apply(this, arguments);
    };
    retFunction.async = asyncFunction;
    return retFunction;
}
var lastFunctionCall = [];
var expectedResult = 0;
var expectedResultArg = null;
var argumentsList = [];
var reportEnd = function(callback) {
	callback(null,expectedResult);
}


//******************************************************************************
//*********************		Basic Device Functions	****************************
//******************************************************************************
var LJM_Open = createCallableObject(
	function(deviceType, connectionType, identifier, handle) {
		lastFunctionCall.push("LJM_Open");
		argumentsList.push(arguments);
		return expectedResult;
	},
	function(deviceType, connectionType, identifier, handle, callback) {
		lastFunctionCall.push("LJM_OpenAsync");
		argumentsList.push(arguments);
		handle = 1;
		reportEnd(callback);
	});

var LJM_OpenS = createCallableObject(
	function(deviceType, connectionType, identifier, handle) {
		lastFunctionCall.push("LJM_OpenS");
		argumentsList.push(arguments);
		return expectedResult;
	},
	function(deviceType, connectionType, identifier, handle, callback) {
		lastFunctionCall.push("LJM_OpenSAsync");
		argumentsList.push(arguments);
		handle = 1;
		reportEnd(callback);
	});

var LJM_Close = createCallableObject(
	function(handle) {
		lastFunctionCall.push("LJM_Close");
		argumentsList.push(arguments);
		return expectedResult;
	},
	function(handle,callback) {
		lastFunctionCall.push("LJM_CloseAsync");
		argumentsList.push(arguments);
		reportEnd(callback);
	});

var LJM_GetHandleInfo = createCallableObject(
	function(handle,devT, conT, sN, ipAddr, port, maxB) {
		lastFunctionCall.push("LJM_GetHandleInfo");
		argumentsList.push(arguments);
		devT.writeInt32LE(driver_const.LJM_DT_T7,0);
		conT.writeInt32LE(driver_const.LJM_CT_USB,0);
		sN.writeInt32LE(12345678,0);
		ipAddr.writeInt32LE(0x01020304,0);
		port.writeInt32LE(2468,0);
		maxB.writeInt32LE(69,0);
		return expectedResult;
	},
	function(handle,devT, conT, sN,ipAddr, port, maxB, callback) {
		lastFunctionCall.push("LJM_GetHandleInfoAsync");
		argumentsList.push(arguments);
		devT.writeInt32LE(driver_const.LJM_DT_T7,0);
		conT.writeInt32LE(driver_const.LJM_CT_USB,0);
		sN.writeInt32LE(12345678,0);
		ipAddr.writeInt32LE(0x01020304,0);
		port.writeInt32LE(2468,0);
		maxB.writeInt32LE(69,0);
		reportEnd(callback);
	});
//******************************************************************************
//*********************		Read Functions	************************************
//******************************************************************************

/**
 * Test-Function for Synchronous and Async Raw functionality: 
 */
var LJM_ReadRaw = createCallableObject(
	function(handle, data, length) {
		lastFunctionCall.push("LJM_ReadRaw");
		argumentsList.push(arguments);
		var i;
		var retN;
		if(data.length == length) {
			retN = 69;
		}
		else {
			retN = 0;
		}
		for(i = 0; i < data.length; i++) {
			data.writeUInt8(retN,i);
		}
		return expectedResult;
	},
	function(handle, data, length, callback) {
		lastFunctionCall.push("LJM_ReadRawAsync");
		argumentsList.push(arguments);
		var i;
		var retN;
		if(data.length == length) {
			retN = 69;
		}
		else {
			retN = 0;
		}
		for(i = 0; i < data.length; i++) {
			data.writeUInt8(retN,i);
		}
		reportEnd(callback);
	});
/**
 * Test-Function for Synchronous and Async Single operation functionality: 
 */
var LJM_eReadAddress = createCallableObject(
	function(handle, address, addrType, resultPtr) {
		lastFunctionCall.push("LJM_eReadAddress");
		argumentsList.push(arguments);
		resultPtr.writeDoubleLE(expectedResultArg,0);
		return expectedResult;;
	},
	function(handle, address, addrType, resultPtr, callback) {
		lastFunctionCall.push("LJM_eReadAddressAsync");
		argumentsList.push(arguments);
		resultPtr.writeDoubleLE(expectedResultArg,0);
		reportEnd(callback);
	});
/**
 * Test-Function for Synchronous and Async Single operation functionality: 
 */
var LJM_eReadName = createCallableObject(
	function(handle, address, resultPtr) {
		lastFunctionCall.push("LJM_eReadName");
		argumentsList.push(arguments);
		resultPtr.writeDoubleLE(expectedResultArg,0);
		return expectedResult;
	},
	function(handle, address, resultPtr, callback) {
		lastFunctionCall.push("LJM_eReadNameAsync");
		argumentsList.push(arguments);
		resultPtr.writeDoubleLE(expectedResultArg,0);
		reportEnd(callback);
	});
/**
 * Test-Function for Synchronous and Async Single operation functionality: 
 */
var LJM_eReadAddressString = createCallableObject(
	function(handle, address, strBuffer) {
		lastFunctionCall.push("LJM_eReadAddressString");
		argumentsList.push(arguments);
		strBuffer.write("TEST");
		strBuffer.writeUInt8(0,4);
		return expectedResult;
	},
	function(handle, address, strBuffer, callback) {
		lastFunctionCall.push("LJM_eReadAddressStringAsync");
		argumentsList.push(arguments);
		strBuffer.write("TEST");
		strBuffer.writeUInt8(0,4);
		reportEnd(callback);
	});
/**
 * Test-Function for Synchronous and Async Single operation functionality: 
 */
var LJM_eReadNameString = createCallableObject(
	function(handle, address, strBuffer) {
		lastFunctionCall.push("LJM_eReadNameString");
		argumentsList.push(arguments);
		strBuffer.write("TEST");
		strBuffer.writeUInt8(0,4);
		return expectedResult;
	},
	function(handle, address, strBuffer, callback) {
		lastFunctionCall.push("LJM_eReadNameStringAsync");
		argumentsList.push(arguments);
		strBuffer.write("TEST");
		strBuffer.writeUInt8(0,4);
		reportEnd(callback);
	});
/**
 * Test-Function for Synchronous and Async Multiple-Operation functionality: 
 */
var LJM_eReadAddresses = createCallableObject(
	function(handle, length, addresses, types, results, errors) {
		lastFunctionCall.push("LJM_eReadAddresses");
		argumentsList.push(arguments);
		var numReads = addresses.length;
		if(addresses.length != types.length) {
			console.log('ERROR!!!', numReads, types.length);
		}
		for(var i = 0; i < length; i++) {
			results.writeDoubleLE(expectedResultArg[i],i*8);
		}
		if(expectedResult != 0) {
			errors.writeUInt32LE(99,0);
		}
		return expectedResult;
	},
	function(handle, length, addresses, types, results, errors, callback) {
		lastFunctionCall.push("LJM_eReadAddressesAsync");
		// console.log('Yodles\n',arguments);
		argumentsList.push(arguments);
		// console.log('ArgList\n',argumentsList);
		var numReads = addresses.length;
		if(addresses.length != types.length) {
			console.log('ERROR!!!', numReads, types.length);
		}
		for(var i = 0; i < length; i++) {
			results.writeDoubleLE(expectedResultArg[i],i*8);
		}
		if(expectedResult != 0) {
			errors.writeUInt32LE(99,0);
		}
		reportEnd(callback);
	});
/**
 * Test-Function for Synchronous and Async Multiple-Operation functionality: 
 */
var LJM_eReadNames = createCallableObject(
	function(handle, length, addresses, results, errors) {
		lastFunctionCall.push("LJM_eReadNames");
		argumentsList.push(arguments);
		var numReads = addresses.length;
		if(addresses.length != results.length) {
			console.log('ERROR!!!', numReads, results.length);
		}
		for(var i = 0; i < length; i++) {
			results.writeDoubleLE(expectedResultArg[i],i*8);
		}
		if(expectedResult != 0) {
			errors.writeUInt32LE(99,0);
		}
		return expectedResult;
	},
	function(handle, length, addresses, results, errors, callback) {
		lastFunctionCall.push("LJM_eReadNamesAsync");
		argumentsList.push(arguments);
		var numReads = addresses.length;
		if(addresses.length != results.length) {
			console.log('ERROR!!!', numReads, results.length);
		}
		for(var i = 0; i < length; i++) {
			results.writeDoubleLE(expectedResultArg[i],i*8);
		}
		if(expectedResult != 0) {
			errors.writeUInt32LE(99,0);
		}
		reportEnd(callback);
	});

//******************************************************************************
//*********************		Write Functions	************************************
//******************************************************************************

/**
 * Test-Function for Synchronous and Async Raw functionality: 
 */
var LJM_WriteRaw = createCallableObject(
	function(handle, aData, numBytes) {
		lastFunctionCall.push("LJM_WriteRaw");
		argumentsList.push(arguments);

		//Clear write-array:
		aData.fill(0);
		
		//Fill it with the desired data
		for(var i = 0; i < numBytes; i++) {
			aData.writeUInt8(expectedResultArg[i],i);
		}
		return expectedResult;
	},
	function(handle, aData, numBytes, callback) {
		lastFunctionCall.push("LJM_WriteRawAsync");
		argumentsList.push(arguments);

		//Clear write-array:
		aData.fill(0);
		
		//Fill it with the desired data
		for(var i = 0; i < numBytes; i++) {
			aData.writeUInt8(expectedResultArg[i],i);
		}
		reportEnd(callback);
	});
/**
 * Test-Function for Synchronous and Async Single operation functionality: 
 */
var LJM_eWriteAddress = createCallableObject(
	function(handle, address, type, value) {
		lastFunctionCall.push("LJM_eWriteAddress");
		argumentsList.push(arguments);
		return expectedResult;
	},
	function(handle, address, type, value, callback) {
		lastFunctionCall.push("LJM_eWriteAddressAsync");
		argumentsList.push(arguments);
		reportEnd(callback);
	});
/**
 * Test-Function for Synchronous and Async Single operation functionality: 
 */
var LJM_eWriteName = createCallableObject(
	function(handle, address, value) {
		lastFunctionCall.push("LJM_eWriteName");
		argumentsList.push(arguments);
		return expectedResult;
	},
	function(handle, address, value, callback) {
		lastFunctionCall.push("LJM_eWriteNameAsync");
		argumentsList.push(arguments);
		reportEnd(callback);
	});
/**
 * Test-Function for Synchronous and Async Single operation functionality: 
 */
var LJM_eWriteAddressString = createCallableObject(
	function(handle, address, strBuffer) {
		lastFunctionCall.push("LJM_eWriteAddressString");
		argumentsList.push(arguments);
		return expectedResult;
	},
	function(handle, address, strBuffer, callback) {
		lastFunctionCall.push("LJM_eWriteAddressStringAsync");
		argumentsList.push(arguments);
		reportEnd(callback);
	});
/**
 * Test-Function for Synchronous and Async Single operation functionality: 
 */
var LJM_eWriteNameString = createCallableObject(
	function(handle, address, strBuffer) {
		lastFunctionCall.push("LJM_eWriteNameString");
		argumentsList.push(arguments);
		return expectedResult;
	},
	function(handle, address, strBuffer, callback) {
		lastFunctionCall.push("LJM_eWriteNameStringAsync");
		argumentsList.push(arguments);
		reportEnd(callback);
	});
/**
 * Test-Function for Synchronous and Async Multiple-Operation functionality: 
 */
var LJM_eWriteAddresses = createCallableObject(
	function(handle, length, addresses, types, values, error) {
		lastFunctionCall.push("LJM_eWriteAddresses");
		argumentsList.push(arguments);
		return expectedResult;
	},
	function(handle, length, addresses, types, values, error, callback) {
		lastFunctionCall.push("LJM_eWriteAddressesAsync");
		argumentsList.push(arguments);
		reportEnd(callback);
	});
/**
 * Test-Function for Synchronous and Async Multiple-Operation functionality: 
 */
var LJM_eWriteNames = createCallableObject(
	function(handle, length, names, values, error) {
		lastFunctionCall.push("LJM_eWriteNames");
		argumentsList.push(arguments);
		return expectedResult;
	},
	function(handle, length, names, values, error, callback) {
		lastFunctionCall.push("LJM_eWriteNamesAsync");
		argumentsList.push(arguments);
		reportEnd(callback);
	});

//******************************************************************************
//*********************		Advanced I/O Functions	****************************
//******************************************************************************
var populateValues = function(numFrames, aWrites, aNumValues, aValues) {
	var intOffset = 0;
	var doubleOffset = 0;
	var resOffset = 0;
	for(var i = 0; i < numFrames; i++) {
		var numOps = aNumValues.readUInt32LE(i*4);
		//console.log(numOps,intOffset, doubleOffset,aValues.length);
		for(var j = 0; j < numOps; j++) {
			if(aWrites.readUInt32LE(intOffset) == driver_const.LJM_READ) {
				aValues.writeDoubleLE(expectedResultArg-resOffset,doubleOffset);
			} else {
				aValues.writeDoubleLE(-1,doubleOffset);
			}
			doubleOffset += 8;
			resOffset +=1;
		}
		intOffset += 4;
	}
	// for(var i = 0; i < aValues.length/8; i++) {
	// 	console.log(aValues.readDoubleLE(i*8));
	// }
}

/**
 * Test-Function for Synchronous and Async Multiple-Operation functionality: 
 */
var LJM_eAddresses = createCallableObject(
	function(handle, numFrames, aAddresses, aTypes, aWrites, aNumValues, aValues, ErrorAddress) {
		lastFunctionCall.push("LJM_eAddresses");
		argumentsList.push(arguments);
		populateValues(numFrames, aWrites, aNumValues, aValues);		
		// console.log("Addr",arguments);
		return expectedResult;
	},
	function(handle, numFrames, aAddresses, aTypes, aWrites, aNumValues, aValues, ErrorAddress, callback) {
		lastFunctionCall.push("LJM_eAddressesAsync");
		argumentsList.push(arguments);
		populateValues(numFrames, aWrites, aNumValues, aValues);
		reportEnd(callback);
	});
/**
 * Test-Function for Synchronous and Async Multiple-Operation functionality: 
 */
var LJM_eNames = createCallableObject(
	function(handle, numFrames, aNames, aWrites, aNumValues, aValues, ErrorAddress) {
		lastFunctionCall.push("LJM_eNames");
		argumentsList.push(arguments);
		populateValues(numFrames, aWrites, aNumValues, aValues);
		return expectedResult;
	},
	function(handle, numFrames, aNames, aWrites, aNumValues, aValues, ErrorAddress, callback) {
		lastFunctionCall.push("LJM_eNamesAsync");
		argumentsList.push(arguments);
		populateValues(numFrames, aWrites, aNumValues, aValues);
		reportEnd(callback);
	});

//******************************************************************************
//*********************		Driver Specific Functions	************************
//******************************************************************************

/**
 * Test-Function for Synchronous and Async Multiple-Operation functionality: 
 */
var LJM_ListAll = createCallableObject(
	function(devT, conT, numFound, aDeviceTypes, aConnectionTypes, aSerialNumbers, aIPAddresses) {
		lastFunctionCall.push("LJM_ListAll");
		argumentsList.push(arguments);
		return expectedResult;
	},
	function(devT, conT, numFound, aDeviceTypes, aConnectionTypes, aSerialNumbers, aIPAddresses, callback) {
		lastFunctionCall.push("LJM_ListAllAsync");
		argumentsList.push(arguments);
		reportEnd(callback);
	});
var LJM_ListAllS = createCallableObject(
	function(devT, conT, numFound, aDeviceTypes, aConnectionTypes, aSerialNumbers, aIPAddresses) {
		lastFunctionCall.push("LJM_ListAllS");
		argumentsList.push(arguments);
		return expectedResult;
	},
	function(devT, conT, numFound, aDeviceTypes, aConnectionTypes, aSerialNumbers, aIPAddresses, callback) {
		lastFunctionCall.push("LJM_ListAllSAsync");
		argumentsList.push(arguments);
		reportEnd(callback);
	});
var LJM_ListAllExtended = createCallableObject(
	function(DeviceType, ConnectionType, NumAddresses, aAddresses, aNumRegs, MaxNumFound, NumFound, aDeviceTypes, aConnectionTypes, aSerialNumbers, aIPAddresses, aBytes) {
		lastFunctionCall.push("LJM_ListAllExtended");
		argumentsList.push(arguments);
		return expectedResult;
	},
	function(DeviceType, ConnectionType, NumAddresses, aAddresses, aNumRegs, MaxNumFound, NumFound, aDeviceTypes, aConnectionTypes, aSerialNumbers, aIPAddresses, aBytes, callback) {
		lastFunctionCall.push("LJM_ListAllExtendedAsync");
		argumentsList.push(arguments);
		reportEnd(callback);
	});

/**
 * Test-Function for Synchronous and Async Multiple-Operation functionality: 
 */
var LJM_ErrorToString = createCallableObject(
	function(errNum, strBuff) {
		lastFunctionCall.push("LJM_ErrorToString");
		argumentsList.push(arguments);
		return expectedResult;
	},
	function(errNum, strBuff, callback) {
		lastFunctionCall.push("LJM_ErrorToStringAsync");
		argumentsList.push(arguments);
		reportEnd(callback);
	});

var LJM_LoadConstants = createCallableObject(
	function() {
		lastFunctionCall.push("LJM_LoadConstants");
		argumentsList.push(arguments);
		return expectedResult;
	},
	function(callback) {
		lastFunctionCall.push("LJM_LoadConstantsAsync");
		argumentsList.push(arguments);
		reportEnd(callback);
	});

var LJM_CloseAll = createCallableObject(
	function() {
		lastFunctionCall.push("LJM_CloseAll");
		argumentsList.push(arguments);
		return expectedResult;
	},
	function(callback) {
		lastFunctionCall.push("LJM_CloseAllAsync");
		argumentsList.push(arguments);
		reportEnd(callback);
	});

/**
 * Test-Function for Synchronous and Async Multiple-Operation functionality:
 * Reading numbers & strings from the LJM library 
**/
var LJM_ReadLibraryConfigS = createCallableObject(
	function(parameter, returnVar) {
		if(parameter == 'LJM_LIBRARY_VERSION') {
			return driver_const.LJM_JS_VERSION;
		}
		lastFunctionCall.push("LJM_ReadLibraryConfigS");
		argumentsList.push(arguments);
		return expectedResult;
	},
	function(parameter, returnVar, callback) {
		lastFunctionCall.push("LJM_ReadLibraryConfigSAsync");
		argumentsList.push(arguments);
		reportEnd(callback);
	});
var LJM_ReadLibraryConfigStringS = createCallableObject(
	function(parameter, returnVar) {
		if(parameter == 'LJM_LIBRARY_VERSION') {
			return driver_const.LJM_JS_VERSION;
		}
		lastFunctionCall.push("LJM_ReadLibraryConfigStringS");
		argumentsList.push(arguments);
		return expectedResult;
	},
	function(parameter, returnVar, callback) {
		lastFunctionCall.push("LJM_ReadLibraryConfigStringSAsync");
		argumentsList.push(arguments);
		reportEnd(callback);
	});

/**
 * Test-Function for Synchronous and Async Multiple-Operation functionality:
 * Writing numbers & strings from the LJM library 
**/
var LJM_WriteLibraryConfigS = createCallableObject(
	function(parameter, value) {
		lastFunctionCall.push("LJM_WriteLibraryConfigS");
		argumentsList.push(arguments);
		return expectedResult;
	},
	function(parameter, value, callback) {
		lastFunctionCall.push("LJM_WriteLibraryConfigSAsync");
		argumentsList.push(arguments);
		reportEnd(callback);
	});
var LJM_WriteLibraryConfigStringS = createCallableObject(
	function(parameter, value) {
		lastFunctionCall.push("LJM_WriteLibraryConfigStringS");
		argumentsList.push(arguments);
		return expectedResult;
	},
	function(parameter, value, callback) {
		lastFunctionCall.push("LJM_WriteLibraryConfigStringSAsync");
		argumentsList.push(arguments);
		reportEnd(callback);
	});

/**
 * Test-Function for Synchronous and Async Multiple-Operation functionality:
 * Log-File control functions 
**/
var LJM_Log = createCallableObject(
	function(level, string) {
		lastFunctionCall.push("LJM_Log");
		argumentsList.push(arguments);
		return expectedResult;
	},
	function(level, string, callback) {
		lastFunctionCall.push("LJM_LogAsync");
		argumentsList.push(arguments);
		reportEnd(callback);
	});
var LJM_ResetLog = createCallableObject(
	function() {
		lastFunctionCall.push("LJM_ResetLog");
		argumentsList.push(arguments);
		return expectedResult;
	},
	function(callback) {
		lastFunctionCall.push("LJM_ResetLogAsync");
		argumentsList.push(arguments);
		reportEnd(callback);
	});

/**
 * Test-Function for Synchronous and Async Streaming
**/
var LJM_eStreamStart = createCallableObject(
	function(handle, scansPerRead, numAddresses, aScanList, scanRate) {
		lastFunctionCall.push("LJM_eStreamStart");
		argumentsList.push(arguments);
		return expectedResult;
	},
	function(handle, scansPerRead, numAddresses, aScanList, scanRate, callback) {
		lastFunctionCall.push("LJM_eStreamStartAsync");
		argumentsList.push(arguments);
		reportEnd(callback);
	});
var LJM_eStreamRead = createCallableObject(
	function(handle, aData, deviceScanBacklog, ljmScanBacklog) {
		lastFunctionCall.push("LJM_eStreamRead");
		argumentsList.push(arguments);
		return expectedResult;
	},
	function(handle, aData, deviceScanBacklog, ljmScanBacklog, callback) {
		lastFunctionCall.push("LJM_eStreamReadAsync");
		argumentsList.push(arguments);
		reportEnd(callback);
	});
var LJM_eStreamStop = createCallableObject(
	function(handle) {
		lastFunctionCall.push("LJM_eStreamStop");
		argumentsList.push(arguments);
		return expectedResult;
	},
	function(handle, callback) {
		lastFunctionCall.push("LJM_eStreamStopAsync");
		argumentsList.push(arguments);
		reportEnd(callback);
	});

//******************************************************************************
//*********************		Driver Dict-Object	********************************
//******************************************************************************
var fakeDriver = {
	//Device Functions
	'LJM_Open': LJM_Open,
	'LJM_OpenS': LJM_OpenS,
	'LJM_GetHandleInfo': LJM_GetHandleInfo,
	'LJM_Close': LJM_Close,
	'LJM_WriteRaw': LJM_WriteRaw,
	'LJM_ReadRaw': LJM_ReadRaw,
	'LJM_eWriteAddress': LJM_eWriteAddress,
	'LJM_eReadAddress': LJM_eReadAddress,
	'LJM_eWriteName': LJM_eWriteName,
	'LJM_eReadName': LJM_eReadName,
	'LJM_eReadAddresses': LJM_eReadAddresses,
	'LJM_eReadNames': LJM_eReadNames,
	'LJM_eWriteAddresses': LJM_eWriteAddresses,
	'LJM_eWriteNames': LJM_eWriteNames,
	'LJM_eAddresses': LJM_eAddresses,
	'LJM_eNames': LJM_eNames,
	'LJM_eReadNameString': LJM_eReadNameString,
	'LJM_eReadAddressString': LJM_eReadAddressString,
	'LJM_eWriteNameString': LJM_eWriteNameString,
	'LJM_eWriteAddressString': LJM_eWriteAddressString,
	'LJM_eStreamStart': LJM_eStreamStart,
	'LJM_eStreamRead': LJM_eStreamRead,
	'LJM_eStreamStop': LJM_eStreamStop,

	//Driver Functions
	'LJM_ListAll': LJM_ListAll,
	'LJM_ListAllS': LJM_ListAllS,
	'LJM_ListAllExtended': LJM_ListAllExtended,
	'LJM_ErrorToString': LJM_ErrorToString,
	'LJM_LoadConstants': LJM_LoadConstants,
	'LJM_CloseAll': LJM_CloseAll,
	'LJM_ReadLibraryConfigS': LJM_ReadLibraryConfigS,
	'LJM_ReadLibraryConfigStringS': LJM_ReadLibraryConfigStringS,
	'LJM_WriteLibraryConfigS': LJM_WriteLibraryConfigS,
	'LJM_WriteLibraryConfigStringS': LJM_WriteLibraryConfigStringS,
	'LJM_Log': LJM_Log,
	'LJM_ResetLog': LJM_ResetLog,

	
};

exports.getDriver = function()
{
	return fakeDriver;
}
exports.getConstants = function()
{
	return ljmJsonManager.getConstants();
}
exports.getLastFunctionCall = function() {
	return lastFunctionCall;
}
exports.clearLastFunctionCall = function() {
	lastFunctionCall = [];
}
exports.setExpectedResult = function(val) {
	expectedResult = val;
}
exports.setResultArg = function(val) {
	expectedResultArg = val;
}
exports.clearArgumentsList = function(val) {
	argumentsList = [];
}
exports.getArgumentsList = function(val) {
	return argumentsList;
}
