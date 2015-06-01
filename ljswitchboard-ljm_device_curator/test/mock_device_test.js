
var q = require('q');
var device_curator = require('../lib/device_curator');
var utils = require('./utils/utils');
var qExec = utils.qExec;
var data_parser = require('ljswitchboard-data_parser');

var device;

var criticalError = false;
var stopTest = function(test, err) {
	test.ok(false, err);
	criticalError = true;
	test.done();
};

deviceFound = false;

exports.tests = {
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
		console.log('**** mock_device_test ****');
		try {
			device = new device_curator.device(true);
		} catch(err) {
			stopTest(test, err);
		}
		test.done();
	},
	'openDevice': function(test) {
		var td = {
			'dt': 'LJM_dtANY',
			'ct': 'LJM_ctANY',
			'id': 'LJM_idANY'
		};

		device.open(td.dt, td.ct, td.id)
		.then(function(res) {
			deviceFound = true;
			test.done();
		}, function(err) {
			test.done();
		});
	},
	'checkDeviceInfo': function(test) {
		device.getDeviceAttributes()
		.then(function(res) {
			var keys = Object.keys(res);

			test.strictEqual(res.deviceType, 7);
			test.strictEqual(res.deviceTypeString, 'LJM_dtT7');
			test.strictEqual(res.connectionType, 1);
			test.strictEqual(res.connectionTypeString, 'LJM_ctUSB');
			test.done();
		});
	},
	'perform test write': function(test) {
		var testVal = 1;
		device.read('DAC0')
		.then(function(initialRes) {
			test.strictEqual(initialRes, 0, 'Invalid initial DAC0 value');
			device.write('DAC0', testVal)
			.then(function(res) {
				device.read('DAC0')
				.then(function(res) {
					test.strictEqual(res, testVal, 'Invalid DAC0 value after write');
					test.done();
				});
			});
		});
	},
	'performTest Read': function(test) {
		if(device.isMockDevice) {
			var dev = device.getDevice();
			dev.clearCalledFunctions();

			// Add expected results
			dev.pushResult('read', false, 'testData');
			dev.pushResult('read', false, 0);

			// Setup and call functions
			var results = [];
			qExec(device, 'read', 'AIN0')(results)
			.then(qExec(device, 'read', 'AIN0'))
			.then(function(res) {
				var expectedResult = [
					{'functionCall': 'read', 'retData': 'testData'},
					{'functionCall': 'read', 'retData': 0}
				];
				var msg = 'mock device not working (read)';
				test.deepEqual(expectedResult, res, msg);
				test.done();
			});
		} else {
			test.done();
		}
	},
	'performTest AnalogRead': function(test) {
		var results = [];
		// Setup and call functions
		qExec(device, 'read', 'AIN0')(results)
		.then(qExec(device, 'read', 'AIN0'))
		.then(function(res) {
			var expectedResult = [
				{'functionCall': 'read', 'type': 'range', 'min': -11, 'max': 11},
				{'functionCall': 'read', 'type': 'range', 'min': -11, 'max': 11}
			];
			utils.testResults(test, expectedResult, res);
			test.done();
		});
	},
	'performTest qRead': function(test) {
		if(device.isMockDevice) {
			var dev = device.getDevice();
			dev.clearCalledFunctions();

			// Add expected results (force two 2358 failures)
			var i = 0;
			for(i = 0; i < 1; i ++) {
				dev.pushResult('read', true, 2358);
			}
			dev.pushResult('read', false, 0);
			dev.pushResult('read', false, 0);

			// Setup and call functions
			var results = [];
			qExec(device, 'qRead', 'AIN0')(results)
			.then(qExec(device, 'read', 'AIN0'))
			.then(function(res) {
				var expectedResult = [
					{'functionCall': 'qRead', 'retData': 0},
					{'functionCall': 'read', 'retData': 0}
				];
				var msg = 'mock device not working (read)';
				test.deepEqual(res, expectedResult, msg);

				msg = 'message re-try scheme failed';
				var functionList = dev.getCalledFunctions();
				test.strictEqual(functionList.length, 3, msg);
				test.done();
			});
		} else {
			console.log("* Skipping Test");
			test.done();
		}
	},
	'performTest readArray': function(test) {
		if(device.isMockDevice) {
			var dev = device.getDevice();
			dev.clearCalledFunctions();

			var testFunc = 'readArray';
			var splitSize = 52;
			var testArrays = [
				{'data': [0, 1, 2, 3, 4]},
			];
			var createAndAddLongData = [
				{'numVals': 53},
				{'numVals': 103},
				{'numVals': 110},
			];

			createAndAddLongData.forEach(function(dataInfo) {
				var testData, i;
				testData = [];
				for(i = 0; i < dataInfo.numVals; i++) {
					testData.push(i);
				}
				testArrays.push({'data': testData});
			});

			var totalNumExpectedCalls = 0;

			var testVals = testArrays.map(function(testArray) {
				var forcedResults = [];
				var originalArray = testArray.data.map(function(dataPt) {
					return dataPt;
				});
				var dataLength = originalArray.length;
				var numFullPackets = Math.floor(dataLength / splitSize);
				for(var i = 0; i < numFullPackets; i++) {
					forcedResults.push({
						'isError': false,
						'res':testArray.data.splice(0, splitSize),
					});
				}
				var remainder = dataLength % splitSize;
				var expectedNumCalls = numFullPackets;
				if(remainder !== 0) {
					expectedNumCalls += 1;
					forcedResults.push({
						'isError': false,
						'res': testArray.data.splice(0, remainder),
					});
				}

				totalNumExpectedCalls += expectedNumCalls;

				return {
					'address': 'LUA_DEBUG_DATA',
					'data': dataLength,
					'forcedResults': forcedResults,
					'result': originalArray,
					'expectedNumCalls': expectedNumCalls,
				};
			});

			// Add forced results to the mock-device
			testVals.forEach(function(testVal) {
				testVal.forcedResults.forEach(function(forcedResult) {
					dev.pushResult(
						testFunc,
						forcedResult.isErr,
						forcedResult.res
					);
				});
			});

			// Build expected-results array
			var expectedResults = testVals.map(function(testVal) {
				return {
					'functionCall': testFunc,
					'retData': testVal.result,
				};
			});

			// Chain and execute functions
			var results = [];
			var promises;
			testVals.forEach(function(testVal, i) {
				if(i === 0) {
					promises = qExec(
						device,
						testFunc,
						testVal.address,
						testVal.data
					)(results);
				} else {
					promises = promises.then(qExec(
						device,
						testFunc,
						testVal.address,
						testVal.data
					));
				}
			});
			promises.then(function(res) {
				// Quit the test if new testVals need to be added that weren't
				// added.
				if(res.length !== testVals.length) {
					console.log();
					console.log('!!! Need to add the testVals array !!!', res.length, testVals.length);
					process.exit();
				}

				var msgA = 'mock device not working (readArray)';
				test.deepEqual(res, expectedResults, msgA);

				// Check to make sure there were the right number of calls
				var calledFuncs = dev.getCalledFunctions();

				// console.log('Called Functions', calledFuncs);
				var msgB = 'Wrong number of readArray function calls executed. ';
				msgB += calledFuncs.length.toString();
				msgB += ' != ';
				msgB += totalNumExpectedCalls.toString();

				test.equal(calledFuncs.length, totalNumExpectedCalls, msgB);

				test.done();
			});
		} else {
			console.log('* Skipping Test');
			test.done();
		}
	},
	'performTest writeArray': function(test) {
		if(device.isMockDevice) {
			var dev = device.getDevice();
			dev.clearCalledFunctions();

			var testFunc = 'writeArray';
			var splitSize = 52;
			var testArrays = [{
				'data': [0, 1, 2, 3, 4],
			}, {
				'data': '01234',
			}];

			var createAndAddLongData = [
				{'type': 'array', 'length': 53},
				{'type': 'string', 'length': 53},
				{'type': 'array', 'length': 103},
				{'type': 'string', 'length': 103}
			];

			createAndAddLongData.forEach(function(dataInfo) {
				var testData, i;

				if(dataInfo.type === 'array') {
					testData = [];
					for(i = 0; i < dataInfo.length; i++) {
						testData.push(i);
					}
				} else if(dataInfo.type === 'string') {
					testData = '';
					for(i = 0; i < dataInfo.length; i++) {
						testData += i.toString();
					}
				}
				testArrays.push({'data': testData});
			});

			
			var totalNumExpectedCalls = 0;

			var testVals = testArrays.map(function(testArray) {
				var numFullPackets = Math.floor(testArray.data.length / splitSize);
				var remainder = testArray.data.length % splitSize;
				var expectedNumCalls = numFullPackets;
				if(remainder !== 0) {
					expectedNumCalls += 1;
				}

				totalNumExpectedCalls += expectedNumCalls;

				return {
					'address': 'LUA_SOURCE_WRITE',
					'data': testArray.data,
					'forcedResult': {'isError': false, 'res': undefined},
					'result': undefined,
					'expectedNumCalls': expectedNumCalls,
				};
			});


			// Add forced results to the mock-device
			testVals.forEach(function(testVal) {
				dev.pushResult(
					testFunc,
					testVal.forcedResult.isErr,
					testVal.forcedResult. res
				);
			});

			// Build expected-results array
			var expectedResults = testVals.map(function(testVal) {
				return {
					'functionCall': testFunc,
					'retData': testVal.result,
				};
			});


			var results = [];
			var promises;
			testVals.forEach(function(testVal, i) {
				if(i === 0) {
					promises = qExec(
						device,
						testFunc,
						testVal.address,
						testVal.data
					)(results);
				} else {
					promises = promises.then(qExec(
						device,
						testFunc,
						testVal.address,
						testVal.data
					));
				}
			});
			promises.then(function(res) {
				// Quit the test if new testVals need to be added that weren't
				// added.
				if(res.length !== testVals.length) {
					console.log();
					console.log('!!! Need to add the testVals array !!!', res.length, testVals.length);
					process.exit();
				}

				var msgA = 'mock device not working (writeArray)';
				test.deepEqual(res, expectedResults, msgA);

				// Check to make sure there were the right number of calls
				var calledFuncs = dev.getCalledFunctions();

				var msgB = 'Wrong number of writeArray function calls executed. ';
				msgB += calledFuncs.length.toString();
				msgB += ' != ';
				msgB += totalNumExpectedCalls.toString();

				test.equal(calledFuncs.length, totalNumExpectedCalls, msgB);

				test.done();
			});
		} else {
			console.log('* Skipping Test');
			test.done();
		}
	},
	'performTest ReadMultiple': function(test) {
		if(device.isMockDevice) {
			var dev = device.getDevice();
			dev.clearCalledFunctions();

			// Add expected results (force one 2358 failures)
			var i = 0;
			for(i = 0; i < 1; i ++) {
				dev.pushResult('read', true, 2358);
			}
			dev.pushResult('read', false, 0);
			dev.pushResult('read', false, 0);

			var results = [];
			qExec(device, 'readMultiple', ['AIN0','AIN0'])(results)
			.then(function(res) {
				var expectedRes = [
					{
						'functionCall': 'readMultiple',
						'retData': [
							{'address': 'AIN0', 'isErr': false, 'data': 0},
							{'address': 'AIN0', 'isErr': false, 'data': 0}
						]
					}
				];
				var msg = 'mock readMultiple failed';
				test.deepEqual(res, expectedRes, msg);
				// console.log("readMultiple res", res[0].retData);
				// console.log("readMultiple funcs", dev.getCalledFunctions());
				
				var functionList = dev.getCalledFunctions();
				msg = 'did not call proper functions';
				test.strictEqual(functionList.length, 3, msg);
				test.done();
			});
		} else {
			console.log("* Skipping Test");
			test.done();
		}
	},
	'closeDevice': function(test) {
		device.close()
		.then(function() {
			test.done();
		});
	},
	'openDevice (assigned serial number)': function(test) {
		var td = {
			'dt': 'LJM_dtT7',
			'ct': 'LJM_ctANY',
			'id': 470010548
		};

		device.open(td.dt, td.ct, td.id)
		.then(function(res) {
			deviceFound = true;
			test.done();
		}, function(err) {
			test.done();
		});
	},
	'checkDeviceInfo (assigned serial number)': function(test) {
		device.getDeviceAttributes()
		.then(function(res) {
			var keys = Object.keys(res);
			test.strictEqual(res.deviceType, 7);
			test.strictEqual(res.deviceTypeString, 'LJM_dtT7');
			test.strictEqual(res.connectionType, 1);
			test.strictEqual(res.connectionTypeString, 'LJM_ctUSB');
			test.strictEqual(res.serialNumber, 470010548);
			test.done();
		});
	},
	'closeDevice (assigned serial number)': function(test) {
		device.close()
		.then(function() {
			test.done();
		});
	},
	'createDigitDevice': function(test) {
		try {
			device = new device_curator.device(true);
		} catch(err) {
			stopTest(test, err);
		}
		test.done();
	},
	'openDigit': function(test) {
		var td = {
			'dt': 'LJM_dtDIGIT',
			'ct': 'LJM_ctUSB',
			'id': 'LJM_idANY'
		};

		device.open(td.dt, td.ct, td.id)
		.then(function(res) {
			deviceFound = true;
			test.done();
		}, function(err) {
			test.done();
		});
	},
	'checkDigitDeviceInfo': function(test) {
		device.getDeviceAttributes()
		.then(function(res) {
			test.strictEqual(res.deviceType, 200);
			test.strictEqual(res.deviceTypeString, 'LJM_dtDIGIT');
			test.strictEqual(res.connectionType, 1);
			test.strictEqual(res.connectionTypeString, 'LJM_ctUSB');
			test.done();
		});
	},
	'readTemp': function(test) {
		var dev = device.getDevice();
		dev.clearCalledFunctions();

		var results = [];
		qExec(device, 'digitRead', 'DGT_HUMIDITY_RAW')(results)
		.then(qExec(device, 'digitRead', 'DGT_HUMIDITY_RAW'))
		.then(qExec(device, 'updateFirmware', 'testURL'))
		.then(function(res) {
			var expectedResult = [
				{'functionCall': 'digitRead', 'retData': 0},
				{'functionCall': 'digitRead', 'retData': 0},
				{
					'functionCall': 'updateFirmware',
					'errData': 'Function not supported for deviceType: 200'
				},
			];
			var msg = 'mock device not working (digitRead)';
			test.deepEqual(res, expectedResult, msg);
			test.done();
		});
	},
	'closeDigit': function(test) {
		device.close()
		.then(function() {
			test.done();
		});
	},
};