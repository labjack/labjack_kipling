LabJack-nodejs
==============
UPDATED FOR VERSION 0.243

nodejs library for using LJM driver.  Created two different objects that can be imported.  Was created to function much like our labjack python driver for our UD devices. For more information about what each function does please look at the libLabJackM.h file that can be downloaded & installed: 
[http://labjack.com/support/software](http://labjack.com/support/software)

### Device (labjack.js)
Manages the handle for you & aims to simplify the interface with the LJM driver.

There are two ways to call the functions made available by this wrapper supporting both functional programing and object oriented programing.
All functions support standard object oriented calls.  Either an error code or an appropriate result is returned.  Some errors are thrown in cases when the device may become in-operable based on a bad function call.
```javascript
//Example with no input arguments:
result = exampleFunction();

//Example with one input argument:
result = exampleFunction(arg1);

//example with two input arguments:
result = exampleFunction(arg1, arg2);

```
All functions support callback functions as the last two arguments, not all examples below show this ex:

```javascript
//Example with no input arguments:
exampleFunction(function (res) {console.log('error',res);}, function (res) {console.log('success',res);});

//Example with one input argument:
exampleFunction(arg1, function (res) {console.log('error',res);}, function (res) {console.log('success',res);});

//example with two input arguments:
exampleFunction(arg1, arg2, function (res) {console.log('error',res);}, function (res) {console.log('success',res);});

```

### How To Use:
Before writing any code you must create a device object:

```javascript
var deviceManager = require('./labjack');
var device = new deviceManager.labjack();
```


Now you can use any of the implemented functions by:

```javascript
device.exampleFunction(); //not using callbacks
device.exampleFunction(function (res) {console.log('error',res);}, function (res) {console.log('success',res);}); //using callbacks

//you can also use other callback handlers
onError = function(res)
{
	console.log('error',res);
};
onSuccess = function(res)
{
	console.log('success',res);
};
device.exampleFunction(arg1, arg2, onError, onSuccess);
```

### Available Functions & what they use:
#### open(): 
Uses LJM_Open and LJM_OpenS
```javascript
device.open(); //opens the first found labjack device, LJM_OpenS("LJM_dtANY","LJM_ctANY","LJM_idANY")
device.open("LJM_dtANY", "LJM_ctANY", "LJM_idANY");//Connect to first-found device
device.open("LJM_dtT7", "LJM_USB", "470010642");//Connect to T7 w/ serial number 470010642 connected via USB
device.open("LJM_dtT7", "LJM_ETHERNET", "470010642");//Connect to T7 w/ serial number 470010642 connected via ETHERNET
device.open("LJM_dtT7", "LJM_WIFI", "470010642");//Connect to T7 w/ serial number 470010642 connected via WIFI
device.open(7,1,470010642);//Connect to T7 w/ serial number 470010642 connected via USB

//example with callback:
device.open("LJM_dtANY", "LJM_ctANY", "LJM_idANY", onSuccess, onError);//Connect to first-found device w/ callback
```


#### getHandleInfo(): 
Uses LJM_GetHandleInfo
```javascript
devInfo = device.getHandleInfo();//return the handle info in a dict:
//devInfo is a dictionary with attributes: deviceType, connectionType, serialNumber, ipAddress, port, maxBytesPerMB
devInfo.deviceType;//The device type (7 for T7's)
devInfo.connectionType;//The connection type, 1(USB), 3(ETHERNET), 4(WIFI)
devInfo.serialNumber;//The serial number of the open device
devInfo.ipAddress;//IP address string for the open device
devInfo.port;
devInfo.maxBytesPerMB;
```
#### readRaw(data array): 
Uses  LJM_ReadRaw
#### read(address 'number' or 'string'): 
Uses  LJM_eReadAddress and LJM_eReadName
```javascript
value = device.read("AIN0");//returns the AIN0 channel reading
value = device.read(0);//returns the AIN0 channel reading

//eample with callback:
value = device.read("AIN0",function (res) {console.log('err:',res);}, function (res) {console.log('ain0Reading:',res);});
```
#### readS(address 'string'): 
Uses  LJM_eReadString
```javascript
value = device.readS("WIFI_SSID_DEFAULT");//returns the configured wifi ssid

//eample with callback:
value = device.readS("WIFI_SSID_DEFAULT",function (res) {console.log('err:',res);}, function (res) {console.log('wifi ssid:',res);});
```

#### readMany(addresses 'number' or 'string' array): 
Uses  LJM_eReadAddresses and LJM_eReadNames
```javascript
value = device.readMany(["AIN0","AIN1"]);//returns an array with AIN0 and AIN1 readings
value = device.readMany([0,1]);//returns an array with AIN0 and AIN1 readings
```

#### writeRaw(data array): 
Uses  LJM_WriteRaw
#### write(address 'number' or 'string', value 'number' or 'string'): 
Uses  LJM_eWriteAddress, LJM_eWriteName
```javascript
errRes = device.write("DAC0",1.0);//instructs the T7 to set DAC0 analog output to 1V, returns an error number
errRes = device.write(1000,1.0);//instructs the T7 to set DAC0 analog output to 1V, returns an error number

//eample with callback:
errRes = device.write("DAC0",1.0,function (res) {console.log('err:',res);}, function (res) {console.log('SUCCESS');});
```

#### writeS(address 'string, string 'string'): 
Uses  LJM_eWriteString
```javascript
errRes = device.write("WIFI_SSID_DEFAULT","MYNETWORK");//sets the network SSID to 'MYNETWORK', returns an error number
```
#### writeMany(addresses array 'number' or 'string', values array 'number' or 'string') or writeMany(dict array {addr,vals}): 
Uses  LJM_eWriteAddresses LJM_eWriteNames
```javascript
//Can be done two ways:

//Two Arrays
//using two separate array's, one for addresses to write to and one of values
errRes = device.writeMany(["DAC0","DAC1"],[1.0,2.0]);
errRes = device.writeMany([1000,1002],[1.0,2.0]);

//Array of Dict's
errRes = device.writeMany([{addr:"DAC0",val:1.0},{addr:"DAC1",val:2.0}]);
errRes = device.writeMany([{addr:1000,val:1.0},{addr:1002,val:2.0}]);
```
#### resetConnection(): 
Uses  LJM_ResetConnection
#### close(): 
Uses  LJM_Close
```javascript
errRes = device.close();

//eample with callback:
device.close(function(res){console.log('Err:',res);},function(res){console.log('closed!');});
```

All Relevant "libLabJackM" Functions:
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
- [ ] LJM_eAddresses
- [ ] LJM_eNames
- [ ] LJM_eStreamStart
- [ ] LJM_eStreamRead
- [ ] LJM_eStreamStop
- [x] LJM_eReadString
- [x] LJM_eWriteString


### LJM_Driver (ljmDriver.js)
JavaScript Wrapper for the rest of the LJM_Driver functions.

### How To Use:
Before writing any code you must create a device object:

```javascript
var ljm = require('./labjack');
var ljmDriver = new ljm.labjack();
```

### Available Functions & what they use:
#### listAll(deviceType 'number' or 'string', connectionType 'number' or 'string'):
Uses LJM_ListAll and LJM_ListAllS

```javascript
foundDevices = ljmDriver.listAll();//find all T7's
foundDevices = ljmDriver.listAll("LJM_dtANY","LJM_ctANY");//find all T7's
foundDevices = ljmDriver.listAll("LJM_dtT7","LJM_ctUSB");//find all T7's connected via USB
foundDevices = ljmDriver.listAll(7,1);//find all T7's connected via USB


//using callback functions
ljmDriver.listAll(
	function (res) {console.log('err',res);}, 
	function (foundDevices) {console.log('Devices Found:');console.log(foundDevices);}
	);

//Both methods return an array of dict's, ex:
//foundDevices.length, number of devices found
//foundDevices[0].deviceType (number)
//foundDevices[0].connectionType (number)
//foundDevices[0].serialNumber (number)
//foundDevices[0].ipAddress (string)
```

#### errToStr(errorNumber): 
Uses  LJM_ErrorToString, converts an error number to a human readable string-error.  The errors can be found in the ljm_constants.json file.
```javascript
console.log(ljmDriver.errToStr(0));//returns the string "Num 0, LJ_SUCCESS"
console.log(ljmDriver.errToStr(200));//returns the string "Num 200, LJME_WARNINGS_BEGIN"
console.log(ljmDriver.errToStr(1268));//returns the string "Num 1268, LJME_INVALID_INDEX"
```

#### loadConstants(): 
Uses  LJM_LoadConstants
#### closeAll(): 
Uses  LJM_CloseAll
#### readLibrary('string' parameter): 
Uses  LJM_ReadLibraryConfigS, helpful for using LJM's logging features
#### writeLibrary('string' parameter, value either 'number' or 'string'): 
Uses  LJM_WriteLibraryConfigS and LJM_WriteLibraryConfigStringS, helpful for using LJM's logging features
#### logS('number' logLevel, 'string' message to log): 
Uses  LJM_Log
#### resetLog(): 
Uses  LJM_ResetLog

All Relevant "libLabJackM" Functions:
- [ ] LJM_AddressesToMBFB
- [ ] LJM_MBFBComm
- [ ] LJM_UpdateValues
- [ ] LJM_NamesToAddresses
- [ ] LJM_AddressesToTypes
- [ ] LJM_AddressToType
- [x] LJM_ListAll
- [x] LJM_ListAllS
- [x] LJM_ErrorToString
- [x] LJM_LoadConstants (NOT TESTED)
- [x] LJM_CloseAll (NOT TESTED)
- [x] LJM_WriteLibraryConfigS
- [ ] LJM_WriteLibraryConfigStringS
- [x] LJM_ReadLibraryConfigS
- [ ] LJM_ReadLibraryConfigStringS
- [x] LJM_Log
- [x] LJM_ResetLog (NOT TESTED)
