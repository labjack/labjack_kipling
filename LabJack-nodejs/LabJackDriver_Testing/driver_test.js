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
 *    "./TestObjects/test_driver_wrapper"
 */

var rewire = require('rewire');
var q = require('q');
var ref = require('ref');
var fakeDriver = require('./TestObjects/test_driver_wrapper');

var driver_wrapper = rewire('../lib/driver_wrapper');
var constants = driver_wrapper.getConstants();

var deviceManager = rewire('../lib/device');
var driverManager = rewire('../lib/driver');
deviceManager.__set__('driverLib',fakeDriver);
driverManager.__set__('driverLib',fakeDriver);


var driver_const = require('../lib/driver_const');

var asyncRun = require('./UtilityCode/asyncUtility');
var syncRun = require('./UtilityCode/syncUtility');

var callSequenceChecker = require('./call_sequence_checker');

var dev = new deviceManager.labjack();
var driver = new driverManager.ljmDriver();

var autoOpen = false;
var autoClose = false;

var testVal = 69;

module.exports = {
    setUp: function(callback) {
        fakeDriver.clearLastFunctionCall();
        callback();

    },
    tearDown: function (callback) {
        // clean up
        fakeDriver.clearLastFunctionCall();
        fakeDriver.clearArgumentsList();
        fakeDriver.setExpectedResult(0);
        asyncRun.clearResults();
        syncRun.clearResults();
        callback();
    },
    testListAll: function(test) {
        asyncRun.config(dev, driver,driver_const);
        syncRun.config(dev, driver,driver_const);

         //Create test-variables
        var testList = [
            'listAll()',
            'listAll("LJM_dtANY","LJM_ctANY")',
            'listAll("LJM_dtT7","LJM_ctUSB")',
            'listAll(7,1)',
        ];
        //Expected info combines both sync & async
        var expectedFunctionList = [ 
            'LJM_ListAllS',
            'LJM_ListAllS',
            'LJM_ListAllS',
            'LJM_ListAll',
            'LJM_ListAllSAsync',
            'LJM_ListAllSAsync',
            'LJM_ListAllSAsync',
            'LJM_ListAllAsync'
        ];
        //Expected info combines both sync & async
        var expectedResultList = [
            [   
                { 
                    deviceType: 0,
                    connectionType: 0,
                    serialNumber: 0,
                    ipAddress: '0.0.0.0' 
                } 
            ],
            [ 
                { 
                    deviceType: 0,
                    connectionType: 0,
                    serialNumber: 0,
                    ipAddress: '0.0.0.0' 
                } 
            ],
            [ 
                { 
                    deviceType: 0,
                    connectionType: 0,
                    serialNumber: 0,
                    ipAddress: '0.0.0.0' 
                } 
            ],
            [ 
                { 
                    deviceType: 0,
                    connectionType: 0,
                    serialNumber: 0,
                    ipAddress: '0.0.0.0' 
                } 
            ],
            [ 
                { 
                    deviceType: 0,
                    connectionType: 0,
                    serialNumber: 0,
                    ipAddress: '0.0.0.0' 
                } 
            ],
            [ 
                { 
                    deviceType: 0,
                    connectionType: 0,
                    serialNumber: 0,
                    ipAddress: '0.0.0.0' 
                } 
            ],
            [ 
                { 
                    deviceType: 0,
                    connectionType: 0,
                    serialNumber: 0,
                    ipAddress: '0.0.0.0' 
                } 
            ],
            [ 
                { 
                    deviceType: 0,
                    connectionType: 0,
                    serialNumber: 0,
                    ipAddress: '0.0.0.0' 
                } 
            ]
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

                //Make sure we get the proper results back
                test.deepEqual(expectedResultList,results);

                test.done();
            }
        ); 
    },
    testErrToStr: function(test) {
        asyncRun.config(dev, driver,driver_const);
        syncRun.config(dev, driver,driver_const);

        //Create test-variables
        var testList = [
            'errToStr(1)'
        ];

        //Expected function list:
        var expectedFunctionList = [ 
            'LJM_ErrorToString',
            'LJM_ErrorToStringAsync' 
        ];

        //Run the desired commands
        syncRun.run(testList,false,false);
        asyncRun.run(testList,
            function(res) {
                //Error
            }, function(res) {
                //Success
                var funcs = fakeDriver.getLastFunctionCall();
                var results = asyncRun.getResults();
                var argList = fakeDriver.getArgumentsList();

                //Test to see appropriate functions were called:
                test.deepEqual(expectedFunctionList,funcs);

                //Report that test finished
                test.done();
            },false,false
        );
    },
    testLoadConstants: function(test) {
        asyncRun.config(dev, driver,driver_const);
        syncRun.config(dev, driver,driver_const);

        //Create test-variables
        var testList = [
            'loadConstants()'
        ];

        //Expected function list:
        var expectedFunctionList = [ 
            'LJM_LoadConstants',
            'LJM_LoadConstantsAsync' 
        ];

        //Run the desired commands
        syncRun.run(testList,false,false);
        asyncRun.run(testList,
            function(res) {
                //Error
            }, function(res) {
                //Success
                var funcs = fakeDriver.getLastFunctionCall();
                var results = asyncRun.getResults();
                var argList = fakeDriver.getArgumentsList();

                //Test to see appropriate functions were called:
                test.deepEqual(expectedFunctionList,funcs);

                //Report that test finished
                test.done();
            },false,false
        );
    },
    testCloseAll: function(test) {
        asyncRun.config(dev, driver,driver_const);
        syncRun.config(dev, driver,driver_const);

        //Create test-variables
        var testList = [
            'closeAll()'
        ];

        //Expected function list:
        var expectedFunctionList = [ 
            'LJM_CloseAll',
            'LJM_CloseAllAsync' 
        ];

        //Run the desired commands
        syncRun.run(testList,false,false);
        asyncRun.run(testList,
            function(res) {
                //Error
            }, function(res) {
                //Success
                var funcs = fakeDriver.getLastFunctionCall();
                var results = asyncRun.getResults();
                var argList = fakeDriver.getArgumentsList();

                //Test to see appropriate functions were called:
                test.deepEqual(expectedFunctionList,funcs);

                //Report that test finished
                test.done();
            },false,false
        );
    },
    testReadLibrary: function(test) {
        asyncRun.config(dev, driver,driver_const);
        syncRun.config(dev, driver,driver_const);

        //Create test-variables
        var testList = [
            'readLibrary("TestString")'
        ];

        //Expected function list:
        var expectedFunctionList = [ 
            'LJM_ReadLibraryConfigS',
            'LJM_ReadLibraryConfigSAsync' 
        ];

        //Run the desired commands
        syncRun.run(testList,false,false);
        asyncRun.run(testList,
            function(res) {
                //Error
            }, function(res) {
                //Success
                var funcs = fakeDriver.getLastFunctionCall();
                var results = asyncRun.getResults();
                var argList = fakeDriver.getArgumentsList();

                //Test to see appropriate functions were called:
                test.deepEqual(expectedFunctionList,funcs);

                //Report that test finished
                test.done();
            },false,false
        );
    },
    testReadLibraryS: function(test) {
        asyncRun.config(dev, driver,driver_const);
        syncRun.config(dev, driver,driver_const);

        //Create test-variables
        var testList = [
            'readLibraryS("TestString")'
        ];

        //Expected function list:
        var expectedFunctionList = [ 
            'LJM_ReadLibraryConfigStringS',
            'LJM_ReadLibraryConfigStringSAsync' 
        ];

        //Run the desired commands
        syncRun.run(testList,false,false);
        asyncRun.run(testList,
            function(res) {
                //Error
            }, function(res) {
                //Success
                var funcs = fakeDriver.getLastFunctionCall();
                var results = asyncRun.getResults();
                var argList = fakeDriver.getArgumentsList();

                //Test to see appropriate functions were called:
                test.deepEqual(expectedFunctionList,funcs);

                //Report that test finished
                test.done();
            },false,false
        );
    },
    testWriteLibrary: function(test) {
        asyncRun.config(dev, driver,driver_const);
        syncRun.config(dev, driver,driver_const);

        //Create test-variables
        var testList = [
            'writeLibrary("TestString",1)',
            'writeLibrary("TestString","TestString")'
        ];

        //Expected function list:
        var expectedFunctionList = [ 
            'LJM_WriteLibraryConfigS',
            'LJM_WriteLibraryConfigStringS',
            'LJM_WriteLibraryConfigSAsync',
            'LJM_WriteLibraryConfigStringSAsync',
        ];

        //Run the desired commands
        syncRun.run(testList,false,false);
        asyncRun.run(testList,
            function(res) {
                //Error
            }, function(res) {
                //Success
                var funcs = fakeDriver.getLastFunctionCall();
                var results = asyncRun.getResults();
                var argList = fakeDriver.getArgumentsList();

                //Test to see appropriate functions were called:
                test.deepEqual(expectedFunctionList,funcs);

                //Report that test finished
                test.done();
            },false,false
        );
    },
    testLogS: function(test) {
        asyncRun.config(dev, driver,driver_const);
        syncRun.config(dev, driver,driver_const);

        //Create test-variables
        var testList = [
            'logS(1,"TestString")',
        ];

        //Expected function list:
        var expectedFunctionList = [ 
            'LJM_Log',
            'LJM_LogAsync',
        ];

        //Run the desired commands
        syncRun.run(testList,false,false);
        asyncRun.run(testList,
            function(res) {
                //Error
            }, function(res) {
                //Success
                var funcs = fakeDriver.getLastFunctionCall();
                var results = asyncRun.getResults();
                var argList = fakeDriver.getArgumentsList();

                //Test to see appropriate functions were called:
                test.deepEqual(expectedFunctionList,funcs);

                //Report that test finished
                test.done();
            },false,false
        );
    },
    testResetLog: function(test) {
        asyncRun.config(dev, driver,driver_const);
        syncRun.config(dev, driver,driver_const);

        //Create test-variables
        var testList = [
            'resetLog()',
        ];

        //Expected function list:
        var expectedFunctionList = [ 
            'LJM_ResetLog',
            'LJM_ResetLogAsync',
        ];

        //Run the desired commands
        syncRun.run(testList,false,false);
        asyncRun.run(testList,
            function(res) {
                //Error
            }, function(res) {
                //Success
                var funcs = fakeDriver.getLastFunctionCall();
                var results = asyncRun.getResults();
                var argList = fakeDriver.getArgumentsList();

                //Test to see appropriate functions were called:
                test.deepEqual(expectedFunctionList,funcs);

                //Report that test finished
                test.done();
            },false,false
        );
    },
    LJM_ListAllExtended: function(test) {
        var addrListN = [0,49100,49200,60500];
        var addrListS = ['AIN0','ETHERNET_IP','WIFI_IP','DEVICE_NAME_DEFAULT'];

        var convertData = function(list) {
            var retStr = '[';
            list.forEach(function(listEl){
                retStr += '\"' + listEl.toString() + '\",';
            });
            retStr = retStr.slice(0,retStr.length-1);
            retStr += ']';
            return retStr;
        }
        var numString = convertData(addrListN);
        var nameString = convertData(addrListS);
        // console.log('Number List:',numString);
        // console.log('Name List:',nameString);

        var testList = [
            // 'listAllExtended()',
            // 'listAllExtended("LJM_dtANY","LJM_ctANY")',
            // 'listAllExtended("LJM_dtT7","LJM_ctUSB")',
            // 'listAllExtended(7,1)',
            'listAllExtended(7,1,[0])',
            'listAllExtended("LJM_dtANY","LJM_ctANY",["DEVICE_NAME_DEFAULT"])',
            // 'listAllExtended(7,1,'+numString+')',
            // 'listAllExtended("LJM_dtANY","LJM_ctANY",'+nameString+')',
        ];
        var syncObjNums = ['0','1','2','3','4','5','6','7','8','9','10','11'];
        var asyncObjNums = ['0','1','2','3','4','5','6','7','8','9','10','11','12'];
        var argumentTypes = {
            '0': {argType: 'number', argName: 'DeviceType'},
            '1': {argType: 'number', argName: 'ConnectionType'},
            '2': {argType: 'number', argName: 'NumAddresses'},
            '3': {argType: 'object', argName: 'aAddresses'},
            '4': {argType: 'object', argName: 'aNumRegs'},
            '5': {argType: 'number', argName: 'MaxNumFound'},
            '6': {argType: 'object', argName: 'NumFound'},
            '7': {argType: 'object', argName: 'aDeviceTypes'},
            '8': {argType: 'object', argName: 'aConnectionTypes'},
            '9': {argType: 'object', argName: 'aSerialNumbers'},
            '10': {argType: 'object', argName: 'aIPAddresses'},
            '11': {argType: 'object', argName: 'aBytes'},
            '12': {argType: 'function', argName: 'retFunc'},
        }

        var getArgInfo = function(cmdStr) {
            var argType = [];
            var argSize = [];
            var argumentStr = cmdStr.split('listAllExtended')[1].split('(')[1].split(')')[0];
            var funcArgs = argumentStr.split(',');
            var addrListStr = '';
            var addressList = [];
            var addrNumList = [];
            var numRegsList = [];
            if(funcArgs.length === 3) {
                addrListStr = funcArgs[2];
                addressList = addrListStr.slice(1,addrListStr.length-1).split(',');
            }
            var numRegsRead = 0;
            var aBytesSize = 0;
            addressList.forEach(function(address){
                var addr;
                var addrA = address.split('"');
                if (addrA.length == 1) {
                    addr = parseInt(addrA[0]);
                } else {
                    addr = addrA[1];
                }
                var info = constants.getAddressInfo(addr, 'R');
                var numRegs = Math.ceil(info.size/driver_const.LJM_BYTES_PER_REGISTER);
                addrNumList.push(info.address);
                numRegsList.push(numRegs);
                numRegsRead += numRegs;
            });
            numRegsRead *= driver_const.LIST_ALL_EXTENDED_MAX_NUM_TO_FIND;
            
            if(funcArgs.length === 3) {
                addrListStr = funcArgs[2];
                addressList = addrListStr.slice(1,addrListStr.length-1).split(',');
            }
            return {
                numArgs:funcArgs.length,
                addresses: addrNumList,
                numRegs: numRegsList,
                aBufSize: numRegsRead * driver_const.LJM_BYTES_PER_REGISTER,
                types:argType,
                sizees:argSize
            };
        }
        //Expected function list & argument info:
        var expectedFunctionList = [];
        var expectedSyncInfo = [];
        var expectedAsyncInfo = [];
        testList.forEach(function(execStr){
            expectedFunctionList.push('LJM_ListAllExtended');
            expectedSyncInfo.push(getArgInfo(execStr));
        });
        testList.forEach(function(execStr){
            expectedFunctionList.push('LJM_ListAllExtendedAsync');
            expectedAsyncInfo.push(getArgInfo(execStr));
            // console.log(getArgInfo(execStr));
        });

        //Run the desired commands
        syncRun.run(testList,false,true);
        asyncRun.run(testList,
            function(res) {
                console.log('Error',res);
            }, function(res) {
                //Success
                var funcs = fakeDriver.getLastFunctionCall();
                var results = asyncRun.getResults();
                var argList = fakeDriver.getArgumentsList();
                console.log('LJM_ListAllExtended RESULTS')
                // console.log('Function Calls:',funcs);
                console.log('Results:',results);
                // console.log('Arguments List:',argList);
                var numSync = 0;
                var numAsync = 0;
                argList.forEach(function(arg,index){
                    // console.log(arg)
                    var expectedInfo = {};
                    var objectNumbers = [];
                    var execNum = 0;
                    if (funcs[index].search('Async') < 0){
                        objectNumbers = syncObjNums;
                        expectedInfo = expectedSyncInfo;
                        execNum = numSync;
                        numSync += 1;
                    } else {
                        objectNumbers = asyncObjNums;
                        expectedInfo = expectedAsyncInfo;
                        execNum = numAsync;
                        numAsync += 1;
                    }
                    objectNumbers.forEach(function(argName){
                        var expectedType = argumentTypes[argName].argType;
                        var ljmArgName = argumentTypes[argName].argName;
                        var type = typeof(arg[argName]);
                        var argument = arg[argName];
                        test.deepEqual(expectedType,type);
                        if(expectedType === 'object') {
                            if(ljmArgName === 'aAddresses') {
                                var expectedSize = expectedInfo[execNum].addresses.length;
                                expectedSize *= driver_const.ARCH_INT_NUM_BYTES;
                                test.strictEqual(argument.length,expectedSize,'badArg: '+ljmArgName);
                            } else if (ljmArgName === 'aNumRegs') {
                                var expectedSize = expectedInfo[execNum].addresses.length;
                                expectedSize *= driver_const.ARCH_INT_NUM_BYTES;
                                test.strictEqual(argument.length,expectedSize,'badArg: '+ljmArgName);
                            } else if (ljmArgName === 'aBytes') {
                                var info = expectedInfo[execNum];
                                expectedSize *= driver_const.ARCH_INT_NUM_BYTES;
                                test.strictEqual(argument.length,info.aBufSize,'badArg: '+ljmArgName);
                            } 
                            // console.log(ljmArgName,argument.length,expectedSize);
                        }
                    });
                });

                //Report that test finished
                test.done();
            },false,true
        );
    }
};




