var path = require('path');
var processArgs = process.argv;
console.log('processArgs', processArgs);
var nodeBinaryPath = '';

// Force process to use a custom binary
nodeBinaryPath = process.cwd() + '/node_binaries/darwin/x64/0_11_14/node';
nodeBinaryPath = path.join(process.cwd(), 'node_binaries', process.platform, process.arch, '0_11_14', 'node.exe');

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
exports.basic_test = basicTest.tests;