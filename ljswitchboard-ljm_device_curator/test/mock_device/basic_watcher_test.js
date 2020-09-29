
var q = require('q');
var register_watcher = require('../../lib/register_watcher');

function createMockDevice() {
	this.delay = 1;
	this.iReadMany = function(addresses) {
		var defered = q.defer();
		// console.log('in mock iReadMany', addresses);

		var results = addresses.map(function(address) {
			return {'name': address, 'res': 1};
		});
		setTimeout(function() {
			defered.resolve(results);
		}, self.delay);
		return defered.promise;
	};
	var self = this;
}

var mockDevice = new createMockDevice();
var registerWatcher;

var testWatcherName = 'test_receiver';
var watcherReceiver = function(results) {
	console.log('  * Received Updated Results', results);
};

exports.tests = {
	'create watcher object': function(test) {
		registerWatcher = new register_watcher.createRegisterWatcher(mockDevice);
		done();
	},
	'create new watcher': function(test) {
		mockDevice.delay = 1;

		registerWatcher.createWatcher(
			testWatcherName,
			watcherReceiver
		).then(function(name) {
			assert.strictEqual(
				name,
				testWatcherName,
				'invalid created watcher name'
			);
			done();
		});
	},
	'configure watcher': function(test) {
		registerWatcher.configureWatcher(
			testWatcherName,
			[{'registers': ['AIN0'],'ms': 100},
			{'registers': ['AIN2'],'ms': 200},]
		).then(function(name) {
			assert.strictEqual(
				name,
				testWatcherName,
				'invalid watcher results'
			);
			done();
		});
	},
	'wait for data': function(test) {
		var finishWaiting = function() {
			done();
		};
		var timer = setTimeout(finishWaiting, 520);
	},
	'stop watcher': function(test) {
		registerWatcher.stopWatcher(testWatcherName)
		.then(function(result) {
			var expectedResult = {
				'name': result.name,
				'statistics': {
					numSkipped: 0,
					numReads: 6,
					numErrors: 0,
					numReadResults: 6,
					numUpdates: 1
				}
			};
			assert.deepEqual(
				result,
				expectedResult,
				'invalid watcher name'
			);
			done();
		});
	},
	'increase delay': function(test) {
		mockDevice.delay = 210;
		done();
	},
	'create new watcher (2)': function(test) {
		registerWatcher.createWatcher(
			testWatcherName,
			watcherReceiver
		).then(function(name) {
			assert.strictEqual(
				name,
				testWatcherName,
				'invalid created watcher name'
			);
			done();
		});
	},
	'configure watcher (2)': function(test) {
		registerWatcher.configureWatcher(
			testWatcherName,
			[{'registers': ['AIN0'],'ms': 100},
			{'registers': ['AIN2'],'ms': 200},]
		).then(function(name) {
			assert.strictEqual(
				name,
				testWatcherName,
				'invalid watcher name'
			);
			done();
		});
	},
	'wait for data (2)': function(test) {
		var finishWaiting = function() {
			done();
		};
		var timer = setTimeout(finishWaiting, 520);
	},
	'stop watcher (2)': function(test) {
		registerWatcher.stopWatcher(testWatcherName)
		.then(function(result) {
			var expectedResult = {
				'name': result.name,
				'statistics': {
					numSkipped: 4,
					numReads: 2,
					numErrors: 0,
					numReadResults: 2,
					numUpdates: 1
				}
			};
			assert.deepEqual(
				result,
				expectedResult,
				'invalid watcher name'
			);
			done();
		});
	},
	'stop remaining watchers': function(test) {
		registerWatcher.stopAllWatchers()
		.then(function(names) {
			assert.deepEqual(
				names,
				[],
				'invalid watcher names'
			);
			done();
		})
	},
};
