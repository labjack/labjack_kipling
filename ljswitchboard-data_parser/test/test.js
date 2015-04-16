
var BASIC_TEST = true;
var ERROR_TEST = true;
var VALIDATOR_TEST = true;

if(BASIC_TEST) {
	var basic_test =  require('./basic_test');
	exports.basic_test = basic_test.tests;
}

if(ERROR_TEST) {
	var error_test =  require('./error_test');
	exports.error_test = error_test.tests;
}

if(VALIDATOR_TEST) {
	var validator_test =  require('./validator_test');
	exports.validator_test = validator_test.tests;
}