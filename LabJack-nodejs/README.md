LabJack-nodejs
==============
UPDATED FOR VERSION 0.243

nodejs library for using LJM driver.  Created two different objects that can be imported.  Was created to function much like our labjack python driver for our UD devices.

### Device (labjack.js)
Manages the handle for you & aims to simplify the interface with the LJM driver.

All functions support callback functions as the last two arguments ex:

```javascript
exampleFunction(arg1, arg2, onError, onSuccess);
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
device.exampleFunction(onError(res){console.log('error',res);}, onSuccess(res){console.log('success',res);}); //using callbacks

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
#### open(): LJM_Open and LJM_OpenS
```javascript
device.open(); //opens the first found labjack device, LJM_OpenS("LJM_dtANY","LJM_ctANY","LJM_idANY")
device.open("LJM_dtANY", "LJM_ctANY", "LJM_idANY");
device.open("LJM_dtT7", "LJM_USB", "<serialNumber");
device.open(7,3,<serialNumber>);

//example with callback:
device.open("LJM_dtANY", "LJM_ctANY", "LJM_idANY", onSuccess, onError);
```


#### getHandleInfo(): LJM_GetHandleInfo
#### readRaw(data array): LJM_ReadRaw
#### read(address 'number' or 'string'): LJM_eReadAddress and LJM_eReadName
#### readS(address 'string'): LJM_eReadString
#### readMany(addresses 'number' or 'string' array): LJM_eReadAddresses and LJM_eReadNames
#### writeRaw(data array): LJM_WriteRaw
#### write(address 'number' or 'string', value 'number' or 'string'): LJM_eWriteAddress, LJM_eWriteName
#### writeS(address 'string, string 'string'): LJM_eWriteString
#### writeMany(addresses array 'number' or 'string', values array 'number' or 'string') or writeMany(dict array {addr,vals}): LJM_eWriteAddresses LJM_eWriteNames
#### resetConnection(): LJM_ResetConnection
#### close(): LJM_Close

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
