
var ZIPPING_TEST = true;
var EDIT_PACKAGE_KEYS_TEST = true;

if(ZIPPING_TEST) {
	var zipping_test = require('./zipping_test');
	exports.zipping_test = zipping_test.tests;
}
if(EDIT_PACKAGE_KEYS_TEST) {
	var edit_package_keys_test = require('./edit_package_keys_test');
	exports.edit_package_keys_test = edit_package_keys_test.tests;
}