
/*
 * This test gets the currently installed LJM Driver version
 */


/* Define how the tests will be run. */
var ljm;
var liblabjack;
var ffi_liblabjack;


/* Define Test Cases */
var test_cases = {
	'include ljm': function(test) {
		var ljm_ffi = require('@labjack/ljm-ffi');

		ljm = ljm_ffi.load();
		liblabjack = ljm_ffi.loadSafe();
		ffi_liblabjack = ljm_ffi.loadRaw();

		test.done();
	},
	'Getting LJM Version': function(test) {
		var ljmLibraryVersion = ljm.LJM_ReadLibraryConfigS('LJM_LIBRARY_VERSION', 0);
		var expectedData = {
			'ljmError': 0,
			'Parameter': 'LJM_LIBRARY_VERSION',
			'Value': ljmLibraryVersion.Value,
		};
		console.log('');
		console.log('*** Getting LJM Version ***');
		console.log('  - LJM Library Version:'.green, ljmLibraryVersion.Value);
		test.deepEqual(ljmLibraryVersion, expectedData);
		test.done();
	},
};


exports.tests = test_cases;