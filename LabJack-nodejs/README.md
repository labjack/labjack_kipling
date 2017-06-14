LabJack-nodejs
==============
'LabJack-nodejs' makes LabJack's [LJM library](http://labjack.com/ljm) available for node.js.  The library uses [ffi](https://www.npmjs.com/package/ffi) to link to the appropriate library file (LabJackM.dll, LabJackM.dylib, or LabJackM.so) which must be installed with one of [LabJack's installers](https://labjack.com/support/software/installers/ljm).  Currently, installers are available for Windows, Mac OS X, Linux 32-bit & 64-bit, and a few builds for ARMv6 and ARMV7 architectures.

This library exposes the LJM driver slightly different than our standard [LJM Library](https://labjack.com/support/software/examples/ljm) wrappers because it was created primarily for use in [Kipling](https://labjack.com/support/software/applications/kipling).  If this library were to be re-written it would be split into two modules, one that directly exposes the LJM Library functions, and another that performs some of the abstractions.  A brief summary of how this library exposes the LJM Library:
 * Created two different objects, device.js and driver.js, that can be imported individually.
 * Was created to function much like the [LabJack Python driver](http://labjack.com/support/labjackpython) for LabJack UD devices.
 * For more information about what each function does, please look at the LabJackM.h file that can be downloaded & installed from LabJacks [Software & Driver](http://labjack.com/support/software) page.

Currently this wrapper only supports the [T7](http://labjack.com/products/t7), [T7-Pro](http://labjack.com/products/t7), [Digit-TL](http://labjack.com/products/digit), and [Digit-TLH](http://labjack.com/products/digit) LabJack devices. (Which are low cost, high-quality, multifunction USB / Ethernet / 802.11b/g WiFi DAQ devices.)  Devices using the UD library (Windows only) aka U3, U6, and UE9 are not supported.  Additionally, the U12 is not supported.

Notes:
------

If you are trying to perform device IO, consider looking at the [ljswitchboard-ljm_device_curator](https://www.npmjs.com/package/ljswitchboard-ljm_device_curator) project.  It makes several more device abstractions and wraps this library in a promise interface.
If you are trying to scan for devices consider using the [ljswitchboard-device_scanner](https://www.npmjs.com/package/ljswitchboard-device_scanner) module.

Requirements
------------

* LabJack's [LJM Library](https://labjack.com/support/software/installers/ljm).
* Ability to build native modules, for Windows this requires Visual Studio.
* Look at the [ffi](https://www.npmjs.com/package/ffi) library for more requirements.
* Look at the [node-gyp installation notes](https://github.com/nodejs/node-gyp#installation) for various requirements.
* Also look at the [ref](https://www.npmjs.com/package/ref) library as it too is a native module.
* Look at the windows [nodejs-guidelines](https://github.com/Microsoft/nodejs-guidelines/blob/master/windows-environment.md#compiling-native-addon-modules) page for compiling native addon modules. 
* Make sure that you have node-gyp installed by running the command "node-gyp" if not:
```bash
$ npm install -g node-gyp
```

Installation
------------

Make sure that node-ffi and ref can be installed, it may be wise to create a dummy project and invoke:
``` bash
$ npm install ffi
```
before trying to install LabJack-nodejs.  Once you can do that simply install via npm:
``` bash
$ npm install labjack-nodejs
```

Installation notes for Windows:
-------------------------------
Make sure that [node-gyp is properlly installed](http://stackoverflow.com/questions/21365714/nodejs-error-installing-with-npm).
Performing the standard npm install command will fail on Windows.  It will hopefully complain about not having proper "TargetFrameworkVersion or PlatformToolset variables not being set.  If this is true, set them:
"npm install --msvs_version=2012" or 2013.

This hint came from someone building [couchbase](http://www.bitcrunch.de/install-couchbase-node-js-windows-8-machine/)

For higher/newer versions of node, visual studio 14.0 is required aka msvs_version=2015.

Also, consider using the command "npm config set msvs_version 2015 --global" instead of the non global version [node-gyp install issues](https://github.com/nodejs/node-gyp/issues/802).

## General Information (Async vs sync function calls)
This driver wrapper was created supporting both synchronous and asynchronous function calls to support both functional and object-oriented programing styles. The general format is shown below:
```javascript
//Synchronous syntax:
var result = exampleFunctionSync(arg1);

//Asynchronous syntax (requiring function callbacks):
exampleFunction(
	arg1,
	function(err) {
		console.log('error', err);
	},
	function(result) {
		console.log('success', result);
	}
);
```

### Basic Usage (Hello World, reading an analog input):


```javascript
//Require LabJack-nodejs
var ljn = require('labjack-nodejs');

//Device object (to control a LabJack device)c
var createDeviceObject = ljn.getDevice();

//Device object (to control a LabJack device)
var device = new createDeviceObject();

// Open a device
device.openSync();

// Read an analog input
console.log('AIN0:', device.readSync('AIN0'));

// Close the device
device.closeSync();
```

### Available functions in the labjack-nodejs library:
After creating a labjack-nodejs library reference:
```javascript
var ljn = require('labjack-nodejs');
```
you get access to several attributes, the two most important ones are:
* ljn.device()
* ljn.getDevice()
* ljn.getDeviceRef()
* ljn.driver()
* ljn.getDriver()

Look at the lib/labjack_nodejs.js file for what gets exported.  There are a few subtle differences between the functions in terms of creating new objects.

In general, LJM functions that require the passing of a device handle are implemented in the device object.  Functions that are device-agnostic are implemented in the driver object.

### Available Functions in the device object (device.js):
After creating a device object:
```javascript
var device = new createDeviceObject();
```
several functions are made available:

Device Opening/Closing
* open/openSync
* close/closeSync
* getHandleInfo/getHandleInfoSync

Reading:
* readRaw/readRawSync
* read/readSync
* readArray/readArraySync
* readMany/readManySync

Writing:
* writeRaw/writeRawSync
* write/writeSync
* writeArray/writeArraySync
* writeMany/writeManySync

Both Directions:
* rwMany/rwManySync

Special/Streaming
* readUINT64/readUINT64Sync
* streamSettings
* streamStart/streamStartSync
* streamRead/streamReadSync
* streamStop/streamStopSync

#### open():
Uses LJM_Open and LJM_OpenS
```javascript
device.openSync(); //opens the first found LabJack device, LJM_OpenS('LJM_dtANY', 'LJM_ctANY', 'LJM_idANY')
device.openSync('LJM_dtANY', 'LJM_ctANY', 'LJM_idANY'); //Connect to first-found device
device.openSync('LJM_dtT7', 'LJM_USB', '470010642'); //Connect to T7 w/ serial number 470010642 connected via USB
device.openSync('LJM_dtT7', 'LJM_ETHERNET', '470010642'); //Connect to T7 w/ serial number 470010642 connected via ETHERNET
device.openSync('LJM_dtT7', 'LJM_WIFI', '470010642'); //Connect to T7 w/ serial number 470010642 connected via WIFI
device.openSync(7, 1, 470010642); //Connect to T7 w/ serial number 470010642 connected via USB

//example with callback:
var onSuccess = function(result) {
	//Code
}
var onError = function(error) {
	//Code
}
//Connect to first-found device w/ callbacks
device.open(
	'LJM_dtANY',
	'LJM_ctANY',
	'LJM_idANY',
	onError, 
	onSuccess
);
```


#### getHandleInfo(): 
Uses LJM_GetHandleInfo
```javascript
devInfo = device.getHandleInfoSync(); //return the handle info in a dict:
//devInfo is a dictionary with attributes: deviceType, connectionType, serialNumber, ipAddress, port, maxBytesPerMB
devInfo.deviceType; //The device type (7 for T7s)
devInfo.connectionType; //The connection type, 1(USB), 3(ETHERNET), 4(WIFI)
devInfo.serialNumber; //The serial number of the open device
devInfo.ipAddress; //IP address string for the open device
devInfo.port;
devInfo.maxBytesPerMB;
```


#### readRaw(data array): 
Uses LJM_ReadRaw


#### read(address 'number' or 'string'): 
Uses LJM_eReadAddress, LJM_eReadName, LJM_eReadNameString, and LJM_eReadAddressString.
```javascript
value = device.readSync('AIN0'); //returns the AIN0 channel reading
value = device.readSync(0); //returns the AIN0 channel reading
value = device.readSync('DEVICE_NAME_DEFAULT'); //returns the name of the device

//example with callback:
value = device.read(
	'AIN0',
	function (res) {
		console.log('err:', res);
	},
	function (res) {
		console.log('ain0Reading:', res);
	}
);
```


#### readMany(addresses 'number' or 'string' array): 
Uses LJM_eReadAddresses and LJM_eReadNames
```javascript
value = device.readManySync(['AIN0', 'AIN1']); //returns an array with AIN0 and AIN1 readings
value = device.readManySync([0, 1]); //returns an array with AIN0 and AIN1 readings
```


#### writeRaw(data array): 
Uses LJM_WriteRaw


#### write(address 'number' or 'string', value 'number' or 'string'): 
Uses LJM_eWriteAddress, LJM_eWriteName, LJM_eWriteAddressString, and LJM_eWriteNameString
```javascript
errRes = device.writeSync('DAC0', 1.0); //instructs the T7 to set DAC0 analog output to 1V, returns an error number
errRes = device.writeSync(1000, 1.0); //instructs the T7 to set DAC0 analog output to 1V, returns an error number
value = device.writeSync('DEVICE_NAME_DEFAULT', 'NewDeviceName'); //writes a new device name to the device

//example with callback:
errRes = device.write(
	'DAC0',
	1.0,
	function (res) {
		console.log('err:', res);
	}, 
	function (res) {
		console.log('SUCCESS');
	});
```


#### writeMany(addresses array 'number' or 'string', values array 'number' or 'string')
#### writeMany(dict array {addr, vals}):
Uses LJM_eWriteAddresses LJM_eWriteNames
```javascript
//Two Arrays
//using two separate arrays, one for addresses to write to and one of values
errRes = device.writeManySync(['DAC0', 'DAC1'], [1.0, 2.0]);
errRes = device.writeManySync([1000, 1002], [1.0, 2.0]);
```


#### close(): 
Uses LJM_Close
```javascript
errRes = device.closeSync();

//example with callback:
device.close(
	function(res){
		console.log('Err:', res);
	},
	function(res){
		console.log('closed!');
	});
```

### All Relevant 'libLabJackM' Functions:
- [x] LJM_Open
- [x] LJM_OpenS
- [x] LJM_GetHandleInfo
- [x] LJM_ResetConnection
- [x] LJM_Close
- [x] LJM_WriteRaw (NOT TESTED)
- [x] LJM_ReadRaw (NOT TESTED)
- [x] LJM_eWriteAddress
- [x] LJM_eReadAddress
- [x] LJM_eWriteName
- [x] LJM_eReadName
- [x] LJM_eReadAddresses
- [x] LJM_eReadNames
- [x] LJM_eWriteAddresses
- [x] LJM_eWriteNames
- [x] LJM_eAddresses
- [x] LJM_eNames
- [x] LJM_eStreamStart
- [x] LJM_eStreamRead
- [x] LJM_eStreamStop
- [x] LJM_eReadString
- [x] LJM_eWriteString


## LJM_Driver (driver.js)
JavaScript wrapper for the rest of the LJM_Driver functions.

```javascript
//Require LabJack-nodejs
var ljn = require('labjack-nodejs');

//Driver Object (to gain access to more general driver-related features)
var driver = ljn.driver();
```


### Available Functions & what they use:
* listAll/listAllSync
* listAllExtended/listAllExtendedSync
* errToStr/errToStrSync
* loadConstants/loadConstantsSync
* closeAll/closeAllSync
* readLibrary/readLibrarySync
* readLibraryS/readLibrarySSync
* writeLibrary/writeLibrarySync
* log/logSync
* logS/logSSync
* resetLog/resetLogSync
* controlLog/controlLogSync
* enableLog/enableLogSync
* disableLog/disableLogSync


#### listAll(deviceType 'number' or 'string', connectionType 'number' or 'string'):
Uses LJM_ListAll and LJM_ListAllS

```javascript
foundDevices = ljmDriver.listAllSync(); //find all T7s
foundDevices = ljmDriver.listAllSync('LJM_dtANY', 'LJM_ctANY'); //find all T7s
foundDevices = ljmDriver.listAllSync('LJM_dtT7', 'LJM_ctUSB'); //find all T7s connected via USB
foundDevices = ljmDriver.listAllSync(7, 1); //find all T7s connected via USB


//using callback functions
ljmDriver.listAll(
	function (err) {
		console.log('Error', err);
	}, 
	function (foundDevices) {
		console.log('Devices Found:');
		console.log(foundDevices);
	}
);

//Both methods return an array of dicts, ex:
//foundDevices.length is the number of devices found
//foundDevices[0].deviceType is a number
//foundDevices[0].connectionType is a number
//foundDevices[0].serialNumber is a number
//foundDevices[0].ipAddress is a string
```


#### errToStr(errorNumber): 
Uses LJM_ErrorToString, converts an error number to a human-readable string-error. The errors can be found in the ljm_constants.json file.
```javascript
console.log(ljmDriver.errToStrSync(0)); //returns the string 'Num 0, LJ_SUCCESS'
console.log(ljmDriver.errToStrSync(200)); //returns the string 'Num 200, LJME_WARNINGS_BEGIN'
console.log(ljmDriver.errToStrSync(1268)); //returns the string 'Num 1268, LJME_INVALID_INDEX'
```


#### loadConstants():
Uses LJM_LoadConstants


#### closeAll():
Uses LJM_CloseAll


#### readLibrary('string' parameter):
Uses LJM_ReadLibraryConfigS, helpful for using LJM's logging features


#### readLibraryS('string' parameter):
Uses LJM_ReadLibraryConfigStringS, helpful for using LJM's logging features


#### writeLibrary('string' parameter, value either 'number' or 'string'):
Uses LJM_WriteLibraryConfigS and LJM_WriteLibraryConfigStringS, helpful for using LJM's logging features


#### logS('number' logLevel, 'string' message to log):
Uses LJM_Log


#### resetLog():
Uses LJM_ResetLog



### All Relevant 'libLabJackM' Functions:
- [ ] LJM_AddressesToMBFB
- [ ] LJM_MBFBComm
- [ ] LJM_UpdateValues
- [ ] LJM_NamesToAddresses
- [ ] LJM_AddressesToTypes
- [ ] LJM_AddressToType
- [x] LJM_ListAll
- [x] LJM_ListAllS
- [x] LJM_ErrorToString
- [x] LJM_LoadConstants
- [x] LJM_CloseAll
- [x] LJM_WriteLibraryConfigS
- [x] LJM_WriteLibraryConfigStringS
- [x] LJM_ReadLibraryConfigS
- [x] LJM_ReadLibraryConfigStringS
- [x] LJM_Log
- [x] LJM_ResetLog
