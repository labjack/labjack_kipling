/**
 * Module dependencies.
 * Github: https://github.com/rbranson/node-ffi
 * Tutorial: https://github.com/rbranson/node-ffi/wiki/Node-FFI-Tutorial
 */
var ffi = require('ffi');		//load _______ module 
var ref = require('ref');		//Load variable type module
var fs = require('fs');			//Load File System module


/**
 * Global Variables:
 */
var driver_const = require('./driver_const');
var device = require('./labjack');
var utilities = require('./utils');

var typeSizes = {
	UINT64: 8,
	INT32: 4,
	STRING: 50,
	UINT16: 2,
	BYTE: 1,
	UINT32: 4,
	FLOAT32: 4
}


// For problem with using this layer
function JSONParsingError(description)
{
	this.description = description;
};


function parseRegisterNameString(name)
{
	//var pString = constants.registers[i].name;
	var pString = name;
	var nameString;
	var index = pString.indexOf('#');
	var result = new Array();
	//var result = utilities.sscanf(pString,'AIN#(%d:%d)');
	if(index != -1)
	{
		nameString = pString.slice(0,index);
		pString = pString.slice(index);
		result = utilities.sscanf(pString,'#(%d:%d)%s');
		if(result[2] == null)
		{
			result[2]='';
		}
		
	}
	else
	{
		result[0] = 0;
		result[1] = 0;
		nameString = name;
		result[2] = '';
	}

	return {startNum: result[0], endNum: result[1], name: nameString, nameEnd: result[2]};
}

function getTypeSize(typeName)
{
	var size = typeSizes[typeName];
	if(size === undefined)
		throw "Unknown type"; // TODO: Need better error
	return size;
}

function getTypeSizeInRegisters(typeName)
{
	return getTypeSize(typeName) / 2;
}

//Function that re-indexes the .json File Constants by their register
function reindexConstantsByRegister(constants)
{
	var regInfo;
	var typeSize;
	var regEntry;
	var numValues;
	var retDict;
	var regNum;

	retDict = {};

	for(var i in constants.registers)
	{
		//Get the Entry
		regEntry = constants.registers[i];

		//Create a regInfo object containing the start and end values
		regInfo = parseRegisterNameString(regEntry.name);

		//Get the size
		typeSize = getTypeSizeInRegisters(regEntry.type);

		//Determine how many values to add
		numValues = (regInfo.endNum - regInfo.startNum)/2+1;

		//The starting register number
		regNum=regEntry.address

		for(var j=0; j<numValues; j++)
		{
			retDict[regNum] = regEntry;
			regNum += typeSize;

		}
	}
	return retDict;
}

