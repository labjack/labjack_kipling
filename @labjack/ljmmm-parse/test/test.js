

var LJMMM_TEST = true;


exports.testExtend = function(test)
{
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
	}
	test.deepEqual(resultingObj, requiredObj, 'Extend function is broken.');
	test.done();
};

if(LJMMM_TEST) {
	exports.ljmmm_test = require('./ljmmm_test');
}


