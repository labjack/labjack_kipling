
console.log("in io_delegator.js!!");

var dict = require('dict');
var q = require('q');

var process_manager = require('process_manager');
var slave_process = process_manager.slave_process();

var DEBUG = true;
var startupInfo = slave_process.getSlaveProcessInfo();


var messageDelegator = function(message) {
	var defered = q.defer();
	defered.resolve();
	return defered.promise;
};

var eventListener = slave_process.init({'type': 'q', 'func': messageDelegator});

eventListener.on('message', function(data) {
	if(DEBUG) {
		console.log('S: basic_test_slave.js eventMessageReceived', data);
	}
	slave_process.send('test','Test Data');
});

slave_process.finishedInit(slave_process.getSlaveProcessInfo())
.then(function() {
	if(DEBUG) {
		console.log('S: Ready to do things....');
	}
});