//create the constants object that is searchable for variables
constantsFile = function(fileString)
{
	//Saves the JSON file object as the attribute "constants" to a constantsFile Object
	var constants = JSON.parse(fileString);
	this.constants = constants;
	//this.constants = JSON.parse(fileString);
	//var JSONConstants = this.constants
	//what was created??
	//console.log('JSON file dump: ' + this.constants);
	//console.log('JSON file dump: ' + JSONConstants);

	//Saves the parsed JSON file object as a constantsByRegister Object (a dictionary).
	var constantsByRegister = reindexConstantsByRegister(this.constants);
	this.constantsByRegister = constantsByRegister;

	
	//The basic searching function (for testing)
	this.search = function(address)
	{
		//console.log(utilities.sscanf('SN/2350001', 'SN/%d')[0]);
		
		var pString = this.constants.registers[0].name;
		var index = pString.indexOf('#');

		var result = utilities.sscanf(pString,'AIN#(%d:%d)');
		if(index != -1)
		{
			pString = pString.slice(index);
			result = utilities.sscanf(pString,'#(%d:%d)');
			//console.log('Start: ' + result[0]);
			//console.log('End: ' + result[1]);
		}
		/*
		console.log('Dictionary result name: ' + this.constantsByRegister[address].name);
		console.log('Dictionary result name: ' + this.constantsByRegister[address].type);
		console.log('Dictionary result name: ' + typeof(this.constantsByRegister[address].type));
		console.log('Dictionary result name: ' + this.constantsByRegister[address].devices);
		console.log('Dictionary result name: ' + this.constantsByRegister[address].readwrite);
		*/
	};

	this.getAddressInfo = function(address, direction)
	{
		//Get the Dictionary Entry
		var regEntry = this.constantsByRegister[address];

		//Create a deviceType Variable to save the deviceType number into
		var validity;
		var readWrite = regEntry.readwrite;

		if(regEntry.type == 'UINT16')
		{
			deviceType = 0;
		}
		else if(regEntry.type == 'UINT32')
		{
			deviceType = 1;
		}
		else if(regEntry.type == 'INT32')
		{
			deviceType = 2;
		}
		else if(regEntry.type == 'FLOAT32')
		{
			deviceType = 3;
		}
		
		if(regEntry.readwrite.indexOf(direction) != -1)
		{
			validity = 1;
		}
		else
		{
			validity = 0;
		}
		
		return {type: deviceType, directionValid: validity, typeString: regEntry.type};
	}
	//Function to call that gets address info
	this.getAddressInfoa = function(address, deviceType, direction)
	{
		if(typeof(address)=="number")
		{
			
		}
		else
		{
			throw new JSONParsingError("Address to search for needs to be a number");
		}
	};
};

