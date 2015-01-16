
var q = require('q');
var async = require('async');
var labjack_nodejs = require('labjack-nodejs');
var ljm = new labjack_nodejs.driver();
var device_curator = require('../lib/device_curator');
var utils = require('./utils/utils');
var qExec = utils.qExec;


var device;

var criticalError = false;
var stopTest = function(test, err) {
	test.ok(false, err);
	criticalError = true;
	test.done();
};

var deviceFound = false;
var performTests = true;

var DEBUG_TEST = false;
var PRINT_TEST_STATUS = false;
var ENABLE_LJM_LOG = false;
var PRINT_RESULTS = false;
var td = {
	'dt': 'LJM_dtT7',
	'ct': 'LJM_ctUSB',
	'id': 'LJM_idANY'
};


var settings = {
	'scansPerRead': 10000,
	'scanList': ['AIN0','AIN1','AIN2','AIN3'],
	'testRate': 80000,		// The samples/sec instead of scans/sec
	'scanRate': null,		// Will get calculated: testRate/scanList.length
	'duration': 10,			// Num seconds to stream for 
};

// Over write settings to test ethernet speeds:
// td.ct = 'LJM_ctEthernet';
// td.id = '470010548';
// settings.scansPerRead = 14950;
// settings.testRate = 114800;
// settings.duration = 40;


settings.scanRate = parseInt(
	(settings.testRate/settings.scanList.length).toFixed(0)
);

var startTime;
var endTime;

function createReadLoop(numReads) {
	var iteration = 0;
	var keysToSave = [
		'deviceBacklog',
		'ljmBacklog',
		'autoRecoveryDetected',
		'dataOffset',
		'numVals'
	];
	var getReadOp = function() {
		var readOp = function(results) {
			var innerDefered = q.defer();
			device.streamRead()
			.then(function(res) {
				var result = {'isError': false};
				if(PRINT_TEST_STATUS) {
					console.log("  - Stream Test Status:", ((res.dataOffset + 1)/numReads*100).toFixed(0) + '%');
				}
				var keys = Object.keys(res);
				keys.forEach(function(key) {
					if(key !== 'data') {
						if(keysToSave.indexOf(key) >= 0) {
							result[key] = res[key];
						}
						// console.log('  - ' + key + ': ' + JSON.stringify(res[key]));
						
					}
				});
				
				results.push(result);
				innerDefered.resolve(results);
			}, function(err) {
				// console.log("in streaRead f", err, ljm.errToStrSync(err));
				var result = {
					'isError': true,
					'code': err,
					'str': ljm.errToStrSync(err)
				};
				results.push(result);
				innerDefered.resolve(results);
			});
			return innerDefered.promise;
		};
		return readOp;
	};
	this.readLoop = function() {
		var defered = q.defer();
		var readOps = [];
		var i = 0;
		for(i = 0; i < numReads; i++) {
			readOps.push(getReadOp());
		}
		var bundle = [];
		return readOps.reduce(function(current, next) {
			if(next) {
				return current.then(next, next);
			} else {
				return current.then(testDefered.resolve, testDefered.reject);
			}
		}, q(bundle));
	};
	var self = this;
}
var streamTest = function(settings) {
	var saveStartStop = false;

	var scanPeriod = 1/settings.scanRate;
	var readPeriod = scanPeriod * settings.scansPerRead;
	var numReads = parseInt((settings.duration/readPeriod).toFixed(0));
	if(DEBUG_TEST) {
		console.log(
			'num required reads',
			JSON.stringify(settings),
			scanPeriod.toFixed(7),
			readPeriod.toFixed(5),
			settings.duration,
			numReads
		);
	}
	var defered = q.defer();
	var readLoop = new createReadLoop(numReads);

	var results = {};
	device.streamStart(
		settings.scansPerRead,
		settings.scanList,
		settings.scanRate
	).then(function(res) {
		if(DEBUG_TEST) {
			console.log("stream started");
		}
		if(saveStartStop) {
			results.streamStart = res;
		}
		startTime = new Date();
		return readLoop.readLoop();
	}, defered.reject)
	.then(function(res) {
		endTime = new Date();
		if(DEBUG_TEST) {
			console.log("readLoop finished");
		}
		results.readLoop = res;
		return device.streamStop();
	}, defered.reject)
	.then(function(res) {
		
		if(DEBUG_TEST) {
			console.log("stream stopped");
		}
		if(saveStartStop) {
			results.streamStop = res;
		}
		defered.resolve(results);
	}, defered.reject);
	return defered.promise;
};

