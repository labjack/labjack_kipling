/**
 * This example shows the basic usage of the process_manager library.
**/

// Require npm modules
var q = require('q');

var process_manager;
var utils;
var getExecution;
var node_binary;

// master_process object
var mp;
var mpEventEmitter;

var DEBUG_TEST = false;
var print = function(argA, argB) {
    if(DEBUG_TEST) {
        var msg = 'BT:';
        if(argA) {
            if(argB) {
                console.log(msg, argA, argB);
            } else {
                console.log(msg, argA);
            }
        } else {
            console.log(msg);
        }
    }
};

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
		print('Received slave_process \'test\' emit', eventTitle, data);
		receivedTestEvents.push(data);
	});
	defered.resolve(mpEventEmitter);
	return defered.promise;
};

var returnedData = [];
var run = function(cwd, execPath) {
	var defered = q.defer();
	// Generic Procedure after initialization
	// 1. Starting slave process
	// 2. Sending a test message
	// 3. Stop the slave process

	// The child process to create
	var childProcessToFork = './test/basic_test_slave.js';

	print('Starting Basic Example');
	var qStartOptions = {
		'startupInfo': 'aa',
		'DEBUG_MODE': false,
	}
	if(execPath !== '') {
		qStartOptions.cwd = cwd;
		qStartOptions.execPath = execPath;
	}
	getExecution(mp, 'qStart', childProcessToFork, qStartOptions)(returnedData)
	.then(getExecution(mp, 'sendMessage', {'dataMessage': 'aB'}))
	.then(getExecution(mp, 'send', 'message', {'dataMessage': 'aB'}))
	.then(getExecution(mp, 'sendReceive', {'dataMessage': 'aa'}))
	
	// .then(getExecution(mp, 'getProcessInfo'))
	.then(getExecution(mp, 'qStop'))
	.then(function(bundle) {
		print('Received Data');
		bundle.forEach(function(data) {
			var pData;
			if(data.retData) {
				pData = data.retData;
			} else {
				pData = data.errData;
			}
			if(DEBUG_TEST) {
				console.log('\t- ' + data.functionCall + ':', pData);
			}
		});
		print('Finished Basic Example');
		defered.resolve();
	});
	return defered.promise;
};


exports.tests = {
	/**
	 * Creating a new master_process instance.  Is a synchronous function.
	 */
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
	/**
	 * Initialize the master_process instance, this test makes sure that 
	 * initializing the master process returns an event listener.  this process 
	 * can be done synchronously but is wrapped by a promise to make it async.
	 */
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
	/**
	 * This test starts a new process and performs some IO to the process and
	 * checks the results of the sendReceive message as well as the send & 
	 * sendMessage functions.  The one way messages get handled by the 
	 * previously established event listeners.
	 */
	'basic_execution': function(test) {
		var expectedTestEvents = [
			'Test Data',
			'Test Data'
		];

		var expectedReturnData = [
			{
				'functionCall': 'qStart',
				'retData': {
					'startupInfo': 'aa',
					'DEBUG_MODE': false,
					'cwd': process.cwd(),
					'execPath': node_binary
				}
			}, {
				'functionCall': 'sendMessage',
				'retData': undefined
			}, {
				'functionCall': 'send',
				'retData': undefined
			}, {
				'functionCall': 'sendReceive',
				'retData': {
					'arbitraryData': 'Arbitrary data from basic_test_slave.js'
				}
			}, {
				'functionCall': 'qStop',
				'retData': { 'numLostMessages': 0 }
			}
		];
		run(process.cwd(), node_binary)
		.then(function(data) {
			test.ok(true);
			// Check to make sure that the testEvents were fired
			test.deepEqual(receivedTestEvents, expectedTestEvents, 'Issue with event messaging');

			// Check to make sure that the the sendReceive/master_process 
			// functions were called properly
			test.deepEqual(returnedData, expectedReturnData, 'Issue with send receive messaging');
			test.done();
		});
	}
};
exports.setImports = function(imports) {
	process_manager = imports.process_manager;
	utils = imports.utils;
	getExecution = utils.getExecution;
	node_binary = imports.node_binary;
};
