
var q = require('q');
var async = require('async');

var deviceDataCollectors;


function getTriggerLoggerTest(numReads, interval, dataToRead) {
	var readEvents = [];
	for(var i = 0; i < numReads; i++) {
		readEvents.push(i);
	}
	return function triggerLoggerTest(test) {
		// var numIterations = 0;
		// var intervalHandler = setInterval(function() {
		// 	console.log('in interval...');
		// 	var promises = deviceDataCollectors.map(function(deviceDataCollector, i) {
		// 		// trigger the deviceDataCollector to start a new read for dummy data.
		// 		return deviceDataCollector.startNewRead(dataToRead, readEvent);
		// 	});

		// 	q.allSettled(promises)
		// 	.then(function() {
		// 		// Properly started...
		// 		numIterations += 1;
		// 		if(numIterations > numReads) {
		// 			clearInterval(intervalHandler);
		// 			test.done();
		// 		}
		// 	})
		// }, interval);
		async.eachSeries(
			readEvents,
			function(readEvent, cb) {
				 var promises = deviceDataCollectors.map(function(deviceDataCollector, i) {
				 	// trigger the deviceDataCollector to start a new read for dummy data.
				 	return deviceDataCollector.startNewRead(dataToRead, readEvent);
				 });

				q.allSettled(promises)
				.then(function() {
					if(interval > 0) {
						setTimeout(function() {
							cb();
						}, interval);
					} else if(interval === 0) {
						setImmediate(function() {
							cb();
						});
					} else {
						cb();
					}
				});
			},
			function(err) {
				test.done();
			});
	};
}

exports.getTriggerLoggerTest = getTriggerLoggerTest;
exports.setDataCollectors = function(data) {
	deviceDataCollectors = data;
};