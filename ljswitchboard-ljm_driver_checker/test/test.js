var assert = require('chai').assert;

/**
 * This example shows the basic usage of the process_manager library.
**/

// Require npm modules
var q = require('q');


var driver_checker;


describe('ljm_installation', function() {
	it('include checker', function (done) {
		try {
			driver_checker = require('../lib/ljm_driver_checker');
		} catch (err) {
			assert.isOk(false, 'failed to require library');
		}
		done();
	});
	it('check installation', function (done) {
		driver_checker.verifyLJMInstallation()
		.then(function(res) {
			var requiredKeys = [
				'overallResult',
				'ljmVersion',
				'Driver',
				'LabJack folder',
				'LabJack LJM folder',
				'LJM .json file',
				'LJM header file',
				'LJM startup configs file'
			];
			if(process.platform === 'win32') {
				requiredKeys.push('LJM windows .lib file');
			}

			var resKeys = Object.keys(res);
			var msg = 'Required Keys does not match result keys';
			assert.strictEqual(resKeys.length, requiredKeys.length, msg);
			requiredKeys.forEach(function(key) {
				if(resKeys.indexOf(key) >= 0) {
					assert.isOk(true);
				} else {
					assert.isOk(false, msg + ', missing key: ' + key);
				}

				// As an extra sanity check, the following tests should pass on
				// machines if LJM is installed properly and the ljm_driver_checker
				// is working properly.  The only key that should be excluded is the
				// test for the ljm_startup_configs.json which isn't a valid .json file.
				if(key !== 'LJM startup configs file') {
					if(res[key].exists) {
						assert.isOk(res[key].exists, 'ljm is likely not installed properly or test is broken');
					}
					if(res[key].isValid) {
						assert.isOk(res[key].isValid, 'ljm is likely not installed properly or test is broken');
					}
				}
			});
			assert.isOk(res.overallResult, 'ljm not installed properly');
			done();
		}, function(err) {
			console.log('LJM not installed properly');
			console.log(err);
			assert.isOk(false, 'LJM not installed properly');
			done();
		});
	});
	it('check core requirements', function (done) {
		driver_checker.verifyCoreInstall()
		.then(function(res) {
			var requiredKeys = [
				'overallResult',
				'LabJack folder'
			];

			var resKeys = Object.keys(res);
			var msg = 'Required Keys does not match result keys';
			assert.strictEqual(resKeys.length, requiredKeys.length, msg);
			requiredKeys.forEach(function(key) {
				if(resKeys.indexOf(key) >= 0) {
					assert.isOk(true);
				} else {
					assert.isOk(false, msg + ', missing key: ' + key);
				}
			});
			assert.isOk(res.overallResult, 'core requirements not met');
			done();
		}, function(err) {
			console.log('LJM not installed properly');
			console.log(err);
			assert.isOk(false, 'LJM not installed properly');
			done();
		});
	});
});
