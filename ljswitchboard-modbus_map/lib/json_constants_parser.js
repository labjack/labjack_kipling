/**
 * Logic for interfacing with the driver / register constants and config.
 *
 * Logic for parsing and re-indexing the LJM json file to increase access speed
 * to register, static driver, and configuration information. This module 
 * provides access to objects that have re-indexed the constants file by address
 * (number) and name (string).
 *
 * @author Chris Johnson (ChrisJohn404)
 */

var fs = require('fs');				//Load File System module
var os = require('os');				//Load OS module
var path = require('path');

var ljmmm_parse = require('ljmmm-parse');

var driver_const = require('ljswitchboard-ljm_driver_constants');

var array_registers = require('./array_registers');
var buffer_registers = require('./buffer_registers').bufferRegisters;

// Important constants:
// console.log(os.hostname());
// console.log(os.type());
// console.log(os.platform());
// console.log(os.arch());
// console.log(os.release());
var LJM_JSON_FILE_LOCATION;
var LJ_TEMPORARY_FILE_LOCATION;
if (process.platform === 'win32') {
	var tFileModernPath = process.env.ALLUSERSPROFILE + '\\LabJack\\K3';
	var tFileXPPath = process.env.ALLUSERSPROFILE + '\\Application Data\\LabJack\\K3';
	var modernPath = process.env.ALLUSERSPROFILE + '\\LabJack\\LJM\\ljm_constants.json';
	var xpPath = process.env.ALLUSERSPROFILE + '\\Application Data\\LabJack\\LJM\\ljm_constants.json';
	var filePath = fs.existsSync(modernPath);

	if (filePath) {
		LJM_JSON_FILE_LOCATION = modernPath;
		LJ_TEMPORARY_FILE_LOCATION = tFileModernPath;
	}
	else {
		LJM_JSON_FILE_LOCATION = xpPath;
		LJ_TEMPORARY_FILE_LOCATION = tFileXPPath;
	}
} else {
	LJM_JSON_FILE_LOCATION = '/usr/local/share/LabJack/LJM/ljm_constants.json';
	LJ_TEMPORARY_FILE_LOCATION = '/usr/local/share/LabJack/K3';
}

var PARSE_BETA_REGISTERS = true;

var typeSizes = {
	UINT64: 8,
	INT32: 4,
	STRING: 50,
	UINT16: 2,
	BYTE: 1,
	UINT32: 4,
	FLOAT32: 4
};

/**
 * Error-reporting mechanism.
 * @param {string/number} description error-description
 */
function JSONParsingError(description) {
	this.description = description;
}

function zipArraysToObject(keys, values) {
	var retObj = {};
	var numKeys = keys.length;
	
	for (var i=0; i<numKeys; i++) {
		retObj[keys[i]] = values[i];
	}

	return retObj;
}

function extendBufferRegisters(constants) {

};

