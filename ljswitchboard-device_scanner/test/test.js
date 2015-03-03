

var BASIC_TEST = false;
var MOCK_TEST = true;


if(BASIC_TEST) {
	var basic_test = require('./basic_test');
	exports.basic_test = basic_test.tests;
}

if(MOCK_TEST) {
	var mock_test = require('./mock_test');
	exports.mock_test = mock_test.tests;
}