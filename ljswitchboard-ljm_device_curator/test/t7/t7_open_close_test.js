
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
	assert.isOk(false, err);
	criticalError = true;
	done();
};

var deviceFound = false;
var performTests = true;

var openAndCloseMultipleTimes = function(test, numOp) {
	var td = {
		'dt': 'LJM_dtT7',
		'ct': 'LJM_ctUSB',
		'id': 'LJM_idANY'
	};

	var getOp = function() {
		var openClose = function(bundle) {
			// console.log("Bundle", bundle);
			bundle.iteration += 1;
			var defered = q.defer();
			device.open(td.dt, td.ct, td.id)
			.then(function(res) {
				td.id = res.serialNumber;
				var ljmDevice = device.getDevice();
				// console.log(
				// 	"  - Opened T7:",
				// 	res.productType,
				// 	res.connectionTypeName,
				// 	res.serialNumber,
				// 	ljmDevice.handle
				// );
				device.close()
				.then(function(res) {
					defered.resolve(bundle);
				}, function(err) {
					bundle.error = err;
					bundle.errStr = 'in device.close';
					defered.reject(bundle);
				});
			}, function(err) {
				console.log("Failed to open", err, ljm.errToStrSync(err));
				bundle.errStr = 'in device.open';
				bundle.error = err;
				defered.reject(bundle);
			});
			return defered.promise;
		};
		return openClose;
	};
	var ops = [];
	var i = 0;
	for(i = 0; i < numOp; i++) {
		ops.push(getOp());
	}
	var bundle = {
		'iteration': 0,
		'errStr': '',
		'error': 0
	};

	return ops.reduce(function(current, next) {
		if(next) {
			return current.then(next, next);
		} else {
			return current.then(testDefered.resolve, testDefered.reject);
		}
	}, q(bundle));
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
		console.log('**** t7_open_close_test ****');
		try {
			device = new device_curator.device();
		} catch(err) {
			stopTest(test, err);
		}
		done();
	},
	'openAndCloseMultipleTimes': function(test) {
		openAndCloseMultipleTimes(test, 50)
		.then(function(res) {
			assert.isOk(true);
			done();
		}, function(err) {
			assert.isOk(false, 'Failed to open/close a device' + JSON.stringify(err));
			done();
		});
	},
	'closeAllDevices': function(test) {
		ljm.closeAll(function(err){
			assert.isOk(false, 'Close All failed');
			done();
		}, function(res) {
			assert.isOk(true);
			done();
		});
	},
	'openAndCloseMultipleTimesAgain': function(test) {
		openAndCloseMultipleTimes(test, 260)
		.then(function(res) {
			assert.isOk(true);
			done();
		}, function(err) {
			assert.isOk(false, 'Failed to open/close a device' + JSON.stringify(err));
			done();
		});
	},
	'closeAllDevices': function(test) {
		ljm.closeAll(function(err){
			assert.isOk(false, 'Close All failed');
			done();
		}, function(res) {
			assert.isOk(true);
			done();
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
			console.log("  * Not Executing!!");
			try {
				done();
			} catch(err) {
				console.log("HERE", err);
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