var device_tests = {
	'setUp': function(callback) {
		if(criticalError) {
			process.exit(1);
		} else {
			callback();
		}
	},
	'tearDown': function(callback) {
		callback();
	},
	'createDevice': function(test) {
		console.log('');
		console.log('**** t7_single_channel_speed_test ****');
		try {
			device = new device_curator.device();
		} catch(err) {
			stopTest(test, err);
		}
		if(ENABLE_LJM_LOG) {
			ljm.enableLog(function(err) {
				test.ok(false, 'failed to enable the log', err);
				test.done();
			}, function(res) {
				test.done();
			});
		} else {
			test.done();
		}
	},
	'openDevice': function(test) {
		device.open(td.dt, td.ct, td.id)
		.then(function(res) {
			if(DEBUG_TEST) {
				console.log(
					"  - Opened T7:",
					res.productType,
					res.connectionTypeName,
					res.serialNumber
				);
			}
			deviceFound = true;
			test.done();
		}, function(err) {
			performTests = false;
			test.done();
		});
	},
	'checkDeviceInfo': function(test) {
		device.getDeviceAttributes()
		.then(function(res) {
			var keys = Object.keys(res);
			test.strictEqual(res.deviceType, 7);
			test.strictEqual(res.deviceTypeString, 'LJM_dtT7');
			test.done();
		});
	},
	'startBasicStream': function(test) {
		streamTest(settings)
		.then(function(res) {
				// console.log('Stream Test Results', res);
				var streamError = false;
				var numAutoRecovery = 0;
				var lastError = {};
				res.readLoop.forEach(function(result) {
					if(result.autoRecoveryDetected) {
						numAutoRecovery += 1;
					}
					if(result.isError) {
						streamError = true;
						lastError = result;
					}
					if(PRINT_RESULTS) {
						console.log(JSON.stringify(result));
					}
				});
				var testOk = true;
				if(streamError) {
					testOk = false;
					console.log('Last reported error', lastError);
				}
				if(numAutoRecovery > 0) {
					console.log(
						'Auto Recovery events detected, number of occurances:',
						numAutoRecovery
					);
					test.ok(false, 'Auto Recovery detected');
				}
				test.ok(testOk, 'stream error detected');
				test.done();
			}, function(err) {
				// End the test & report that an error has occured.
				console.log('Stream Test Failed', err, ljm.errToStrSync(err));
				test.ok(false, 'Stream failed to start');
				test.done();
			});
	},
	'checkTestDuration': function(test) {
		var testDuration = (endTime - startTime)/1000;

		console.log('  - Test Duration', testDuration);

		if(testDuration < settings.duration) {
			test.ok(
				false,
				'Test finished to quickly: ' + parseFloat(testDuration) + 's' +
				'. Should be longer than: ' + parseFloat(settings.duration) + 's.'
			);
		}
		test.done();
	},
	'closeDevice': function(test) {
		device.close()
		.then(function() {
			test.done();
		}, function(err) {
			console.log('Failure');
			test.ok(false);
			test.done();
		});
	},
};

var tests = {};
var functionKeys = Object.keys(device_tests);
var getTest = function(testFunc, key) {
	var execTest = function(test) {
		// console.log("  > t7_basic_test - " + key);
		if(performTests) {
			testFunc(test);
		} else {
			if((key === 'closeDevice') && (deviceFound)) {
				testFunc(test);
			} else {
				console.log("  * No Device Connected, Not Executing!!", key);
				try {
					test.done();
				} catch(err) {
					console.log("HERE", err);
				}
			}
		}
	};
	return execTest;
};
functionKeys.forEach(function(functionKey) {
	if ((functionKey !== 'setUp') && (functionKey !== 'tearDown')) {
		tests[functionKey] = getTest(device_tests[functionKey], functionKey);
	} else {
		tests[functionKey] = device_tests[functionKey];
	}
});
exports.tests = tests;