var q = require('q');

var process_manager = require('LabJack-process_manager');
var slave_process = process_manager.slave_process;

var LJM_Manager_Listeners = function(messageBundle) {
	var defered = q.defer();
	var retData = {'here':'a'};
	var isSuccess = true;
	if(isSuccess) {
		defered.resolve(messageBundle);
	} else {
		defered.reject(messageBundle);
	}
	return defered.promise;
};
var qListener = function(message) {
	var defered = q.defer();
	console.log('DMS: device_manager_slave.js message received:', message);
	var retData;
	if(message === '') {
		retData = '';
	} else if(message === 'generic') {
		retData = 'generic';
	} else {
		retData = {'arbitraryData': 'Arbitrary data from device_manager_slave.js','pid':process.pid};
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
	console.log('DMS: device_manager_slave.js eventMessageReceived', data);
	slave_process.emit('test','Test Data');
});

slave_process.finishedInit()
.then(function() {
	console.log('DMS: Ready to do things....');
});

