
// Potentially a common header for all module test files:
// Append io_manager development path & package_loader module paths to the
// module.paths variable.
var path = require('path');
var cwd = process.cwd();
var pathPrepend = cwd + path.sep;
var modulePaths = [
	pathPrepend + '../',
	pathPrepend + '../ljswitchboard-io_manager/lib/node_modules',
	pathPrepend + '../ljswitchboard-io_manager/node_modules',
	pathPrepend + '../ljswitchboard-package_loader/lib/node_modules',
	pathPrepend + '../ljswitchboard-package_loader/node_modules',
];

modulePaths.forEach(function(modulePath) {
	modulesDirToAdd = path.normalize(modulePath);
	require.main.paths.splice(2,0,modulesDirToAdd);
});
// End common header


var TEST_MODULE_LISTING = true;
var TEST_MODULE_LOADING = false;

// Module Tests
var TEST_DEVICE_SELECTOR = false;


if (TEST_MODULE_LISTING) {
	var test_module_listing = require('./test_module_listing');
	exports.test_module_listing = test_module_listing.tests;
}

if (TEST_MODULE_LOADING) {
	var test_module_loading = require('./test_module_loading');
	exports.test_module_loading = test_module_loading.tests;
}

if (TEST_DEVICE_SELECTOR) {
	var test_device_selector = require('./module_tests/test_device_selector');
	exports.test_device_selector = test_device_selector.tests;
}
