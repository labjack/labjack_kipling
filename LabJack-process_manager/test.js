
var processArgs = process.argv;
console.log('processArgs', processArgs);

var isMasterProcess = false;
if(processArgs.length > 3) {
	console.log('Running test as a child_process');
} else {
	console.log('Running test as a master_process');
	isMasterProcess = true;
}

var process_manager = require('./lib/process_manager');
var utils = require('./examples/common/utils');

var basicTest = require('./test/basic_test');
basicTest.setImports({
	'process_manager': process_manager,
	'utils': utils
});

var advancedTest = require('./test/advanced_test');

exports.basic_test = basicTest.tests;
if(isMasterProcess) {
	exports.advanced_test = advancedTest.tests;
}
