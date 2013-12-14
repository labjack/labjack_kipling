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

var async = require('async');
var ljmmm_parse = require('ljmmm-parse');

var utilities = require('./utils');	//Load module for sscanf
var driver_const = require('./driver_const');


//Important constants:
// console.log(os.hostname());
// console.log(os.type());
// console.log(os.platform());
// console.log(os.arch());
// console.log(os.release());
var LJM_JSON_FILE_LOCATION = '/usr/local/share/LabJack/LJM/ljm_constants.json';
var PARSE_BETA_REGISTERS = true;

var typeSizes = {
	UINT64: 8,
	INT32: 4,
	STRING: 50,
	UINT16: 2,
	BYTE: 1,
	UINT32: 4,
	FLOAT32: 4
}

/**
 * Error-reporting mechanism.
 * @param {string/number} description error-description
 */
function JSONParsingError(description) {
	this.description = description;
};

function zipArraysToObject(keys, values)
{
	var retObj = {};
	var numKeys = keys.length;
	
	for (var i=0; i<numKeys; i++) {
		retObj[keys[i]] = values[i];
	}

	return retObj;
}

//Function that re-indexes the .json File Constants by their register
function reindexConstantsByRegister(constants)
{
	var numConstantsEntries = constants.length;
	var expandedConstants = [];
	var entry;
	var regAddresses;
	var regNames;

	expandedConstants = ljmmm_parse.expandLJMMMEntriesSync(constants.registers);

	regAddresses = expandedConstants.map(function (e) { return parseInt(e.address); });
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
	return [retDict, retDictName];
}
/**
 * Object that parses the json file's & saves the two re-indexed dictionarys.
 * @param  {string} LJMJSONFileLocation location of 'ljm_constants.json'
 * @throws {JSONParsingError} If [this condition is met]
 */
var parseConstants = function(LJMJSONFileLocation) {
	//Load files into memory:
	var constantsData = require(LJMJSONFileLocation);
	
	var indexedConstants = reindexConstantsByRegister(constantsData);
	this.constantsByRegister = indexedConstants[0];
	this.constantsByName = indexedConstants[1];

	//console.log("JSON-CONSTANTS-PARSER");
	this.getAddressInfo = function(address, direction)
	{

		var regEntry;
		//Get the Dictionary Entry
		if(typeof(address)=="number")
		{
			regEntry = this.constantsByRegister[address];
			resolvedAddress = address;
		}
		else if(typeof(address)=="string")
		{
			regEntry = this.constantsByName[address];
			try {
				resolvedAddress = regEntry.address;
			}
			catch (e) {
				return {type: -1, directionValid: 0, typeString: "NA"};
			}
			//console.log(this.constantsByName);
		}
		//Create a deviceType Variable to save the deviceType number into
		var validity;
		try {
			var readWrite = regEntry.readwrite;
		}
		catch (e)
		{
			return {type: -1, directionValid: 0, typeString: "NA"};
		}

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
		else if(regEntry.type == 'STRING')
		{
			deviceType = 98;
		}
		
		if(regEntry.readwrite.indexOf(direction) != -1)
		{
			validity = 1;
		}
		else
		{
			validity = 0;
		}
		
		return {type: deviceType, directionValid: validity, typeString: regEntry.type, address: resolvedAddress};
	}
}

constants = new parseConstants(LJM_JSON_FILE_LOCATION);
/**
 * Makes the constants object available to other files
 * @return {constants-object} link to the constants object
 */
exports.getConstants = function() {
	return constants;
}