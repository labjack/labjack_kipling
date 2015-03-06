
var q = require('q');
var device_curator = require('../lib/device_curator');
var utils = require('./utils/utils');
var qExec = utils.qExec;


var device;
var capturedEvents = [];

var criticalError = false;
var stopTest = function(test, err) {
	test.ok(false, err);
	criticalError = true;
	test.done();
};

var deviceFound = false;
var performTests = true;

var DEBUG_TEST = false;

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
		console.log('**** t7_basic_test ****');
		try {
			device = new device_curator.device();
		} catch(err) {
			stopTest(test, err);
		}
		test.done();
	},
	'openDevice': function(test) {
		var td = {
			'dt': 'LJM_dtT7',
			'ct': 'LJM_ctUSB',
			'id': 'LJM_idANY'
		};

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
			// console.log('in t7_basic_test.js, openDevice', res);
			deviceFound = true;
			test.done();
		}, function(err) {
			console.log('Failed to open device', err);
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
	'configure thermocouples': function(test) {
		var results = [];
		var writes = [
			{'reg': 'AIN0_EF_INDEX', 'val': 0},
			{'reg': 'AIN0_EF_INDEX', 'val': 22},
			{'reg': 'AIN0_EF_CONFIG_B', 'val': 60052},
			{'reg': 'AIN0_EF_CONFIG_D', 'val': 1},
			{'reg': 'AIN0_EF_CONFIG_E', 'val': 0},
		];
		var regs = [];
		var vals = [];
		writes.forEach(function(write) {
			regs.push(write.reg);
			vals.push(write.val);
		});

		// Setup and call functions
		qExec(device, 'writeMultiple', regs, vals)(results)
		.then(function(res) {
			console.log('Configured Device');
			test.done();
		});
	},
	'read configuration': function(test) {
		var results = [];
		var reads = [
			'AIN0_RESOLUTION_INDEX',
			'AIN0_RANGE',
		];
		qExec(device, 'readMultiple', reads)(results)
		.then(function(res) {
			var results = res[0].retData;
			// console.log('Config', results);
			test.done();
		});
	},

	// 'configure thermocouples - medium res': function(test) {
	// 	var results = [];
	// 	var writes = [
	// 		{'reg': 'AIN0_RESOLUTION_INDEX', 'val': 8},
	// 	];
	// 	var regs = [];
	// 	var vals = [];
	// 	writes.forEach(function(write) {
	// 		regs.push(write.reg);
	// 		vals.push(write.val);
	// 	});

	// 	// Setup and call functions
	// 	qExec(device, 'writeMultiple', regs, vals)(results)
	// 	.then(function(res) {
	// 		console.log('Config medium res', res[0].retData);
	// 		test.done();
	// 	});
	// },
	// 'Establish baseline speed - medium res': function(test) {
	// 	var results = [];
	// 	var numThermocoupleReads = 1000;
	// 	var reads = [];
	// 	for(var i = 0; i < numThermocoupleReads; i++) {
	// 		reads.push('AIN0');
	// 	}
	// 	var startTime = new Date();
	// 	qExec(device, 'readMultiple', reads)(results)
	// 	.then(function(res) {
	// 		var stopTime = new Date();
	// 		var results = res[0].retData;
	// 		var isError = false;
	// 		results.forEach(function(result) {
	// 			// console.log('result', result);
	// 			if(result.isErr) {
	// 				isError = true;
	// 			}
	// 		});
	// 		var duration = (stopTime - startTime) / 1000;
	// 		// console.log('Encountered Error', isError);
	// 		// console.log('Num', results.length);
	// 		console.log('Duration', duration);
	// 		console.log('Rate', (duration/numThermocoupleReads).toFixed(4)*1000, 'ms');
	// 		test.done();
	// 	});
	// },
	// 'read thermocouples - medium res': function(test) {
	// 	var results = [];
	// 	var numThermocoupleReads = 1000;
	// 	var reads = [];
	// 	for(var i = 0; i < numThermocoupleReads; i++) {
	// 		reads.push('AIN0_EF_READ_A');
	// 	}
	// 	var startTime = new Date();
	// 	qExec(device, 'readMultiple', reads)(results)
	// 	.then(function(res) {
	// 		var stopTime = new Date();
	// 		var results = res[0].retData;
	// 		var isError = false;
	// 		results.forEach(function(result) {
	// 			// console.log('result', result);
	// 			if(result.isErr) {
	// 				isError = true;
	// 			}
	// 		});
	// 		var duration = (stopTime - startTime) / 1000;
	// 		// console.log('Encountered Error', isError);
	// 		// console.log('Num', results.length);
	// 		console.log('Duration', duration);
	// 		console.log('Rate', (duration/numThermocoupleReads).toFixed(4)*1000, 'ms');
	// 		test.done();
	// 	});
	// },
	// 'configure thermocouples - high res': function(test) {
	// 	var results = [];
	// 	var writes = [
	// 		{'reg': 'AIN0_RESOLUTION_INDEX', 'val': 9},
	// 	];
	// 	var regs = [];
	// 	var vals = [];
	// 	writes.forEach(function(write) {
	// 		regs.push(write.reg);
	// 		vals.push(write.val);
	// 	});

	// 	// Setup and call functions
	// 	qExec(device, 'writeMultiple', regs, vals)(results)
	// 	.then(function(res) {
	// 		test.done();
	// 	});
	// },
	// 'Establish baseline speed - high res': function(test) {
	// 	var results = [];
	// 	var numThermocoupleReads = 1000;
	// 	var reads = [];
	// 	for(var i = 0; i < numThermocoupleReads; i++) {
	// 		reads.push('AIN0');
	// 	}
	// 	var startTime = new Date();
	// 	qExec(device, 'readMultiple', reads)(results)
	// 	.then(function(res) {
	// 		var stopTime = new Date();
	// 		var results = res[0].retData;
	// 		var isError = false;
	// 		results.forEach(function(result) {
	// 			// console.log('result', result);
	// 			if(result.isErr) {
	// 				isError = true;
	// 			}
	// 		});
	// 		var duration = (stopTime - startTime) / 1000;
	// 		// console.log('Encountered Error', isError);
	// 		// console.log('Num', results.length);
	// 		console.log('Duration', duration);
	// 		console.log('Rate', (duration/numThermocoupleReads).toFixed(4)*1000, 'ms');
	// 		test.done();
	// 	});
	// },
	// 'read thermocouples - high res': function(test) {
	// 	var results = [];
	// 	var numThermocoupleReads = 1000;
	// 	var reads = [];
	// 	for(var i = 0; i < numThermocoupleReads; i++) {
	// 		reads.push('AIN0_EF_READ_A');
	// 	}
	// 	var startTime = new Date();
	// 	qExec(device, 'readMultiple', reads)(results)
	// 	.then(function(res) {
	// 		var stopTime = new Date();
	// 		var results = res[0].retData;
	// 		var isError = false;
	// 		results.forEach(function(result) {
	// 			// console.log('result', result);
	// 			if(result.isErr) {
	// 				isError = true;
	// 			}
	// 		});
	// 		var duration = (stopTime - startTime) / 1000;
	// 		// console.log('Encountered Error', isError);
	// 		// console.log('Num', results.length);
	// 		console.log('Duration', duration);
	// 		console.log('Rate', (duration/numThermocoupleReads).toFixed(4)*1000, 'ms');
	// 		test.done();
	// 	});
	// },
	// 'configure thermocouples - slow': function(test) {
	// 	var results = [];
	// 	var writes = [
	// 		{'reg': 'AIN0_RESOLUTION_INDEX', 'val': 12},
	// 	];
	// 	var regs = [];
	// 	var vals = [];
	// 	writes.forEach(function(write) {
	// 		regs.push(write.reg);
	// 		vals.push(write.val);
	// 	});

	// 	// Setup and call functions
	// 	qExec(device, 'writeMultiple', regs, vals)(results)
	// 	.then(function(res) {
	// 		test.done();
	// 	});
	// },
	// 'Establish baseline speed - slow': function(test) {
	// 	var results = [];
	// 	var numThermocoupleReads = 10;
	// 	var reads = [];
	// 	for(var i = 0; i < numThermocoupleReads; i++) {
	// 		reads.push('AIN0');
	// 	}
	// 	var startTime = new Date();
	// 	qExec(device, 'readMultiple', reads)(results)
	// 	.then(function(res) {
	// 		var stopTime = new Date();
	// 		var results = res[0].retData;
	// 		var isError = false;
	// 		results.forEach(function(result) {
	// 			// console.log('result', result);
	// 			if(result.isErr) {
	// 				isError = true;
	// 			}
	// 		});
	// 		var duration = (stopTime - startTime) / 1000;
	// 		// console.log('Encountered Error', isError);
	// 		// console.log('Num', results.length);
	// 		console.log('Duration', duration);
	// 		console.log('Rate', (duration/numThermocoupleReads).toFixed(4)*1000, 'ms');
	// 		test.done();
	// 	});
	// },
	// 'read thermocouples - slow': function(test) {
	// 	var results = [];
	// 	var numThermocoupleReads = 10;
	// 	var reads = [];
	// 	for(var i = 0; i < numThermocoupleReads; i++) {
	// 		reads.push('AIN0_EF_READ_A');
	// 	}
	// 	var startTime = new Date();
	// 	qExec(device, 'readMultiple', reads)(results)
	// 	.then(function(res) {
	// 		var stopTime = new Date();
	// 		var results = res[0].retData;
	// 		var isError = false;
	// 		results.forEach(function(result) {
	// 			// console.log('result', result);
	// 			if(result.isErr) {
	// 				isError = true;
	// 			}
	// 		});
	// 		var duration = (stopTime - startTime) / 1000;
	// 		// console.log('Encountered Error', isError);
	// 		// console.log('Num', results.length);
	// 		console.log('Duration', duration);
	// 		console.log('Rate', (duration/numThermocoupleReads).toFixed(4)*1000, 'ms');
	// 		test.done();
	// 	});
	// },
};

