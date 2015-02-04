

var BASIC_TEST = true;
var EXTRACTION_TEST = false;
var ADVANCED_EXTRACTION_TEST = true;

if(BASIC_TEST) {
	var basic_test = require('./basic_test');
	exports.basic_test = basic_test.tests;
}


if(EXTRACTION_TEST) {
	var extraction_test = require('./extraction_test');
	exports.extraction_test = extraction_test.tests;
}

if(ADVANCED_EXTRACTION_TEST) {
	var advanced_extraction_test = require('./advanced_extraction_test');
	exports.advanced_extraction_test = advanced_extraction_test.tests;
}