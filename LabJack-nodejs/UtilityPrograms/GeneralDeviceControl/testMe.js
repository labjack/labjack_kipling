#!/usr/bin/env node
//Run: ./testMe.js --testNum=0 --async=true
//Requires "node-optimist" to accept commandline args: https://github.com/substack/node-optimist
//Stuff For Testing:

var argv = require('optimist').argv;

var basicTest = 
[
'open("LJM_dtANY","LJM_ctANY","LJM_idANY")',
'getHandleInfo()',
'read("FIO0")',
'write(1000, 0.5)',
'read("AIN1")',
'write("DAC0", 4.1)',
'read(2)',
'write("DAC0", 5.0)',
'write("DAC1", 5.0)',
'read("WIFI_SSID_DEFAULT")',
'readMany(["AIN0","AIN1","AIN2"])',
'writeMany(["DAC0","DAC1"], [1.0, 2.0])',
'readMany(["AIN0","AIN1","AIN2"])',
'writeMany([1000,1002], [2.0, 1.0])',
'readMany([0,2,4])',
'writeMany([{addr:1000,val:1.0},{addr:1002,val:2.0}])',
'readMany([0,2,4])',
'close()'
]
var writeTest = 
[
'open("LJM_dtT7","LJM_ctUSB","470010642")',
'read("FIO0")',
'read("DEVICE_NAME_DEFAULT")',
'write(1000, 0.5)',
'read("DEVICE_NAME_DEFAULT")',
'read(60500)',
'write("DEVICE_NAME_DEFAULT","HELLOT")',
'read("DEVICE_NAME_DEFAULT")',
'close()'
]
var openCloseTest = 
[
//'listAll("LJM_dtT7","LJM_ctUSB")',
/*'listAll("LJM_dtT7","LJM_ctUSB")',
'listAll("LJM_dtT7","LJM_ctETHERNET")',
'listAll("LJM_dtT7","LJM_ctWIFI")',
'listAll(7,1)',
'listAll(7,3)',
'listAll(7,4)',*/
//'errToStr(1268)',
//'errToStr(0)',
//'errToStr(200)',
//'close()',
//'open("LJM_dtT7","LJM_ctANY","LJM_idANY")',
//'close()',
//'open("LJM_dtT7","LJM_ctUSB","470010642")',
//'close()',
//'open("LJM_dtT7","LJM_ctETHERNET","470010642")',
//'close()',
'open("LJM_dtANY","0","LJM_idANY")',
'close()',
'open("0","LJM_ctANY","LJM_idANY")',
'close()',
'open("LJM_dtANY",0,"LJM_idANY")',
'close()',
'open(0,"LJM_ctANY","LJM_idANY")',
'close()',
]
var configureWifiLJ = 
[
'open("LJM_dtT7","LJM_ctUSB","LJM_idANY")',
'write("POWER_WIFI",0)',
'write("WIFI_SSID_DEFAULT", "5PoundBass")',
'write("WIFI_PASSWORD_DEFAULT", "smgmtbmb3cmtbc")',
'write("WIFI_APPLY_SETTINGS",1)',
'write("POWER_WIFI",1)',
'close()'
]
var configureWifiHome = 
[
'open("LJM_dtT7","LJM_ctUSB","LJM_idANY")',
'write("POWER_WIFI",0)',
'write("WIFI_SSID_DEFAULT", "AAA")',
'write("WIFI_PASSWORD_DEFAULT", "timmarychriskevin")',
'write("WIFI_APPLY_SETTINGS",1)',
'write("POWER_WIFI",1)',
'close()'
]
var readWifiConfig = 
[
'open("LJM_dtT7","LJM_ctUSB","LJM_idANY")',
'read("POWER_WIFI")',
'read("WIFI_SSID_DEFAULT")',
'read("WIFI_STATUS")',
'read("WIFI_IP")',
'close()'
]

