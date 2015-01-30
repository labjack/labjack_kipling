
var driver_constants = require('../lib/driver_constants');
exports.tests = {
	'verify constants': function(test) {
		var keys = Object.keys(driver_constants);
		test.ok(keys.length > 0, 'Constants were not included');
		test.done();
	}
};