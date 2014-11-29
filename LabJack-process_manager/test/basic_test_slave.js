var dict = require('dict');
var q = require('q');


var process_manager = require('../lib/process_manager.js');
var slave_process = process_manager.slave_process();


var qListener = function(message) {
	console.log('S: Received Message', message);
	var defered = q.defer();
	var retData;
	if(message === '') {
		retData = '';
	} else if(message === 'generic') {
		retData = 'generic';
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
	console.log('S: basic_test_slave.js eventMessageReceived', data);
	slave_process.send('test','Test Data');
});

slave_process.finishedInit(slave_process.getSlaveProcessInfo())
.then(function() {
	console.log('S: Ready to do things....');
});

