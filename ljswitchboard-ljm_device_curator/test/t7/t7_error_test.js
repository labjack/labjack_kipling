
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
	assert.isOk(false, err);
	criticalError = true;
	done();
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
		done();
	},
	'attach listeners': function(test) {
		var events = Object.keys(driver_errors);
		events.forEach(function(eventKey) {
			device.on(eventKey, getDeviceEventListener(eventKey));
		});
		done();
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
				done();
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
			done();
		});
	},
	'test successful writing & caching of WIFI_PASSWORD_DEFAULT': function(test) {
		var netPass = 'smgmtbmb3cmtbc';
		device.iWrite('WIFI_PASSWORD_DEFAULT', netPass)
		.then(function(res) {
			device.sRead('WIFI_PASSWORD_DEFAULT')
			.then(function(res) {
				assert.strictEqual(netPass, res.val, 'Password does not match');
				done();
			});
		});
	},
	'test failed writeMultiple invalid address': function(test) {
		var results = [];
		capturedEvents = [];
		qExec(device, 'writeMultiple', ['DAC0A'], [1.0])(results)
		.then(function(res) {
			res.forEach(function(r) {
				r.retData.forEach(function(ret) {
					assert.deepEqual(
						ret,
						{'address': 'DAC0A', 'isErr': true, 'data': 'Invalid Address'}
					);
				});
			});
			assert.strictEqual(capturedEvents.length, 1);
			done();
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
					assert.strictEqual(capturedEvents.length, 2);
				} else {
					console.log('Encountered Error', err);
					setTimeout(disconnectDevice, 100);
				}
			});
		};
		var errorListener = function(data) {
			if(data.operation === 'reconnecting') {
				var ok = false;
				if(capturedEvents.length == 3) {
					ok = true;
				} else if(capturedEvents.length == 4) {
					ok = true;
				}
				assert.isOk(ok, 'Unexpected number of captured events during disconnect phase');

				try {
					device.removeListener('DEVICE_ERROR', errorListener);
					done();
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

			assert.strictEqual(res.deviceType, 7);
			assert.strictEqual(res.deviceTypeString, 'LJM_dtT7');
			done();
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
				assert.strictEqual(r.errData, driver_const.LJN_DEVICE_NOT_CONNECTED);
				// console.log(
				// 	'Error Info',
				// 	modbusMap.getErrorInfo(r.errData)
				// );
			});
			// The first read after a device disconnects should fail but report
			// a "reconnecting" error.
			// assert.strictEqual(capturedEvents.length, 1, JSON.stringify(capturedEvents, null, 2));
			done();
		});
	},
	'performTestRead (2)': function(test) {
		var results = [];
		// Setup and call functions
		qExec(device, 'read', 'AIN0')(results)
		.then(qExec(device, 'read', 'AIN0'))
		.then(function(res) {
			res.forEach(function(r) {
				assert.strictEqual(r.errData, driver_const.LJN_DEVICE_NOT_CONNECTED);
				// console.log(
				// 	'Error Info',
				// 	modbusMap.getErrorInfo(r.errData)
				// );
			});
			done();
		});
	},
	'performTestqRead': function(test) {
		var results = [];
		// Setup and call functions
		qExec(device, 'qRead', 'AIN0')(results)
		.then(qExec(device, 'read', 'AIN0'))
		.then(function(res) {
			res.forEach(function(r) {
				assert.strictEqual(r.errData, driver_const.LJN_DEVICE_NOT_CONNECTED);
			});
			done();
		});
	},
	'performTestReadMultiple': function(test) {
		var results = [];
		qExec(device, 'readMultiple', ['AIN0','AIN0'])(results)
		.then(function(res) {
			res.forEach(function(r) {
				r.retData.forEach(function(ret) {
					assert.deepEqual(
						ret,
						{'address': 'AIN0', 'isErr': true, 'data': driver_const.LJN_DEVICE_NOT_CONNECTED}
					);
				});
			});
			done();
		});
	},
	'test readMany': function(test) {
		var results = [];
		qExec(device, 'readMany', ['AIN0','AIN0'])(results)
		.then(function(res) {
			res.forEach(function(r) {
				assert.deepEqual(r.errData, {'retError': driver_const.LJN_DEVICE_NOT_CONNECTED, 'errFrame': 0});
			});
			done();
		});
	},
	'test write': function(test) {
		var results = [];
		// Setup and call functions
		qExec(device, 'write', 'DAC0', 1.0)(results)
		.then(qExec(device, 'write', 'DAC0', 1.0))
		.then(function(res) {
			res.forEach(function(r) {
				assert.strictEqual(r.errData, driver_const.LJN_DEVICE_NOT_CONNECTED);
			});
			done();
		});
	},
	'test writeMultiple': function(test) {
		var results = [];
		qExec(device, 'writeMultiple', ['DAC0','DAC0'], [1.0, 1.0])(results)
		.then(function(res) {
			res.forEach(function(r) {
				r.retData.forEach(function(ret) {
					assert.deepEqual(
						ret,
						{'address': 'DAC0', 'isErr': true, 'data': driver_const.LJN_DEVICE_NOT_CONNECTED}
					);
				});
			});
			done();
		});
	},
	'test writeMany': function(test) {
		var results = [];
		qExec(device, 'writeMany', ['DAC0','DAC0'], [1.0, 1.0])(results)
		.then(function(res) {
			res.forEach(function(r) {
				assert.deepEqual(r.errData, {'retError': driver_const.LJN_DEVICE_NOT_CONNECTED, 'errFrame': 0});
			});
			done();
		});
	},
	'test iRead': function(test) {
		var results = [];
		qExec(device, 'iRead', 'AIN0')(results)
		.then(function(execResults) {
			execResults.forEach(function(execResult) {
				// console.log('execResult', execResult);
				assert.strictEqual(
					execResult.errData.errorCode,
					driver_const.LJN_DEVICE_NOT_CONNECTED
				);
			});
			done();
		});
	},
	'test iReadMany': function(test) {
		var results = [];
		qExec(device, 'iReadMany', ['AIN0','AIN1'])(results)
		.then(function(execResults) {
			execResults.forEach(function(execResult) {
				assert.strictEqual(
					execResult.errData.errorCode,
					driver_const.LJN_DEVICE_NOT_CONNECTED
				);
			});
			done();
		});
	},
	'test iReadMultiple': function(test) {
		var results = [];
		qExec(device, 'iReadMultiple', ['AIN0','AIN1'])(results)
		.then(function(execResults) {
			execResults.forEach(function(execResult) {
				execResult.retData.forEach(function(result) {
					assert.isOk(result.isErr, 'An error should have occured');
					assert.strictEqual(
						result.data.errorCode,
						driver_const.LJN_DEVICE_NOT_CONNECTED
					);
				});
			});
			done();
		});
	},
	'test sRead': function(test) {
		var results = [];
		qExec(device, 'sRead', 'AIN0')(results)
		.then(function(execResults) {
			execResults.forEach(function(execResult) {
				assert.isOk(
					typeof(execResult.retData) !== 'undefined',
					'Result should be returned'
				);
			});
			done();
		});
	},
	'test sReadMany': function(test) {
		var results = [];
		qExec(device, 'sReadMany', ['AIN0','AIN1'])(results)
		.then(function(execResults) {
			execResults.forEach(function(execResult) {
				assert.isOk(
					typeof(execResult.retData) !== 'undefined',
					'Result should be returned'
				);
			});
			done();
		});
	},
	'test sReadMultiple': function(test) {
		var results = [];
		qExec(device, 'sReadMultiple', ['AIN0','AIN1'])(results)
		.then(function(execResults) {
			execResults.forEach(function(execResult) {
				execResult.retData.forEach(function(result) {
					assert.isOk(!result.isErr, 'An error should not have occured');
					assert.isOk(
						typeof(result.data) !== 'undefined',
						'Result should be returned'
					);
				});
			});
			done();
		});
	},
	'test reconnectToDevice': function(test) {
		var reportedToCmd = false;
		capturedEvents = [];
		var numSuccesses = 0;
		var finishTest = function() {
			if(numSuccesses > 1) {
				done();
			} else {
				console.log('  * Verifying new device attributes');
			}
		};
		var waitForReconnect = function() {
			device.read('AIN0')
			.then(function(res) {
				console.log('  - Device Reconnected');
				// assert.strictEqual(capturedEvents.length, 1, JSON.stringify(capturedEvents, null, 2));
				numSuccesses += 1;
				finishTest();
			}, function(err) {
				if(!reportedToCmd) {
					console.log('  - Please Reconnect Device');
					reportedToCmd = true;
				}
				setTimeout(waitForReconnect, 1000);
			});
		};
		device.once('DEVICE_ATTRIBUTES_CHANGED', function() {
			console.log('  - Device Attributes Updated');
			numSuccesses += 1;
			finishTest();
		});
		waitForReconnect();
	},
	'get latest device errors': function(test) {
		device.getLatestDeviceErrors()
		.then(function(data) {
			// console.log('Error Data', data);
			// data.errors.forEach(function(errData) {
			// 	console.log('Data', errData);
			// });
			var expNumErrors = 4;
			var expLengthErrors = 4;
			assert.strictEqual(data.numErrors, expNumErrors, 'Unexpected number of errors');
			assert.strictEqual(data.errors.length, expLengthErrors, 'Unexpected number of errors');
			done();
		});
	},
	'clear device errors': function(test) {
		device.clearDeviceErrors()
		.then(device.getLatestDeviceErrors)
		.then(function(data) {
			// console.log('Error Data', data);
			var expNumErrors = 0;
			var expLengthErrors = 0;
			assert.strictEqual(data.numErrors, expNumErrors, 'Unexpected number of errors');
			assert.strictEqual(data.errors.length, expLengthErrors, 'Unexpected number of errors');
			done();
		});
	},
	'disconnect device again': function(test) {
		console.log('  - Please Disconnect Device');
		device.once('DEVICE_DISCONNECTED', function() {
			console.log('  - Device Disconnected');
			done();
		});
	},
	'reconnect device again': function(test) {
		console.log('  - Please Reconnect Device');
		var receivedReconnectEvent = false;
		device.once('DEVICE_RECONNECTED', function() {
			console.log('  - Device Reconnected');
			receivedReconnectEvent = true;
			// done();
		});
		device.once('DEVICE_ATTRIBUTES_CHANGED', function() {
			console.log('  - Device Attributes Updated');
			assert.isOk(receivedReconnectEvent, 'Did not receive reconnect event');
			done();
		});
	},
	'closeDevice': function(test) {
		device.close()
		.then(function() {
			done();
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
