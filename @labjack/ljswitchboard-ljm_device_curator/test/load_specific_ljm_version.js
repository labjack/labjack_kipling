

var ljm_ffi = require('@labjack/ljm-ffi');


var approxPlatform = {
    'darwin': 'darwin',
    'mac': 'darwin',
    'win32': 'win32',
}[process.platform];
if(typeof(approxPlatform) === 'undefined') {
    approxPlatform = 'linux';
}

var LJM_VERSION_TO_TEST_FOR = {
	'linux': '1.8.7',
	'darwin': '1.8.8',
	'win32': '1.11.0'
}[approxPlatform];
var loadOptions = {
	// ljmVersion: 1.1100,
	// ljmVersion: '1-9-1',
	// ljmVersion: '1.9.1',
	ljmVersion: LJM_VERSION_TO_TEST_FOR,
	loadExact: true,
};
console.log('Loading LJM...');
var ljm = ljm_ffi.load(loadOptions);

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
		var ljmLibraryVersion = ljm.LJM_ReadLibraryConfigS('LJM_LIBRARY_VERSION', 0);
		console.log('');
		console.log('**** load_specific_ljm_version ****');
		console.log(' - Installed LJM Library Version:', ljmLibraryVersion.Value);
		test.done();
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