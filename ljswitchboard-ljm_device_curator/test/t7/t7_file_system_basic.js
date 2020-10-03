
var q = require('q');
var device_curator = require('../../lib/device_curator');
var utils = require('../utils/utils');
var qExec = utils.qExec;
var ljm_ffi = require('ljm-ffi');
var ljm = ljm_ffi.load();
var ljmb = require('ljswitchboard-modbus_map');
var modbus_map = ljmb.getConstants();

var path = require('path');
var fs = require('fs');

var device;
var capturedEvents = [];

var criticalError = false;
var stopTest = function(test, err) {
	assert.isOk(false, err);
	criticalError = true;
	done();
};

var deviceFound = false;
var performTests = true;

var DEBUG_TEST = false;
var DEBUG_FILE_SYSTEM_OPERATIONS = false;
var DEBUG_FILE_SYSTEM_GET_CWD = false;
var DEBUG_FILE_SYSTEM_GET_LS = false;
var DEBUG_FILE_SYSTEM_GET_CD = false;
var DEBUG_FILE_SYSTEM_GET_DISK_INFO = false;
var DEBUG_FILE_SYSTEM_READ_FILE = false;
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

var foundFiles = [];
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
		console.log('**** t7_file_system_basic ****');
		console.log('**** Please connect 1x T7-Pro via USB ****');
		console.log('**** This test executes basic file system calls ****');
		console.log('**** but does not require there to be any files ****');
		console.log('**** already on the uSD card.                   ****');
		try {
			device = new device_curator.device();
		} catch(err) {
			stopTest(test, err);
		}
		done();
	},
	'close all open devices': function(test) {
		ljm.LJM_CloseAll();
		done();
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
			done();
		}, function(err) {
			console.log('Failed to open device', err);
			var info = modbus_map.getErrorInfo(err);
			console.log('Error Code', err);
			console.log('Error Name', info.string);
			console.log('Error Description', info.description);
			performTests = false;
			device.destroy();
			done();
		});
	},
	'checkDeviceInfo': function(test) {
		device.getDeviceAttributes()
		.then(function(res) {
			var keys = Object.keys(res);

			assert.strictEqual(res.deviceType, 7);
			assert.strictEqual(res.deviceTypeString, 'LJM_dtT7');
			done();
		});
	},
	'change directory to root': function(test) {
		debugCD('  - changing directories cd /');
		device.changeDirectory({'path': '/'})
		.then(function(res) {
			debugCD('  - performed cd:', res);
			testLog('  - performed cd:'.green, res);
			done();
		}, function(err) {
			errorLog('ERROR!!', err);
			assert.isOk(false,'Should not have received an error...');
			done();
		});
	},
	'get cwd': function(test) {
		debugCWD('  - Getting Device CWD.');
		device.getCWD()
		.then(function(res) {
			debugCWD('  - Got CWD', res);
			testLog('  - Got CWD:'.green, res);
			done();
		}, function(err) {
			errorLog('ERROR!!', err);
			assert.isOk(false,'Should not have received an error...');
			done();
		});
	},
	'get file listing - root': function(test) {
		debugLS('  - Getting File Listing, "ls".');
		device.readdir({path:'/'})
		.then(function(res) {
			debugLS('  - Got ls:', res.fileNames);
			testLog('  - CWD:'.green, res.cwd);
			testLog('  - Path:'.green, res.path);
			testLog('  - File Names:'.green, res.fileNames);
			testLog('  - File Array:'.green, res.files.length);
			// console.log('!!- ls:', res);
			done();
		}, function(err) {
			errorLog('ERROR!!', err);
			assert.isOk(false,'Should not have received an error...');
			done();
		});
	},
	'get file listing - cwd': function(test) {
		debugLS('  - Getting File Listing, "ls".');
		device.readdir()
		.then(function(res) {
			debugLS('  - Got ls:', res.fileNames);
			testLog('  - CWD:'.green, res.cwd);
			testLog('  - Path:'.green, res.path);
			testLog('  - File Names:'.green, res.fileNames);
			testLog('  - File Array:'.green, res.files.length);
			// console.log('!!- ls:', res);
			foundFiles = res.files;
			done();
		}, function(err) {
			errorLog('ERROR!!', err);
			assert.isOk(false,'Should not have received an error...');
			done();
		});
	},
	'read first found file': function(test) {
		if(foundFiles.length > 0) {
			var firstFile = foundFiles[0];
			if(firstFile.isFile) {
				testLog('  - Reading File:'.green, firstFile.path);
				device.readFile({path:firstFile.path})
				.then(function(res) {
					debugRF('  - File Contents:', res.data);
					testLog('  - File Contents:'.green, res.data.substring(0,10) + '... (' + res.data.length + ')');
					done();
				}, function(err) {
					errorLog('ERROR!!', err);
					assert.isOk(false,'Should not have received an error...');
					done();
				});
			} else {
				testLog('No files were found');
				done();
			}
		} else {
			testLog('No files were found');
			done();
		}
	},
	'get disk information': function(test) {
		debugDiskInfo('  - Get disk Info');
		device.getDiskInfo()
		.then(function(res) {
			var infoToReport = {};
			infoToReport.totalSize = res.totalSize.str;
			infoToReport.freeSpace = res.freeSpace.str;
			infoToReport.fileSystem = res.fileSystem;
			debugDiskInfo('  - Disk Info'.green, infoToReport);
			testLog('  - Disk Info:'.green, infoToReport);
			done();
		}, function(err) {
			errorLog('ERROR!!', err);
			assert.isOk(false,'Should not have received an error...');
			done();
		});
	},
	'closeDevice': function(test) {
		device.close()
		.then(function() {
			done();
		});
	},
	'close all devices': function(test) {
		ljm.LJM_CloseAll();
		done();
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
