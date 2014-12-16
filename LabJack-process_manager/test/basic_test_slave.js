var dict = require('dict');
var q = require('q');
var buffer = require('buffer');


var process_manager = require('../lib/process_manager.js');
var slave_process = process_manager.slave_process();

var DEBUG = false;
var startupInfo = slave_process.getSlaveProcessInfo();
if(typeof(startupInfo.DEBUG_MODE) !== 'undefined') {
	DEBUG = startupInfo.DEBUG_MODE;
} else {
	console.log('S: DEBUG_MODE argument not defined');
}

if(DEBUG) {
	console.log('S:', slave_process.getSlaveProcessInfo());
}

var qListener = function(message) {
	if(DEBUG) {
		console.log('S: Received Message', message);
	}
	var defered = q.defer();
	var retData;
	if(message === '') {
		retData = '';
	} else if(message === 'generic') {
		retData = 'generic';
	} else if (message.dataMessage === 'returnUndefined') {
		retData = undefined;
	} else if (message.dataMessage === 'returnBuffer') {
		var data = [0xD, 0xE, 0xA, 0xD, 0xB, 0xE, 0xE, 0xF];
		var retBuffer = new Buffer(data.length);	// to create a hex 0xDEADBEEF
		data.forEach(function(val, i) {
			retBuffer.writeUInt8(val, i);
		});
		retData = retBuffer;
	} else {
		retData = {'arbitraryData': 'Arbitrary data from basic_test_slave.js'};//,'pid':process.pid};
	}
	defered.resolve(retData);
	return defered.promise;
};
var listenerObj = {
	'type': 'q',
	'func': qListener
};
var eventListener = slave_process.init(listenerObj);
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

