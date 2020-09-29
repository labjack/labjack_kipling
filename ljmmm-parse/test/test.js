var assert = require('chai').assert;

describe('ljmmm_test', function() {
	it('testExtend', function (done) {
		var extend = require('../lib/extend').extend;
		var resultingObj = extend(true,
			{
				"name": "value"
			},
			{
				"object": "value",
				"other": "thing",
				"inception": {
					"deeper": "deeper",
					"inception": {
						"deeper": "deeper",
						"inception": {
							"deeper": "deeper"
						}
					}
				}
			}
		);
		var requiredObj = {
			"name": "value",
			"object": "value",
			"other": "thing",
			"inception": {
				"deeper": "deeper",
				"inception": {
					"deeper": "deeper",
					"inception": {
						"deeper": "deeper"
					}
				}
			}
		};
		assert.deepEqual(resultingObj, requiredObj, 'Extend function is broken.');
		done();
	});
});