/*
for(var i in constants.registers)
{
	console.log(constants.registers[i].address);
}
*/
//create FFI'd versions of the liblabjackLJM library
var liblabjack = ffi.Library('/usr/local/lib/libLabJackM-0.2.43.dylib',
	{
		'LJM_AddressesToMBFB': [
			'int', [
				'int',							//MaxBytesPerMBFB
				ref.refType(ref.types.int),		//aAddresses
				ref.refType(ref.types.int), 	//aTypes
				ref.refType(ref.types.int),		//aWrites
				ref.refType(ref.types.int),		//aNumValues
				ref.refType(ref.types.double),	//aValues
				ref.refType(ref.types.int),		//NumFrames
				ref.refType(ref.types.char)		//aMBFBCommand
			]
		],

		'LJM_MBFBComm': [
			'int', [
				'int',							//Handle
				'char',							//UnitID
				ref.refType(ref.types.char),	//aMBFB
				ref.refType(ref.types.int)		//ErrorAddress
			]
		],

		'LJM_UpdateValues': [
			'int', [
				ref.refType(ref.types.char),	//aMBFBResponse
				ref.refType(ref.types.int),		//aTypes
				ref.refType(ref.types.int),		//aWrites
				ref.refType(ref.types.int),		//aNumValues
				'int',							//NumFrames
				ref.refType(ref.types.double)	//aValues
			]
		],
		'LJM_NamesToAddresses': [
			'int', [
				'int',							//NumFrames
				ref.refType('string'),			//Names
				ref.refType(ref.types.int),		//aAddresses
				ref.refType(ref.types.int)		//aTypes
			]
		],
		'LJM_NameToAddress': [
			'int', [
				'string',						//Name
				ref.refType(ref.types.int),		//Address
				ref.refType(ref.types.int)		//Type
			]
		],
		'LJM_AddressesToTypes': [
			'int', [
				'int',							//NumAddress
				ref.refType(ref.types.int),		//aAddresses
				ref.refType(ref.types.int)		//aTypes
			]
		],
		'LJM_AddressToType': [
			'int', [
				'int',							//Address
				ref.refType(ref.types.int)		//Type
			]
		],
 		'LJM_ListAll': [
 			'int', [
 				'int',							//DeviceType
 				'int',							//Connection Type
 				ref.refType(ref.types.int),		//numFound
 				ref.refType(ref.types.int),		//aDeviceTypes
 				ref.refType(ref.types.int),		//aConnectionTypes
 				ref.refType(ref.types.int),		//aSerialNumbers
 				ref.refType(ref.types.int)		//aIPAddresses
 			]
 		],
 		'LJM_ListAllS': [
 			'int', [
 				'string',						//DeviceType
 				'string',						//Connection Type
 				ref.refType(ref.types.int),		//numFound
 				ref.refType(ref.types.int),		//aDeviceTypes
 				ref.refType(ref.types.int),		//aConnectionTypes
 				ref.refType(ref.types.int),		//aSerialNumbers
 				ref.refType(ref.types.int)		//aIPAddresses
 			]
 		],
 		'LJM_Open': [
 			'int', [
 				'int',							//DeviceType
 				'int',							//ConnectionType
 				'string',						//Identifier
 				ref.refType(ref.types.int)		//handle
 			]
 		],
 		'LJM_OpenS': [
 			'int', [
 				'string',						//DeviceType
 				'string',						//ConnectionType
 				'string',						//Identifier
 				ref.refType(ref.types.int)		//Handle
 			]
 		],
 		'LJM_GetHandleInfo': [
 			'int', [
 				'int',							//Handle
 				ref.refType(ref.types.int),		//DeviceType
 				ref.refType(ref.types.int),		//ConnectionType
 				ref.refType(ref.types.int),		//SerialNumber
 				ref.refType(ref.types.int),		//IPAddress
 				ref.refType(ref.types.int),		//Port
 				ref.refType(ref.types.int)		//MaxBytesPerMB
 			]
 		],
 		'LJM_ResetConnection': [
 			'int', [
 				'int'							//Handle
 			]
 		],
 		'LJM_ErrorToString': [
 			'int', [
 				'int',							//ErrCode
 				'string'						//ErrString
 			]
 		],
 		'LJM_LoadConstants': [
 			'int', [
 				'void'							//None
 			]
 		],
 		'LJM_Close': [
 			'int', [
 				'int'							//Handle
 			]
 		],
 		'LJM_CloseAll': [
 			'int', [
 				'void'							//None
 			]
 		],
 		'LJM_WriteRaw': [
			'int', [
				'int',							//Handle
				ref.refType(ref.types.char),	//aData
				'int'							//NumBytes
			]
		],
		'LJM_ReadRaw': [
			'int', [
				'int',							//Handle
				ref.refType(ref.types.char),	//aData
				'int'							//NumBytes
			]
		],
 		'LJM_eWriteAddress': [
 			'int', [
 				'int',							//Handle
 				'int',							//Address
 				'int',							//Type
 				'double'						//Value
 			]
 		],
 		'LJM_eReadAddress': [
 			'int', [
 				'int',							//Handle
 				'int',							//Address
 				'int',							//Type
 				ref.refType('double')			//Value (ptr)
 				//ref.refType(ref.types.double)
 			]
 		],
 		'LJM_eWriteName': [
 			'int', [
 				'int',							//Handle
 				'string',						//Name
 				'double'						//Value
 			]
 		],
 		'LJM_eReadName': [
 			'int', [
 				'int',							//Handle
 				'string',						//Name
 				ref.refType(ref.types.double)	//Value (ptr)
 			]
 		],
 		'LJM_eReadAddresses': [
 			'int', [
 				'int',							//Handle
 				'int',							//NumFrames (Number of Registers being accessed)
 				ref.refType(ref.types.int),		//Addresses (Registers to read from)
 				ref.refType(ref.types.int),		//Types
 				ref.refType('double'),			//aValues (Readings)
 				ref.refType(ref.types.int)		//ErrorAddress
 			]
 		],
 		'LJM_eReadNames': [
 			'int', [
 				'int',							//Handle
 				'int',							//NumFrames (Number of Registers being accessed)
 				ref.refType('string'),			//aNames (Registers to read from)
 				ref.refType(ref.types.double),	//aValues (Readings)
 				ref.refType(ref.types.int)		//ErrorAddress
 			]
 		],
 		'LJM_eWriteAddresses': [
 			'int', [
 				'int',							//Handle
 				'int',							//NumFrames (Number of Registers being accessed)
 				ref.refType(ref.types.int),		//aAddresses (Registers to write to)
 				ref.refType(ref.types.int),		//aTypes
 				ref.refType(ref.types.double),	//aValues (Values to write)
 				ref.refType(ref.types.int)		//ErrorAddress
 			]
 		],
 		'LJM_eWriteNames': [
 			'int', [
 				'int',							//Handle
 				'int',							//NumFrames (Number of Registers being accessed)
 				ref.refType('string'),			//aNames (Registers to write to)
 				ref.refType(ref.types.double),	//aValues (Values to write)
 				ref.refType(ref.types.int)		//ErrorAddress
 			]
 		],
 		'LJM_eAddresses': [
 			'int', [
 				'int',							//Handle
 				'int',							//NumFrames
 				ref.refType(ref.types.int),		//aAddresses
 				ref.refType(ref.types.int), 	//aTypes
 				ref.refType(ref.types.int),		//aWrites
 				ref.refType(ref.types.int),		//aNumValues
 				ref.refType(ref.types.double),	//aValues
 				ref.refType(ref.types.int)		//ErrorAddress
 			]
 		],
 		'LJM_eNames': [
 			'int', [
 				'int',							//Handle
 				'int',							//NumFrames
 				ref.refType('string'),			//aNames
 				ref.refType(ref.types.int),		//aWrites
 				ref.refType(ref.types.int),		//aNumValues
 				ref.refType(ref.types.double),	//aValues
 				ref.refType(ref.types.int)		//ErrorAddress
 			]
 		],
 		'LJM_eStreamStart': [
 			'int', [
 				'int',							//Handle
 				'int',							//ScansPerRead
 				'int',							//NumChannels
 				ref.refType(ref.types.double),	//aScanList_Pos
 				ref.refType(ref.types.int)		//ScanRate
 			]
 		],
 		'LJM_eStreamRead': [
 			'int', [
 				'int',							//Handle
 				ref.refType(ref.types.int),		//aData
 				ref.refType(ref.types.double),	//DeviceScanBacklog (ptr)
 				ref.refType(ref.types.int)		//LJMScanBacklog (ptr)
 			]
 		],
 		'LJM_eStreamStop': [
 			'int', [
 				'int'							//Handle
 			]
 		],
 		'LJM_eReadString': [
 			'int', [
 				'int',							//Handle
 				'string',						//Name
 				'string'						//String
 			]
 		],
 		'LJM_eWriteString': [
 			'int', [
 				'int',							//Handle
 				'string',						//Name
 				'string'						//String
 			]
 		],
 		'LJM_WriteLibraryConfigS': [
 			'int', [
 				'string',						//parameter
 				'double'						//Value
 			]
 		],
 		'LJM_WriteLibraryConfigStringS': [
 			'int', [
 				'string',
 				'string'
 			]
 		],
 		'LJM_ReadLibraryConfigS': [
 			'int', [
 				'string',						//Attribute
 				ref.refType(ref.types.double)	//Return-VarPtr
 			]
 		],
 		'LJM_ReadLibraryConfigStringS': [
 			'int', [
 				'string',
 				'string'
 			]
 		],
 		'LJM_Log': [
 			'int', [
 				'int',							//Level
 				'string'						//Return-VarPtr
 			]
 		],
 		'LJM_ResetLog': [
 			'int', [
 				'void'							//None
 			]
 		]
	}
);


var jsonFileString = fs.readFileSync('./ljm_constants.json', 'utf8');
constants = new constantsFile(jsonFileString)

exports.getDriver = function()
{
	return liblabjack;
}
exports.getConstants = function()
{
	return constants;
}
exports.parseRegisterNameString = function (name)
{
	return parseRegisterNameString(name);
}







