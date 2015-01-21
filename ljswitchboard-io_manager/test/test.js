

var utils = require('./utils/utils');
var qRunner = utils.qRunner;
var qExec = utils.qExec;
var pResults = utils.pResults;
var q = require('q');

// enable/disable tests
var ENABLE_BASIC_TEST = false;						// Passing
var ENABLE_SIMPLE_TEST = false;						// Passing
var TEST_DRIVER_CONTROLLER = false;
var TEST_SINGLE_DEVICE_CONTROLLER = false;
var TEST_DEVICE_CONTROLLER = false;
var TEST_DEVICE_CONTROLLER_OPEN_CLOSE = false;		// Passing
var TEST_DEVICE_CONTROLLER_LIVE_DEVICE = true;


if(ENABLE_BASIC_TEST) {
	var basic_test = require('./basic_test');
	exports.basic_test = basic_test.basic_test;
}

if(ENABLE_SIMPLE_TEST) {
	var simple_test = require('./simple_test');
	exports.simple_test = simple_test.tests;
}
if(TEST_DRIVER_CONTROLLER) {
	var driver_controller_test = require('./driver_controller_test');
	exports.driver_controller_test = driver_controller_test.tests;
}

if(TEST_SINGLE_DEVICE_CONTROLLER) {
	var single_device_controller_test = require('./single_device_controller_test');
	exports.single_device_controller_test = single_device_controller_test.tests;
}

if(TEST_DEVICE_CONTROLLER) {
	var device_controller_test = require('./device_controller_test');
	exports.device_controller_test = device_controller_test.tests;
}
if(TEST_DEVICE_CONTROLLER_OPEN_CLOSE) {
	var device_controller_open_close_test = require('./device_controller_open_close_test');
	exports.device_controller_open_close_test = device_controller_open_close_test.tests;
}
if(TEST_DEVICE_CONTROLLER_LIVE_DEVICE) {
	var device_controller_live_test = require('./device_controller_live_test');
	exports.device_controller_live_test = device_controller_live_test.tests;
}


