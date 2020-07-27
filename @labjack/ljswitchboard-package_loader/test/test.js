


var BASIC_TEST = true;
var EXTRACTION_TEST = true;
var ADVANCED_EXTRACTION_TEST = true;
var MULTIPLE_PACKAGES_TEST = true;
var FORCE_REFRESH_TEST = true;

var BAD_ZIPS_TEST = false; // Failed to get this to work.
// See https://github.com/labjack/labjack_kipling/issues/1

// This test requires manual execution & verification.  Test has to be started
// and canceled before completion and started again to test the refresh abilities.
var HUGE_PACKAGE_TEST = false;

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

if(FORCE_REFRESH_TEST) {
	var force_refresh_test = require('./force_refresh_test');
	exports.force_refresh_test = force_refresh_test.tests;
}

if(BAD_ZIPS_TEST) {
	var bad_zips_test = require('./bad_zips_test');
	exports.bad_zips_test = bad_zips_test.tests;
}


if(HUGE_PACKAGE_TEST) {
	var huge_package_test = require('./huge_package_test');
	exports.huge_package_test = huge_package_test.tests;
}


