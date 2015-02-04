

var BASIC_TEST = true;
var EXTRACTION_TEST = true;
var ADVANCED_EXTRACTION_TEST = true;
var MULTIPLE_PACKAGES_TEST = true;

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

if(MULTIPLE_PACKAGES_TEST) {
	var multiple_packages_test = require('./multiple_packages_test');
	exports.multiple_packages_test = multiple_packages_test.tests;
}