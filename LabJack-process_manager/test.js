
var path = require('path');
var processArgs = process.argv;
console.log('processArgs', processArgs);

var isMasterProcess = false;
var nodeBinaryPath = '';
if(processArgs.length > 3) {
	console.log('Running test as a child_process');
	nodeBinaryPath = process.argv[4];
} else {
	console.log('Running test as a master_process');
	isMasterProcess = true;
}

// Force process to use a custom binary
nodeBinaryPath = process.cwd() + '/node_binaries/darwin/x64/0_11_14/node';
nodeBinaryPath = path.join(process.cwd(), 'node_binaries', process.platform, process.arch, '0_11_14', 'node.exe');

var process_manager = require('./lib/process_manager');
var utils = require('./examples/common/utils');

var basicTest = require('./test/basic_test');
basicTest.setImports({
	'process_manager': process_manager,
	'utils': utils,
	'node_binary': nodeBinaryPath
});

var advancedTest = require('./test/advanced_test');

exports.basic_test = basicTest.tests;
if(isMasterProcess) {
	exports.advanced_test = advancedTest.tests;
}
