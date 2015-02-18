var TEST_MODULE_LISTING = true;
var TEST_MODULE_LOADING = true;


if (TEST_MODULE_LISTING) {
	var test_module_listing = require('./test_module_listing');
	exports.test_module_listing = test_module_listing.tests;
}

if (TEST_MODULE_LOADING) {
	var test_module_loading = require('./test_module_loading');
	exports.test_module_loading = test_module_loading.tests;
}
