
/*
 * Author: Chris Johnson
 * Date: December 2019
 */
var testCase = require('mocha').describe;
var assertions = require('mocha').it;
var assert = require('chai').assert;
var equal = assert.equal;
var strictEqual = assert.strictEqual;
var deepEqual = require('deep-eql');
var rewire = require('rewire');

// Require & instantiate the mock LJM driver.
var mockDriver = require('../LabJackDriver_Testing/TestObjects/test_driver_wrapper');
var mockLJM = new mockDriver.getDriver();

// Require the device & driver libraries & over-write the mock driver.
var driverManager = rewire('../lib/driver');
driverManager.__set__('driverLib',mockDriver);
var deviceManager = rewire('../lib/device');
deviceManager.__set__('driverLib',mockDriver);

var driver_const = require('ljswitchboard-ljm_driver_constants');
var ljs_mm = require('ljswitchboard-modbus_map');
var ljm_mm = ljs_mm.getConstants();

// Locally define some LJN error codes.
var LJME_NO_ERROR = 0;
var LJME_INVALID_ADDRESS = ljm_mm.errorsByName.LJME_INVALID_ADDRESS.error;
var LJME_INVALID_DIRECTION = ljm_mm.errorsByName.LJME_INVALID_DIRECTION.error;

var LJN_INVALID_ARGUMENTS = ljm_mm.errorsByName.LJN_INVALID_ARGUMENTS.error;

var LJN_INVALID_IO_ATTEMPT = ljm_mm.errorsByName.LJN_INVALID_IO_ATTEMPT.error;

// Handle for device that gets opened.
var dev;
var testVal = 96;

