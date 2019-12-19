

var testCase = require('mocha').describe;
var assertions = require('mocha').it;
var assert = require('chai').assert;
var equal = assert.equal;
var deepEqual = require('deep-eql');


var rewire = require('rewire');
var mockDriver = require('../LabJackDriver_Testing/TestObjects/test_driver_wrapper');
var mockLJM = new mockDriver.getDriver();

var driverManager = rewire('../lib/driver');
driverManager.__set__('driverLib',mockDriver);

var deviceManager = rewire('../lib/device');
deviceManager.__set__('driverLib',mockDriver);

var driver_const = require('ljswitchboard-ljm_driver_constants');


// Handle for device that gets opened.
var dev;

testCase('Device Opening', function() {
	before(function() {
	});
	after(function() {
	});
	beforeEach(function(done) {
		// Before each test, initialize a new device object & clear the mock driver's call history.
		dev = new deviceManager.labjack(mockLJM);
		done();
	});
	afterEach(function(done) {
		// After each test perform mock driver clean up & close the device.
		mockDriver.setExpectedResult(0);
		mockDriver.clearLastFunctionCall();
		mockDriver.setExpectedResult(0);
		mockDriver.clearArgumentsList();
		done();
	});

	/*******************************************************
	 * Begin Test Cases
	*******************************************************/
	testCase('Open - Async', function() {
		it('Open #, #, "ANY"', function(done) {
			dev.open(
				driver_const.LJM_DT_ANY,
				driver_const.LJM_CT_ANY,
				"LJM_idANY",
				function(res) {
					assert.ok(false, "Opening Error");
					done();
				}, function(res) {
					// mockDriver.getLastFunctionCall().length.should.equal(1);
					equal(mockDriver.getLastFunctionCall().length, 1);
					deepEqual(mockDriver.getLastFunctionCall(), ['LJM_OpenAsync']);
					done();
				});
		});
	});
});
