# ljm-ffi
The ljm-ffi node module provides bindings to the LabJack LJM library via ffi.  This library provides three different ways to access the library and makes both synchronous and asynchronous methods available for each.

## Type 1:
The first way to interact with the LJM function calls automatically handles the converting data to and from the appropriate buffer-based data types required to perform native function calls with the ffi library.  The best way to show this is through example, (Calling the LJM_NameToAddress function).  For quick details about what arguments are required by this function look at the ./lib/ljm_functions.js file.  

code
// Include and load the ljm-ffi library:
var ljm_ffi = require('ljm-ffi');
var ljm = ljm_ffi.load();

// Call the LJM_NameToAddress function:
var data = ljm.LJM_NameToAddress('AIN0', 0, 0);
console.log(data);

// The resulting output will be:
// { ljmError: 0, Name: 'AIN0', Address: 0, Type: 3 }

