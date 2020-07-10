
/*
 * This test makes sure that a simple LJM function call can be performed with
 * each exposed method.  Synchronous and Asynchronous versions of all three
 * types.
 * Type 1: Automatically handles converting/parsing of data into and out of
 * 		buffer data structures.
 * Type 2: Adds a try-catch around the function call that makes the 
 * 		Linux/Mac/Windows ffi implementations more similar.
 * Type 3: The raw FFI function calls.
 */


// Define functions to assist with handling various C data types.
var type_helpers = require('../../lib/type_helpers');
var ljTypeMap = type_helpers.ljTypeMap;
var ljTypeOps = type_helpers.ljTypeOps;
var convertToFFIType = type_helpers.convertToFFIType;

var driver_const = require('@labjack/ljswitchboard-ljm_driver_constants');
var ARCH_CHAR_NUM_BYTES = 1;
var ARCH_INT_NUM_BYTES = driver_const.ARCH_INT_NUM_BYTES;
var ARCH_DOUBLE_NUM_BYTES = driver_const.ARCH_DOUBLE_NUM_BYTES;
var ARCH_POINTER_SIZE = driver_const.ARCH_POINTER_SIZE;

var ENABLE_DEBUG = false;
function debug() {
	if(ENABLE_DEBUG) {
		console.log.apply(console, arguments);
	}
}
var ENABLE_LOG = true;
function log() {
	if(ENABLE_LOG) {
		console.log.apply(console, arguments);
	}
}


/* Define how the tests will be run. */
var ljm;
var liblabjack;
var ffi_liblabjack;

/* Define a variable to hold the opened handle. */
var device;

/* Define Test Cases */
var test_cases = {
	'include ljm': function(test) {
		var ljm_ffi = require('../../lib/ljm-ffi');

		ljm = ljm_ffi.load();
		liblabjack = ljm_ffi.loadSafe();
		ffi_liblabjack = ljm_ffi.loadRaw();

		test.done();
	},
	'Execute Opening (Sync)': function(test) {


		// Execute LJM Function
		var dt = 'LJM_dtT7';
		var ct = 'LJM_ctUSB';
		// var id = '192.168.1.118';
		var id = 'LJM_idANY';

		var i = 0;
		for(i = 0; i < 2; i++) {
			console.log('Opening USB Device, iteration:', i);
			var openInfo = ljm.LJM_OpenS(dt, ct, id, 0);
			console.log('Open Info', openInfo);
			
			var closeInfo = ljm.LJM_Close(openInfo.handle);
			console.log('Close Info', closeInfo);
		}
		
		test.ok(true);
		test.done();
	},
	// 'Execute Opening (Async)': function(test) {


	// 	// Execute LJM Function
	// 	var dt = 'LJM_dtT7';
	// 	var ct = 'LJM_ctUSB';
	// 	var id = 'LJM_idANY';
	// 	var dHandle;

	// 	function handleOpen(openInfo) {
	// 		console.log('Opened', openInfo);
	// 		ljm.LJM_Close.async(openInfo.handle, handleClose);
	// 	}
	// 	function handleClose(closeInfo) {
	// 		console.log('Closed', closeInfo);
	// 		runTest();
	// 	}

	// 	var numIterations = 2;
	// 	var currentIteration = 0;
	// 	function runTest() {
	// 		if(currentIteration < numIterations) {
	// 			currentIteration += 1;
	// 			ljm.LJM_OpenS.async(dt, ct, id, 0, handleOpen);
	// 		} else {
	// 			test.done();
	// 		}
	// 	}
		
	// 	runTest();
	// },
};


exports.tests = test_cases;