var updateFirmware=
[
'loadFirmwareVersionsFile("./firmwareVersions.json")',
//
/*'loadFiwmareFile(200,1.1617)',
'extractLoadedFwHeaderInfo()',
'loadFiwmareFile(200,1.1615)',
'extractLoadedFwHeaderInfo()',
'loadFiwmareFile(200,1.1500)',
'extractLoadedFwHeaderInfo()',
'loadFiwmareFile(7,0.9421)',
'extractLoadedFwHeaderInfo()',
'loadFiwmareFile(7,0.9420)',
'extractLoadedFwHeaderInfo()',
'loadFiwmareFile(7,0.9418)',
'extractLoadedFwHeaderInfo()',*/
//'loadFiwmareFile(7,0.9500)',
'loadFiwmareFile(7,0.9420)',
'extractLoadedFwHeaderInfo()',
//
//'downloadAllFirmwareVersions()',
'open("LJM_dtT7","LJM_ctUSB","LJM_idANY")',
'checkFirmwareCompatability()',
//'readFirstImagePage()',
'eraseFlash(1)',
'writeBinary()',
'reInitializeDevice()',

/**
Update firmware Steps T7:
0. Check for appropriate loaded firmware
1. Erase flash
2. Write to flash
3. Re-init device
4. Wait for re-initialization
5. Connect & check new firmware version

Update firmware Steps for Digit:
0. Extract header
1. Erase User Data
2.
**/
//'updateFirmware(0.9421)',
'close()'
]
var downloadFirmware = 
[
'loadFirmwareVersionsFile("./firmwareVersions.json")',
'downloadAllFirmwareVersions()',
//'downloadFirmwareVersion(7,0.9416)',
//'downloadFirmwareVersion(7,0.9421)',

//Test LJ-Digit Firmware File Extraction
'loadFiwmareFile(200,1.1615)',
'extractLoadedFwHeaderInfo()',

//Test T7 Firmware File Extraction
'loadFiwmareFile(7,0.9421)',
'extractLoadedFwHeaderInfo()',
]
var LUATestScript = 
[
'listAll("LJM_dtT7","LJM_ctEthernet")',
]
var listAllTest = 
[
// 'listAll("LJM_dtT7","LJM_ctEthernet")',
'listAllExtended("LJM_dtT7","LJM_ctEthernet",["AIN0","DAC0","DEVICE_NAME_DEFAULT","FIRMWARE_VERSION"])',
'listAllExtended("LJM_dtT7","LJM_ctWifi",["AIN0","DAC0","DEVICE_NAME_DEFAULT","FIRMWARE_VERSION"])',
]
var configureWifiTJ = 
[
'open("LJM_dtT7","LJM_ctUSB","LJM_idANY")',
'write("POWER_WIFI",0)',
'write("WIFI_SSID_DEFAULT", "linksys-johnson-hifi")',
'write("WIFI_PASSWORD_DEFAULT", "timmarychriskevin")',
'write("WIFI_DHCP_ENABLE_DEFAULT",0)',
'write("WIFI_APPLY_SETTINGS",1)',
'write("POWER_WIFI",1)',
'close()'
]
/*var testArray = new Array();
testArray[0] = basicTest;
testArray[1] = writeTest;
testArray[2] = openCloseTest;
testArray[3] = configureWifiLJ;
testArray[4] = configureWifiHome;
testArray[5] = readWifiConfig;
testArray[6] = updateFirmware;*/
var readRSSI_1 = 
[
'open("LJM_dtT7","LJM_ctWiFi","192.168.1.90")',
'read("WIFI_RSSI")',
'close()'
]
var readRSSI_2 = 
[
'open("LJM_dtT7","LJM_ctWiFi","192.168.1.186")',
'read("WIFI_RSSI")',
'close()'
]
var rwManyTest = 
[
'open("LJM_dtT7","LJM_ctEthernet","470010533")',
'read("AIN0")',
'rwMany(["AIN0","AIN0"],[0,0],[2,1],[-1,-1,-1])',
'close()'
]
var altNamesAndBeta = 
[
'open("LJM_dtT7","LJM_ctEthernet","470010117")',
'read("DIO0")',
'read("LUA_RUN")',
'close()'
]
var speedTest = 
[
'open("LJM_dtT7","LJM_ctUSB","ANY")',
]
var i;
for(i = 0; i < 500; i++) {
	speedTest.push('read("AIN0")');
}
speedTest.push('close()');

