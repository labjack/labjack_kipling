

var BASIC_TEST = true;
var EXTRACTION_TEST = true;

if(BASIC_TEST) {
	var basic_test = require('./basic_test');
	exports.basic_test = basic_test.tests;
}


if(EXTRACTION_TEST) {
	var extraction_test = require('./extraction_test');
	exports.extraction_test = extraction_test.tests;
}