var retDict;
var retDictName;
var expandedConstants = [];
var minifiedConstants = [];
//Function that re-indexes the .json File Constants by their register
function reindexConstantsByRegister(constants) {
	var numConstantsEntries = constants.length;
	expandedConstants = [];
	minifiedConstants = [];
	var expandedBetaRegisters = [];
	var entry;
	var regAddresses;
	var regNames;

	constants.registers.forEach(function(reg){
		minifiedConstants.push(reg);
	});
	constants.registers_beta.forEach(function(reg){
		minifiedConstants.push(reg);
	});

	// get registers list
	expandedConstants = ljmmm_parse.expandLJMMMEntriesSync(constants.registers);

	// get beta_registers
	expandedBetaRegisters = ljmmm_parse.expandLJMMMEntriesSync(constants.registers_beta);

	// combine beta registers into normal register list
	expandedBetaRegisters.forEach(function(betaRegister){
		expandedConstants.push(betaRegister);
	});

	regAddresses = expandedConstants.map(function (e) { return parseInt(e.address);});
	regNames = expandedConstants.map(function (e) { return e.name; });

	retDict = zipArraysToObject(regAddresses, expandedConstants);
	retDictName = zipArraysToObject(regNames, expandedConstants);

	//Add Extra Special Registers that don't live in the json file
	retDict[driver_const.T7_MA_EXF_KEY] = {
		address:driver_const.T7_MA_EXF_KEY,
		name:"T7_MA_EXF_KEY",
		type:"UINT32",
		devices:["T7"],
		readwrite:"RW"
	};
	retDict[driver_const.T7_MA_EXF_WRITE] = {
		address:driver_const.T7_MA_EXF_WRITE,
		name:"T7_MA_EXF_WRITE",
		type:"UINT32",
		devices:["T7"],
		readwrite:"RW"
	};
	retDict[driver_const.T7_MA_EXF_pWRITE] = {
		address:driver_const.T7_MA_EXF_pWRITE,
		name:"T7_MA_EXF_pWRITE",
		type:"UINT32",
		devices:["T7"],
		readwrite:"RW"
	};
	retDict[driver_const.T7_MA_EXF_READ] = {
		address:driver_const.T7_MA_EXF_READ,
		name:"T7_MA_EXF_READ",
		type:"UINT32",
		devices:["T7"],
		readwrite:"RW"
	};
	retDict[driver_const.T7_MA_EXF_pREAD] = {
		address:driver_const.T7_MA_EXF_pREAD,
		name:"T7_MA_EXF_pREAD",
		type:"UINT32",
		devices:["T7"],
		readwrite:"RW"
	};
	retDict[driver_const.T7_MA_EXF_ERASE] = {
		address:driver_const.T7_MA_EXF_ERASE,
		name:"T7_MA_EXF_ERASE",
		type:"UINT32",
		devices:["T7"],
		readwrite:"RW"
	};
	retDictName["T7_MA_EXF_KEY"] = {
		address:driver_const.T7_MA_EXF_KEY,
		name:"T7_MA_EXF_KEY",
		type:"UINT32",
		devices:["T7"],
		readwrite:"RW"
	};
	retDictName["T7_MA_EXF_WRITE"] = {
		address:driver_const.T7_MA_EXF_WRITE,
		name:"T7_MA_EXF_WRITE",
		type:"UINT32",
		devices:["T7"],
		readwrite:"RW"
	};
	retDictName["T7_MA_EXF_pWRITE"] = {
		address:driver_const.T7_MA_EXF_pWRITE,
		name:"T7_MA_EXF_pWRITE",
		type:"UINT32",
		devices:["T7"],
		readwrite:"RW"
	};
	retDictName["T7_MA_EXF_READ"] = {
		address:driver_const.T7_MA_EXF_READ,
		name:"T7_MA_EXF_READ",
		type:"UINT32",
		devices:["T7"],
		readwrite:"RW"
	};
	retDictName["T7_MA_EXF_pREAD"] = {
		address:driver_const.T7_MA_EXF_pREAD,
		name:"T7_MA_EXF_pREAD",
		type:"UINT32",
		devices:["T7"],
		readwrite:"RW"
	};
	retDictName["T7_MA_EXF_ERASE"] = {
		address:driver_const.T7_MA_EXF_ERASE,
		name:"T7_MA_EXF_ERASE",
		type:"UINT32",
		devices:["T7"],
		readwrite:"RW"
	};

	// Fix the STREAM_ENABLE register so that it is a readable register.
	var streamEnableAddr = retDictName['STREAM_ENABLE'].address;
	retDict[streamEnableAddr].readWrite = 'RW';
	retDictName['STREAM_ENABLE'].readwrite = 'RW';

	return [retDict, retDictName, expandedConstants, minifiedConstants];
}

/**
 * This function forces the isBuffer register flag to be set for known buffer
 * registers.
**/
var addMissingBufferRegisterFlags = function(constantsData) {
	var i;
	try {
		for(i = 0; i < constantsData.registers.length; i++) {
			if(buffer_registers.indexOf(constantsData.registers[i].name) >= 0) {
				constantsData.registers[i].isBuffer = true;
			}
		}
		for(i = 0; i < constantsData.registers_beta.length; i++) {
			if(buffer_registers.indexOf(constantsData.registers_beta[i].name) >= 0) {
				constantsData.registers_beta[i].isBuffer = true;
			}
		}
	} catch(err) {
		console.log('Error adding missing buffer register flags', err, i);
	}
	return constantsData;
};
/**
 * Object that parses the json file's & saves the two re-indexed dictionarys.
 * @param  {string} LJMJSONFileLocation location of 'ljm_constants.json'
 * @throws {JSONParsingError} If [this condition is met]
 */
