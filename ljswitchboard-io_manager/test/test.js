

var utils = require('./utils/utils');
var qRunner = utils.qRunner;
var qExec = utils.qExec;
var pResults = utils.pResults;
var q = require('q');

// enable/disable tests
var ENABLE_BASIC_TEST = false;						// Passing
var ENABLE_SIMPLE_TEST = false;						// Passing
var TEST_DRIVER_CONTROLLER = false;					// Passing

// Tests the creation of a sub-sub process (for each device being its own process)
var TEST_SINGLE_DEVICE_CONTROLLER = false;			// incomplete

// Tests the scanning for devices
var TEST_DEVICE_SCANNER = false;					// Passes but outputs a lot of text.
var TEST_MOCK_DEVICE_SCANNER = false;
var TEST_LIVE_DEVICE_SCANNER = false;

var TEST_DEVICE_CONTROLLER = false;					// incomplete
var TEST_DEVICE_CONTROLLER_OPEN_CLOSE = false;		// Passing
var TEST_DEVICE_CONTROLLER_LIVE_DEVICE = false;		// Passing
var TEST_DEVICE_CONTROLLER_OPEN_ADVANCED = false;	// Passing
var TEST_DEVICE_KEEPER = true;						// Passing
var TEST_DEVICE_KEEPER_LIVE = false;				// Passing
var TEST_DEVICE_ERRORS = false;						// Passing
var TEST_UPDATE_MOCK_DEVICE = false;				// Passing
var TEST_UPDATE_USB_DEVICE = false;					// Passing


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
if(TEST_DEVICE_SCANNER) {
	var device_scanner_test = require('./device_scanner_test');
	exports.device_scanner_test = device_scanner_test.tests;
}
if(TEST_MOCK_DEVICE_SCANNER) {
	var mock_device_scanner_test = require('./mock_device_scanner_test');
	exports.mock_device_scanner_test = mock_device_scanner_test.tests;
}
if(TEST_LIVE_DEVICE_SCANNER) {
	var live_device_scanner_test = require('./live_device_scanner_test');
	exports.live_device_scanner_test = live_device_scanner_test.tests;
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
if(TEST_DEVICE_CONTROLLER_OPEN_ADVANCED) {
	var device_controller_open_advanced_test = require('./device_controller/open_advanced_test');
	exports.device_controller_open_advanced_test = device_controller_open_advanced_test.tests;
}
if(TEST_DEVICE_KEEPER) {
	var device_keeper_test = require('./device_controller/device_keeper_test');
	exports.device_keeper_test = device_keeper_test.tests;
}

if(TEST_DEVICE_KEEPER_LIVE) {
	var device_keeper_live_test = require('./device_controller/device_keeper_live_test');
	exports.device_keeper_live_test = device_keeper_live_test.tests;
}
if(TEST_DEVICE_ERRORS) {
	var device_errors_test = require('./device_controller/device_errors_test');
	exports.device_errors_test = device_errors_test.tests;
}
if(TEST_UPDATE_MOCK_DEVICE) {
	var update_mock_device_test = require('./update_mock_device_test');
	exports.update_mock_device_test = update_mock_device_test.tests;
}

if(TEST_UPDATE_USB_DEVICE) {
	var update_usb_device_test = require('./update_usb_device_test');
	exports.update_usb_device_test = update_usb_device_test.tests;
}

