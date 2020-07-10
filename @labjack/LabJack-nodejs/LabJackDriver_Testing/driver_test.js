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


var driver_const = require('@labjack/ljswitchboard-ljm_driver_constants');

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
    testInternalOpenAll: function(test) {
        // Manually set OpenAll to true so that this test doesn't depend on the
        // version of LJM that happens to be available.
        driver.hasOpenAll = true;

        asyncRun.config(dev, driver,driver_const);
        syncRun.config(dev, driver,driver_const);

        var testOptions = [
            {dt:'0', ct:'0'},
            {dt:0, ct:0},
            {dt:'LJM_dtT7', ct:'LJM_ctUDP'},
        ];

        function generateTestListStr(args) {
            var dt = args.dt;
            if(typeof(args.dt) === 'string') { dt = '"' + args.dt + '"'; }
            var ct = args.ct;
            if(typeof(args.ct) === 'string') { ct = '"' + args.ct + '"'; }
            return 'openAll(' + dt + ',' + ct + ')';
        }

        //Create test-variables
        var testList = testOptions.map(generateTestListStr);

        //Expected info combines both sync & async
        var syncFuncList = [];
        function generateFuncListSync() {
            syncFuncList.push('Internal_LJM_OpenAll');
            syncFuncList.push('LJM_CleanInfo');
        }
        testOptions.forEach(generateFuncListSync);

        var asyncFuncList = [];
        function generateFuncListAsync() {
            syncFuncList.push('Internal_LJM_OpenAllAsync');
            syncFuncList.push('LJM_CleanInfoAsync');
        }

        testOptions.forEach(generateFuncListAsync);

        var expectedFunctionList = syncFuncList.concat(asyncFuncList);
        

        function createExpectedData(args) {
            var dt = args.dt;
            var ct = args.ct;
            return {
                'deviceType': dt,
                'deviceTypeNum': driver_const.deviceTypes[dt],
                'connectionType': ct,
                'connectionTypeNum': driver_const.connectionTypes[ct],
                'numOpened': 1,
                'handles': [0],
                'numErrors': 0,
                'failedOpens': [],
                'errorHandle': 0,
                'errors': {
                    'exceptions': [],
                    'networkInterfaces': [],
                    'returnedDevices': [],
                    'specificIPs': [],
                }
            };

        }

        var syncResults = testOptions.map(createExpectedData);
        var asyncResults = testOptions.map(createExpectedData);
        var expectedResultList = syncResults.concat(asyncResults);

        //Run the desired commands
        syncRun.run(testList);
        asyncRun.run(testList,
            function(res) {
                //Error
            }, function(res) {
                //Success
                var funcs = fakeDriver.getLastFunctionCall();
                var results = asyncRun.getResults();

                //Make sure we called the proper test-driver functions
                test.deepEqual(expectedFunctionList, funcs);

                //Make sure we get the proper results back
                test.deepEqual(expectedResultList, results);

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
    'configure ethernet timeout': function(test) {
        driver.writeLibrarySync('LJM_LISTALL_TIMEOUT_MS_ETHERNET', 10000);
        test.done();
    },
    testReadLibraryScallSpeed: function(test) {
        console.log(' - in testReadLibraryScallSpeed');
        // Get the starting time
        var startTime = new Date();
        var numIterations = 1;
        var results = [];
        var testArg = "LJM_LISTALL_TIMEOUT_MS_ETHERNET";

        for(var i = 0; i < numIterations; i++) {//LJM_ReadLibraryConfigS
            results.push(driver.readLibrarySync(testArg));
        }
        
        // Get the final time
        var endTime = new Date();

        console.log(' - Duration:', endTime - startTime);
        console.log(' - Results', results);
        // console.log('Available Functions:', Object.keys(driver));
        test.done();
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
    testToggleLog: function(test) {
        asyncRun.config(dev, driver,driver_const);
        syncRun.config(dev, driver,driver_const);

        //Create test-variables
        var testList = [
            'enableLog()',
            'disableLog()'
        ];

        //Expected function list:
        var expectedFunctionList = [ 
            'LJM_WriteLibraryConfigS',
            'LJM_WriteLibraryConfigS',
            'LJM_WriteLibraryConfigS',
            'LJM_WriteLibraryConfigS',
            'LJM_WriteLibraryConfigSAsync',
            'LJM_WriteLibraryConfigSAsync',
            'LJM_WriteLibraryConfigSAsync',
            'LJM_WriteLibraryConfigSAsync',
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
    getHandleInfo: function(test) {
        asyncRun.config(dev, driver,driver_const);
        syncRun.config(dev, driver,driver_const);

        var testList = [
            'getHandleInfo()',
        ];

        test.done();
    },
    getHandles: function(test) {
        asyncRun.config(dev, driver,driver_const);
        syncRun.config(dev, driver,driver_const);

        var testList = [
            'getHandles()',
        ];
        
        var expectedResults = [
            {handles: []}, // No handles are expected as per mock function.
            'SUCCESS' // Added at the end of the test.
        ];

        var expectedFunctionList = [
            'Internal_LJM_GetHandles',
            'LJM_CleanInfo',
            'Internal_LJM_GetHandlesAsync',
            'LJM_CleanInfoAsync',
        ];

        //Run the desired commands
        syncRun.run(testList,false,false);
        asyncRun.run(testList,
            function(res) {
                //Error
                console.log("Encountered an error:", res);
            }, function(res) {
                //Success
                var funcs = fakeDriver.getLastFunctionCall();
                var results = asyncRun.getResults();
                var argList = fakeDriver.getArgumentsList();
                
                //Test to make sure expected results were returned.
                test.deepEqual(expectedResults, asyncRun.getResults());
                test.deepEqual(expectedResults, syncRun.getResults());

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
                if(isNaN(listEl)){
                    retStr += '\"' + listEl.toString() + '\",';
                } else {
                    retStr += listEl.toString() + ',';
                }
            });
            retStr = retStr.slice(0,retStr.length-1);
            retStr += ']';
            return retStr;
        };
        var numString = convertData(addrListN);
        var nameString = convertData(addrListS);
        // console.log('Number List:',numString);
        // console.log('Name List:',nameString);

        var testList = [
            'listAllExtended()',
            'listAllExtended("LJM_dtANY","LJM_ctANY")',
            'listAllExtended("LJM_dtT7","LJM_ctUSB")',
            'listAllExtended(7,1)',
            'listAllExtended(7,1,[0])',
            'listAllExtended("LJM_dtANY","LJM_ctANY",["DEVICE_NAME_DEFAULT"])',
            'listAllExtended(7,1,'+numString+')',
            'listAllExtended("LJM_dtANY","LJM_ctANY",'+nameString+')',
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
        };

        var getArgInfo = function(cmdStr) {
            var funcArgs = [];
            var addrNumList = [];
            var numRegsList = [];
            var numRegsRead = 0;
            var argType = [];
            var argSize = [];
            var namesList = [];
            var addrListStr = '';
            var addressList = [];
            var aBytesSize = 0;
            var addr, addrA, info, numRegs;
            var argumentStr = cmdStr.split('listAllExtended')[1].split('(')[1].split(')')[0];
            if(argumentStr.length === 0) {
            } else if (argumentStr === 2) {
                funcArgs = argumentStr.split(',');
            } else {
                funcArgs = argumentStr.split(',');
                if(funcArgs.length >2) {
                    argList = argumentStr.split(',[')[0].split(',');
                    addressList = argumentStr.split(',[')[1].split(']')[0].split(',');
                    funcArgs = argList + addressList;
                    // console.log('argList',argList)
                    // console.log('addressList',addressList)
                    // console.log('funcArgs',funcArgs)
                    
                    
                    addressList.forEach(function(address){
                        addrA = address.split('"');
                        if (addrA.length == 1) {
                            addr = parseInt(addrA[0]);
                        } else {
                            addr = addrA[1];
                        }
                        info = constants.getAddressInfo(addr, 'R');
                        numRegs = Math.ceil(info.size/driver_const.LJM_BYTES_PER_REGISTER);
                        addrNumList.push(info.address);
                        numRegsList.push(numRegs);
                        argType.push(info.data.type);
                        namesList.push(info.data.name);
                        argSize.push(info.size);
                        numRegsRead += numRegs;
                    });
                    numRegsRead *= driver_const.LIST_ALL_EXTENDED_MAX_NUM_TO_FIND;
                }
            }
            return {
                numArgs:funcArgs.length,
                addresses: addrNumList,
                numRegs: numRegsList,
                aBufSize: numRegsRead * driver_const.LJM_BYTES_PER_REGISTER,
                types:argType,
                sizes:argSize,
                namesList: namesList
            };
        };
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
        syncRun.run(testList,false,false);
        asyncRun.run(testList,
            function(res) {
                console.log('Error',res);
            }, function(res) {
                //Success
                var funcs = fakeDriver.getLastFunctionCall();
                var results = asyncRun.getResults();
                var argList = fakeDriver.getArgumentsList();
                // console.log('LJM_ListAllExtended RESULTS')
                // console.log('Function Calls:',funcs);
                // console.log('Results:',results);
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
                        var expectedSize, info;
                        test.deepEqual(expectedType,type);
                        if(expectedType === 'object') {
                            if(ljmArgName === 'aAddresses') {
                                expectedSize = expectedInfo[execNum].addresses.length;
                                expectedSize *= driver_const.ARCH_INT_NUM_BYTES;
                                // console.log(argument.length,expectedSize,expectedInfo);
                                test.strictEqual(argument.length,expectedSize,'badArg: '+ljmArgName);
                            } else if (ljmArgName === 'aNumRegs') {
                                expectedSize = expectedInfo[execNum].addresses.length;
                                expectedSize *= driver_const.ARCH_INT_NUM_BYTES;
                                // console.log(argument.length,expectedSize);
                                test.strictEqual(argument.length,expectedSize,'badArg: '+ljmArgName);
                            } else if (ljmArgName === 'aBytes') {
                                info = expectedInfo[execNum];
                                expectedSize *= driver_const.ARCH_INT_NUM_BYTES;
                                test.strictEqual(argument.length,info.aBufSize,'badArg: '+ljmArgName);
                            } 
                            // console.log(ljmArgName,argument.length,expectedSize);
                        }
                    });
                });

                numSync = 0;
                numAsync = 0;
                results.forEach(function(result,index){
                    result.forEach(function(foundDevice,deviceNum){
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
                        test.strictEqual(expectedInfo[execNum].addresses.length,foundDevice.data.length,'unexpected number of results');
                        foundDevice.data.forEach(function(devData,devDataIndex){
                            var expectedName = expectedInfo[execNum].namesList[devDataIndex];
                            test.strictEqual(devData.name,expectedName,'bad Returned name');
                        });
                    });
                });

                //Report that test finished
                test.done();
            },false,false
        );
    }
};




