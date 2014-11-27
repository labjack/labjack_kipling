/**
 * This example shows the basic usage of the process_manager library.
**/

// Require npm modules
var q = require('q');

var process_manager;
var utils;
var getExecution;

// master_process object
var mp;
var mpEventEmitter;

var createMasterProcess = function() {
	var defered = q.defer();
	mp = new process_manager.master_process();
	defered.resolve(mp);
	return defered.promise;
};
var receivedTestEvents = [];
var initializeMasterProcess = function(eventTitle) {
	var defered = q.defer();
	mpEventEmitter = mp.init();
	mpEventEmitter.on(eventTitle, function(data) {
		console.log('M: Received slave_process \'test\' emit', eventTitle, data);
		receivedTestEvents.push(data);
	});
	defered.resolve(mpEventEmitter);
	return defered.promise;
};


var run = function() {
	var defered = q.defer();
	// Generic Procedure after initialization
	// 1. Starting slave process
	// 2. Sending a test message
	// 3. Stop the slave process

	// The child process to create
	var childProcessToFork = './test/basic_test_slave.js';
	var returnedData = [];

	console.log('M: Starting Basic Example');
	getExecution(mp, 'qStart', childProcessToFork, {'startupInfo': 'aa'})(returnedData)
	.then(getExecution(mp, 'sendMessage', {'dataMessage': 'aB'}))
	.then(getExecution(mp, 'send', 'message', {'dataMessage': 'aB'}))
	.then(getExecution(mp, 'sendReceive', {'dataMessage': 'aa'}))
	
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
		defered.resolve();
	});
	return defered.promise;
};


exports.tests = {
	'create_master_process': function(test) {
		var expectedFunctionList = [
			'init',
			'start',
			'qStart',
			'stop',
			'qStop',
			'sendReceive',
			'sendMessage',
			'send',
			'getProcessInfo',
			'getEventEmitter'
		];
		
		createMasterProcess()
		.then(function(retData) {
			// Verify function list
			var mpKeys = Object.keys(retData);
			var foundFunctions = [];
			mpKeys.forEach(function(mpKey) {
				if(typeof(retData[mpKey]) === 'function') {
					foundFunctions.push(mpKey);
				}
			});
			test.deepEqual(foundFunctions, expectedFunctionList, 'detected invalid function list');
			test.done();
		});
	},
	'initialize_master_process': function(test) {
		var eventTitle = 'test';
		initializeMasterProcess(eventTitle)
		.then(function(retData) {
			var expectedFunctionList = [
				'startChildProcess',
				'qSendInternalMessage',
				'qSendReceiveMessage',
				'sendReceiveMessage',
				'sendMessage',
				'emitMessage',
				'qStopChildProcess',
				'stopChildProcess'
			];
			var mpKeys = Object.keys(retData);
			var foundFunctions = [];
			mpKeys.forEach(function(mpKey) {
				if(typeof(retData[mpKey]) === 'function') {
					foundFunctions.push(mpKey);
				}
			});
			test.deepEqual(foundFunctions, expectedFunctionList, 'detected invalid function list');


			// Verify returned element is an event emitter
			var msg = 'initializing the master process didn\t return an event emitter';
			test.strictEqual(typeof(retData.on),'function', msg);

			test.done();
		});
	},
	'verify_event_listeners': function(test) {
		var expectedListeners = [
			'criticalError',
			'messageBufferFull',
			'ReceivedInvalidMessage',
			'test'
		];

		var events = mpEventEmitter._events;
		var eventKeys = Object.keys(events);
		var foundEventListeners = [];
		eventKeys.forEach(function(key) {
			if(typeof(events[key]) === 'function') {
				foundEventListeners.push(key);
			}
		});

		var msg = 'invalid event listeners detected';
		test.deepEqual(foundEventListeners, expectedListeners, msg);
		test.done();
	},
	'basic_execution': function(test) {
		run()
		.then(function(data) {
			test.ok(true);
			test.done();
		});
	}
};
exports.setImports = function(imports) {
	process_manager = imports.process_manager;
	utils = imports.utils;
	getExecution = utils.getExecution;
};