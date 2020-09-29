/*
 * This test gets the currently installed LJM Driver version
 */

/* Define how the tests will be run. */
var ljm;
var liblabjack;
var ffi_liblabjack;

var assert = require('chai').assert;

/* Define Test Cases */
describe('get ljm version', function() {
	it('include ljm', function (done) {
		var ljm_ffi = require('ljm-ffi');

		ljm = ljm_ffi.load();
		liblabjack = ljm_ffi.loadSafe();
		ffi_liblabjack = ljm_ffi.loadRaw();

		done();
	});
	it('Getting LJM Version', function (done) {
		var ljmLibraryVersion = ljm.LJM_ReadLibraryConfigS('LJM_LIBRARY_VERSION', 0);
		var expectedData = {
			'ljmError': 0,
			'Parameter': 'LJM_LIBRARY_VERSION',
			'Value': ljmLibraryVersion.Value,
		};
		console.log('');
		console.log('*** Getting LJM Version ***');
		console.log('  - LJM Library Version:'.green, ljmLibraryVersion.Value);
		assert.deepEqual(ljmLibraryVersion, expectedData);
		done();
	});
});
