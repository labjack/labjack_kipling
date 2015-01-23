/**
 * This example shows the basic usage of the process_manager library.
**/

// Require npm modules
var q = require('q');


var driver_checker;

exports.ljm_installation = {
	'include checker': function(test) {
		try {
			driver_checker = require('../lib/ljm_driver_checker');
		} catch (err) {
			test.ok(false, 'failed to require library');
		}
		test.done();
	},
	'check installation': function(test) {
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
			test.strictEqual(resKeys.length, requiredKeys.length, msg);
			requiredKeys.forEach(function(key) {
				if(resKeys.indexOf(key) >= 0) {
					test.ok(true);
				} else {
					test.ok(false, msg + ', missing key: ' + key);
				}

				// As an extra sanity check, the following tests should pass on
				// machines if LJM is installed properly and the ljm_driver_checker
				// is working properly.  The only key that should be excluded is the
				// test for the ljm_startup_configs.json which isn't a valid .json file.
				if(key !== 'LJM startup configs file') {
					if(res[key].exists) {
						test.ok(res[key].exists, 'ljm is likely not installed properly or test is broken');
					}
					if(res[key].isValid) {
						test.ok(res[key].isValid, 'ljm is likely not installed properly or test is broken');
					}
				}
			});
			test.ok(res.overallResult, 'ljm not installed properly');
			test.done();
		}, function(err) {
			console.log('HERE!!!');
			test.ok(false, 'LJM not installed properly');
			test.done();
		});
	}
};

