
var mock_device_test = require('./mock_device_test');
var t7_basic_test = require('./t7_basic_test');
var t7_upgrade_test = require('./t7_upgrade_test');
var t7_open_close_test = require('./t7_open_close_test');
var digit_basic_test = require('./digit_basic_test');

// exports.mock_device_test = mock_device_test.tests;

// Perform T7 related tests
// exports.t7_basic_test = t7_basic_test.tests;
exports.t7_upgrade_test = t7_upgrade_test.tests;
// exports.t7_open_close_test = t7_open_close_test;

// Perform Digit related tests
// exports.digit_basic_test = digit_basic_test.tests;