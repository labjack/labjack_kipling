
var q = require('q');
var device_curator = require('../../lib/device_curator');
var utils = require('../utils/utils');
var qExec = utils.qExec;
var ljm_ffi = require('@labjack/ljm-ffi');
var ljm = ljm_ffi.load();
var ljmb = require('@labjack/ljswitchboard-modbus_map');
var modbus_map = ljmb.getConstants();

var path = require('path');
var fs = require('fs');

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
var DEBUG_FILE_SYSTEM_OPERATIONS = false;
var DEBUG_FILE_SYSTEM_GET_CWD = false;
var DEBUG_FILE_SYSTEM_GET_LS = false;
var DEBUG_FILE_SYSTEM_GET_CD = false;
var DEBUG_FILE_SYSTEM_GET_DISK_INFO = false;
var DEBUG_FILE_SYSTEM_READ_FILE = true;
var DEBUG_FILE_SYSTEM_DELETE_FILE = true;
var ENABLE_ERROR_OUTPUT = true;
var ENABLE_TEST_OUTPUT = true;

function getLogger(bool) {
	return function logger() {
		if(bool) {
			console.log.apply(console, arguments);
		}
	};
}

var debugFSOps = getLogger(DEBUG_FILE_SYSTEM_OPERATIONS);
var debugCWD = getLogger(DEBUG_FILE_SYSTEM_GET_CWD);
var debugLS = getLogger(DEBUG_FILE_SYSTEM_GET_LS);
var debugCD = getLogger(DEBUG_FILE_SYSTEM_GET_CD);
var debugDiskInfo = getLogger(DEBUG_FILE_SYSTEM_GET_DISK_INFO);
var debugRF = getLogger(DEBUG_FILE_SYSTEM_READ_FILE);
var debugDF = getLogger(DEBUG_FILE_SYSTEM_DELETE_FILE);
var errorLog = getLogger(ENABLE_ERROR_OUTPUT);
var testLog = getLogger(ENABLE_TEST_OUTPUT);

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
		console.log('**** t7_file_system_verification ****');
		console.log('**** Please connect 1x T7-Pro via USB ****');
		console.log('**** This uSD card test requires that ****');
		console.log('**** certain files/folders already be ****');
		console.log('**** on the uSD card.                 ****');
		try {
			device = new device_curator.device();
		} catch(err) {
			stopTest(test, err);
		}
		test.done();
	},
	'close all open devices': function(test) {
		ljm.LJM_CloseAll();
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
			var info = modbus_map.getErrorInfo(err);
			console.log('Error Code', err);
			console.log('Error Name', info.string);
			console.log('Error Description', info.description);
			performTests = false;
			device.destroy();
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
	'get cwd': function(test) {
		debugCWD('  - Getting Device CWD.');
		device.getCWD()
		.then(function(res) {
			debugCWD('  - Got CWD', res);
			testLog('  - Got CWD:', res);
			test.done();
		}, function(err) {
			errorLog('ERROR!!', err);
			test.ok(false,'Should not have received an error...');
			test.done();
		});
	},
	'get file listing': function(test) {
		debugLS('  - Getting File Listing, "ls".');
		device.readdir()
		.then(function(res) {
			debugLS('  - Got ls:', res.fileNames);
			testLog('  - Got ls:', res.fileNames);
			test.done();
		}, function(err) {
			errorLog('ERROR!!', err);
			test.ok(false,'Should not have received an error...');
			test.done();
		});
	},
	'change directories': function(test) {
		debugCD('  - changing directories cd /Test Folder');
		device.changeDirectory({'path': '/Test Folder'})
		.then(function(res) {
			debugCD('  - performed cd:', res);
			test.done();
		}, function(err) {
			errorLog('ERROR!!', err);
			test.ok(false,'Should not have received an error...');
			test.done();
		});
	},
	'get cwd (2)': function(test) {
		debugCWD('  - Getting Device CWD.');
		device.getCWD()
		.then(function(res) {
			debugCWD('  - Got CWD', res);
			testLog('  - Got CWD:', res);
			test.done();
		}, function(err) {
			errorLog('ERROR!!', err);
			test.ok(false,'Should not have received an error...');
			test.done();
		});
	},
	'get file listing (2)': function(test) {
		debugLS('  - Getting File Listing, "ls".');
		device.readdir()
		.then(function(res) {
			debugLS('  - Got ls:', res.fileNames);
			testLog('  - Got ls:', res.fileNames);
			test.done();
		}, function(err) {
			errorLog('ERROR!!', err);
			test.ok(false,'Should not have received an error...');
			test.done();
		});
	},
	'change directories (2)': function(test) {
		debugCD('  - changing directories cd /');
		device.changeDirectory({'path': '/'})
		.then(function(res) {
			debugCD('  - performed cd:', res);
			test.done();
		}, function(err) {
			errorLog('ERROR!!', err);
			test.ok(false,'Should not have received an error...');
			test.done();
		});
	},
	'get cwd (3)': function(test) {
		debugCWD('  - Getting Device CWD.');
		device.getCWD()
		.then(function(res) {
			debugCWD('  - Got CWD', res);
			testLog('  - Got CWD:', res);
			test.done();
		}, function(err) {
			errorLog('ERROR!!', err);
			test.ok(false,'Should not have received an error...');
			test.done();
		});
	},
	'get file listing (3)': function(test) {
		debugLS('  - Getting File Listing, "ls".');
		device.readdir()
		.then(function(res) {
			debugLS('  - Got ls:', res.fileNames);
			testLog('  - Got ls:', res.fileNames);
			test.done();
		}, function(err) {
			errorLog('ERROR!!', err);
			test.ok(false,'Should not have received an error...');
			test.done();
		});
	},
	'get disk information': function(test) {
		console.log('!!!! This is not working properly. W/ 16GB uSD card.  Works with 1GB.');
		debugDiskInfo('  - Get disk Info');
		device.getDiskInfo()
		.then(function(res) {
			debugDiskInfo('  - Got Info', res);
			testLog('  - Got Info:', res);
			test.done();
		}, function(err) {
			errorLog('ERROR!!', err);
			test.ok(false,'Should not have received an error...');
			test.done();
		});
	},
	'read test file': function(test) {
		var testFileName = 'log1.csv';
		debugRF('  - Reading Test File, ', testFileName);
		device.readFile({'path': testFileName})
		.then(function(res) {
			debugRF('  - Read File...', res);
			test.done();
		}, function(err) {
			errorLog('ERROR!!', err);
			test.ok(false,'Should not have received an error...');
			test.done();
		});
	},
	'read test file (2)': function(test) {
		var testFileName = 'Test Folder/another file.txt';
		debugRF('  - Reading Test File, ', testFileName);
		device.readFile({'path': testFileName})
		.then(function(res) {
			debugRF('  - Read File...', res);
			test.done();
		}, function(err) {
			errorLog('ERROR!!', err);
			test.ok(false,'Should not have received an error...');
			test.done();
		});
	},
	'get cwd (4)': function(test) {
		debugCWD('  - Getting Device CWD.');
		device.getCWD()
		.then(function(res) {
			debugCWD('  - Got CWD', res);
			testLog('  - Got CWD:', res);
			test.done();
		}, function(err) {
			errorLog('ERROR!!', err);
			test.ok(false,'Should not have received an error...');
			test.done();
		});
	},
	'get test file preview': function(test) {
		var testFileName = 'log1.csv';
		debugRF('  - getting file preview');
		device.getFilePreview({'path': testFileName})
		.then(function(res) {
			debugRF('  - Got file preview', res);
			test.done();
		}, function(err) {
			errorLog('ERROR!!', err);
			test.ok(false,'Should not have received an error...');
			test.done();
		});
	},
	'delete test file': function(test) {
		var testFileName = 'log1.csv';
		debugDF('  - deleting file...');
		device.deleteFile({'path': testFileName})
		.then(function(res) {
			debugDF('  - Got file preview', res);
			test.done();
		}, function(err) {
			errorLog('ERROR!!', err);
			test.ok(false,'Should not have received an error...');
			test.done();
		});
	},
	'closeDevice': function(test) {
		console.log('Closing...');
		device.close()
		.then(function() {
			test.done();
		});
	},
	'close all devices': function(test) {
		ljm.LJM_CloseAll();
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