// 'readMany(["AIN0","AIN1","AIN2"])',
var buildReadManySpeedTest = function() {
	var cmdList = [
		'open("LJM_dtT7","LJM_ctEthernet","192.168.1.106")',
		'getHandleInfo()',
		'write("AIN_ALL_RANGE",0.01)',
		'write("AIN_ALL_RESOLUTION_INDEX",1)',
		'writeLibrary("LJM_SEND_RECEIVE_TIMEOUT_MS",5000)',
	];
	var numChannels = 14;
	var numReads = 1000;
	var baseChannels = [];
	var base="AIN";
	var startString = "readMany([\"";
	var separator = "\",\"";
	var endString = "\"])";
	var numReadManyChannels
	var i;
	var cmdStr = "";
	for(i = 0; i < numChannels; i++) {
		baseChannels.push(base+i.toString());
	}
	cmdStr += startString;
	baseChannels.forEach(function(chName){
		cmdStr += chName;
		cmdStr += separator;
	});
	cmdStr = cmdStr.slice(0,cmdStr.length-3);
	cmdStr += endString + '#PRINTTIME';
	// console.log('Resulting Command:',cmdStr);
	for(i = 0; i < numReads; i++) {
		cmdList.push(cmdStr);
	}
	// cmdList.push('close()'+ '#PRINTTIME');
	cmdList.push('#PRINTTIME');
	cmdList.push('close()');
	// console.log('Command List:',cmdList)
	return cmdList
}
var readManySpeedTest = buildReadManySpeedTest();

var buildBreakEthernetConnectionTest = function() {
	var cmdList = [
		'open("LJM_dtT7","LJM_ctEthernet","470010604")',
		'getHandleInfo()',
		'read("POWER_WIFI")',
		'read("POWER_WIFI_DEFAULT")'
	];
	var i;
	var numWait=10;
	for(i=0;i<numWait;i++) {
		cmdList.push('read("WIFI_STATUS")');
	}
	cmdList.push('write("POWER_WIFI_DEFAULT",0)');
	for(i=0;i<numWait;i++) {
		cmdList.push('read("WIFI_STATUS")');
	}
	cmdList.push('write("POWER_WIFI",0)');
	for(i=0;i<numWait;i++) {
		cmdList.push('read("WIFI_STATUS")');
	}
	cmdList.push('close()');
	return cmdList;
}
var readMacTest = 
[
// 'open("LJM_dtT7","LJM_ctUSB","ANY")',
'open("LJM_dtT7","LJM_ctWifi","192.168.1.29")',
// Addresses, directions, numValues, values(empty for write)
'readUINT64("ethernet")',
'readUINT64("wifi")',
'close()'
]

var breakEthernetConnectionTest = buildBreakEthernetConnectionTest();
testArray = 
[
basicTest, 				// 0
writeTest,				// 1
openCloseTest,			// 2
configureWifiLJ,		// 3
configureWifiHome,		// 4
readWifiConfig,			// 5
updateFirmware,			// 6
downloadFirmware,		// 7
LUATestScript,			// 8
listAllTest,			// 9
configureWifiTJ,		// 10
readRSSI_1,				// 11
readRSSI_2, 			// 12
rwManyTest,				// 13
altNamesAndBeta,		// 14
speedTest,				// 15
readManySpeedTest,		// 16
breakEthernetConnectionTest, // 17
readMacTest			// 18
]

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
	console.log('Starting Async-Test');
	console.log(activeTest);
	asyncTest.printData(true);
	asyncTest.run(activeTest);
}
else
{
	console.log('Testing Blocking Functionality');

	//Load Blocking-Testing file
	var blockingTest = require('./blockingTest');

	//Test Blocking-Functionality
	console.log('Starting Blocking-Test');
	console.log(activeTest);
	// console.log('Not Run, currently not working');
	blockingTest.printData(false);
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