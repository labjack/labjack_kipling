/**
 * This example shows the basic usage of the process_manager library.
**/

// Require npm modules
var assert = require('chai').assert;
var q = require('q');
var path = require('path');
var fs = require('fs');

var spawnChildProcess = true;
var debug_mode = false;

var processArgs = process.argv;
var process_manager = require('../lib/process_manager');
var utils = require('../examples/common/utils');
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

var getExecution;
var constants;

getExecution = utils.getExecution;
constants = process_manager.constants;

if (!fs.existsSync(nodeBinaryPath)) { // use standard node for linux
	nodeBinaryPath = '/usr/bin/node';
}

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
var basicOneWayReceiver = function(data) {
	print("Received slave_process \'message\' or constants.emitMessage type (via sendMessage)", data);
	receivedTestEvents.push(data);
};
var initializeMasterProcess = function(eventTitle) {
	var defered = q.defer();
	mpEventEmitter = mp.init(basicOneWayReceiver);
	mpEventEmitter.on(eventTitle, function(data) {
		print('Received slave_process \'test\' emit (via send)', eventTitle, data);
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
	var childProcessToFork = './test/basic_slave.js';

	print('Starting Basic Example');
	var qStartOptions = {
		'startupInfo': 'aa',
		'DEBUG_MODE': debug_mode,
		'spawnChildProcess': spawnChildProcess
	};
	if(execPath !== '') {
		qStartOptions.cwd = cwd;
		qStartOptions.execPath = execPath;
	}
	getExecution(mp, 'qStart', childProcessToFork, qStartOptions)(returnedData)
	.then(getExecution(mp, 'sendMessage', {'dataMessage': 'aB-sendMessage'}))
	.then(getExecution(mp, 'send', 'message', {'dataMessage': 'aB-send'}))
	.then(getExecution(mp, 'sendReceive', {'dataMessage': 'aa'}))
	.then(getExecution(mp, 'sendReceive', {'dataMessage': 'returnUndefined'}))
	.then(getExecution(mp, 'sendReceive', {'dataMessage': 'returnBuffer'}))
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




describe('basic_test', function() {
	/**
	 * Creating a new master_process instance.  Is a synchronous function.
	 */
	it('create_master_process', function(done) {
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
			assert.deepEqual(foundFunctions, expectedFunctionList, 'detected invalid function list');
			done();
		});
	});

	/**
	 * Initialize the master_process instance, this test makes sure that
	 * initializing the master process returns an event listener.  this process
	 * can be done synchronously but is wrapped by a promise to make it async.
	 */
	it('initialize_master_process', function(done) {
		var eventTitle = 'test';
		initializeMasterProcess(eventTitle)
		.then(function(retData) {
			var expectedFunctionList = [
				'getSubprocess',
				'startChildProcess',
				'qSendInternalMessage',
				'qSendReceiveMessage',
				'sendReceiveMessage',
				'sendMessage',
				'emitMessage',
				'stopChildProcess'
			];
			var mpKeys = Object.keys(retData);
			var foundFunctions = [];
			mpKeys.forEach(function(mpKey) {
				if(typeof(retData[mpKey]) === 'function') {
					foundFunctions.push(mpKey);
				}
			});
			assert.deepEqual(foundFunctions, expectedFunctionList, 'detected invalid function list');


			// Verify returned element is an event emitter
			var msg = 'initializing the master process didn\t return an event emitter';
			assert.strictEqual(typeof(retData.on),'function', msg);

			done();
		});
	});

	it('verify_event_listeners', function(done) {
		var expectedListeners = [
			'criticalError',
			'messageBufferFull',
			'ReceivedInvalidMessage',
			constants.emitMessage,
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
		assert.deepEqual(foundEventListeners, expectedListeners, msg);
		done();
	});

	/**
	 * This test starts a new process and performs some IO to the process and
	 * checks the results of the sendReceive message as well as the send &
	 * sendMessage functions.  The one way messages get handled by the
	 * previously established event listeners.
	 */
	it('basic_execution', function(done) {
		var expectedTestEvents = [
			'Test Data',
			'Test Data'
		];

		var expectedReturnData = [
			{
				'functionCall': 'qStart',
				'retData': {
					'startupInfo': 'aa',
					'DEBUG_MODE': debug_mode,
					'spawnChildProcess': spawnChildProcess,
					'cwd': process.cwd(),
					'execPath': nodeBinaryPath
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
					'arbitraryData': 'Arbitrary data from basic_slave.js'
				}
			}, {
				'functionCall': 'sendReceive',
				'retData': undefined
			}, {
				// Expected data for buffer response (converted to a json str)
				'functionCall': 'sendReceive',
				'retData': {'type': 'Buffer', 'data': [13, 14, 10, 13, 11, 14, 14, 15]}
			}, {
				'functionCall': 'qStop',
				'retData': { 'numLostMessages': 0 }
			}
		];
		run(process.cwd(), nodeBinaryPath)
		.then(function(data) {
			assert.isOk(true);
			// Check to make sure that the testEvents were fired
			assert.deepEqual(receivedTestEvents, expectedTestEvents, 'Issue with event messaging');

			// Check to make sure that the the sendReceive/master_process
			// functions were called properly
			// console.log('retData', returnedData[5].retData);
			// var buff = new Buffer(1);
			// console.log('types', Buffer.isBuffer(buff), Buffer.isBuffer(returnedData[5].retData));
			assert.deepEqual(returnedData, expectedReturnData, 'Issue with send receive messaging');
			done();
		});
	});

});
