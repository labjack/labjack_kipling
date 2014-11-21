var dmm = require('./master');
var q = require('q');



var pResp = function(messageData) {
	var defered = q.defer();
	console.log('M: Received data:', messageData);
	defered.resolve();
	return defered.promise;
};

function createTester() {
	var messagesAndResponses = [
		{'mess': '', 'resp': ''},
	];

	var numRepeated = 20000;
	for(var i = 0; i < numRepeated; i ++) {
		messagesAndResponses.push({'mess': 'generic', 'resp': 'generic'});
	}
	var actualResults = [];

	var numIterations = messagesAndResponses.length;
	var sleepTime = 1;
	var useImmediate = true;
	var iterationCount = 0;

	var startTime = null;
	var endTime = null;
	var sendData = function(data) {
		var defered = q.defer();
		dmm.sendReceive('Iteration: ' + data.toString())
		.then(function(res) {
			actualResults.push(res);
			defered.resolve();
		});
		return defered.promise;
	};

	this.run = function() {
		console.log('HERE');
		var defered = q.defer();
		startTime = process.hrtime();
		var runNext = function() {
			if(useImmediate) {
				setImmediate(onTimeout);	
			} else {
				setTimeout(onTimeout, sleepTime);
			}
		};
		var onTimeout = function() {
			if(iterationCount < numIterations) {
				iterationCount += 1;
				sendData('baba')
				.then(runNext,runNext);
				
			} else {
				endTime = process.hrtime();
				defered.resolve();
			}
		};
		if(useImmediate) {
			setImmediate(onTimeout);	
		} else {
			setTimeout(onTimeout, sleepTime);
		}
		return defered.promise;
	};
	var convToSec = function(hrTime) {
		return hrTime[0] + hrTime[1]/1000000000;
	};
	var roundRes = function(res) {
		var str = '';
		var ending = '';
		if(res >= 1) {
			res = res.toFixed(3);
			ending = 's';
		} else if (res >= 0.001) {
			res = (res * 1000).toFixed(3);
			ending = 'ms';
		} else if (res >= 0.000001) {
			res = (res * 1000000).toFixed(3);
			ending = 'us';
		} else if (res >= 0.000000001) {
			res = (res * 1000000000).toFixed(3);
			ending = 'ns';
		}
		return res.toString() + ending;
	};
	this.testResults = function() {
		var defered = q.defer();
		console.log('Start Time', startTime);
		console.log('End Time', endTime);
		var RT = convToSec(endTime) - convToSec(startTime); 
		console.log('Run Time', RT);
		console.log('Iteration Time',roundRes(RT/numIterations));
		console.log('numResults', actualResults.length);


		actualResults.forEach(function(res) {
			// console.log('Result:',res);
		});
		defered.resolve();
		return defered.promise;
	};
	var self = this;
}
var tester = new createTester();


dmm.createManager()
.then(dmm.sendTestMessage)
// .then(pResp)
// .then(tester.run)
// .then(tester.testResults)
.then(dmm.stopManager,dmm.stopManager)
.then(function() {
	console.log('M: Finished!');
});
