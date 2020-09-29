var assert = require('chai').assert;

var ljm_ffi = require('ljm-ffi');
var ljm = ljm_ffi.load();

var criticalError = false;

describe('get_ljm_version', function() {
	beforeEach(function (done) {
		if(criticalError) {
			process.exit(1);
		} else {
			done();
		}
	});
	afterEach(function (done) {
		done();
	});
	it('createDevice', function (done) {
		var ljmLibraryVersion = ljm.LJM_ReadLibraryConfigS('LJM_LIBRARY_VERSION', 0);
		console.log('');
		console.log('**** get_ljm_version ****');
		console.log(' - Installed LJM Library Version:', ljmLibraryVersion.Value);
		done();
	});
});
