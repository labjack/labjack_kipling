/**
 * This example makes sure that multiple processes can be created, managed, and 
 * destroyed using the process_manager library.
**/

// Require npm modules
var q = require('q');

// Create a new process manager object
var process_manager = require('LabJack-process_manager');

// Create the first master_process object
var mpA = new process_manager.master_process();

// Create the second master_process object
var mpB = new process_manager.master_process();

// initialize each process
var mpAEventEmitter = mpA.init();
mpAEventEmitter.on('test', function(data) {
	console.log('HERERERE', data);
});
mpB.init();

// define some q functions for:
// 1. Starting each process
// 2. Sending a test message to each process for its pid
// 3. Test to make sure that the pid's are different
// 4. Stop each process

// The child process to create
var childProcessToFork = './device_manager_slave.js';
var returnedData = [];

var getExecution = function(obj, func, argA, argB) {
	return function(bundle) {
		var defered = q.defer();
		obj[func](argA, argB)
		.then(function(data) {
			bundle.push({'functionCall':func, 'retData': data});
			defered.resolve(bundle);
		}, function(err) {
			bundle.push({'functionCall':func, 'errData': err});
			defered.resolve(bundle);
		});
		return defered.promise;
	};
};
var sleepA = function(bundle) {
	var defered = q.defer();
	setTimeout(function() {
		defered.resolve(bundle);
	}, 1000);
	return defered.promise;
};

getExecution(mpA, 'qStart', childProcessToFork)(returnedData)
.then(getExecution(mpB, 'qStart', childProcessToFork))
.then(getExecution(mpA, 'sendReceive', {'dataMessage': 'aa'}))
.then(getExecution(mpB, 'sendReceive', {'dataMessage': 'aa'}))
.then(getExecution(mpA, 'send', {'dataMessage': 'aB'}))
.then(getExecution(mpB, 'send', {'dataMessage': 'aB'}))
.then(sleepA)
// .then(getExecution(mpA, 'getProcessInfo'))
// .then(getExecution(mpB, 'getProcessInfo'))
.then(getExecution(mpA, 'qStop'))
.then(getExecution(mpB, 'qStop'))
.then(function(bundle) {
	console.log('Finished');
	bundle.forEach(function(data) {
		var pData;
		if(data.retData) {
			pData = data.retData;
		} else {
			pData = data.errData;
		}
		// console.log(data.functionCall + ':', pData);
	});
	console.log(process_manager.getStats());
});