var parseConstants = function(LJMJSONFileLocation) {
	//Load files into memory:
	var constantsData = require(LJMJSONFileLocation);
	
	addMissingBufferRegisterFlags(constantsData);

	var indexedConstants = reindexConstantsByRegister(constantsData);
	this.constantsByRegister = indexedConstants[0];
	this.constantsByName = indexedConstants[1];
	this.expandedConstants = indexedConstants[2];
	this.minifiedConstants = indexedConstants[3];
	this.origConstants = constantsData;
	this.errorsByNumber = {};
	this.errorsByName = {};

	this.arrayRegisters = {};
	var i;
	for(i = 0; i < array_registers.arrayRegisters.length; i++) {
		this.arrayRegisters[array_registers.arrayRegisters[i].name] = array_registers.arrayRegisters[i];
	}

	// Append custom "forcing error b/c device not connected" error
	constantsData.errors.push({
		'error': driver_const.LJN_DEVICE_NOT_CONNECTED,
		'string': 'LJN_DEVICE_NOT_CONNECTED',
		'description': 'The device is no longer connected, trying to reconnect'
	});
	
	var numErrors = constantsData.errors.length;
	for(i = 0; i < numErrors; i ++) {
		this.errorsByNumber[constantsData.errors[i].error] = constantsData.errors[i];
		this.errorsByName[constantsData.errors[i].string] = constantsData.errors[i];
	}
	this.getErrorInfo = function(err) {
		var result;
		if(isNaN(err)) {
			result = self.errorsByName[err];
		} else {
			result = self.errorsByNumber[err];
		}
		if(typeof(result) === 'undefined') {
			result = {
				'error': -1,
				'string': 'Unknown Error Numer'
			};
		}
		return result;
	};

	this.getAddressInfo = function(address, direction) {
		var regEntry;
		//Get the Dictionary Entry
		var isNumber = isNaN(address);
		if(!isNumber) {
			regEntry = self.constantsByRegister[address];
			resolvedAddress = address;
		} else if(isNumber) {
			regEntry = self.constantsByName[address];
			try {
				resolvedAddress = regEntry.address;
			}
			catch (e) {
				return {type: -1, directionValid: 0, typeString: "NA"};
			}
			//console.log(self.constantsByName);
		}
		//Create a deviceType Variable to save the deviceType number into
		var validity;
		try {
			var readWrite = regEntry.readwrite;
		} catch (e) {
			return {type: -1, directionValid: 0, typeString: "NA"};
		}

		if(regEntry.type == 'UINT16') {
			deviceType = driver_const.LJM_UINT16;
		} else if(regEntry.type == 'UINT32') {
			deviceType = driver_const.LJM_UINT32;
		} else if(regEntry.type == 'INT32') {
			deviceType = driver_const.LJM_INT32;
		} else if(regEntry.type == 'FLOAT32') {
			deviceType = driver_const.LJM_FLOAT32;
		} else if(regEntry.type == 'STRING') {
			deviceType = driver_const.LJM_STRING;
		} else if(regEntry.type == 'BYTE') {
			deviceType = driver_const.LJM_BYTE;
		} else if(regEntry.type == 'UINT64') {
			deviceType = driver_const.LJM_UINT64;
		}
		
		if(regEntry.readwrite.indexOf(direction) != -1) {
			validity = 1;
		} else {
			validity = 0;
		}
		var size = typeSizes[regEntry.type];
		if(typeof(size) === 'undefined') {
			size = 0;
		}
		return {
			type: deviceType,
			directionValid: validity,
			typeString: regEntry.type,
			address: resolvedAddress,
			size: size,
			data: regEntry
		};
	};

	this.isArrayRegister = function(address) {
		if(typeof(self.arrayRegisters[address]) !== 'undefined') {
			return true;
		} else {
			return false;
		}
	};
	var self = this;
};

var constants = new parseConstants(LJM_JSON_FILE_LOCATION);
/**
 * Makes the constants object available to other files
 * @return {constants-object} link to the constants object
 */
exports.getConstants = function() {
	return constants;
};
