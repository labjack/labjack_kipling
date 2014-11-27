var process_manager = require('./lib/process_manager');
var utils = require('./examples/common/utils');

var basicTest = require('./test/basic_test');
basicTest.setImports({
	'process_manager': process_manager,
	'utils': utils
});

exports.basic_test = basicTest.tests;