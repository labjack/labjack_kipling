var assert = require('chai').assert;

var driver_constants = require('../lib/driver_constants');

describe('driver_constants', function() {
	it('verify constants', function (done) {
		var keys = Object.keys(driver_constants);
		assert.isOk(keys.length > 0, 'Constants were not included');
		done();
	});
	it('check ljm types', function (done) {
		var keys = Object.keys(driver_constants.ljmTypes);
		// Make sure all types are of type "number".
		keys.forEach(function(key) {
			assert.strictEqual(typeof(driver_constants.ljmTypes[key]), 'number');
		});
		done();
	});
	it('check ljm default values', function (done) {
		var keys = Object.keys(driver_constants.defaultValues);
		assert.strictEqual(keys.length, 7, 'invalid number of default values');
		done();
	});
});
