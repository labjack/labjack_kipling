/**
 * This file contains unit tests for testing functions in the 
 * LabJackDriver/device.js file.  Using "rewire" it replaces the 
 * driver_wrapper.js library with a virtual device for testing purposes.
 *
 * @author Chris Johnson (chrisjohn404)
 *
 * Module Dependencies:
 * rewire, can be installed using "npm install rewire"
 * device, should be located relatively "../labJackDriver/device.js"
 * test_driver_wrapper, should be located relatively 
 * 		"./TestObjects/test_driver_wrapper"
 */

var rewire = require('rewire');
var q = require('q');
var ref = require('ref');
var fakeDriver = require('./TestObjects/test_driver_wrapper');

var driver_wrapper = rewire('../lib/driver_wrapper');

var deviceManager = rewire('../lib/device');
deviceManager.__set__('driverLib',fakeDriver);

var driver_const = require('../lib/driver_const');

var asyncRun = require('./UtilityCode/asyncUtility');
var syncRun = require('./UtilityCode/syncUtility');

var callSequenceChecker = require('./call_sequence_checker');

var dev;
var autoOpen = false;
var autoClose = false;

var testVal = 69;

module.exports = {
	setUp: function(callback) {
		//this.mockDevice = new MockDevice();
		if(autoOpen) {
			dev = new deviceManager.labjack();
			dev.open(function(res) {
				console.log("Err-Setup/Teardown!!!");
			},
			function(res) {
				fakeDriver.clearLastFunctionCall();
				callback();
			});
		}
		else {
			callback();
		}
	},
	tearDown: function (callback) {
        // clean up
        fakeDriver.setExpectedResult(0);
        if(autoClose) {
        	dev.close(function(res) {
        		console.log("Err-Setup/Teardown!!!",res);
        	},
        	function(res) {
        		fakeDriver.clearLastFunctionCall();
        		fakeDriver.setExpectedResult(0);
        		fakeDriver.clearArgumentsList();
        		asyncRun.clearResults();
        		syncRun.clearResults();
        		callback();
        	});
        }
        else {
        	fakeDriver.clearLastFunctionCall();
        	fakeDriver.clearArgumentsList();
        	fakeDriver.setExpectedResult(0);
        	asyncRun.clearResults();
    		syncRun.clearResults();
        	callback();
        }
    },

	/**
	 * Tests the standard LJM open call.
	 * 		1. The LJM function "Open" should be called.
	 * 		2. A handle acquired.
	 * 		3. The device information saved.
	 * 		4. Function should succede at opening a device.
	 * 		5. Close a Device
	 * 
	 * @param  {[type]} test
	 * @return {[type]}
	 */
	testOpen: function(test) {
		var device = new deviceManager.labjack();
		device.open(
			driver_const.LJM_DT_ANY,
			driver_const.LJM_CT_ANY,
			"LJM_idANY",
		function(res) {
			console.log("Opening Error");
		},
		function(res) {
			//get the handle & make sure it isn't zero
			test.notStrictEqual(device.handle, null);
			test.notEqual(device.handle, 0);

			//Make sure that LJM_OpenSAsync was called
			test.equal(fakeDriver.getLastFunctionCall().length,1);
			test.equal(fakeDriver.getLastFunctionCall()[0],"LJM_OpenAsync");

			//Make sure that dtAny, ctAny, and idAny were used as variables
			test.equal(device.deviceType,driver_const.LJM_DT_ANY);
			test.equal(device.connectionType,driver_const.LJM_CT_ANY);
			test.equal(device.identifier,"LJM_idANY");
			
			//Close the Device
			device.close(
				function(res) {
					console.log("Closing Error");
				},
				function(res) {
					test.strictEqual(device.handle, null);
					test.strictEqual(device.deviceType,null);
					test.strictEqual(device.connectionType,null);
					test.strictEqual(device.identifier,null);
					test.equal(
						fakeDriver.getLastFunctionCall()[1],
						"LJM_CloseAsync"
					);
					test.done();
				});
		});
	},
	testOpenWeirdA: function(test) {
		var device = new deviceManager.labjack();
		device.open(
			"LJM_dtANY",	//Will be converted to an integer
			driver_const.LJM_CT_ANY,
			"LJM_idANY",
		function(res) {
			console.log("Opening Error");
		},
		function(res) {
			//get the handle & make sure it isn't zero
			test.notStrictEqual(device.handle, null);
			test.notEqual(device.handle, 0);

			//Make sure that LJM_OpenSAsync was called
			test.equal(fakeDriver.getLastFunctionCall().length,1);
			test.equal(fakeDriver.getLastFunctionCall()[0],"LJM_OpenAsync");

			//Make sure that dtAny, ctAny, and idAny were used as variables
			test.equal(device.deviceType,driver_const.LJM_DT_ANY);
			test.equal(device.connectionType,driver_const.LJM_CT_ANY);
			test.equal(device.identifier,"LJM_idANY");
			
			//Close the Device
			device.close(
				function(res) {
					console.log("Closing Error");
				},
				function(res) {
					test.strictEqual(device.handle, null);
					test.strictEqual(device.deviceType,null);
					test.strictEqual(device.connectionType,null);
					test.strictEqual(device.identifier,null);
					test.equal(
						fakeDriver.getLastFunctionCall()[1],
						"LJM_CloseAsync"
					);
					test.done();
				});
		});
	},
	testOpenWeirdB: function(test) {
		var device = new deviceManager.labjack();
		device.open(
			driver_const.LJM_DT_ANY,	
			"LJM_ctANY",	//Will be converted to an integer
			"LJM_idANY",
		function(res) {
			console.log("Opening Error");
		},
		function(res) {
			//get the handle & make sure it isn't zero
			test.notStrictEqual(device.handle, null);
			test.notEqual(device.handle, 0);

			//Make sure that LJM_OpenSAsync was called
			test.equal(fakeDriver.getLastFunctionCall().length,1);
			test.equal(fakeDriver.getLastFunctionCall()[0],"LJM_OpenAsync");

			//Make sure that dtAny, ctAny, and idAny were used as variables
			test.equal(device.deviceType,driver_const.LJM_DT_ANY);
			test.equal(device.connectionType,driver_const.LJM_CT_ANY);
			test.equal(device.identifier,"LJM_idANY");
			
			//Close the Device
			device.close(
				function(res) {
					console.log("Closing Error");
				},
				function(res) {
					test.strictEqual(device.handle, null);
					test.strictEqual(device.deviceType,null);
					test.strictEqual(device.connectionType,null);
					test.strictEqual(device.identifier,null);
					test.equal(
						fakeDriver.getLastFunctionCall()[1],
						"LJM_CloseAsync"
					);
					test.done();
				});
		});
	},
	testOpenWeirdC: function(test) {
		var device = new deviceManager.labjack();
		var param = "0";
		var paramB = param;
		device.open(
			paramB,	//Will be converted to an integer
			driver_const.LJM_CT_ANY,
			"LJM_idANY",
		function(res) {
			console.log("Opening Error");
		},
		function(res) {
			//get the handle & make sure it isn't zero
			test.notStrictEqual(device.handle, null);
			test.notEqual(device.handle, 0);

			//Make sure that LJM_OpenSAsync was called
			test.equal(fakeDriver.getLastFunctionCall().length,1);
			test.equal(fakeDriver.getLastFunctionCall()[0],"LJM_OpenAsync");

			//Make sure that dtAny, ctAny, and idAny were used as variables
			test.equal(device.deviceType,driver_const.LJM_DT_ANY);
			test.equal(device.connectionType,driver_const.LJM_CT_ANY);
			test.equal(device.identifier,"LJM_idANY");
			
			//Close the Device
			device.close(
				function(res) {
					console.log("Closing Error");
				},
				function(res) {
					test.strictEqual(device.handle, null);
					test.strictEqual(device.deviceType,null);
					test.strictEqual(device.connectionType,null);
					test.strictEqual(device.identifier,null);
					test.equal(
						fakeDriver.getLastFunctionCall()[1],
						"LJM_CloseAsync"
					);
					test.done();
				});
		});
	},
	testOpenWeirdD: function(test) {
		var device = new deviceManager.labjack();
		var param = "0";
		device.open(
			driver_const.LJM_DT_ANY,	
			param,	//Will be converted to an integer
			"LJM_idANY",
		function(res) {
			console.log("Opening Error");
		},
		function(res) {
			//get the handle & make sure it isn't zero
			test.notStrictEqual(device.handle, null);
			test.notEqual(device.handle, 0);

			//Make sure that LJM_OpenSAsync was called
			test.equal(fakeDriver.getLastFunctionCall().length,1);
			test.equal(fakeDriver.getLastFunctionCall()[0],"LJM_OpenAsync");

			//Make sure that dtAny, ctAny, and idAny were used as variables
			test.equal(device.deviceType,driver_const.LJM_DT_ANY);
			test.equal(device.connectionType,driver_const.LJM_CT_ANY);
			test.equal(device.identifier,"LJM_idANY");
			
			//Close the Device
			device.close(
				function(res) {
					console.log("Closing Error");
				},
				function(res) {
					test.strictEqual(device.handle, null);
					test.strictEqual(device.deviceType,null);
					test.strictEqual(device.connectionType,null);
					test.strictEqual(device.identifier,null);
					test.equal(
						fakeDriver.getLastFunctionCall()[1],
						"LJM_CloseAsync"
					);
					test.done();
				});
		});
	},

	/**
	 * Tests the string-open feature of the device class. 
	 * 		1. The LJM function "OpenS" should be called.
	 * 		2. A handle acquired.
	 * 		3. The device information saved.
	 * 		4. Function should succede at opening a device.
	 * 
	 * @param  {[type]} test
	 * @return {[type]}
	 */
	testOpenS: function(test) {
		var device = new deviceManager.labjack();
		device.open("LJM_dtT7","LJM_ctUSB","LJM_idANY",
		function(res) {
			console.log("Opening Error");
		},
		function(res) {
			//get the handle & make sure it isn't zero
			test.notStrictEqual(device.handle, null);
			test.notEqual(device.handle, 0);

			//Make sure that LJM_OpenSAsync was called
			test.equal(fakeDriver.getLastFunctionCall().length,1);
			test.equal(fakeDriver.getLastFunctionCall()[0],"LJM_OpenSAsync");

			//Make sure that dtAny, ctAny, and idAny were used as variables
			test.equal(device.deviceType,"LJM_dtT7");
			test.equal(device.connectionType,"LJM_ctUSB");
			test.equal(device.identifier,"LJM_idANY");
			
			//Close the Device
			device.close(
				function(res) {
					console.log("Closing Error");
				},
				function(res) {
					test.strictEqual(device.handle, null);
					test.strictEqual(device.deviceType,null);
					test.strictEqual(device.connectionType,null);
					test.strictEqual(device.identifier,null);
					test.equal(
						fakeDriver.getLastFunctionCall()[1],
						"LJM_CloseAsync"
						);
					test.done();
				});
		});
	},
	/**
	 * Tests the open feature when no information is passed to the driver. A
	 * device should be opened using the Open LJM function with commands: 
	 * 		1. DeviceType any 
	 * 		2. ConnectionTypeπ any 
	 * 		3. Identifier any
	 * @param  {[type]} test
	 * @return {[type]}
	 */
	testOpenEmpty: function(test) {
		var device = new deviceManager.labjack();
		device.open(
		function(res) {
			console.log("Opening Error");
		},
		function(res) {
			//get the handle & make sure it isn't zero
			test.notStrictEqual(device.handle, null);
			test.notEqual(device.handle, 0);

			//Make sure that LJM_OpenSAsync was called
			test.equal(fakeDriver.getLastFunctionCall().length,1);
			test.equal(fakeDriver.getLastFunctionCall()[0],"LJM_OpenSAsync");

			//Make sure that dtAny, ctAny, and idAny were used as variables
			test.equal(device.deviceType,"LJM_dtANY");
			test.equal(device.connectionType,"LJM_ctANY");
			test.equal(device.identifier,"LJM_idANY");
			
			//Close the Device
			device.close(
				function(res) {
					console.log("Closing Error");
				},
				function(res) {
					test.strictEqual(device.handle, null);
					test.strictEqual(device.deviceType,null);
					test.strictEqual(device.connectionType,null);
					test.strictEqual(device.identifier,null);
					test.equal(
						fakeDriver.getLastFunctionCall()[1],
						"LJM_CloseAsync"
					);
					test.done();
				});
		});
	},
	/**
	 * Tests the error-reporting features of the open command in Async-mode.  
	 * 		1. An error should be reported via the onError function.
	 * 		2. No device information should be saved.
	 * 		3. There should be no device handle saved.
	 * 
	 * @param  {[type]} test
	 */
	testOpenNoDeviceFail: function(test) {
		//Force the open call to fail w/ error code 1
		var erCode = 1;
		fakeDriver.setExpectedResult(erCode);

		var device = new deviceManager.labjack();
		device.open("LJM_dtANY","LJM_ctANY","LJM_idANY",
		function(res) {
			test.equal(res,erCode);
			test.strictEqual(device.handle, null);
			test.strictEqual(device.deviceType,null);
			test.strictEqual(device.connectionType,null);
			test.strictEqual(device.identifier,null);
			//Try closing a device even though one has never been opened
			device.close(
				function(res) {
					test.equal(res,"Device Never Opened");
					autoOpen = true; //Request that the test enviro. auto-open
					test.done();
				},
				function(res) {
					console.log("CloseSuccess, ERROR!! NOT SUPPOSED TO HAPPEN");
				});
		},
		function(res) {
			console.log("OpenSuccess, ERROR!!!!!!! NOT SUPPOSED TO HAPPEN");
		});
	},

	/**
	 * Tests the getHandleInfo function
	 * @param  {[type]} test
	 */
	testGetHandleInfo: function(test) {
		autoClose = true;//Request that the test enviro. auto-close

		dev.getHandleInfo(function(res) {
			console.log('ErrGetHandleInfo');
		},
		function(res) {
			//Test the return values
			test.equal(res.deviceType,driver_const.LJM_DT_T7);
			test.equal(res.connectionType,driver_const.LJM_CT_USB);
			test.equal(res.serialNumber,12345678);
			test.equal(res.ipAddress,"1.2.3.4");
			test.equal(res.port,2468);
			test.equal(res.maxBytesPerMB,testVal);
			test.equal(fakeDriver.getLastFunctionCall()[0],"LJM_GetHandleInfoAsync");
			test.done();
		});
	},

	/**
	 * This test tests the LJM_eReadRaw asynchronous function call of LJM.
	 * @param  {[type]} test The test object.
	 */
	testReadRaw: function(test) {
		var data=[0,0,0,0,0,0,0,0,0,0];

		var testBuf = new Buffer(data.length);
		testBuf.fill(testVal);//Fill buffer with success data
		dev.readRaw(data,function(res) {
			//Error
			console.log("!!!!ReadRaw ERROR!!!!");
		},
		function(res) {
			//Success
			var i;
			for(i = 0; i < res.length; i++) {
				test.equal(testBuf.readUInt8(i),res.readUInt8(i));
			}
			test.equal(fakeDriver.getLastFunctionCall()[0],"LJM_ReadRawAsync");
			test.done();
		});
	},

	/**
	 * This test tests the LJM_eReadName, LJM_eReadAddress, LJM_eReadNameString,
	 * and LJM_eReadAddressString asynchronous function calls of LJM.
	 * @param  {[type]} test The test object.
	 */
	testRead: function(test) {
		fakeDriver.setResultArg(testVal);
		asyncRun.config(dev,null);
		syncRun.config(dev,null);
		var testList = [
			'read(0)',
			'read("AIN0")',
			'read(60500)',
			'read("DEVICE_NAME_DEFAULT")'
		];
		var expectedFunctionList = [ 
			'LJM_eReadAddress',
			'LJM_eReadAddress',
			'LJM_eReadAddressString',
			'LJM_eReadAddressString',
			'LJM_eReadAddressAsync',
			'LJM_eReadAddressAsync',
			'LJM_eReadAddressStringAsync',
			'LJM_eReadAddressStringAsync' 
		];
		var expectedResultList = [
			testVal,
			testVal,
			"TEST",
			"TEST",
			testVal,
			testVal,
			"TEST",
			"TEST",
		];
		syncRun.run(testList);
		asyncRun.run(testList,
			function(res) {
				//Error, should never be called.... isn't ever used... woops....
			}, function(res) {
				//Success				
				var funcs = fakeDriver.getLastFunctionCall();
				var results = asyncRun.getResults();
				var args = fakeDriver.getArgumentsList();
				var i;
				for(i = 0; i < testList.length*2; i++) {
					test.equal(funcs[i], expectedFunctionList[i]);
					test.equal(results[i], expectedResultList[i]);
				}
				//Test to make sure the address-to-type conversion worked (sync)
				test.equal(args[1][2],driver_const.LJM_FLOAT32);

				//Test to make sure the address-to-type conversion worked(async)
				test.equal(args[5][2],driver_const.LJM_FLOAT32);


				test.done();
			});		
	},

	/**
	 * This test tests the LJM_eReadName, LJM_eReadAddress, LJM_eReadNameString,
	 * and LJM_eReadAddressString asynchronous function calls of LJM. 
	 * & makes sure that they properly return error codes.
	 * @param  {[type]} test The test object.
	 */
	testReadFail: function(test) {
		fakeDriver.setResultArg(testVal);

		//Configure running-engines
		asyncRun.config(dev,null);
		syncRun.config(dev,null);

		//Force the driver to produce an error code
		var erCode = 1;
		fakeDriver.setExpectedResult(erCode);

		var testList = [
		'read(-1)',//Test for invalid address
		'read("AIN999")',//Test for invalid name
		'read(49350)',//test for write only address-number read
		'read("WIFI_PASSWORD_DEFAULT")',//Test for write only address-name read
		'read(0)',
		'read("AIN0")',
		];
		var expectedFunctionList = [ 
			'LJM_eReadAddress',
			'LJM_eReadName',
			'LJM_eReadAddressAsync',
			'LJM_eReadNameAsync',
		];
		var expectedResultList = [
			'Invalid Address',
			'Invalid Address',
			'Invalid Read Attempt',
			'Invalid Read Attempt',
			erCode,
			erCode,
			'Invalid Address',
			'Invalid Address',
			'Invalid Read Attempt',
			'Invalid Read Attempt',
			erCode,
			erCode,
		];
		syncRun.run(testList);
		asyncRun.run(testList,
			function(res) {
				//Error, should never be called.... isn't ever used... woops....
			}, function(res) {
				//Success				
				var funcs = fakeDriver.getLastFunctionCall();
				var results = asyncRun.getResults();
				var args = fakeDriver.getArgumentsList();
				//console.log(args)
				var i;


				// console.log("Functions Called",funcs);
				// console.log("Results",results);
				//Test to make sure that the proper number of commands have been
				//executed & results returned:
				test.equal(funcs.length, expectedFunctionList.length);
				test.equal(results.length, expectedResultList.length);

				//Make sure that the proper LJM functions were called
				for(i = 0; i < testList.length*2; i++) {
					test.equal(results[i], expectedResultList[i]);
				}

				test.done();
			});		
	},

	/**
	 * This test tests the LJM_eReadNames, and LJM_eReadAddresses asynchronous 
	 * function calls of LJM.
	 * @param  {[type]} test The test object.
	 */
	testReadMany: function(test) {
		var resArray = [testVal,testVal+1];
		var numArgs = resArray.length;
		fakeDriver.setResultArg(resArray);
		asyncRun.config(dev,null);
		syncRun.config(dev,null);
		var testList = [
			'readMany([0,2])',
			'readMany(["AIN0","AIN1"])',
		];
		//Expected info combines both sync & async
		var expectedFunctionList = [ 
			'LJM_eReadAddresses',
			'LJM_eReadNames',
			'LJM_eReadAddressesAsync',
			'LJM_eReadAddressesAsync',
		];
		//Expected info combines both sync & async
		var expectedResultList = [
			resArray,
			resArray,
			resArray,
			resArray,
		];
		syncRun.run(testList,false,false);
		asyncRun.run(testList,
			function(res) {
				//Error
			}, function(res) {
				//Success
				var funcs = fakeDriver.getLastFunctionCall();
				var results = asyncRun.getResults();
				var argList = fakeDriver.getArgumentsList();
				var i,j;
				var offsetSync = 1;

				//Figure out how many function calls should have been made:
				var numDriverCalls = testList.length * 2;

				//Test to make sure that the proper number of commands have been
				//executed & results returned:
				test.equal(funcs.length, expectedFunctionList.length);
				test.equal(results.length, expectedResultList.length);

				//Test to make sure that the expected driver calls is actually
				//what happened:
				for(i = 0; i < numDriverCalls; i++) {
					test.equal(funcs[i],expectedFunctionList[i]);
				}

				//Test to make sure that the proper results came back for each 
				//call starting with sync then async
				for(i = 0; i < numDriverCalls; i++) {
					for(j = 0; j < resArray.length; j++) {
						test.equal(results[i][j],expectedResultList[i][j]);
					}
				}

				//Test to make sure that each function got passed the proper 
				//arguments
				// console.log(funcs)
				// console.log('argList length:',argList.length);
				// console.log('argList:',argList);
				for(i = 0; i < numDriverCalls; i++) {
					if(expectedFunctionList[i] == 'LJM_eReadAddressesAsync') {
						test.equal(argList[i+offsetSync][1], numArgs);
						test.equal(argList[i+offsetSync][2].length, numArgs*4);
						test.equal(argList[i+offsetSync][3].length, numArgs*4);
						test.equal(argList[i+offsetSync][4].length, numArgs*8);
						test.equal(argList[i+offsetSync][5].length, 4);
					} else if(expectedFunctionList[i] == 'LJM_eReadNamesAsync'){
						test.equal(argList[i+offsetSync][1], numArgs);
						test.equal(argList[i+offsetSync][3].length, numArgs*8);
						test.equal(argList[i+offsetSync][4].length, 4);
					} else if(expectedFunctionList[i] == 'LJM_eReadAddresses') {
						test.equal(argList[i+offsetSync][1], numArgs);
						test.equal(argList[i+offsetSync][2].length, numArgs*4);
						test.equal(argList[i+offsetSync][3].length, numArgs*4);
						test.equal(argList[i+offsetSync][4].length, numArgs*8);
						test.equal(argList[i+offsetSync][5].length, 4);
					} else if (expectedFunctionList[i] == 'LJM_eReadNames'){
						test.equal(argList[i+offsetSync][1], numArgs);
						test.equal(argList[i+offsetSync][3].length, numArgs*8);
						test.equal(argList[i+offsetSync][4].length, 4);
					} else {
					}
				}
				test.done();
			});	
	},
	/**
	 * This test tests the LJM_eReadNames, and LJM_eReadAddresses asynchronous 
	 * function calls of LJM and their methidologies for reporting errors.
	 * @param  {[type]} test The test object.
	 */
	testReadManyFail: function(test) {
		var resArray = [testVal,testVal+1];
		var numArgs = resArray.length;
		fakeDriver.setResultArg(resArray);

		//Force the driver to produce an error code
		var erCode = 1;
		fakeDriver.setExpectedResult(erCode);
		
		//Configure running-engines
		asyncRun.config(dev, null);
		syncRun.config(dev, null);

		//Create test-variables
		var testList = [
			'readMany([-1,2])',
			'readMany(["AI999","AIN1"])',
			'readMany([0,49350])',
			'readMany(["AIN0","WIFI_PASSWORD_DEFAULT"])',
			'readMany([0,2])',
			'readMany(["AIN0","AIN1"])',
		];
		//Expected info combines both sync & async
		var expectedFunctionList = [ 
			'LJM_eReadNames',
			'LJM_eReadNames',
			'LJM_eReadAddresses',
			'LJM_eReadNames',
			'LJM_eReadAddressesAsync',
			'LJM_eReadAddressesAsync',
		];
		//Expected info combines both sync & async
		var expectedResultList = [
		// Errors for Sync:
			{ retError: 'Invalid Address', errFrame: 0 },
			{ retError: erCode, errFrame: 99 },
			{ retError: 'Invalid Read Attempt', errFrame: 1 },
			{ retError: erCode, errFrame: 99 },
			{ retError: erCode, errFrame: 99 },
			{ retError: erCode, errFrame: 99 },
		// Errors for Async
			{ retError: 'Invalid Address', errFrame: 0 },
			{ retError: 'Invalid Address', errFrame: 0 },
			{ retError: 'Invalid Read Attempt', errFrame: 1 },
			{ retError: 'Invalid Read Attempt', errFrame: 1 },
			{ retError: erCode, errFrame: 99 },
			{ retError: erCode, errFrame: 99 },
		];

		//Run the desired commands
		syncRun.run(testList);
		asyncRun.run(testList,
			function(res) {
				//Error
			}, function(res) {
				//Success
				var funcs = fakeDriver.getLastFunctionCall();
				var results = asyncRun.getResults();
				var argList = fakeDriver.getArgumentsList();
				var i,j;
				var offsetSync = 1;

				// console.log('Function Calls',funcs);
				// console.log('Results',results);
				// console.log('arguments',argList);
				//Figure out how many function calls should have been made:
				var numDriverCalls = testList.length * 2;

				//Test to make sure that the proper number of commands have been
				//executed & results returned:
				test.equal(results.length, expectedResultList.length);

				//Test to make sure that the expected driver calls is actually
				//what happened:
				
				test.deepEqual(expectedFunctionList,funcs);

				//Make sure that the errors are being returned properly & stored
				//in the results array
				for(i = 0; i < numDriverCalls; i++) {
					test.equal(results[i] instanceof Object,true);
					test.equal(
						results[i].retError,
						expectedResultList[i].retError
					);
					test.equal(
						results[i].errFrame,
						expectedResultList[i].errFrame
					);
				}				

				test.done();
			});	
	},

	/**
	 * This test tests the LJM_eWriteRaw asynchronous function call of LJM.
	 * @param  {[type]} test The test object.
	 */
	testWriteRaw: function(test) {
		var resArray = [9,8,7,6,5,4,3,2,1];
		fakeDriver.setResultArg(resArray);
		
		//Configure running-engines
		asyncRun.config(dev, null);
		syncRun.config(dev, null);

		//Create test-variables
		var testList = [
			'writeRaw([1,2,3,4,5,6,7,8,9])',
		];
		//Expected info combines both sync & async
		var expectedFunctionList = [ 
			'LJM_WriteRaw',
			'LJM_WriteRawAsync',
		];
		//Expected info combines both sync & async
		var expectedResultList = [
			resArray,
			resArray,
		];

		//Run the desired commands
		syncRun.run(testList);
		asyncRun.run(testList,
			function(res) {
				//Error
			}, function(res) {
				//Success
				var funcs = fakeDriver.getLastFunctionCall();
				var results = asyncRun.getResults();
				var argList = fakeDriver.getArgumentsList();
				var i,j;
				var offsetSync = 1;		

				// console.log("Function Calls", funcs);
				// console.log("Results",results);
				// console.log("Arguments",argList);

				//Make sure we called the proper test-driver functions
				test.deepEqual(expectedFunctionList,funcs);

				//Make sure the results array's are what we expected
				for(i = 0; i < expectedResultList.length; i++) {
					for(j = 0; j < expectedResultList[i].length; j++) {
						test.equal(expectedResultList[i][j],results[i][j]);
					}
				}
				test.done();
			});	
	},

	/**
	 * This test tests the LJM_eWriteName, LJM_eWriteAddress, 
	 * LJM_eWriteNameString, and LJM_eWriteAddressString asynchronous function 
	 * calls of LJM.
	 * @param  {[type]} test The test object.
	 */
	testWrite: function(test) {		
		//Configure running-engines
		asyncRun.config(dev, null);
		syncRun.config(dev, null);

		//Create test-variables
		var testList = [
			'write(1000,2.5)',
			'write("DAC0",2.5)',
			'write(60500,"Mine")',
			'write("DEVICE_NAME_DEFAULT","Mine")'
		];
		//Expected info combines both sync & async
		var expectedFunctionList = [ 
			'LJM_eWriteAddress',
			'LJM_eWriteName',
			'LJM_eWriteAddressString',
			'LJM_eWriteNameString',

			'LJM_eWriteAddressAsync',
			'LJM_eWriteNameAsync',
			'LJM_eWriteAddressStringAsync',
			'LJM_eWriteNameStringAsync',
		];
		//Expected info combines both sync & async
		var expectedResultList = [
			0,0,0,0,									//Return vars for sync
			'SUCCESS','SUCCESS','SUCCESS','SUCCESS',	//Return vars for async
		];

		//Run the desired commands
		syncRun.run(testList);
		asyncRun.run(testList,
			function(res) {
				//Error
			}, function(res) {
				//Success
				var funcs = fakeDriver.getLastFunctionCall();
				var results = asyncRun.getResults();
				var argList = fakeDriver.getArgumentsList();
				var i,j;
				var offsetSync = 1;		

				// console.log("Function Calls", funcs);
				// console.log("Results",results);
				//console.log("Arguments",argList);

				//Make sure we called the proper test-driver functions
				test.deepEqual(expectedFunctionList,funcs);

				//Make sure we get the proper results back
				test.deepEqual(expectedResultList,results);
				
				test.done();
			});	
	},

	/**
	 * This test tests the device's capability to fail gracefully on write 
	 * function calls.
	 * 
	 * @param  {[type]} test The test object.
	 */
	testWriteFail: function(test) {
		//Force the driver to produce an error code
		var erCode = 1;
		fakeDriver.setExpectedResult(erCode);
		
		//Configure running-engines
		asyncRun.config(dev, null);
		syncRun.config(dev, null);

		//Create test-variables
		var testList = [
			'write(-1,2.5)',//Test for invalid address
			'write("AIN999",2.5)',//Test for invalid name
			'write(0,2.5)',//Test for Read only address-number
			'write("AIN0",2.5)',//Test for read only address-n.
			'write(1000,2.5)',//Test for driver-reported errors
			'write("DAC0",2.5)',//Test for driver-reported errors
			'write(60500,"Mine")',//Test for driver-reported errors
			'write("DEVICE_NAME_DEFAULT","Mine")',//again...
		];
		//Expected info combines both sync & async
		var expectedFunctionList = [ 
			'LJM_eWriteAddress',
			'LJM_eWriteName',
			'LJM_eWriteAddressString',
			'LJM_eWriteNameString',

			'LJM_eWriteAddressAsync',
			'LJM_eWriteNameAsync',
			'LJM_eWriteAddressStringAsync',
			'LJM_eWriteNameStringAsync',
		];
		//Expected info combines both sync & async
		var expectedResultList = [
			'Invalid Address',
			'Invalid Address',
			'Invalid Write Attempt',
			'Invalid Write Attempt',
			erCode,
			erCode,
			erCode,
			erCode,
			'Invalid Address',
			'Invalid Address',
			'Invalid Write Attempt',
			'Invalid Write Attempt',
			erCode,
			erCode,
			erCode,
			erCode,
		];

		//Run the desired commands
		syncRun.run(testList);
		asyncRun.run(testList,
			function(res) {
				//Error
			}, function(res) {
				//Success
				var funcs = fakeDriver.getLastFunctionCall();
				var results = asyncRun.getResults();
				var argList = fakeDriver.getArgumentsList();
				var i,j;
				var offsetSync = 1;		

				// console.log("Function Calls", funcs);
				// console.log("Results",results);
				//console.log("Arguments",argList);

				//Make sure we called the proper test-driver functions
				test.deepEqual(expectedFunctionList,funcs);

				//Make sure we get the proper results back
				test.deepEqual(expectedResultList,results);
				
				test.done();
			});	
	},


	/**
	 * This test tests the LJM_eWriteNames, and LJM_eWriteAddresses asynchronous
	 * function calls of LJM.
	 * @param  {[type]} test The test object.
	 */
	testWriteMany: function(test) {		
		//Configure running-engines
		asyncRun.config(dev, null);
		syncRun.config(dev, null);

		var numAddresses = [2, 2, 2, 2];
		//Create test-variables
		var writtenValuesList = [2.5,2.5];
		var addressesList = [1000,1002];
		var typesList = [3,3];
		var namesList = ["DAC0","DAC1"];

		var testList = [
			'writeMany([1000,1002],[2.5,2.5])',
			'writeMany(["DAC0","DAC1"],[2.5,2.5])',
		];

		//Expected info combines both sync & async
		var expectedFunctionList = [ 
			'LJM_eWriteAddresses',
			'LJM_eWriteNames',
			'LJM_eWriteAddressesAsync',
			'LJM_eWriteNamesAsync',
		];
		//Expected info combines both sync & async
		var expectedResultList = [
			0,0,
			'SUCCESS','SUCCESS',
		];

		//Run the desired commands
		syncRun.run(testList);
		asyncRun.run(testList,
			function(res) {
				//Error
			}, function(res) {
				//Success
				var funcs = fakeDriver.getLastFunctionCall();
				var results = asyncRun.getResults();
				var argList = fakeDriver.getArgumentsList();
				var i,j;
				var offsetSync = 1;		

				// console.log("Function Calls", funcs);
				// console.log("Results",results);
				// console.log("Arguments",argList);
				
				//Test to make sure the proper functions were called
				test.deepEqual(expectedFunctionList,funcs);

				//test to make sure the proper results were acquired
				test.deepEqual(expectedResultList,results);

				var paramsDict = {
					'handle': [null, null, null, null],
					'length': numAddresses,
					'addresses': [addressesList,addressesList],
					'types': [typesList,typesList],
					'values': [writtenValuesList, writtenValuesList, writtenValuesList, writtenValuesList],
					'error': [4, 4, 4, 4],
					'callback': [null, null],
					'names': [namesList, namesList],
				};

				var checker = callSequenceChecker.createCallSequenceChecker(
					expectedFunctionList,
					paramsDict
				);

				checker(test, funcs, argList.slice(1,argList.length));
				
				test.done();
			});	
	},

	testWriteManyFail: function(test) {
		//Force the driver to produce an error code
		var erCode = 1;
		fakeDriver.setExpectedResult(erCode);

		//Configure running-engines
		asyncRun.config(dev, null);
		syncRun.config(dev, null);

		var numAddresses = 2;
		//Create test-variables
		var testList = [
			'writeMany([0,2],[2.5,2.5])',
			'writeMany([-1,2],[2.5,2.5])',
			'writeMany(["AIN0","AIN2"],[2.5,2.5])',
			'writeMany(["AIN999","AIN2"],[2.5,2.5])',
		];

		//Expected info combines both sync & async
		var expectedFunctionList = [ 
			'LJM_eWriteNames',
			'LJM_eWriteNames',
			'LJM_eWriteNamesAsync',
			'LJM_eWriteNamesAsync'
		];
		//Expected info combines both sync & async
		var expectedResultList = [
			{ retError: 'Invalid Write Attempt', errFrame: 0 },
			{ retError: 'Invalid Address', errFrame: 0 },
			{ retError: 1, errFrame: 0 },
			{ retError: 1, errFrame: 0 },
			{ retError: 'Invalid Read Attempt', errFrame: 0 },
			{ retError: 'Invalid Address', errFrame: 0 },
			{ retError: 1, errFrame: 0 },
			{ retError: 1, errFrame: 0 }
		];

		//Run the desired commands
		syncRun.run(testList);
		asyncRun.run(testList,
			function(res) {
				//Error
			}, function(res) {
				//Success
				var funcs = fakeDriver.getLastFunctionCall();
				var results = asyncRun.getResults();
				var argList = fakeDriver.getArgumentsList();
				var i,j;
				var offsetSync = 1;		

				// console.log("Function Calls", funcs);
				// console.log("Results",results);
				// console.log("Arguments",argList);
				
				//Test to make sure the proper functions were called
				test.deepEqual(expectedFunctionList,funcs);

				//test to make sure the proper results were acquired
				test.deepEqual(expectedResultList,results);

				test.done();
			});	
	},

	/**
	 * This test tests the LJM_eAddresses, and LJM_eNames asynchronous function 
	 * calls of LJM.
	 * @param  {[type]} test [description]
	 */
	testRWMany: function(test) {
		var highestReadVal = 9;
		fakeDriver.setResultArg(highestReadVal);

		//Configure running-engines
		asyncRun.config(dev, null);
		syncRun.config(dev, null);

		var numAddresses = 2;
		//Create test-variables
		//rwMany(numFrames,addresses,directions,numValues,values
		var testList = [
			'rwMany([0,2],[0,0],[1,1],[null,null])',							// #1
			'rwMany(["AIN0","AIN2"],[0,0],[1,1],[null,null])',					// #2
			'rwMany([0,2,1000],[0,0,1],[1,1,1],[null,null,2.5])',				// #3
			'rwMany([0,1000],[0,1],[2,1],[null,null,2.5])',						// #4
			'rwMany([0,1000],[0,1],[1,1],[null,2.5])',							// #5
			'rwMany([1000,0],[1,0],[1,1],[2.5,null])',							// #6
			'rwMany([1000,0],[1,0],[2,1],[2.5,2.5,null])',						// #7
			'rwMany(["DAC0","AIN0"],[1,0],[2,2],[2.5,2.5,null,null])',			// #8
			'rwMany([5120],[1],[6],[0x11,0x00,0xDE,0xAD,0xBE,0xEF])',			// #9
			'rwMany(["AIN0"],[0],[6],[0x11,0x00,0xDE,0xAD,0xBE,0xEF])'			// #10
		];

		//Expected info combines both sync & async
		var expectedFunctionList = [ 
		//Synchronous Results:
			'LJM_eAddresses',													// #1
			'LJM_eNames',														// #2
			'LJM_eAddresses',													// #3
			'LJM_eAddresses',													// #4
			'LJM_eAddresses',													// #5
			'LJM_eAddresses',													// #6
			'LJM_eAddresses',													// #7
			'LJM_eNames',														// #8
			'LJM_eAddresses',													// #9
			'LJM_eNames',														// #10
			
		//Asynchronous Results:
			'LJM_eAddressesAsync',												// #1
			'LJM_eNamesAsync',													// #2
			'LJM_eAddressesAsync',												// #3
			'LJM_eAddressesAsync',												// #4
			'LJM_eAddressesAsync',												// #5
			'LJM_eAddressesAsync',												// #6
			'LJM_eAddressesAsync',												// #7
			'LJM_eNamesAsync',													// #8
			'LJM_eAddressesAsync',												// #9
			'LJM_eNamesAsync',													// #10
		];
		//Expected info combines both sync & async
		var expectedResultList = [
		//Synchronous Results:
			[ 9, 8 ],
			[ 9, 8 ],
			[ 9, 8 ],
			[ 9, 8 ],
			[ 9 ],
			[ 8 ],
			[ 7 ],
			[ 7, 6 ],
			[],
			[ 9, 8, 7, 6, 5, 4 ],

		//Asynchronous Results:
			[ 9, 8 ],
			[ 9, 8 ],
			[ 9, 8 ],
			[ 9, 8 ],
			[ 9 ],
			[ 8 ],
			[ 7 ],
			[ 7, 6 ],
			[],
			[ 9, 8, 7, 6, 5, 4 ]
		];

		//Run the desired comman
		// console.log('Starting Sync');
		syncRun.run(testList);
		// console.log('Starting Async');
		asyncRun.run(testList,
			function(res) {
				console.log('errorReported');
				//Error
			}, function(res) {
				// console.log('finisned');
				//Success
				var funcs = fakeDriver.getLastFunctionCall();
				var results = asyncRun.getResults();
				var argList = fakeDriver.getArgumentsList();
				var i,j;
				var offsetSync = 1;		

				// console.log("Function Calls", funcs);
				// console.log("Results",results);
				var tNum = 0;
				// console.log("Arguments",argList.slice(testList.length-tNum,testList.length+1-tNum));
				// console.log("Arguments",argList.slice(2*testList.length-tNum,2*testList.length+1-tNum));
				// console.log('lenOrig',argList.length)
				// console.log('lenNew',argList.slice(1,argList.length).length)
				// ljmArgs = argList.slice(1+testList.length,2+testList.length);
				//console.log('LJM-Args',argList)
				
				//Test to make sure the proper functions were called
				expectedFunctionList.forEach(function(element, index, array) {
					// console.log(element,funcs[index]);
					test.deepEqual(element,funcs[index]);
				});
				test.deepEqual(expectedFunctionList,funcs);
				

				//test to make sure the proper results were acquired
				expectedResultList.forEach(function(element, index, array) {
					// console.log(element,results[index]);
					test.deepEqual(element,results[index]);
				});
				test.deepEqual(expectedResultList,results);

				test.done();
			});	
	},
    readUINT64: function(test){
        // asyncRun.config(dev, driver,driver_const);
        // syncRun.config(dev, driver,driver_const);
        
        //Create test-variables
        var testList = [
            'readUINT64("WIFI_MAC")',
        ];

        //Expected function list:
        var expectedFunctionList = [ 
            'readUINT64',
            'readUINT64',
        ];
        //Run the desired commands
        syncRun.run(testList,false,false);
        asyncRun.run(testList,
            function(res) {
                console.log('Error',res);
            }, function(res) {
                //Report that test finished
                test.done();
            },false,false
        );
    },
    'streaming': function(test) {
    	//Configure running-engines
		asyncRun.config(dev, null);
		syncRun.config(dev, null);

    	var testList = [
    		'streamStart(100, ["AIN0"], 1000)',
    		'streamRead()',
    		'streamStop()'
    	];

    	var callbackIndex = [4,5,4,1];
    	var bufferIndicies = [
    		null,
    		[3,4],
    		[1,2,3],
    		null
    	];
    	var resultBufferLength = 100 * 8;
    	var bufferSizes = [
    		null,
    		[4,8],
    		[resultBufferLength,4,4],
    		null
    	];

    	var expectedFunctionList = [
    		'LJM_eStreamStartAsync',
    		'LJM_eStreamReadAsync',
    		'LJM_eStreamStopAsync',
    		// 'LJM_CloseAsync'
    	];

    	asyncRun.run(testList,
    		function(err) {
    			console.log('Error', err);
    		}, function(res) {
    			// Test to make sure the appropriate LJM functions were called
    			var funcs = fakeDriver.getLastFunctionCall();
    			test.deepEqual(funcs, expectedFunctionList);

    			// Test to make sure that the functions were called with the
    			// appropriate arguments
    			var argList = fakeDriver.getArgumentsList();
    			var msg = 'argument descrepency, console.log(argList) for details.';
    			argList.forEach(function(argI, i) {
    				// Test for callback function locations
    				test.strictEqual(typeof(argI[callbackIndex[i]]), 'function', msg);
    			
    				// Test for buffer indicies
    				if(bufferIndicies[i]) {
    					bufferIndicies[i].forEach(function(bufferIndicy, j) {

    						var type = Buffer.isBuffer(argI[bufferIndicy]);
    						test.strictEqual(type, true, msg);

    						var size = argI[bufferIndicy].length;
    						var expectedSize = bufferSizes[i][j];
    						test.strictEqual(size, expectedSize, msg);
    					});
    				}
    			});

				var results = asyncRun.getResults();
				msg = 'results descrepency';
				test.strictEqual(results.length, 3, msg);
				var tRes = results[1];
				var tResKeys = [
					'data',
					'deviceBacklog',
					'ljmBacklog',
					'dataOffset',
					'time',
					'timeIncrement'
				];
				test.deepEqual(Object.keys(tRes), tResKeys, msg);
				test.strictEqual(tRes.data.length, resultBufferLength, msg);

    // 			console.log("HERE!");
				// console.log(results);
				// console.log(argList);
    			test.done();
    		}, false, false);
    }

	/**
	 * This test tests the  asynchronous function call of LJM.
	 * @param  {[type]} test The test object.
	 *
	 * DEPRECIATED IN LJM 2.46????????? skipping for now
	 */
	// testResetConnection: function(test) {
	// 	test.done();
	// }
};




