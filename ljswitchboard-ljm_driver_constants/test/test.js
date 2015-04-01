
var driver_constants = require('../lib/driver_constants');
exports.tests = {
	'verify constants': function(test) {
		var keys = Object.keys(driver_constants);
		test.ok(keys.length > 0, 'Constants were not included');
		test.done();
	},
	'check ljm types': function(test) {
		var keys = Object.keys(driver_constants.ljmTypes);
		// Make sure all types are of type "number".
		keys.forEach(function(key) {
			test.strictEqual(typeof(driver_constants.ljmTypes[key]), 'number');
		});
		test.done();
	},
	'check ljm default values': function(test){
		var keys = Object.keys(driver_constants.defaultValues);
		test.strictEqual(keys.length, 7, 'invalid number of default values');
		test.done();
	}
};