testCase('Device Reading', function() {
	before(function() {
	});
	after(function() {
	});
	beforeEach(function(done) {
		// Before each test, initialize a new device object & clear the mock driver's call history.
		dev = new deviceManager.labjack(mockLJM);

		dev.open(function(res) {
			assert.ok(false, "Error in Device setup");
		},
		function(res) {
			mockDriver.clearLastFunctionCall();
			mockDriver.setExpectedResult(0);
			mockDriver.clearArgumentsList();
			done();
		});
	});
	afterEach(function(done) {
		// After each test perform mock driver clean up & close the device.
		mockDriver.setExpectedResult(0);

		dev.close(function(res) {
				console.log("Err-Setup/Teardown!!!",res);
			},
			function(res) {
				mockDriver.clearLastFunctionCall();
				mockDriver.setExpectedResult(0);
				mockDriver.clearArgumentsList();
				done()
			});

	});

	/*******************************************************
	 * Begin Test Cases
	*******************************************************/
	testCase('device.read', function() {
		var tests = [
			// {func: 'read', 			errCode: LJME_NO_ERROR,			args: [0], 						mockCalls: ['LJM_eReadAddressAsync'], 		testType: true, regType: driver_const.LJM_FLOAT32, 	res: testVal},
			// {func: 'read', 			errCode: LJME_NO_ERROR,			args: ["AIN0"], 				mockCalls: ['LJM_eReadAddressAsync'], 		testType: true, regType: driver_const.LJM_FLOAT32, 	res: testVal},
			// {func: 'readSync', 		errCode: LJME_NO_ERROR,			args: [0], 						mockCalls: ['LJM_eReadAddress'], 			testType: true, regType: driver_const.LJM_FLOAT32, 	res: testVal},
			// {func: 'readSync', 		errCode: LJME_NO_ERROR,			args: ["AIN0"], 				mockCalls: ['LJM_eReadAddress'], 			testType: true, regType: driver_const.LJM_FLOAT32, 	res: testVal},
			// {func: 'read', 			errCode: LJME_NO_ERROR,			args: [60500], 					mockCalls: ['LJM_eReadAddressStringAsync'], testType: false, regType: 0, 	res: testVal.toString()},
			// {func: 'read', 			errCode: LJME_NO_ERROR,			args: ["DEVICE_NAME_DEFAULT"], 	mockCalls: ['LJM_eReadAddressStringAsync'], testType: false, regType: 0, 	res: testVal.toString()},
			// {func: 'readSync',		errCode: LJME_NO_ERROR,			args: [60500], 					mockCalls: ['LJM_eReadAddressString'], 		testType: false, regType: 0, 	res: testVal.toString()},
			// {func: 'readSync',		errCode: LJME_NO_ERROR,			args: ["DEVICE_NAME_DEFAULT"], 	mockCalls: ['LJM_eReadAddressString'], 		testType: false, regType: 0, 	res: testVal.toString()},
			{func: 'read', 			errCode: LJME_INVALID_ADDRESS, 	args: [-1], 					mockCalls: [], 								testType: false, regType: 0, 	res: testVal},
			{func: 'readSync', 		errCode: LJME_INVALID_ADDRESS, 	args: [-1], 					mockCalls: [], 								testType: false, regType: 0, 	res: testVal},
			
			// Read Many calls.
			// {func: 'readMany', 		errCode: LJME_NO_ERROR,			args: [[0,2]], 					mockCalls: ['LJM_eReadAddressesAsync'], 	testType: false, regType: 0, 	res: [testVal, testVal+1]},
			// {func: 'readMany', 		errCode: LJME_NO_ERROR,			args: [["AIN0","AIN1"]], 		mockCalls: ['LJM_eReadAddressesAsync'], 	testType: false, regType: 0, 	res: [testVal, testVal+1]},
			// {func: 'readManySync', 	errCode: LJME_NO_ERROR,			args: [[0,2]], 					mockCalls: ['LJM_eReadAddresses'], 			testType: false, regType: 0, 	res: [testVal, testVal+1]},
			// {func: 'readManySync', 	errCode: LJME_NO_ERROR,			args: [["AIN0","AIN1"]], 		mockCalls: ['LJM_eReadAddresses'], 			testType: false, regType: 0, 	res: [testVal, testVal+1]},
			// {func: 'readMany', 		errCode: LJME_INVALID_ADDRESS,	args: [[-1, -2]], 				mockCalls: [], 								testType: false, regType: 0, 	res: [testVal, testVal+1]},
			// {func: 'readManySync', 	errCode: LJME_INVALID_ADDRESS,	args: [[-1, -2]], 				mockCalls: [], 								testType: false, regType: 0, 	res: [testVal, testVal+1]},
			
			// Read array calls.
			// {func: 'readArray', 	errCode: LJME_NO_ERROR,			args: ["AIN0", 2], 				mockCalls: ['LJM_eReadAddressArrayAsync'],	testType: false, regType: 0, 	res: [testVal, testVal+1]},
			// {func: 'readArray', 	errCode: LJME_NO_ERROR,			args: [0, 2], 					mockCalls: ['LJM_eReadAddressArrayAsync'],	testType: false, regType: 0, 	res: [testVal, testVal+1]},
			// {func: 'readArraySync',	errCode: LJME_NO_ERROR,			args: ["AIN0", 2], 				mockCalls: ['LJM_eReadAddressArray'],	testType: false, regType: 0, 	res: [testVal, testVal+1]},
			// {func: 'readArraySync',	errCode: LJME_NO_ERROR,			args: [0, 2], 					mockCalls: ['LJM_eReadAddressArray'],	testType: false, regType: 0, 	res: [testVal, testVal+1]},
			// {func: 'readArray', 	errCode: LJME_INVALID_ADDRESS,	args: [-1, 2], 					mockCalls: [],								testType: false, regType: 0, 	res: [testVal, testVal+1]},
			// {func: 'readArraySync',	errCode: LJME_INVALID_ADDRESS,	args: [-1, 2], 					mockCalls: [],								testType: false, regType: 0, 	res: [testVal, testVal+1]},
		];	

		tests.forEach(function testGenerator(test, i) {

			if(test.func.indexOf('Sync') >= 0) {
				// Call & test synchronous functions
				it('step #'+i+' [device].'+test.func+'(' + test.args + ') returns: ' + test.res + ' and calls: ' + test.mockCalls, function(done) {
					mockDriver.setResultArg(test.res);
					mockDriver.setExpectedResult(test.errCode);

					var errorCode = 0;
					try {
						// Execute function
						var res = dev[test.func](test.args[0]);

						// Test result.
						deepEqual(res, test.res);

						// Test for correct .dll call.
						equal(mockDriver.getLastFunctionCall().length, test.mockCalls.length);
						for (var i = 0; i < test.mockCalls.length; i++) {
							strictEqual(mockDriver.getLastFunctionCall()[i], test.mockCalls[i])
						}
						deepEqual(mockDriver.getLastFunctionCall(), test.mockCalls);

						// Special test case to check for proper address-to-type conversion.
						if(test.testType) {
							// When appropriate, check the 2nd argument of .dll call to ensure address-to-type conversion worked.
							equal(mockDriver.getArgumentsList()[0][2], test.regType);
						}
					} catch(err) {
						errorCode = err;
						if(test.errCode === 0) {
							console.log('Unexpected error encoutered when calling test, should have passed.', test, err);
							assert.ok(false,"Unexpected read error");
						}
						equal(test.errCode, errorCode.code);

						// Test for correct .dll call.
						equal(mockDriver.getLastFunctionCall().length, test.mockCalls.length);
						for (var i = 0; i < test.mockCalls.length; i++) {
							strictEqual(mockDriver.getLastFunctionCall()[i], test.mockCalls[i])
						}
						deepEqual(mockDriver.getLastFunctionCall(), test.mockCalls);
					}

					done();
				});
			} else {
				// Call & test asynchronous functions.
				it('step #'+i+' [device].'+test.func+'(' + test.args + ') returns: ' + test.res + ' and calls: ' + test.mockCalls, function(done) {
					mockDriver.setResultArg(test.res);
					mockDriver.setExpectedResult(test.errCode);
					// Add onError callback argument.
					test.args.push(function errorCB(err) {
						if(test.errCode == 0) {
							console.log('Unexpected error encoutered when calling test, should have passed.', test, err);
							assert.ok(false, "Read Error");
						} else {
							equal(test.errCode, err.code);
							
							// Test for correct .dll call.
							equal(mockDriver.getLastFunctionCall().length, test.mockCalls.length);
							for (var i = 0; i < test.mockCalls.length; i++) {
								strictEqual(mockDriver.getLastFunctionCall()[i], test.mockCalls[i])
							}
							deepEqual(mockDriver.getLastFunctionCall(), test.mockCalls);
						}
						done()
					});

					// Add onSuccess callback argument.
					test.args.push(function successCB(res) {
						// Test result.
						deepEqual(res, test.res);

						// Test for correct .dll call.
						equal(mockDriver.getLastFunctionCall().length, test.mockCalls.length);
						for (var i = 0; i < test.mockCalls.length; i++) {
							strictEqual(mockDriver.getLastFunctionCall()[i], test.mockCalls[i])
						}
						deepEqual(mockDriver.getLastFunctionCall(), test.mockCalls);

						// Special test case to check for proper address-to-type conversion.
						if(test.testType) {
							// When appropriate, check the 2nd argument of .dll call to ensure address-to-type conversion worked.
							equal(mockDriver.getArgumentsList()[0][2], test.regType);
						}
						done();
					});
					// Call function.
					dev[test.func].apply(this, test.args);
				});
			}
		});

		
	});
});
