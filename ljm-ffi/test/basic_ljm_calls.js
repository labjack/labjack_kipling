
var extend = require('extend');
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



var function_tests = {};
function_tests.LJM_NameToAddress = {
	'test_args': [
		{'Name': 'AIN0'},
		{'Address': 0},
		{'Type': 0},
	],
	'throws_err': false,
	'expected_results': {
		'ljmError': 0,
		'Name': 'AIN0',
		'Address': 0,
		'Type': 3,
	}
};

// Import test calls for device scanning.
var device_scanning_ljm_calls = require('./basic_ljm_calls/device_scanning');
extend(false, function_tests, device_scanning_ljm_calls);



var ljm;
var liblabjack;
var ffi_liblabjack;
var enabled_tests = {
	'sync': {
		'ljm': true,
		'liblabjack': false,
		'ffi_liblabjack': false,
	}
};

/* Define Test Cases */
test_cases = {
	'include ljm': function(test) {
		var ljm_ffi = require('../lib/ljm-ffi');

		ljm = ljm_ffi.load();
		liblabjack = ljm_ffi.loadSafe();
		ffi_liblabjack = ljm_ffi.loadRaw();

		test.done();
	},
	
};

function create_ljm_sync_test(functionName, testInfo) {
	return function test_ljm_sync_call(test) {
		var args = [];
		var argNames = [];

		testInfo.test_args.forEach(function(test_arg) {
			var keys = Object.keys(test_arg);
			var argName = keys[0];
			var argVal = test_arg[argName];
			args.push(argVal);
			argNames.push(argName);
		});

		var results;
		console.log('Calling Function', functionName);

		var has_function = false;
		if(typeof(ljm[functionName]) === 'function') {
			has_function = true;
			results = ljm[functionName].apply(this, args);
			if(testInfo.expected_results) {
				test.deepEqual(
					testInfo.expected_results,
					results,
					'Results are not correct for: ' + functionName  + '-ljm-sync'
				);
			}
			if(testInfo.custom_verify) {
				testInfo.custom_verify(test, results);
			}
		} else {
			console.log('Does not have function', functionName);
			console.log('Available Functions', Object.keys(functionName));
		}
		// ljm_err = ljm[functionName].apply(this, args);
		// console.log('Err', ljm_err);
		test.done();
	};
}
function create_liblabjack_sync_test(functionName, testInfo) {
	return function test_liblabjack_sync_call(test) {

	};
}
function create_ffi_liblabjack_sync_test(functionName, testInfo) {
	return function test_ffi_liblabjack_sync_call(test) {

	};
}

/* Programatically add more test cases */
function addTests() {
	var functionNames = Object.keys(function_tests);

	functionNames.forEach(function(functionName) {
		var testName;
		var testInfo = function_tests[functionName];
		if(enabled_tests.sync.ljm) {
			// Add the ljm call
			testName = functionName + '-ljm-sync';
			test_cases[testName] = create_ljm_sync_test(
				functionName,
				testInfo
			);
		}
		if(enabled_tests.sync.liblabjack) {
			// Add the liblabjack call
			testName = functionName + '-liblabjack-sync';
			test_cases[testName] = create_liblabjack_sync_test(
				functionName,
				testInfo
			);
		}
		if(enabled_tests.sync.ffi_liblabjack) {
			// Add the ffi_liblabjack call
			testName = functionName + '-ffi_liblabjack-sync';
			test_cases[testName] = create_ffi_liblabjack_sync_test(
				functionName,
				testInfo
			);
		}

	});
	
}

addTests();

exports.tests = test_cases;