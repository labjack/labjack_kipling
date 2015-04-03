
var BASIC_TEST = false;
var ERROR_TEST = true;

if(BASIC_TEST) {
	var basic_test =  require('./basic_test');
	exports.basic_test = basic_test.tests;
}

if(ERROR_TEST) {
	var error_test =  require('./error_test');
	exports.error_test = error_test.tests;
}