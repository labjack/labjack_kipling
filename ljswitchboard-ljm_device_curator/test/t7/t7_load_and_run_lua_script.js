
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
	test.ok(false, err);
	criticalError = true;
	test.done();
};

var deviceFound = false;
var performTests = true;

var DEBUG_TEST = false;

var luaScriptData = '';
var luaScriptDataArray = [];

var checkSDCardLuaScriptName = 'check_sd_card.lua';
var luaScriptDirectory = path.join('test', 'lua_scripts');
var cwd = process.cwd();
var luaScriptsPath = path.join(cwd,luaScriptDirectory);
var checkSDCardLuaScriptPath = path.join(luaScriptsPath, checkSDCardLuaScriptName);

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
		console.log('**** t7_load_and_run_lua_script ****');
		console.log('**** Please connect 1x T7 via USB ****');
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
	// 'load lua script file': function(test) {
	// 	// console.log('Loading script', checkSDCardLuaScriptPath);
	// 	fs.readFile(checkSDCardLuaScriptPath, function(err, data) {
	// 		if(err) {
	// 			console.log('Error Loading Lua Script', err);
	// 			test.ok(false, 'could not load the lua script');
	// 		} else {
	// 			luaScriptData = data.toString();
	// 			test.ok(true, 'loaded lua script');
	// 		}
	// 		test.done();
	// 	});
	// },
	'stopping lua script': function(test) {
		console.log('  - Stopping Lua Script.');
		device.stopLuaScript()
		.then(function(res) {
			console.log('  - Lua Script Stopped.', res);
			test.done();
		}, function(err) {
			test.done();
		});
	},
	'load lua script': function(test) {
		device.loadLuaScript({
			'filePath': checkSDCardLuaScriptPath,
		})
		.then(function(res) {
			console.log('Finished Loading Script', res);
			test.ok(true, 'Finished loading script');
			test.done();
		}, function(err) {
			console.log('Error loading script', err);
			test.ok(false, 'Error loading script');
			test.done();
		});
	},
	// 'allocate script space on device': function(test) {
	// 	// Add space for 3 null characters.
 //        // sourceSize += 3;

	// 	var scriptLength = luaScriptData.length + 3;

	// 	device.iWrite('LUA_SOURCE_SIZE', scriptLength)
	// 	.then(function(res) {
	// 		test.ok(true);
	// 		test.done();
	// 	}, function(err) {
	// 		test.ok(false, 'Failed to allocate script...');
	// 		test.done();
	// 	});
	// },
	// 'generate script data array': function(test) {
 //        var luaSourceBuf;
 //        luaScriptDataArray = [];
 //        try {
 //            luaSourceBuf = JSON.parse(JSON.stringify(luaScriptData));
 //            for(var i = 0; i < luaSourceBuf.length; i++) {
 //                luaScriptDataArray.push(luaSourceBuf.charCodeAt(i));
 //            }

 //            // Add 3 null characters
 //            luaScriptDataArray.push(0);
 //            luaScriptDataArray.push(0);
 //            luaScriptDataArray.push(0);
 //            test.ok(true);
 //        } catch(err) {
 //            console.error('Not writing source, in luaDeviceController.writeLuaScript', err);
 //            test.ok(false, 'Failed....');
 //        }
 //        test.done();
	// },
	// 'save script to device': function(test) {
	// 	// Perform Device IO
 //        console.log('Writing Data', luaScriptDataArray.length);
 //        device.writeArray('LUA_SOURCE_WRITE',luaScriptDataArray)
 //        .then(
 //            function(data) {
 //            	test.ok(true, 'Saved script to device');
 //                test.done();
 //            },
 //            function(err) {
 //                console.error('Error on SRC write',err);
 //                try {
 //                    console.error('Error Info', modbus_map.getErrorInfo(err));
 //                } catch(newErr) {
 //                    //
 //                }
 //                test.ok(false, 'Failed to write lua script');
 //                test.done();
 //            }
 //        );
	// },
	'starting lua script': function(test) {
		console.log('  - Starting Lua Script.');
		device.startLuaScript()
		.then(function(res) {
			console.log('  - Lua Script Started.', res);
			test.done();
		}, function(err) {
			test.done();
		});
	},
	'wait for script to stop': function(test) {
		console.log('  - Waiting for Lua script to run.');
		var reg = 'LUA_RUN';
		var evalStr = 'x === 0';
		var maxAttempts = 10;
		var delay = 500;
		var readOptions = {
			'register': reg,
			'evalStr': evalStr,
			'maxAttempts': maxAttempts,
			'delay': delay,
		};
		device.readAndEvaluate(readOptions)
		.then(function(res) {
			console.log('  - Lua Script Finished?', res);
			test.done();
		}, function(err) {
			test.done();
		});
	},
	'closeDevice': function(test) {
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