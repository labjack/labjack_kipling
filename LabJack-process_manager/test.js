
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
nodeBinaryPath = path.join(process.cwd(), 'node_binaries', process.platform, process.arch, '0_11_14', 'node');
if (process.platform === 'win32') {
	nodeBinaryPath = nodeBinaryPath + '.exe';
}
// Create a string that looks like '<cwd>/node_binaries/darwin/x64/0_11_14/node'

var process_manager = require('./lib/process_manager');
var utils = require('./examples/common/utils');

var basic_test = require('./test/basic_test');
var basicTest = new basic_test.createBasicTest({
	'process_manager': process_manager,
	'utils': utils,
	'node_binary': nodeBinaryPath,
	'spawnChildProcess': true,
	'debug_mode': false
});

var advancedTest = require('./test/advanced_test');

exports.basic_test = basicTest.tests;
if(isMasterProcess) {
	exports.advanced_test = advancedTest.tests;
}

