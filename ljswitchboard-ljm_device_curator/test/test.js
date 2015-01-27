

/********************** Require tests *****************************************/
// Require generic tests on mock devices
var mock_device_test = require('./mock_device_test');

// Require T7 related tests
var t7_basic_test = require('./t7_basic_test');
var t7_check_calibration_test = require('./t7_check_calibration_test');
var t7_upgrade_test = require('./t7_upgrade_test');
var t7_open_close_test = require('./t7_open_close_test');
var t7_basic_stream_test = require('./t7_basic_stream_test');
var t7_single_channel_speed_test = require('./t7_single_channel_speed_test');
var mock_device_defaults_cache_test = require('./mock_device_defaults_cache_test');

// Require Digit related tests
var digit_basic_test = require('./digit_basic_test');


/********************** Perform tests *****************************************/
// Perform Generic tests on mock devices
exports.mock_device_test = mock_device_test.tests;								// Passing
exports.mock_device_defaults_cache_test = mock_device_defaults_cache_test.tests;// Passing

// Perform T7 related tests
exports.t7_basic_test = t7_basic_test.tests;									// Passing
exports.t7_check_calibration_test = t7_check_calibration_test.tests;			// Passing
// exports.t7_upgrade_test = t7_upgrade_test.tests;								// Passing
// exports.t7_open_close_test = t7_open_close_test.tests;						// Passing
// exports.t7_basic_stream_test = t7_basic_stream_test.tests;						// Passing
// exports.t7_single_channel_speed_test = t7_single_channel_speed_test.tests;		// Passing
// exports.t7_single_channel_speed_testA = t7_single_channel_speed_test.tests;
// exports.t7_single_channel_speed_testB = t7_single_channel_speed_test.tests;
// exports.t7_single_channel_speed_testC = t7_single_channel_speed_test.tests;
// exports.t7_single_channel_speed_testD = t7_single_channel_speed_test.tests;
// exports.t7_single_channel_speed_testE = t7_single_channel_speed_test.tests;
// exports.t7_single_channel_speed_testF = t7_single_channel_speed_test.tests;
// exports.t7_single_channel_speed_testG = t7_single_channel_speed_test.tests;



// Perform Digit related tests
// exports.digit_basic_test = digit_basic_test.tests;