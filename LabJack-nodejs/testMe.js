#!/usr/bin/env node
//Run: ./testMe.js --testNum = 0 --async=true
//Requires "node-optimist" to accept commandline args: https://github.com/substack/node-optimist
//Stuff For Testing:
var argv = require('optimist').argv;

var assert = require('assert');
assert.equal('Hello','Hello');

basicTest = 
[
'open("LJM_dtT7","LJM_ctUSB","470010642")',
'read("FIO0")',
'write(1000, 0.5)',
'read("AIN1")',
'write("DAC0", 4.1)',
'read(2)',
'write("DAC0", 5.0)',
'write("DAC1", 5.0)',
'writeS("WIFI_SSID_DEFAULT", "6poundbass")',
'readS("WIFI_SSID_DEFAULT")',
'writeS("WIFI_SSID_DEFAULT", "5poundbass")',
'readS("WIFI_SSID_DEFAULT")',
'readMany(["AIN0","AIN1","AIN2"])',
'writeMany(["DAC0","DAC1"], [1.0, 2.0])',
'readMany(["AIN0","AIN1","AIN2"])',
'writeMany([1000,1002], [2.0, 1.0])',
'readMany([0,2,4])',
'writeMany([{addr:1000,val:2.0},{addr:1002,val:1.0}])',
'close()'
]
openCloseTest = 
[
//'listAll()',
/*'listAll("LJM_dtT7","LJM_ctUSB")',
'listAll("LJM_dtT7","LJM_ctETHERNET")',
'listAll("LJM_dtT7","LJM_ctWIFI")',
'listAll(7,1)',
'listAll(7,3)',
'listAll(7,4)',*/
'errToStr(1268)',

//'open("LJM_dtANY","LJM_ctANY","LJM_idANY")',
//'close()',
//'open("LJM_dtT7","LJM_ctANY","LJM_idANY")',
//'close()',
'open("LJM_dtT7","LJM_ctUSB","470010642")',
'close()',
//'open("LJM_dtT7","LJM_ctETHERNET","470010642")',
//'close()',
//'open("LJM_dtT7","LJM_ctWIFI","470010642")',
//'close()',
]

var testArray = new Array();
testArray[0] = basicTest;
testArray[1] = openCloseTest;

var activeTest;
if(argv.testNum != null)
{
	if((parseInt(argv.testNum)>=0) && (parseInt(argv.testNum)<testArray.length))
	{
		activeTest = testArray[parseInt(argv.testNum)];
	}
	else
	{
		activeTest = testArray[0];
	}
}
else
{
	activeTest = testArray[0];
}


//var devT = "LJM_dtT7";
//var conT = "LJM_ctUSB";
//var identifier = "LJM_idANY";
//var identifier = "470010642";

if(argv.async=='true')
{
	console.log('Testing Async Functionality');

	//Load Async-Testing file
	var asyncTest = require('./asyncTest');

	//Test Async-Functionality
	asyncTest.run(activeTest);
}
else
{
	console.log('Testing Blocking Functionality');

	//Load Blocking-Testing file
	var blockingTest = require('./blockingTest');

	//Test Blocking-Functionality
	blockingTest.run(activeTest);	
}


//var device = new deviceManager.labjack(jsconstants.GENERAL_DEBUGGING_ENABLE,jsconstants.ENABLE_ALL_DEBUGGING);





//var result = device.open(jsconstants.LJM_DT_T7,jsconstants.LJM_CT_USB,identifier);
//var result = device.open(devT,conT,identifier, onError, onSuccess);
//var result = device.open(onError, onSuccess);
//var result = device.open();
/*var result = device.open(devT,conT,identifier);
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
*/

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
/*
nt * aDeviceTypes, int * aConnectionTypes,
 int * aSerialNumbers, int * aIPAddresses
return [{'type': 6, 'connectionType': USB, 'serialNumber' 1231245, 'ipAddress': null}, ...]

*/