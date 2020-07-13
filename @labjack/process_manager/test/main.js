/**
 * This example shows the basic usage of the process_manager library.
**/

// Require npm modules
var q = require('q');

// Create a new process manager object
var process_manager = require('@labjack/process_manager');
var q = require('q');

// include a function that will execute the master_process functions
var utils = require('../common/utils');
var getExecution = utils.getExecution;

// Create the first master_process object
var mp = new process_manager.master_process();

// initialize each process and attach event listener to the 'test' event.
var mpEventEmitter = mp.init();
mpEventEmitter.on('test', function(data) {
	console.log('Received slave_process \'test\' emit', data);
});


// Generic Procedure after initialization
// 1. Starting slave process
// 2. Sending a test message
// 3. Stop the slave process

// The child process to create
var childProcessToFork = './slave.js';
var returnedData = [];

console.log('M: Starting Basic Example');
getExecution(mp, 'qStart', childProcessToFork)(returnedData)
.then(getExecution(mp, 'sendReceive', {'dataMessage': 'aa'}))
.then(getExecution(mp, 'send', {'dataMessage': 'aB'}))
// .then(getExecution(mp, 'getProcessInfo'))
.then(getExecution(mp, 'qStop'))
.then(function(bundle) {
	console.log('M: Received Data');
	bundle.forEach(function(data) {
		var pData;
		if(data.retData) {
			pData = data.retData;
		} else {
			pData = data.errData;
		}
		console.log('\t- ' + data.functionCall + ':', pData);
	});
	console.log('M: Finished Basic Example');
});
