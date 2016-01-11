# ljm-ffi
The ljm-ffi node module provides bindings to LabJack's [LJM library](http://labjack.com/ljm) via the [ffi](https://github.com/node-ffi/node-ffi) library.  This library provides three different ways to access the library and makes both synchronous and asynchronous methods available for each.

Unlike the [LabJack-nodejs]() library, this library exposes the LJM library calls without modifying any of their functionality. Eventually the LabJack-nodejs library will use this library as its .dll/.dynlib file interface.

As per LabJack's LJM library, this wrapper only supports the [T7](http://labjack.com/products/t7), [T7-Pro](http://labjack.com/products/t7), [Digit-TL](http://labjack.com/products/digit), and [Digit-TLH](http://labjack.com/products/digit) LabJack devices. (Which are low cost, high-quality, multifunction USB / Ethernet / 802.11b/g Wifi DAQ devices.)  Devices using the UD library (Windows only) aka U3, U6, and UE9 are not supported.  Additionally, the U12 is not supported.

This library can be downloaded for free on LabJack's website on the [LJM Library Installers](https://labjack.com/support/software/installers/ljm) page.

## Examples:
The most straight forward example that demonstraits that this library is communicating with the LJM library properly is to request the version of LJM installed on the system.  This can be done with the following code (Synchronously):
```javascript
// Load the LJM Library.
var ljm_ffi = require('ljm-ffi');
var ljm = ljm_ffi.load();

// Call the LJM_ReadLibraryConfigS function:
var ljmLibraryVersion = ljm.LJM_ReadLibraryConfigS('LJM_LIBRARY_VERSION', 0);

// Display the installed version of LJM:
console.log('LJM Version:', ljmLibraryVersion.Value);
```

This can be done with the following code (Asynchronously):
```javascript
// Load the LJM Library.
var ljm_ffi = require('ljm-ffi');
var ljm = ljm_ffi.load();

// Execute LJM Function
ljm.LJM_ReadLibraryConfigS.async('LJM_LIBRARY_VERSION', 0, function(ljmLibraryVersion) {
	// Display the installed version of LJM:
	console.log('LJM Version:', ljmLibraryVersion.Value);
});
```
This is also illustrated in the ./test/get_ljm_version.js file.

## Methods of interacting with the LabJack LJM Library.
The LJM library can be interacted with in three different ways.  They are exposed by the following code:
```javascript
// Include and load the ljm-ffi library:
var ljm_ffi = require('ljm-ffi');

// Type 1
var ljm = ljm_ffi.load();

// Type 2
var liblabjackm = ljm_ffi.loadSafe();

// Type 3
var ffi_liblabjackm = ljm_ffi.loadRaw();
```

### Type 1:
The first way to interact with the LJM driver automatically handles the converting data to and from the appropriate buffer-based data types required to perform native function calls with the ffi library.  The best way to show this is through example, (Calling the LJM_NameToAddress function).  For quick details about what arguments are required by this function look at the ./lib/ljm_functions.js file.  Look at the ./test/basic_ljm_calls.js file in the "Execute LJM_NameToAddress (Sync)" and "Execute LJM_NameToAddress (Async)" tests for more details.

```javascript
// Include and load the ljm-ffi library:
var ljm_ffi = require('ljm-ffi');
var ljm = ljm_ffi.load();

// Call the LJM_NameToAddress function:
var data = ljm.LJM_NameToAddress('AIN0', 0, 0);
console.log(data);

// The resulting output will be:
// { ljmError: 0, Name: 'AIN0', Address: 0, Type: 3 }
```

### Type 2:
As of ffi version 2.0.0 there is a bug in the FFI library where functions that don't exist in the driver behave differently on windows vs mac/linux computers.  This layer makes sure that all of the defined LJM functions exist and will throw the same error across each platform.  The inputs and outputs to these functions are exactly the same as the raw FFI functions.  Look at the ./test/basic_ljm_calls.js file in the "Execute LJM_NameToAddress (Sync) - Safe" and "Execute LJM_NameToAddress (Async) - Safe" tests for more details.  Look at the ./lib/type_helpers.js file to determine how to use the ref and buffer libraries to encode and decode the variety of data types required by LJM.  The basic outline for code using this interface is as follows (Note: This code will not work, look at the mentioned tests):
```javascript
// Include and load the ljm-ffi library:
var ljm_ffi = require('ljm-ffi');
var liblabjackm = ljm_ffi.loadSafe();

// Function arguments
var registerName = 'AIN0';

// Code to create node.js buffer objects.
var pAddress = new Buffer(4);
var pType = new Buffer(4);

// Call the LJM Function:
var data = liblabjackm.LJM_NameToAddress(registerName, pAddress, pType);

// Code to parse the arguments.  Some (but not all) pointers and arrays will have been modified
// and need to be parsed back into javascript-land.
var address = pAddress.readInt32LE(0);
var type = pType.readInt32LE(0);
```


### Type 3:
These are the raw ffi functions.  If the FFI library threw an error when binding to the function it will not exist.  Look at the ./test/basic_ljm_calls.js file in the "Execute LJM_NameToAddress (Sync) - Raw" and "Execute LJM_NameToAddress (Async) - Raw" tests for more details.  Look at the ./lib/type_helpers.js file to determine how to use the ref and buffer libraries to encode and decode the variety of data types required by LJM.  The basic outline for code using this interface is as follows (Note: This code will not work, look at the mentioned tests):
```javascript
// Include and load the ljm-ffi library:
var ljm_ffi = require('ljm-ffi');
var ffi_liblabjackm = ljm_ffi.loadRaw();

// Function arguments
var registerName = 'AIN0';

// Code to create node.js buffer objects.
var pAddress = new Buffer(4);
var pType = new Buffer(4);

// Call the LJM Function:
var data = ffi_liblabjackm.LJM_NameToAddress(registerName, pAddress, pType);

// Code to parse the arguments.  Some (but not all) pointers and arrays will have been modified
// and need to be parsed back into javascript-land.
var address = pAddress.readInt32LE(0);
var type = pType.readInt32LE(0);
```

## More Examples:
Look in the ./examples and ./test folders for more examples.



