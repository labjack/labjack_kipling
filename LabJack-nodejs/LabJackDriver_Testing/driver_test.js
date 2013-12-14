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
        callback();

    },
    tearDown: function (callback) {
        // clean up
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
};