var getTCTest = function(name, resolution, numSamples) {
	var cjcResolution = 1;
	var baselineRate = 0;
	var configure = function(test) {
		var results = [];
		var writes = [
			{'reg': 'AIN0_RESOLUTION_INDEX', 'val': resolution},
			{'reg': 'AIN14_RESOLUTION_INDEX', 'val': cjcResolution},
		];
		var regs = [];
		var vals = [];
		writes.forEach(function(write) {
			regs.push(write.reg);
			vals.push(write.val);
		});

		// Setup and call functions
		qExec(device, 'writeMultiple', regs, vals)(results)
		.then(function(res) {
			test.done();
		});
	};
	var establishBaseline = function(test) {
		var results = [];
		var numThermocoupleReads = numSamples;
		var reads = [];
		for(var i = 0; i < numThermocoupleReads; i++) {
			reads.push('AIN0');
		}
		var startTime = new Date();
		qExec(device, 'readMultiple', reads)(results)
		.then(function(res) {
			var stopTime = new Date();
			var results = res[0].retData;
			var isError = false;
			results.forEach(function(result) {
				// console.log('result', result);
				if(result.isErr) {
					isError = true;
				}
			});
			var duration = (stopTime - startTime) / 1000;
			var rate = parseFloat((duration/numThermocoupleReads*1000).toFixed(4));
			baselineRate = rate;
			// console.log('Encountered Error', isError);
			// console.log('Num', results.length);
			// console.log('Duration', duration);
			console.log('Rate', rate, 'ms');
			test.done();
		});
	};
	var performAcquisition = function(test) {
		var results = [];
		var numThermocoupleReads = numSamples;
		var reads = [];
		for(var i = 0; i < numThermocoupleReads; i++) {
			reads.push('AIN0_EF_READ_A');
		}
		var startTime = new Date();
		qExec(device, 'readMultiple', reads)(results)
		.then(function(res) {
			var stopTime = new Date();
			var results = res[0].retData;
			var isError = false;
			results.forEach(function(result) {
				// console.log('result', result);
				if(result.isErr) {
					isError = true;
				}
			});
			var duration = (stopTime - startTime) / 1000;
			var rate = parseFloat((duration/numThermocoupleReads*1000).toFixed(4));
			// console.log('Encountered Error', isError);
			// console.log('Num', results.length);
			// console.log('Duration', duration);
			console.log('Rate', rate, 'ms');
			console.log('Thermocouple Overhead', parseFloat((rate - baselineRate).toFixed(4)), 'ms');
			test.done();
		});
	};
	var configuredTest = {};
	configuredTest['Configure - ' + name] = configure;
	configuredTest['Establish Baseline - ' + name] = establishBaseline;
	configuredTest['Perform Acquisition - ' + name] = performAcquisition;
	return configuredTest;
};
var tcTests = [
	{'name': 'low res', 'resolution': 1, 'numSamples': 1000},
	{'name': 'medium res', 'resolution': 8, 'numSamples': 1000},
	{'name': 'high res', 'resolution': 9, 'numSamples': 1000},
	{'name': 'slow speed', 'resolution': 12, 'numSamples': 10},
];

for(var i = 0; i < tcTests.length; i++) {
	var tcTest = getTCTest(
		tcTests[i].name,
		tcTests[i].resolution,
		tcTests[i].numSamples
	);
	var keys = Object.keys(tcTest);
	for(var j = 0; j < keys.length; j++) {
		device_tests[keys[j]] = tcTest[keys[j]];
	}
}


device_tests.closeDevice = function(test) {
	device.close()
	.then(function() {
		test.done();
	});
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
				test.done();
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