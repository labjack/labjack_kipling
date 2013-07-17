#!/usr/bin/env node
//Requires "node-optimist" to accept commandline args: https://github.com/substack/node-optimist
//Stuff For Testing:
var argv = require('optimist').argv;

var assert = require('assert');
assert.equal('Hello','Hello');

console.log(argv.async);
if(argv.async)
{
	console.log('Testing Async Functionality');
}
else
{
	console.log('Testing Blocking Functionality');
}
//Initialization of Driver:
//var jsconstants = require('./driver_const');
//var driver = require('./driver');
var deviceManager = require('./labjack');

//var device = new deviceManager.labjack(jsconstants.GENERAL_DEBUGGING_ENABLE,jsconstants.ENABLE_ALL_DEBUGGING);
var device = new deviceManager.labjack();

function onError(erStr)
{
	console.log("ERROR: "+erStr);
}
function onSuccess(res)
{
	console.log("SUCCESS: "+res);
}

var devT = "LJM_dtANY";
var conT = "LJM_ctUSB";
var identifier = "LJM_idANY";
var identifier = "470010642";
//var result = device.open(jsconstants.LJM_DT_T7,jsconstants.LJM_CT_USB,identifier);
//var result = device.open(devT,conT,identifier, onError, onSuccess);
//var result = device.open(onError, onSuccess);
//var result = device.open();
var result = device.open(devT,conT,identifier);
console.log('Open Result: ' + result);


console.log('Read AIN0 (Register 0) Result: '+ device.read(0));
console.log('Read AIN1 (Register 2) Result: '+ device.read(2));
console.log('Read FIO_STATE (Register 2500) Result: '+ device.read(2500));
console.log('Read AIN2 (Register 4) Result: '+ device.read(4));


var readArray = new Array();
readArray[0] = 0;
readArray[1] = 2;
readArray[2] = 4;
readArray[3] = 6;
console.log('ReadRegisters Result: ' + device.readRegisters(readArray))

var writeArray = new Array();
var writeValues = new Array();

writeArray[0] = 1000;
writeArray[1] = 1002;
writeValues[0] = 1.0;
writeValues[1] = 2.0;
console.log('type of array: '+ typeof(writeArray));
console.log('WriteRegisters Result: ' + device.writeRegisters(writeArray, writeValues));

result = device.close();
console.log('Close Result: ' + result);


/*
var result = isNum("i");
console.log('Your output: ' + result);
console.log('Your output: ' + (typeof(" ")=="string"));

*/


/*
function isNumber(o){
	return ! isNaN (o-0) && o !== null && o !=="" && o !== false;
}
function isNum(o)
{
	if(o.substring)
	{
		return true;
	}
	else
	{
		return false;
	}
}
var result = isNumber("i");
*/