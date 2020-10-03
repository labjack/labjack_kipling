
var driver_const = require('ljswitchboard-ljm_driver_constants');

var asyncRun = require('./UtilityCode/asyncUtility');
var syncRun = require('./UtilityCode/syncUtility');

var callSequenceChecker = require('./call_sequence_checker');

var deviceManager = require('../lib/device');
var driverManager = require('../lib/driver');

var dev = new deviceManager.labjack();
var driver = new driverManager.ljmDriver();

var q = require('q');
var ref = require('ref');
module.exports = {
	setUp: function(callback) {
		callback();
	},
	tearDown: function(callback) {
		asyncRun.clearResults();
        syncRun.clearResults();
        callback();
	},
	readErrorCode: function(test) {
		asyncRun.config(dev, driver,driver_const);
        syncRun.config(dev, driver,driver_const);

        //Create test-variables
        var testList = [
            'errToStr(1239)',
        ];

        //Expected function list:
        var expectedFunctionList = [
            'LJM_ErrorToStr',
            'LJM_ErrorToStrAsync'
        ];

        var expectedResults = [
            'Num: 1239, LJME_RECONNECT_FAILED',
            'Num: 1239, LJME_RECONNECT_FAILED',
        ];

        //Run the desired commands
        syncRun.run(testList,false,false);
        asyncRun.run(testList,
            function(res) {
                //Error
            }, function(res) {
                //Success
                var results = asyncRun.getResults();

                assert.deepEqual(results, expectedResults);
                //Report that test finished
                done();
            },false,false
        );
	}
};
