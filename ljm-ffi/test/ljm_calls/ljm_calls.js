var assert = require('chai').assert;

var extend = require('extend');
// Define functions to assist with handling various C data types.
var type_helpers = require('../../lib/type_helpers');
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
var ljmVersion;
var enabled_tests = {
	'sync': {
		'ljm': true,
		'liblabjack': false,
		'ffi_liblabjack': false,
	},
	'async': {
		'ljm': false,
		'liblabjack': false,
		'ffi_liblabjack': false,
	}
};

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
var device_scanning_ljm_calls = require('./device_scanning');
extend(false, function_tests, device_scanning_ljm_calls);

// Import test calls for open-all testing.
var open_all_testing = require('./open_all_testing');
extend(false, function_tests, open_all_testing);


function create_ljm_sync_test(functionName, testInfo, nameAppend) {
	return function test_ljm_sync_call(done) {
		var minVersion = 0;
		if(testInfo.min_ljm_version) {
			minVersion = testInfo.min_ljm_version;
		}
		if(minVersion > ljmVersion) {
			console.log(
				' ! Skipping Test:',
				functionName + nameAppend,
				'Requires LJM Version:',
				minVersion
			);
			done();
			return;
		}

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
		log(' - Calling Sync Function', functionName);

		var has_function = false;
		if(typeof(ljm[functionName]) === 'function') {
			has_function = true;
			results = ljm[functionName].apply(this, args);
			log(' - Finished Calling Sync Function', functionName);
			if(testInfo.expected_results) {
				assert.deepEqual(
					testInfo.expected_results,
					results,
					'Results are not correct for: ' + functionName  + nameAppend
				);
			}
			if(testInfo.custom_verify) {
				testInfo.custom_verify(test, results, function() {
					done();
				});
			} else {
				done();
			}
		} else {
			console.error('Does not have function', functionName);
			console.error('Available Functions', Object.keys(functionName));
			done();
		}
		// ljm_err = ljm[functionName].apply(this, args);
		// console.log('Err', ljm_err);
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

function create_ljm_async_test(functionName, testInfo, nameAppend) {
	return function test_ljm_async_call(test) {

		var minVersion = 0;
		if(testInfo.min_ljm_version) {
			minVersion = testInfo.min_ljm_version;
		}
		if(minVersion > ljmVersion) {
			console.log(
				' ! Skipping Test:',
				functionName + nameAppend,
				'Requres LJM Version:',
				minVersion
			);
			done();
			return;
		}
		function finished_ljm_call (results) {
			if(testInfo.expected_results) {
				assert.deepEqual(
					testInfo.expected_results,
					results,
					'Results are not correct for: ' + functionName  + nameAppend
				);
			}
			if(testInfo.custom_verify) {
				testInfo.custom_verify(test, results, function() {
					done();
				});
			} else {
				done();
			}
		}

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
		log(' - Calling Async Function', functionName);

		var has_function = false;
		if(typeof(ljm[functionName].async) === 'function') {
			has_function = true;
			args.push(finished_ljm_call);

			results = ljm[functionName].async.apply(this, args);
		} else {
			console.error('Does not have function', functionName);
			console.error('Available Functions', Object.keys(functionName));
			assert.isOk(false,'Failed to call function...');
			done();
		}
		// ljm_err = ljm[functionName].apply(this, args);
		// console.log('Err', ljm_err);

	};
}

/* Programatically add more test cases */
function addTests() {
	var functionNames = Object.keys(function_tests);

	functionNames.forEach(function(functionName) {
		var testName;
		try {
			var testInfo = function_tests[functionName];
			var nameAppend;
			if(enabled_tests.sync.ljm) {
				// Add the ljm call
				nameAppend = '-ljm-sync';
				testName = functionName + nameAppend;
				test_cases[testName] = create_ljm_sync_test(
					functionName,
					testInfo,
					nameAppend
				);
			}
			if(enabled_tests.sync.liblabjack) {
				// Add the liblabjack call
				nameAppend = '-liblabjack-sync';
				testName = functionName + nameAppend;
				test_cases[testName] = create_liblabjack_sync_test(
					functionName,
					testInfo,
					nameAppend
				);
			}
			if(enabled_tests.sync.ffi_liblabjack) {
				// Add the ffi_liblabjack call
				nameAppend = '-ffi_liblabjack-sync';
				testName = functionName + nameAppend;
				test_cases[testName] = create_ffi_liblabjack_sync_test(
					functionName,
					testInfo,
					nameAppend
				);
			}

			if(enabled_tests.async.ljm) {
				nameAppend = '-ljm-async';
				testName = functionName + nameAppend;
				test_cases[testName] = create_ljm_async_test(
					functionName,
					testInfo,
					nameAppend
				);
			}
		} catch(err) {
			console.log('Error adding function', testName);
		}
	});

}

addTests();

/* Define Test Cases */
describe('ljm_calls', function() {
	it('include ljm', function (done) {
		var ljm_ffi = require('../../lib/ljm-ffi');

		ljm = ljm_ffi.load();
		liblabjack = ljm_ffi.loadSafe();
		ffi_liblabjack = ljm_ffi.loadRaw();

		var ljmLibraryVersion = ljm.LJM_ReadLibraryConfigS(
			'LJM_LIBRARY_VERSION', 0);
		ljmVersion = ljmLibraryVersion.Value;

		done();
	});

});

/* Add tests defined in the function_tests objects to the test_cases object. */
