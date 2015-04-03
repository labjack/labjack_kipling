
var q = require('q');
var device_curator = require('../lib/device_curator');
var utils = require('./utils/utils');
var qExec = utils.qExec;

var ljm = require('labjack-nodejs');
var modbusMap = ljm.modbusMap.getConstants();
var driver_const = ljm.driver_const;
var driver_errors = driver_const.device_curator_constants;
var ljmErrors = modbusMap.errorsByNumber;

var device;
var capturedEvents = [];
var getDeviceEventListener = function(eventKey) {
	var deviceEventListener = function(eventData) {
		// console.log('Captured an event', eventKey);
		if(eventKey === 'DEVICE_ERROR') {
			// console.log('Error Data', eventData);
		}
		capturedEvents.push({'eventName': eventKey, 'data': eventData});
	};
	return deviceEventListener;
};

var criticalError = false;
var stopTest = function(test, err) {
	test.ok(false, err);
	criticalError = true;
	test.done();
};

var deviceFound = false;
var performTests = true;

var DEBUG_TEST = true;

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
	'attach listeners': function(test) {
		var events = Object.keys(driver_errors);
		events.forEach(function(eventKey) {
			device.on(eventKey, getDeviceEventListener(eventKey));
		});
		test.done();
	},
	'openDevice': function(test) {
		var reportedToCmd = false;
		var connectToDevice = function() {
			var td = {
				'dt': 'LJM_dtT7',
				'ct': 'LJM_ctUSB',
				'id': 'LJM_idANY'
			};
			// td.ct = 'LJM_ctEthernet';
			// td.ct = 'LJM_ctWifi';
			// td.id = '192.168.1.28';
			// td.id = '470010108';

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
				if(!reportedToCmd) {
					// console.log(
					// 	'Failed to open device',
					// 	err,
					// 	modbusMap.getErrorInfo(err)
					// );
					console.log('  - Please Connect a Device');
					reportedToCmd = true;
				}
				setTimeout(connectToDevice, 50);
			});
		};
		connectToDevice();
	},
	'test successful read & caching of AIN0': function(test) {
		var results = [];
		qExec(device, 'iRead', 'AIN0')(results)
		.then(function(res) {
			test.done();
		});
	},
	'test failed writeMultiple invalid address': function(test) {
		var results = [];
		capturedEvents = [];
		qExec(device, 'writeMultiple', ['DAC0A'], [1.0])(results)
		.then(function(res) {
			res.forEach(function(r) {
				r.retData.forEach(function(ret) {
					test.deepEqual(
						ret,
						{'address': 'DAC0A', 'isErr': true, 'data': 'Invalid Address'}
					);
				});
			});
			test.strictEqual(capturedEvents.length, 1);
			test.done();
		});
	},
	'disconnect device': function(test) {
		var reportedToCmd = false;
		capturedEvents = [];
		var disconnectDevice = function() {
			device.read('AIN0')
			.then(function(res) {
				if(!reportedToCmd) {
					console.log('  - Please Disconnect Device');
					reportedToCmd = true;
				}
				setTimeout(disconnectDevice, 100);
			}, function(err) {
				if(err === 1239) {
					console.log('  - Device Disconnected');
					test.strictEqual(capturedEvents.length, 2);
				} else {
					console.log('Encountered Error', err);
					setTimeout(disconnectDevice, 100);
				}
			});
		};
		var errorListener = function(data) {
			if(data.operation === 'reconnecting') {
				test.strictEqual(capturedEvents.length, 3);
				try {
					device.removeListener('DEVICE_ERROR', errorListener);
					test.done();
				}catch(err) {
					console.log('err', err);
				}
			}
		};
		device.on('DEVICE_ERROR', errorListener);
		disconnectDevice();
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
	'performTestRead (1)': function(test) {
		var results = [];
		capturedEvents = [];
		// Setup and call functions
		qExec(device, 'read', 'AIN0')(results)
		.then(qExec(device, 'read', 'AIN0'))
		.then(function(res) {
			res.forEach(function(r) {
				test.strictEqual(r.errData, driver_const.LJN_DEVICE_NOT_CONNECTED);
				// console.log(
				// 	'Error Info',
				// 	modbusMap.getErrorInfo(r.errData)
				// );
			});
			// The first read after a device disconnects should fail but report 
			// a "reconnecting" error.
			// test.strictEqual(capturedEvents.length, 1, JSON.stringify(capturedEvents, null, 2));
			test.done();
		});
	},
	'performTestRead (2)': function(test) {
		var results = [];
		// Setup and call functions
		qExec(device, 'read', 'AIN0')(results)
		.then(qExec(device, 'read', 'AIN0'))
		.then(function(res) {
			res.forEach(function(r) {
				test.strictEqual(r.errData, driver_const.LJN_DEVICE_NOT_CONNECTED);
				// console.log(
				// 	'Error Info',
				// 	modbusMap.getErrorInfo(r.errData)
				// );
			});
			test.done();
		});
	},
	'performTestqRead': function(test) {
		var results = [];
		// Setup and call functions
		qExec(device, 'qRead', 'AIN0')(results)
		.then(qExec(device, 'read', 'AIN0'))
		.then(function(res) {
			res.forEach(function(r) {
				test.strictEqual(r.errData, driver_const.LJN_DEVICE_NOT_CONNECTED);
			});
			test.done();
		});
	},
	'performTestReadMultiple': function(test) {
		var results = [];
		qExec(device, 'readMultiple', ['AIN0','AIN0'])(results)
		.then(function(res) {
			res.forEach(function(r) {
				r.retData.forEach(function(ret) {
					test.deepEqual(
						ret, 
						{'address': 'AIN0', 'isErr': true, 'data': driver_const.LJN_DEVICE_NOT_CONNECTED}
					);
				});
			});
			test.done();
		});
	},
	'test readMany': function(test) {
		var results = [];
		qExec(device, 'readMany', ['AIN0','AIN0'])(results)
		.then(function(res) {
			res.forEach(function(r) {
				test.deepEqual(r.errData, {'retError': driver_const.LJN_DEVICE_NOT_CONNECTED, 'errFrame': 0});
			});
			test.done();
		});
	},
	'test write': function(test) {
		var results = [];
		// Setup and call functions
		qExec(device, 'write', 'DAC0', 1.0)(results)
		.then(qExec(device, 'write', 'DAC0', 1.0))
		.then(function(res) {
			res.forEach(function(r) {
				test.strictEqual(r.errData, driver_const.LJN_DEVICE_NOT_CONNECTED);
			});
			test.done();
		});
	},
	'test writeMultiple': function(test) {
		var results = [];
		qExec(device, 'writeMultiple', ['DAC0','DAC0'], [1.0, 1.0])(results)
		.then(function(res) {
			res.forEach(function(r) {
				r.retData.forEach(function(ret) {
					test.deepEqual(
						ret,
						{'address': 'DAC0', 'isErr': true, 'data': driver_const.LJN_DEVICE_NOT_CONNECTED}
					);
				});
			});
			test.done();
		});
	},
	'test writeMany': function(test) {
		var results = [];
		qExec(device, 'writeMany', ['DAC0','DAC0'], [1.0, 1.0])(results)
		.then(function(res) {
			res.forEach(function(r) {
				test.deepEqual(r.errData, {'retError': driver_const.LJN_DEVICE_NOT_CONNECTED, 'errFrame': 0});
			});
			test.done();
		});
	},
	'test iRead': function(test) {
		var results = [];
		qExec(device, 'iRead', 'AIN0')(results)
		.then(function(execResults) {
			execResults.forEach(function(execResult) {
				test.strictEqual(
					execResult.errData.errorCode,
					driver_const.LJN_DEVICE_NOT_CONNECTED
				);
			});
			test.done();
		});
	},
	'test iReadMany': function(test) {
		var results = [];
		qExec(device, 'iReadMany', ['AIN0','AIN1'])(results)
		.then(function(execResults) {
			execResults.forEach(function(execResult) {
				test.strictEqual(
					execResult.errData.errorCode,
					driver_const.LJN_DEVICE_NOT_CONNECTED
				);
			});
			test.done();
		});
	},
	'test iReadMultiple': function(test) {
		var results = [];
		qExec(device, 'iReadMultiple', ['AIN0','AIN1'])(results)
		.then(function(execResults) {
			execResults.forEach(function(execResult) {
				execResult.retData.forEach(function(result) {
					test.ok(result.isErr, 'An error should have occured');
					test.strictEqual(
						result.data.errorCode,
						driver_const.LJN_DEVICE_NOT_CONNECTED
					);
				});
			});
			test.done();
		});
	},
	'test reconnectToDevice': function(test) {
		var reportedToCmd = false;
		capturedEvents = [];
		var waitForReconnect = function() {
			device.read('AIN0')
			.then(function(res) {
				console.log('  - Device Reconnected');
				// test.strictEqual(capturedEvents.length, 1, JSON.stringify(capturedEvents, null, 2));
				test.done();
			}, function(err) {
				if(!reportedToCmd) {
					console.log('  - Please Reconnect Device');
					reportedToCmd = true;
				}
				setTimeout(waitForReconnect, 1000);
			});
		};
		waitForReconnect();
	},
	'get latest device errors': function(test) {
		device.getLatestDeviceErrors()
		.then(function(data) {
			// console.log('Error Data', data);
			var expNumErrors = 3;
			var expLengthErrors = 3;
			test.strictEqual(data.numErrors, expNumErrors, 'Unexpected number of errors');
			test.strictEqual(data.errors.length, expLengthErrors, 'Unexpected number of errors');
			test.done();
		});
	},
	'clear device errors': function(test) {
		device.clearDeviceErrors()
		.then(device.getLatestDeviceErrors)
		.then(function(data) {
			// console.log('Error Data', data);
			var expNumErrors = 0;
			var expLengthErrors = 0;
			test.strictEqual(data.numErrors, expNumErrors, 'Unexpected number of errors');
			test.strictEqual(data.errors.length, expLengthErrors, 'Unexpected number of errors');
			test.done();
		});
	},
	'disconnect device again': function(test) {
		console.log('  - Please Disconnect Device');
		device.once('DEVICE_DISCONNECTED', function() {
			console.log('  - Device Disconnected');
			test.done();
		});
	},
	'reconnect device again': function(test) {
		console.log('  - Please Reconnect Device');
		device.once('DEVICE_RECONNECTED', function() {
			console.log('  - Device Reconnected');
			test.done();
		});
	},
	'closeDevice': function(test) {
		device.close()
		.then(function() {
			test.done();
		});
	}
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