var process_manager = require('./lib/process_manager');
var utils = require('./examples/common/utils');

var basicTest = require('./test/basic_test');
basicTest.setImports({
	'process_manager': process_manager,
	'utils': utils
});

var advancedTest = require('./test/advanced_test');

exports.basic_test = basicTest.tests;
exports.advanced_test = advancedTest.tests;