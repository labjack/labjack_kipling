
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
var type_helpers = require('../lib/type_helpers');
var ljTypeMap = type_helpers.ljTypeMap;
var ljTypeOps = type_helpers.ljTypeOps;
var convertToFFIType = type_helpers.convertToFFIType;

var driver_const = require('ljswitchboard-ljm_driver_constants');
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


/* Define Test Cases */
var test_cases = {
	'include ljm': function(test) {
		var ljm_ffi = require('../lib/ljm-ffi');

		ljm = ljm_ffi.load();
		liblabjack = ljm_ffi.loadSafe();
		ffi_liblabjack = ljm_ffi.loadRaw();

		test.done();
	},
	'Execute LJM_NameToAddress (Sync)': function(test) {
		var addressInfo = ljm.LJM_NameToAddress('AIN0', 0, 0);
		var expectedData = {
			'ljmError': 0,
			'Name': 'AIN0',
			'Address': 0,
			'Type': 3,
		};
		test.deepEqual(addressInfo, expectedData);
		test.done();
	},
	'Execute LJM_NameToAddress (Async)': function(test) {
		function testData(addressInfo) {
			var expectedData = {
				'ljmError': 0,
				'Name': 'AIN0',
				'Address': 0,
				'Type': 3,
			};
			test.deepEqual(addressInfo, expectedData);
			test.done();
		}

		// Execute LJM Function
		ljm.LJM_NameToAddress.async('AIN0', 0, 0, testData);
	},

	'Execute LJM_NameToAddress (Sync) - Safe': function(test) {
		// Allocate and fill buffers required to execute LJM calls with ffi.
		var addrName = 'AIN0';
		var Name = ljTypeOps.string.allocate(addrName);
		Name = ljTypeOps.string.fill(Name, addrName);

		var Address = ljTypeOps['int*'].allocate(0);
		Address = ljTypeOps['int*'].fill(Address, 0);

		var Type = ljTypeOps['int*'].allocate(0);
		Type = ljTypeOps['int*'].fill(Type, 0);

		// Execute LJM Function
		var ljmError = liblabjack.LJM_NameToAddress(Name, Address, Type);

		// Parse returned data
		var addressInfo = {
			'ljmError': ljmError,
			'Name': ljTypeOps.string.parse(Name),
			'Address': ljTypeOps['int*'].parse(Address),
			'Type': ljTypeOps['int*'].parse(Type),
		};
		var expectedData = {
			'ljmError': 0,
			'Name': 'AIN0',
			'Address': 0,
			'Type': 3,
		};

		// Check Results
		test.deepEqual(addressInfo, expectedData);
		test.done();
	},
	'Execute LJM_NameToAddress (Async) - Safe': function(test) {
		function testData(err, ljmError) {
			// Parse returned data
			var addressInfo = {
				'ljmError': ljmError,
				'Name': ljTypeOps.string.parse(Name),
				'Address': ljTypeOps['int*'].parse(Address),
				'Type': ljTypeOps['int*'].parse(Type),
			};
			var expectedData = {
				'ljmError': 0,
				'Name': 'AIN0',
				'Address': 0,
				'Type': 3,
			};

			// Check Results
			test.deepEqual(addressInfo, expectedData);
			test.done();
		}

		// Allocate and fill buffers required to execute LJM calls with ffi.
		var addrName = 'AIN0';
		var Name = ljTypeOps.string.allocate(addrName);
		Name = ljTypeOps.string.fill(Name, addrName);

		var Address = ljTypeOps['int*'].allocate(0);
		Address = ljTypeOps['int*'].fill(Address, 0);

		var Type = ljTypeOps['int*'].allocate(0);
		Type = ljTypeOps['int*'].fill(Type, 0);

		// Execute LJM Function
		liblabjack.LJM_NameToAddress.async(Name, Address, Type, testData);
	},

	'Execute LJM_NameToAddress (Sync) - Raw': function(test) {
		// Allocate and fill buffers required to execute LJM calls with ffi.
		var addrName = 'AIN0';
		var Name = ljTypeOps.string.allocate(addrName);
		Name = ljTypeOps.string.fill(Name, addrName);

		var Address = ljTypeOps['int*'].allocate(0);
		Address = ljTypeOps['int*'].fill(Address, 0);

		var Type = ljTypeOps['int*'].allocate(0);
		Type = ljTypeOps['int*'].fill(Type, 0);

		// Execute LJM Function
		var ljmError = ffi_liblabjack.LJM_NameToAddress(Name, Address, Type);

		// Parse returned data
		var addressInfo = {
			'ljmError': ljmError,
			'Name': ljTypeOps.string.parse(Name),
			'Address': ljTypeOps['int*'].parse(Address),
			'Type': ljTypeOps['int*'].parse(Type),
		};
		var expectedData = {
			'ljmError': 0,
			'Name': 'AIN0',
			'Address': 0,
			'Type': 3,
		};

		// Check Results
		test.deepEqual(addressInfo, expectedData);
		test.done();
	},
	'Execute LJM_NameToAddress (Async) - Raw': function(test) {
		function testData(err, ljmError) {
			// Parse returned data
			var addressInfo = {
				'ljmError': ljmError,
				'Name': ljTypeOps.string.parse(Name),
				'Address': ljTypeOps['int*'].parse(Address),
				'Type': ljTypeOps['int*'].parse(Type),
			};
			var expectedData = {
				'ljmError': 0,
				'Name': 'AIN0',
				'Address': 0,
				'Type': 3,
			};

			// Check Results
			test.deepEqual(addressInfo, expectedData);
			test.done();
		}

		// Allocate and fill buffers required to execute LJM calls with ffi.
		var addrName = 'AIN0';
		var Name = ljTypeOps.string.allocate(addrName);
		Name = ljTypeOps.string.fill(Name, addrName);

		var Address = ljTypeOps['int*'].allocate(0);
		Address = ljTypeOps['int*'].fill(Address, 0);

		var Type = ljTypeOps['int*'].allocate(0);
		Type = ljTypeOps['int*'].fill(Type, 0);

		// Execute LJM Function
		ffi_liblabjack.LJM_NameToAddress.async(Name, Address, Type, testData);
	},
};


exports.tests = test_cases;